/**
 * TDD Phase 1 — RED: Password Hashing Tests
 * 
 * Tests for bcrypt-based password hashing and verification.
 * These tests are written BEFORE implementation.
 */
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/hash';

describe('Password Hashing', () => {
  describe('hashPassword', () => {
    it('should return a hashed string different from the original password', async () => {
      const password = 'MySecurePassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
    });

    it('should produce a bcrypt-format hash (starts with $2a$ or $2b$)', async () => {
      const hash = await hashPassword('test');
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it('should produce different hashes for the same password (salt randomness)', async () => {
      const password = 'SamePassword';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should hash an empty string without throwing', async () => {
      // bcrypt can hash empty strings — we rely on validation elsewhere
      const hash = await hashPassword('');
      expect(hash).toBeDefined();
    });
  });

  describe('verifyPassword', () => {
    it('should return true for a matching password', async () => {
      const password = 'CorrectPassword!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should return false for a non-matching password', async () => {
      const hash = await hashPassword('RightPassword');
      const isValid = await verifyPassword('WrongPassword', hash);

      expect(isValid).toBe(false);
    });

    it('should return false for an empty password against a real hash', async () => {
      const hash = await hashPassword('RealPassword');
      const isValid = await verifyPassword('', hash);

      expect(isValid).toBe(false);
    });
  });
});
