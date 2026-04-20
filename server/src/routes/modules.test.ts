import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './auth';
import modulesRouter from './modules';

let mongoServer: MongoMemoryServer;
const app = express();

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-32-chars-long-xxxxxxxx';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  app.use('/api/modules', modulesRouter);
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

const validModule = { name: 'CST2555', fullName: 'Operating Systems', colour: '#3B82F6' };

describe('POST /api/modules', () => {
  it('creates module and returns it with 201', async () => {
    const cookie = await registerAndGetCookie();
    const res = await request(app)
      .post('/api/modules')
      .set('Cookie', cookie)
      .send(validModule);

    expect(res.status).toBe(201);
    expect(res.body.module.name).toBe('CST2555');
    expect(res.body.module.colour).toBe('#3B82F6');
  });

  it('rejects invalid hex colour', async () => {
    const cookie = await registerAndGetCookie();
    const res = await request(app)
      .post('/api/modules')
      .set('Cookie', cookie)
      .send({ ...validModule, colour: 'not-a-colour' });

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/modules').send(validModule);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/modules', () => {
  it('returns only the authenticated user\'s modules', async () => {
    const cookieA = await registerAndGetCookie('a@test.com');
    const cookieB = await registerAndGetCookie('b@test.com');

    await request(app).post('/api/modules').set('Cookie', cookieA).send({ name: 'MOD-A' });
    await request(app).post('/api/modules').set('Cookie', cookieA).send({ name: 'MOD-A2' });
    await request(app).post('/api/modules').set('Cookie', cookieB).send({ name: 'MOD-B' });

    const res = await request(app).get('/api/modules').set('Cookie', cookieA);
    expect(res.status).toBe(200);
    expect(res.body.modules).toHaveLength(2);
    expect(res.body.modules.every((m: { name: string }) => m.name.startsWith('MOD-A'))).toBe(true);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/modules');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/modules/:id', () => {
  it('updates module name', async () => {
    const cookie = await registerAndGetCookie();
    const create = await request(app).post('/api/modules').set('Cookie', cookie).send(validModule);
    const id = create.body.module._id as string;

    const res = await request(app)
      .put(`/api/modules/${id}`)
      .set('Cookie', cookie)
      .send({ name: 'CST3000' });

    expect(res.status).toBe(200);
    expect(res.body.module.name).toBe('CST3000');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).put('/api/modules/000000000000000000000001').send({ name: 'X' });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/modules/:id', () => {
  it('removes the module', async () => {
    const cookie = await registerAndGetCookie();
    const create = await request(app).post('/api/modules').set('Cookie', cookie).send(validModule);
    const id = create.body.module._id as string;

    const res = await request(app).delete(`/api/modules/${id}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);

    const list = await request(app).get('/api/modules').set('Cookie', cookie);
    expect(list.body.modules).toHaveLength(0);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/modules/000000000000000000000001');
    expect(res.status).toBe(401);
  });
});

describe('Cross-user isolation', () => {
  it('user A cannot read, update, or delete user B\'s module', async () => {
    const cookieA = await registerAndGetCookie('idor-a@test.com');
    const cookieB = await registerAndGetCookie('idor-b@test.com');

    const create = await request(app).post('/api/modules').set('Cookie', cookieB).send({ name: 'SECRET' });
    const id = create.body.module._id as string;

    const [put, del] = await Promise.all([
      request(app).put(`/api/modules/${id}`).set('Cookie', cookieA).send({ name: 'HACKED' }),
      request(app).delete(`/api/modules/${id}`).set('Cookie', cookieA),
    ]);

    expect(put.status).toBe(404);
    expect(del.status).toBe(404);
  });
});

const validDeadline = {
  title: 'Final Exam',
  date: '2026-06-01T09:00:00.000Z',
  type: 'exam',
  weight: 40,
};

async function createModuleAndGetId(cookie: string) {
  const res = await request(app).post('/api/modules').set('Cookie', cookie).send(validModule);
  return res.body.module._id as string;
}

describe('POST /api/modules/:id/deadline', () => {
  it('adds deadline to module', async () => {
    const cookie = await registerAndGetCookie('dl1@test.com');
    const moduleId = await createModuleAndGetId(cookie);

    const res = await request(app)
      .post(`/api/modules/${moduleId}/deadline`)
      .set('Cookie', cookie)
      .send(validDeadline);

    expect(res.status).toBe(201);
    expect(res.body.module.deadlines).toHaveLength(1);
    expect(res.body.module.deadlines[0].title).toBe('Final Exam');
  });

  it('cannot add deadline to another user\'s module', async () => {
    const cookieA = await registerAndGetCookie('dl-a@test.com');
    const cookieB = await registerAndGetCookie('dl-b@test.com');
    const moduleId = await createModuleAndGetId(cookieA);

    const res = await request(app)
      .post(`/api/modules/${moduleId}/deadline`)
      .set('Cookie', cookieB)
      .send(validDeadline);

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/modules/:id/deadline/:deadlineId', () => {
  it('marks deadline as completed', async () => {
    const cookie = await registerAndGetCookie('dl2@test.com');
    const moduleId = await createModuleAndGetId(cookie);

    const addRes = await request(app)
      .post(`/api/modules/${moduleId}/deadline`)
      .set('Cookie', cookie)
      .send(validDeadline);
    const deadlineId = addRes.body.module.deadlines[0]._id as string;

    const res = await request(app)
      .put(`/api/modules/${moduleId}/deadline/${deadlineId}`)
      .set('Cookie', cookie)
      .send({ completed: true });

    expect(res.status).toBe(200);
    expect(res.body.module.deadlines[0].completed).toBe(true);
  });
});

describe('DELETE /api/modules/:id/deadline/:deadlineId', () => {
  it('removes the deadline', async () => {
    const cookie = await registerAndGetCookie('dl3@test.com');
    const moduleId = await createModuleAndGetId(cookie);

    const addRes = await request(app)
      .post(`/api/modules/${moduleId}/deadline`)
      .set('Cookie', cookie)
      .send(validDeadline);
    const deadlineId = addRes.body.module.deadlines[0]._id as string;

    const res = await request(app)
      .delete(`/api/modules/${moduleId}/deadline/${deadlineId}`)
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.module.deadlines).toHaveLength(0);
  });
});
