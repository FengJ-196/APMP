import { z } from 'zod';

export const ProjectStatusSchema = z.enum(['active', 'archived', 'completed']);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1, 'Title is required'),
  userId: z.string(),
  status: ProjectStatusSchema,
  createdAt: z.date(),
});
export type ProjectDTO = z.infer<typeof ProjectSchema>;

export const CreateProjectInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  userId: z.string(),
  status: ProjectStatusSchema.optional(),
});
export type CreateProjectInputDTO = z.infer<typeof CreateProjectInputSchema>;
