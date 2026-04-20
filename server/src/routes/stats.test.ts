import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './auth';
import statsRouter from './stats';
import { UserModel } from '../models/User';

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
