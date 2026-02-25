const {
  hasRequiredGoogleScopes,
  validateSourceConfig,
} = require('./integrations.service');

describe('integrations guardrails', () => {
  test('validates required google scopes', () => {
    const ok = hasRequiredGoogleScopes(
      { scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.readonly' },
      ['https://www.googleapis.com/auth/gmail.readonly']
    );
    expect(ok).toBe(true);

    const missing = hasRequiredGoogleScopes(
      { scope: 'https://www.googleapis.com/auth/calendar' },
      ['https://www.googleapis.com/auth/gmail.readonly']
    );
    expect(missing).toBe(false);
  });

  test('requires whatsapp config and chatId when creating whatsapp source', () => {
    delete process.env.RAPIDAPI_KEY;
    delete process.env.RAPIDAPI_WHATSAPP_HOST;

    expect(() => validateSourceConfig({ type: 'whatsapp', config: {}, user: {} })).toThrow('not configured');

    process.env.RAPIDAPI_KEY = 'key';
    process.env.RAPIDAPI_WHATSAPP_HOST = 'host';

    expect(() => validateSourceConfig({ type: 'whatsapp', config: {}, user: {} })).toThrow('config.chatId');
  });

  test('requires google connection for gmail/gcal sources', () => {
    expect(() => validateSourceConfig({ type: 'gmail', config: {}, user: { google_tokens: null } })).toThrow('not connected');

    const userWithScope = {
      google_tokens: {
        access_token: 'a',
        scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar',
      },
    };

    expect(() => validateSourceConfig({ type: 'gmail', config: {}, user: userWithScope })).not.toThrow();
  });
});
