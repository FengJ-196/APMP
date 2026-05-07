/**
 * Cleanup Worker — deletes expired temporary files.
 *
 * Files have a 24-hour TTL set at upload time via `expires_at`.
 * This worker scans for expired records and:
 *  1. Deletes the actual file from Cloudinary or local disk
 *  2. Removes the metadata record from the store
 *
 * In production, this would run on a cron schedule (e.g., every hour).
 * For now, it exposes the core logic as a callable function.
 */
import { findExpiredFiles, deleteFile } from '@/lib/models/files';
import { deleteImage } from '@/lib/storage/cloudinaryClient';
import { deleteFromLocalStorage } from '@/lib/storage/localStorageClient';

export interface CleanupResult {
  deleted: number;
  errors: Array<{ fileId: string; error: string }>;
}

/**
 * Scan for and delete all files whose `expires_at` has passed.
 * @param now — The current time (injectable for testing)
 */
export async function cleanupExpiredFiles(
  now: Date = new Date()
): Promise<CleanupResult> {
  const expiredFiles = findExpiredFiles(now);
  const errors: CleanupResult['errors'] = [];
  let deleted = 0;

  for (const file of expiredFiles) {
    try {
      // 1. Delete actual file from storage backend
      if (file.storage_type === 'cloudinary' && file.cloudinary_public_id) {
        await deleteImage(file.cloudinary_public_id);
      } else if (file.storage_type === 'local') {
        await deleteFromLocalStorage(file.storage_url);
      }

      // 2. Remove metadata record
      deleteFile(file.id);
      deleted++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ fileId: file.id, error: message });
    }
  }

  return { deleted, errors };
}
