/**
 * In-memory Project File store.
 *
 * Mimics a MongoDB collection + GridFS-like storage for development and testing.
 * In production, replace with actual MongoDB GridFS or object storage (S3/GCS).
 *
 * Key design decisions:
 * - IDs follow MongoDB ObjectId 24-char hex format
 * - MIME types are derived from file extension (case-insensitive)
 * - Unsupported file extensions throw an error at upload time
 * - File data is stored as a Buffer (binary-safe)
 */
import path from 'path';
import type { ProjectFile, UploadFileInput, AllowedMimeType } from './types';
import { MIME_TYPE_MAP } from './types';

const files = new Map<string, ProjectFile>();

/**
 * Generate a 24-character hex string (MongoDB ObjectId format).
 */
let counterValue = 0;

function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0');

  const random = Array.from({ length: 10 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');

  counterValue++;
  const counter = counterValue.toString(16).padStart(6, '0');

  return `${timestamp}${random}${counter}`;
}

/**
 * Resolve the MIME type from a filename's extension.
 * Case-insensitive. Throws if the extension is not allowed.
 */
function resolveMimeType(filename: string): AllowedMimeType {
  const ext = path.extname(filename).toLowerCase();
  const mimeType = MIME_TYPE_MAP[ext];

  if (!mimeType) {
    const allowed = Object.keys(MIME_TYPE_MAP).join(', ');
    throw new Error(
      `Unsupported file type "${ext}" for file "${filename}". ` +
        `Allowed extensions: ${allowed}`
    );
  }

  return mimeType;
}

/**
 * Upload a file and associate it with a project.
 * MIME type is auto-detected from the filename extension.
 * Throws if the file extension is not in the allowed list.
 */
export function uploadFile(input: UploadFileInput): ProjectFile {
  const mimeType = resolveMimeType(input.filename);

  const file: ProjectFile = {
    id: generateObjectId(),
    project_id: input.project_id,
    filename: input.filename,
    mime_type: mimeType,
    size_bytes: input.data.length,
    data: input.data,
    uploaded_at: new Date(),
  };

  files.set(file.id, file);
  return file;
}

/**
 * Find a single file by its id.
 * @returns The file, or `undefined` if not found.
 */
export function findFileById(id: string): ProjectFile | undefined {
  return files.get(id);
}

/**
 * Find all files belonging to a given project.
 * @returns An array of files (empty if none found).
 */
export function findFilesByProjectId(projectId: string): ProjectFile[] {
  const result: ProjectFile[] = [];
  for (const file of files.values()) {
    if (file.project_id === projectId) {
      result.push(file);
    }
  }
  return result;
}

/**
 * Clear all files. Used in tests.
 */
export function clearFiles(): void {
  files.clear();
  counterValue = 0;
}
