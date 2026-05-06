/**
 * TDD Phase 3 — RED: Register API Tests
 * 
 * Integration tests for POST /api/auth/register.
 * These tests are written BEFORE the route handler exists.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/register/route';
import { clearUsers, findUserByEmail } from '@/lib/auth/users';

function createRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    clearUsers();
  });

  it('should register a new user and return tokens', async () => {
    const req = createRequest({
      email: 'newuser@example.com',
      password: 'StrongPass123!',
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe('newuser@example.com');
    expect(data.user.id).toBeDefined();
    expect(data.tokens).toBeDefined();
    expect(data.tokens.accessToken).toBeDefined();
    expect(data.tokens.refreshToken).toBeDefined();
  });

  it('should store the user with a hashed password (not plaintext)', async () => {
    const req = createRequest({
      email: 'hash-test@example.com',
      password: 'MyPlainText',
    });

    await POST(req);

    const user = findUserByEmail('hash-test@example.com');
    expect(user).toBeDefined();
    expect(user!.passwordHash).not.toBe('MyPlainText');
    expect(user!.passwordHash).toMatch(/^\$2[ab]\$/);
  });

  it('should reject duplicate email registration', async () => {
    const req1 = createRequest({
      email: 'dupe@example.com',
      password: 'Pass1234!',
    });
    await POST(req1);

    const req2 = createRequest({
      email: 'dupe@example.com',
      password: 'DifferentPass!',
    });
    const res = await POST(req2);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBeDefined();
  });

  it('should reject missing email', async () => {
    const req = createRequest({ password: 'NoEmail123!' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('should reject missing password', async () => {
    const req = createRequest({ email: 'no-pass@example.com' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('should reject invalid email format', async () => {
    const req = createRequest({
      email: 'not-an-email',
      password: 'ValidPass123!',
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('should reject passwords shorter than 8 characters', async () => {
    const req = createRequest({
      email: 'short@example.com',
      password: 'Ab1!',
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
