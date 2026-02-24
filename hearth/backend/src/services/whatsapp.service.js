const axios = require('axios');
const crypto = require('crypto');
const { supabase } = require('../config/database');

const rapidApiClient = axios.create({
  baseURL: process.env.RAPIDAPI_WHATSAPP_HOST ? `https://${process.env.RAPIDAPI_WHATSAPP_HOST}` : undefined,
  timeout: 10000,
  headers: {
    'x-rapidapi-key': process.env.RAPIDAPI_KEY,
    'x-rapidapi-host': process.env.RAPIDAPI_WHATSAPP_HOST,
    'Content-Type': 'application/json',
  },
});

function hashContent(content) {
  return crypto.createHash('sha256').update((content || '').trim().toLowerCase()).digest('hex');
}

function classifyError(error) {
  const status = error?.response?.status;
  if (status === 401 || status === 403) return { type: 'auth', retryable: false };
  if (status === 429) return { type: 'rate_limit', retryable: true };
  if (status >= 500) return { type: 'upstream_5xx', retryable: true };
  if (error.code === 'ECONNABORTED') return { type: 'timeout', retryable: true };
  return { type: 'unknown', retryable: false };
}

async function retry(fn, attempts = 3) {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const { retryable } = classifyError(err);
      if (!retryable || i === attempts) break;
      await new Promise((r) => setTimeout(r, 250 * i));
    }
  }
  throw lastError;
}

async function getMessages(chatId, limit = 50) {
  if (!process.env.RAPIDAPI_KEY || !process.env.RAPIDAPI_WHATSAPP_HOST) {
    throw new Error('RapidAPI WhatsApp env vars are not configured');
  }

  return retry(async () => {
    const response = await rapidApiClient.get('/messages', { params: { chatId, limit } });
    return response.data.messages || response.data || [];
  });
}

async function getGroups() {
  if (!process.env.RAPIDAPI_KEY || !process.env.RAPIDAPI_WHATSAPP_HOST) {
    return [];
  }
  return retry(async () => {
    const response = await rapidApiClient.get('/groups');
    return response.data.groups || response.data || [];
  });
}

async function pollAllSources() {
  const { data: sources, error } = await supabase.from('sources').select('*').eq('type', 'whatsapp').eq('status', 'connected');
  if (error) {
    console.error('[WhatsApp] Failed to fetch sources:', error.message);
    return;
  }

  for (const source of sources || []) {
    try {
      const chatId = source.config?.chatId;
      if (!chatId) continue;

      const messages = await getMessages(chatId);
      let newCount = 0;

      for (const msg of messages) {
        const content = msg.body || msg.text || msg.content || '';
        if (!content.trim()) continue;

        const contentHash = hashContent(content);
        const { error: insertError } = await supabase
          .from('raw_messages')
          .upsert(
            {
              source_id: source.id,
              family_id: source.family_id,
              external_id: msg.id || msg.messageId || null,
              content,
              sender: msg.sender || msg.from || 'Unknown',
              content_hash: contentHash,
              received_at: msg.timestamp ? new Date(msg.timestamp * 1000).toISOString() : new Date().toISOString(),
              processed: false,
            },
            { onConflict: 'source_id,content_hash', ignoreDuplicates: true }
          );

        if (!insertError) newCount += 1;
      }

      await supabase.from('sources').update({
        last_polled: new Date().toISOString(),
        message_count: (source.message_count || 0) + newCount,
        status: 'connected',
        last_error: null,
      }).eq('id', source.id);
    } catch (err) {
      const info = classifyError(err);
      console.error(`[WhatsApp] Poll error for ${source.name}:`, err.message);
      await supabase
        .from('sources')
        .update({ status: info.retryable ? 'connected' : 'error', last_error: `${info.type}: ${err.message}`, last_polled: new Date().toISOString() })
        .eq('id', source.id);
    }
  }
}

module.exports = { getMessages, getGroups, pollAllSources, hashContent, classifyError };
