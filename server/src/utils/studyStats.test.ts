import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserModel } from '../models/User';
import { updateStreak, checkStreakMilestones, getTodayUTC, getYesterdayUTC } from './studyStats';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

async function createUser(overrides: Record<string, unknown> = {}) {
  return UserModel.create({
    email: `user_${Date.now()}@test.com`,
    displayName: 'Test',
    passwordHash: 'hash',
    ...overrides,
  });
}

describe('updateStreak', () => {
  it('first activity sets streak to 1', async () => {
    const user = await createUser({ lastActiveDate: null, streak: 0 });
    const result = await updateStreak(user.id as string);
    expect(result.streak).toBe(1);
  });

  it('consecutive day increments streak', async () => {
    const user = await createUser({ lastActiveDate: getYesterdayUTC(), streak: 3 });
    const result = await updateStreak(user.id as string);
    expect(result.streak).toBe(4);
  });

  it('gap of 2 days resets streak to 1', async () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);
    const dateStr = twoDaysAgo.toISOString().slice(0, 10);
    const user = await createUser({ lastActiveDate: dateStr, streak: 10 });
    const result = await updateStreak(user.id as string);
    expect(result.streak).toBe(1);
  });

  it('same day does not change streak', async () => {
    const user = await createUser({ lastActiveDate: getTodayUTC(), streak: 5 });
    const result = await updateStreak(user.id as string);
    expect(result.streak).toBe(5);
  });
});

describe('checkStreakMilestones', () => {
  it('returns [7] when streak hits 7', async () => {
    const user = await createUser({ streak: 7, streakMilestonesAwarded: [] });
    const awarded = await checkStreakMilestones(user.id as string);
    expect(awarded).toEqual([7]);
  });

  it('does not re-award a milestone already earned', async () => {
    const user = await createUser({ streak: 7, streakMilestonesAwarded: [7] });
    const awarded = await checkStreakMilestones(user.id as string);
    expect(awarded).toEqual([]);
  });
});
