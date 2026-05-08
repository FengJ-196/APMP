/**
 * POST /api/auth/login Integration Tests
 */
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
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
  beforeAll(async () => {
    await dbConnect();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await clearUsers();
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
  });

  it('should reject login with wrong password', async () => {
    const req = createLoginRequest({
      email: 'existing@example.com',
      password: 'WrongPassword!',
    });

    const res = await loginPOST(req);
    expect(res.status).toBe(401);
  });

  it('should reject login for non-existent email', async () => {
    const req = createLoginRequest({
      email: 'ghost@example.com',
      password: 'AnyPass123!',
    });

    const res = await loginPOST(req);
    expect(res.status).toBe(401);
  });
});
