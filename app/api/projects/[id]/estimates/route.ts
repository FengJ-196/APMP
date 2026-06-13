import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { StoryPoint, mapToStoryPointType } from '@/lib/models/Estimation';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// GET: Retrieve all story point estimates for a specific project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: 'Valid Project ID is required' }, { status: 400 });
    }

    await dbConnect();

    const docs = await StoryPoint.find({ projectId }).lean<any>();
    const estimates = docs.map((doc: any) => mapToStoryPointType(doc));

    return NextResponse.json(estimates, { status: 200 });
  } catch (error: any) {
    console.error('Fetch project story point estimates error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch estimates' },
      { status: 500 }
    );
  }
}
