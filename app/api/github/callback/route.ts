import { NextRequest, NextResponse } from 'next/server';
import { OAuthService } from '@/lib/github/OAuthService';
import { saveIntegration } from '@/lib/models/UserIntegration';
import { encrypt } from '@/lib/utils/encryption';
import jwt from 'jsonwebtoken';

const STATE_SECRET = process.env.ACCESS_TOKEN_SECRET || 'apmp-access-secret-dev-key-2026';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state parameter' }, { status: 400 });
    }

    // 1. Verify and decode signed OAuth state JWT
    let decodedState: any;
    try {
      decodedState = jwt.verify(state, STATE_SECRET);
    } catch (err) {
      return NextResponse.json({ error: 'State validation failed or expired. Untrusted source.' }, { status: 400 });
    }

    const { userId, code_verifier, projectId } = decodedState;

    // 2. Exchange code for user access token
    const tokenData = await OAuthService.exchangeCodeForToken(code, code_verifier);

    // 3. Encrypt access & refresh tokens
    const encryptedAccessToken = encrypt(tokenData.access_token);
    const encryptedRefreshToken = tokenData.refresh_token ? encrypt(tokenData.refresh_token) : undefined;
    const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined;

    // 4. Persist integration credentials to database
    await saveIntegration({
      userId,
      platform: 'github',
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      authType: 'oauth',
    });

    // 5. Redirect browser back to the frontend project page or default settings
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectTarget = projectId
      ? `${baseUrl}/projects/${projectId}?sync=github-success`
      : `${baseUrl}/settings?sync=github-success`;

    return NextResponse.redirect(redirectTarget);
  } catch (error: any) {
    console.error('GitHub authorization callback failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

