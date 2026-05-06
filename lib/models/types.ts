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

export interface ProjectFile {
  /** MongoDB ObjectId as 24-char hex string */
  id: string;
  /** Reference to the owning project's id */
  project_id: string;
  /** Original filename as uploaded (e.g. "Figure1.png") */
  filename: string;
  /** MIME type derived from file extension */
  mime_type: AllowedMimeType;
  /** File size in bytes */
  size_bytes: number;
  /** Raw file content as a Buffer */
  data: Buffer;
  /** ISO-8601 timestamp of upload */
  uploaded_at: Date;
}

export interface UploadFileInput {
  project_id: string;
  filename: string;
  data: Buffer;
}
