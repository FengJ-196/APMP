/**
 * Upload Service — orchestrates file uploads to MongoDB binary storage.
 */
import { uploadFile, resolveMimeType } from '@/lib/models/files';
import type { ProjectFile } from '@/lib/models/types';

interface UploadParams {
  projectId: string;
  userId: string;
  filename: string;
  data: Buffer;
}

/**
 * Orchestrates file upload:
 * 1. Validates file type
 * 2. Persists binary data directly to MongoDB
 */
export async function handleFileUpload({
  projectId,
  userId,
  filename,
  data,
}: UploadParams): Promise<ProjectFile> {
  // 1. Validate (throws if unsupported)
  const mimeType = resolveMimeType(filename);

  // 2. Persist directly to MongoDB
  return uploadFile({
    project_id: projectId,
    user_id: userId,
    original_name: filename,
    contentType: mimeType,
    fileData: data,
  });
}
