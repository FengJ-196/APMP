import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { OAuthService } from '@/lib/jira/OAuthService';

export async function GET() {
  try {
    const state = OAuthService.generateState();

    // Save state in cookies for CSRF verification in callback
    const cookieStore = await cookies();
    cookieStore.set('jira_oauth_state', JSON.stringify({
      state,
      createdAt: Date.now(),
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    const authorizeUrl = OAuthService.getAuthorizeUrl(state);
    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    console.error('Jira authorization initiation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
