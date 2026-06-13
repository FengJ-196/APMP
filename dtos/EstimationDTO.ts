import { z } from 'zod';

export const StoryPointSchema = z.object({
  id: z.string(),
  wbsItemId: z.string(),
  projectId: z.string(),
  ragReferences: z.array(
    z.object({
      similarProjectId: z.string().optional(),
      similarItemTitle: z.string().optional(),
      similarItemPoints: z.number().optional(),
      similarityScore: z.number().min(0).max(1).optional(),
    })
  ),
  aiSuggestedPoints: z.number().optional(),
  finalPoints: z.number().optional(),
  rationale: z.string().optional(),
  confidence: z.number().min(0).max(1),
  decidedBy: z.string().optional(),
  createdAt: z.date(),
});
export type StoryPointDTO = z.infer<typeof StoryPointSchema>;

export const ExternalSyncStatusSchema = z.enum(['pending', 'synced', 'failed', 'conflict']);
export const ExternalPlatformSchema = z.enum(['jira', 'github']);

export const ExternalSyncSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  wbsItemId: z.string(),
  platform: ExternalPlatformSchema,
  externalId: z.string(),
  externalUrl: z.string().optional(),
  syncStatus: ExternalSyncStatusSchema,
  errorMessage: z.string().optional(),
  lastSyncedAt: z.date().optional(),
  createdAt: z.date(),
});
export type ExternalSyncDTO = z.infer<typeof ExternalSyncSchema>;
