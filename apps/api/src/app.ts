import { Hono } from 'hono';

import { createHealthResponse } from '@storyverse/contracts';

import { createAiRoutes } from './modules/ai/ai.routes.js';
import type { AiService } from './modules/ai/ai.service.js';
import { createAiSettingsRoutes } from './modules/ai-settings/ai-settings.routes.js';
import type { AiSettingsService } from './modules/ai-settings/ai-settings.service.js';
import { createAuthRoutes, sessionToken } from './modules/auth/auth.routes.js';
import type { AuthService } from './modules/auth/auth.service.js';
import { createCreativeRoutes } from './modules/creative/creative.routes.js';
import type { CreativeService } from './modules/creative/creative.service.js';
import { createCreativeGenerationRoutes } from './modules/creative-generation/creative-generation.routes.js';
import type { CreativeGenerationService } from './modules/creative-generation/creative-generation.service.js';
import { createProjectRoutes } from './modules/projects/project.routes.js';
import type { ProjectService } from './modules/projects/project.service.js';
import { createWorkspaceRoutes } from './modules/workspace/workspace.routes.js';
import type { WorkspaceService } from './modules/workspace/workspace.service.js';
import { createVisualRoutes } from './modules/visual/visual.routes.js';
import type { VisualService } from './modules/visual/visual.service.js';

interface AppDependencies {
  aiService?: AiService;
  aiSettingsService?: AiSettingsService;
  authService?: AuthService;
  creativeService?: CreativeService;
  creativeGenerationService?: CreativeGenerationService;
  projectService?: ProjectService;
  workspaceService?: WorkspaceService;
  visualService?: VisualService;
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

  if (dependencies.authService) {
    app.route('/auth', createAuthRoutes(dependencies.authService));
    app.use('*', async (context, next) => {
      if (
        context.req.path === '/' ||
        context.req.path === '/health' ||
        context.req.path.startsWith('/auth/')
      ) {
        return next();
      }
      if (await dependencies.authService?.isAuthenticated(sessionToken(context))) {
        return next();
      }
      return context.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication is required.',
          },
        },
        401,
      );
    });
  }

  if (dependencies.aiService) {
    app.route('/', createAiRoutes(dependencies.aiService));
  }
  if (dependencies.aiSettingsService) {
    app.route('/', createAiSettingsRoutes(dependencies.aiSettingsService));
  }
  if (dependencies.creativeService) {
    app.route('/', createCreativeRoutes(dependencies.creativeService));
  }
  if (dependencies.creativeGenerationService) {
    app.route('/', createCreativeGenerationRoutes(dependencies.creativeGenerationService));
  }
  if (dependencies.visualService) {
    app.route('/', createVisualRoutes(dependencies.visualService));
  }
  if (dependencies.workspaceService) {
    app.route('/', createWorkspaceRoutes(dependencies.workspaceService));
  }

  if (dependencies.projectService) {
    app.route('/projects', createProjectRoutes(dependencies.projectService));
  }

  return app;
}
