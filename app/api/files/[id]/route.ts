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

    // Extract buffer from fileData
    const fileData: any = file.fileData;
    let dataBuffer: Buffer;

    if (Buffer.isBuffer(fileData)) {
      dataBuffer = fileData;
    } else if (fileData && fileData.$binary && fileData.$binary.base64) {
      dataBuffer = Buffer.from(fileData.$binary.base64, 'base64');
    } else if (fileData && fileData.buffer) {
      dataBuffer = Buffer.from(fileData.buffer);
    } else if (fileData && fileData.data) {
      dataBuffer = Buffer.from(fileData.data);
    } else if (typeof fileData === 'string') {
      // Handle potential data URL or base64 strings
      const base64Str = fileData.includes(';base64,')
        ? fileData.split(';base64,')[1]
        : fileData;
      dataBuffer = Buffer.from(base64Str, 'base64');
    } else {
      dataBuffer = Buffer.from(fileData || '');
    }

    const { searchParams } = new URL(request.url);
    const isMetadataRequest = searchParams.get('metadata') === 'true';
    const acceptHeader = request.headers.get('accept') || '';
    
    if (isMetadataRequest || acceptHeader.toLowerCase().includes('application/json')) {
      const { fileData: _, ...metadata } = file;
      
      // For images and markdown, ensure content is populated for the UI to "work with"
      if (file.contentType.startsWith('image/')) {
        metadata.content = `data:${file.contentType};base64,${dataBuffer.toString('base64')}`;
      } else if (
        file.contentType === 'text/markdown' ||
        file.contentType === 'text/plain' ||
        file.originalName.endsWith('.md') ||
        file.originalName.endsWith('.txt')
      ) {
        // If content field is empty, populate it from the raw buffer
        if (!metadata.content) {
          metadata.content = dataBuffer.toString('utf-8');
        }
      }

      return NextResponse.json(metadata);
    }

    return new NextResponse(dataBuffer as unknown as BodyInit, {
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await FileService.deleteFile(id);
    
    if (!success) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('File deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
