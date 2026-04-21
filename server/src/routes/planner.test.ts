import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './auth';
import plannerRouter from './planner';
import type { StudyPlan } from '@studybuddy/shared';

vi.mock('../services/studyPlanner', async () => {
  const actual = await vi.importActual<typeof import('../services/studyPlanner')>('../services/studyPlanner');
  const MOCK_SESSIONS = [
    { dayOfWeek: 0, startHour: 9, durationMinutes: 50, moduleId: null, moduleName: 'Maths', moduleColour: '#3B82F6', topic: 'Calculus revision', googleEventId: null },
    { dayOfWeek: 2, startHour: 14, durationMinutes: 50, moduleId: null, moduleName: 'Physics', moduleColour: '#10B981', topic: 'Wave mechanics', googleEventId: null },
  ];
  return {
    getWeekStartDate: actual.getWeekStartDate,
    generateWeeklyPlan: vi.fn().mockImplementation(async (userId: string) => {
      const { StudyPlanModel } = await import('../models/StudyPlan');
      const weekStartDate = actual.getWeekStartDate();
      const plan = await StudyPlanModel.findOneAndUpdate(
        { userId, weekStartDate },
        { $set: { sessions: MOCK_SESSIONS, totalPlannedMinutes: 100, generatedAt: new Date().toISOString() } },
        { upsert: true, new: true }
      );
      return plan!.toJSON() as unknown as StudyPlan;
    }),
  };
});

vi.mock('../services/googleCalendar', () => ({
  getAuthUrl: vi.fn(),
  handleCallback: vi.fn(),
  getEvents: vi.fn().mockResolvedValue([]),
  createEvent: vi.fn().mockResolvedValue('evt-id'),
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
  app.use('/api/planner', plannerRouter);
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
  it('POST /api/planner/generate returns 401', async () => {
    expect((await request(app).post('/api/planner/generate')).status).toBe(401);
  });
  it('GET /api/planner/current returns 401', async () => {
    expect((await request(app).get('/api/planner/current')).status).toBe(401);
  });
});

// ── Generate ──────────────────────────────────────────────────────────────────

describe('POST /api/planner/generate', () => {
  it('returns a plan with sessions', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const res = await request(app).post('/api/planner/generate').set('Cookie', cookie).send({});
    expect(res.status).toBe(201);
    expect(res.body.plan.sessions).toHaveLength(2);
    expect(res.body.plan.sessions[0].moduleName).toBe('Maths');
  });
});

// ── Current ───────────────────────────────────────────────────────────────────

describe('GET /api/planner/current', () => {
  it('returns null when no plan exists', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const res = await request(app).get('/api/planner/current').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.plan).toBeNull();
  });

  it('returns the plan after generating', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    await request(app).post('/api/planner/generate').set('Cookie', cookie).send({});
    const res = await request(app).get('/api/planner/current').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.plan).not.toBeNull();
  });
});

// ── Update session ────────────────────────────────────────────────────────────

describe('PUT /api/planner/session/:index', () => {
  it('updates the session topic and time', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    await request(app).post('/api/planner/generate').set('Cookie', cookie).send({});

    const res = await request(app)
      .put('/api/planner/session/0')
      .set('Cookie', cookie)
      .send({ startHour: 10, topic: 'Linear algebra' });
    expect(res.status).toBe(200);
    expect(res.body.plan.sessions[0].startHour).toBe(10);
    expect(res.body.plan.sessions[0].topic).toBe('Linear algebra');
  });

  it('returns 400 for out-of-range index', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    await request(app).post('/api/planner/generate').set('Cookie', cookie).send({});
    const res = await request(app)
      .put('/api/planner/session/99')
      .set('Cookie', cookie)
      .send({ topic: 'x' });
    expect(res.status).toBe(400);
  });
});

// ── Remove session ────────────────────────────────────────────────────────────

describe('DELETE /api/planner/session/:index', () => {
  it('removes the session', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    await request(app).post('/api/planner/generate').set('Cookie', cookie).send({});
    const res = await request(app).delete('/api/planner/session/0').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.plan.sessions).toHaveLength(1);
  });
});
