import { NextRequest, NextResponse } from 'next/server';
import { FileService } from '@/lib/services/FileService';
import { extractPdfContent } from '@/lib/utils/pdfExtractor';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const file = await FileService.getFileById(id);
    
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (file.contentType !== 'application/pdf') {
      return NextResponse.json({ error: 'File is not a PDF' }, { status: 400 });
    }

    // Convert string buffer representation to actual ArrayBuffer for pdfExtractor
    // Since file.fileData might come as a Buffer or base64 string from DB depending on the driver
    // Robust conversion from MongoDB fileData to Node.js Buffer
    const fileData: any = file.fileData;
    let buffer: Buffer;

    if (Buffer.isBuffer(fileData)) {
      buffer = fileData;
    } else if (fileData && fileData.buffer) {
      buffer = Buffer.from(fileData.buffer);
    } else if (fileData && fileData.data) {
      buffer = Buffer.from(fileData.data);
    } else if (typeof fileData === 'string') {
      const base64Str = fileData.includes(';base64,')
        ? fileData.split(';base64,')[1]
        : fileData;
      buffer = Buffer.from(base64Str, 'base64');
    } else {
      throw new Error('Unsupported file data format in database');
    }

    if (!buffer || buffer.length === 0) {
      throw new Error('PDF file data is empty in the database');
    }
      
    // Convert Buffer to Uint8Array for pdfExtractor
    const uint8Array = new Uint8Array(buffer);
    console.log(`Prepared Uint8Array for extraction. Length: ${uint8Array.length} bytes`);
    
    const extracted = await extractPdfContent(uint8Array as any);

    // Store the text into a new markdown file
    if (extracted.text) {
      // 1. Create a separate markdown file named [PDF_NAME].md
      await FileService.uploadFile({
        projectId: file.projectId,
        userId: file.userId,
        filename: `${file.originalName.replace(/\.pdf$/i, '')}.md`,
        data: Buffer.from(extracted.text, 'utf-8'),
        content: extracted.text,
      });
      // Note: We no longer update the original PDF's content field per user request
    }

    // Store images named [PDF_NAME]_[INDEX].png
    let imgCount = 0;
    for (const img of extracted.images) {
      // img.url is "data:image/png;base64,..."
      const parts = img.url.split(',');
      if (parts.length > 1) {
        const base64Data = parts[1];
        imgCount++; // Increment before naming to start from 1
        
        await FileService.uploadFile({
          projectId: file.projectId,
          userId: file.userId,
          filename: `${file.originalName.replace(/\.pdf$/i, '')}_${imgCount}.png`,
          data: Buffer.from(base64Data, 'base64'),
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Extracted text and ${imgCount} images.` 
    });

  } catch (error: any) {
    console.error('PDF extraction error stack:', error.stack);
    return NextResponse.json({ 
      error: 'Failed to extract PDF', 
      details: error.message 
    }, { status: 500 });
  }
}
