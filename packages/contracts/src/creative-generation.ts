import { z } from 'zod';

export const creativeGenerationTaskSchema = z.enum([
  'bible.generate',
  'lore.generate',
  'character.generate',
  'storyline.generate',
]);
export const creativeGenerationRequestSchema = z.object({
  providerId: z.uuid(),
  taskType: creativeGenerationTaskSchema,
  instructions: z.string().max(20_000).optional(),
});
export const creativeGenerationResultSchema = z.object({
  runId: z.uuid(),
  taskType: creativeGenerationTaskSchema,
  candidate: z.record(z.string(), z.unknown()),
});

export type CreativeGenerationRequest = z.infer<typeof creativeGenerationRequestSchema>;
export type CreativeGenerationResult = z.infer<typeof creativeGenerationResultSchema>;
