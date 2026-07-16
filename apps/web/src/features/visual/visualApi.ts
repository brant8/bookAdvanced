import {
  assetSchema,
  characterAbilitySchema,
  sceneSchema,
  storyboardSchema,
  storyboardExportPlanSchema,
  storyboardWorkerDryRunManifestSchema,
  storyboardWorkerQueueSchema,
  ttsDubbingPlanSchema,
  ttsProviderReservationSchema,
  type CreateCharacterAbilityInput,
  type GenerateImageInput,
  type UpsertSceneInput,
} from '@storyverse/contracts';

import { apiRequest } from '../../lib/api';

const list = <T>(schema: { parse(value: unknown): T }, value: unknown) =>
  (value as unknown[]).map((item) => schema.parse(item));

export const visualApi = {
  getScene: async (nodeId: string) => {
    const value = await apiRequest(`/story-nodes/${nodeId}/scene`);
    return value === null ? null : sceneSchema.parse(value);
  },
  saveScene: async (nodeId: string, input: UpsertSceneInput) =>
    sceneSchema.parse(
      await apiRequest(`/story-nodes/${nodeId}/scene`, {
        body: JSON.stringify(input),
        method: 'PUT',
      }),
    ),
  listAbilities: async (projectId: string) =>
    list(characterAbilitySchema, await apiRequest(`/projects/${projectId}/abilities`)),
  createAbility: async (projectId: string, input: CreateCharacterAbilityInput) =>
    characterAbilitySchema.parse(
      await apiRequest(`/projects/${projectId}/abilities`, {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    ),
  listAssets: async (projectId: string) =>
    list(assetSchema, await apiRequest(`/projects/${projectId}/assets`)),
  uploadAsset: async (
    projectId: string,
    file: File,
    name: string,
    kind: string,
    links?: { abilityId?: string; characterId?: string; storyNodeId?: string },
  ) => {
    const form = new FormData();
    form.set('file', file);
    form.set('name', name);
    form.set('kind', kind);
    if (links?.abilityId) form.set('abilityId', links.abilityId);
    if (links?.characterId) form.set('characterId', links.characterId);
    if (links?.storyNodeId) form.set('storyNodeId', links.storyNodeId);
    return assetSchema.parse(
      await apiRequest(`/projects/${projectId}/assets/upload`, { body: form, method: 'POST' }),
    );
  },
  generateImage: async (projectId: string, input: GenerateImageInput) =>
    assetSchema.parse(
      await apiRequest(`/projects/${projectId}/assets/generate`, {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    ),
  deleteAsset: (id: string) => apiRequest(`/assets/${id}`, { method: 'DELETE' }),
  getStoryboard: async (projectId: string) => {
    const value = await apiRequest(`/projects/${projectId}/storyboard`);
    return value === null ? null : storyboardSchema.parse(value);
  },
  getStoryboardExportPlan: async (projectId: string) => {
    const value = await apiRequest(`/projects/${projectId}/storyboard/export-plan`);
    return value === null ? null : storyboardExportPlanSchema.parse(value);
  },
  getTtsDubbingPlan: async (projectId: string) =>
    ttsDubbingPlanSchema.parse(await apiRequest(`/projects/${projectId}/storyboard/tts-plan`)),
  getTtsProviderReservation: async (projectId: string) =>
    ttsProviderReservationSchema.parse(
      await apiRequest(`/projects/${projectId}/storyboard/tts-provider-reservation`),
    ),
  getStoryboardWorkerQueue: async (projectId: string) =>
    storyboardWorkerQueueSchema.parse(
      await apiRequest(`/projects/${projectId}/storyboard/worker-queue`),
    ),
  dryRunStoryboardWorker: async (projectId: string) =>
    storyboardWorkerDryRunManifestSchema.parse(
      await apiRequest(`/projects/${projectId}/storyboard/worker-queue/dry-run`, {
        method: 'POST',
      }),
    ),
  generateStoryboard: async (projectId: string, providerId?: string) =>
    storyboardSchema.parse(
      await apiRequest(`/projects/${projectId}/storyboard/generate`, {
        body: JSON.stringify({ providerId }),
        method: 'POST',
      }),
    ),
};
