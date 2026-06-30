import { serve } from '@hono/node-server';

import { createApp } from './app.js';
import { createDatabase } from './db/client.js';
import { getDatabaseUrl } from './db/config.js';
import { validateRuntimeConfig } from './runtime-config.js';
import { OpenAiCompatibleProvider } from './modules/ai/ai.provider.js';
import { AiService } from './modules/ai/ai.service.js';
import { AiSettingsService } from './modules/ai-settings/ai-settings.service.js';
import { AuthService } from './modules/auth/auth.service.js';
import { CreativeService } from './modules/creative/creative.service.js';
import { CreativeGenerationService } from './modules/creative-generation/creative-generation.service.js';
import { DrizzleProjectRepository } from './modules/projects/project.repository.js';
import { ProjectService } from './modules/projects/project.service.js';
import { ensureLocalUser } from './modules/users/local-user.js';
import { WorkspaceService } from './modules/workspace/workspace.service.js';
import { VisualService } from './modules/visual/visual.service.js';

validateRuntimeConfig();

const port = Number.parseInt(process.env.STORYVERSE_API_PORT ?? '4310', 10);
const { db, pool } = createDatabase(getDatabaseUrl());
const localUser = await ensureLocalUser(db);
const authMode = process.env.STORYVERSE_AUTH_MODE === 'account' ? 'account' : 'local';
const authService = new AuthService(db, localUser.id, authMode);
const projectRepository = new DrizzleProjectRepository(db);
const projectService = new ProjectService(projectRepository, localUser.id);
const creativeService = new CreativeService(db, localUser.id);
const workspaceService = new WorkspaceService(db, localUser.id);
const aiService = new AiService(db, localUser.id, new OpenAiCompatibleProvider());
const aiSettingsService = new AiSettingsService(db, localUser.id, new OpenAiCompatibleProvider());
const creativeGenerationService = new CreativeGenerationService(
  db,
  localUser.id,
  aiSettingsService,
  new OpenAiCompatibleProvider(),
);
const visualService = new VisualService(
  db,
  localUser.id,
  aiSettingsService,
  new OpenAiCompatibleProvider(),
);
const app = createApp({
  aiService,
  aiSettingsService,
  authService,
  creativeGenerationService,
  creativeService,
  projectService,
  visualService,
  workspaceService,
});

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`StoryVerse API listening on http://localhost:${info.port}`);
  },
);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void pool.end().finally(() => process.exit(0));
  });
}
