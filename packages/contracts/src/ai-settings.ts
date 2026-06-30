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
const providerModelsSchema = z.array(z.string().trim().min(1).max(160)).max(50);
const aiProviderInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kind: aiProviderKindSchema,
  protocol: z.string().trim().min(1).max(80),
  baseUrl: z.string().url(),
  defaultModel: z.string().trim().min(1).max(160),
  models: providerModelsSchema,
  apiKey: z.string().max(2000).optional(),
  enabled: z.boolean(),
});
export const saveAiProviderSchema = aiProviderInputSchema.extend({
  models: providerModelsSchema.default([]),
  enabled: z.boolean().default(true),
});
export const updateAiProviderSchema = aiProviderInputSchema.partial();
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
export const aiProviderTestSchema = z.object({
  id,
  checkedAt: z.iso.datetime(),
  latencyMs: z.number().int().min(0).nullable(),
  message: z.string(),
  ok: z.boolean(),
  risk: z.enum(['free', 'low', 'paid', 'disabled', 'unknown']),
});
export const aiUsageSummarySchema = z.object({
  generatedAt: z.iso.datetime(),
  totalRuns: z.number().int().min(0),
  statusCounts: z.record(z.string(), z.number().int().min(0)),
  taskCounts: z.record(z.string(), z.number().int().min(0)),
  successRate: z.number().min(0).max(1),
  runningCount: z.number().int().min(0),
  failedCount: z.number().int().min(0),
  recentFailures: z.array(
    z.object({
      id,
      taskType: z.string(),
      error: z.string(),
      createdAt: z.iso.datetime(),
    }),
  ),
  providerRisks: z.array(
    z.object({
      id,
      name: z.string(),
      kind: aiProviderKindSchema,
      enabled: z.boolean(),
      defaultModel: z.string(),
      risk: z.enum(['free', 'low', 'paid', 'disabled', 'unknown']),
      note: z.string(),
    }),
  ),
});

export type AiProvider = z.infer<typeof aiProviderSchema>;
export type SaveAiProviderInput = z.infer<typeof saveAiProviderSchema>;
export type UpdateAiProviderInput = z.infer<typeof updateAiProviderSchema>;
export type GenerationRun = z.infer<typeof generationRunSchema>;
export type AiProviderTest = z.infer<typeof aiProviderTestSchema>;
export type AiUsageSummary = z.infer<typeof aiUsageSummarySchema>;
