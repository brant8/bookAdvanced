import { z } from 'zod';

export const projectVisibilitySchema = z.enum(['private', 'team']);
export const projectAiModeSchema = z.enum(['manual', 'suggest']);

export const projectSchema = z.object({
  id: z.uuid(),
  ownerId: z.uuid(),
  name: z.string(),
  description: z.string(),
  visibility: projectVisibilitySchema,
  aiMode: projectAiModeSchema,
  styleSamples: z.array(z.string()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const projectListSchema = z.array(projectSchema);

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(10_000).optional(),
  visibility: projectVisibilitySchema.optional(),
  aiMode: projectAiModeSchema.optional(),
  styleSamples: z.array(z.string().max(10_000)).max(3).optional(),
});

export const updateProjectSchema = createProjectSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one project field is required.',
  });

export const projectIdParamsSchema = z.object({
  id: z.uuid(),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    issues: z.array(z.string()).optional(),
  }),
});

export type Project = z.infer<typeof projectSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
