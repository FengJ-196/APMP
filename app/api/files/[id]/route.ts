import { NextRequest, NextResponse } from 'next/server';
import { FileService } from '@/lib/services/FileService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const file = await FileService.getFileById(id);

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const data = file.fileData as Buffer;

    return new NextResponse(data, {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `inline; filename="${file.originalName}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('File retrieval error:', error);
    return NextResponse.json({ error: 'Failed to retrieve file' }, { status: 500 });
  }
}
