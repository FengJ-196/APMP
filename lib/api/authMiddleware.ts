import { NextRequest } from 'next/server';
import { UserService, TokenPayload } from '../services/UserService';

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

/**
 * Validates the Authorization: Bearer <token> header and extracts the user session payload.
 * Throws AuthError if token is invalid, expired, or missing.
 */
export function authenticateUser(request: NextRequest): TokenPayload {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    throw new AuthError('Authorization header is missing');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    throw new AuthError('Invalid authorization header format');
  }

  const token = parts[1];
  const payload = UserService.verifyAccessToken(token);
  if (!payload) {
    throw new AuthError('Session expired or invalid token');
  }

  return payload;
}
