import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ZodType } from 'zod';

import {
  apiErrorSchema,
  createCharacterRelationSchema,
  createCharacterSchema,
  createLoreEntrySchema,
  createStorylineMilestoneSchema,
  createStorylineSchema,
  createStoryNodeSchema,
  createWorldRuleSchema,
  projectResourceParamsSchema,
  resourceIdParamsSchema,
  updateCharacterRelationSchema,
  updateCharacterSchema,
  updateLoreEntrySchema,
  updateStorylineMilestoneSchema,
  updateStorylineSchema,
  updateStoryNodeSchema,
  updateWorldRuleSchema,
  upsertStoryBibleSchema,
} from '@storyverse/contracts';

import {
  CreativeResourceConflictError,
  CreativeResourceNotFoundError,
  type CreativeService,
} from './creative.service.js';

export function createCreativeRoutes(service: CreativeService) {
  const routes = new Hono();

  routes.get(
    '/projects/:projectId/bible',
    project((id) => service.getBible(id)),
  );
  routes.put(
    '/projects/:projectId/bible',
    projectBody(upsertStoryBibleSchema, (id, input) => service.upsertBible(id, input)),
  );
  routes.delete(
    '/projects/:projectId/bible',
    projectDelete((id) => service.deleteBible(id)),
  );

  routes.get(
    '/projects/:projectId/world-rules',
    project((id) => service.listWorldRules(id)),
  );
  routes.post(
    '/projects/:projectId/world-rules',
    projectBody(createWorldRuleSchema, (id, input) => service.createWorldRule(id, input), 201),
  );
  routes.patch(
    '/world-rules/:id',
    itemBody(updateWorldRuleSchema, (id, input) => service.updateWorldRule(id, input)),
  );
  routes.delete(
    '/world-rules/:id',
    itemDelete((id) => service.deleteWorldRule(id)),
  );

  routes.get(
    '/projects/:projectId/lore',
    project((id) => service.listLore(id)),
  );
  routes.post(
    '/projects/:projectId/lore',
    projectBody(createLoreEntrySchema, (id, input) => service.createLore(id, input), 201),
  );
  routes.patch(
    '/lore/:id',
    itemBody(updateLoreEntrySchema, (id, input) => service.updateLore(id, input)),
  );
  routes.delete(
    '/lore/:id',
    itemDelete((id) => service.deleteLore(id)),
  );

  routes.get(
    '/projects/:projectId/characters',
    project((id) => service.listCharacters(id)),
  );
  routes.post(
    '/projects/:projectId/characters',
    projectBody(createCharacterSchema, (id, input) => service.createCharacter(id, input), 201),
  );
  routes.patch(
    '/characters/:id',
    itemBody(updateCharacterSchema, (id, input) => service.updateCharacter(id, input)),
  );
  routes.delete(
    '/characters/:id',
    itemDelete((id) => service.deleteCharacter(id)),
  );

  routes.get(
    '/projects/:projectId/character-relations',
    project((id) => service.listCharacterRelations(id)),
  );
  routes.post(
    '/projects/:projectId/character-relations',
    projectBody(
      createCharacterRelationSchema,
      (id, input) => service.createCharacterRelation(id, input),
      201,
    ),
  );
  routes.patch(
    '/character-relations/:id',
    itemBody(updateCharacterRelationSchema, (id, input) =>
      service.updateCharacterRelation(id, input),
    ),
  );
  routes.delete(
    '/character-relations/:id',
    itemDelete((id) => service.deleteCharacterRelation(id)),
  );

  routes.get(
    '/projects/:projectId/storylines',
    project((id) => service.listStorylines(id)),
  );
  routes.post(
    '/projects/:projectId/storylines',
    projectBody(createStorylineSchema, (id, input) => service.createStoryline(id, input), 201),
  );
  routes.patch(
    '/storylines/:id',
    itemBody(updateStorylineSchema, (id, input) => service.updateStoryline(id, input)),
  );
  routes.delete(
    '/storylines/:id',
    itemDelete((id) => service.deleteStoryline(id)),
  );

  routes.get(
    '/storylines/:id/milestones',
    item((id) => service.listMilestones(id)),
  );
  routes.post(
    '/storylines/:id/milestones',
    itemBody(
      createStorylineMilestoneSchema,
      (id, input) => service.createMilestone(id, input),
      201,
    ),
  );
  routes.patch(
    '/storyline-milestones/:id',
    itemBody(updateStorylineMilestoneSchema, (id, input) => service.updateMilestone(id, input)),
  );
  routes.delete(
    '/storyline-milestones/:id',
    itemDelete((id) => service.deleteMilestone(id)),
  );

  routes.get(
    '/projects/:projectId/story-nodes',
    project((id) => service.listStoryNodes(id)),
  );
  routes.post(
    '/projects/:projectId/story-nodes',
    projectBody(createStoryNodeSchema, (id, input) => service.createStoryNode(id, input), 201),
  );
  routes.patch(
    '/story-nodes/:id',
    itemBody(updateStoryNodeSchema, (id, input) => service.updateStoryNode(id, input)),
  );
  routes.delete(
    '/story-nodes/:id',
    itemDelete((id) => service.deleteStoryNode(id)),
  );

  return routes;
}

