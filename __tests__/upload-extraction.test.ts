/**
 * Tests for the upload service — routing files to correct storage backends.
 *
 * Mocks:
 *  - cloudinaryClient (no real API calls)
 *  - localStorageClient (no real disk writes)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { handleFileUpload } from '@/lib/services/uploadService';
import { clearFiles, findFilesByProjectId } from '@/lib/models/files';
import { createProject, clearProjects } from '@/lib/models/projects';

// Mock storage backends
vi.mock('@/lib/storage/cloudinaryClient', () => ({
  uploadImage: vi.fn().mockResolvedValue({
    url: 'https://res.cloudinary.com/demo/image/upload/v1/apmp/temp/proj/img.png',
    public_id: 'apmp/temp/proj/img',
  }),
  deleteImage: vi.fn(),
  cloudinary: { config: vi.fn() },
}));

vi.mock('@/lib/storage/localStorageClient', () => ({
  saveToLocalStorage: vi.fn().mockResolvedValue('/tmp/uploads/proj/document.md'),
  readFromLocalStorage: vi.fn(),
  deleteFromLocalStorage: vi.fn(),
  getUploadRoot: vi.fn().mockReturnValue('/tmp/uploads'),
}));

import { uploadImage } from '@/lib/storage/cloudinaryClient';
import { saveToLocalStorage } from '@/lib/storage/localStorageClient';

// ─── Test Fixture Paths ────────────────────────────────
const DATA_ROOT = path.resolve(__dirname, '../lib/data/input');
const FIXTURES = {
  png: path.join(DATA_ROOT, 'srs_1_aims/images/Figure1.png'),
  md: path.join(DATA_ROOT, 'srs_1_aims/document.md'),
};

describe('Upload Service — Storage Routing', () => {
  let projectId: string;

  beforeEach(() => {
    clearFiles();
    clearProjects();
    const project = createProject({ title: 'Upload Test', user_id: 'user-1' });
    projectId = project.id;
    vi.clearAllMocks();
  });

  // ─── Routing ───────────────────────────────────────────

  it('should route PNG uploads to Cloudinary', async () => {
    const data = readFileSync(FIXTURES.png);
    const result = await handleFileUpload({
      projectId,
      filename: 'diagram.png',
      data,
    });

    expect(uploadImage).toHaveBeenCalledWith(data, 'diagram.png', projectId);
    expect(result.storage_type).toBe('cloudinary');
    expect(result.storage_url).toContain('cloudinary.com');
    expect(result.cloudinary_public_id).toBeDefined();
  });

  it('should route Markdown uploads to local storage', async () => {
    const data = readFileSync(FIXTURES.md);
    const result = await handleFileUpload({
      projectId,
      filename: 'spec.md',
      data,
    });

    expect(saveToLocalStorage).toHaveBeenCalledWith(data, 'spec.md', projectId);
    expect(result.storage_type).toBe('local');
    expect(result.storage_url).toContain('/tmp/uploads');
  });

  it('should route PDF uploads to local storage', async () => {
    const data = Buffer.from('%PDF-1.4 fake pdf content');
    vi.mocked(saveToLocalStorage).mockResolvedValueOnce('/tmp/uploads/proj/report.pdf');

    const result = await handleFileUpload({
      projectId,
      filename: 'report.pdf',
      data,
    });

    expect(saveToLocalStorage).toHaveBeenCalledWith(data, 'report.pdf', projectId);
    expect(result.storage_type).toBe('local');
    expect(result.mime_type).toBe('application/pdf');
  });

  // ─── Metadata ──────────────────────────────────────────

  it('should create a metadata record with correct attributes', async () => {
    const data = readFileSync(FIXTURES.png);
    const result = await handleFileUpload({
      projectId,
      filename: 'test.png',
      data,
    });

    expect(result.id).toMatch(/^[a-f0-9]{24}$/);
    expect(result.project_id).toBe(projectId);
    expect(result.filename).toBe('test.png');
    expect(result.mime_type).toBe('image/png');
    expect(result.size_bytes).toBe(data.length);
    expect(result.uploaded_at).toBeInstanceOf(Date);
  });

  it('should set expires_at approximately 24 hours in the future', async () => {
    const before = Date.now();
    const data = readFileSync(FIXTURES.md);
    const result = await handleFileUpload({
      projectId,
      filename: 'test.md',
      data,
    });
    const after = Date.now();

    const expectedMin = before + 24 * 60 * 60 * 1000;
    const expectedMax = after + 24 * 60 * 60 * 1000;

    expect(result.expires_at).toBeInstanceOf(Date);
    expect(result.expires_at.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(result.expires_at.getTime()).toBeLessThanOrEqual(expectedMax);
  });

  it('should store the file in the project metadata store', async () => {
    const data = readFileSync(FIXTURES.png);
    await handleFileUpload({ projectId, filename: 'stored.png', data });

    const stored = findFilesByProjectId(projectId);
    expect(stored).toHaveLength(1);
    expect(stored[0].filename).toBe('stored.png');
  });

  // ─── Validation ────────────────────────────────────────

  it('should reject unsupported file types', async () => {
    const data = Buffer.from('fake data');
    await expect(
      handleFileUpload({ projectId, filename: 'virus.exe', data })
    ).rejects.toThrow(/Unsupported file type/);
  });

  // ─── No Buffer in metadata ─────────────────────────────

  it('should NOT store raw binary data in the metadata record', async () => {
    const data = readFileSync(FIXTURES.png);
    const result = await handleFileUpload({
      projectId,
      filename: 'no-buffer.png',
      data,
    });

    // The result should have NO `data` property (Buffer)
    expect((result as any).data).toBeUndefined();
  });
});
