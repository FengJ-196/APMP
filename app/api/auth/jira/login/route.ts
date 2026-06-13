import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.JIRA_CLIENT_ID || process.env.NEXT_PUBLIC_JIRA_CLIENT_ID;
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'JIRA_CLIENT_ID environment variable is missing.' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/auth/jira/callback`;
    const state = crypto.randomBytes(16).toString('hex');
    
    const scopes = ['read:me'];
    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: clientId,
      scope: scopes.join(' '),
      redirect_uri: redirectUri,
      state: state,
      response_type: 'code',
      prompt: 'consent',
    });

    const authorizeUrl = `https://auth.atlassian.com/authorize?${params.toString()}`;
    const response = NextResponse.redirect(authorizeUrl);
    
    // Save state in cookie for CSRF protection
    response.cookies.set('jira_auth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Jira OAuth login initiation failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
