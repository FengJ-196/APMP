import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { FileService } from '@/lib/services/FileService';
import { createProject, clearProjects } from '@/lib/models/Project';
import { clearFiles } from '@/lib/models/File';

describe('FileService & Upload Integration', () => {
  let projectId: string;
  const mockUserId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    await dbConnect();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await clearFiles();
    await clearProjects();
    
    const project = await createProject({
      title: 'File Service Test Project',
      userId: mockUserId,
    });
    projectId = project.id;
  });

  describe('resolveMimeType', () => {
    it('should resolve .pdf to application/pdf', () => {
      expect(FileService.resolveMimeType('test.pdf')).toBe('application/pdf');
    });

    it('should resolve .md to text/markdown', () => {
      expect(FileService.resolveMimeType('test.md')).toBe('text/markdown');
    });

    it('should resolve .png to image/png', () => {
      expect(FileService.resolveMimeType('test.png')).toBe('image/png');
    });

    it('should throw for unsupported extension', () => {
      expect(() => FileService.resolveMimeType('test.exe')).toThrow(/Unsupported file type/);
    });
  });

  describe('uploadFile', () => {
    it('should successfully upload a PDF file and save to MongoDB', async () => {
      const buffer = Buffer.from('%PDF-1.4 fake pdf');
      const uploaded = await FileService.uploadFile({
        projectId,
        userId: mockUserId,
        filename: 'document.pdf',
        data: buffer,
      });

      expect(uploaded).toBeDefined();
      expect(uploaded.id).toBeDefined();
      expect(uploaded.projectId).toBe(projectId);
      expect(uploaded.originalName).toBe('document.pdf');
      expect(uploaded.contentType).toBe('application/pdf');
      expect(Buffer.compare(uploaded.fileData as Buffer, buffer)).toBe(0);
    });

    it('should successfully upload a Markdown file with text content', async () => {
      const text = '# Sample Markdown Content';
      const buffer = Buffer.from(text);
      const uploaded = await FileService.uploadFile({
        projectId,
        userId: mockUserId,
        filename: 'readme.md',
        data: buffer,
        content: text,
      });

      expect(uploaded).toBeDefined();
      expect(uploaded.content).toBe(text);
      expect(uploaded.contentType).toBe('text/markdown');
    });

    it('should reject upload for unsupported file type', async () => {
      const buffer = Buffer.from('binary data');
      await expect(
        FileService.uploadFile({
          projectId,
          userId: mockUserId,
          filename: 'virus.exe',
          data: buffer,
        })
      ).rejects.toThrow(/Unsupported file type/);
    });
  });

  describe('Retrievals', () => {
    it('should get files by project ID', async () => {
      await FileService.uploadFile({
        projectId,
        userId: mockUserId,
        filename: 'file1.pdf',
        data: Buffer.from('pdf'),
      });

      await FileService.uploadFile({
        projectId,
        userId: mockUserId,
        filename: 'file2.md',
        data: Buffer.from('md'),
      });

      const files = await FileService.getFilesByProjectId(projectId);
      expect(files).toHaveLength(2);
      expect(files.map(f => f.originalName)).toContain('file1.pdf');
      expect(files.map(f => f.originalName)).toContain('file2.md');
    });

    it('should support excluding binary and text content fields', async () => {
      await FileService.uploadFile({
        projectId,
        userId: mockUserId,
        filename: 'file.md',
        data: Buffer.from('some large markdown'),
        content: 'some large markdown',
      });

      const files = await FileService.getFilesByProjectId(projectId, false);
      expect(files).toHaveLength(1);
      expect(files[0].fileData).toBeUndefined();
      expect(files[0].content).toBeUndefined();
    });
  });

  describe('renameFile', () => {
    it('should successfully rename a file and preserve its original extension', async () => {
      const uploaded = await FileService.uploadFile({
        projectId,
        userId: mockUserId,
        filename: 'original-name.md',
        data: Buffer.from('# content'),
        content: '# content',
      });

      // Case 1: Renaming without extension -> should append original extension
      const renamed1 = await FileService.renameFile(uploaded.id, 'new-name');
      expect(renamed1).toBeDefined();
      expect(renamed1?.originalName).toBe('new-name.md');
      expect(renamed1?.contentType).toBe('text/markdown');

      // Case 2: Renaming with mismatching extension -> should strip and append original extension
      const renamed2 = await FileService.renameFile(uploaded.id, 'another-name.pdf');
      expect(renamed2).toBeDefined();
      expect(renamed2?.originalName).toBe('another-name.md');
      expect(renamed2?.contentType).toBe('text/markdown');

      // Case 3: Renaming with matching extension -> should just set it
      const renamed3 = await FileService.renameFile(uploaded.id, 'final-name.md');
      expect(renamed3).toBeDefined();
      expect(renamed3?.originalName).toBe('final-name.md');
      expect(renamed3?.contentType).toBe('text/markdown');
    });

    it('should throw error for invalid arguments', async () => {
      const uploaded = await FileService.uploadFile({
        projectId,
        userId: mockUserId,
        filename: 'somefile.pdf',
        data: Buffer.from('%PDF'),
      });

      await expect(FileService.renameFile(uploaded.id, '')).rejects.toThrow(/New name cannot be empty/);
      await expect(FileService.renameFile(uploaded.id, '   ')).rejects.toThrow(/New name cannot be empty/);
    });
  });
});

