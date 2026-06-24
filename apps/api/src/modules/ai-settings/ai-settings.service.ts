import { and, desc, eq, lt } from 'drizzle-orm';

import type {
  AiProvider,
  GenerationRun,
  SaveAiProviderInput,
  UpdateAiProviderInput,
} from '@storyverse/contracts';

import type { Database } from '../../db/client.js';
import { aiProviders, generationRuns } from '../../db/schema.js';
import { decryptSecret, encryptSecret } from './secret-box.js';

export class AiSettingsNotFoundError extends Error {}

export class AiSettingsService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
  ) {}

  async listProviders(): Promise<AiProvider[]> {
    const rows = await this.db
      .select()
      .from(aiProviders)
      .where(eq(aiProviders.ownerId, this.ownerId))
      .orderBy(aiProviders.kind, aiProviders.name);
    return rows.map(providerDto);
  }

  async createProvider(input: SaveAiProviderInput): Promise<AiProvider> {
    const [row] = await this.db
      .insert(aiProviders)
      .values({
        ...input,
        encryptedApiKey: input.apiKey ? encryptSecret(input.apiKey) : null,
        ownerId: this.ownerId,
      })
      .returning();
    if (!row) throw new AiSettingsNotFoundError();
    return providerDto(row);
  }

  async updateProvider(id: string, input: UpdateAiProviderInput): Promise<AiProvider> {
    const { apiKey, ...values } = input;
    const [row] = await this.db
      .update(aiProviders)
      .set({
        ...values,
        ...(apiKey === undefined ? {} : { encryptedApiKey: apiKey ? encryptSecret(apiKey) : null }),
        updatedAt: new Date(),
      })
      .where(and(eq(aiProviders.id, id), eq(aiProviders.ownerId, this.ownerId)))
      .returning();
    if (!row) throw new AiSettingsNotFoundError();
    return providerDto(row);
  }

  async deleteProvider(id: string) {
    const [row] = await this.db
      .delete(aiProviders)
      .where(and(eq(aiProviders.id, id), eq(aiProviders.ownerId, this.ownerId)))
      .returning({ id: aiProviders.id });
    if (!row) throw new AiSettingsNotFoundError();
  }

  async providerConfig(id: string) {
    const [row] = await this.db
      .select()
      .from(aiProviders)
      .where(
        and(
          eq(aiProviders.id, id),
          eq(aiProviders.ownerId, this.ownerId),
          eq(aiProviders.kind, 'text'),
          eq(aiProviders.enabled, true),
        ),
      )
      .limit(1);
    if (!row) throw new AiSettingsNotFoundError();
    return {
      apiKey: row.encryptedApiKey ? decryptSecret(row.encryptedApiKey) : undefined,
      baseUrl: row.baseUrl,
      model: row.defaultModel,
      protocol: row.protocol as 'chat-completions' | 'responses',
    };
  }

  async listRuns(projectId?: string): Promise<GenerationRun[]> {
    await this.failStaleRuns();
    const where = projectId
      ? and(eq(generationRuns.ownerId, this.ownerId), eq(generationRuns.projectId, projectId))
      : eq(generationRuns.ownerId, this.ownerId);
    const rows = await this.db
      .select()
      .from(generationRuns)
      .where(where)
      .orderBy(desc(generationRuns.createdAt))
      .limit(100);
    return rows.map(runDto);
  }

  async reviewRun(id: string, status: 'approved' | 'rejected'): Promise<GenerationRun> {
    const [row] = await this.db
      .update(generationRuns)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(generationRuns.id, id), eq(generationRuns.ownerId, this.ownerId)))
      .returning();
    if (!row) throw new AiSettingsNotFoundError();
    return runDto(row);
  }

  private async failStaleRuns() {
    const timeoutMs = Number.parseInt(process.env.STORYVERSE_GENERATION_TIMEOUT_MS ?? '600000', 10);
    const cutoff = new Date(Date.now() - timeoutMs);
    await this.db
      .update(generationRuns)
      .set({
        completedAt: new Date(),
        error: 'Generation task timed out before completion.',
        status: 'failed',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(generationRuns.ownerId, this.ownerId),
          eq(generationRuns.status, 'running'),
          lt(generationRuns.startedAt, cutoff),
        ),
      );
  }
}

function providerDto(row: typeof aiProviders.$inferSelect): AiProvider {
  return {
    baseUrl: row.baseUrl,
    createdAt: row.createdAt.toISOString(),
    defaultModel: row.defaultModel,
    enabled: row.enabled,
    hasApiKey: Boolean(row.encryptedApiKey),
    id: row.id,
    kind: row.kind,
    models: row.models,
    name: row.name,
    protocol: row.protocol,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function runDto(row: typeof generationRuns.$inferSelect): GenerationRun {
  return {
    createdAt: row.createdAt.toISOString(),
    error: row.error,
    id: row.id,
    input: row.input,
    output: row.output,
    projectId: row.projectId,
    providerId: row.providerId,
    status: row.status,
    taskType: row.taskType,
    updatedAt: row.updatedAt.toISOString(),
  };
}
