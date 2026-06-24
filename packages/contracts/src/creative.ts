import { z } from 'zod';

const id = z.uuid();
const timestamps = {
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
};
const nonBlank = z.string().trim().min(1);
const optionalText = z.string().max(100_000).optional();
const tags = z.array(z.string().trim().min(1).max(80)).max(30);

export const resourceIdParamsSchema = z.object({ id });
export const projectResourceParamsSchema = z.object({ projectId: id });

export const storyBibleSchema = z.object({
  id,
  projectId: id,
  worldRules: z.string(),
  writingStyle: z.string(),
  prohibitedContent: z.string(),
  characterRules: z.string(),
  plotGoals: z.string(),
  endingDirection: z.string(),
  compressedSummary: z.string(),
  compressedHash: z.string(),
  ...timestamps,
});
export const upsertStoryBibleSchema = z.object({
  worldRules: optionalText,
  writingStyle: optionalText,
  prohibitedContent: optionalText,
  characterRules: optionalText,
  plotGoals: optionalText,
  endingDirection: optionalText,
  compressedSummary: optionalText,
  compressedHash: z.string().max(256).optional(),
});

export const worldRuleCategorySchema = z.enum(['ability', 'geography', 'society', 'time']);
export const worldRuleSchema = z.object({
  id,
  projectId: id,
  condition: z.string(),
  result: z.string(),
  category: worldRuleCategorySchema,
  priority: z.number().int().min(1).max(100),
  enabled: z.boolean(),
  ...timestamps,
});
export const createWorldRuleSchema = z.object({
  condition: nonBlank.max(10_000),
  result: nonBlank.max(10_000),
  category: worldRuleCategorySchema,
  priority: z.number().int().min(1).max(100).optional(),
  enabled: z.boolean().optional(),
});
export const updateWorldRuleSchema = createWorldRuleSchema.partial();

export const loreCategorySchema = z.enum(['faction', 'ability', 'history', 'glossary', 'custom']);
export const loreEntrySchema = z.object({
  id,
  projectId: id,
  category: loreCategorySchema,
  name: z.string(),
  description: z.string(),
  detail: z.string(),
  tags,
  injectToAi: z.boolean(),
  ...timestamps,
});
export const createLoreEntrySchema = z.object({
  category: loreCategorySchema.optional(),
  name: nonBlank.max(120),
  description: z.string().max(10_000).optional(),
  detail: optionalText,
  tags: tags.optional(),
  injectToAi: z.boolean().optional(),
});
export const updateLoreEntrySchema = createLoreEntrySchema.partial();

export const characterSchema = z.object({
  id,
  projectId: id,
  name: z.string(),
  aliases: tags,
  bio: z.string(),
  bioCompressed: z.string(),
  appearance: z.string(),
  personality: z.string(),
  voiceSamples: z.array(z.string()),
  ...timestamps,
});
export const createCharacterSchema = z.object({
  name: nonBlank.max(120),
  aliases: tags.optional(),
  bio: optionalText,
  bioCompressed: optionalText,
  appearance: optionalText,
  personality: optionalText,
  voiceSamples: z.array(z.string().max(10_000)).max(10).optional(),
});
export const updateCharacterSchema = createCharacterSchema.partial();

export const characterRelationSchema = z.object({
  id,
  projectId: id,
  sourceCharacterId: id,
  targetCharacterId: id,
  relationType: z.string(),
  description: z.string(),
  strength: z.number().int().min(1).max(5),
  ...timestamps,
});
export const createCharacterRelationSchema = z.object({
  sourceCharacterId: id,
  targetCharacterId: id,
  relationType: nonBlank.max(80),
  description: z.string().max(10_000).optional(),
  strength: z.number().int().min(1).max(5).optional(),
});
export const updateCharacterRelationSchema = createCharacterRelationSchema
  .omit({ sourceCharacterId: true, targetCharacterId: true })
  .partial();

export const storylineTypeSchema = z.enum(['main', 'sub']);
export const storylinePacingSchema = z.enum(['slow', 'standard', 'fast', 'custom']);
export const storylineSchema = z.object({
  id,
  projectId: id,
  title: z.string(),
  description: z.string(),
  type: storylineTypeSchema,
  color: z.string(),
  endingGoal: z.string(),
  pacing: storylinePacingSchema,
  generationConstraints: z.array(z.string()),
  ...timestamps,
});
export const createStorylineSchema = z.object({
  title: nonBlank.max(160),
  description: z.string().max(20_000).optional(),
  type: storylineTypeSchema.optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  endingGoal: z.string().max(20_000).optional(),
  pacing: storylinePacingSchema.optional(),
  generationConstraints: z.array(z.string().max(10_000)).max(30).optional(),
});
export const updateStorylineSchema = createStorylineSchema.partial();

