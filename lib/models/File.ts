import mongoose, { Schema, Document } from 'mongoose';
import type { AllowedMimeType, FileDTO, UploadFileInputDTO } from '@/dtos';
import dbConnect from '../db';

export interface IFile extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  originalName: string;
  contentType: AllowedMimeType;
  fileData: Buffer;
  content?: string;
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
      values: ['image/png', 'image/jpeg', 'text/markdown', 'text/plain', 'application/pdf'],
      message: '{VALUE} is not a supported file type',
    },
  },
  fileData: {
    type: Buffer,
    required: true,
  },
  content: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const FileModel = mongoose.models.File || mongoose.model<IFile>('File', FileSchema);
export default FileModel;

export function mapToFileType(doc: IFile): FileDTO {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    userId: doc.userId.toString(),
    originalName: doc.originalName,
    contentType: doc.contentType,
    fileData: doc.fileData, // Buffer (might be undefined due to projection)
    content: doc.content,
    createdAt: doc.createdAt,
  };
}

export async function uploadFile(input: UploadFileInputDTO): Promise<FileDTO> {
  await dbConnect();
  const file = await FileModel.create({
    projectId: input.projectId,
    userId: input.userId,
    originalName: input.originalName,
    contentType: input.contentType,
    fileData: input.fileData,
    content: input.content,
  });
  return mapToFileType(file);
}

export async function findFileById(id: string): Promise<FileDTO | undefined> {
  await dbConnect();
  const file = await FileModel.findById(id).lean<IFile>();
  if (!file) return undefined;
  return mapToFileType(file);
}

export async function findFilesByProjectId(projectId: string, includeBinary: boolean = true): Promise<FileDTO[]> {
  await dbConnect();
  const query = FileModel.find({ 
    projectId: new mongoose.Types.ObjectId(projectId) 
  });
  
  if (!includeBinary) {
    query.select('-fileData -content');
  }
  
  const files = await query.lean<IFile[]>();
  return files.map(mapToFileType);
}

/**
 * Fetches files for a project excluding only the heavy binary fileData,
 * but including the text content field (for mermaid code, markdown text, etc.).
 */
export async function findFilesMetaWithContent(projectId: string): Promise<FileDTO[]> {
  await dbConnect();
  const files = await FileModel.find({ 
    projectId: new mongoose.Types.ObjectId(projectId) 
  }).select('-fileData').lean<IFile[]>();
  return files.map(mapToFileType);
}

export async function deleteFile(id: string): Promise<boolean> {
  await dbConnect();
  const result = await FileModel.deleteOne({ _id: id });
  return result.deletedCount > 0;
}

export async function clearFiles(): Promise<void> {
  await dbConnect();
  await FileModel.deleteMany({});
}

export async function updateFileContent(id: string, fileData: Buffer): Promise<FileDTO | undefined> {
  await dbConnect();
  const file = await FileModel.findByIdAndUpdate(id, { fileData }, { new: true }).lean<IFile>();
  if (!file) return undefined;
  return mapToFileType(file);
}

export async function updateFileTextContent(id: string, content: string): Promise<FileDTO | undefined> {
  await dbConnect();
  const file = await FileModel.findByIdAndUpdate(id, { content }, { new: true }).lean<IFile>();
  if (!file) return undefined;
  return mapToFileType(file);
}

export async function renameFile(id: string, newName: string): Promise<FileDTO | undefined> {
  await dbConnect();
  const file = await FileModel.findByIdAndUpdate(id, { originalName: newName }, { new: true }).lean<IFile>();
  if (!file) return undefined;
  return mapToFileType(file);
}


