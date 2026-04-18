import { describe, it, expect } from 'vitest';

describe('client smoke', () => {
  it('runs in the test environment', () => {
    expect(true).toBe(true);
  });

  it('app name is defined', () => {
    const name = 'StudyBuddy v2';
    expect(name).toMatch(/StudyBuddy/);
  });
});
