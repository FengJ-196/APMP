import { NextRequest, NextResponse } from 'next/server';
import { findFileById } from '@/lib/models/files';

/**
 * GET /api/files/[id]
 * Retrieves binary file data directly from MongoDB.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const file = await findFileById(id);

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Mongoose Buffers can be converted directly to Uint8Array for response
    const data = file.fileData as Buffer;

    return new NextResponse(data, {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `inline; filename="${file.original_name}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('File retrieval error:', error);
    return NextResponse.json({ error: 'Failed to retrieve file' }, { status: 500 });
  }
}
