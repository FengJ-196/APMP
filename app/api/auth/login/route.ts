/**
 * POST /api/auth/login
 * 
 * Authenticates a user with email + password.
 * Returns JWT tokens on success.
 * 
 * Security: uses a generic error message for both "user not found" 
 * and "wrong password" to prevent email enumeration.
 */
import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth/hash';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';
import { findUserByEmail } from '@/lib/auth/users';
import { validateEmail, validatePassword } from '@/lib/auth/validation';
import type { AuthResponse, AuthError } from '@/lib/auth/types';

const GENERIC_AUTH_ERROR = 'Invalid email or password';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // --- Validation ---
    const emailError = validateEmail(email);
    if (emailError) {
      return NextResponse.json(
        { error: emailError } satisfies AuthError,
        { status: 400 }
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json(
        { error: passwordError } satisfies AuthError,
        { status: 400 }
      );
    }

    // --- Lookup user ---
    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: GENERIC_AUTH_ERROR } satisfies AuthError,
        { status: 401 }
      );
    }

    // --- Verify password ---
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: GENERIC_AUTH_ERROR } satisfies AuthError,
        { status: 401 }
      );
    }

    // --- Generate tokens ---
    const tokenPayload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return NextResponse.json(
      {
        user: { id: user.id, email: user.email },
        tokens: { accessToken, refreshToken },
      } satisfies AuthResponse,
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' } satisfies AuthError,
      { status: 400 }
    );
  }
}
