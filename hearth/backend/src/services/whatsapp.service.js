const axios = require('axios');
const crypto = require('crypto');
const { supabase } = require('../config/database');

const rapidApiClient = axios.create({
  baseURL: `https://${process.env.RAPIDAPI_WHATSAPP_HOST}`,
  headers: {
    'x-rapidapi-key': process.env.RAPIDAPI_KEY,
    'x-rapidapi-host': process.env.RAPIDAPI_WHATSAPP_HOST,
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch recent messages from a WhatsApp group chat via RapidAPI.
 * Adapter pattern — swap RapidAPI provider by changing this function.
 * 
 * Common RapidAPI WhatsApp providers:
 * - maytapi (WhatsApp API by Maytapi)
 * - greenapi (Green API)
 * - ultramsg
 * 
 * Adjust the endpoint paths below based on your chosen provider.
 */
async function getMessages(chatId, limit = 50) {
  try {
    // NOTE: Adjust endpoint based on your RapidAPI WhatsApp provider
    // Example for a common provider structure:
    const response = await rapidApiClient.get('/messages', {
      params: {
        chatId,
        limit,
      },
    });

    return response.data.messages || response.data || [];
  } catch (error) {
    console.error(`[WhatsApp] Failed to fetch messages for chat ${chatId}:`, error.message);
    throw error;
  }
}

/**
 * Get list of available WhatsApp groups (for source registration UI)
 */
async function getGroups() {
  try {
    const response = await rapidApiClient.get('/groups');
    return response.data.groups || response.data || [];
  } catch (error) {
    console.error('[WhatsApp] Failed to fetch groups:', error.message);
    throw error;
  }
}

/**
 * Hash message content for deduplication
 */
function hashContent(content) {
  return crypto.createHash('sha256').update(content.trim().toLowerCase()).digest('hex');
}

/**
 * Poll all registered WhatsApp sources across all families.
 * Called by cron job every 60 seconds.
 */
async function pollAllSources() {
  // Get all active WhatsApp sources
  const { data: sources, error } = await supabase
    .from('sources')
    .select('*')
    .eq('type', 'whatsapp')
    .eq('status', 'connected');

  if (error) {
    console.error('[WhatsApp] Failed to fetch sources:', error.message);
    return;
  }

  for (const source of sources) {
    try {
      const chatId = source.config?.chatId;
      if (!chatId) continue;

      const messages = await getMessages(chatId);

      let newCount = 0;
      for (const msg of messages) {
        const contentHash = hashContent(msg.body || msg.text || msg.content || '');
        const content = msg.body || msg.text || msg.content || '';

        if (!content.trim()) continue;

        // Insert with ON CONFLICT to handle deduplication
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
              received_at: msg.timestamp
                ? new Date(msg.timestamp * 1000).toISOString()
                : new Date().toISOString(),
              processed: false,
            },
            { onConflict: 'source_id,content_hash', ignoreDuplicates: true }
          );

        if (!insertError) newCount++;
      }

      // Update source metadata
      await supabase
        .from('sources')
        .update({
          last_polled: new Date().toISOString(),
          message_count: (source.message_count || 0) + newCount,
        })
        .eq('id', source.id);

      if (newCount > 0) {
        console.log(`[WhatsApp] ${source.name}: ${newCount} new messages ingested`);
      }
    } catch (err) {
      console.error(`[WhatsApp] Error polling source ${source.name}:`, err.message);

      // Mark source as errored
      await supabase
        .from('sources')
        .update({ status: 'error' })
        .eq('id', source.id);
    }
  }
}

module.exports = {
  getMessages,
  getGroups,
  pollAllSources,
  hashContent,
};
