import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function inspectFile() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const File = mongoose.models.File || mongoose.model('File', new mongoose.Schema({}, { strict: false }));
  
  const files = await File.find({}).lean();
  console.log('Total files in DB:', files.length);
  for (const file of files) {
    console.log({
      _id: file._id.toString(),
      originalName: file.originalName,
      contentType: file.contentType,
      fileDataType: typeof file.fileData,
      fileDataIsBuffer: Buffer.isBuffer(file.fileData),
      fileDataKeys: file.fileData ? Object.keys(file.fileData) : []
    });
  }
  process.exit(0);
}

inspectFile();