export const milestoneStatusSchema = z.enum(['planned', 'active', 'completed']);
export const storylineMilestoneSchema = z.object({
  id,
  storylineId: id,
  title: z.string(),
  description: z.string(),
  sortOrder: z.number().int().min(0),
  status: milestoneStatusSchema,
  progress: z.number().int().min(0).max(100),
  ...timestamps,
});
export const createStorylineMilestoneSchema = z.object({
  title: nonBlank.max(160),
  description: z.string().max(20_000).optional(),
  sortOrder: z.number().int().min(0),
  status: milestoneStatusSchema.optional(),
  progress: z.number().int().min(0).max(100).optional(),
});
export const updateStorylineMilestoneSchema = createStorylineMilestoneSchema.partial();

export const storyNodeStatusSchema = z.enum(['planned', 'drafting', 'completed']);
export const storyNodeSchema = z.object({
  id,
  projectId: id,
  storylineId: id.nullable(),
  milestoneId: id.nullable(),
  title: z.string(),
  summary: z.string(),
  description: z.string(),
  nodeGoal: z.string(),
  conflict: z.string(),
  requiredEvents: z.array(z.string()),
  sortOrder: z.number().int().min(0),
  status: storyNodeStatusSchema,
  storyTimeLabel: z.string(),
  canvasX: z.number(),
  canvasY: z.number(),
  isKeyScene: z.boolean(),
  characterIds: z.array(id),
  loreEntryIds: z.array(id),
  ...timestamps,
});
export const createStoryNodeSchema = z.object({
  storylineId: id.nullable().optional(),
  milestoneId: id.nullable().optional(),
  title: nonBlank.max(160),
  summary: z.string().max(20_000).optional(),
  description: optionalText,
  nodeGoal: z.string().max(20_000).optional(),
  conflict: z.string().max(20_000).optional(),
  requiredEvents: z.array(z.string().max(10_000)).max(30).optional(),
  sortOrder: z.number().int().min(0),
  status: storyNodeStatusSchema.optional(),
  storyTimeLabel: z.string().max(160).optional(),
  canvasX: z.number().finite().optional(),
  canvasY: z.number().finite().optional(),
  isKeyScene: z.boolean().optional(),
  characterIds: z.array(id).max(100).optional(),
  loreEntryIds: z.array(id).max(100).optional(),
});
export const updateStoryNodeSchema = createStoryNodeSchema.partial();

export const storyEdgeTypeSchema = z.enum([
  'flow',
  'branch',
  'parallel',
  'causal',
  'foreshadow',
  'reveal',
]);
export const storyNodeEdgeSchema = z.object({
  id,
  projectId: id,
  sourceNodeId: id,
  targetNodeId: id,
  type: storyEdgeTypeSchema,
  label: z.string(),
  condition: z.string(),
  ...timestamps,
});
export const createStoryNodeEdgeSchema = z.object({
  sourceNodeId: id,
  targetNodeId: id,
  type: storyEdgeTypeSchema.optional(),
  label: z.string().max(160).optional(),
  condition: z.string().max(10_000).optional(),
});
export const updateStoryNodeEdgeSchema = createStoryNodeEdgeSchema
  .omit({ sourceNodeId: true, targetNodeId: true })
  .partial();

export type StoryBible = z.infer<typeof storyBibleSchema>;
export type UpsertStoryBibleInput = z.infer<typeof upsertStoryBibleSchema>;
export type WorldRule = z.infer<typeof worldRuleSchema>;
export type CreateWorldRuleInput = z.infer<typeof createWorldRuleSchema>;
export type UpdateWorldRuleInput = z.infer<typeof updateWorldRuleSchema>;
export type LoreEntry = z.infer<typeof loreEntrySchema>;
export type CreateLoreEntryInput = z.infer<typeof createLoreEntrySchema>;
export type UpdateLoreEntryInput = z.infer<typeof updateLoreEntrySchema>;
export type Character = z.infer<typeof characterSchema>;
export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>;
export type CharacterRelation = z.infer<typeof characterRelationSchema>;
export type CreateCharacterRelationInput = z.infer<typeof createCharacterRelationSchema>;
export type UpdateCharacterRelationInput = z.infer<typeof updateCharacterRelationSchema>;
export type Storyline = z.infer<typeof storylineSchema>;
export type CreateStorylineInput = z.infer<typeof createStorylineSchema>;
export type UpdateStorylineInput = z.infer<typeof updateStorylineSchema>;
export type StorylineMilestone = z.infer<typeof storylineMilestoneSchema>;
export type CreateStorylineMilestoneInput = z.infer<typeof createStorylineMilestoneSchema>;
export type UpdateStorylineMilestoneInput = z.infer<typeof updateStorylineMilestoneSchema>;
export type StoryNode = z.infer<typeof storyNodeSchema>;
export type CreateStoryNodeInput = z.infer<typeof createStoryNodeSchema>;
export type UpdateStoryNodeInput = z.infer<typeof updateStoryNodeSchema>;
export type StoryNodeEdge = z.infer<typeof storyNodeEdgeSchema>;
export type CreateStoryNodeEdgeInput = z.infer<typeof createStoryNodeEdgeSchema>;
export type UpdateStoryNodeEdgeInput = z.infer<typeof updateStoryNodeEdgeSchema>;
