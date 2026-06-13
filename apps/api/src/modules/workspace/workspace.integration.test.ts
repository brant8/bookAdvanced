import { inArray } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  chapterSchema,
  exportDocumentSchema,
  foreshadowSchema,
  inspirationSchema,
  projectSnapshotSchema,
  projectStatsSchema,
  storyNodeSchema,
  storylineSchema,
} from '@storyverse/contracts';

import { createApp } from '../../app.js';
import { createDatabase } from '../../db/client.js';
import { getDatabaseUrl } from '../../db/config.js';
import { projects } from '../../db/schema.js';
import { CreativeService } from '../creative/creative.service.js';
import { DrizzleProjectRepository } from '../projects/project.repository.js';
import { ProjectService } from '../projects/project.service.js';
import { ensureLocalUser } from '../users/local-user.js';
import { WorkspaceService } from './workspace.service.js';

const { db, pool } = createDatabase(getDatabaseUrl());
const migrationsFolder = fileURLToPath(new URL('../../../drizzle', import.meta.url));
const createdProjectIds: string[] = [];
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  await migrate(db, { migrationsFolder });
  const user = await ensureLocalUser(db);
  app = createApp({
    creativeService: new CreativeService(db, user.id),
    projectService: new ProjectService(new DrizzleProjectRepository(db), user.id),
    workspaceService: new WorkspaceService(db, user.id),
  });
});

afterEach(async () => {
  if (createdProjectIds.length) {
    await db.delete(projects).where(inArray(projects.id, createdProjectIds.splice(0)));
  }
});

afterAll(async () => pool.end());

describe('Writing workspace integration', () => {
  it('saves prose, reports stats, exports and restores a snapshot', async () => {
    const project = (await post('/projects', { name: '可移植故事' })) as { id: string };
    createdProjectIds.push(project.id);
    const storyline = storylineSchema.parse(
      await post(`/projects/${project.id}/storylines`, { title: '返乡主线' }),
    );
    const node = storyNodeSchema.parse(
      await post(`/projects/${project.id}/story-nodes`, {
        canvasX: 120,
        canvasY: 80,
        nodeGoal: '取得证词',
        sortOrder: 0,
        storylineId: storyline.id,
        title: '雾港会面',
      }),
    );

    const first = chapterSchema.parse(
      await put(`/story-nodes/${node.id}/chapter`, {
        chapterNumber: 1,
        content: '林岚来到雾港。The gate opened.',
        title: '雾港会面',
      }),
    );
    const second = chapterSchema.parse(
      await put(`/story-nodes/${node.id}/chapter`, {
        chapterNumber: 1,
        content: '林岚来到雾港，取得了第一份证词。',
        title: '雾港会面',
      }),
    );
    expect(second.revision).toBe(first.revision + 1);
    expect(second.wordCount).toBeGreaterThan(5);

    foreshadowSchema.parse(
      await post(`/projects/${project.id}/foreshadows`, {
        importance: 'high',
        plantedNodeId: node.id,
        status: 'planted',
        title: '破损的王室印章',
      }),
    );
    inspirationSchema.parse(
      await post(`/projects/${project.id}/inspirations`, { content: '守门人可能认识主角母亲' }),
    );
    const stats = projectStatsSchema.parse(await get(`/projects/${project.id}/stats`));
    expect(stats).toMatchObject({ chapterCount: 1, inspirationInboxCount: 1, nodeCount: 1 });

    const exported = exportDocumentSchema.parse(
      await get(`/projects/${project.id}/export/master-md`),
    );
    expect(exported.content).toContain('取得证词');
    expect(exported.content).toContain('雾港会面');

    const snapshot = projectSnapshotSchema.parse(
      await post(`/projects/${project.id}/snapshots`, { label: '第一章完成' }),
    );
    await put(`/story-nodes/${node.id}/chapter`, {
      chapterNumber: 1,
      content: '被覆盖的正文',
      title: '雾港会面',
    });
    await post(`/snapshots/${snapshot.id}/restore`, {});
    const restored = chapterSchema.parse(await get(`/story-nodes/${node.id}/chapter`));
    expect(restored.content).toContain('第一份证词');
  });
});

async function get(path: string) {
  const response = await app.request(path);
  expect(response.ok).toBe(true);
  return response.json();
}

async function post(path: string, body: unknown) {
  return write(path, 'POST', body);
}

async function put(path: string, body: unknown) {
  return write(path, 'PUT', body);
}

async function write(path: string, method: string, body: unknown) {
  const response = await app.request(path, {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    method,
  });
  expect(response.ok).toBe(true);
  return response.json();
}
