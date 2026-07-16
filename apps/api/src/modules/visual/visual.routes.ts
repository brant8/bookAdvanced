import { Hono, type Context } from 'hono';

import {
  apiErrorSchema,
  assetKindSchema,
  createCharacterAbilitySchema,
  generateImageSchema,
  generateStoryboardSchema,
  projectResourceParamsSchema,
  resourceIdParamsSchema,
  upsertSceneSchema,
} from '@storyverse/contracts';

import type { VisualService } from './visual.service.js';

export function createVisualRoutes(service: VisualService) {
  const routes = new Hono();
  routes.get(
    '/story-nodes/:id/scene',
    item((id) => service.getScene(id)),
  );
  routes.put(
    '/story-nodes/:id/scene',
    itemBody(upsertSceneSchema, (id, input) => service.upsertScene(id, input)),
  );
  routes.get(
    '/projects/:projectId/abilities',
    project((id) => service.listAbilities(id)),
  );
  routes.post(
    '/projects/:projectId/abilities',
    projectBody(createCharacterAbilitySchema, (id, input) => service.createAbility(id, input)),
  );
  routes.get(
    '/projects/:projectId/assets',
    project((id) => service.listAssets(id)),
  );
  routes.post(
    '/projects/:projectId/assets/generate',
    projectBody(generateImageSchema, (id, input) => service.generateImage(id, input)),
  );
  routes.post('/projects/:projectId/assets/upload', async (context) => {
    const params = projectResourceParamsSchema.safeParse(context.req.param());
    if (!params.success) return error(context, 400, 'Invalid project id.');
    const form = await context.req.formData();
    const file = form.get('file');
    const kind = assetKindSchema.safeParse(form.get('kind'));
    const name = form.get('name');
    const characterId = form.get('characterId');
    const storyNodeId = form.get('storyNodeId');
    const abilityId = form.get('abilityId');
    if (!(file instanceof File) || !kind.success || typeof name !== 'string') {
      return error(context, 400, 'Invalid asset upload.');
    }
    return context.json(
      await service.upload(params.data.projectId, file, {
        abilityId: typeof abilityId === 'string' && abilityId ? abilityId : undefined,
        characterId: typeof characterId === 'string' && characterId ? characterId : undefined,
        kind: kind.data,
        name,
        storyNodeId: typeof storyNodeId === 'string' && storyNodeId ? storyNodeId : undefined,
      }),
      201,
    );
  });
  routes.get('/assets/:id/file', async (context) => {
    const params = resourceIdParamsSchema.safeParse(context.req.param());
    if (!params.success) return error(context, 400, 'Invalid asset id.');
    try {
      const file = await service.file(params.data.id);
      return new Response(file.bytes, { headers: { 'content-type': file.mimeType } });
    } catch {
      return error(context, 404, 'Asset not found.');
    }
  });
  routes.delete('/assets/:id', async (context) => {
    const params = resourceIdParamsSchema.safeParse(context.req.param());
    if (!params.success) return error(context, 400, 'Invalid asset id.');
    await service.deleteAsset(params.data.id);
    return context.body(null, 204);
  });
  routes.get(
    '/projects/:projectId/storyboard',
    project((id) => service.getStoryboard(id)),
  );
  routes.get(
    '/projects/:projectId/storyboard/export-plan',
    project((id) => service.getStoryboardExportPlan(id)),
  );
  routes.get(
    '/projects/:projectId/storyboard/tts-plan',
    project((id) => service.getTtsDubbingPlan(id)),
  );
  routes.get(
    '/projects/:projectId/storyboard/tts-provider-reservation',
    project((id) => service.getTtsProviderReservation(id)),
  );
  routes.get(
    '/projects/:projectId/storyboard/worker-queue',
    project((id) => service.getStoryboardWorkerQueue(id)),
  );
  routes.post(
    '/projects/:projectId/storyboard/worker-queue/dry-run',
    project((id) => service.dryRunStoryboardWorker(id)),
  );
  routes.post(
    '/projects/:projectId/storyboard/generate',
    projectBody(generateStoryboardSchema, (id, input) =>
      service.generateStoryboard(id, input.providerId),
    ),
  );
  return routes;
}

function project(operation: (id: string) => Promise<unknown>) {
  return async (context: Context) => {
    const params = projectResourceParamsSchema.safeParse(context.req.param());
    if (!params.success) return error(context, 400, 'Invalid project id.');
    return context.json(await operation(params.data.projectId));
  };
}
function item(operation: (id: string) => Promise<unknown>) {
  return async (context: Context) => {
    const params = resourceIdParamsSchema.safeParse(context.req.param());
    if (!params.success) return error(context, 400, 'Invalid resource id.');
    return context.json(await operation(params.data.id));
  };
}
function projectBody<T>(
  schema: { safeParse(value: unknown): { success: boolean; data?: T } },
  operation: (id: string, input: T) => Promise<unknown>,
) {
  return async (context: Context) => {
    const params = projectResourceParamsSchema.safeParse(context.req.param());
    const input = schema.safeParse(await body(context));
    if (!params.success || !input.success) return error(context, 400, 'Invalid request.');
    return context.json(await operation(params.data.projectId, input.data!), 201);
  };
}
function itemBody<T>(
  schema: { safeParse(value: unknown): { success: boolean; data?: T } },
  operation: (id: string, input: T) => Promise<unknown>,
) {
  return async (context: Context) => {
    const params = resourceIdParamsSchema.safeParse(context.req.param());
    const input = schema.safeParse(await body(context));
    if (!params.success || !input.success) return error(context, 400, 'Invalid request.');
    return context.json(await operation(params.data.id, input.data!));
  };
}
async function body(context: Context) {
  try {
    return await context.req.json();
  } catch {
    return null;
  }
}
function error(context: Context, status: 400 | 404, message: string) {
  return context.json(apiErrorSchema.parse({ error: { code: 'VISUAL_ERROR', message } }), status);
}
