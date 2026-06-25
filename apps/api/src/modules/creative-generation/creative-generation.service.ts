import { and, eq } from 'drizzle-orm';

import type { CreativeGenerationRequest, CreativeGenerationResult } from '@storyverse/contracts';

import type { Database } from '../../db/client.js';
import {
  characters,
  generationRuns,
  loreEntries,
  projects,
  storyBibles,
  storylines,
} from '../../db/schema.js';
import type { AiSettingsService } from '../ai-settings/ai-settings.service.js';
import type { TextGenerationProvider } from '../ai/ai.provider.js';
import { generateStructured } from '../ai/structured-generation.js';
import { CreativeResourceNotFoundError } from '../creative/creative.service.js';

export class CreativeGenerationService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
    private readonly settings: AiSettingsService,
    private readonly provider: TextGenerationProvider,
  ) {}

  async generate(
    projectId: string,
    input: CreativeGenerationRequest,
  ): Promise<CreativeGenerationResult> {
    await this.assertProject(projectId);
    const config = await this.settings.providerConfig(input.providerId);
    const context = await this.context(projectId);
    const [run] = await this.db
      .insert(generationRuns)
      .values({
        input: { instructions: input.instructions ?? '', taskType: input.taskType },
        ownerId: this.ownerId,
        projectId,
        providerId: input.providerId,
        startedAt: new Date(),
        status: 'running',
        taskType: input.taskType,
      })
      .returning({ id: generationRuns.id });
    if (!run) throw new Error('Could not create generation run.');
    try {
      const candidate = await generateStructured(
        this.provider,
        config,
        buildPrompt(input.taskType, context, input.instructions),
        parseJson,
      );
      await this.db
        .update(generationRuns)
        .set({
          completedAt: new Date(),
          output: candidate,
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(generationRuns.id, run.id));
      return { candidate, runId: run.id, taskType: input.taskType };
    } catch (cause) {
      await this.db
        .update(generationRuns)
        .set({
          completedAt: new Date(),
          error: cause instanceof Error ? cause.message : 'Unknown generation error.',
          status: 'failed',
          updatedAt: new Date(),
        })
        .where(eq(generationRuns.id, run.id));
      throw cause;
    }
  }

  private async context(projectId: string) {
    const [bible, lore, characterRows, lines] = await Promise.all([
      this.db.select().from(storyBibles).where(eq(storyBibles.projectId, projectId)).limit(1),
      this.db.select().from(loreEntries).where(eq(loreEntries.projectId, projectId)),
      this.db.select().from(characters).where(eq(characters.projectId, projectId)),
      this.db.select().from(storylines).where(eq(storylines.projectId, projectId)),
    ]);
    return { bible: bible[0] ?? null, characters: characterRows, lore, storylines: lines };
  }

  private async assertProject(projectId: string) {
    const [project] = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, this.ownerId)))
      .limit(1);
    if (!project) throw new CreativeResourceNotFoundError();
  }
}

function buildPrompt(
  taskType: CreativeGenerationRequest['taskType'],
  context: unknown,
  instructions?: string,
) {
  const formats = {
    'bible.generate': {
      characterRules: '',
      endingDirection: '',
      plotGoals: '',
      prohibitedContent: '',
      writingStyle: '',
      worldRules: '',
    },
    'character.generate': {
      appearance: '',
      bio: '',
      name: '',
      personality: '',
      voiceSamples: [''],
    },
    'lore.generate': {
      category: 'custom',
      description: '',
      detail: '',
      name: '',
      tags: [''],
    },
    'storyline.generate': {
      description: '',
      endingGoal: '',
      generationConstraints: [''],
      milestones: [{ description: '', title: '' }],
      title: '',
    },
  };
  return [
    '你是 StoryVerse 结构化创作助手。只输出一个 JSON 对象，不要输出 Markdown。',
    `任务：${taskType}`,
    `输出格式：${JSON.stringify(formats[taskType])}`,
    `现有项目上下文：${JSON.stringify(context)}`,
    `作者要求：${instructions ?? '基于现有内容生成连贯候选。'}`,
  ].join('\n\n');
}

function parseJson(value: string): Record<string, unknown> {
  const text = value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('AI output must be a JSON object.');
  }
  return parsed as Record<string, unknown>;
}
