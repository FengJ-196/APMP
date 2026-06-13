/**
 * TDD Phase 2 — RED: JWT Token Tests
 * 
 * Tests for access token and refresh token generation/verification.
 * These tests are written BEFORE implementation.
 */
import { describe, it, expect } from 'vitest';
import { UserService } from '@/lib/services/UserService';
import type { TokenPayload } from '@/lib/services/UserService';

const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = UserService;

const mockPayload: TokenPayload = {
  userId: 'user-123-abc',
  email: 'test@example.com',
};

describe('JWT Tokens', () => {
  describe('Access Token', () => {
    it('should generate a valid JWT string', () => {
      const token = generateAccessToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      // JWTs have 3 dot-separated parts
      expect(token.split('.')).toHaveLength(3);
    });

    it('should be verifiable and return the original payload fields', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = verifyAccessToken(token);

      expect(decoded).toBeDefined();
      expect(decoded!.userId).toBe(mockPayload.userId);
      expect(decoded!.email).toBe(mockPayload.email);
    });

    it('should return null for an invalid token', () => {
      const decoded = verifyAccessToken('invalid.token.string');
      expect(decoded).toBeNull();
    });

    it('should return null for a token signed with a different secret', () => {
      // A well-formed JWT but signed with a random key
      const fakeToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJoYWNrZXIiLCJlbWFpbCI6ImhhY2tlckBleGFtcGxlLmNvbSJ9.invalidsignature';
      const decoded = verifyAccessToken(fakeToken);
      expect(decoded).toBeNull();
    });
  });

  describe('Refresh Token', () => {
    it('should generate a valid JWT string', () => {
      const token = generateRefreshToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should be verifiable and return the original payload fields', () => {
      const token = generateRefreshToken(mockPayload);
      const decoded = verifyRefreshToken(token);

      expect(decoded).toBeDefined();
      expect(decoded!.userId).toBe(mockPayload.userId);
      expect(decoded!.email).toBe(mockPayload.email);
    });

    it('should return null for an invalid token', () => {
      const decoded = verifyRefreshToken('garbage.token.value');
      expect(decoded).toBeNull();
    });

    it('should NOT be verifiable as an access token (different secret)', () => {
      const refreshToken = generateRefreshToken(mockPayload);
      const decoded = verifyAccessToken(refreshToken);
      expect(decoded).toBeNull();
    });

    it('access token should NOT be verifiable as a refresh token', () => {
      const accessToken = generateAccessToken(mockPayload);
      const decoded = verifyRefreshToken(accessToken);
      expect(decoded).toBeNull();
    });
  });
});
