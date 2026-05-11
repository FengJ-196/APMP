/**
 * Core domain model types for the APMP platform.
 *
 * Designed with MongoDB conventions:
 * - `id` maps to MongoDB `_id` (ObjectId as hex string)
 * - Dates stored as ISO strings (MongoDB ISODate)
 * - `user_id` is a string reference to users collection
 */

export type ProjectStatus = 'active' | 'archived' | 'completed';

export interface Project {
  /** MongoDB ObjectId as 24-char hex string */
  id: string;
  /** Display title of the project */
  title: string;
  /** Reference to the owning user's id */
  user_id: string;
  /** Current project lifecycle status */
  status: ProjectStatus;
  /** ISO-8601 timestamp of creation */
  created_at: Date;
}

export interface CreateProjectInput {
  title: string;
  user_id: string;
  status?: ProjectStatus;
}

// ─── Project File Model ───────────────────────────────

/** Allowed MIME types for project file uploads */
export type AllowedMimeType =
  | 'image/png'
  | 'image/jpeg'
  | 'text/markdown'
  | 'application/pdf';

/** File extension to MIME type mapping */
export const MIME_TYPE_MAP: Record<string, AllowedMimeType> = {
  '.png': 'image/png',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.md': 'text/markdown',
  '.pdf': 'application/pdf',
};

/** All allowed file extensions */
export const ALLOWED_EXTENSIONS = Object.keys(MIME_TYPE_MAP);

/** Where the file is physically stored */
export type StorageType = 'cloudinary' | 'local';

export interface ProjectFile {
  /** MongoDB ObjectId as 24-char hex string */
  id: string;
  /** Reference to the owning project's id */
  projectId: string;
  /** Reference to the owning user's id */
  userId: string;
  /** Original filename as uploaded (e.g. "Figure1.png") */
  originalName: string;
  /** MIME type derived from file extension */
  contentType: AllowedMimeType;
  /** The actual binary data stored in MongoDB */
  fileData: Buffer | string; // Buffer in Node, base64 string in JSON
  /** ISO-8601 timestamp of upload */
  createdAt: Date;
}

export interface UploadFileInput {
  projectId: string;
  userId: string;
  originalName: string;
  contentType: AllowedMimeType;
  fileData: Buffer;
}
