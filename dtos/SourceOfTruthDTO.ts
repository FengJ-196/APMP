import { z } from 'zod';

export const SectionBlockTypeSchema = z.enum(['heading', 'text', 'table', 'diagram']);
export const DiagramTypeSchema = z.enum(['flowchart', 'sequence', 'er', 'usecase', 'other']);

export const SectionBlockSchema = z.object({
  blockId: z.string(),
  order: z.number(),
  type: SectionBlockTypeSchema,
  markdown: z.string().optional(),
  diagram: z.object({
    mermaidCode: z.string(),
    diagramType: DiagramTypeSchema,
    confidence: z.number().min(0).max(1),
  }).optional(),
  userVerified: z.boolean().optional(),
  userEditedAt: z.date().optional(),
  originalAiContent: z.string().optional(),
});

export const SourceOfTruthStatusSchema = z.enum(['draft', 'under_review', 'approved']);

export const SourceOfTruthSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  fileId: z.string(),
  versionNumber: z.number(),
  blocks: z.array(SectionBlockSchema),
  compiledMarkdown: z.string().optional(),
  status: SourceOfTruthStatusSchema,
  approvedBy: z.string().optional(),
  approvedAt: z.date().optional(),
  changesSummary: z.string().optional(),
  backup: z.object({
    versionNumber: z.number(),
    blocks: z.array(z.any()),
    compiledMarkdown: z.string(),
    changesSummary: z.string(),
    savedAt: z.date(),
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type SourceOfTruthDTO = z.infer<typeof SourceOfTruthSchema>;
