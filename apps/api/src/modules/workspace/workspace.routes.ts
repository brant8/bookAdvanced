import { Hono, type Context } from 'hono';
import type { ZodType } from 'zod';

import {
  apiErrorSchema,
  createForeshadowSchema,
  createInspirationSchema,
  createSnapshotSchema,
  directorDashboardSchema,
  exportParamsSchema,
  projectResourceParamsSchema,
  resourceIdParamsSchema,
  saveChapterSchema,
  updateForeshadowSchema,
  updateInspirationSchema,
} from '@storyverse/contracts';

import { CreativeResourceNotFoundError } from '../creative/creative.service.js';
import type { WorkspaceService } from './workspace.service.js';

export function createWorkspaceRoutes(service: WorkspaceService) {
  const routes = new Hono();

  routes.get(
    '/story-nodes/:id/chapter',
    item((id) => service.getChapter(id)),
  );
  routes.put(
    '/story-nodes/:id/chapter',
    itemBody(saveChapterSchema, (id, input) => service.saveChapter(id, input)),
  );
  routes.get(
    '/projects/:projectId/chapters/meta',
    project((id) => service.chapterMeta(id)),
  );
  routes.get(
    '/projects/:projectId/foreshadows',
    project((id) => service.listForeshadows(id)),
  );
  routes.post(
    '/projects/:projectId/foreshadows',
    projectBody(createForeshadowSchema, (id, input) => service.createForeshadow(id, input)),
  );
  routes.patch(
    '/foreshadows/:id',
    itemBody(updateForeshadowSchema, (id, input) => service.updateForeshadow(id, input)),
  );
  routes.delete(
    '/foreshadows/:id',
    itemDelete((id) => service.deleteForeshadow(id)),
  );
  routes.get(
    '/projects/:projectId/inspirations',
    project((id) => service.listInspirations(id)),
  );
  routes.post(
    '/projects/:projectId/inspirations',
    projectBody(createInspirationSchema, (id, input) => service.createInspiration(id, input)),
  );
  routes.patch(
    '/inspirations/:id',
    itemBody(updateInspirationSchema, (id, input) => service.updateInspiration(id, input)),
  );
  routes.delete(
    '/inspirations/:id',
    itemDelete((id) => service.deleteInspiration(id)),
  );
  routes.get(
    '/projects/:projectId/stats',
    project((id) => service.stats(id)),
  );
  routes.get(
    '/projects/:projectId/director-dashboard',
    project(async (id) => directorDashboardSchema.parse(await service.directorDashboard(id))),
  );
  routes.get('/projects/:projectId/export/:format', async (context) => {
    const parsed = exportParamsSchema.safeParse(context.req.param());
    if (!parsed.success) return error(context, 400, 'VALIDATION_ERROR', 'Invalid export format.');
    return execute(context, () => service.export(parsed.data.projectId, parsed.data.format));
  });
  routes.get(
    '/projects/:projectId/snapshots',
    project((id) => service.listSnapshots(id)),
  );
  routes.post(
    '/projects/:projectId/snapshots',
    projectBody(createSnapshotSchema, (id, input) => service.createSnapshot(id, input.label)),
  );
  routes.get(
    '/snapshots/:id/download',
    item((id) => service.downloadSnapshot(id)),
  );
  routes.post(
    '/snapshots/:id/restore',
    item(async (id) => {
      await service.restoreSnapshot(id);
      return { restored: true };
    }),
  );

  return routes;
}

function project(operation: (id: string) => Promise<unknown>) {
  return async (context: Context) => {
    const parsed = projectResourceParamsSchema.safeParse(context.req.param());
    if (!parsed.success) return error(context, 400, 'VALIDATION_ERROR', 'Invalid project id.');
    return execute(context, () => operation(parsed.data.projectId));
  };
}

function item(operation: (id: string) => Promise<unknown>) {
  return async (context: Context) => {
    const parsed = resourceIdParamsSchema.safeParse(context.req.param());
    if (!parsed.success) return error(context, 400, 'VALIDATION_ERROR', 'Invalid resource id.');
    return execute(context, () => operation(parsed.data.id));
  };
}

function projectBody<T>(schema: ZodType<T>, operation: (id: string, input: T) => Promise<unknown>) {
  return async (context: Context) => {
    const params = projectResourceParamsSchema.safeParse(context.req.param());
    const body = schema.safeParse(await parseBody(context));
    if (!params.success || !body.success)
      return error(context, 400, 'VALIDATION_ERROR', 'Request validation failed.');
    return execute(context, () => operation(params.data.projectId, body.data));
  };
}

function itemBody<T>(schema: ZodType<T>, operation: (id: string, input: T) => Promise<unknown>) {
  return async (context: Context) => {
    const params = resourceIdParamsSchema.safeParse(context.req.param());
    const body = schema.safeParse(await parseBody(context));
    if (!params.success || !body.success)
      return error(context, 400, 'VALIDATION_ERROR', 'Request validation failed.');
    return execute(context, () => operation(params.data.id, body.data));
  };
}

function itemDelete(operation: (id: string) => Promise<void>) {
  return async (context: Context) => {
    const parsed = resourceIdParamsSchema.safeParse(context.req.param());
    if (!parsed.success) return error(context, 400, 'VALIDATION_ERROR', 'Invalid resource id.');
    try {
      await operation(parsed.data.id);
      return context.body(null, 204);
    } catch (cause) {
      return handle(context, cause);
    }
  };
}

async function execute(context: Context, operation: () => Promise<unknown>) {
  try {
    return context.json(await operation());
  } catch (cause) {
    return handle(context, cause);
  }
}

function handle(context: Context, cause: unknown) {
  if (cause instanceof CreativeResourceNotFoundError) {
    return error(context, 404, 'RESOURCE_NOT_FOUND', cause.message);
  }
  throw cause;
}

function error(context: Context, status: 400 | 404, code: string, message: string) {
  return context.json(apiErrorSchema.parse({ error: { code, message } }), status);
}

async function parseBody(context: Context) {
  try {
    return await context.req.json();
  } catch {
    return null;
  }
}
