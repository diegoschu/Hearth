const request = require('supertest');
const express = require('express');

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../services/calendar.service', () => ({
  createEvent: jest.fn(),
  syncCalendar: jest.fn(),
  getUnifiedView: jest.fn(),
  detectConflicts: jest.fn(),
}));

jest.mock('../services/agent.service', () => ({
  generateDigest: jest.fn(),
}));

jest.mock('../services/whatsapp.service', () => ({
  getGroups: jest.fn().mockResolvedValue([]),
}));

const { query } = require('../config/database');
const calendarService = require('../services/calendar.service');
const agentService = require('../services/agent.service');

const familyRoutes = require('./family.routes');
const sourceRoutes = require('./source.routes');
const feedRoutes = require('./feed.routes');
const calendarRoutes = require('./calendar.routes');
const settingsRoutes = require('./settings.routes');
const digestRoutes = require('./digest.routes');
const { errorHandler } = require('../middleware/error.middleware');

function makeApp(user = { id: 'u1', family_id: 'f1' }) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = user;
    next();
  });
  app.use('/family', familyRoutes);
  app.use('/sources', sourceRoutes);
  app.use('/feed', feedRoutes);
  app.use('/calendar', calendarRoutes);
  app.use('/settings', settingsRoutes);
  app.use('/digest', digestRoutes);
  app.use(errorHandler);
  return app;
}

describe('backend route hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('family create validates name', async () => {
    const res = await request(makeApp()).post('/family').send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_NAME');
  });

  test('sources delete returns 404 when row not found', async () => {
    query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(makeApp()).delete('/sources/s1');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SOURCE_NOT_FOUND');
  });

  test('feed list validates status', async () => {
    const res = await request(makeApp()).get('/feed?status=bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  test('feed dismiss returns 404 for unknown event', async () => {
    query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(makeApp()).post('/feed/e1/dismiss');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('calendar validates date range', async () => {
    const res = await request(makeApp()).get('/calendar?start=today&end=tomorrow');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_DATE_RANGE');
  });

  test('calendar sync requires family', async () => {
    const res = await request(makeApp({ id: 'u1', family_id: null })).post('/calendar/sync');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FAMILY_REQUIRED');
    expect(calendarService.syncCalendar).not.toHaveBeenCalled();
  });

  test('settings autonomy validates category and level', async () => {
    const missingCategory = await request(makeApp()).put('/settings/autonomy').send({ level: 2 });
    expect(missingCategory.status).toBe(400);
    expect(missingCategory.body.error.code).toBe('INVALID_CATEGORY');

    const badLevel = await request(makeApp()).put('/settings/autonomy').send({ category: 'calendar', level: 9 });
    expect(badLevel.status).toBe(400);
    expect(badLevel.body.error.code).toBe('INVALID_LEVEL');
  });

  test('digest requires family', async () => {
    const res = await request(makeApp({ id: 'u1', family_id: null })).get('/digest');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FAMILY_REQUIRED');
    expect(agentService.generateDigest).not.toHaveBeenCalled();
  });
});
