import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ExportService } from '@/lib/github/ExportService';
import { OAuthService } from '@/lib/github/OAuthService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wbsItemId, owner, repo } = body;

    if (!wbsItemId || !owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: wbsItemId, owner, repo' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    let accessToken = cookieStore.get('github_access_token')?.value;

    // If access token is expired/missing, check for refresh token to auto-refresh
    if (!accessToken) {
      const refreshToken = cookieStore.get('github_refresh_token')?.value;
      if (refreshToken) {
        try {
          const tokenData = await OAuthService.refreshToken(refreshToken);
          accessToken = tokenData.access_token;

          cookieStore.set('github_access_token', tokenData.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: tokenData.expires_in || 28800,
            path: '/',
          });

          if (tokenData.refresh_token) {
            cookieStore.set('github_refresh_token', tokenData.refresh_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              maxAge: 15897600,
              path: '/',
            });
          }
        } catch (refreshErr) {
          console.error('Failed to auto-refresh GitHub token:', refreshErr);
        }
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'GitHub authorization required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Trigger the export logic
    const syncDoc = await ExportService.exportWBSItemToGitHub(
      wbsItemId,
      owner,
      repo,
      accessToken
    );

    return NextResponse.json({
      success: true,
      message: 'Task exported to GitHub issue successfully.',
      syncDetails: syncDoc,
    }, { status: 200 });
  } catch (error: any) {
    console.error('GitHub export API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export task' },
      { status: 500 }
    );
  }
}
