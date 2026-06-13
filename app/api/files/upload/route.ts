import { NextRequest, NextResponse } from 'next/server';
import { FileService } from '@/lib/services/FileService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const userId = formData.get('userId') as string;

    if (!file || !projectId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields (file, projectId, userId)' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const savedFile = await FileService.uploadFile({
      projectId,
      userId,
      filename: file.name,
      data: buffer,
    });

    return NextResponse.json(savedFile);
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
