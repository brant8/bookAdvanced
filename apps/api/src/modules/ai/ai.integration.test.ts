import { eq, inArray } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { generatedChapterSchema, storyNodeSchema, storylineSchema } from '@storyverse/contracts';

import { createApp } from '../../app.js';
import { createDatabase } from '../../db/client.js';
import { getDatabaseUrl } from '../../db/config.js';
import { chapters, projects, storylineMilestones } from '../../db/schema.js';
import { CreativeService } from '../creative/creative.service.js';
import { DrizzleProjectRepository } from '../projects/project.repository.js';
import { ProjectService } from '../projects/project.service.js';
import { ensureLocalUser } from '../users/local-user.js';
import type { TextGenerationProvider } from './ai.provider.js';
import { AiService } from './ai.service.js';

const { db, pool } = createDatabase(getDatabaseUrl());
const migrationsFolder = fileURLToPath(new URL('../../../drizzle', import.meta.url));
const projectIds: string[] = [];
let app: ReturnType<typeof createApp>;
let capturedPrompt = '';

const fakeProvider: TextGenerationProvider = {
  async generate(_config, prompt) {
    capturedPrompt = prompt;
    return JSON.stringify({
      content: '林岚在雾港取得证词，但没有提前公开全部真相。',
      report: {
        characterChanges: ['林岚开始怀疑官方历史'],
        completedNodeGoals: ['取得第一份证词'],
        endingAlignment: '推进公开真相的方向，但未提前完成结局',
        foreshadowChanges: [],
        milestoneProgress: '建议从 0% 推进到 30%',
        nextChapterGoal: '寻找第二名证人',
        warnings: [],
        worldChanges: [],
      },
      summary: '林岚取得第一份证词。',
      title: '雾港证词',
    });
  },
};

beforeAll(async () => {
  await migrate(db, { migrationsFolder });
  const user = await ensureLocalUser(db);
  app = createApp({
    aiService: new AiService(db, user.id, fakeProvider),
    creativeService: new CreativeService(db, user.id),
    projectService: new ProjectService(new DrizzleProjectRepository(db), user.id),
  });
});

afterEach(async () => {
  if (projectIds.length)
    await db.delete(projects).where(inArray(projects.id, projectIds.splice(0)));
});
afterAll(async () => pool.end());

describe('AI chapter generation integration', () => {
  it('returns a candidate and report without mutating story progress', async () => {
    const project = (await post('/projects', { name: 'AI 测试故事' })) as { id: string };
    projectIds.push(project.id);
    await put(`/projects/${project.id}/bible`, { endingDirection: '主角最终公开真相' });
    const line = storylineSchema.parse(
      await post(`/projects/${project.id}/storylines`, {
        endingGoal: '公开被抹除的历史',
        title: '返乡主线',
      }),
    );
    const milestone = (await post(`/storylines/${line.id}/milestones`, {
      sortOrder: 0,
      title: '取得证词',
    })) as { id: string };
    const node = storyNodeSchema.parse(
      await post(`/projects/${project.id}/story-nodes`, {
        milestoneId: milestone.id,
        nodeGoal: '取得第一份证词',
        sortOrder: 0,
        storylineId: line.id,
        title: '雾港会面',
      }),
    );

    const result = generatedChapterSchema.parse(
      await post(`/story-nodes/${node.id}/generate`, {
        provider: {
          baseUrl: 'http://localhost:11434/v1',
          model: 'local-test',
          protocol: 'chat-completions',
        },
        targetWords: 1200,
      }),
    );

    expect(result.report.completedNodeGoals).toContain('取得第一份证词');
    expect(capturedPrompt).toContain('公开被抹除的历史');
    expect(await db.select().from(chapters).where(eq(chapters.storyNodeId, node.id))).toHaveLength(
      0,
    );
    expect(
      (
        await db.select().from(storylineMilestones).where(eq(storylineMilestones.id, milestone.id))
      )[0]?.progress,
    ).toBe(0);
  });
});

async function post(path: string, body: unknown) {
  return request(path, 'POST', body);
}

async function put(path: string, body: unknown) {
  return request(path, 'PUT', body);
}

async function request(path: string, method: string, body: unknown) {
  const response = await app.request(path, {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    method,
  });
  expect(response.ok).toBe(true);
  return response.json();
}
