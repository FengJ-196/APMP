import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '@/lib/services/ProjectService';
import { FileService } from '@/lib/services/FileService';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await ProjectService.getProjectById(id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Single efficient query: excludes heavy binary fileData, keeps text content
    const files = await FileService.getFilesMetaWithContent(id);

    const fileList = files.map(f => ({
      id: f.id,
      originalName: f.originalName,
      contentType: f.contentType,
      content: f.content || '',
      createdAt: f.createdAt,
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
