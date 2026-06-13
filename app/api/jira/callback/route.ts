import { NextRequest, NextResponse } from 'next/server';
import { OAuthService } from '@/lib/jira/OAuthService';
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

    const { userId, projectId } = decodedState;

    // 2. Exchange auth code for Atlassian access & refresh tokens
    const tokenData = await OAuthService.exchangeCodeForToken(code);

    // 3. Fetch accessible site resources to auto-resolve the default cloudId target
    const sites = await OAuthService.getAccessibleResources(tokenData.access_token);
    let cloudId: string | undefined = undefined;
    if (sites && sites.length > 0) {
      cloudId = sites[0].id;
    }

    // 4. Encrypt access & refresh tokens
    const encryptedAccessToken = encrypt(tokenData.access_token);
    const encryptedRefreshToken = tokenData.refresh_token ? encrypt(tokenData.refresh_token) : undefined;
    const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined;

    // 5. Persist integration credentials to database
    await saveIntegration({
      userId,
      platform: 'jira',
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      cloudId,
      authType: 'oauth',
    });

    // 6. Redirect browser back to the frontend project page or default settings
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectTarget = projectId
      ? `${baseUrl}/projects/${projectId}?sync=jira-success`
      : `${baseUrl}/settings?sync=jira-success`;

    return NextResponse.redirect(redirectTarget);
  } catch (error: any) {
    console.error('Jira authorization callback failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

