import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { uploadImage, deleteImage } from '../lib/storage/cloudinaryClient';
import dotenv from 'dotenv';

// Load .env.local manually for the test environment
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const IMAGE_PATH = path.resolve('d:/Project/GR1/newAPMP/my-app/lib/data/input/srs_1_aims/images/Figure1.png');

describe('Cloudinary Integration Test (30s Dashboard Verification)', () => {
  
  beforeAll(() => {
    if (!process.env.CLOUDINARY_URL && !(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)) {
      throw new Error("Missing Cloudinary configuration in .env.local.");
    }
    if (!existsSync(IMAGE_PATH)) {
      throw new Error(`Test image not found at ${IMAGE_PATH}`);
    }
  });

  it('should upload, WAIT 30s for verification, and then delete', async () => {
    const buffer = readFileSync(IMAGE_PATH);
    const projectId = 'dashboard-test';
    const filename = `verify-me-${Date.now()}.png`;

    console.log(`\n🚀 STEP 1: Uploading to Cloudinary...`);
    const result = await uploadImage(buffer, filename, projectId);
    
    console.log(`✅ UPLOAD SUCCESS!`);
    console.log(`🔗 URL: ${result.url}`);
    console.log(`🆔 Public ID: ${result.public_id}`);
    
    console.log(`\n⏳ STEP 2: PAUSING FOR 30 SECONDS...`);
    console.log(`👉 Go to your Cloudinary dashboard NOW and look for: ${result.public_id}`);
    
    // Wait for 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    console.log(`\n🗑️ STEP 3: Cleaning up (Deleting from Cloudinary)...`);
    await deleteImage(result.public_id);
    console.log(`✅ DELETE SUCCESS! Test complete.`);

    expect(result.url).toContain('cloudinary.com');
  }, 60000); // 60 second timeout to allow for the 30s pause
});
