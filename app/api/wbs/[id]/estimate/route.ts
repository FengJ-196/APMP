import { NextRequest, NextResponse } from 'next/server';
import { EstimationService } from '@/lib/services/EstimationService';

export const dynamic = 'force-dynamic';

// GET: Retrieve existing story point estimate for a WBS Item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const estimate = await EstimationService.getStoryPointEstimation(id);
    
    if (!estimate) {
      return NextResponse.json(
        { error: 'No story point estimate found for this WBS Item' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(estimate, { status: 200 });
  } catch (error: any) {
    console.error('Fetch task estimate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch task estimate' },
      { status: 500 }
    );
  }
}

// POST: Trigger new RAG-based story point estimation for a WBS Item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Attempt to parse userId if provided in body
    let userId: string | undefined;
    try {
      const body = await request.json();
      userId = body.userId;
    } catch {
      // Body may be empty, which is fine
    }

    const estimate = await EstimationService.estimateStoryPoints(id, userId);
    return NextResponse.json(estimate, { status: 200 });
  } catch (error: any) {
    console.error('Estimate task story points error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to estimate task story points' },
      { status: 500 }
    );
  }
}

// PUT: Update an existing story point estimate (manually set finalPoints)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { finalPoints, userId } = body;

    if (finalPoints === undefined || typeof finalPoints !== 'number') {
      return NextResponse.json(
        { error: 'finalPoints is required and must be a number' },
        { status: 400 }
      );
    }

    const estimate = await EstimationService.updateStoryPointEstimate(id, finalPoints, userId);
    return NextResponse.json(estimate, { status: 200 });
  } catch (error: any) {
    console.error('Update story point estimate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update story point estimate' },
      { status: 500 }
    );
  }
}
