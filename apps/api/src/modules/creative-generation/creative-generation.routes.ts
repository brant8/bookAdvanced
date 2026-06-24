import { Hono, type Context } from 'hono';

import {
  apiErrorSchema,
  creativeGenerationRequestSchema,
  projectResourceParamsSchema,
} from '@storyverse/contracts';

import type { CreativeGenerationService } from './creative-generation.service.js';

export function createCreativeGenerationRoutes(service: CreativeGenerationService) {
  const routes = new Hono();
  routes.post('/projects/:projectId/ai/generate', async (context) => {
    const params = projectResourceParamsSchema.safeParse(context.req.param());
    const input = creativeGenerationRequestSchema.safeParse(await body(context));
    if (!params.success || !input.success)
      return error(context, 400, 'Invalid generation request.');
    try {
      return context.json(await service.generate(params.data.projectId, input.data));
    } catch (cause) {
      return error(
        context,
        502,
        cause instanceof Error ? cause.message : 'Creative generation failed.',
      );
    }
  });
  return routes;
}

async function body(context: Context) {
  try {
    return await context.req.json();
  } catch {
    return null;
  }
}

function error(context: Context, status: 400 | 502, message: string) {
  return context.json(
    apiErrorSchema.parse({ error: { code: 'CREATIVE_GENERATION_ERROR', message } }),
    status,
  );
}
