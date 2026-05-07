/**
 * Tests for the cleanup worker.
 * Verifies that expired files are properly deleted from both
 * storage backends and the metadata store.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanupExpiredFiles } from '@/lib/workers/cleanupWorker';
import { uploadFile, findFileById, clearFiles } from '@/lib/models/files';

// Mock both storage backends
vi.mock('@/lib/storage/cloudinaryClient', () => ({
  deleteImage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/storage/localStorageClient', () => ({
  deleteFromLocalStorage: vi.fn().mockResolvedValue(undefined),
}));

import { deleteImage } from '@/lib/storage/cloudinaryClient';
import { deleteFromLocalStorage } from '@/lib/storage/localStorageClient';

describe('Cleanup Worker', () => {
  beforeEach(() => {
    clearFiles();
    vi.clearAllMocks();
  });

  function createExpiredCloudinaryFile() {
    return uploadFile({
      project_id: 'proj-1',
      filename: 'old-image.png',
      storage_type: 'cloudinary',
      storage_url: 'https://res.cloudinary.com/demo/old-image.png',
      size_bytes: 50000,
      cloudinary_public_id: 'apmp/temp/proj-1/old-image',
      expires_at: new Date(Date.now() - 1000), // expired 1 second ago
    });
  }

  function createExpiredLocalFile() {
    return uploadFile({
      project_id: 'proj-1',
      filename: 'old-doc.md',
      storage_type: 'local',
      storage_url: '/tmp/uploads/proj-1/old-doc.md',
      size_bytes: 2000,
      expires_at: new Date(Date.now() - 1000), // expired 1 second ago
    });
  }

  function createFreshFile() {
    return uploadFile({
      project_id: 'proj-1',
      filename: 'fresh.png',
      storage_type: 'cloudinary',
      storage_url: 'https://res.cloudinary.com/demo/fresh.png',
      size_bytes: 30000,
      cloudinary_public_id: 'apmp/temp/proj-1/fresh',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
    });
  }

  it('should delete expired Cloudinary images', async () => {
    const expired = createExpiredCloudinaryFile();
    const result = await cleanupExpiredFiles();

    expect(deleteImage).toHaveBeenCalledWith('apmp/temp/proj-1/old-image');
    expect(findFileById(expired.id)).toBeUndefined();
    expect(result.deleted).toBe(1);
  });

  it('should delete expired local files', async () => {
    const expired = createExpiredLocalFile();
    const result = await cleanupExpiredFiles();

    expect(deleteFromLocalStorage).toHaveBeenCalledWith('/tmp/uploads/proj-1/old-doc.md');
    expect(findFileById(expired.id)).toBeUndefined();
    expect(result.deleted).toBe(1);
  });

  it('should NOT delete files that have not expired', async () => {
    const fresh = createFreshFile();
    const result = await cleanupExpiredFiles();

    expect(findFileById(fresh.id)).toBeDefined();
    expect(result.deleted).toBe(0);
  });

  it('should handle mixed expired and fresh files', async () => {
    const expired1 = createExpiredCloudinaryFile();
    const expired2 = createExpiredLocalFile();
    const fresh = createFreshFile();

    const result = await cleanupExpiredFiles();

    expect(result.deleted).toBe(2);
    expect(findFileById(expired1.id)).toBeUndefined();
    expect(findFileById(expired2.id)).toBeUndefined();
    expect(findFileById(fresh.id)).toBeDefined();
  });

  it('should track errors without stopping the entire cleanup', async () => {
    createExpiredCloudinaryFile();
    createExpiredLocalFile();

    // Make Cloudinary delete fail
    vi.mocked(deleteImage).mockRejectedValueOnce(new Error('API timeout'));

    const result = await cleanupExpiredFiles();

    // The cloudinary file failed, but the local file should still be cleaned up
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('API timeout');
    expect(result.deleted).toBe(1); // only the local file
  });

  it('should accept a custom "now" date for testability', async () => {
    // Create a file that expires in 12 hours
    uploadFile({
      project_id: 'proj-1',
      filename: 'future.png',
      storage_type: 'cloudinary',
      storage_url: 'https://example.com/future.png',
      size_bytes: 1000,
      cloudinary_public_id: 'apmp/temp/proj-1/future',
      expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000), // +12h
    });

    // Running cleanup with "now" won't delete it
    const result1 = await cleanupExpiredFiles(new Date());
    expect(result1.deleted).toBe(0);

    // Running cleanup with "now + 13h" WILL delete it
    const future = new Date(Date.now() + 13 * 60 * 60 * 1000);
    const result2 = await cleanupExpiredFiles(future);
    expect(result2.deleted).toBe(1);
  });
});
