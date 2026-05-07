/**
 * Tests for the Cloudinary storage client.
 * Uses mocked Cloudinary SDK — no real API calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadImage, deleteImage, cloudinary } from '@/lib/storage/cloudinaryClient';

// Mock cloudinary SDK
vi.mock('cloudinary', () => {
  const mockUploadStream = vi.fn();
  const mockDestroy = vi.fn();

  return {
    v2: {
      config: vi.fn(),
      uploader: {
        upload_stream: mockUploadStream,
        destroy: mockDestroy,
      },
    },
  };
});

describe('Cloudinary Storage Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('uploadImage', () => {
    it('should call upload_stream and return url + public_id', async () => {
      // Arrange: mock upload_stream to invoke callback with success
      const mockResult = {
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/apmp/temp/proj-1/Figure1.png',
        public_id: 'apmp/temp/proj-1/Figure1',
      };

      vi.mocked(cloudinary.uploader.upload_stream).mockImplementation(
        (_options: any, callback: any) => {
          // Simulate async callback
          setTimeout(() => callback(null, mockResult), 0);
          return { end: vi.fn() } as any;
        }
      );

      const buffer = Buffer.from('fake png data');
      const result = await uploadImage(buffer, 'Figure1.png', 'proj-1');

      expect(result.url).toBe(mockResult.secure_url);
      expect(result.public_id).toBe(mockResult.public_id);
    });

    it('should pass the correct folder and public_id options', async () => {
      vi.mocked(cloudinary.uploader.upload_stream).mockImplementation(
        (options: any, callback: any) => {
          setTimeout(() => callback(null, {
            secure_url: 'https://example.com/img.png',
            public_id: 'apmp/temp/proj-99/diagram',
          }), 0);
          return { end: vi.fn() } as any;
        }
      );

      await uploadImage(Buffer.from('data'), 'diagram.png', 'proj-99');

      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        expect.objectContaining({
          folder: 'apmp/temp/proj-99',
          public_id: 'diagram',
          resource_type: 'image',
        }),
        expect.any(Function)
      );
    });

    it('should reject if Cloudinary returns an error', async () => {
      vi.mocked(cloudinary.uploader.upload_stream).mockImplementation(
        (_options: any, callback: any) => {
          setTimeout(() => callback(new Error('Network failure'), null), 0);
          return { end: vi.fn() } as any;
        }
      );

      await expect(
        uploadImage(Buffer.from('data'), 'fail.png', 'proj-1')
      ).rejects.toThrow('Cloudinary upload failed');
    });

    it('should call end() on the upload stream with the buffer', async () => {
      const mockEnd = vi.fn();
      vi.mocked(cloudinary.uploader.upload_stream).mockImplementation(
        (_options: any, callback: any) => {
          setTimeout(() => callback(null, {
            secure_url: 'https://example.com/img.png',
            public_id: 'test',
          }), 0);
          return { end: mockEnd } as any;
        }
      );

      const buffer = Buffer.from('image bytes');
      await uploadImage(buffer, 'test.png', 'proj-1');

      expect(mockEnd).toHaveBeenCalledWith(buffer);
    });
  });

  describe('deleteImage', () => {
    it('should call cloudinary destroy with the public_id', async () => {
      vi.mocked(cloudinary.uploader.destroy).mockResolvedValue({ result: 'ok' } as any);

      await deleteImage('apmp/temp/proj-1/Figure1');

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        'apmp/temp/proj-1/Figure1',
        { resource_type: 'image' }
      );
    });
  });
});
