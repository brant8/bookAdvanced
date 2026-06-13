import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { inArray } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { apiErrorSchema, projectListSchema, projectSchema } from '@storyverse/contracts';

import { createApp } from '../../app.js';
import { createDatabase } from '../../db/client.js';
import { getDatabaseUrl } from '../../db/config.js';
import { projects } from '../../db/schema.js';
import { DrizzleProjectRepository } from './project.repository.js';
import { ProjectService } from './project.service.js';
import { ensureLocalUser } from '../users/local-user.js';

const { db, pool } = createDatabase(getDatabaseUrl());
const migrationsFolder = fileURLToPath(new URL('../../../drizzle', import.meta.url));
const createdProjectIds: string[] = [];
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  await migrate(db, { migrationsFolder });
  const localUser = await ensureLocalUser(db);
  const repository = new DrizzleProjectRepository(db);
  app = createApp({
    projectService: new ProjectService(repository, localUser.id),
  });
});

afterEach(async () => {
  if (createdProjectIds.length === 0) {
    return;
  }

  await db.delete(projects).where(inArray(projects.id, createdProjectIds.splice(0)));
});

afterAll(async () => {
  await pool.end();
});

describe('Project API integration', () => {
  it('creates, lists, reads, updates and deletes a local project', async () => {
    const createResponse = await app.request('/projects', {
      body: JSON.stringify({
        description: '数据库集成测试项目',
        name: '  测试   星球  ',
        styleSamples: [' 简洁 ', ''],
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    const created = projectSchema.parse(await createResponse.json());
    createdProjectIds.push(created.id);

    expect(createResponse.status).toBe(201);
    expect(created.name).toBe('测试 星球');
    expect(created.styleSamples).toEqual(['简洁']);

    const listResponse = await app.request('/projects');
    const listed = projectListSchema.parse(await listResponse.json());

    expect(listed.some((project) => project.id === created.id)).toBe(true);

    const getResponse = await app.request(`/projects/${created.id}`);
    expect(projectSchema.parse(await getResponse.json()).id).toBe(created.id);

    const updateResponse = await app.request(`/projects/${created.id}`, {
      body: JSON.stringify({ description: '已更新' }),
      headers: { 'content-type': 'application/json' },
      method: 'PATCH',
    });
    expect(projectSchema.parse(await updateResponse.json()).description).toBe('已更新');

    const deleteResponse = await app.request(`/projects/${created.id}`, {
      method: 'DELETE',
    });
    expect(deleteResponse.status).toBe(204);

    const missingResponse = await app.request(`/projects/${created.id}`);
    const missing = apiErrorSchema.parse(await missingResponse.json());

    expect(missingResponse.status).toBe(404);
    expect(missing.error.code).toBe('PROJECT_NOT_FOUND');
  });

  it('returns a validation error for an invalid payload', async () => {
    const response = await app.request('/projects', {
      body: JSON.stringify({ name: '' }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    expect(response.status).toBe(400);
    expect(apiErrorSchema.parse(await response.json()).error.code).toBe('VALIDATION_ERROR');
  });
});
