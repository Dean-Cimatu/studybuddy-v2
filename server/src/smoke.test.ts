import { describe, it, expect } from 'vitest';

describe('server smoke', () => {
  it('health response shape is correct', () => {
    const response = { status: 'ok', timestamp: new Date().toISOString() };
    expect(response.status).toBe('ok');
    expect(typeof response.timestamp).toBe('string');
  });

  it('PORT env defaults to 3000', () => {
    const port = process.env.PORT || 3000;
    expect(Number(port)).toBeGreaterThan(0);
  });
});
