import { serve } from '@hono/node-server';

import { createApp } from './app.js';
import { createDatabase } from './db/client.js';
import { getDatabaseUrl } from './db/config.js';
import { OpenAiCompatibleProvider } from './modules/ai/ai.provider.js';
import { AiService } from './modules/ai/ai.service.js';
import { CreativeService } from './modules/creative/creative.service.js';
import { DrizzleProjectRepository } from './modules/projects/project.repository.js';
import { ProjectService } from './modules/projects/project.service.js';
import { ensureLocalUser } from './modules/users/local-user.js';
import { WorkspaceService } from './modules/workspace/workspace.service.js';

const port = Number.parseInt(process.env.STORYVERSE_API_PORT ?? '4310', 10);
const { db, pool } = createDatabase(getDatabaseUrl());
const localUser = await ensureLocalUser(db);
const projectRepository = new DrizzleProjectRepository(db);
const projectService = new ProjectService(projectRepository, localUser.id);
const creativeService = new CreativeService(db, localUser.id);
const workspaceService = new WorkspaceService(db, localUser.id);
const aiService = new AiService(db, localUser.id, new OpenAiCompatibleProvider());
const app = createApp({ aiService, creativeService, projectService, workspaceService });

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
