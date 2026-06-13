import { NextRequest, NextResponse } from 'next/server';
import { SourceOfTruthService } from '@/lib/services/SourceOfTruthService';
import { AIService } from '@/lib/ai';
import dbConnect from '@/lib/db';
import ConflictModel from '@/lib/models/Conflict';

export const dynamic = 'force-dynamic';

// GET: Retrieve all unresolved conflicts saved for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();

    const conflicts = await ConflictModel.find({ projectId: id, resolved: false }).lean();

    const reports = conflicts.map(c => ({
      id: c.conflictId,
      type: c.type,
      severity: c.severity,
      description: c.description,
      sourceReferences: c.sourceReferences,
      llmExplanation: c.llmExplanation,
      suggestedFix: c.suggestedFix,
      dbId: c._id.toString(),
    }));

    return NextResponse.json(reports, { status: 200 });
  } catch (error: any) {
    console.error('Fetch conflicts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Run a new scan, stream reasoning chunk-by-chunk, and save results upon stream completion
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Fetch Source of Truth for the project
    const sourceOfTruth = await SourceOfTruthService.getSourceOfTruthByProjectId(id);
    if (!sourceOfTruth || !sourceOfTruth.content) {
      return NextResponse.json(
        { error: 'Source of Truth has not been defined or is empty.' },
        { status: 404 }
      );
    }

    // Diagrams are not automatically appended; the user appends them to the Source of Truth manually if they permit.
    const diagrams: any[] = [];

    // 2. Run logical analysis with streaming response
    const aiService = AIService.getInstance();
    const conflictStream = aiService.analyzeConflictsStream(sourceOfTruth.content, diagrams);

    const encoder = new TextEncoder();
    let fullOutputText = '';

    const customStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of conflictStream) {
            controller.enqueue(encoder.encode(chunk));
            fullOutputText += chunk;
          }

          // Persist the newly found conflicts to the database on stream completion
          if (fullOutputText.trim()) {
            try {
              const cleanJson = fullOutputText.replace(/```json|```/g, "").trim();
              const parsed = JSON.parse(cleanJson);
              if (Array.isArray(parsed)) {
                await dbConnect();
                
                // Clear old unresolved conflicts
                await ConflictModel.deleteMany({ projectId: id, resolved: false });
                
                // Save the new list
                if (parsed.length > 0) {
                  await ConflictModel.insertMany(parsed.map(c => ({
                    projectId: id,
                    conflictId: c.id,
                    type: c.type,
                    severity: c.severity,
                    description: c.description,
                    sourceReferences: c.sourceReferences || { textSnippets: [], imageIds: [] },
                    llmExplanation: c.llmExplanation,
                    suggestedFix: c.suggestedFix,
                    resolved: false
                  })));
                }
              }
            } catch (err) {
              console.error('Failed to parse or persist conflicts stream output:', err);
            }
          }

          controller.close();
        } catch (error) {
          console.error('Error streaming conflicts:', error);
          controller.error(error);
        }
      },
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Conflicts analysis route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error during analysis' },
      { status: 500 }
    );
  }
}

// PATCH: Mark a specific conflict as resolved (solved)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { conflictId } = await request.json();

    if (!conflictId) {
      return NextResponse.json({ error: 'Missing conflictId parameter' }, { status: 400 });
    }

    await dbConnect();
    const result = await ConflictModel.updateOne(
      { projectId: id, conflictId, resolved: false },
      { $set: { resolved: true, resolvedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Unresolved conflict not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Resolve conflict API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
