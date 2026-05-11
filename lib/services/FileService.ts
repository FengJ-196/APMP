import path from 'path';
import { uploadFile, findFilesByProjectId, findFileById, deleteFile } from '../repositories/files';
import { UploadFileInputSchema, type FileDTO, MIME_TYPE_MAP, type AllowedMimeType } from '@/dtos';

export interface UploadParams {
  projectId: string;
  userId: string;
  filename: string;
  data: Buffer;
}

export class FileService {
  /**
   * Resolves the MIME type from the file extension.
   * Throws an error if the extension is not supported.
   */
  static resolveMimeType(filename: string): AllowedMimeType {
    const ext = path.extname(filename).toLowerCase();
    const mimeType = MIME_TYPE_MAP[ext];
    if (!mimeType) {
      throw new Error(`Unsupported file type "${ext}"`);
    }
    return mimeType;
  }

  /**
   * Validates file format and persists binary data to MongoDB.
   */
  static async uploadFile(params: UploadParams): Promise<FileDTO> {
    const mimeType = this.resolveMimeType(params.filename);

    const inputData = {
      projectId: params.projectId,
      userId: params.userId,
      originalName: params.filename,
      contentType: mimeType,
      fileData: params.data,
    };

    // Validate using Zod schema
    const result = UploadFileInputSchema.safeParse(inputData);
    if (!result.success) {
      throw new Error(`Invalid file upload data: ${result.error.message}`);
    }

    return uploadFile(result.data);
  }

  /**
   * Retrieves all files for a specific project.
   */
  static async getFilesByProjectId(projectId: string): Promise<FileDTO[]> {
    if (!projectId) throw new Error('Project ID is required');
    return findFilesByProjectId(projectId);
  }

  /**
   * Retrieves a specific file by its ID.
   */
  static async getFileById(fileId: string): Promise<FileDTO | undefined> {
    if (!fileId) throw new Error('File ID is required');
    return findFileById(fileId);
  }
  
  /**
   * Deletes a specific file by its ID.
   */
  static async deleteFile(fileId: string): Promise<boolean> {
     if (!fileId) throw new Error('File ID is required');
     return deleteFile(fileId);
  }
}
