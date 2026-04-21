import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './auth';
import calendarRouter from './calendar';

vi.mock('../services/googleCalendar', () => ({
  getAuthUrl: vi.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth?mock=1'),
  handleCallback: vi.fn().mockResolvedValue(undefined),
  getEvents: vi.fn().mockResolvedValue([
    { id: 'evt1', title: 'Team meeting', start: '2026-04-21T10:00:00Z', end: '2026-04-21T11:00:00Z', allDay: false, source: 'google' },
  ]),
  createEvent: vi.fn().mockResolvedValue('new-event-id'),
  updateEvent: vi.fn().mockResolvedValue(undefined),
  deleteEvent: vi.fn().mockResolvedValue(undefined),
}));

let mongoServer: MongoMemoryServer;
const app = express();

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-32-chars-long-xxxxxxxx';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  app.use('/api/calendar', calendarRouter);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

async function registerAndGetCookie(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', displayName: 'Test User' });
  return ((res.headers['set-cookie'] as unknown) as string[])[0];
}

// ── Auth guard ────────────────────────────────────────────────────────────────

describe('unauthenticated requests', () => {
  it('GET /api/calendar/connect returns 401', async () => {
    expect((await request(app).get('/api/calendar/connect')).status).toBe(401);
  });

  it('GET /api/calendar/events returns 401', async () => {
    expect(
      (await request(app).get('/api/calendar/events?start=2026-04-01T00:00:00Z&end=2026-04-30T23:59:59Z')).status
    ).toBe(401);
  });

  it('POST /api/calendar/disconnect returns 401', async () => {
    expect((await request(app).post('/api/calendar/disconnect')).status).toBe(401);
  });
});

// ── Connect ───────────────────────────────────────────────────────────────────

describe('GET /api/calendar/connect', () => {
  it('returns a Google OAuth URL', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const res = await request(app).get('/api/calendar/connect').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.url).toContain('accounts.google.com');
  });
});

// ── Events ────────────────────────────────────────────────────────────────────

describe('GET /api/calendar/events', () => {
  it('returns 400 if Google Calendar not connected', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const res = await request(app)
      .get('/api/calendar/events?start=2026-04-01T00:00:00Z&end=2026-04-30T23:59:59Z')
      .set('Cookie', cookie);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Google Calendar not connected');
  });

  it('returns 400 if start/end params missing', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const res = await request(app).get('/api/calendar/events').set('Cookie', cookie);
    expect(res.status).toBe(400);
  });
});

// ── Disconnect ────────────────────────────────────────────────────────────────

describe('POST /api/calendar/disconnect', () => {
  it('returns { disconnected: true }', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const res = await request(app).post('/api/calendar/disconnect').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.disconnected).toBe(true);
  });
});
