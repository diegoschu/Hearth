describe('startup hardening', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('validateStartupEnv fails when required env is missing', () => {
    process.env.JWT_SECRET = '';
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.DATABASE_URL = 'postgres://localhost/test';

    jest.isolateModules(() => {
      const { validateStartupEnv } = require('./index');
      expect(() => validateStartupEnv()).toThrow(/JWT_SECRET/);
    });
  });

  test('maybeAutoMigrate runs under advisory lock', async () => {
    const query = jest.fn().mockResolvedValue({});
    const release = jest.fn();
    const connect = jest.fn().mockResolvedValue({ query, release });

    process.env.AUTO_MIGRATE = 'true';

    jest.doMock('./config/database', () => ({
      requireEnv: jest.fn(),
      healthcheckDb: jest.fn(),
      dbMode: 'postgres',
      pool: { connect },
      isDbConfigured: true,
    }));

    await jest.isolateModulesAsync(async () => {
      const { maybeAutoMigrate } = require('./index');
      await maybeAutoMigrate();
    });

    expect(query).toHaveBeenCalledWith('BEGIN');
    expect(query).toHaveBeenCalledWith("SELECT pg_advisory_xact_lock(hashtext('hearth_schema_migration'))");
    expect(query).toHaveBeenCalledWith('COMMIT');
    expect(release).toHaveBeenCalled();
  });
});
