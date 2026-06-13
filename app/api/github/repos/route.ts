import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api/authMiddleware';
import { getIntegration } from '@/lib/models/UserIntegration';
import { decrypt } from '@/lib/utils/encryption';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = authenticateUser(request);

    const integration = await getIntegration(userId, 'github');
    if (!integration || !integration.encryptedAccessToken) {
      return NextResponse.json(
        { error: 'GitHub integration not found. Please connect to GitHub first.' },
        { status: 404 }
      );
    }

    const accessToken = decrypt(integration.encryptedAccessToken);

    const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'APMP-App',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `GitHub API error: ${errorText}` },
        { status: response.status }
      );
    }

    const repos = await response.json();
    const formattedRepos = repos.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
    }));

    return NextResponse.json(formattedRepos);
  } catch (error: any) {
    console.error('Fetch GitHub repos failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.status || 500 }
    );
  }
}
