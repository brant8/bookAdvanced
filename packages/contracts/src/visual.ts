import { z } from 'zod';

const id = z.uuid();
const timestamps = { createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() };

export const sceneSchema = z.object({
  id,
  projectId: id,
  storyNodeId: id,
  location: z.string(),
  timeOfDay: z.string(),
  weather: z.string(),
  atmosphere: z.string(),
  visualPrompt: z.string(),
  ...timestamps,
});
export const upsertSceneSchema = z.object({
  location: z.string().max(500).optional(),
  timeOfDay: z.string().max(200).optional(),
  weather: z.string().max(200).optional(),
  atmosphere: z.string().max(2000).optional(),
  visualPrompt: z.string().max(20_000).optional(),
});
export const characterAbilitySchema = z.object({
  id,
  projectId: id,
  characterId: id,
  name: z.string(),
  description: z.string(),
  level: z.number().int(),
  ...timestamps,
});
export const createCharacterAbilitySchema = z.object({
  characterId: id,
  name: z.string().trim().min(1).max(120),
  description: z.string().max(5000).optional(),
  level: z.number().int().min(1).max(100).optional(),
});
export const assetKindSchema = z.enum(['character', 'scene', 'background', 'prop', 'reference']);
export const assetSchema = z.object({
  id,
  projectId: id,
  kind: assetKindSchema,
  source: z.enum(['upload', 'generated']),
  name: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  url: z.string(),
  prompt: z.string(),
  characterId: id.nullable(),
  storyNodeId: id.nullable(),
  abilityId: id.nullable(),
  ...timestamps,
});
export const generateImageSchema = z.object({
  providerId: id,
  name: z.string().trim().min(1).max(160),
  prompt: z.string().trim().min(1).max(20_000),
  kind: assetKindSchema,
  characterId: id.nullable().optional(),
  storyNodeId: id.nullable().optional(),
  abilityId: id.nullable().optional(),
  size: z.string().default('1024x1024'),
});
export const storyboardShotSchema = z.object({
  id,
  storyboardId: id,
  storyNodeId: id.nullable(),
  assetId: id.nullable(),
  sortOrder: z.number().int(),
  title: z.string(),
  narration: z.string(),
  visualPrompt: z.string(),
  durationMs: z.number().int(),
  transition: z.string(),
  ...timestamps,
});
export const storyboardSchema = z.object({
  id,
  projectId: id,
  title: z.string(),
  status: z.enum(['draft', 'ready']),
  shots: z.array(storyboardShotSchema),
  ...timestamps,
});
export const generateStoryboardSchema = z.object({
  providerId: id.optional(),
});
export const storyboardExportPlanSchema = z.object({
  projectId: id,
  storyboardId: id,
  generatedAt: z.iso.datetime(),
  totalDurationMs: z.number().int().min(0),
  frameRate: z.number().int().min(1),
  estimatedFrameCount: z.number().int().min(0),
  missingAssetCount: z.number().int().min(0),
  browserPreview: z.object({
    available: z.boolean(),
    output: z.string(),
    notes: z.array(z.string()),
  }),
  nasWorker: z.object({
    required: z.boolean(),
    queueName: z.string(),
    suggestedMounts: z.array(z.string()),
    steps: z.array(z.string()),
  }),
  videoExport: z.object({
    status: z.enum(['planned', 'blocked', 'ready']),
    container: z.string(),
    codec: z.string(),
    resolution: z.string(),
    fps: z.number().int().min(1),
    boundaries: z.array(z.string()),
  }),
  audioMix: z.object({
    status: z.enum(['planned', 'blocked', 'ready']),
    tracks: z.array(z.string()),
    boundaries: z.array(z.string()),
  }),
  shots: z.array(
    z.object({
      shotId: id,
      sortOrder: z.number().int(),
      title: z.string(),
      durationMs: z.number().int(),
      storyNodeId: id.nullable(),
      assetId: id.nullable(),
      hasVisualAsset: z.boolean(),
      visualPrompt: z.string(),
      narration: z.string(),
      estimatedFrameCount: z.number().int().min(0),
    }),
  ),
});

export type Scene = z.infer<typeof sceneSchema>;
export type UpsertSceneInput = z.infer<typeof upsertSceneSchema>;
export type CharacterAbility = z.infer<typeof characterAbilitySchema>;
export type CreateCharacterAbilityInput = z.infer<typeof createCharacterAbilitySchema>;
export type Asset = z.infer<typeof assetSchema>;
export type GenerateImageInput = z.infer<typeof generateImageSchema>;
export type Storyboard = z.infer<typeof storyboardSchema>;
export type StoryboardExportPlan = z.infer<typeof storyboardExportPlanSchema>;
