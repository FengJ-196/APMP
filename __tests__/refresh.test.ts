/**
 * TDD Phase 5 — RED: Refresh Token API Tests
 * 
 * Integration tests for POST /api/auth/refresh.
 * These tests are written BEFORE the route handler exists.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { POST as registerPOST } from '@/app/api/auth/register/route';
import { POST as refreshPOST } from '@/app/api/auth/refresh/route';
import { clearUsers } from '@/lib/models/User';
import { UserService } from '@/lib/services/UserService';
const { verifyAccessToken } = UserService;

function createRegisterRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createRefreshRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/refresh', () => {
  let validRefreshToken: string;

  beforeEach(async () => {
    await clearUsers();
    // Seed a user and capture their refresh token
    const res = await registerPOST(
      createRegisterRequest({
        email: 'refresh-user@example.com',
        password: 'RefreshPass123!',
      })
    );
    const data = await res.json();
    validRefreshToken = data.tokens.refreshToken;
  });

  it('should return a new access token when given a valid refresh token', async () => {
    const req = createRefreshRequest({ refreshToken: validRefreshToken });
    const res = await refreshPOST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.accessToken).toBeDefined();
    expect(typeof data.accessToken).toBe('string');

    // The new access token should be valid
    const decoded = verifyAccessToken(data.accessToken);
    expect(decoded).toBeDefined();
    expect(decoded!.email).toBe('refresh-user@example.com');
  });

  it('should also return a new refresh token (token rotation)', async () => {
    const req = createRefreshRequest({ refreshToken: validRefreshToken });
    const res = await refreshPOST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.refreshToken).toBeDefined();
    expect(typeof data.refreshToken).toBe('string');
  });

  it('should reject an invalid refresh token', async () => {
    const req = createRefreshRequest({ refreshToken: 'invalid.token.here' });
    const res = await refreshPOST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBeDefined();
  });

  it('should reject a missing refresh token', async () => {
    const req = createRefreshRequest({});
    const res = await refreshPOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should reject an access token used as a refresh token', async () => {
    // Get an access token
    const regRes = await registerPOST(
      createRegisterRequest({
        email: 'another@example.com',
        password: 'AnotherPass123!',
      })
    );
    const regData = await regRes.json();
    const accessToken = regData.tokens.accessToken;

    const req = createRefreshRequest({ refreshToken: accessToken });
    const res = await refreshPOST(req);

    expect(res.status).toBe(401);
  });
});
