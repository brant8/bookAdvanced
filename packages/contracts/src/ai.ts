import { z } from 'zod';

export const aiProtocolSchema = z.enum(['chat-completions', 'responses']);
export const aiProviderConfigSchema = z.object({
  protocol: aiProtocolSchema.default('chat-completions'),
  baseUrl: z.string().url(),
  model: z.string().trim().min(1).max(160),
  apiKey: z.string().max(1000).optional(),
});

export const generateChapterSchema = z.object({
  provider: aiProviderConfigSchema,
  targetWords: z.number().int().min(200).max(20_000).default(1500),
  extraInstructions: z.string().max(20_000).optional(),
});

export const progressionReportSchema = z.object({
  completedNodeGoals: z.array(z.string()),
  milestoneProgress: z.string(),
  characterChanges: z.array(z.string()),
  worldChanges: z.array(z.string()),
  foreshadowChanges: z.array(z.string()),
  endingAlignment: z.string(),
  nextChapterGoal: z.string(),
  warnings: z.array(z.string()),
});

export const generatedChapterSchema = z.object({
  title: z.string(),
  content: z.string().min(1),
  summary: z.string(),
  report: progressionReportSchema,
});

export type AiProviderConfig = z.infer<typeof aiProviderConfigSchema>;
export type GenerateChapterInput = z.infer<typeof generateChapterSchema>;
export type GeneratedChapter = z.infer<typeof generatedChapterSchema>;
