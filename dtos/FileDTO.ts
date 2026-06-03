import { z } from 'zod';

export const AllowedMimeTypeSchema = z.enum([
  'image/png',
  'image/jpeg',
  'text/markdown',
  'text/plain',
  'application/pdf',
]);
export type AllowedMimeType = z.infer<typeof AllowedMimeTypeSchema>;

export const MIME_TYPE_MAP: Record<string, AllowedMimeType> = {
  '.png': 'image/png',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
};

export const ALLOWED_EXTENSIONS = Object.keys(MIME_TYPE_MAP);

export const FileSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  originalName: z.string(),
  contentType: AllowedMimeTypeSchema,
  fileData: z.union([z.custom<Buffer>(), z.string()]).optional(), // string if base64 over network
  content: z.string().optional(), 
  createdAt: z.date(),
});
export type FileDTO = z.infer<typeof FileSchema>;

export const UploadFileInputSchema = z.object({
  projectId: z.string(),
  userId: z.string(),
  originalName: z.string(),
  contentType: AllowedMimeTypeSchema,
  fileData: z.custom<Buffer>(),
  content: z.string().optional(), 
});
export type UploadFileInputDTO = z.infer<typeof UploadFileInputSchema>;
