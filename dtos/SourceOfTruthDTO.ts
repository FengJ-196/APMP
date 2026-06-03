import { z } from 'zod';

export const VersionSnapshotSchema = z.object({
  versionNumber: z.number(),
  content: z.string().optional(),
  savedAt: z.date(),
});

export const SourceOfTruthSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  content: z.string(),
  versionNumber: z.number(),
  versionHistory: z.array(VersionSnapshotSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type VersionSnapshotDTO = z.infer<typeof VersionSnapshotSchema>;
export type SourceOfTruthDTO = z.infer<typeof SourceOfTruthSchema>;
