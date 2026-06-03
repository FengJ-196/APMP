import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function listFiles() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const File = mongoose.models.File || mongoose.model('File', new mongoose.Schema({ 
    originalName: String,
    projectId: mongoose.Schema.Types.ObjectId,
    contentType: String,
    fileData: Buffer
  }));
  
  const files = await File.find({});
  console.log('Total files found:', files.length);
  console.log('Files:', files.map(f => ({ 
    id: f._id.toString(), 
    name: f.originalName,
    projectId: f.projectId?.toString(),
    type: f.contentType,
    dataSize: f.fileData ? f.fileData.length : 0
  })));
  process.exit(0);
}

listFiles();
