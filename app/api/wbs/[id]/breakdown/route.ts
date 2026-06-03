import { NextRequest, NextResponse } from 'next/server';
import { WBSItemService } from '@/lib/services/WBSItemService';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;

    if (!taskId) {
      return NextResponse.json({ error: 'WBS Task ID is required' }, { status: 400 });
    }

    const subtasks = await WBSItemService.breakdownTaskToSubtasks(taskId);

    return NextResponse.json(subtasks);
  } catch (error) {
    console.error('WBS Task Breakdown API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to perform task breakdown';
    
    if (
      errorMessage.includes('Valid WBS Task ID is required') ||
      errorMessage.includes('not found') ||
      errorMessage.includes('directly on an Epic')
    ) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
