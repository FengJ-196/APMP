/**
 * Password hashing utilities using bcryptjs.
 * 
 * Uses a cost factor of 12 for a good balance between
 * security and performance.
 */
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt.
 * @returns The bcrypt hash string (includes salt).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

/**
 * Compare a plaintext password against a bcrypt hash.
 * @returns `true` if they match.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
