const OpenAI = require('openai');

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const SYSTEM_PROMPT = `You are a family calendar assistant. Parse the following message from a family-related chat group or email. Extract structured data about any schedulable events, deadlines, or action items.
Respond ONLY in valid JSON with this exact schema:
{
  "is_relevant": boolean,
  "confidence": number,
  "event_name": string | null,
  "date": "YYYY-MM-DD" | null,
  "time": "HH:MM" | null,
  "end_time": "HH:MM" | null,
  "location": string | null,
  "notes": string | null,
  "action_items": string[],
  "category": "school" | "medical" | "extracurricular" | "social" | "household" | "other"
}`;

const validCategories = ['school', 'medical', 'extracurricular', 'social', 'household', 'other'];

function isTime(v) {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

function isDate(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function sanitizeParsed(parsed = {}) {
  const clean = {
    is_relevant: typeof parsed.is_relevant === 'boolean' ? parsed.is_relevant : false,
    confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0,
    event_name: typeof parsed.event_name === 'string' ? parsed.event_name : null,
    date: isDate(parsed.date) ? parsed.date : null,
    time: isTime(parsed.time) ? parsed.time : null,
    end_time: isTime(parsed.end_time) ? parsed.end_time : null,
    location: typeof parsed.location === 'string' ? parsed.location : null,
    notes: typeof parsed.notes === 'string' ? parsed.notes : null,
    action_items: Array.isArray(parsed.action_items) ? parsed.action_items.filter((x) => typeof x === 'string') : [],
    category: validCategories.includes(parsed.category) ? parsed.category : 'other',
  };

  if (!clean.is_relevant) {
    clean.event_name = null;
    clean.date = null;
    clean.time = null;
    clean.end_time = null;
  }

  return clean;
}

function heuristicParse(rawText = '') {
  const lower = rawText.toLowerCase();
  const hasDateWords = /(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2})/.test(lower);
  const hasEventWords = /(practice|meeting|appointment|deadline|due|event|pickup|drop[- ]?off|checkup)/.test(lower);

  return sanitizeParsed({
    is_relevant: hasDateWords && hasEventWords,
    confidence: hasDateWords && hasEventWords ? 0.45 : 0.1,
    event_name: hasEventWords ? rawText.slice(0, 80) : null,
    date: null,
    time: null,
    end_time: null,
    location: null,
    notes: 'Heuristic parse fallback (OpenAI unavailable).',
    action_items: [],
    category: 'other',
  });
}

async function parseMessage(rawText, sourceContext = {}) {
  if (!openai) return heuristicParse(rawText);

  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const userPrompt = `Today is ${dayOfWeek}, ${today}.\nSource: ${sourceContext.sourceName || 'Unknown'} (${sourceContext.sourceLabel || 'General'})\nMessage to parse:\n"${rawText}"`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    return sanitizeParsed(JSON.parse(content));
  } catch (error) {
    console.error('[Parser] OpenAI parsing failed:', error.message);
    return heuristicParse(rawText);
  }
}

async function parseMessages(messages) {
  const results = [];
  for (const msg of messages) {
    const parsed = await parseMessage(msg.content, msg.sourceContext);
    results.push({ rawMessageId: msg.id, ...parsed });
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  return results;
}

module.exports = { parseMessage, parseMessages, sanitizeParsed };
