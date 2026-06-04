import { NextRequest, NextResponse } from 'next/server';
import { WBSItemService } from '@/lib/services/WBSItemService';
import { SourceOfTruthService } from '@/lib/services/SourceOfTruthService';
import { WBSConfigService } from '@/lib/services/WBSConfigService';
import { AIService } from '@/lib/ai';

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

// POST: Decompose Source of Truth requirements and generate WBS with real-time streaming
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

    // 2. Fetch project's WBSConfig
    const config = (await WBSConfigService.getWBSConfigByProjectId(id)) || {
      techStack: { languages: [], frameworks: [], databases: [], cloud: [] },
      teamComposition: '',
      compliance: [],
      integrations: [],
      timeline: {},
    };

    // 3. Initiate AI WBS generation stream
    const wbsStream = AIService.getInstance().generateWBSStream(sourceOfTruth.content, config);

    const encoder = new TextEncoder();
    let fullOutputText = '';

    const customStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of wbsStream) {
            controller.enqueue(encoder.encode(chunk));
            fullOutputText += chunk;
          }

          // Once the stream ends, parse the accumulated text and save WBS items
          if (fullOutputText.trim()) {
            try {
              await WBSItemService.parseAndSaveWBS(id, sourceOfTruth.id, fullOutputText);
            } catch (saveErr) {
              console.error('Failed to parse or persist WBS items from stream output:', saveErr);
            }
          }

          controller.close();
        } catch (error) {
          console.error('Error in WBS generation stream:', error);
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
    console.error('Generate WBS Items API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate WBS items' },
      { status: 500 }
    );
  }
}
