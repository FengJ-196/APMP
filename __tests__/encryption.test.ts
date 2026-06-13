import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../lib/utils/encryption';

describe('Encryption Utility (aes-256-gcm)', () => {
  it('should encrypt and decrypt a string successfully', () => {
    const plainText = 'super-secret-oauth-token-12345';
    const encrypted = encrypt(plainText);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(plainText);
    expect(encrypted.split(':')).toHaveLength(3);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plainText);
  });

  it('should return empty string for empty inputs', () => {
    expect(encrypt('')).toBe('');
    expect(decrypt('')).toBe('');
  });

  it('should fail decryption if format is invalid', () => {
    expect(() => decrypt('invalid-format')).toThrow('Failed to decrypt credentials.');
  });

  it('should fail decryption if auth tag or payload is tampered with', () => {
    const plainText = 'sensitive-data';
    const encrypted = encrypt(plainText);
    const parts = encrypted.split(':');
    
    // Tamper with the encrypted payload
    parts[2] = parts[2].substring(0, parts[2].length - 2) + '00';
    const tampered = parts.join(':');

    expect(() => decrypt(tampered)).toThrow('Failed to decrypt credentials.');
  });
});
