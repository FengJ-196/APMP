/**
 * POST /api/auth/register Integration Tests
 */
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
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
  beforeAll(async () => {
    await dbConnect();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await clearUsers();
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
  });

  it('should store the user with a hashed password', async () => {
    const req = createRequest({
      email: 'hash-test@example.com',
      password: 'MyPlainText',
    });

    await POST(req);

    const user = await findUserByEmail('hash-test@example.com');
    expect(user).toBeDefined();
    expect(user!.passwordHash).not.toBe('MyPlainText');
    expect(user!.passwordHash).toMatch(/^\$2[ab]\$/);
  });

  it('should reject duplicate email registration', async () => {
    const email = 'dupe@example.com';
    await POST(createRequest({ email, password: 'Pass1234!' }));

    const res = await POST(createRequest({ email, password: 'DifferentPass!' }));
    expect(res.status).toBe(409);
  });
});
