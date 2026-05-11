import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
  createdAt: z.date(),
});
export type UserDTO = z.infer<typeof UserSchema>;

export const CreateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type CreateUserInputDTO = z.infer<typeof CreateUserInputSchema>;
