import { Hono, type Context } from 'hono';

import {
  aiProviderTestSchema,
  aiUsageSummarySchema,
  apiErrorSchema,
  resourceIdParamsSchema,
  saveAiProviderSchema,
  updateAiProviderSchema,
} from '@storyverse/contracts';

import { AiSettingsNotFoundError, type AiSettingsService } from './ai-settings.service.js';

export function createAiSettingsRoutes(service: AiSettingsService) {
  const routes = new Hono();
  routes.get('/ai/providers', async (context) => context.json(await service.listProviders()));
  routes.get('/ai/usage-summary', async (context) =>
    context.json(
      aiUsageSummarySchema.parse(await service.usageSummary(context.req.query('projectId'))),
    ),
  );
  routes.post('/ai/providers', async (context) => {
    const parsed = saveAiProviderSchema.safeParse(await body(context));
    if (!parsed.success) return error(context, 400, 'Invalid AI Provider configuration.');
    return context.json(await service.createProvider(parsed.data), 201);
  });
  routes.patch('/ai/providers/:id', async (context) => {
    const id = resourceIdParamsSchema.safeParse(context.req.param());
    const input = updateAiProviderSchema.safeParse(await body(context));
    if (!id.success || !input.success) return error(context, 400, 'Invalid AI Provider update.');
    return execute(context, () => service.updateProvider(id.data.id, input.data));
  });
  routes.post('/ai/providers/:id/test', async (context) => {
    const id = resourceIdParamsSchema.safeParse(context.req.param());
    if (!id.success) return error(context, 400, 'Invalid AI Provider id.');
    return execute(context, async () =>
      aiProviderTestSchema.parse(await service.testProvider(id.data.id)),
    );
  });
  routes.delete('/ai/providers/:id', async (context) => {
    const id = resourceIdParamsSchema.safeParse(context.req.param());
    if (!id.success) return error(context, 400, 'Invalid AI Provider id.');
    try {
      await service.deleteProvider(id.data.id);
      return context.body(null, 204);
    } catch (cause) {
      return handle(context, cause);
    }
  });
  routes.get('/ai/generation-runs', async (context) =>
    context.json(await service.listRuns(context.req.query('projectId'))),
  );
  routes.post('/ai/generation-runs/:id/:decision', async (context) => {
    const id = resourceIdParamsSchema.safeParse(context.req.param());
    const decision = context.req.param('decision');
    if (!id.success || !['approve', 'reject'].includes(decision)) {
      return error(context, 400, 'Invalid generation review.');
    }
    return execute(context, () =>
      service.reviewRun(id.data.id, decision === 'approve' ? 'approved' : 'rejected'),
    );
  });
  return routes;
}

async function execute(context: Context, operation: () => Promise<unknown>) {
  try {
    return context.json(await operation());
  } catch (cause) {
    return handle(context, cause);
  }
}

function handle(context: Context, cause: unknown) {
  if (cause instanceof AiSettingsNotFoundError) return error(context, 404, 'Resource not found.');
  throw cause;
}

function error(context: Context, status: 400 | 404, message: string) {
  return context.json(
    apiErrorSchema.parse({ error: { code: 'AI_SETTINGS_ERROR', message } }),
    status,
  );
}

async function body(context: Context) {
  try {
    return await context.req.json();
  } catch {
    return null;
  }
}
