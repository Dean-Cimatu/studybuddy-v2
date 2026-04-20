import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './auth';
import statsRouter from './stats';

let mongoServer: MongoMemoryServer;
const app = express();

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-32-chars-long-xxxxxxxx';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  app.use('/api/stats', statsRouter);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

async function registerAndGetCookie(email = 'user@test.com') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', displayName: 'Test' });
  return ((res.headers['set-cookie'] as unknown) as string[])[0];
}

const validSession = {
  startTime: '2026-04-20T09:00:00.000Z',
  endTime: '2026-04-20T09:25:00.000Z',
  durationMinutes: 25,
  type: 'pomodoro',
};

describe('POST /api/stats/session', () => {
  it('creates document and returns it with 201', async () => {
    const cookie = await registerAndGetCookie();
    const res = await request(app)
      .post('/api/stats/session')
      .set('Cookie', cookie)
      .send(validSession);

    expect(res.status).toBe(201);
    expect(res.body.session.durationMinutes).toBe(25);
    expect(res.body.session.type).toBe('pomodoro');
  });

  it('rejects durationMinutes of 0', async () => {
    const cookie = await registerAndGetCookie();
    const res = await request(app)
      .post('/api/stats/session')
      .set('Cookie', cookie)
      .send({ ...validSession, durationMinutes: 0 });

    expect(res.status).toBe(400);
  });

  it('rejects durationMinutes > 480', async () => {
    const cookie = await registerAndGetCookie();
    const res = await request(app)
      .post('/api/stats/session')
      .set('Cookie', cookie)
      .send({ ...validSession, durationMinutes: 481 });

    expect(res.status).toBe(400);
  });

  it('rejects missing startTime', async () => {
    const cookie = await registerAndGetCookie();
    const { startTime: _omitted, ...noStart } = validSession;
    const res = await request(app)
      .post('/api/stats/session')
      .set('Cookie', cookie)
      .send(noStart);

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth cookie', async () => {
    const res = await request(app)
      .post('/api/stats/session')
      .send(validSession);

    expect(res.status).toBe(401);
  });

  it('increments user.totalStudyMinutes', async () => {
    const cookie = await registerAndGetCookie('mins@test.com');
    await request(app)
      .post('/api/stats/session')
      .set('Cookie', cookie)
      .send(validSession);

    const meRes = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(meRes.body.user.totalStudyMinutes).toBe(25);
  });
});

describe('GET /api/stats/dashboard', () => {
  it('returns all expected fields', async () => {
    const cookie = await registerAndGetCookie('dash@test.com');
    const res = await request(app).get('/api/stats/dashboard').set('Cookie', cookie);

    expect(res.status).toBe(200);
    const s = res.body;
    expect(s).toHaveProperty('studyMinutesToday');
    expect(s).toHaveProperty('studyMinutesThisWeek');
    expect(s).toHaveProperty('totalStudyMinutes');
    expect(s).toHaveProperty('tasksCompletedToday');
    expect(s).toHaveProperty('tasksCompletedThisWeek');
    expect(s).toHaveProperty('currentStreak');
    expect(s).toHaveProperty('longestStreak');
    expect(s).toHaveProperty('weeklyGoalHours');
    expect(s).toHaveProperty('weeklyGoalProgress');
    expect(s).toHaveProperty('studyScoreThisWeek');
  });

  it('returns 0s for a new user with no sessions', async () => {
    const cookie = await registerAndGetCookie('zero@test.com');
    const res = await request(app).get('/api/stats/dashboard').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.studyMinutesToday).toBe(0);
    expect(res.body.studyMinutesThisWeek).toBe(0);
    expect(res.body.tasksCompletedToday).toBe(0);
    expect(res.body.currentStreak).toBe(0);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/stats/dashboard');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/stats/history', () => {
  it('returns array with correct number of days (default 30)', async () => {
    const cookie = await registerAndGetCookie('hist@test.com');
    const res = await request(app).get('/api/stats/history').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.history).toHaveLength(30);
  });

  it('includes days with 0 minutes (gap filling)', async () => {
    const cookie = await registerAndGetCookie('gaps@test.com');
    const res = await request(app).get('/api/stats/history?days=7').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.history.every((d: { minutes: number }) => d.minutes === 0)).toBe(true);
  });

  it('respects ?days param', async () => {
    const cookie = await registerAndGetCookie('dpar@test.com');
    const res = await request(app).get('/api/stats/history?days=14').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.history).toHaveLength(14);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/stats/history');
    expect(res.status).toBe(401);
  });
});
