import { z } from 'zod';

export const UserIntegrationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  platform: z.enum(['github', 'jira']),
  encryptedAccessToken: z.string(),
  encryptedRefreshToken: z.string().optional(),
  expiresAt: z.date().optional(),
  cloudId: z.string().optional(),
  domain: z.string().optional(),
  email: z.string().optional(),
  authType: z.enum(['oauth', 'basic']).default('oauth'),
  createdAt: z.date(),
});

export type UserIntegrationDTO = z.infer<typeof UserIntegrationSchema>;
