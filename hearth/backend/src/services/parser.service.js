const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
}

Rules:
- is_relevant = true only if the message contains a date, event, appointment, deadline, or schedulable item
- confidence: 0.0-1.0 reflecting how sure you are about the extracted data
- If you can infer a date from context (e.g., "this Thursday", "next week"), resolve it relative to today's date
- action_items: practical tasks the family should do (e.g., "Buy tri-fold board", "Set outfit reminder")
- If the message is just chit-chat, gossip, or non-actionable, set is_relevant to false
- Do NOT make up information. If a field is unclear, set it to null`;

/**
 * Parse a raw message using Claude to extract structured event data.
 */
async function parseMessage(rawText, sourceContext = {}) {
  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const userPrompt = `Today is ${dayOfWeek}, ${today}.
Source: ${sourceContext.sourceName || 'Unknown'} (${sourceContext.sourceLabel || 'General'})

Message to parse:
"${rawText}"

Respond with valid JSON only.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0]?.text;
    const parsed = JSON.parse(content);

    // Validate required fields
    if (typeof parsed.is_relevant !== 'boolean') parsed.is_relevant = false;
    if (typeof parsed.confidence !== 'number') parsed.confidence = 0.5;
    parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));

    if (!Array.isArray(parsed.action_items)) parsed.action_items = [];

    const validCategories = ['school', 'medical', 'extracurricular', 'social', 'household', 'other'];
    if (!validCategories.includes(parsed.category)) parsed.category = 'other';

    return parsed;
  } catch (error) {
    console.error('[Parser] Claude parsing failed:', error.message);

    // Return a low-confidence fallback
    return {
      is_relevant: false,
      confidence: 0,
      event_name: null,
      date: null,
      time: null,
      end_time: null,
      location: null,
      notes: `Parse failed: ${error.message}`,
      action_items: [],
      category: 'other',
    };
  }
}

/**
 * Batch parse multiple messages (more efficient for bulk processing).
 */
async function parseMessages(messages) {
  const results = [];
  for (const msg of messages) {
    const parsed = await parseMessage(msg.content, msg.sourceContext);
    results.push({ rawMessageId: msg.id, ...parsed });

    // Rate limiting: small delay between calls
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return results;
}

module.exports = {
  parseMessage,
  parseMessages,
};
