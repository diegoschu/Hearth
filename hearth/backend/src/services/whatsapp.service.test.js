jest.mock('../config/database', () => ({ query: jest.fn() }));

const { getMessages, classifyError } = require('./whatsapp.service');

describe('whatsapp service degradation', () => {
  test('returns empty list when WhatsApp integration env is missing', async () => {
    delete process.env.RAPIDAPI_KEY;
    delete process.env.RAPIDAPI_WHATSAPP_HOST;

    const messages = await getMessages('chat-1');
    expect(messages).toEqual([]);
  });

  test('classifyError detects auth/rate-limit/timeout', () => {
    expect(classifyError({ response: { status: 401 } })).toEqual({ type: 'auth', retryable: false });
    expect(classifyError({ response: { status: 429 } })).toEqual({ type: 'rate_limit', retryable: true });
    expect(classifyError({ code: 'ECONNABORTED' })).toEqual({ type: 'timeout', retryable: true });
  });
});
