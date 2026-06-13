import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';

import type {
  CreateForeshadowInput,
  CreateInspirationInput,
  ExportDocument,
  Foreshadow,
  Inspiration,
  ProjectSnapshot,
  ProjectStats,
  SaveChapterInput,
  UpdateForeshadowInput,
  UpdateInspirationInput,
} from '@storyverse/contracts';

import type { Database } from '../../db/client.js';
import {
  chapters,
  characterRelations,
  characters,
  foreshadows,
  inspirations,
  loreEntries,
  projectSnapshots,
  projects,
  storyBibles,
  storylineMilestones,
  storylines,
  storyNodeCharacters,
  storyNodeLoreEntries,
  storyNodes,
  worldRules,
} from '../../db/schema.js';
import {
  CreativeResourceConflictError,
  CreativeResourceNotFoundError,
} from '../creative/creative.service.js';

export class WorkspaceService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
  ) {}

  async getChapter(nodeId: string) {
    const node = await this.ownedNode(nodeId);
    const [chapter] = await this.db
      .select()
      .from(chapters)
      .where(and(eq(chapters.storyNodeId, nodeId), eq(chapters.projectId, node.projectId)))
      .limit(1);
    return chapter ? dto(chapter) : null;
  }

  async saveChapter(nodeId: string, input: SaveChapterInput) {
    const node = await this.ownedNode(nodeId);
    const wordCount = countWords(input.content);
    const [chapter] = await this.db
      .insert(chapters)
      .values({ ...input, projectId: node.projectId, storyNodeId: nodeId, wordCount })
      .onConflictDoUpdate({
        target: chapters.storyNodeId,
        set: {
          ...input,
          revision: sql`${chapters.revision} + 1`,
          updatedAt: new Date(),
          wordCount,
        },
      })
      .returning();
    return dto(required(chapter));
  }

  async listForeshadows(projectId: string): Promise<Foreshadow[]> {
    await this.assertProject(projectId);
    return dto<Foreshadow[]>(
      await this.db
        .select()
        .from(foreshadows)
        .where(eq(foreshadows.projectId, projectId))
        .orderBy(desc(foreshadows.importance), asc(foreshadows.createdAt)),
    );
  }

  async createForeshadow(projectId: string, input: CreateForeshadowInput): Promise<Foreshadow> {
    await this.assertProject(projectId);
    await this.assertNodeIds(projectId, [input.plantedNodeId, input.revealNodeId]);
    const [row] = await this.db
      .insert(foreshadows)
      .values({ projectId, ...input })
      .returning();
    return dto<Foreshadow>(required(row));
  }

  async updateForeshadow(id: string, input: UpdateForeshadowInput): Promise<Foreshadow> {
    const current = await this.ownedRow(foreshadows, foreshadows.id, id);
    await this.assertNodeIds(current.projectId, [input.plantedNodeId, input.revealNodeId]);
    const [row] = await this.db
      .update(foreshadows)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(foreshadows.id, id))
      .returning();
    return dto<Foreshadow>(required(row));
  }

  async deleteForeshadow(id: string): Promise<void> {
    await this.ownedRow(foreshadows, foreshadows.id, id);
    await this.db.delete(foreshadows).where(eq(foreshadows.id, id));
  }

  async listInspirations(projectId: string): Promise<Inspiration[]> {
    await this.assertProject(projectId);
    return dto<Inspiration[]>(
      await this.db
        .select()
        .from(inspirations)
        .where(eq(inspirations.projectId, projectId))
        .orderBy(desc(inspirations.createdAt)),
    );
  }

  async createInspiration(projectId: string, input: CreateInspirationInput): Promise<Inspiration> {
    await this.assertProject(projectId);
    await this.assertNodeIds(projectId, [input.linkedNodeId]);
    const [row] = await this.db
      .insert(inspirations)
      .values({ projectId, ...input })
      .returning();
    return dto<Inspiration>(required(row));
  }

  async updateInspiration(id: string, input: UpdateInspirationInput): Promise<Inspiration> {
    const current = await this.ownedRow(inspirations, inspirations.id, id);
    await this.assertNodeIds(current.projectId, [input.linkedNodeId]);
    const [row] = await this.db
      .update(inspirations)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(inspirations.id, id))
      .returning();
    return dto<Inspiration>(required(row));
  }

  async deleteInspiration(id: string): Promise<void> {
    await this.ownedRow(inspirations, inspirations.id, id);
    await this.db.delete(inspirations).where(eq(inspirations.id, id));
  }

  async stats(projectId: string): Promise<ProjectStats> {
    await this.assertProject(projectId);
    const [[nodeStats], [chapterStats], [inspirationStats], rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(storyNodes)
        .where(eq(storyNodes.projectId, projectId)),
      this.db
        .select({
          count: sql<number>`count(*)::int`,
          words: sql<number>`coalesce(sum(${chapters.wordCount}), 0)::int`,
        })
        .from(chapters)
        .where(eq(chapters.projectId, projectId)),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(inspirations)
        .where(and(eq(inspirations.projectId, projectId), eq(inspirations.status, 'inbox'))),
      this.db
        .select()
        .from(foreshadows)
        .where(and(eq(foreshadows.projectId, projectId), eq(foreshadows.status, 'planted'))),
    ]);
    const chapterCount = chapterStats?.count ?? 0;
    return {
      chapterCount,
      inspirationInboxCount: inspirationStats?.count ?? 0,
      nodeCount: nodeStats?.count ?? 0,
      overdueForeshadowCount: rows.filter((item) => {
        const absent = item.lastAppearedChapter
          ? chapterCount - item.lastAppearedChapter
          : chapterCount;
        return item.importance === 'high'
          ? absent >= 20
          : item.importance === 'medium' && absent >= 40;
      }).length,
      totalWordCount: chapterStats?.words ?? 0,
    };
  }

  async export(projectId: string, format: string): Promise<ExportDocument> {
    const project = await this.assertProject(projectId);
    const [bible, lines, nodes, chapterRows, characterRows, loreRows] = await Promise.all([
      this.db.select().from(storyBibles).where(eq(storyBibles.projectId, projectId)).limit(1),
      this.db.select().from(storylines).where(eq(storylines.projectId, projectId)),
      this.db
        .select()
        .from(storyNodes)
        .where(eq(storyNodes.projectId, projectId))
        .orderBy(asc(storyNodes.sortOrder)),
      this.db
        .select()
        .from(chapters)
        .where(eq(chapters.projectId, projectId))
        .orderBy(asc(chapters.chapterNumber)),
      this.db.select().from(characters).where(eq(characters.projectId, projectId)),
      this.db.select().from(loreEntries).where(eq(loreEntries.projectId, projectId)),
    ]);
    const slug = project.name.replace(/[^\p{L}\p{N}-]+/gu, '-');
    if (format === 'novel-txt') {
      return {
        content: chapterRows
          .map((item) => `第${item.chapterNumber}章 ${item.title}\n\n${item.content}`)
          .join('\n\n'),
        contentType: 'text/plain;charset=utf-8',
        fileName: `${slug}-正文.txt`,
      };
    }
    if (format === 'novel-md') {
      return {
        content: chapterRows
          .map((item) => `# 第${item.chapterNumber}章 ${item.title}\n\n${item.content}`)
          .join('\n\n'),
        contentType: 'text/markdown;charset=utf-8',
        fileName: `${slug}-正文.md`,
      };
    }
    const content = [
      `# ${project.name}`,
      project.description,
      '## 创作圣经',
      bible[0]?.plotGoals ?? '',
      `### 结局方向\n${bible[0]?.endingDirection ?? ''}`,
      `## 角色\n${characterRows.map((item) => `- **${item.name}**：${item.bio}`).join('\n')}`,
      `## 世界设定\n${loreRows.map((item) => `- **${item.name}**：${item.description}`).join('\n')}`,
      `## 故事线\n${lines.map((item) => `- **${item.title}**：${item.endingGoal}`).join('\n')}`,
      `## 故事节点\n${nodes.map((item) => `${item.sortOrder + 1}. **${item.title}**：${item.nodeGoal}`).join('\n')}`,
      `## 正文\n${chapterRows.map((item) => `### 第${item.chapterNumber}章 ${item.title}\n\n${item.content}`).join('\n\n')}`,
    ].join('\n\n');
    return { content, contentType: 'text/markdown;charset=utf-8', fileName: `${slug}-项目.md` };
  }

  async createSnapshot(projectId: string, label?: string): Promise<ProjectSnapshot> {
    const project = await this.assertProject(projectId);
    const payload = await this.buildSnapshot(projectId);
    const [row] = await this.db
      .insert(projectSnapshots)
      .values({ label: label ?? `${project.name} ${new Date().toISOString()}`, payload, projectId })
      .returning();
    return snapshotDto(required(row));
  }

  async listSnapshots(projectId: string): Promise<ProjectSnapshot[]> {
    await this.assertProject(projectId);
    return (
      await this.db
        .select()
        .from(projectSnapshots)
        .where(eq(projectSnapshots.projectId, projectId))
        .orderBy(desc(projectSnapshots.createdAt))
    ).map(snapshotDto);
  }

  async downloadSnapshot(id: string) {
    const row = await this.ownedRow(projectSnapshots, projectSnapshots.id, id);
    return row.payload;
  }

  async restoreSnapshot(id: string): Promise<void> {
    const snapshot = await this.ownedRow(projectSnapshots, projectSnapshots.id, id);
    const data = snapshot.payload as Record<string, unknown[]>;
    await this.db.transaction(async (tx) => {
      await tx.delete(chapters).where(eq(chapters.projectId, snapshot.projectId));
      await tx.delete(foreshadows).where(eq(foreshadows.projectId, snapshot.projectId));
      await tx.delete(inspirations).where(eq(inspirations.projectId, snapshot.projectId));
      await tx.delete(storyNodes).where(eq(storyNodes.projectId, snapshot.projectId));
      await tx
        .delete(storylineMilestones)
        .where(
          sql`${storylineMilestones.storylineId} in (select id from storylines where project_id = ${snapshot.projectId})`,
        );
      await tx.delete(storylines).where(eq(storylines.projectId, snapshot.projectId));
      await tx
        .delete(characterRelations)
        .where(eq(characterRelations.projectId, snapshot.projectId));
      await tx.delete(characters).where(eq(characters.projectId, snapshot.projectId));
      await tx.delete(loreEntries).where(eq(loreEntries.projectId, snapshot.projectId));
      await tx.delete(worldRules).where(eq(worldRules.projectId, snapshot.projectId));
      await tx.delete(storyBibles).where(eq(storyBibles.projectId, snapshot.projectId));
      for (const [table, key] of [
        [storyBibles, 'storyBibles'],
        [worldRules, 'worldRules'],
        [loreEntries, 'loreEntries'],
        [characters, 'characters'],
        [characterRelations, 'characterRelations'],
        [storylines, 'storylines'],
        [storylineMilestones, 'milestones'],
        [storyNodes, 'storyNodes'],
        [storyNodeCharacters, 'storyNodeCharacters'],
        [storyNodeLoreEntries, 'storyNodeLoreEntries'],
        [chapters, 'chapters'],
        [foreshadows, 'foreshadows'],
        [inspirations, 'inspirations'],
      ] as const) {
        const rows = data[key];
        if (rows?.length) {
          await tx.insert(table as never).values(rows.map(reviveDates) as never);
        }
      }
    });
  }

  private async buildSnapshot(projectId: string): Promise<Record<string, unknown>> {
    const lineRows = await this.db
      .select()
      .from(storylines)
      .where(eq(storylines.projectId, projectId));
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      storyBibles: await this.db
        .select()
        .from(storyBibles)
        .where(eq(storyBibles.projectId, projectId)),
      worldRules: await this.db
        .select()
        .from(worldRules)
        .where(eq(worldRules.projectId, projectId)),
      loreEntries: await this.db
        .select()
        .from(loreEntries)
        .where(eq(loreEntries.projectId, projectId)),
      characters: await this.db
        .select()
        .from(characters)
        .where(eq(characters.projectId, projectId)),
      characterRelations: await this.db
        .select()
        .from(characterRelations)
        .where(eq(characterRelations.projectId, projectId)),
      storylines: lineRows,
      milestones: lineRows.length
        ? await this.db
            .select()
            .from(storylineMilestones)
            .where(
              inArray(
                storylineMilestones.storylineId,
                lineRows.map((item) => item.id),
              ),
            )
        : [],
      storyNodes: await this.db
        .select()
        .from(storyNodes)
        .where(eq(storyNodes.projectId, projectId)),
      storyNodeCharacters: await this.db
        .select()
        .from(storyNodeCharacters)
        .where(
          sql`${storyNodeCharacters.storyNodeId} in (select id from story_nodes where project_id = ${projectId})`,
        ),
      storyNodeLoreEntries: await this.db
        .select()
        .from(storyNodeLoreEntries)
        .where(
          sql`${storyNodeLoreEntries.storyNodeId} in (select id from story_nodes where project_id = ${projectId})`,
        ),
      chapters: await this.db.select().from(chapters).where(eq(chapters.projectId, projectId)),
      foreshadows: await this.db
        .select()
        .from(foreshadows)
        .where(eq(foreshadows.projectId, projectId)),
      inspirations: await this.db
        .select()
        .from(inspirations)
        .where(eq(inspirations.projectId, projectId)),
    };
  }

  private async assertProject(projectId: string) {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, this.ownerId)))
      .limit(1);
    if (!project) throw new CreativeResourceNotFoundError();
    return project;
  }

  private async ownedNode(nodeId: string) {
    const [node] = await this.db
      .select()
      .from(storyNodes)
      .where(eq(storyNodes.id, nodeId))
      .limit(1);
    if (!node) throw new CreativeResourceNotFoundError();
    await this.assertProject(node.projectId);
    return node;
  }

  private async assertNodeIds(projectId: string, values: (string | null | undefined)[]) {
    for (const id of values.filter(Boolean) as string[]) {
      const node = await this.ownedNode(id);
      if (node.projectId !== projectId)
        throw new CreativeResourceConflictError('Node belongs to another project.');
    }
  }

  // Drizzle does not expose a common runtime table type for this small ownership helper.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async ownedRow(table: any, idColumn: any, id: string): Promise<any> {
    const [row] = await this.db.select().from(table).where(eq(idColumn, id)).limit(1);
    if (!row) throw new CreativeResourceNotFoundError();
    await this.assertProject(row.projectId);
    return row;
  }
}

function countWords(content: string): number {
  return (content.match(/[\p{Script=Han}]|[\p{L}\p{N}]+/gu) ?? []).length;
}

function required<T>(value: T | undefined): T {
  if (!value) throw new CreativeResourceNotFoundError();
  return value;
}

function dto<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function snapshotDto(row: typeof projectSnapshots.$inferSelect): ProjectSnapshot {
  return {
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    label: row.label,
    projectId: row.projectId,
  };
}

function reviveDates(row: unknown): unknown {
  if (!row || typeof row !== 'object') return row;
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      (key === 'createdAt' || key === 'updatedAt' || key === 'joinedAt') &&
      typeof value === 'string'
        ? new Date(value)
        : value,
    ]),
  );
}
