import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { handleFileUpload } from '@/lib/services/uploadService';
import { clearFiles, findFilesByProjectId } from '@/lib/models/files';
import { createProject, clearProjects } from '@/lib/models/projects';
// ─── Test Fixture Paths ────────────────────────────────
const DATA_ROOT = path.resolve(__dirname, '../lib/data/input');
const FIXTURES = {
  png: path.join(DATA_ROOT, 'srs_1_aims/images/Figure1.png'),
  md: path.join(DATA_ROOT, 'srs_1_aims/document.md'),
};

describe('File Upload and Extraction Flow', () => {
  let projectId: string;

  beforeEach(() => {
    clearFiles();
    clearProjects();
    const project = createProject({ title: 'Extraction Test', user_id: 'user-1' });
    projectId = project.id;

    // Reset mocks
    vi.restoreAllMocks();
  });

  it('should store non-PDF files (PNG) for preview without extraction', async () => {
    const data = readFileSync(FIXTURES.png);
    const result = await handleFileUpload({
      projectId,
      filename: 'test-image.png',
      data,
    });

    expect(result.id).toBeDefined();
    expect(result.mime_type).toBe('image/png');
    expect(result.extraction_results).toBeUndefined();

    // Verify it's in the store
    const stored = findFilesByProjectId(projectId);
    expect(stored).toHaveLength(1);
    expect(stored[0].filename).toBe('test-image.png');
  });

  it('should store Markdown files and preserve text content', async () => {
    const data = readFileSync(FIXTURES.md);
    const result = await handleFileUpload({
      projectId,
      filename: 'test.md',
      data,
    });

    expect(result.mime_type).toBe('text/markdown');
    expect(result.data.toString()).toBe(data.toString());
    expect(result.extraction_results).toBeUndefined();
  });



  it('should reject unsupported file types before extraction', async () => {
    const data = Buffer.from('fake data');
    await expect(handleFileUpload({
      projectId,
      filename: 'unsupported.exe',
      data,
    })).rejects.toThrow(/Unsupported file type/);
  });
});
