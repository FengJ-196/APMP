import { z } from 'zod';

export const IssueTypeSchema = z.enum(['Contradiction', 'Ambiguity', 'Duplicate', 'MissingInfo']);
export const IssueStatusSchema = z.enum(['new', 'verified', 'rejected', 'resolved']);
export const IssueSeveritySchema = z.enum(['High', 'Medium', 'Low']);

export const IssueSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  sourceOfTruthId: z.string(),
  description: z.string(),
  type: IssueTypeSchema,
  status: IssueStatusSchema,
  severity: IssueSeveritySchema,
  suggestion: z.string().optional(),
  clarificationQuestion: z.string().optional(),
  userNote: z.string().optional(),
  sourceReferences: z.array(z.string()),
  resolvedBy: z.string().optional(),
  resolvedAt: z.date().optional(),
  createdAt: z.date(),
});
export type IssueDTO = z.infer<typeof IssueSchema>;

export const CreateIssueInputSchema = IssueSchema.omit({ 
  id: true, 
  createdAt: true, 
  resolvedBy: true, 
  resolvedAt: true,
  status: true 
}).extend({
  status: IssueStatusSchema.optional()
});
export type CreateIssueInputDTO = z.infer<typeof CreateIssueInputSchema>;
