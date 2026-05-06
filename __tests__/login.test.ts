/**
 * TDD Phase 4 — RED: Login API Tests
 * 
 * Integration tests for POST /api/auth/login.
 * These tests are written BEFORE the route handler exists.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { POST as registerPOST } from '@/app/api/auth/register/route';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { clearUsers } from '@/lib/auth/users';

function createRegisterRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createLoginRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    clearUsers();
    // Seed a user for login tests
    await registerPOST(
      createRegisterRequest({
        email: 'existing@example.com',
        password: 'CorrectPass123!',
      })
    );
  });

  it('should login with correct credentials and return tokens', async () => {
    const req = createLoginRequest({
      email: 'existing@example.com',
      password: 'CorrectPass123!',
    });

    const res = await loginPOST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe('existing@example.com');
    expect(data.tokens).toBeDefined();
    expect(data.tokens.accessToken).toBeDefined();
    expect(data.tokens.refreshToken).toBeDefined();
  });

  it('should reject login with wrong password', async () => {
    const req = createLoginRequest({
      email: 'existing@example.com',
      password: 'WrongPassword!',
    });

    const res = await loginPOST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBeDefined();
  });

  it('should reject login for non-existent email', async () => {
    const req = createLoginRequest({
      email: 'ghost@example.com',
      password: 'AnyPass123!',
    });

    const res = await loginPOST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBeDefined();
  });

  it('should reject missing email', async () => {
    const req = createLoginRequest({ password: 'SomePass123!' });
    const res = await loginPOST(req);

    expect(res.status).toBe(400);
  });

  it('should reject missing password', async () => {
    const req = createLoginRequest({ email: 'existing@example.com' });
    const res = await loginPOST(req);

    expect(res.status).toBe(400);
  });

  it('should not leak whether the email exists (same error for wrong email and wrong password)', async () => {
    const wrongEmail = createLoginRequest({
      email: 'nope@example.com',
      password: 'CorrectPass123!',
    });
    const wrongPass = createLoginRequest({
      email: 'existing@example.com',
      password: 'WrongPassword!',
    });

    const res1 = await loginPOST(wrongEmail);
    const res2 = await loginPOST(wrongPass);
    const data1 = await res1.json();
    const data2 = await res2.json();

    // Both should return 401 with the same generic message
    expect(res1.status).toBe(401);
    expect(res2.status).toBe(401);
    expect(data1.error).toBe(data2.error);
  });
});
