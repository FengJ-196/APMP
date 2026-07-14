import { NextRequest, NextResponse } from 'next/server';
import { WBSItemService } from '@/lib/services/WBSItemService';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await WBSItemService.deleteWBSItem(id);
    return NextResponse.json({ success: deleted }, { status: 200 });
  } catch (error: any) {
    console.error('Delete WBS Item API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete WBS item' },
      { status: 500 }
    );
  }
}
