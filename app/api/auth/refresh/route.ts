/**
 * POST /api/auth/refresh
 * 
 * Accepts a valid refresh token and returns a new pair
 * of access + refresh tokens (token rotation pattern).
 */
import { NextResponse } from 'next/server';
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
} from '@/lib/auth/jwt';
import type { AuthError } from '@/lib/auth/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    // --- Validation ---
    if (!refreshToken || typeof refreshToken !== 'string') {
      return NextResponse.json(
        { error: 'Refresh token is required' } satisfies AuthError,
        { status: 400 }
      );
    }

    // --- Verify the refresh token ---
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' } satisfies AuthError,
        { status: 401 }
      );
    }

    // --- Generate new token pair (rotation) ---
    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      email: payload.email,
    });
    const newRefreshToken = generateRefreshToken({
      userId: payload.userId,
      email: payload.email,
    });

    return NextResponse.json(
      {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' } satisfies AuthError,
      { status: 400 }
    );
  }
}
