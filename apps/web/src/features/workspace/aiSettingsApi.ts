import {
  aiProviderTestSchema,
  aiProviderSchema,
  aiUsageSummarySchema,
  generationRunSchema,
  type AiProviderTest,
  type SaveAiProviderInput,
} from '@storyverse/contracts';

import { apiRequest } from '../../lib/api';

const list = <T>(schema: { parse(value: unknown): T }, value: unknown) =>
  (value as unknown[]).map((item) => schema.parse(item));

export const aiSettingsApi = {
  listProviders: async () => list(aiProviderSchema, await apiRequest('/ai/providers')),
  usageSummary: async (projectId: string) =>
    aiUsageSummarySchema.parse(
      await apiRequest(`/ai/usage-summary?projectId=${encodeURIComponent(projectId)}`),
    ),
  testProvider: async (id: string) =>
    aiProviderTestSchema.parse(await apiRequest(`/ai/providers/${id}/test`, { method: 'POST' })),
  createProvider: async (input: SaveAiProviderInput) =>
    aiProviderSchema.parse(
      await apiRequest('/ai/providers', { body: JSON.stringify(input), method: 'POST' }),
    ),
  deleteProvider: (id: string) => apiRequest(`/ai/providers/${id}`, { method: 'DELETE' }),
  listRuns: async (projectId: string) =>
    list(
      generationRunSchema,
      await apiRequest(`/ai/generation-runs?projectId=${encodeURIComponent(projectId)}`),
    ),
};

export type ProviderTestMap = Record<string, AiProviderTest>;
