import { inArray } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  characterRelationSchema,
  characterSchema,
  loreEntrySchema,
  storylineMilestoneSchema,
  storylineSchema,
  storyBibleSchema,
  storyNodeSchema,
  worldRuleSchema,
} from '@storyverse/contracts';

import { createApp } from '../../app.js';
import { createDatabase } from '../../db/client.js';
import { getDatabaseUrl } from '../../db/config.js';
import { projects } from '../../db/schema.js';
import { DrizzleProjectRepository } from '../projects/project.repository.js';
import { ProjectService } from '../projects/project.service.js';
import { ensureLocalUser } from '../users/local-user.js';
import { CreativeService } from './creative.service.js';

const { db, pool } = createDatabase(getDatabaseUrl());
const migrationsFolder = fileURLToPath(new URL('../../../drizzle', import.meta.url));
const createdProjectIds: string[] = [];
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  await migrate(db, { migrationsFolder });
  const localUser = await ensureLocalUser(db);
  app = createApp({
    creativeService: new CreativeService(db, localUser.id),
    projectService: new ProjectService(new DrizzleProjectRepository(db), localUser.id),
  });
});

afterEach(async () => {
  if (createdProjectIds.length > 0) {
    await db.delete(projects).where(inArray(projects.id, createdProjectIds.splice(0)));
  }
});

afterAll(async () => pool.end());

describe('Creative workspace API integration', () => {
  it('persists bible, rules, lore, characters, relations, storylines, milestones and nodes', async () => {
    const projectId = await createProject('集成测试故事');

    const bible = storyBibleSchema.parse(
      await json(`/projects/${projectId}/bible`, 'PUT', {
        endingDirection: '主角回到故乡并公开真相',
        plotGoals: '逐步揭开王国历史',
      }),
    );
    expect(bible.endingDirection).toContain('故乡');

    const rule = worldRuleSchema.parse(
      await json(`/projects/${projectId}/world-rules`, 'POST', {
        category: 'ability',
        condition: '使用记忆魔法',
        result: '施法者会遗忘同等重要的往事',
      }),
    );
    const lore = loreEntrySchema.parse(
      await json(`/projects/${projectId}/lore`, 'POST', {
        injectToAi: true,
        name: '记忆魔法',
      }),
    );
    const hero = characterSchema.parse(
      await json(`/projects/${projectId}/characters`, 'POST', { name: '林岚' }),
    );
    const guide = characterSchema.parse(
      await json(`/projects/${projectId}/characters`, 'POST', { name: '守门人' }),
    );
    const relation = characterRelationSchema.parse(
      await json(`/projects/${projectId}/character-relations`, 'POST', {
        relationType: '秘密盟友',
        sourceCharacterId: hero.id,
        targetCharacterId: guide.id,
      }),
    );
    const storyline = storylineSchema.parse(
      await json(`/projects/${projectId}/storylines`, 'POST', {
        endingGoal: '公开被抹除的历史',
        title: '失落记忆主线',
      }),
    );
    const milestone = storylineMilestoneSchema.parse(
      await json(`/storylines/${storyline.id}/milestones`, 'POST', {
        sortOrder: 0,
        title: '获得第一段证词',
      }),
    );
    const node = storyNodeSchema.parse(
      await json(`/projects/${projectId}/story-nodes`, 'POST', {
        characterIds: [hero.id, guide.id],
        loreEntryIds: [lore.id],
        milestoneId: milestone.id,
        nodeGoal: '取得证词并开始怀疑官方历史',
        requiredEvents: ['守门人交出证词'],
        sortOrder: 0,
        storylineId: storyline.id,
        title: '雾港会面',
      }),
    );

    expect(node.characterIds).toEqual(expect.arrayContaining([hero.id, guide.id]));
    expect(node.loreEntryIds).toEqual([lore.id]);
    expect(relation.projectId).toBe(projectId);
    expect(rule.projectId).toBe(projectId);
  });

  it('rejects StoryNode references from another project', async () => {
    const firstProjectId = await createProject('项目甲');
    const secondProjectId = await createProject('项目乙');
    const foreignCharacter = characterSchema.parse(
      await json(`/projects/${secondProjectId}/characters`, 'POST', { name: '外部角色' }),
    );

    const response = await request(`/projects/${firstProjectId}/story-nodes`, 'POST', {
      characterIds: [foreignCharacter.id],
      sortOrder: 0,
      title: '非法节点',
    });

    expect(response.status).toBe(409);
  });
});

async function createProject(name: string): Promise<string> {
  const result = (await json('/projects', 'POST', { name })) as { id: string };
  createdProjectIds.push(result.id);
  return result.id;
}

async function json(path: string, method: string, body: unknown): Promise<unknown> {
  const response = await request(path, method, body);
  expect(response.ok).toBe(true);
  return response.json();
}

function request(path: string, method: string, body: unknown) {
  return app.request(path, {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    method,
  });
}
