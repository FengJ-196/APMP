import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/api/authMiddleware';
import { getIntegration } from '@/lib/models/UserIntegration';
import { decrypt } from '@/lib/utils/encryption';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = authenticateUser(request);

    const integration = await getIntegration(userId, 'jira');
    if (!integration || !integration.encryptedAccessToken) {
      return NextResponse.json(
        { error: 'Jira integration not found. Please connect to Jira first.' },
        { status: 404 }
      );
    }

    const accessTokenOrApiToken = decrypt(integration.encryptedAccessToken);
    let requestUrl = '';
    let authHeader = '';

    if (integration.authType === 'basic') {
      const { email, domain } = integration;
      if (!email || !domain) {
        return NextResponse.json(
          { error: 'Missing email or domain for Jira Basic Auth' },
          { status: 400 }
        );
      }
      const sanitizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      requestUrl = `https://${sanitizedDomain}/rest/api/3/project`;
      const credentials = Buffer.from(`${email}:${accessTokenOrApiToken}`).toString('base64');
      authHeader = `Basic ${credentials}`;
    } else {
      const { cloudId } = integration;
      if (!cloudId) {
        return NextResponse.json(
          { error: 'Missing Cloud ID for Jira OAuth' },
          { status: 400 }
        );
      }
      requestUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project`;
      authHeader = `Bearer ${accessTokenOrApiToken}`;
    }

    const response = await fetch(requestUrl, {
      headers: {
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Jira API error: ${errorText}` },
        { status: response.status }
      );
    }

    const projects = await response.json();
    const formattedProjects = Array.isArray(projects)
      ? projects.map((proj: any) => ({
          id: proj.id,
          key: proj.key,
          name: proj.name,
        }))
      : [];

    return NextResponse.json(formattedProjects);
  } catch (error: any) {
    console.error('Fetch Jira projects failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.status || 500 }
    );
  }
}
