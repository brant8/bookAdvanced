import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AiProviderConfig } from '@storyverse/contracts';

import { createDatabase } from '../../db/client.js';
import { getDatabaseUrl } from '../../db/config.js';
import { generationRuns, projects, users } from '../../db/schema.js';
import { AiSettingsService } from '../ai-settings/ai-settings.service.js';
import type { TextGenerationProvider } from '../ai/ai.provider.js';
import { CreativeGenerationService } from './creative-generation.service.js';

const { db, pool } = createDatabase(getDatabaseUrl());
const migrationsFolder = fileURLToPath(new URL('../../../drizzle', import.meta.url));

class FakeProvider implements TextGenerationProvider {
  async generate(config: AiProviderConfig) {
    void config;
    return JSON.stringify({
      appearance: 'silver hair',
      bio: 'A navigator',
      name: 'Lin',
      personality: 'calm',
      voiceSamples: ['We keep moving.'],
    });
  }
}

beforeAll(async () => migrate(db, { migrationsFolder }));
afterAll(async () => pool.end());

describe('CreativeGenerationService integration', () => {
  it('returns a structured candidate and records the generation run', async () => {
    const [owner] = await db
      .insert(users)
      .values({ displayName: 'Generation test owner', isLocal: false })
      .returning();
    const [project] = await db
      .insert(projects)
      .values({ name: 'Generation test', ownerId: owner!.id })
      .returning();
    const settings = new AiSettingsService(db, owner!.id);
    const provider = await settings.createProvider({
      baseUrl: 'http://localhost:11434/v1',
      defaultModel: 'test',
      enabled: true,
      kind: 'text',
      models: ['test'],
      name: 'Fake',
      protocol: 'chat-completions',
    });
    const service = new CreativeGenerationService(db, owner!.id, settings, new FakeProvider());
    const result = await service.generate(project!.id, {
      providerId: provider.id,
      taskType: 'character.generate',
    });
    expect(result.candidate.name).toBe('Lin');
    const [run] = await db.select().from(generationRuns).where(eq(generationRuns.id, result.runId));
    expect(run?.status).toBe('completed');
    await db.delete(projects).where(eq(projects.id, project!.id));
    await db.delete(users).where(eq(users.id, owner!.id));
  });
});
