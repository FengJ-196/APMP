/**
 * Local disk storage client for temporary document files (PDF, MD).
 *
 * Files are stored under: <project-root>/tmp/uploads/<project_id>/<filename>
 * These are temporary — the cleanup worker deletes them after 24 hours.
 *
 * In production, consider using a managed object store (S3, GCS)
 * for better reliability and scalability.
 */
import fs from 'fs';
import path from 'path';

/** Base directory for all temporary uploads */
const UPLOAD_ROOT = path.resolve(process.cwd(), 'tmp', 'uploads');

/**
 * Write a buffer to local disk.
 * Creates parent directories as needed.
 * @returns The absolute path to the written file.
 */
export async function saveToLocalStorage(
  buffer: Buffer,
  filename: string,
  projectId: string
): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, projectId);
  fs.mkdirSync(dir, { recursive: true });

  // Sanitize filename to avoid path traversal
  const safeName = path.basename(filename);
  const filePath = path.join(dir, safeName);

  fs.writeFileSync(filePath, buffer);
  return filePath;
}

/**
 * Read a file from local storage.
 * @returns The file contents as a Buffer.
 * @throws If the file does not exist.
 */
export function readFromLocalStorage(filePath: string): Buffer {
  return fs.readFileSync(filePath);
}

/**
 * Delete a file from local disk.
 * Also removes the parent directory if it becomes empty.
 */
export async function deleteFromLocalStorage(filePath: string): Promise<void> {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);

    // Clean up empty parent directory
    const dir = path.dirname(filePath);
    try {
      const remaining = fs.readdirSync(dir);
      if (remaining.length === 0) {
        fs.rmdirSync(dir);
      }
    } catch {
      // Directory may already be gone — that's fine
    }
  }
}

/**
 * Get the base upload directory. Used in tests.
 */
export function getUploadRoot(): string {
  return UPLOAD_ROOT;
}
