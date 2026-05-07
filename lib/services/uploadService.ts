/**
 * Service to handle project file uploads and extraction logic.
 * 
 * Flow:
 * 1. Basic storage and metadata extraction.
 * 2. Specialized content extraction for PDFs.
 * 3. Enrichment of the file model with extracted data.
 */
import { uploadFile, findFileById } from '@/lib/models/files';
import { extractPdfContent } from '@/lib/utils/pdfExtractor';
import type { ProjectFile } from '@/lib/models/types';

interface UploadParams {
  projectId: string;
  filename: string;
  data: Buffer;
}

/**
 * Orchestrates the upload and extraction process.
 * Stores the file and performs extraction if applicable.
 */
export async function handleFileUpload({
  projectId,
  filename,
  data,
}: UploadParams): Promise<ProjectFile> {
  // 1. Initial storage (this will also validate file types)
  // This mimics the "Frontend Store" step where metadata is captured.
  const storedFile = uploadFile({
    project_id: projectId,
    filename,
    data,
  });

  // 2. Conditional Extraction (e.g. for PDFs)
  if (storedFile.mime_type === 'application/pdf') {
    try {
      // Convert Buffer to ArrayBuffer for pdfjs compatibility
      const arrayBuffer = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength
      );
      
      const extraction = await extractPdfContent(arrayBuffer);
      
      // Update the stored file with extraction results
      // In a real DB, this would be an update call.
      storedFile.extraction_results = extraction;
    } catch (error) {
      console.error(`Failed to extract content from ${filename}:`, error);
      // We still keep the file even if extraction fails, 
      // but without the enriched data.
    }
  }

  return storedFile;
}
