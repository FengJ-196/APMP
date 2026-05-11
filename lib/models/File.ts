import mongoose, { Schema, Document } from 'mongoose';
import type { AllowedMimeType } from '@/dtos';

export interface IFile extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  originalName: string;
  contentType: AllowedMimeType;
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
    enum: {
      values: ['image/png', 'image/jpeg', 'text/markdown', 'application/pdf'],
      message: '{VALUE} is not a supported file type',
    },
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
