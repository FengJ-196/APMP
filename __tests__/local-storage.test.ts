/**
 * Tests for the local disk storage client.
 * Uses a real temp directory — cleaned up after each test.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  saveToLocalStorage,
  readFromLocalStorage,
  deleteFromLocalStorage,
  getUploadRoot,
} from '@/lib/storage/localStorageClient';

const TEST_PROJECT_ID = 'test-project-local';
const UPLOAD_ROOT = getUploadRoot();
const TEST_DIR = path.join(UPLOAD_ROOT, TEST_PROJECT_ID);

describe('Local Storage Client', () => {
  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('saveToLocalStorage', () => {
    it('should write a buffer to disk and return the file path', async () => {
      const buffer = Buffer.from('Hello, local storage!');
      const filePath = await saveToLocalStorage(buffer, 'test.md', TEST_PROJECT_ID);

      expect(fs.existsSync(filePath)).toBe(true);
      expect(filePath).toContain(TEST_PROJECT_ID);
      expect(filePath).toContain('test.md');
    });

    it('should create nested directories as needed', async () => {
      const buffer = Buffer.from('nested content');
      await saveToLocalStorage(buffer, 'deep-file.md', TEST_PROJECT_ID);

      expect(fs.existsSync(TEST_DIR)).toBe(true);
    });

    it('should store the exact content that was written', async () => {
      const content = '# SRS Document\n\nThis is a test document.';
      const buffer = Buffer.from(content, 'utf-8');
      const filePath = await saveToLocalStorage(buffer, 'doc.md', TEST_PROJECT_ID);

      const stored = fs.readFileSync(filePath, 'utf-8');
      expect(stored).toBe(content);
    });

    it('should sanitize filenames to prevent path traversal', async () => {
      const buffer = Buffer.from('safe content');
      const filePath = await saveToLocalStorage(
        buffer,
        '../../etc/passwd',
        TEST_PROJECT_ID
      );

      // Should store as just "passwd" in the project directory
      expect(filePath).toContain(TEST_PROJECT_ID);
      expect(filePath).not.toContain('..');
    });
  });

  describe('readFromLocalStorage', () => {
    it('should read back the exact content that was written', async () => {
      const original = Buffer.from('binary data here');
      const filePath = await saveToLocalStorage(original, 'read-test.pdf', TEST_PROJECT_ID);

      const readBack = readFromLocalStorage(filePath);

      expect(Buffer.compare(readBack, original)).toBe(0);
    });

    it('should throw if the file does not exist', () => {
      expect(() =>
        readFromLocalStorage('/nonexistent/path/file.pdf')
      ).toThrow();
    });
  });

  describe('deleteFromLocalStorage', () => {
    it('should delete the file from disk', async () => {
      const buffer = Buffer.from('temporary');
      const filePath = await saveToLocalStorage(buffer, 'temp.md', TEST_PROJECT_ID);

      expect(fs.existsSync(filePath)).toBe(true);

      await deleteFromLocalStorage(filePath);

      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should clean up empty parent directory after deletion', async () => {
      const buffer = Buffer.from('only file');
      const filePath = await saveToLocalStorage(buffer, 'solo.md', TEST_PROJECT_ID);

      await deleteFromLocalStorage(filePath);

      expect(fs.existsSync(TEST_DIR)).toBe(false);
    });

    it('should not throw if the file is already gone', async () => {
      await expect(
        deleteFromLocalStorage('/nonexistent/file.pdf')
      ).resolves.not.toThrow();
    });
  });
});
