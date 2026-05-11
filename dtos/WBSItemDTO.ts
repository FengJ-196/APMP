import { z } from 'zod';

export const WBSItemTypeSchema = z.enum(['epic', 'feature', 'story', 'task', 'subtask']);
export const WBSItemStatusSchema = z.enum(['ai_generated', 'reviewed', 'approved', 'rejected']);
export const MethodologySchema = z.enum(['scrum', 'kanban', 'waterfall']);

export const WBSItemSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  parentId: z.string().optional(),
  sourceOfTruthId: z.string().optional(),
  title: z.string().trim().min(1),
  description: z.string().optional(),
  type: WBSItemTypeSchema,
  status: WBSItemStatusSchema,
  methodology: MethodologySchema.optional(),
  acceptanceCriteria: z.array(z.string()),
  sourceRequirements: z.array(z.string()),
  order: z.number(),
  aiGenerated: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type WBSItemDTO = z.infer<typeof WBSItemSchema>;

export const CreateWBSItemInputSchema = WBSItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  aiGenerated: true,
  order: true,
}).extend({
  status: WBSItemStatusSchema.optional(),
  aiGenerated: z.boolean().optional(),
  order: z.number().optional(),
});
export type CreateWBSItemInputDTO = z.infer<typeof CreateWBSItemInputSchema>;
