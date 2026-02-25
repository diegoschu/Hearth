const { normalizeTokens, mergeTokenSets, buildOAuthState, verifyOAuthState } = require('./google');

describe('google config helpers', () => {
  const oldSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = oldSecret;
  });

  test('normalizeTokens provides stable shape', () => {
    expect(normalizeTokens({ access_token: 'a' })).toEqual({
      access_token: 'a',
      refresh_token: null,
      scope: null,
      token_type: 'Bearer',
      expiry_date: null,
    });
  });

  test('mergeTokenSets preserves existing refresh_token', () => {
    const merged = mergeTokenSets(
      { access_token: 'old', refresh_token: 'keep', scope: 's1', expiry_date: 1 },
      { access_token: 'new', refresh_token: null, scope: 's2', expiry_date: 2 }
    );

    expect(merged.access_token).toBe('new');
    expect(merged.refresh_token).toBe('keep');
    expect(merged.scope).toBe('s2');
    expect(merged.expiry_date).toBe(2);
  });

  test('oauth state is signed and verifiable', () => {
    const state = buildOAuthState({ returnTo: '/auth/callback' });
    const payload = verifyOAuthState(state);
    expect(payload.returnTo).toBe('/auth/callback');
  });
});
