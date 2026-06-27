import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import {
  generatedChapterSchema,
  type GenerateChapterInput,
  type GeneratedChapter,
} from '@storyverse/contracts';
import { buildChapterGenerationPrompt, type GenerationContext } from '@storyverse/domain';

import type { Database } from '../../db/client.js';
import {
  chapters,
  characters,
  foreshadows,
  generationRuns,
  loreEntries,
  projects,
  storyBibles,
  storylineMilestones,
  storylines,
  storyNodeCharacters,
  storyNodeLoreEntries,
  storyNodes,
} from '../../db/schema.js';
import { CreativeResourceNotFoundError } from '../creative/creative.service.js';
import type { TextGenerationProvider } from './ai.provider.js';
import { generateStructured } from './structured-generation.js';

export class AiService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
    private readonly provider: TextGenerationProvider,
  ) {}

  async generateChapter(nodeId: string, input: GenerateChapterInput): Promise<GeneratedChapter> {
    const [node] = await this.db
      .select({ projectId: storyNodes.projectId })
      .from(storyNodes)
      .where(eq(storyNodes.id, nodeId))
      .limit(1);
    if (!node) throw new CreativeResourceNotFoundError();
    await this.assertProject(node.projectId);
    const [run] = await this.db
      .insert(generationRuns)
      .values({
        input: {
          extraInstructions: input.extraInstructions,
          nodeId,
          targetWords: input.targetWords,
        },
        ownerId: this.ownerId,
        projectId: node.projectId,
        startedAt: new Date(),
        status: 'running',
        taskType: 'chapter.generate',
      })
      .returning({ id: generationRuns.id });
    try {
      const context = await this.buildContext(nodeId, input);
      const generated = await generateStructured(
        this.provider,
        input.provider,
        buildChapterGenerationPrompt(context),
        (output) => generatedChapterSchema.parse(parseModelJson(output)),
        { jsonMode: 'object' },
      );
      if (run) {
        await this.db
          .update(generationRuns)
          .set({
            completedAt: new Date(),
            output: generated,
            status: 'completed',
            updatedAt: new Date(),
          })
          .where(eq(generationRuns.id, run.id));
      }
      return generated;
    } catch (cause) {
      if (run) {
        await this.db
          .update(generationRuns)
          .set({
            completedAt: new Date(),
            error: cause instanceof Error ? cause.message : 'Unknown generation error.',
            status: 'failed',
            updatedAt: new Date(),
          })
          .where(eq(generationRuns.id, run.id));
      }
      throw cause;
    }
  }

  async previewContext(nodeId: string, targetWords = 1500): Promise<GenerationContext> {
    return this.buildContext(nodeId, {
      targetWords,
    });
  }

  private async buildContext(
    nodeId: string,
    input: Pick<GenerateChapterInput, 'targetWords' | 'extraInstructions'>,
  ): Promise<GenerationContext> {
    const [node] = await this.db
      .select()
      .from(storyNodes)
      .where(eq(storyNodes.id, nodeId))
      .limit(1);
    if (!node) throw new CreativeResourceNotFoundError();
    await this.assertProject(node.projectId);

    const [
      bibleRows,
      storylineRows,
      characterLinks,
      loreLinks,
      foreshadowRows,
      chapterRows,
      nextRows,
    ] = await Promise.all([
      this.db.select().from(storyBibles).where(eq(storyBibles.projectId, node.projectId)).limit(1),
      node.storylineId
        ? this.db.select().from(storylines).where(eq(storylines.id, node.storylineId)).limit(1)
        : Promise.resolve([]),
      this.db
        .select({ id: storyNodeCharacters.characterId })
        .from(storyNodeCharacters)
        .where(eq(storyNodeCharacters.storyNodeId, node.id)),
      this.db
        .select({ id: storyNodeLoreEntries.loreEntryId })
        .from(storyNodeLoreEntries)
        .where(eq(storyNodeLoreEntries.storyNodeId, node.id)),
      this.db
        .select()
        .from(foreshadows)
        .where(and(eq(foreshadows.projectId, node.projectId), eq(foreshadows.status, 'planted'))),
      this.db
        .select({ summary: chapters.summary })
        .from(chapters)
        .where(eq(chapters.projectId, node.projectId))
        .orderBy(desc(chapters.chapterNumber))
        .limit(5),
      this.db
        .select()
        .from(storyNodes)
        .where(
          and(
            eq(storyNodes.projectId, node.projectId),
            eq(storyNodes.sortOrder, node.sortOrder + 1),
          ),
        )
        .limit(1),
    ]);

    const storyline = storylineRows[0] ?? null;
    const [characterRows, loreRows, milestoneRows] = await Promise.all([
      characterLinks.length
        ? this.db
            .select()
            .from(characters)
            .where(
              inArray(
                characters.id,
                characterLinks.map(({ id }) => id),
              ),
            )
        : Promise.resolve([]),
      loreLinks.length
        ? this.db
            .select()
            .from(loreEntries)
            .where(
              inArray(
                loreEntries.id,
                loreLinks.map(({ id }) => id),
              ),
            )
        : Promise.resolve([]),
      storyline
        ? this.db
            .select()
            .from(storylineMilestones)
            .where(eq(storylineMilestones.storylineId, storyline.id))
            .orderBy(asc(storylineMilestones.sortOrder))
        : Promise.resolve([]),
    ]);

    const bible = bibleRows[0];
    const next = nextRows[0];
    return {
      bible: bible
        ? {
            characterRules: bible.characterRules,
            endingDirection: bible.endingDirection,
            plotGoals: bible.plotGoals,
            prohibitedContent: bible.prohibitedContent,
            writingStyle: bible.writingStyle,
            worldRules: bible.worldRules,
          }
        : null,
      chapterSummaries: chapterRows.map(({ summary }) => summary).filter(Boolean),
      characters: characterRows.map(({ name, bio, personality }) => ({ name, bio, personality })),
      extraInstructions: input.extraInstructions,
      foreshadows: foreshadowRows.map(({ title, description, status }) => ({
        title,
        description,
        status,
      })),
      lore: loreRows.map(({ name, description, detail }) => ({ name, description, detail })),
      milestones: milestoneRows.map(({ title, description, status, progress }) => ({
        title,
        description,
        status,
        progress,
      })),
      nextNode: next ? { title: next.title, summary: next.summary, nodeGoal: next.nodeGoal } : null,
      node: {
        conflict: node.conflict,
        description: node.description,
        nodeGoal: node.nodeGoal,
        requiredEvents: node.requiredEvents,
        summary: node.summary,
        title: node.title,
      },
      storyline: storyline
        ? {
            description: storyline.description,
            endingGoal: storyline.endingGoal,
            generationConstraints: storyline.generationConstraints,
            title: storyline.title,
          }
        : null,
      targetWords: input.targetWords,
    };
  }

  private async assertProject(projectId: string): Promise<void> {
    const [project] = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, this.ownerId)))
      .limit(1);
    if (!project) throw new CreativeResourceNotFoundError();
  }
}

function parseModelJson(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  return JSON.parse(trimmed);
}
