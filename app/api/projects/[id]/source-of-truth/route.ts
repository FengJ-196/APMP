import { NextRequest, NextResponse } from 'next/server';
import { SourceOfTruthService } from '@/lib/services/SourceOfTruthService';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeHistoryContent = searchParams.get('includeHistoryContent') === 'true';
    const sourceOfTruth = await SourceOfTruthService.getSourceOfTruthByProjectId(id, includeHistoryContent);

    if (!sourceOfTruth) {
      return NextResponse.json({ error: 'Source of Truth not found' }, { status: 404 });
    }

    return NextResponse.json(sourceOfTruth);
  } catch (error) {
    console.error('Source of Truth GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch Source of Truth' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const content = body.content || '';

    // Check if it already exists to prevent duplicate key errors (since we auto-create an empty SoT on project creation)
    const existing = await SourceOfTruthService.getSourceOfTruthByProjectId(id);
    if (existing) {
      const result = await SourceOfTruthService.updateSourceOfTruth(existing.id, content);
      return NextResponse.json(result.data, { status: 201 });
    }

    const sourceOfTruth = await SourceOfTruthService.createSourceOfTruth({
      projectId: id,
      content,
    });

    return NextResponse.json(sourceOfTruth, { status: 201 });
  } catch (error) {
    console.error('Source of Truth POST error:', error);
    return NextResponse.json({ error: 'Failed to create Source of Truth' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const content = body.content;

    if (content === undefined) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const sourceOfTruth = await SourceOfTruthService.getSourceOfTruthByProjectId(projectId);
    if (!sourceOfTruth) {
      return NextResponse.json({ error: 'Source of Truth not found' }, { status: 404 });
    }

    const result = await SourceOfTruthService.updateSourceOfTruth(sourceOfTruth.id, content);

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Source of Truth PUT error:', error);
    return NextResponse.json({ error: 'Failed to update Source of Truth' }, { status: 500 });
  }
}
