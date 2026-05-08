import { NextRequest, NextResponse } from 'next/server';
import { findProjectById } from '@/lib/models/projects';
import { findFilesByProjectId } from '@/lib/models/files';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]
 * Returns project details along with its associated files (metadata only).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await findProjectById(id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const files = await findFilesByProjectId(id);

    // Map files to remove binary data for the list view
    const fileList = files.map(f => ({
      id: f.id,
      originalName: f.originalName,
      contentType: f.contentType,
      createdAt: f.createdAt,
      // We don't send fileData here to keep the response small
    }));

    return NextResponse.json({
      ...project,
      files: fileList
    });
  } catch (error) {
    console.error('Project details error:', error);
    return NextResponse.json({ error: 'Failed to fetch project details' }, { status: 500 });
  }
}
