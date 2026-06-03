import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { OAuthService } from '@/lib/github/OAuthService';

export async function GET() {
  try {
    const state = OAuthService.generateState();
    const codeVerifier = OAuthService.generateCodeVerifier();
    const codeChallenge = OAuthService.generateCodeChallenge(codeVerifier);

    // Save state and verifier in cookies for verification in callback
    const cookieStore = await cookies();
    cookieStore.set('github_oauth_state', JSON.stringify({
      state,
      code_verifier: codeVerifier,
      createdAt: Date.now(),
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    const authorizeUrl = OAuthService.getAuthorizeUrl(state, codeChallenge);
    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    console.error('GitHub authorization initiation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
