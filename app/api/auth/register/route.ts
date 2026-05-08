/**
 * POST /api/auth/register
 * 
 * Creates a new user account with a hashed password.
 * Returns the user profile and JWT tokens (access + refresh).
 */
import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth/hash';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';
import { createUser, findUserByEmail } from '@/lib/auth/users';
import { validateEmail, validatePassword } from '@/lib/auth/validation';
import type { AuthResponse, AuthError } from '@/lib/auth/types';

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

    // --- Duplicate check ---
    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' } satisfies AuthError,
        { status: 409 }
      );
    }

    // --- Create user ---
    const passwordHash = await hashPassword(password);
    const user = await createUser(email, passwordHash);

    // --- Generate tokens ---
    const tokenPayload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return NextResponse.json(
      {
        user: { id: user.id, email: user.email },
        tokens: { accessToken, refreshToken },
      } satisfies AuthResponse,
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' } satisfies AuthError,
      { status: 400 }
    );
  }
}
