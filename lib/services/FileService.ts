import path from 'path';
import { uploadFile, findFilesByProjectId, findFilesMetaWithContent, findFileById, deleteFile, updateFileContent, updateFileTextContent } from '../models/File';
import { UploadFileInputSchema, type FileDTO, MIME_TYPE_MAP, type AllowedMimeType } from '@/dtos';

export interface UploadParams {
  projectId: string;
  userId: string;
  filename: string;
  data: Buffer;
  content?: string;
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
      content: params.content,
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
  static async getFilesByProjectId(projectId: string, includeBinary: boolean = true): Promise<FileDTO[]> {
    if (!projectId) throw new Error('Project ID is required');
    return findFilesByProjectId(projectId, includeBinary);
  }

  /**
   * Retrieves files for a project with content strings but without heavy binary fileData.
   */
  static async getFilesMetaWithContent(projectId: string): Promise<FileDTO[]> {
    if (!projectId) throw new Error('Project ID is required');
    return findFilesMetaWithContent(projectId);
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

  static async updateFileContent(fileId: string, data: Buffer): Promise<FileDTO | undefined> {
    if (!fileId) throw new Error('File ID is required');
    return updateFileContent(fileId, data);
  }

  /**
   * Updates the text content of a file (e.g. Markdown or extracted PDF text).
   */
  static async updateFileTextContent(fileId: string, content: string): Promise<FileDTO | undefined> {
    if (!fileId) throw new Error('File ID is required');
    return updateFileTextContent(fileId, content);
  }
}
