const axios = require('axios');
const crypto = require('crypto');
const { query } = require('../config/database');
const { isWhatsAppConfigured } = require('./integrations.service');

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
  if (error?.message === 'WHATSAPP_NOT_CONFIGURED') return { type: 'not_configured', retryable: false };
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
  if (!isWhatsAppConfigured()) {
    return [];
  }

  return retry(async () => {
    const response = await rapidApiClient.get('/messages', { params: { chatId, limit } });
    return response.data.messages || response.data || [];
  });
}

async function getGroups() {
  if (!isWhatsAppConfigured()) {
    return [];
  }
  return retry(async () => {
    const response = await rapidApiClient.get('/groups');
    return response.data.groups || response.data || [];
  });
}

async function pollAllSources() {
  const sourcesResult = await query("SELECT * FROM sources WHERE type = 'whatsapp' AND status = 'connected'");
  const sources = sourcesResult.rows || [];

  if (!isWhatsAppConfigured()) {
    for (const source of sources) {
      await query(
        `UPDATE sources
         SET status = 'paused',
             last_error = 'not_configured: RAPIDAPI_KEY/RAPIDAPI_WHATSAPP_HOST missing',
             last_polled = NOW()
         WHERE id = $1`,
        [source.id]
      );
    }
    return;
  }

  for (const source of sources) {
    try {
      const chatId = source.config?.chatId;
      if (!chatId) continue;

      const messages = await getMessages(chatId);
      let newCount = 0;

      for (const msg of messages) {
        const content = msg.body || msg.text || msg.content || '';
        if (!content.trim()) continue;

        const contentHash = hashContent(content);
        const insertResult = await query(
          `INSERT INTO raw_messages
            (source_id, family_id, external_id, content, sender, content_hash, received_at, processed)
           VALUES ($1,$2,$3,$4,$5,$6,$7,false)
           ON CONFLICT (source_id, content_hash) DO NOTHING
           RETURNING id`,
          [
            source.id,
            source.family_id,
            msg.id || msg.messageId || null,
            content,
            msg.sender || msg.from || 'Unknown',
            contentHash,
            msg.timestamp ? new Date(msg.timestamp * 1000).toISOString() : new Date().toISOString(),
          ]
        );

        if (insertResult.rowCount > 0) newCount += 1;
      }

      await query(
        `UPDATE sources
         SET last_polled = NOW(),
             message_count = COALESCE(message_count, 0) + $1,
             status = 'connected',
             last_error = NULL
         WHERE id = $2`,
        [newCount, source.id]
      );
    } catch (err) {
      const info = classifyError(err);
      console.error(`[WhatsApp] Poll error for ${source.name}:`, err.message);
      await query(
        `UPDATE sources
         SET status = $1, last_error = $2, last_polled = NOW()
         WHERE id = $3`,
        [info.retryable ? 'connected' : 'error', `${info.type}: ${err.message}`, source.id]
      );
    }
  }
}

module.exports = { getMessages, getGroups, pollAllSources, hashContent, classifyError };
