import { NextRequest, NextResponse } from 'next/server';
import { ExportService } from '@/lib/jira/ExportService';
import { authenticateUser } from '@/lib/api/authMiddleware';

export async function POST(request: NextRequest) {
  try {
    const { userId } = authenticateUser(request);

    const body = await request.json();
    const { wbsItemId, projectKey, issueType, email, domain, apiToken } = body;

    if (!wbsItemId || !projectKey) {
      return NextResponse.json(
        { error: 'Missing required parameters: wbsItemId, projectKey' },
        { status: 400 }
      );
    }

    // Trigger the Jira issue synchronization service
    const syncDoc = await ExportService.exportWBSItemToJira(
      wbsItemId,
      projectKey,
      issueType,
      userId,
      { email, domain, apiToken }
    );

    return NextResponse.json({
      success: true,
      message: 'Task exported to Jira issue successfully.',
      syncDetails: syncDoc,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Jira export API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export task to Jira' },
      { status: error.status || 500 }
    );
  }
}

