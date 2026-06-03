import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function list() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const Project = mongoose.models.Project || mongoose.model('Project', new mongoose.Schema({ 
    title: String,
    userId: mongoose.Schema.Types.ObjectId
  }));
  const projects = await Project.find({});
  console.log('Projects:', projects.map(p => ({ 
    id: p._id.toString(), 
    title: p.title,
    userId: p.userId?.toString() 
  })));
  process.exit(0);
}

list();
