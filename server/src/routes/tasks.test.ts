import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './auth';
import tasksRouter from './tasks';

let mongoServer: MongoMemoryServer;
const app = express();

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-32-chars-long-xxxxxxxx';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  app.use('/api/tasks', tasksRouter);
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

async function createTask(cookie: string, data: Record<string, unknown>) {
  const res = await request(app).post('/api/tasks').set('Cookie', cookie).send(data);
  return res.body.task as { id: string };
}

// ── Authentication guard ──────────────────────────────────────────────────────

describe('unauthenticated requests', () => {
  it('GET /api/tasks returns 401', async () => {
    expect((await request(app).get('/api/tasks')).status).toBe(401);
  });
  it('POST /api/tasks returns 401', async () => {
    expect((await request(app).post('/api/tasks').send({ title: 'x' })).status).toBe(401);
  });
});

// ── Happy path ────────────────────────────────────────────────────────────────

describe('GET /api/tasks', () => {
  it('returns empty list for a new user', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const res = await request(app).get('/api/tasks').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.tasks).toEqual([]);
  });

  it('only returns tasks owned by the requesting user', async () => {
    const cookieA = await registerAndGetCookie('alice@test.com');
    const cookieB = await registerAndGetCookie('bob@test.com');
    await createTask(cookieA, { title: 'Alice task' });
    await createTask(cookieB, { title: 'Bob task' });

    const res = await request(app).get('/api/tasks').set('Cookie', cookieA);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].title).toBe('Alice task');
  });

  it('filters by ?status=', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    await createTask(cookie, { title: 'Todo task', status: 'todo' });
    await createTask(cookie, { title: 'Done task', status: 'done' });

    const res = await request(app).get('/api/tasks?status=done').set('Cookie', cookie);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].title).toBe('Done task');
  });
});

describe('POST /api/tasks', () => {
  it('creates a task with defaults', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const res = await request(app).post('/api/tasks').set('Cookie', cookie).send({ title: 'Study math' });

    expect(res.status).toBe(201);
    expect(res.body.task.title).toBe('Study math');
    expect(res.body.task.priority).toBe('med');
    expect(res.body.task.status).toBe('todo');
    expect(res.body.task.id).toBeDefined();
    expect(res.body.task.userId).toBeDefined();
  });

  it('creates a task with all fields', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const res = await request(app).post('/api/tasks').set('Cookie', cookie).send({
      title: 'Read chapter 5',
      description: 'Pages 120–150',
      priority: 'high',
      status: 'doing',
      estimatedMinutes: 45,
      dueDate: '2026-04-20',
    });

    expect(res.status).toBe(201);
    expect(res.body.task.priority).toBe('high');
    expect(res.body.task.estimatedMinutes).toBe(45);
    expect(res.body.task.dueDate).toBe('2026-04-20');
  });

  it('rejects a missing title', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const res = await request(app).post('/api/tasks').set('Cookie', cookie).send({ priority: 'high' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid priority value', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', cookie)
      .send({ title: 'Test', priority: 'urgent' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/tasks/:id', () => {
  it('returns the task to its owner', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const { id } = await createTask(cookie, { title: 'My task' });

    const res = await request(app).get(`/api/tasks/${id}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.task.id).toBe(id);
  });

  it('returns 404 for a non-existent task', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const res = await request(app)
      .get('/api/tasks/000000000000000000000001')
      .set('Cookie', cookie);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/tasks/:id', () => {
  it('updates fields on the owner\'s task', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const { id } = await createTask(cookie, { title: 'Draft' });

    const res = await request(app)
      .patch(`/api/tasks/${id}`)
      .set('Cookie', cookie)
      .send({ title: 'Final', status: 'done' });

    expect(res.status).toBe(200);
    expect(res.body.task.title).toBe('Final');
    expect(res.body.task.status).toBe('done');
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('deletes the owner\'s task and returns 204', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const { id } = await createTask(cookie, { title: 'To delete' });

    expect((await request(app).delete(`/api/tasks/${id}`).set('Cookie', cookie)).status).toBe(204);
    expect((await request(app).get(`/api/tasks/${id}`).set('Cookie', cookie)).status).toBe(404);
  });
});

// ── Cross-user isolation (CRITICAL) ──────────────────────────────────────────

describe('cross-user isolation — user B must never see or affect user A tasks', () => {
  it('GET /:id returns 404 (not 403) — does not leak existence', async () => {
    const cookieA = await registerAndGetCookie('alice@test.com');
    const cookieB = await registerAndGetCookie('bob@test.com');
    const { id } = await createTask(cookieA, { title: "Alice's secret" });

    const res = await request(app).get(`/api/tasks/${id}`).set('Cookie', cookieB);
    expect(res.status).toBe(404);
  });

  it('PATCH /:id returns 404 — cannot update another user\'s task', async () => {
    const cookieA = await registerAndGetCookie('alice@test.com');
    const cookieB = await registerAndGetCookie('bob@test.com');
    const { id } = await createTask(cookieA, { title: "Alice's task" });

    const res = await request(app)
      .patch(`/api/tasks/${id}`)
      .set('Cookie', cookieB)
      .send({ status: 'done' });
    expect(res.status).toBe(404);

    // Verify Alice's task is unchanged
    const check = await request(app).get(`/api/tasks/${id}`).set('Cookie', cookieA);
    expect(check.body.task.status).toBe('todo');
  });

  it('DELETE /:id returns 404 — cannot delete another user\'s task', async () => {
    const cookieA = await registerAndGetCookie('alice@test.com');
    const cookieB = await registerAndGetCookie('bob@test.com');
    const { id } = await createTask(cookieA, { title: "Alice's task" });

    const res = await request(app).delete(`/api/tasks/${id}`).set('Cookie', cookieB);
    expect(res.status).toBe(404);

    // Verify Alice's task still exists
    expect((await request(app).get(`/api/tasks/${id}`).set('Cookie', cookieA)).status).toBe(200);
  });

  it('GET / never returns tasks from another user', async () => {
    const cookieA = await registerAndGetCookie('alice@test.com');
    const cookieB = await registerAndGetCookie('bob@test.com');
    await createTask(cookieA, { title: "Alice's task 1" });
    await createTask(cookieA, { title: "Alice's task 2" });

    const res = await request(app).get('/api/tasks').set('Cookie', cookieB);
    expect(res.body.tasks).toHaveLength(0);
  });
});
