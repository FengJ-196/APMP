import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { UserService } from '@/lib/services/UserService';
import User from '@/lib/models/User';
import dbConnect from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const stateCookie = request.cookies.get('jira_auth_state')?.value;

    if (!code || !state || state !== stateCookie) {
      return NextResponse.redirect(`${baseUrl}/login?error=invalid_state`);
    }

    const clientId = process.env.JIRA_CLIENT_ID || process.env.NEXT_PUBLIC_JIRA_CLIENT_ID;
    const clientSecret = process.env.JIRA_CLIENT_SECRET;
    const redirectUri = `${baseUrl}/api/auth/jira/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('Jira Client ID or Secret is missing in environment configuration.');
    }

    // 1. Exchange authorization code for Atlassian User token
    const tokenResponse = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Atlassian token exchange failed: ${errText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user profile from Atlassian profile API
    const profileResponse = await fetch('https://api.atlassian.com/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!profileResponse.ok) {
      const errText = await profileResponse.text();
      throw new Error(`Atlassian profile fetch failed: ${errText}`);
    }

    const profileData = await profileResponse.json();
    
    // In Atlassian /me profile, email is standard. If not present, we fallback to accountId representation
    const userEmail = profileData.email || `${profileData.account_id}@atlassian.placeholder`;
    const userName = profileData.name || 'Jira User';

    // 3. Upsert User in local database
    await dbConnect();
    let user = await User.findOne({ email: userEmail });
    if (!user) {
      user = await User.create({
        email: userEmail,
        name: userName,
        // Since it's an OAuth user, password can be set to a random secure value
        password: crypto.randomBytes(32).toString('hex'),
      });
    }

    // 4. Generate local JWT Access and Refresh Tokens
    const tokens = UserService.generateTokens({
      id: user._id.toString(),
      email: user.email,
    });

    // 5. Redirect back to the frontend login page with tokens
    const redirectUrl = `${baseUrl}/login?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}&userId=${user._id.toString()}&email=${user.email}`;
    const response = NextResponse.redirect(redirectUrl);
    
    // Cleanup cookie
    response.cookies.delete('jira_auth_state');
    return response;
  } catch (error: any) {
    console.error('Jira OAuth callback failed:', error);
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error.message || 'auth_failed')}`);
  }
}
