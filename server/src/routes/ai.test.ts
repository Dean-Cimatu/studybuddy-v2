import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './auth';
import { createAiRouter } from './ai';
import type { GeneratedTask } from '../ai/claude';

// ── Mock claude module — no real API calls in tests ───────────────────────────
vi.mock('../ai/claude', () => ({
  generateTasksFromDescription: vi.fn(),
  chatWellbeing: vi.fn(),
}));

import { generateTasksFromDescription, chatWellbeing } from '../ai/claude';
const mockGenerate = vi.mocked(generateTasksFromDescription);
const mockChat = vi.mocked(chatWellbeing);

// ── Test app setup ────────────────────────────────────────────────────────────
let mongoServer: MongoMemoryServer;

// Use limit=3 so rate limit tests are cheap (4th request is rejected)
const RATE_LIMIT = 3;
const app = express();

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-32-chars-long-xxxxxxxx';
  // Sentinel value — tests assert this never leaks into a response body
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-sentinel-value-should-never-appear-in-responses';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  app.use('/api/ai', createAiRouter(RATE_LIMIT));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
  vi.clearAllMocks();
});

async function registerAndGetCookie(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', displayName: 'Test' });
  return ((res.headers['set-cookie'] as unknown) as string[])[0];
}

// ── (a) Response parsing ──────────────────────────────────────────────────────

describe('POST /api/ai/generate-tasks — response parsing', () => {
  it('parses generated tasks and inserts them for the authenticated user', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');

    const mockTasks: GeneratedTask[] = [
      { title: 'Read Chapter 5', description: 'Focus on sections 5.1–5.3', priority: 'high', status: 'todo', estimatedMinutes: 45 },
      { title: 'Do practice problems', priority: 'med', status: 'todo' },
    ];
    mockGenerate.mockResolvedValueOnce(mockTasks);

    const res = await request(app)
      .post('/api/ai/generate-tasks')
      .set('Cookie', cookie)
      .send({ description: 'Prepare for my calculus exam on integrals' });

    expect(res.status).toBe(201);
    expect(res.body.tasks).toHaveLength(2);
    expect(res.body.tasks[0].title).toBe('Read Chapter 5');
    expect(res.body.tasks[0].priority).toBe('high');
    expect(res.body.tasks[0].estimatedMinutes).toBe(45);
    expect(res.body.tasks[1].title).toBe('Do practice problems');
    // Tasks belong to the requesting user
    expect(res.body.tasks[0].userId).toBeDefined();
    expect(mockGenerate).toHaveBeenCalledWith(
      'Prepare for my calculus exam on integrals',
      expect.any(String)
    );
  });

  it('returns 400 when description is missing', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const res = await request(app).post('/api/ai/generate-tasks').set('Cookie', cookie).send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).post('/api/ai/generate-tasks').send({ description: 'test' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/ai/chat — response parsing', () => {
  it('returns reply and strips resource tag', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');

    mockChat.mockResolvedValueOnce({
      reply: "It sounds like you're feeling overwhelmed. Try the 4-7-8 breathing technique to reset. You've got this.",
      resourceCategory: 'stress',
    });

    const res = await request(app)
      .post('/api/ai/chat')
      .set('Cookie', cookie)
      .send({ messages: [{ role: 'user', content: "I'm really stressed about exams" }] });

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain("overwhelmed");
    expect(res.body.resourceCategory).toBe('stress');
    // Resource tag must be stripped from reply
    expect(res.body.reply).not.toMatch(/\[RESOURCE:/);
  });

  it('returns reply without resourceCategory when none present', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');

    mockChat.mockResolvedValueOnce({ reply: 'Keep going, you can do it.' });

    const res = await request(app)
      .post('/api/ai/chat')
      .set('Cookie', cookie)
      .send({ messages: [{ role: 'user', content: 'Hello' }] });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe('Keep going, you can do it.');
    expect(res.body.resourceCategory).toBeUndefined();
  });

  it('returns 400 when messages array is empty', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Cookie', cookie)
      .send({ messages: [] });
    expect(res.status).toBe(400);
  });
});

