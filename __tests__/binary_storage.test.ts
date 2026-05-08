import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { uploadFile, clearFiles, findFilesByProjectId } from '../lib/models/files';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

describe('Binary Storage Verification', () => {
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockProjectId = new mongoose.Types.ObjectId().toString();

  const testFiles = [
    {
      name: 'SRS 1.pdf',
      path: 'lib/data/input/real_input/SRS 1.pdf',
      contentType: 'application/pdf'
    },
    {
      name: 'document.md',
      path: 'lib/data/input/srs_1_aims/document.md',
      contentType: 'text/markdown'
    },
    {
      name: 'Figure1.png',
      path: 'lib/data/input/srs_1_aims/images/Figure1.png',
      contentType: 'image/png'
    }
  ];

  beforeAll(async () => {
    await clearFiles();
  });

  it('should store and retrieve PDF, Markdown, and PNG files as binary', async () => {
    for (const fileSpec of testFiles) {
      const absolutePath = path.resolve(process.cwd(), fileSpec.path);
      
      // Verify file exists
      if (!fs.existsSync(absolutePath)) {
        console.warn(`File not found: ${absolutePath}`);
        continue;
      }
      
      const fileBuffer = fs.readFileSync(absolutePath);
      
      // Upload file
      const uploaded = await uploadFile({
        project_id: mockProjectId,
        user_id: mockUserId,
        original_name: fileSpec.name,
        contentType: fileSpec.contentType as any,
        fileData: fileBuffer
      });

      expect(uploaded.original_name).toBe(fileSpec.name);
      expect(uploaded.contentType).toBe(fileSpec.contentType);
      expect(uploaded.fileData).toBeDefined();
      
      const retrievedBuffer = Buffer.from(uploaded.fileData as Buffer);
      expect(retrievedBuffer.length).toBe(fileBuffer.length);
      
      // Compare content (buffers) using Buffer.compare
      const comparison = Buffer.compare(retrievedBuffer, fileBuffer);
      if (comparison !== 0) {
        throw new Error(`Buffer mismatch for ${fileSpec.name}. Lengths: ${retrievedBuffer.length} vs ${fileBuffer.length}`);
      }
      
      console.log(`Successfully verified storage of: ${fileSpec.name} (${retrievedBuffer.length} bytes)`);
    }

    // Verify all files are in the project
    const projectFiles = await findFilesByProjectId(mockProjectId);
    expect(projectFiles.length).toBeGreaterThan(0);
  });
});
