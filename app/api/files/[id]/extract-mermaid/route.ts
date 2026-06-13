import sharp from 'sharp';
import { NextRequest, NextResponse } from 'next/server';
import { FileService } from '@/lib/services/FileService';
import { AIService } from '@/lib/ai';

export const dynamic = 'force-dynamic';

function decodeBmpToRgb(bmpBuffer: Buffer): { width: number; height: number; data: Buffer } | null {
  if (bmpBuffer[0] !== 0x42 || bmpBuffer[1] !== 0x4d) {
    return null; // Not a BMP
  }
  
  const pixelOffset = bmpBuffer.readUInt32LE(10);
  const width = bmpBuffer.readInt32LE(18);
  const height = bmpBuffer.readInt32LE(22);
  const bpp = bmpBuffer.readUInt16LE(28);
  const compression = bmpBuffer.readUInt32LE(30);
  
  if (compression !== 0 || bpp !== 24) {
    return null;
  }
  
  const absHeight = Math.abs(height);
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const rgbBuffer = Buffer.alloc(width * absHeight * 3);
  
  let srcPos = pixelOffset;
  for (let y = 0; y < absHeight; y++) {
    const targetY = height > 0 ? (absHeight - 1 - y) : y;
    const targetRowStart = targetY * width * 3;
    
    for (let x = 0; x < width; x++) {
      const srcIdx = srcPos + x * 3;
      const targetIdx = targetRowStart + x * 3;
      
      rgbBuffer[targetIdx] = bmpBuffer[srcIdx + 2];     // Red
      rgbBuffer[targetIdx + 1] = bmpBuffer[srcIdx + 1]; // Green
      rgbBuffer[targetIdx + 2] = bmpBuffer[srcIdx];     // Blue
    }
    srcPos += rowSize;
  }
  
  return { width, height: absHeight, data: rgbBuffer };
}

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

    if (!file.fileData) {
      return NextResponse.json({ error: 'Image data is missing from database' }, { status: 404 });
    }

    if (!file.contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'File is not an image' }, { status: 400 });
    }

    // Extract buffer from fileData (Handle Mongoose lean object formats)
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
    } else {
      dataBuffer = Buffer.from(fileData || '');
    }

    if (!dataBuffer || dataBuffer.length === 0) {
      return NextResponse.json({ error: 'Image data is empty' }, { status: 404 });
    }

    // Optimize image for AI (Reduce tokens and payload size)
    let optimizedBuffer: Buffer;
    if (dataBuffer[0] === 0x42 && dataBuffer[1] === 0x4d) {
      const decoded = decodeBmpToRgb(dataBuffer);
      if (decoded) {
        optimizedBuffer = await sharp(decoded.data, {
          raw: {
            width: decoded.width,
            height: decoded.height,
            channels: 3
          }
        })
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      } else {
        throw new Error('Failed to decode BMP image data');
      }
    } else {
      optimizedBuffer = await sharp(dataBuffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    // Prepare the AI service
    const aiService = AIService.getInstance();

    // Create a readable stream for the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const mermaidStream = aiService.convertDiagramToMermaidStream(
            optimizedBuffer,
            'image/jpeg'
          );

          let fullMermaidCode = '';
          for await (const chunk of mermaidStream) {
            controller.enqueue(new TextEncoder().encode(chunk));
            fullMermaidCode += chunk;
          }

          // Persist the extracted Mermaid code in database content field
          if (fullMermaidCode) {
            const cleanedCode = fullMermaidCode.replace(/```mermaid|```/g, "").trim();
            await FileService.updateFileTextContent(id, cleanedCode);
          }

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Mermaid extraction error:', error);
    return NextResponse.json({ error: 'Failed to extract Mermaid code' }, { status: 500 });
  }
}
