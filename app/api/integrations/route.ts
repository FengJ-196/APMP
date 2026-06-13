import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api/authMiddleware';
import { getIntegration, saveIntegration, deleteIntegration } from '@/lib/models/UserIntegration';
import { encrypt } from '@/lib/utils/encryption';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = authenticateUser(request);

    const github = await getIntegration(userId, 'github');
    const jira = await getIntegration(userId, 'jira');

    return NextResponse.json({
      github: {
        connected: !!github,
        authType: github?.authType || null,
      },
      jira: {
        connected: !!jira,
        authType: jira?.authType || null,
        domain: jira?.domain || null,
        email: jira?.email || null,
      },
    });
  } catch (error: any) {
    console.error('Fetch integrations status failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = authenticateUser(request);
    const body = await request.json();
    const { platform, apiToken, email, domain } = body;

    if (!platform || !apiToken) {
      return NextResponse.json(
        { error: 'Platform and apiToken are required' },
        { status: 400 }
      );
    }

    if (platform !== 'github' && platform !== 'jira') {
      return NextResponse.json(
        { error: 'Invalid platform. Must be github or jira' },
        { status: 400 }
      );
    }

    const encryptedAccessToken = encrypt(apiToken);

    await saveIntegration({
      userId,
      platform,
      encryptedAccessToken,
      authType: 'basic',
      email: email || undefined,
      domain: domain || undefined,
    });

    return NextResponse.json({ success: true, message: `Connected to ${platform} successfully.` });
  } catch (error: any) {
    console.error('Save manual integration failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = authenticateUser(request);
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    if (!platform || (platform !== 'github' && platform !== 'jira')) {
      return NextResponse.json(
        { error: 'Valid platform query parameter is required (github or jira)' },
        { status: 400 }
      );
    }

    const deleted = await deleteIntegration(userId, platform);
    return NextResponse.json({ success: deleted });
  } catch (error: any) {
    console.error('Delete integration failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.status || 500 }
    );
  }
}
