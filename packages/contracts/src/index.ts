import { z } from 'zod';

export * from './projects';
export * from './creative';
export * from './workspace';
export * from './ai';

export const healthResponseSchema = z.object({
  service: z.literal('storyverse-api'),
  status: z.literal('ok'),
  version: z.string().min(1),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export function createHealthResponse(version: string): HealthResponse {
  return healthResponseSchema.parse({
    service: 'storyverse-api',
    status: 'ok',
    version,
  });
}
