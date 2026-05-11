/**
 * MongoDB-backed Project File binary store.
 */
import mongoose from 'mongoose';
import dbConnect from '../db';
import { File as FileModel } from '../models';
import type { FileDTO, UploadFileInputDTO } from '@/dtos';

function mapToFileType(doc: any): FileDTO {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    userId: doc.userId.toString(),
    originalName: doc.originalName,
    contentType: doc.contentType,
    fileData: doc.fileData, // Buffer
    createdAt: doc.createdAt,
  };
}

/**
 * Store a file binary record in MongoDB.
 */
export async function uploadFile(input: UploadFileInputDTO): Promise<FileDTO> {
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

export async function findFileById(id: string): Promise<FileDTO | undefined> {
  await dbConnect();
  const file = await FileModel.findById(id);
  if (!file) return undefined;
  return mapToFileType(file);
}

export async function findFilesByProjectId(projectId: string): Promise<FileDTO[]> {
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
