import { NextRequest, NextResponse } from 'next/server';
import { ExportService } from '@/lib/github/ExportService';
import { authenticateUser } from '@/lib/api/authMiddleware';

export async function POST(request: NextRequest) {
  try {
    const { userId } = authenticateUser(request);

    const body = await request.json();
    const { wbsItemId, owner, repo } = body;

    if (!wbsItemId || !owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: wbsItemId, owner, repo' },
        { status: 400 }
      );
    }

    // Trigger the export logic
    const syncDoc = await ExportService.exportWBSItemToGitHub(
      wbsItemId,
      owner,
      repo,
      userId
    );

    return NextResponse.json({
      success: true,
      message: 'Task exported to GitHub issue successfully.',
      syncDetails: syncDoc,
    }, { status: 200 });
  } catch (error: any) {
    console.error('GitHub export API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export task' },
      { status: error.status || 500 }
    );
  }
}

