import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import {
  apiErrorSchema,
  createProjectSchema,
  projectIdParamsSchema,
  updateProjectSchema,
} from '@storyverse/contracts';

import { ProjectNotFoundError, type ProjectService } from './project.service.js';

export function createProjectRoutes(projectService: ProjectService) {
  const routes = new Hono();

  routes.get('/', async (context) => context.json(await projectService.list()));

  routes.post('/', async (context) => {
    const input = await parseJson(context.req.raw);
    const parsed = createProjectSchema.safeParse(input);

    if (!parsed.success) {
      return validationError(
        context,
        parsed.error.issues.map((issue) => issue.message),
      );
    }

    return context.json(await projectService.create(parsed.data), 201);
  });

  routes.get('/:id', async (context) => {
    const params = projectIdParamsSchema.safeParse(context.req.param());

    if (!params.success) {
      return validationError(context, ['Invalid project id.']);
    }

    return handleNotFound(context, () => projectService.get(params.data.id));
  });

  routes.patch('/:id', async (context) => {
    const params = projectIdParamsSchema.safeParse(context.req.param());

    if (!params.success) {
      return validationError(context, ['Invalid project id.']);
    }

    const input = await parseJson(context.req.raw);
    const parsed = updateProjectSchema.safeParse(input);

    if (!parsed.success) {
      return validationError(
        context,
        parsed.error.issues.map((issue) => issue.message),
      );
    }

    return handleNotFound(context, () => projectService.update(params.data.id, parsed.data));
  });

  routes.delete('/:id', async (context) => {
    const params = projectIdParamsSchema.safeParse(context.req.param());

    if (!params.success) {
      return validationError(context, ['Invalid project id.']);
    }

    try {
      await projectService.delete(params.data.id);
      return context.body(null, 204);
    } catch (error) {
      if (error instanceof ProjectNotFoundError) {
        return notFound(context);
      }

      throw error;
    }
  });

  return routes;
}

async function handleNotFound(context: Context, operation: () => Promise<unknown>) {
  try {
    return context.json(await operation());
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      return notFound(context);
    }

    throw error;
  }
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

function notFound(context: Context) {
  return jsonError(context, 404, 'PROJECT_NOT_FOUND', 'Project not found.');
}

function jsonError(
  context: Context,
  status: ContentfulStatusCode,
  code: string,
  message: string,
  issues?: string[],
) {
  const payload = apiErrorSchema.parse({
    error: {
      code,
      issues,
      message,
    },
  });

  return context.json(payload, status);
}
