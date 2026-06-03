import mongoose from 'mongoose';
import dotenv from 'dotenv';
import sharp from 'sharp';

dotenv.config({ path: '.env.local' });

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

async function testSharp() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const File = mongoose.models.File || mongoose.model('File', new mongoose.Schema({}, { strict: false }));
  
  const fileId = '6a185d5eedc549cd8ddfbba0'; // SRS 1_3.png
  const file = await File.findById(fileId).lean();
  
  if (!file) {
    console.log('File not found with ID:', fileId);
    process.exit(1);
  }
  
  console.log('File found:', file.originalName, file.contentType);
  const fileData: any = file.fileData;
  let dataBuffer: Buffer;

  if (Buffer.isBuffer(fileData)) {
    dataBuffer = fileData;
    console.log('isBuffer');
  } else if (fileData && fileData.$binary && fileData.$binary.base64) {
    dataBuffer = Buffer.from(fileData.$binary.base64, 'base64');
    console.log('$binary');
  } else if (fileData && fileData.buffer) {
    dataBuffer = Buffer.from(fileData.buffer);
    console.log('fileData.buffer');
  } else if (fileData && fileData.data) {
    dataBuffer = Buffer.from(fileData.data);
    console.log('fileData.data');
  } else if (typeof fileData === 'string') {
    const base64Str = fileData.includes(';base64,') ? fileData.split(';base64,')[1] : fileData;
    dataBuffer = Buffer.from(base64Str, 'base64');
    console.log('string');
  } else {
    dataBuffer = Buffer.from(fileData || '');
    console.log('else');
  }

  console.log('Buffer length:', dataBuffer.length);
  console.log('Buffer type:', typeof dataBuffer);
  console.log('First 20 bytes:', dataBuffer.slice(0, 20).toString('hex'));

  try {
    let optimizedBuffer: Buffer;
    if (dataBuffer[0] === 0x42 && dataBuffer[1] === 0x4d) {
      console.log('Detected BMP signature! Decoding...');
      const decoded = decodeBmpToRgb(dataBuffer);
      if (decoded) {
        console.log(`BMP decoded successfully: ${decoded.width}x${decoded.height}`);
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
        console.log('Sharp success with BMP! Optimized buffer length:', optimizedBuffer.length);
      } else {
        throw new Error('Failed to decode BMP');
      }
    } else {
      optimizedBuffer = await sharp(dataBuffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      console.log('Sharp success! Optimized buffer length:', optimizedBuffer.length);
    }
  } catch (err: any) {
    console.error('Sharp error:', err.message);
    console.error(err.stack);
  }
  
  process.exit(0);
}

testSharp();
