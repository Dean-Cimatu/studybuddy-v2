import { describe, it, expect } from 'vitest';
import type { User, Task, AIMessage } from './index';

describe('shared types smoke', () => {
  it('User shape is assignable', () => {
    const user: Partial<User> = { email: 'test@example.com', name: 'test' };
    expect(user.email).toBe('test@example.com');
  });

  it('Task priority values are valid', () => {
    const task: Partial<Task> = { priority: 'high' };
    expect(['high', 'medium', 'low']).toContain(task.priority);
  });

  it('AIMessage roles are valid', () => {
    const msg: AIMessage = { role: 'user', content: 'hello' };
    expect(msg.role).toBe('user');
  });
});
