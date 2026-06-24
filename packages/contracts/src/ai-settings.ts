import { z } from 'zod';

const id = z.uuid();
export const aiProviderKindSchema = z.enum(['text', 'image']);
export const aiProviderSchema = z.object({
  id,
  name: z.string(),
  kind: aiProviderKindSchema,
  protocol: z.string(),
  baseUrl: z.string().url(),
  defaultModel: z.string(),
  models: z.array(z.string()),
  hasApiKey: z.boolean(),
  enabled: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const saveAiProviderSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kind: aiProviderKindSchema,
  protocol: z.string().trim().min(1).max(80),
  baseUrl: z.string().url(),
  defaultModel: z.string().trim().min(1).max(160),
  models: z.array(z.string().trim().min(1).max(160)).max(50).default([]),
  apiKey: z.string().max(2000).optional(),
  enabled: z.boolean().default(true),
});
export const updateAiProviderSchema = saveAiProviderSchema.partial();
export const generationStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'approved',
  'rejected',
  'failed',
]);
export const generationRunSchema = z.object({
  id,
  projectId: id.nullable(),
  providerId: id.nullable(),
  taskType: z.string(),
  status: generationStatusSchema,
  input: z.record(z.string(), z.unknown()),
  output: z.record(z.string(), z.unknown()).nullable(),
  error: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type AiProvider = z.infer<typeof aiProviderSchema>;
export type SaveAiProviderInput = z.infer<typeof saveAiProviderSchema>;
export type UpdateAiProviderInput = z.infer<typeof updateAiProviderSchema>;
export type GenerationRun = z.infer<typeof generationRunSchema>;
