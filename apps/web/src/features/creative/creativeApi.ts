import {
  characterRelationSchema,
  characterSchema,
  loreEntrySchema,
  storylineMilestoneSchema,
  storylineSchema,
  storyBibleSchema,
  storyNodeSchema,
  storyNodeEdgeSchema,
  worldRuleSchema,
  type CreateCharacterInput,
  type CreateCharacterRelationInput,
  type CreateLoreEntryInput,
  type CreateStorylineInput,
  type CreateStorylineMilestoneInput,
  type CreateStoryNodeInput,
  type CreateStoryNodeEdgeInput,
  type CreateWorldRuleInput,
  type UpdateCharacterInput,
  type UpdateStoryNodeInput,
  type UpsertStoryBibleInput,
} from '@storyverse/contracts';

import { apiRequest } from '../../lib/api';

const list = <T>(schema: { parse(value: unknown): T }) => ({
  parse(value: unknown[]) {
    return value.map((item) => schema.parse(item));
  },
});

export const creativeApi = {
  getBible: async (projectId: string) => {
    const value = await apiRequest(`/projects/${projectId}/bible`);
    return value === null ? null : storyBibleSchema.parse(value);
  },
  saveBible: async (projectId: string, input: UpsertStoryBibleInput) =>
    storyBibleSchema.parse(
      await apiRequest(`/projects/${projectId}/bible`, {
        body: JSON.stringify(input),
        method: 'PUT',
      }),
    ),
  listWorldRules: async (projectId: string) =>
    list(worldRuleSchema).parse(
      (await apiRequest(`/projects/${projectId}/world-rules`)) as unknown[],
    ),
  createWorldRule: async (projectId: string, input: CreateWorldRuleInput) =>
    worldRuleSchema.parse(
      await apiRequest(`/projects/${projectId}/world-rules`, {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    ),
  deleteWorldRule: (id: string) => apiRequest(`/world-rules/${id}`, { method: 'DELETE' }),
  listLore: async (projectId: string) =>
    list(loreEntrySchema).parse((await apiRequest(`/projects/${projectId}/lore`)) as unknown[]),
  createLore: async (projectId: string, input: CreateLoreEntryInput) =>
    loreEntrySchema.parse(
      await apiRequest(`/projects/${projectId}/lore`, {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    ),
  deleteLore: (id: string) => apiRequest(`/lore/${id}`, { method: 'DELETE' }),
  listCharacters: async (projectId: string) =>
    list(characterSchema).parse(
      (await apiRequest(`/projects/${projectId}/characters`)) as unknown[],
    ),
  createCharacter: async (projectId: string, input: CreateCharacterInput) =>
    characterSchema.parse(
      await apiRequest(`/projects/${projectId}/characters`, {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    ),
  updateCharacter: async (id: string, input: UpdateCharacterInput) =>
    characterSchema.parse(
      await apiRequest(`/characters/${id}`, {
        body: JSON.stringify(input),
        method: 'PATCH',
      }),
    ),
  deleteCharacter: (id: string) => apiRequest(`/characters/${id}`, { method: 'DELETE' }),
  listRelations: async (projectId: string) =>
    list(characterRelationSchema).parse(
      (await apiRequest(`/projects/${projectId}/character-relations`)) as unknown[],
    ),
  createRelation: async (projectId: string, input: CreateCharacterRelationInput) =>
    characterRelationSchema.parse(
      await apiRequest(`/projects/${projectId}/character-relations`, {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    ),
  deleteRelation: (id: string) => apiRequest(`/character-relations/${id}`, { method: 'DELETE' }),
  listStorylines: async (projectId: string) =>
    list(storylineSchema).parse(
      (await apiRequest(`/projects/${projectId}/storylines`)) as unknown[],
    ),
  createStoryline: async (projectId: string, input: CreateStorylineInput) =>
    storylineSchema.parse(
      await apiRequest(`/projects/${projectId}/storylines`, {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    ),
  deleteStoryline: (id: string) => apiRequest(`/storylines/${id}`, { method: 'DELETE' }),
  listMilestones: async (storylineId: string) =>
    list(storylineMilestoneSchema).parse(
      (await apiRequest(`/storylines/${storylineId}/milestones`)) as unknown[],
    ),
  createMilestone: async (storylineId: string, input: CreateStorylineMilestoneInput) =>
    storylineMilestoneSchema.parse(
      await apiRequest(`/storylines/${storylineId}/milestones`, {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    ),
  listNodes: async (projectId: string) =>
    list(storyNodeSchema).parse(
      (await apiRequest(`/projects/${projectId}/story-nodes`)) as unknown[],
    ),
  createNode: async (projectId: string, input: CreateStoryNodeInput) =>
    storyNodeSchema.parse(
      await apiRequest(`/projects/${projectId}/story-nodes`, {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    ),
  updateNode: async (id: string, input: UpdateStoryNodeInput) =>
    storyNodeSchema.parse(
      await apiRequest(`/story-nodes/${id}`, {
        body: JSON.stringify(input),
        method: 'PATCH',
      }),
    ),
  deleteNode: (id: string) => apiRequest(`/story-nodes/${id}`, { method: 'DELETE' }),
  listEdges: async (projectId: string) =>
    list(storyNodeEdgeSchema).parse(
      (await apiRequest(`/projects/${projectId}/story-node-edges`)) as unknown[],
    ),
  createEdge: async (projectId: string, input: CreateStoryNodeEdgeInput) =>
    storyNodeEdgeSchema.parse(
      await apiRequest(`/projects/${projectId}/story-node-edges`, {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    ),
  deleteEdge: (id: string) => apiRequest(`/story-node-edges/${id}`, { method: 'DELETE' }),
};
