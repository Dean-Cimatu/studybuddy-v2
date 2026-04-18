import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './auth';

let mongoServer: MongoMemoryServer;
const app = express();

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-32-chars-long-xxxxxxxx';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

describe('POST /api/auth/register', () => {
  it('creates a user, returns 201 with user, sets httpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'password123', displayName: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.id).toBeDefined();
    const cookie = (res.headers['set-cookie'] as unknown) as string[] | undefined;
    expect(cookie?.some(c => c.includes('auth_token'))).toBe(true);
    expect(cookie?.some(c => c.includes('HttpOnly'))).toBe(true);
  });

  it('rejects password shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'short', displayName: 'Alice' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/i);
  });

  it('rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'password123', displayName: 'Alice' });

    expect(res.status).toBe(400);
  });

  it('returns 409 on duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'password123', displayName: 'Alice' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'password123', displayName: 'Other' });

    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'bob@example.com', password: 'password123', displayName: 'Bob' });
  });

  it('returns user and sets cookie on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('bob@example.com');
    expect(res.body.user.passwordHash).toBeUndefined();
    const cookie = (res.headers['set-cookie'] as unknown) as string[] | undefined;
    expect(cookie?.some(c => c.includes('auth_token'))).toBe(true);
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('returns 401 on unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: 'password123' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 204 and clears cookie', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(204);
    const cookie = (res.headers['set-cookie'] as unknown) as string[] | undefined;
    expect(cookie?.some(c => c.includes('auth_token=;'))).toBe(true);
  });
});

describe('GET /api/auth/me', () => {
  it('returns user when authenticated with valid cookie', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'carol@example.com', password: 'password123', displayName: 'Carol' });

    const cookies = ((registerRes.headers['set-cookie'] as unknown) as string[])[0];

    const res = await request(app).get('/api/auth/me').set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('carol@example.com');
  });

  it('returns 401 when no cookie present', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 when cookie has tampered token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', 'auth_token=tampered.token.value');

    expect(res.status).toBe(401);
  });
});