// ── (b) Rate limit ────────────────────────────────────────────────────────────

describe(`rate limiting — kicks in on request ${RATE_LIMIT + 1}`, () => {
  it(`allows ${RATE_LIMIT} requests then returns 429`, async () => {
    const cookie = await registerAndGetCookie('ratelimit@test.com');

    mockChat.mockResolvedValue({ reply: 'OK', resourceCategory: 'general' });

    // First RATE_LIMIT requests should succeed
    for (let i = 0; i < RATE_LIMIT; i++) {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Cookie', cookie)
        .send({ messages: [{ role: 'user', content: `message ${i}` }] });
      expect(res.status).toBe(200);
    }

    // Next request must be rate limited
    const limited = await request(app)
      .post('/api/ai/chat')
      .set('Cookie', cookie)
      .send({ messages: [{ role: 'user', content: 'one too many' }] });

    expect(limited.status).toBe(429);
    expect(limited.body.error).toMatch(/too many/i);
  });

  it('rate limits per user — a second user is not affected', async () => {
    const cookieA = await registerAndGetCookie('userA@test.com');
    const cookieB = await registerAndGetCookie('userB@test.com');

    mockChat.mockResolvedValue({ reply: 'OK' });

    // Exhaust userA's limit
    for (let i = 0; i < RATE_LIMIT; i++) {
      await request(app)
        .post('/api/ai/chat')
        .set('Cookie', cookieA)
        .send({ messages: [{ role: 'user', content: `msg ${i}` }] });
    }
    const blockedA = await request(app)
      .post('/api/ai/chat')
      .set('Cookie', cookieA)
      .send({ messages: [{ role: 'user', content: 'extra' }] });
    expect(blockedA.status).toBe(429);

    // userB should still be able to make requests
    const okB = await request(app)
      .post('/api/ai/chat')
      .set('Cookie', cookieB)
      .send({ messages: [{ role: 'user', content: 'hello' }] });
    expect(okB.status).toBe(200);
  });
});

// ── (c) API key never leaked to client ───────────────────────────────────────

describe('API key security — ANTHROPIC_API_KEY never appears in any response', () => {
  const SENTINEL = 'sk-ant-test-sentinel-value-should-never-appear-in-responses';

  it('generate-tasks response does not contain the API key', async () => {
    const cookie = await registerAndGetCookie('security@test.com');
    mockGenerate.mockResolvedValueOnce([{ title: 'Task', priority: 'med', status: 'todo' }]);

    const res = await request(app)
      .post('/api/ai/generate-tasks')
      .set('Cookie', cookie)
      .send({ description: 'Study chemistry' });

    expect(JSON.stringify(res.body)).not.toContain(SENTINEL);
    expect(JSON.stringify(res.headers)).not.toContain(SENTINEL);
  });

  it('chat response does not contain the API key', async () => {
    const cookie = await registerAndGetCookie('security2@test.com');
    mockChat.mockResolvedValueOnce({ reply: 'Keep going!', resourceCategory: 'motivation' });

    const res = await request(app)
      .post('/api/ai/chat')
      .set('Cookie', cookie)
      .send({ messages: [{ role: 'user', content: 'help' }] });

    expect(JSON.stringify(res.body)).not.toContain(SENTINEL);
    expect(JSON.stringify(res.headers)).not.toContain(SENTINEL);
  });

  it('error responses do not leak the API key', async () => {
    const cookie = await registerAndGetCookie('security3@test.com');
    mockGenerate.mockRejectedValueOnce(new Error('Anthropic API error'));

    const res = await request(app)
      .post('/api/ai/generate-tasks')
      .set('Cookie', cookie)
      .send({ description: 'Study biology' });

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain(SENTINEL);
    expect(JSON.stringify(res.body)).not.toContain('sk-ant');
  });
});
