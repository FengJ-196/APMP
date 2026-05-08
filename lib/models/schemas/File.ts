import mongoose, { Schema, Document } from 'mongoose';

export interface IFile extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  originalName: string;
  contentType: string;
  fileData: Buffer;
  createdAt: Date;
}

const FileSchema = new Schema<IFile>({
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true, // Index for fast project-based lookups
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  contentType: {
    type: String,
    required: true,
  },
  fileData: {
    type: Buffer,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.File || mongoose.model<IFile>('File', FileSchema);
