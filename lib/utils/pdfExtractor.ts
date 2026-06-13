import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

// The legacy build is specifically designed for environments without full browser APIs

// Note: In a browser environment, you would set the workerSrc.
// For Vitest/Node testing, we might need a different approach or mock it.
// pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export interface ExtractedPdfContent {
  text: string;
  images: Array<{ url: string; caption: string }>;
}

/**
 * Matrix multiplication helper for PDF transformations.
 */
const multiply = (m1: number[], m2: number[]) => [
  m1[0] * m2[0] + m1[2] * m2[1],
  m1[1] * m2[0] + m1[3] * m2[1],
  m1[0] * m2[2] + m1[2] * m2[3],
  m1[1] * m2[2] + m1[3] * m2[3],
  m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
  m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
];

/**
 * Resolves PDF objects (images) from the page.
 */
const resolvePdfObject = (page: any, id: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      // Check commonObjs first (usually synchronous)
      if (page.commonObjs.has(id)) {
        return resolve(page.commonObjs.get(id));
      }

      // Use the callback-based get for page.objs to handle async resolution from worker
      page.objs.get(id, (obj: any) => {
        if (obj) {
          resolve(obj);
        } else {
          reject(new Error(`Object ${id} resolved to null`));
        }
      });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Extracts images from a PDF page by traversing the operator list.
 */
const extractImagesFromPage = async (page: any): Promise<string[]> => {
  const operatorList = await page.getOperatorList();
  const imageOps: any[] = [];
  let currentTransform = [1, 0, 0, 1, 0, 0];
  const transformStack: number[][] = [];
  const OPS = (pdfjs as any).OPS || (pdfjs as any).default?.OPS || {};
  const validImageOps = [
    OPS.paintImageXObject,
    OPS.paintInlineImageXObject,
    OPS.paintImageMaskXObject
  ].filter(op => op !== undefined);

  console.log(`Page operator list length: ${operatorList.fnArray.length}. Valid image OPS:`, validImageOps);

  for (let j = 0; j < operatorList.fnArray.length; j++) {
    const fn = operatorList.fnArray[j];
    const args = operatorList.argsArray[j];

    if (fn === OPS.save) {
      transformStack.push([...currentTransform]);
    } else if (fn === OPS.restore) {
      currentTransform = transformStack.pop() || [1, 0, 0, 1, 0, 0];
    } else if (fn === OPS.transform) {
      currentTransform = multiply(currentTransform, args as number[]);
    } else if (validImageOps.includes(fn)) {
      const imgId = args[0];
      try {
        const img = await resolvePdfObject(page, imgId);
        if (img) {
          console.log(`Found image object ${imgId}. Kind: ${img.kind}, Width: ${img.width}, Height: ${img.height}`);
          
          let dataUrl = "";
          const ImageKind = (pdfjs as any).ImageKind || {};
          
          // If it's a JPEG (DCT), we can extract the raw bytes directly
          if (img.data && (img.kind === ImageKind.DCT_DECODE || img.kind === 1)) {
            const base64 = Buffer.from(img.data).toString('base64');
            dataUrl = `data:image/jpeg;base64,${base64}`;
          } else if (img.data && (img.kind === ImageKind.RGB_24BPP || img.kind === 2)) {
            // Raw RGB - use our BMP encoder
            dataUrl = encodeBmp(img.data, img.width, img.height, false);
          } else if (img.data && (img.kind === ImageKind.RGBA_32BPP || img.kind === 3)) {
            // Raw RGBA - use our BMP encoder
            dataUrl = encodeBmp(img.data, img.width, img.height, true);
          }
          
          if (dataUrl) {
            imageOps.push(dataUrl);
          } else {
            console.warn(`Image ${imgId} is a format (Kind ${img.kind}) that cannot be directly extracted yet.`);
          }
        }
      } catch (e) { 
        console.error(`Error resolving image ${imgId}:`, e);
      }
    }
  }

  return imageOps;
};

/**
 * Simple BMP encoder to handle raw RGB/RGBA bitmaps from PDF.
 */
const encodeBmp = (data: Uint8Array, width: number, height: number, hasAlpha: boolean): string => {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;
  const buffer = Buffer.alloc(fileSize);

  // File Header
  buffer.write('BM', 0);
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(54, 10);

  // DIB Header
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  buffer.writeUInt32LE(0, 30);
  buffer.writeUInt32LE(pixelDataSize, 34);

  // Pixel Data (BMP is bottom-up, BGR)
  let pos = 54;
  const components = hasAlpha ? 4 : 3;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * components;
      buffer[pos++] = data[idx + 2]; // Blue
      buffer[pos++] = data[idx + 1]; // Green
      buffer[pos++] = data[idx];     // Red
    }
    pos += (rowSize - width * 3); // Padding
  }

  return `data:image/bmp;base64,${buffer.toString('base64')}`;
};

/**
 * Main function to extract text and images from a PDF file.
 */
export const extractPdfContent = async (data: Uint8Array): Promise<ExtractedPdfContent> => {
  console.log("Starting PDF extraction, data length:", data.length);
  const getDocument = (pdfjs as any).getDocument || (pdfjs as any).default?.getDocument;
  
  if (!getDocument) {
    console.error("getDocument not found in pdfjs:", Object.keys(pdfjs as any));
    throw new Error('PDF.js getDocument not found. Check import compatibility.');
  }

  try {
    const loadingTask = getDocument({ 
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true
    });
    
    const pdf = await loadingTask.promise;
    console.log(`Successfully loaded PDF with ${pdf.numPages} pages.`);

    let allText = "";
    let allImages: Array<{ url: string; caption: string }> = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Processing page ${i}...`);
      const page = await pdf.getPage(i);
      
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      allText += `--- Page ${i} ---\n${pageText}\n\n`;

      try {
        const pageImages = await extractImagesFromPage(page);
        allImages.push(...pageImages.map((url, idx) => ({
          url,
          caption: `Figure P${i}-${idx + 1}`
        })));
      } catch (imgErr) {
        console.warn(`Failed to extract images from page ${i}:`, imgErr);
      }
    }

    return { text: allText.trim(), images: allImages };
  } catch (err: any) {
    console.error("Error inside extractPdfContent:", err);
    throw err;
  }
};
