import { z } from 'zod';

export const authModeSchema = z.enum(['local', 'account']);
export const authUserSchema = z.object({
  id: z.uuid(),
  email: z.string().email().nullable(),
  displayName: z.string(),
  role: z.literal('owner'),
});
export const authStatusSchema = z.object({
  mode: authModeSchema,
  registrationRequired: z.boolean(),
  authenticated: z.boolean(),
  user: authUserSchema.nullable(),
});
export const registerSchema = z.object({
  email: z.string().email(),
  displayName: z.string().trim().min(1).max(80),
  password: z.string().min(10).max(200),
});
export const loginSchema = registerSchema.pick({ email: true, password: true });

export type AuthStatus = z.infer<typeof authStatusSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
