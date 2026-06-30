import { and, desc, eq, lt } from 'drizzle-orm';

import type {
  AiProvider,
  AiProviderTest,
  AiUsageSummary,
  GenerationRun,
  SaveAiProviderInput,
  UpdateAiProviderInput,
} from '@storyverse/contracts';

import type { Database } from '../../db/client.js';
import { aiProviders, generationRuns } from '../../db/schema.js';
import type { TextGenerationProvider } from '../ai/ai.provider.js';
import { decryptSecret, encryptSecret } from './secret-box.js';

export class AiSettingsNotFoundError extends Error {}

export class AiSettingsService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
    private readonly textProvider?: TextGenerationProvider,
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

  async testProvider(id: string): Promise<AiProviderTest> {
    const [row] = await this.db
      .select()
      .from(aiProviders)
      .where(and(eq(aiProviders.id, id), eq(aiProviders.ownerId, this.ownerId)))
      .limit(1);
    if (!row) throw new AiSettingsNotFoundError();

    const risk = providerRisk(providerDto(row));
    if (!row.enabled) {
      return testDto(id, false, null, 'Provider 已禁用，未执行试运行。', 'disabled');
    }
    if (row.kind === 'image') {
      return testDto(
        id,
        false,
        null,
        '图片 Provider 可能产生费用；健康检查只确认配置存在，不主动生成图片。',
        risk,
      );
    }
    if (!this.textProvider) {
      return testDto(id, false, null, '服务未配置文本 Provider 执行器。', risk);
    }

    const started = Date.now();
    try {
      const output = await this.textProvider.generate(
        {
          apiKey: row.encryptedApiKey ? decryptSecret(row.encryptedApiKey) : undefined,
          baseUrl: row.baseUrl,
          model: row.defaultModel,
          protocol: row.protocol as 'chat-completions' | 'responses',
        },
        'Return only JSON: {"ok":true,"service":"storyverse"}',
        { jsonMode: 'object' },
      );
      return testDto(
        id,
        output.trim().length > 0,
        Date.now() - started,
        '文本 Provider 试运行成功。',
        risk,
      );
    } catch (cause) {
      return testDto(
        id,
        false,
        Date.now() - started,
        cause instanceof Error ? cause.message : 'Provider 试运行失败。',
        risk,
      );
    }
  }

  async usageSummary(projectId?: string): Promise<AiUsageSummary> {
    await this.failStaleRuns();
    const runWhere = projectId
      ? and(eq(generationRuns.ownerId, this.ownerId), eq(generationRuns.projectId, projectId))
      : eq(generationRuns.ownerId, this.ownerId);
    const [runRows, providerRows] = await Promise.all([
      this.db.select().from(generationRuns).where(runWhere).orderBy(desc(generationRuns.createdAt)),
      this.db.select().from(aiProviders).where(eq(aiProviders.ownerId, this.ownerId)),
    ]);
    const statusCounts: Record<string, number> = {};
    const taskCounts: Record<string, number> = {};
    for (const run of runRows) {
      statusCounts[run.status] = (statusCounts[run.status] ?? 0) + 1;
      taskCounts[run.taskType] = (taskCounts[run.taskType] ?? 0) + 1;
    }
    const completed = statusCounts.completed ?? 0;
    const failed = statusCounts.failed ?? 0;
    return {
      failedCount: failed,
      generatedAt: new Date().toISOString(),
      providerRisks: providerRows.map((row) => {
        const provider = providerDto(row);
        const risk = providerRisk(provider);
        return {
          defaultModel: provider.defaultModel,
          enabled: provider.enabled,
          id: provider.id,
          kind: provider.kind,
          name: provider.name,
          note: providerRiskNote(provider, risk),
          risk,
        };
      }),
      recentFailures: runRows
        .filter((run) => run.status === 'failed' && run.error)
        .slice(0, 5)
        .map((run) => ({
          createdAt: run.createdAt.toISOString(),
          error: run.error ?? '',
          id: run.id,
          taskType: run.taskType,
        })),
      runningCount: statusCounts.running ?? 0,
      statusCounts,
      successRate: completed + failed === 0 ? 1 : completed / (completed + failed),
      taskCounts,
      totalRuns: runRows.length,
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

function testDto(
  id: string,
  ok: boolean,
  latencyMs: number | null,
  message: string,
  risk: AiProviderTest['risk'],
): AiProviderTest {
  return {
    checkedAt: new Date().toISOString(),
    id,
    latencyMs,
    message,
    ok,
    risk,
  };
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

function providerRisk(provider: AiProvider): AiProviderTest['risk'] {
  if (!provider.enabled) return 'disabled';
  const model = provider.defaultModel.toLowerCase();
  const baseUrl = provider.baseUrl.toLowerCase();
  if (model.includes(':free') || model === 'openrouter/free' || baseUrl.includes('localhost')) {
    return 'free';
  }
  if (provider.kind === 'image') return 'paid';
  if (baseUrl.includes('openrouter.ai')) return 'low';
  return 'unknown';
}

function providerRiskNote(provider: AiProvider, risk: AiProviderTest['risk']): string {
  if (risk === 'disabled') return '已禁用，不会产生调用费用。';
  if (risk === 'free') return '看起来是本地或免费模型，仍建议先小请求试运行。';
  if (risk === 'paid') return '图片生成通常按张计费，当前不会自动健康试图生成图片。';
  if (risk === 'low') return '文本模型可能按 token 计费，建议控制最大输出 token。';
  return `无法判断 ${provider.defaultModel} 的费用风险，请以 Provider 控制台为准。`;
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
