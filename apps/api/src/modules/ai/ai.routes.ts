import { Hono, type Context } from 'hono';
import { ZodError } from 'zod';

import {
  apiErrorSchema,
  generateChapterSchema,
  resourceIdParamsSchema,
} from '@storyverse/contracts';

import { CreativeResourceNotFoundError } from '../creative/creative.service.js';
import { AiProviderError } from './ai.provider.js';
import type { AiService } from './ai.service.js';

export function createAiRoutes(service: AiService) {
  const routes = new Hono();

  routes.get('/story-nodes/:id/generation-context', async (context) => {
    const params = resourceIdParamsSchema.safeParse(context.req.param());
    if (!params.success) return error(context, 400, 'VALIDATION_ERROR', 'Invalid node id.');
    try {
      return context.json(await service.previewContext(params.data.id));
    } catch (cause) {
      if (cause instanceof CreativeResourceNotFoundError) {
        return error(context, 404, 'RESOURCE_NOT_FOUND', cause.message);
      }
      throw cause;
    }
  });

  routes.post('/story-nodes/:id/generate', async (context) => {
    const params = resourceIdParamsSchema.safeParse(context.req.param());
    let payload: unknown = null;
    try {
      payload = await context.req.json();
    } catch {
      // Validation below returns the structured error.
    }
    const input = generateChapterSchema.safeParse(payload);
    if (!params.success || !input.success) {
      return error(context, 400, 'VALIDATION_ERROR', 'Invalid generation request.');
    }
    try {
      return context.json(await service.generateChapter(params.data.id, input.data));
    } catch (cause) {
      if (cause instanceof CreativeResourceNotFoundError) {
        return error(context, 404, 'RESOURCE_NOT_FOUND', cause.message);
      }
      if (
        cause instanceof AiProviderError ||
        cause instanceof SyntaxError ||
        cause instanceof ZodError
      ) {
        return error(context, 502, 'AI_PROVIDER_ERROR', cause.message);
      }
      throw cause;
    }
  });

  return routes;
}

function error(context: Context, status: 400 | 404 | 502, code: string, message: string) {
  return context.json(apiErrorSchema.parse({ error: { code, message } }), status);
}
