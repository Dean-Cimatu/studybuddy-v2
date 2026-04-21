import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './auth';
import statsRouter from './stats';
import groupsRouter from './groups';
import { FeedItemModel } from '../models/FeedItem';

vi.mock('../services/googleCalendar', () => ({
  getEvents: vi.fn().mockResolvedValue([]),
  createEvent: vi.fn().mockResolvedValue('evt-id'),
  updateEvent: vi.fn().mockResolvedValue(undefined),
  deleteEvent: vi.fn().mockResolvedValue(undefined),
}));

import { vi } from 'vitest';

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
  app.use('/api/groups', groupsRouter);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

async function registerAndGetCookie(email: string, displayName = 'Test User'): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', displayName });
  return ((res.headers['set-cookie'] as unknown) as string[])[0];
}

// ── Auth guard ────────────────────────────────────────────────────────────────

describe('unauthenticated requests', () => {
  it('GET /api/groups returns 401', async () => {
    expect((await request(app).get('/api/groups')).status).toBe(401);
  });
  it('POST /api/groups returns 401', async () => {
    expect((await request(app).post('/api/groups').send({ name: 'test' })).status).toBe(401);
  });
  it('POST /api/groups/join returns 401', async () => {
    expect((await request(app).post('/api/groups/join').send({ inviteCode: 'abc' })).status).toBe(401);
  });
  it('DELETE /api/groups/:id returns 401', async () => {
    expect((await request(app).delete('/api/groups/507f1f77bcf86cd799439011')).status).toBe(401);
  });
});

// ── Create group ──────────────────────────────────────────────────────────────

describe('POST /api/groups', () => {
  it('creates group with inviteCode and adds creator as member', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const res = await request(app).post('/api/groups').set('Cookie', cookie).send({ name: 'Study Crew' });
    expect(res.status).toBe(201);
    expect(res.body.group.name).toBe('Study Crew');
    expect(res.body.group.inviteCode).toHaveLength(8);
    expect(res.body.group.members).toHaveLength(1);
  });

  it('returns 400 for missing name', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const res = await request(app).post('/api/groups').set('Cookie', cookie).send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when user is already in 5 groups', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/groups').set('Cookie', cookie).send({ name: `Group ${i}` });
    }
    const res = await request(app).post('/api/groups').set('Cookie', cookie).send({ name: 'Too many' });
    expect(res.status).toBe(400);
  });
});

// ── Join group ────────────────────────────────────────────────────────────────

describe('POST /api/groups/join', () => {
  it('adds user to group', async () => {
    const aliceCookie = await registerAndGetCookie('alice@test.com', 'Alice');
    const bobCookie = await registerAndGetCookie('bob@test.com', 'Bob');

    const createRes = await request(app)
      .post('/api/groups')
      .set('Cookie', aliceCookie)
      .send({ name: 'Study Crew' });
    const { inviteCode } = createRes.body.group;

    const joinRes = await request(app)
      .post('/api/groups/join')
      .set('Cookie', bobCookie)
      .send({ inviteCode });
    expect(joinRes.status).toBe(200);
    expect(joinRes.body.group.members).toHaveLength(2);
  });

  it('rejects invalid invite code', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const res = await request(app)
      .post('/api/groups/join')
      .set('Cookie', cookie)
      .send({ inviteCode: 'notvalid' });
    expect(res.status).toBe(404);
  });

  it('rejects when already a member', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const createRes = await request(app)
      .post('/api/groups')
      .set('Cookie', cookie)
      .send({ name: 'Study Crew' });
    const { inviteCode } = createRes.body.group;
    const res = await request(app)
      .post('/api/groups/join')
      .set('Cookie', cookie)
      .send({ inviteCode });
    expect(res.status).toBe(400);
  });
});

// ── Get groups ────────────────────────────────────────────────────────────────

describe('GET /api/groups', () => {
  it('only returns groups the user is a member of', async () => {
    const aliceCookie = await registerAndGetCookie('alice@test.com', 'Alice');
    const bobCookie = await registerAndGetCookie('bob@test.com', 'Bob');

    await request(app).post('/api/groups').set('Cookie', aliceCookie).send({ name: "Alice's Group" });
    await request(app).post('/api/groups').set('Cookie', bobCookie).send({ name: "Bob's Group" });

    const resAlice = await request(app).get('/api/groups').set('Cookie', aliceCookie);
    expect(resAlice.status).toBe(200);
    expect(resAlice.body.groups).toHaveLength(1);
    expect(resAlice.body.groups[0].name).toBe("Alice's Group");
  });
});

