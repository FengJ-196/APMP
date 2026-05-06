/**
 * Core authentication types for the APMP platform.
 */

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AuthResponse {
  user: { id: string; email: string };
  tokens: AuthTokens;
}

export interface AuthError {
  error: string;
}
