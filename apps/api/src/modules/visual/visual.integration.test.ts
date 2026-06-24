import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase } from '../../db/client.js';
import { getDatabaseUrl } from '../../db/config.js';
import { projects, storyNodes, users } from '../../db/schema.js';
import { VisualService } from './visual.service.js';

const { db, pool } = createDatabase(getDatabaseUrl());
const migrationsFolder = fileURLToPath(new URL('../../../drizzle', import.meta.url));
const uploadDir = fileURLToPath(new URL('../../../../../.tmp/visual-test', import.meta.url));

beforeAll(async () => migrate(db, { migrationsFolder }));
afterAll(async () => pool.end());

describe('VisualService integration', () => {
  it('persists scene data, abilities, local assets and storyboard shots', async () => {
    const [owner] = await db
      .insert(users)
      .values({ displayName: 'Visual test owner', isLocal: false })
      .returning();
    const [project] = await db
      .insert(projects)
      .values({ name: 'Visual test', ownerId: owner!.id })
      .returning();
    const [node] = await db
      .insert(storyNodes)
      .values({ projectId: project!.id, sortOrder: 0, title: 'Opening shot' })
      .returning();
    const service = new VisualService(db, owner!.id, undefined, undefined, uploadDir);
    const scene = await service.upsertScene(node!.id, {
      atmosphere: 'quiet',
      location: 'observatory',
      visualPrompt: 'purple night sky',
    });
    expect(scene.location).toBe('observatory');
    const asset = await service.upload(
      project!.id,
      new File([new Uint8Array([137, 80, 78, 71])], 'test.png', { type: 'image/png' }),
      { kind: 'scene', name: 'test image' },
    );
    expect((await service.file(asset.id)).bytes.length).toBe(4);
    const board = await service.generateStoryboard(project!.id);
    expect(board.shots).toHaveLength(1);
    await service.deleteAsset(asset.id);
    await db.delete(projects).where(eq(projects.id, project!.id));
    await db.delete(users).where(eq(users.id, owner!.id));
  });
});