// ── Delete group ──────────────────────────────────────────────────────────────

describe('DELETE /api/groups/:id', () => {
  it('creator can delete group', async () => {
    const cookie = await registerAndGetCookie('alice@test.com');
    const createRes = await request(app)
      .post('/api/groups')
      .set('Cookie', cookie)
      .send({ name: 'Study Crew' });
    const groupId = createRes.body.group._id;
    const res = await request(app).delete(`/api/groups/${groupId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
  });

  it('non-creator cannot delete group', async () => {
    const aliceCookie = await registerAndGetCookie('alice@test.com', 'Alice');
    const bobCookie = await registerAndGetCookie('bob@test.com', 'Bob');

    const createRes = await request(app)
      .post('/api/groups')
      .set('Cookie', aliceCookie)
      .send({ name: 'Study Crew' });
    const { _id: groupId, inviteCode } = createRes.body.group;

    await request(app).post('/api/groups/join').set('Cookie', bobCookie).send({ inviteCode });

    const res = await request(app).delete(`/api/groups/${groupId}`).set('Cookie', bobCookie);
    expect(res.status).toBe(403);
  });
});

// ── Group feed ────────────────────────────────────────────────────────────────

describe('GET /api/groups/:id/feed', () => {
  it('returns feed items from group members only', async () => {
    const aliceCookie = await registerAndGetCookie('alice@test.com', 'Alice');
    const bobCookie = await registerAndGetCookie('bob@test.com', 'Bob');

    const createRes = await request(app)
      .post('/api/groups')
      .set('Cookie', aliceCookie)
      .send({ name: 'Study Crew' });
    const { _id: groupId, inviteCode } = createRes.body.group;
    await request(app).post('/api/groups/join').set('Cookie', bobCookie).send({ inviteCode });

    // Alice logs a session (creates a feed item)
    await request(app)
      .post('/api/stats/session')
      .set('Cookie', aliceCookie)
      .send({
        startTime: new Date(Date.now() - 30 * 60000).toISOString(),
        endTime: new Date().toISOString(),
        durationMinutes: 30,
        type: 'pomodoro',
        moduleTag: 'maths',
      });

    const feedRes = await request(app).get(`/api/groups/${groupId}/feed`).set('Cookie', aliceCookie);
    expect(feedRes.status).toBe(200);
    expect(feedRes.body.items.length).toBeGreaterThanOrEqual(1);
    expect(feedRes.body.items.some((i: { type: string }) => i.type === 'session-complete')).toBe(true);
  });

  it('non-member cannot access feed', async () => {
    const aliceCookie = await registerAndGetCookie('alice@test.com', 'Alice');
    const bobCookie = await registerAndGetCookie('bob@test.com', 'Bob');

    const createRes = await request(app)
      .post('/api/groups')
      .set('Cookie', aliceCookie)
      .send({ name: 'Private Group' });
    const groupId = createRes.body.group._id;

    const res = await request(app).get(`/api/groups/${groupId}/feed`).set('Cookie', bobCookie);
    expect(res.status).toBe(403);
  });
});

// ── React to feed item ────────────────────────────────────────────────────────

describe('POST /api/groups/:id/feed/:itemId/react', () => {
  it('toggles reaction on feed item', async () => {
    const aliceCookie = await registerAndGetCookie('alice@test.com', 'Alice');
    const createRes = await request(app)
      .post('/api/groups')
      .set('Cookie', aliceCookie)
      .send({ name: 'Study Crew' });
    const groupId = createRes.body.group._id;

    const aliceIdRes = await request(app).get('/api/auth/me').set('Cookie', aliceCookie);
    const aliceId = aliceIdRes.body.user.id;

    const feedItem = await FeedItemModel.create({
      userId: aliceId,
      userName: 'Alice',
      type: 'session-complete',
      data: { durationMinutes: 25 },
      reactions: [],
    });

    const reactRes = await request(app)
      .post(`/api/groups/${groupId}/feed/${feedItem._id}/react`)
      .set('Cookie', aliceCookie);
    expect(reactRes.status).toBe(200);
    expect(reactRes.body.reactionCount).toBe(1);

    // Toggle off
    const reactRes2 = await request(app)
      .post(`/api/groups/${groupId}/feed/${feedItem._id}/react`)
      .set('Cookie', aliceCookie);
    expect(reactRes2.body.reactionCount).toBe(0);
  });
});
