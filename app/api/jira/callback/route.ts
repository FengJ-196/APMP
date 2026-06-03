import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { OAuthService } from '@/lib/jira/OAuthService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state parameter' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const storedStateCookie = cookieStore.get('jira_oauth_state');

    if (!storedStateCookie) {
      return NextResponse.json({ error: 'OAuth state cookie expired or missing' }, { status: 400 });
    }

    const storedOAuthState = JSON.parse(storedStateCookie.value);

    // Verify state value to mitigate CSRF attacks
    if (storedOAuthState.state !== state) {
      return NextResponse.json({ error: 'State validation failed. Untrusted source.' }, { status: 400 });
    }

    // Exchange auth code for Atlassian access & refresh tokens
    const tokenData = await OAuthService.exchangeCodeForToken(code);

    // Fetch accessible site resources to auto-resolve the default cloudId target
    const sites = await OAuthService.getAccessibleResources(tokenData.access_token);
    
    // Delete single-use state cookie
    cookieStore.delete('jira_oauth_state');

    // Securely set tokens in cookies
    cookieStore.set('jira_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokenData.expires_in || 3600, // typically 1 hour
      path: '/',
    });

    if (tokenData.refresh_token) {
      cookieStore.set('jira_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15897600, // standard 6 months
        path: '/',
      });
    }

    // Capture the first accessible cloudId site as the default target
    if (sites && sites.length > 0) {
      cookieStore.set('jira_cloud_id', sites[0].id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15897600, // standard 6 months
        path: '/',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Atlassian Jira authentication completed successfully.',
      sitesCount: sites.length,
      defaultSite: sites[0]?.name || 'None',
      scope: tokenData.scope,
    });
  } catch (error) {
    console.error('Jira authorization callback failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
