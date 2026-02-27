const request = require('supertest');

/**
 * Health and readiness endpoints should be stable for probes and tooling.
 */
describe('health and readiness endpoints', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...OLD_ENV,
      FRONTEND_URL: 'http://localhost:3000',
      JWT_SECRET: 'test-secret',
      DATABASE_URL: 'postgres://localhost/test',
    };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  function makeAppWithDbMock({ healthcheckImpl, isDbConfigured = true } = {}) {
    jest.doMock('./config/database', () => ({
      requireEnv: jest.fn(),
      healthcheckDb: healthcheckImpl || jest.fn().mockResolvedValue(undefined),
      dbMode: 'postgres',
      pool: {},
      isDbConfigured,
    }));

    // isolate after mocks so index.js picks up the stubbed module
    const { createApp } = require('./index');
    return createApp();
  }

  test('GET /health reports ok when DB check passes', async () => {
    const app = makeAppWithDbMock();

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      db: 'ok',
      dbConfigured: true,
    });
    expect(typeof res.body.uptimeSec).toBe('number');
    expect(typeof res.body.timestamp).toBe('string');
  });

  test('GET /health returns degraded when DB check throws', async () => {
    const app = makeAppWithDbMock({
      healthcheckImpl: jest.fn().mockRejectedValue(new Error('db down')),
      isDbConfigured: true,
    });

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      status: 'degraded',
      db: 'error',
      dbConfigured: true,
    });
    expect(res.body.error).toContain('db down');
  });

  test('GET /ready reports ready when DB check passes', async () => {
    const app = makeAppWithDbMock();

    const res = await request(app).get('/ready');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ready: true,
      checks: { db: 'ok', env: 'ok' },
    });
    expect(typeof res.body.timestamp).toBe('string');
  });

  test('GET /ready returns not ready when DB check throws', async () => {
    const app = makeAppWithDbMock({
      healthcheckImpl: jest.fn().mockRejectedValue(new Error('connection refused')),
      isDbConfigured: true,
    });

    const res = await request(app).get('/ready');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      ready: false,
      checks: { db: 'error', env: 'ok' },
    });
    expect(res.body.error).toContain('connection refused');
  });
});
