/**
 * TDD — RED Phase: Project File Storage Tests
 *
 * Tests for uploading and accessing files within a project.
 * Uses REAL files from lib/data/input/ as test fixtures:
 *   - PNG images (Figure1.png, etc.)
 *   - Markdown documents (document.md)
 *   - PDF documents (SRS 1.pdf, etc.)
 *
 * Written BEFORE the store implementation exists.
 *
 * Validates:
 *  - File upload with correct attributes (id, project_id, filename, mime_type, size_bytes, data, uploaded_at)
 *  - MIME type detection from file extension
 *  - Access files by id, by project_id
 *  - Multiple file types per project
 *  - Rejection of unsupported file types
 *  - File data integrity (content matches upload)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import {
  uploadFile,
  findFileById,
  findFilesByProjectId,
  clearFiles,
} from '@/lib/models/files';
import { createProject, clearProjects } from '@/lib/models/projects';
import type { ProjectFile } from '@/lib/models/types';

// ─── Test Fixture Paths ────────────────────────────────
const DATA_ROOT = path.resolve(__dirname, '../lib/data/input');

const FIXTURES = {
  png: path.join(DATA_ROOT, 'srs_1_aims/images/Figure1.png'),
  png2: path.join(DATA_ROOT, 'srs_2_bachkhoa/images/Figure1.png'),
  md: path.join(DATA_ROOT, 'srs_1_aims/document.md'),
  md2: path.join(DATA_ROOT, 'srs_3_custom/document.md'),
  pdf: path.join(DATA_ROOT, 'real_input/SRS 1.pdf'),
  pdf2: path.join(DATA_ROOT, 'real_input/SRS 2.pdf'),
};

describe('Project File Storage', () => {
  let projectId: string;

  beforeEach(() => {
    clearFiles();
    clearProjects();
    const project = createProject({ title: 'File Test Project', user_id: 'user-1' });
    projectId = project.id;
  });

  // ─── Upload: PNG ───────────────────────────────────────

  describe('upload PNG images', () => {
    it('should upload a real PNG file and store all attributes', () => {
      const data = readFileSync(FIXTURES.png);
      const file = uploadFile({
        project_id: projectId,
        filename: 'Figure1.png',
        data,
      });

      expect(file).toBeDefined();
      expect(file.id).toBeDefined();
      expect(file.id).toMatch(/^[a-f0-9]{24}$/);
      expect(file.project_id).toBe(projectId);
      expect(file.filename).toBe('Figure1.png');
      expect(file.mime_type).toBe('image/png');
      expect(file.size_bytes).toBe(data.length);
      expect(file.uploaded_at).toBeInstanceOf(Date);
    });

    it('should preserve the original file data', () => {
      const data = readFileSync(FIXTURES.png);
      const file = uploadFile({
        project_id: projectId,
        filename: 'Figure1.png',
        data,
      });

      expect(Buffer.compare(file.data, data)).toBe(0);
    });

    it('should handle multiple PNG uploads to the same project', () => {
      const data1 = readFileSync(FIXTURES.png);
      const data2 = readFileSync(FIXTURES.png2);

      uploadFile({ project_id: projectId, filename: 'Figure1.png', data: data1 });
      uploadFile({ project_id: projectId, filename: 'Figure1_bk.png', data: data2 });

      const files = findFilesByProjectId(projectId);
      expect(files).toHaveLength(2);
      expect(files.every((f) => f.mime_type === 'image/png')).toBe(true);
    });
  });

  // ─── Upload: Markdown ──────────────────────────────────

  describe('upload Markdown files', () => {
    it('should upload a real .md file with correct MIME type', () => {
      const data = readFileSync(FIXTURES.md);
      const file = uploadFile({
        project_id: projectId,
        filename: 'document.md',
        data,
      });

      expect(file.mime_type).toBe('text/markdown');
      expect(file.filename).toBe('document.md');
      expect(file.size_bytes).toBeGreaterThan(0);
    });

    it('should preserve markdown content exactly', () => {
      const data = readFileSync(FIXTURES.md);
      const file = uploadFile({
        project_id: projectId,
        filename: 'document.md',
        data,
      });

      const originalText = data.toString('utf-8');
      const storedText = file.data.toString('utf-8');
      expect(storedText).toBe(originalText);
    });
  });

  // ─── Upload: PDF ───────────────────────────────────────

  describe('upload PDF files', () => {
    it('should upload a real PDF file with correct MIME type', () => {
      const data = readFileSync(FIXTURES.pdf);
      const file = uploadFile({
        project_id: projectId,
        filename: 'SRS 1.pdf',
        data,
      });

      expect(file.mime_type).toBe('application/pdf');
      expect(file.filename).toBe('SRS 1.pdf');
      expect(file.size_bytes).toBe(data.length);
    });

    it('should preserve PDF binary data exactly', () => {
      const data = readFileSync(FIXTURES.pdf);
      const file = uploadFile({
        project_id: projectId,
        filename: 'SRS 1.pdf',
        data,
      });

      expect(Buffer.compare(file.data, data)).toBe(0);
    });

    it('should handle PDF files with spaces in filename', () => {
      const data = readFileSync(FIXTURES.pdf2);
      const file = uploadFile({
        project_id: projectId,
        filename: 'SRS 2.pdf',
        data,
      });

      expect(file.filename).toBe('SRS 2.pdf');
      expect(file.mime_type).toBe('application/pdf');
    });
  });

  // ─── Mixed File Types Per Project ──────────────────────

  describe('mixed file types in one project', () => {
    it('should store PNG, MD, and PDF files together', () => {
      uploadFile({
        project_id: projectId,
        filename: 'diagram.png',
        data: readFileSync(FIXTURES.png),
      });
      uploadFile({
        project_id: projectId,
        filename: 'spec.md',
        data: readFileSync(FIXTURES.md),
      });
      uploadFile({
        project_id: projectId,
        filename: 'full-srs.pdf',
        data: readFileSync(FIXTURES.pdf),
      });

      const files = findFilesByProjectId(projectId);
      expect(files).toHaveLength(3);

      const mimeTypes = files.map((f) => f.mime_type).sort();
      expect(mimeTypes).toEqual(['application/pdf', 'image/png', 'text/markdown']);
    });

    it('should generate unique IDs for all files', () => {
      const f1 = uploadFile({ project_id: projectId, filename: 'a.png', data: readFileSync(FIXTURES.png) });
      const f2 = uploadFile({ project_id: projectId, filename: 'b.md', data: readFileSync(FIXTURES.md) });
      const f3 = uploadFile({ project_id: projectId, filename: 'c.pdf', data: readFileSync(FIXTURES.pdf) });

      const ids = new Set([f1.id, f2.id, f3.id]);
      expect(ids.size).toBe(3);
    });
  });

  // ─── Access by ID ──────────────────────────────────────

  describe('findFileById', () => {
    it('should find a file by its id', () => {
      const data = readFileSync(FIXTURES.png);
      const uploaded = uploadFile({
        project_id: projectId,
        filename: 'lookup-test.png',
        data,
      });

      const found = findFileById(uploaded.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(uploaded.id);
      expect(found!.filename).toBe('lookup-test.png');
    });

    it('should return undefined for a non-existent id', () => {
      const found = findFileById('000000000000000000000000');
      expect(found).toBeUndefined();
    });

    it('should return a file with all expected attributes', () => {
      const data = readFileSync(FIXTURES.md2);
      const uploaded = uploadFile({
        project_id: projectId,
        filename: 'custom-doc.md',
        data,
      });

      const found = findFileById(uploaded.id);
      expect(found).toMatchObject({
        id: expect.any(String),
        project_id: projectId,
        filename: 'custom-doc.md',
        mime_type: 'text/markdown',
        size_bytes: expect.any(Number),
        uploaded_at: expect.any(Date),
      } satisfies Omit<Record<keyof ProjectFile, unknown>, 'data'>);
    });
  });

  // ─── Access by Project ID ──────────────────────────────

  describe('findFilesByProjectId', () => {
    it('should return all files for a project', () => {
      uploadFile({ project_id: projectId, filename: 'f1.png', data: readFileSync(FIXTURES.png) });
      uploadFile({ project_id: projectId, filename: 'f2.md', data: readFileSync(FIXTURES.md) });

      const files = findFilesByProjectId(projectId);
      expect(files).toHaveLength(2);
      expect(files.every((f) => f.project_id === projectId)).toBe(true);
    });

    it('should return empty array for a project with no files', () => {
      const emptyProject = createProject({ title: 'Empty', user_id: 'user-1' });
      const files = findFilesByProjectId(emptyProject.id);
      expect(files).toEqual([]);
    });

    it('should not return files from other projects', () => {
      const otherProject = createProject({ title: 'Other', user_id: 'user-2' });
      uploadFile({ project_id: projectId, filename: 'mine.png', data: readFileSync(FIXTURES.png) });
      uploadFile({ project_id: otherProject.id, filename: 'theirs.pdf', data: readFileSync(FIXTURES.pdf) });

      const myFiles = findFilesByProjectId(projectId);
      const theirFiles = findFilesByProjectId(otherProject.id);

      expect(myFiles).toHaveLength(1);
      expect(myFiles[0].filename).toBe('mine.png');
      expect(theirFiles).toHaveLength(1);
      expect(theirFiles[0].filename).toBe('theirs.pdf');
    });
  });

  // ─── Validation ────────────────────────────────────────

  describe('file type validation', () => {
    it('should reject unsupported file extensions', () => {
      const data = Buffer.from('not a real file');
      expect(() =>
        uploadFile({ project_id: projectId, filename: 'malware.exe', data })
      ).toThrow();
    });

    it('should reject .txt files (not in allowed list)', () => {
      const data = Buffer.from('plain text');
      expect(() =>
        uploadFile({ project_id: projectId, filename: 'notes.txt', data })
      ).toThrow();
    });

    it('should reject .docx files', () => {
      const data = Buffer.from('fake docx');
      expect(() =>
        uploadFile({ project_id: projectId, filename: 'report.docx', data })
      ).toThrow();
    });

    it('should accept .jpg as an alias for JPEG', () => {
      // Create a minimal JPEG-like buffer for test purposes
      const data = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
      const file = uploadFile({
        project_id: projectId,
        filename: 'photo.jpg',
        data,
      });

      expect(file.mime_type).toBe('image/jpeg');
    });

    it('should handle case-insensitive extensions', () => {
      const data = readFileSync(FIXTURES.png);
      const file = uploadFile({
        project_id: projectId,
        filename: 'DIAGRAM.PNG',
        data,
      });

      expect(file.mime_type).toBe('image/png');
    });
  });

  // ─── File Size Tracking ────────────────────────────────

  describe('file size tracking', () => {
    it('should accurately report file sizes for real files', () => {
      const pngData = readFileSync(FIXTURES.png);
      const mdData = readFileSync(FIXTURES.md);
      const pdfData = readFileSync(FIXTURES.pdf);

      const pngFile = uploadFile({ project_id: projectId, filename: 'fig.png', data: pngData });
      const mdFile = uploadFile({ project_id: projectId, filename: 'doc.md', data: mdData });
      const pdfFile = uploadFile({ project_id: projectId, filename: 'srs.pdf', data: pdfData });

      expect(pngFile.size_bytes).toBe(pngData.length);
      expect(mdFile.size_bytes).toBe(mdData.length);
      expect(pdfFile.size_bytes).toBe(pdfData.length);

      // The real files should have substantial sizes
      expect(pngFile.size_bytes).toBeGreaterThan(100_000); // PNG images are ~200-500KB
      expect(mdFile.size_bytes).toBeGreaterThan(10_000);   // Markdown docs are ~20-60KB
      expect(pdfFile.size_bytes).toBeGreaterThan(500_000); // PDFs are ~700KB-1.5MB
    });
  });

  // ─── Clear ─────────────────────────────────────────────

  describe('clearFiles', () => {
    it('should remove all stored files', () => {
      uploadFile({ project_id: projectId, filename: 'temp.png', data: readFileSync(FIXTURES.png) });
      uploadFile({ project_id: projectId, filename: 'temp.md', data: readFileSync(FIXTURES.md) });

      clearFiles();

      expect(findFilesByProjectId(projectId)).toEqual([]);
    });
  });
});
