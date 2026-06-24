import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase } from '../../db/client.js';
import { getDatabaseUrl } from '../../db/config.js';
import { users } from '../../db/schema.js';
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
    await service.deleteProvider(provider.id);
    await db.delete(users).where(eq(users.id, owner!.id));
  });
});
