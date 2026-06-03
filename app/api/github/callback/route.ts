import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { OAuthService } from '@/lib/github/OAuthService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state parameter' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const storedStateCookie = cookieStore.get('github_oauth_state');

    if (!storedStateCookie) {
      return NextResponse.json({ error: 'OAuth state cookie expired or missing' }, { status: 400 });
    }

    const storedOAuthState = JSON.parse(storedStateCookie.value);

    // Verify state to mitigate CSRF attacks
    if (storedOAuthState.state !== state) {
      return NextResponse.json({ error: 'State validation failed. Untrusted source.' }, { status: 400 });
    }

    // Exchange code for user access token
    const tokenData = await OAuthService.exchangeCodeForToken(code, storedOAuthState.code_verifier);

    // Delete the single-use state cookie
    cookieStore.delete('github_oauth_state');

    // Securely set the access token in HTTP-only cookie
    cookieStore.set('github_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokenData.expires_in || 28800, // standard 8 hours
      path: '/',
    });

    if (tokenData.refresh_token) {
      cookieStore.set('github_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15897600, // standard 6 months
        path: '/',
      });
    }

    // Return successful token confirmation page or JSON.
    // For standalone flow, we can return JSON or redirect to a dashboard page.
    return NextResponse.json({
      success: true,
      message: 'GitHub authentication completed successfully.',
      scope: tokenData.scope,
      token_type: tokenData.token_type,
    });
  } catch (error) {
    console.error('GitHub authorization callback failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
