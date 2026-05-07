/**
 * Upload Service — orchestrates file uploads to the correct storage backend.
 *
 * Flow:
 * 1. Validate file type.
 * 2. Route to storage backend:
 *    - Images (PNG/JPEG) → Cloudinary
 *    - Documents (PDF/MD) → Local disk
 * 3. Store metadata record with 24-hour expiration.
 */
import { uploadFile, resolveMimeType } from '@/lib/models/files';
import { uploadImage } from '@/lib/storage/cloudinaryClient';
import { saveToLocalStorage } from '@/lib/storage/localStorageClient';
import type { ProjectFile } from '@/lib/models/types';

/** 24 hours in milliseconds */
const TTL_MS = 24 * 60 * 60 * 1000;

interface UploadParams {
  projectId: string;
  filename: string;
  data: Buffer;
}

/**
 * Orchestrates file upload:
 * 1. Validates file type
 * 2. Persists to Cloudinary (images) or local disk (documents)
 * 3. Creates a metadata record with 24h expiration
 */
export async function handleFileUpload({
  projectId,
  filename,
  data,
}: UploadParams): Promise<ProjectFile> {
  // 1. Validate (throws if unsupported)
  const mimeType = resolveMimeType(filename);
  const expiresAt = new Date(Date.now() + TTL_MS);

  // 2. Route to correct storage backend
  if (mimeType === 'image/png' || mimeType === 'image/jpeg') {
    // → Cloudinary
    const { url, public_id } = await uploadImage(data, filename, projectId);

    return uploadFile({
      project_id: projectId,
      filename,
      storage_type: 'cloudinary',
      storage_url: url,
      size_bytes: data.length,
      cloudinary_public_id: public_id,
      expires_at: expiresAt,
    });
  } else {
    // → Local disk (PDF, Markdown)
    const filePath = await saveToLocalStorage(data, filename, projectId);

    return uploadFile({
      project_id: projectId,
      filename,
      storage_type: 'local',
      storage_url: filePath,
      size_bytes: data.length,
      expires_at: expiresAt,
    });
  }
}
