import { NextRequest, NextResponse } from 'next/server';
import { WBSItemService } from '@/lib/services/WBSItemService';

export const dynamic = 'force-dynamic';

// GET: Fetch all WBS items (Epics, Stories, Tasks, Subtasks) for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const items = await WBSItemService.getWBSItemsByProjectId(id);
    return NextResponse.json(items, { status: 200 });
  } catch (error: any) {
    console.error('Fetch WBS Items API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch WBS items' },
      { status: 500 }
    );
  }
}

// POST: Decompose Source of Truth requirements and generate a persistent 4-level WBS structure
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const items = await WBSItemService.generateWBSForProject(id);
    return NextResponse.json(items, { status: 200 });
  } catch (error: any) {
    console.error('Generate WBS Items API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate WBS items' },
      { status: 500 }
    );
  }
}
