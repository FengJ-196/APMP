import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api/authMiddleware';
import { OAuthService } from '@/lib/github/OAuthService';
import jwt from 'jsonwebtoken';

const STATE_SECRET = process.env.ACCESS_TOKEN_SECRET || 'apmp-access-secret-dev-key-2026';

export async function GET(request: NextRequest) {
  try {
    const { userId } = authenticateUser(request);
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || '';

    const state = OAuthService.generateState();
    const codeVerifier = OAuthService.generateCodeVerifier();
    const codeChallenge = OAuthService.generateCodeChallenge(codeVerifier);

    // Sign the OAuth state payload to securely transfer session context
    const stateToken = jwt.sign(
      { userId, state, code_verifier: codeVerifier, projectId },
      STATE_SECRET,
      { expiresIn: '10m' }
    );

    const authorizeUrl = OAuthService.getAuthorizeUrl(stateToken, codeChallenge);
    return NextResponse.json({ authorizeUrl });
  } catch (error: any) {
    console.error('GitHub authorization initiation failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.status || 500 }
    );
  }
}

