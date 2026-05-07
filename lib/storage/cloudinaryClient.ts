/**
 * Cloudinary storage client for temporary image files (PNG, JPEG).
 */
import { v2 as cloudinary } from 'cloudinary';

/**
 * Manually parse CLOUDINARY_URL if present to ensure the SDK is configured.
 * Format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
 */
function configureCloudinary() {
  const url = process.env.CLOUDINARY_URL;
  
  if (url && url.startsWith('cloudinary://')) {
    try {
      const content = url.replace('cloudinary://', '');
      const [auth, cloudName] = content.split('@');
      const [apiKey, apiSecret] = auth.split(':');
      
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
      });
      return;
    } catch (e) {
      console.error('Failed to parse CLOUDINARY_URL manually:', e);
    }
  }

  // Fallback to individual keys or automatic detection
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

// Run initial config
configureCloudinary();

export interface CloudinaryUploadResult {
  url: string;
  public_id: string;
}

export async function uploadImage(
  buffer: Buffer,
  filename: string,
  projectId: string
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    // Re-run config to catch late-loaded env vars
    configureCloudinary();

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `apmp/temp/${projectId}`,
        public_id: filename.replace(/\.[^.]+$/, ''),
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else if (result) {
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
          });
        } else {
          reject(new Error('Cloudinary upload returned no result'));
        }
      }
    );
    uploadStream.end(buffer);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  configureCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

export { cloudinary };
