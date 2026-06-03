import { z } from 'zod';

export const WBSConfigSchema = z.object({
  techStack: z.object({
    languages: z.array(z.string()).default([]),
    frameworks: z.array(z.string()).default([]),
    databases: z.array(z.string()).default([]),
    cloud: z.array(z.string()).default([]),
  }),
  
  // Free-form team description (maximum 1000 characters)
  teamComposition: z.string()
    .max(1000, 'Team composition description must be under 1000 characters')
    .default(''),
    
  compliance: z.array(z.string()).default([]),
  integrations: z.array(z.string()).default([]),
  
  timeline: z.object({
    expectedDurationMonths: z.number().optional(),
    sprintLengthWeeks: z.number().optional(),
  }).default({}),
});

export type WBSConfigDTO = z.infer<typeof WBSConfigSchema> & {
  id: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SaveWBSConfigInputDTO = z.infer<typeof WBSConfigSchema>;
