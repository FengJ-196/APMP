/**
 * JWT token generation and verification.
 * 
 * Uses separate secrets for access and refresh tokens to prevent
 * cross-usage (a refresh token cannot be used as an access token
 * and vice versa).
 * 
 * Access token: short-lived (15 minutes)
 * Refresh token: long-lived (7 days)
 */
import jwt from 'jsonwebtoken';
import type { TokenPayload } from './types';

// In production, these should come from environment variables.
// Using distinct secrets ensures tokens can't be cross-verified.
const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || 'apmp-access-secret-dev-key-2026';
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || 'apmp-refresh-secret-dev-key-2026';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Generate a short-lived access token.
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Generate a long-lived refresh token.
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

/**
 * Verify and decode an access token.
 * @returns The decoded payload, or `null` if invalid/expired.
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
    return { userId: decoded.userId, email: decoded.email };
  } catch {
    return null;
  }
}

/**
 * Verify and decode a refresh token.
 * @returns The decoded payload, or `null` if invalid/expired.
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;
    return { userId: decoded.userId, email: decoded.email };
  } catch {
    return null;
  }
}
