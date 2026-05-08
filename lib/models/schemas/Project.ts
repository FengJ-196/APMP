import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  title: string;
  userId: mongoose.Types.ObjectId;
  status: 'active' | 'archived' | 'completed';
  createdAt: Date;
}

const ProjectSchema = new Schema<IProject>({
  title: {
    type: String,
    required: [true, 'Please provide a project title'],
    trim: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'completed'],
    default: 'active',
  },
}, { timestamps: true });

export default mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);
