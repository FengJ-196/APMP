import mongoose from 'mongoose';

async function main() {
  await mongoose.connect('mongodb://localhost:27017/apmp');
  
  const FileModel = mongoose.model('File', new mongoose.Schema({
    projectId: mongoose.Schema.Types.ObjectId,
    originalName: String,
    contentType: String,
    fileData: Buffer,
    content: String,
    createdAt: Date,
  }));

  const files = await FileModel.find({}).select('originalName contentType content').lean();
  
  console.log(`\n=== Total files in DB: ${files.length} ===\n`);
  
  for (const f of files) {
    console.log('---');
    console.log('Name:', f.originalName);
    console.log('ContentType:', f.contentType);
    console.log('Content length:', f.content ? f.content.length : 0);
    console.log('Content preview:', f.content ? f.content.substring(0, 150) : '(empty/null)');
  }
  
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
