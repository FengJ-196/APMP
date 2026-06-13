import { NextRequest, NextResponse } from 'next/server';
import { EstimationService } from '@/lib/services/EstimationService';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// POST: Trigger bulk RAG story point estimation for all tasks in a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: 'Valid Project ID is required' }, { status: 400 });
    }

    // Attempt to parse userId if provided in body
    let userId: string | undefined;
    try {
      const body = await request.json();
      userId = body.userId;
    } catch {
      // Body may be empty, which is fine
    }

    const estimates = await EstimationService.estimateAllStoryPoints(projectId, userId);
    return NextResponse.json(estimates, { status: 200 });
  } catch (error: any) {
    console.error('Bulk estimate story points error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to perform bulk story point estimation' },
      { status: 500 }
    );
  }
}
