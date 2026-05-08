/**
 * MongoDB-backed Project File binary store.
 */
import dbConnect from '../db';
import FileModel from './schemas/File';
import type { ProjectFile, UploadFileInput, AllowedMimeType } from './types';
import { MIME_TYPE_MAP } from './types';
import path from 'path';
import mongoose from 'mongoose';

function mapToFileType(doc: any): ProjectFile {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    userId: doc.userId.toString(),
    originalName: doc.originalName,
    contentType: doc.contentType as AllowedMimeType,
    fileData: doc.fileData, // Buffer
    createdAt: doc.createdAt,
  };
}

export function resolveMimeType(filename: string): AllowedMimeType {
  const ext = path.extname(filename).toLowerCase();
  const mimeType = MIME_TYPE_MAP[ext];
  if (!mimeType) {
    throw new Error(`Unsupported file type "${ext}"`);
  }
  return mimeType;
}

/**
 * Store a file binary record in MongoDB.
 */
export async function uploadFile(input: UploadFileInput): Promise<ProjectFile> {
  await dbConnect();
  const file = await FileModel.create({
    projectId: input.projectId,
    userId: input.userId,
    originalName: input.originalName,
    contentType: input.contentType,
    fileData: input.fileData,
  });
  return mapToFileType(file);
}

export async function findFileById(id: string): Promise<ProjectFile | undefined> {
  await dbConnect();
  const file = await FileModel.findById(id);
  if (!file) return undefined;
  return mapToFileType(file);
}

export async function findFilesByProjectId(projectId: string): Promise<ProjectFile[]> {
  await dbConnect();
  const files = await FileModel.find({ 
    projectId: new mongoose.Types.ObjectId(projectId) 
  });
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
