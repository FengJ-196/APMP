import { NextRequest, NextResponse } from 'next/server';
import { FileService } from '@/lib/services/FileService';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const content = body.content;

    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required and must be a string' }, { status: 400 });
    }

    // Update both the binary file data and the new content string field
    const updatedFile = await FileService.updateFileTextContent(id, content);
    if (updatedFile) {
        await FileService.updateFileContent(id, Buffer.from(content, 'utf-8'));
    }

    if (!updatedFile) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json(updatedFile);
  } catch (error) {
    console.error('File content update error:', error);
    return NextResponse.json({ error: 'Failed to update file content' }, { status: 500 });
  }
}