function project(operation: (id: string) => Promise<unknown>) {
  return async (context: Context) => {
    const params = projectResourceParamsSchema.safeParse(context.req.param());
    if (!params.success) return validationError(context, ['Invalid project id.']);
    return execute(context, () => operation(params.data.projectId));
  };
}

function item(operation: (id: string) => Promise<unknown>) {
  return async (context: Context) => {
    const params = resourceIdParamsSchema.safeParse(context.req.param());
    if (!params.success) return validationError(context, ['Invalid resource id.']);
    return execute(context, () => operation(params.data.id));
  };
}

function projectBody<T>(
  schema: ZodType<T>,
  operation: (id: string, input: T) => Promise<unknown>,
  status: ContentfulStatusCode = 200,
) {
  return async (context: Context) => {
    const params = projectResourceParamsSchema.safeParse(context.req.param());
    if (!params.success) return validationError(context, ['Invalid project id.']);
    const parsed = schema.safeParse(await parseJson(context.req.raw));
    if (!parsed.success) {
      return validationError(
        context,
        parsed.error.issues.map((issue) => issue.message),
      );
    }
    return execute(context, () => operation(params.data.projectId, parsed.data), status);
  };
}

function itemBody<T>(
  schema: ZodType<T>,
  operation: (id: string, input: T) => Promise<unknown>,
  status: ContentfulStatusCode = 200,
) {
  return async (context: Context) => {
    const params = resourceIdParamsSchema.safeParse(context.req.param());
    if (!params.success) return validationError(context, ['Invalid resource id.']);
    const parsed = schema.safeParse(await parseJson(context.req.raw));
    if (!parsed.success) {
      return validationError(
        context,
        parsed.error.issues.map((issue) => issue.message),
      );
    }
    return execute(context, () => operation(params.data.id, parsed.data), status);
  };
}

function projectDelete(operation: (id: string) => Promise<void>) {
  return async (context: Context) => {
    const params = projectResourceParamsSchema.safeParse(context.req.param());
    if (!params.success) return validationError(context, ['Invalid project id.']);
    return executeDelete(context, () => operation(params.data.projectId));
  };
}

function itemDelete(operation: (id: string) => Promise<void>) {
  return async (context: Context) => {
    const params = resourceIdParamsSchema.safeParse(context.req.param());
    if (!params.success) return validationError(context, ['Invalid resource id.']);
    return executeDelete(context, () => operation(params.data.id));
  };
}

async function execute(
  context: Context,
  operation: () => Promise<unknown>,
  status: ContentfulStatusCode = 200,
) {
  try {
    return context.json(await operation(), status);
  } catch (error) {
    return handleServiceError(context, error);
  }
}

async function executeDelete(context: Context, operation: () => Promise<void>) {
  try {
    await operation();
    return context.body(null, 204);
  } catch (error) {
    return handleServiceError(context, error);
  }
}

function handleServiceError(context: Context, error: unknown) {
  if (error instanceof CreativeResourceNotFoundError) {
    return jsonError(context, 404, 'RESOURCE_NOT_FOUND', 'Creative resource not found.');
  }
  if (error instanceof CreativeResourceConflictError) {
    return jsonError(context, 409, 'RESOURCE_CONFLICT', error.message);
  }
  throw error;
}

async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function validationError(context: Context, issues: string[]) {
  return jsonError(context, 400, 'VALIDATION_ERROR', 'Request validation failed.', issues);
}

function jsonError(
  context: Context,
  status: ContentfulStatusCode,
  code: string,
  message: string,
  issues?: string[],
) {
  return context.json(
    apiErrorSchema.parse({
      error: { code, issues, message },
    }),
    status,
  );
}
