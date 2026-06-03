import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ExportService } from '@/lib/jira/ExportService';
import { OAuthService } from '@/lib/jira/OAuthService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wbsItemId, projectKey, issueType, email, domain, apiToken } = body;
    let { cloudId } = body;

    if (!wbsItemId || !projectKey) {
      return NextResponse.json(
        { error: 'Missing required parameters: wbsItemId, projectKey' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    let accessToken = apiToken || cookieStore.get('jira_access_token')?.value;

    const jiraEmail = email || process.env.E2E_JIRA_EMAIL;
    const jiraDomain = domain || process.env.E2E_JIRA_DOMAIN;
    const isBasicAuth = !!(jiraEmail && jiraDomain);

    // If access token is expired/missing, check for refresh token to auto-refresh
    if (!accessToken && !isBasicAuth) {
      const refreshToken = cookieStore.get('jira_refresh_token')?.value;
      if (refreshToken) {
        try {
          const tokenData = await OAuthService.refreshToken(refreshToken);
          accessToken = tokenData.access_token;

          cookieStore.set('jira_access_token', tokenData.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: tokenData.expires_in || 3600,
            path: '/',
          });

          if (tokenData.refresh_token) {
            cookieStore.set('jira_refresh_token', tokenData.refresh_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              maxAge: 15897600,
              path: '/',
            });
          }
        } catch (refreshErr) {
          console.error('Failed to auto-refresh Atlassian token:', refreshErr);
        }
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Atlassian Jira authorization required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    if (!isBasicAuth) {
      // Resolve cloudId: if not explicitly supplied, read from default stored in cookie
      if (!cloudId) {
        cloudId = cookieStore.get('jira_cloud_id')?.value;
      }

      if (!cloudId) {
        return NextResponse.json(
          { error: 'No Atlassian Cloud ID site resolved. Re-authenticate to setup site targets.' },
          { status: 400 }
        );
      }
    }

    // Trigger the Jira issue synchronization service
    const syncDoc = await ExportService.exportWBSItemToJira(
      wbsItemId,
      cloudId || jiraDomain || '',
      projectKey,
      issueType,
      accessToken,
      jiraEmail,
      jiraDomain
    );

    return NextResponse.json({
      success: true,
      message: 'Task exported to Jira issue successfully.',
      syncDetails: syncDoc,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Jira export API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export task to Jira' },
      { status: 500 }
    );
  }
}
