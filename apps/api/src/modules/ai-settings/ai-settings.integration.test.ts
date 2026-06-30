import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase } from '../../db/client.js';
import { getDatabaseUrl } from '../../db/config.js';
import { generationRuns, projects, users } from '../../db/schema.js';
import type { TextGenerationProvider } from '../ai/ai.provider.js';
import { AiSettingsService } from './ai-settings.service.js';

const { db, pool } = createDatabase(getDatabaseUrl());
const migrationsFolder = fileURLToPath(new URL('../../../drizzle', import.meta.url));

beforeAll(async () => migrate(db, { migrationsFolder }));
afterAll(async () => pool.end());

describe('AiSettingsService integration', () => {
  it('encrypts Provider secrets and never returns them in list responses', async () => {
    const [owner] = await db
      .insert(users)
      .values({ displayName: 'AI settings owner', isLocal: false })
      .returning();
    expect(owner).toBeDefined();
    const service = new AiSettingsService(db, owner!.id);
    const provider = await service.createProvider({
      apiKey: 'test-secret-key',
      baseUrl: 'http://localhost:11434/v1',
      defaultModel: 'qwen-test',
      enabled: true,
      kind: 'text',
      models: ['qwen-test'],
      name: 'Test Ollama',
      protocol: 'chat-completions',
    });
    expect(provider.hasApiKey).toBe(true);
    expect(JSON.stringify(await service.listProviders())).not.toContain('test-secret-key');
    expect((await service.providerConfig(provider.id)).apiKey).toBe('test-secret-key');
    await service.updateProvider(provider.id, { enabled: false });
    const renamed = await service.updateProvider(provider.id, { name: 'Renamed Provider' });
    expect(renamed.enabled).toBe(false);
    await expect(service.providerConfig(provider.id)).rejects.toThrow();
    await service.deleteProvider(provider.id);
    await db.delete(users).where(eq(users.id, owner!.id));
  });

  it('tests text providers and summarizes generation risk without running images', async () => {
    const [owner] = await db
      .insert(users)
      .values({ displayName: 'AI usage owner', isLocal: false })
      .returning();
    const [project] = await db
      .insert(projects)
      .values({ name: 'AI usage project', ownerId: owner!.id })
      .returning();
    const fakeProvider: TextGenerationProvider = {
      async generate() {
        return '{"ok":true}';
      },
    };
    const service = new AiSettingsService(db, owner!.id, fakeProvider);
    const text = await service.createProvider({
      baseUrl: 'https://openrouter.ai/api/v1',
      defaultModel: 'cohere/north-mini-code:free',
      enabled: true,
      kind: 'text',
      models: ['cohere/north-mini-code:free'],
      name: 'Free Text',
      protocol: 'chat-completions',
    });
    const image = await service.createProvider({
      apiKey: 'image-key',
      baseUrl: 'https://openrouter.ai/api/v1',
      defaultModel: 'black-forest-labs/flux.2-klein-4b',
      enabled: false,
      kind: 'image',
      models: ['black-forest-labs/flux.2-klein-4b'],
      name: 'Paid Image',
      protocol: 'openrouter-images',
    });
    await db.insert(generationRuns).values({
      error: 'bad json',
      ownerId: owner!.id,
      projectId: project!.id,
      status: 'failed',
      taskType: 'chapter.generate',
    });
    await db.insert(generationRuns).values({
      ownerId: owner!.id,
      projectId: project!.id,
      status: 'completed',
      taskType: 'chapter.generate',
    });

    expect((await service.testProvider(text.id)).ok).toBe(true);
    const imageTest = await service.testProvider(image.id);
    expect(imageTest.ok).toBe(false);
    expect(imageTest.risk).toBe('disabled');
    const summary = await service.usageSummary(project!.id);
    expect(summary.totalRuns).toBe(2);
    expect(summary.failedCount).toBe(1);
    expect(summary.providerRisks.find((risk) => risk.id === text.id)?.risk).toBe('free');
    expect(summary.providerRisks.find((risk) => risk.id === image.id)?.risk).toBe('disabled');

    await db.delete(projects).where(eq(projects.id, project!.id));
    await db.delete(users).where(eq(users.id, owner!.id));
  });
});
