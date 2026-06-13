import { Hono } from 'hono';

import { createHealthResponse } from '@storyverse/contracts';

import { createAiRoutes } from './modules/ai/ai.routes.js';
import type { AiService } from './modules/ai/ai.service.js';
import { createCreativeRoutes } from './modules/creative/creative.routes.js';
import type { CreativeService } from './modules/creative/creative.service.js';
import { createProjectRoutes } from './modules/projects/project.routes.js';
import type { ProjectService } from './modules/projects/project.service.js';
import { createWorkspaceRoutes } from './modules/workspace/workspace.routes.js';
import type { WorkspaceService } from './modules/workspace/workspace.service.js';

interface AppDependencies {
  aiService?: AiService;
  creativeService?: CreativeService;
  projectService?: ProjectService;
  workspaceService?: WorkspaceService;
}

export function createApp(dependencies: AppDependencies = {}) {
  const app = new Hono();

  app.get('/', (context) =>
    context.json({
      name: 'StoryVerse API',
      documentation: '/health',
    }),
  );

  app.get('/health', (context) => context.json(createHealthResponse('0.0.0')));

  if (dependencies.aiService) {
    app.route('/', createAiRoutes(dependencies.aiService));
  }
  if (dependencies.creativeService) {
    app.route('/', createCreativeRoutes(dependencies.creativeService));
  }
  if (dependencies.workspaceService) {
    app.route('/', createWorkspaceRoutes(dependencies.workspaceService));
  }

  if (dependencies.projectService) {
    app.route('/projects', createProjectRoutes(dependencies.projectService));
  }

  return app;
}
