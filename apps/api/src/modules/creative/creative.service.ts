import { and, asc, eq, inArray } from 'drizzle-orm';

import type {
  Character,
  CharacterRelation,
  CreateCharacterInput,
  CreateCharacterRelationInput,
  CreateLoreEntryInput,
  CreateStorylineInput,
  CreateStorylineMilestoneInput,
  CreateStoryNodeInput,
  CreateWorldRuleInput,
  LoreEntry,
  StoryBible,
  Storyline,
  StorylineMilestone,
  StoryNode,
  UpdateCharacterInput,
  UpdateCharacterRelationInput,
  UpdateLoreEntryInput,
  UpdateStorylineInput,
  UpdateStorylineMilestoneInput,
  UpdateStoryNodeInput,
  UpdateWorldRuleInput,
  UpsertStoryBibleInput,
  WorldRule,
} from '@storyverse/contracts';

import type { Database } from '../../db/client.js';
import {
  characterRelations,
  characters,
  loreEntries,
  projects,
  storyBibles,
  storylineMilestones,
  storylines,
  storyNodeCharacters,
  storyNodeLoreEntries,
  storyNodes,
  worldRules,
} from '../../db/schema.js';

export class CreativeResourceNotFoundError extends Error {
  constructor() {
    super('Creative resource not found.');
  }
}

export class CreativeResourceConflictError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class CreativeService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
  ) {}

  async getBible(projectId: string): Promise<StoryBible | null> {
    await this.assertProject(projectId);
    const [row] = await this.db
      .select()
      .from(storyBibles)
      .where(eq(storyBibles.projectId, projectId))
      .limit(1);
    return row ? dto<StoryBible>(row) : null;
  }

  async upsertBible(projectId: string, input: UpsertStoryBibleInput): Promise<StoryBible> {
    await this.assertProject(projectId);
    const [row] = await this.db
      .insert(storyBibles)
      .values({ projectId, ...input })
      .onConflictDoUpdate({
        target: storyBibles.projectId,
        set: { ...input, updatedAt: new Date() },
      })
      .returning();
    return dto<StoryBible>(required(row));
  }

  async deleteBible(projectId: string): Promise<void> {
    await this.assertProject(projectId);
    await this.db.delete(storyBibles).where(eq(storyBibles.projectId, projectId));
  }

  async listWorldRules(projectId: string): Promise<WorldRule[]> {
    await this.assertProject(projectId);
    const rows = await this.db
      .select()
      .from(worldRules)
      .where(eq(worldRules.projectId, projectId))
      .orderBy(asc(worldRules.priority), asc(worldRules.createdAt));
    return dto<WorldRule[]>(rows);
  }

  async createWorldRule(projectId: string, input: CreateWorldRuleInput): Promise<WorldRule> {
    await this.assertProject(projectId);
    const [row] = await this.db
      .insert(worldRules)
      .values({ projectId, ...input })
      .returning();
    return dto<WorldRule>(required(row));
  }

  async updateWorldRule(id: string, input: UpdateWorldRuleInput): Promise<WorldRule> {
    const row = await this.findWorldRule(id);
    await this.assertProject(row.projectId);
    const [updated] = await this.db
      .update(worldRules)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(worldRules.id, id))
      .returning();
    return dto<WorldRule>(required(updated));
  }

  async deleteWorldRule(id: string): Promise<void> {
    const row = await this.findWorldRule(id);
    await this.assertProject(row.projectId);
    await this.db.delete(worldRules).where(eq(worldRules.id, id));
  }

  async listLore(projectId: string): Promise<LoreEntry[]> {
    await this.assertProject(projectId);
    return dto<LoreEntry[]>(
      await this.db
        .select()
        .from(loreEntries)
        .where(eq(loreEntries.projectId, projectId))
        .orderBy(asc(loreEntries.name)),
    );
  }

  async createLore(projectId: string, input: CreateLoreEntryInput): Promise<LoreEntry> {
    await this.assertProject(projectId);
    const [row] = await this.db
      .insert(loreEntries)
      .values({ projectId, ...input })
      .returning();
    return dto<LoreEntry>(required(row));
  }

  async updateLore(id: string, input: UpdateLoreEntryInput): Promise<LoreEntry> {
    const row = await this.findLore(id);
    await this.assertProject(row.projectId);
    const [updated] = await this.db
      .update(loreEntries)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(loreEntries.id, id))
      .returning();
    return dto<LoreEntry>(required(updated));
  }

  async deleteLore(id: string): Promise<void> {
    const row = await this.findLore(id);
    await this.assertProject(row.projectId);
    await this.db.delete(loreEntries).where(eq(loreEntries.id, id));
  }

  async listCharacters(projectId: string): Promise<Character[]> {
    await this.assertProject(projectId);
    return dto<Character[]>(
      await this.db
        .select()
        .from(characters)
        .where(eq(characters.projectId, projectId))
        .orderBy(asc(characters.name)),
    );
  }

  async createCharacter(projectId: string, input: CreateCharacterInput): Promise<Character> {
    await this.assertProject(projectId);
    const [row] = await this.db
      .insert(characters)
      .values({ projectId, ...input })
      .returning();
    return dto<Character>(required(row));
  }

  async updateCharacter(id: string, input: UpdateCharacterInput): Promise<Character> {
    const row = await this.findCharacter(id);
    await this.assertProject(row.projectId);
    const [updated] = await this.db
      .update(characters)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(characters.id, id))
      .returning();
    return dto<Character>(required(updated));
  }

  async deleteCharacter(id: string): Promise<void> {
    const row = await this.findCharacter(id);
    await this.assertProject(row.projectId);
    await this.db.delete(characters).where(eq(characters.id, id));
  }

  async listCharacterRelations(projectId: string): Promise<CharacterRelation[]> {
    await this.assertProject(projectId);
    return dto<CharacterRelation[]>(
      await this.db
        .select()
        .from(characterRelations)
        .where(eq(characterRelations.projectId, projectId))
        .orderBy(asc(characterRelations.createdAt)),
    );
  }

  async createCharacterRelation(
    projectId: string,
    input: CreateCharacterRelationInput,
  ): Promise<CharacterRelation> {
    await this.assertProject(projectId);
    await this.assertCharacters(projectId, [input.sourceCharacterId, input.targetCharacterId]);
    if (input.sourceCharacterId === input.targetCharacterId) {
      throw new CreativeResourceConflictError('A character cannot relate to itself.');
    }
    const [row] = await this.db
      .insert(characterRelations)
      .values({ projectId, ...input })
      .returning();
    return dto<CharacterRelation>(required(row));
  }

  async updateCharacterRelation(
    id: string,
    input: UpdateCharacterRelationInput,
  ): Promise<CharacterRelation> {
    const row = await this.findCharacterRelation(id);
    await this.assertProject(row.projectId);
    const [updated] = await this.db
      .update(characterRelations)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(characterRelations.id, id))
      .returning();
    return dto<CharacterRelation>(required(updated));
  }

  async deleteCharacterRelation(id: string): Promise<void> {
    const row = await this.findCharacterRelation(id);
    await this.assertProject(row.projectId);
    await this.db.delete(characterRelations).where(eq(characterRelations.id, id));
  }

  async listStorylines(projectId: string): Promise<Storyline[]> {
    await this.assertProject(projectId);
    return dto<Storyline[]>(
      await this.db
        .select()
        .from(storylines)
        .where(eq(storylines.projectId, projectId))
        .orderBy(asc(storylines.createdAt)),
    );
  }

  async createStoryline(projectId: string, input: CreateStorylineInput): Promise<Storyline> {
    await this.assertProject(projectId);
    const [row] = await this.db
      .insert(storylines)
      .values({ projectId, ...input })
      .returning();
    return dto<Storyline>(required(row));
  }

  async updateStoryline(id: string, input: UpdateStorylineInput): Promise<Storyline> {
    const row = await this.findStoryline(id);
    await this.assertProject(row.projectId);
    const [updated] = await this.db
      .update(storylines)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(storylines.id, id))
      .returning();
    return dto<Storyline>(required(updated));
  }

  async deleteStoryline(id: string): Promise<void> {
    const row = await this.findStoryline(id);
    await this.assertProject(row.projectId);
    await this.db.delete(storylines).where(eq(storylines.id, id));
  }

  async listMilestones(storylineId: string): Promise<StorylineMilestone[]> {
    const storyline = await this.findStoryline(storylineId);
    await this.assertProject(storyline.projectId);
    return dto<StorylineMilestone[]>(
      await this.db
        .select()
        .from(storylineMilestones)
        .where(eq(storylineMilestones.storylineId, storylineId))
        .orderBy(asc(storylineMilestones.sortOrder)),
    );
  }

  async createMilestone(
    storylineId: string,
    input: CreateStorylineMilestoneInput,
  ): Promise<StorylineMilestone> {
    const storyline = await this.findStoryline(storylineId);
    await this.assertProject(storyline.projectId);
    const [row] = await this.db
      .insert(storylineMilestones)
      .values({ storylineId, ...input })
      .returning();
    return dto<StorylineMilestone>(required(row));
  }

  async updateMilestone(
    id: string,
    input: UpdateStorylineMilestoneInput,
  ): Promise<StorylineMilestone> {
    const row = await this.findMilestone(id);
    const storyline = await this.findStoryline(row.storylineId);
    await this.assertProject(storyline.projectId);
    const [updated] = await this.db
      .update(storylineMilestones)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(storylineMilestones.id, id))
      .returning();
    return dto<StorylineMilestone>(required(updated));
  }

  async deleteMilestone(id: string): Promise<void> {
    const row = await this.findMilestone(id);
    const storyline = await this.findStoryline(row.storylineId);
    await this.assertProject(storyline.projectId);
    await this.db.delete(storylineMilestones).where(eq(storylineMilestones.id, id));
  }

  async listStoryNodes(projectId: string): Promise<StoryNode[]> {
    await this.assertProject(projectId);
    const rows = await this.db
      .select()
      .from(storyNodes)
      .where(eq(storyNodes.projectId, projectId))
      .orderBy(asc(storyNodes.sortOrder), asc(storyNodes.createdAt));
    return Promise.all(rows.map((row) => this.toStoryNode(row)));
  }

  async createStoryNode(projectId: string, input: CreateStoryNodeInput): Promise<StoryNode> {
    await this.assertProject(projectId);
    await this.validateNodeReferences(projectId, input);
    const { characterIds = [], loreEntryIds = [], ...values } = input;
    const row = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(storyNodes)
        .values({ projectId, ...values })
        .returning();
      const node = required(created);
      if (characterIds.length > 0) {
        await tx
          .insert(storyNodeCharacters)
          .values(
            unique(characterIds).map((characterId) => ({ characterId, storyNodeId: node.id })),
          );
      }
      if (loreEntryIds.length > 0) {
        await tx
          .insert(storyNodeLoreEntries)
          .values(
            unique(loreEntryIds).map((loreEntryId) => ({ loreEntryId, storyNodeId: node.id })),
          );
      }
      return node;
    });
    return this.toStoryNode(row);
  }

  async updateStoryNode(id: string, input: UpdateStoryNodeInput): Promise<StoryNode> {
    const current = await this.findStoryNode(id);
    await this.assertProject(current.projectId);
    await this.validateNodeReferences(current.projectId, input);
    const { characterIds, loreEntryIds, ...values } = input;
    const row = await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(storyNodes)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(storyNodes.id, id))
        .returning();
      if (characterIds) {
        await tx.delete(storyNodeCharacters).where(eq(storyNodeCharacters.storyNodeId, id));
        if (characterIds.length > 0) {
          await tx
            .insert(storyNodeCharacters)
            .values(unique(characterIds).map((characterId) => ({ characterId, storyNodeId: id })));
        }
      }
      if (loreEntryIds) {
        await tx.delete(storyNodeLoreEntries).where(eq(storyNodeLoreEntries.storyNodeId, id));
        if (loreEntryIds.length > 0) {
          await tx
            .insert(storyNodeLoreEntries)
            .values(unique(loreEntryIds).map((loreEntryId) => ({ loreEntryId, storyNodeId: id })));
        }
      }
      return required(updated);
    });
    return this.toStoryNode(row);
  }

  async deleteStoryNode(id: string): Promise<void> {
    const row = await this.findStoryNode(id);
    await this.assertProject(row.projectId);
    await this.db.delete(storyNodes).where(eq(storyNodes.id, id));
  }

  private async assertProject(projectId: string): Promise<void> {
    const [project] = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, this.ownerId)))
      .limit(1);
    if (!project) throw new CreativeResourceNotFoundError();
  }

  private async assertCharacters(projectId: string, ids: string[]): Promise<void> {
    const uniqueIds = unique(ids);
    if (uniqueIds.length === 0) return;
    const rows = await this.db
      .select({ id: characters.id })
      .from(characters)
      .where(and(eq(characters.projectId, projectId), inArray(characters.id, uniqueIds)));
    if (rows.length !== uniqueIds.length)
      throw new CreativeResourceConflictError('Invalid character.');
  }

  private async assertLore(projectId: string, ids: string[]): Promise<void> {
    const uniqueIds = unique(ids);
    if (uniqueIds.length === 0) return;
    const rows = await this.db
      .select({ id: loreEntries.id })
      .from(loreEntries)
      .where(and(eq(loreEntries.projectId, projectId), inArray(loreEntries.id, uniqueIds)));
    if (rows.length !== uniqueIds.length)
      throw new CreativeResourceConflictError('Invalid lore entry.');
  }

  private async validateNodeReferences(
    projectId: string,
    input: CreateStoryNodeInput | UpdateStoryNodeInput,
  ): Promise<void> {
    if (input.storylineId) {
      const storyline = await this.findStoryline(input.storylineId);
      if (storyline.projectId !== projectId) {
        throw new CreativeResourceConflictError('Storyline belongs to another project.');
      }
    }
    if (input.milestoneId) {
      const milestone = await this.findMilestone(input.milestoneId);
      const storyline = await this.findStoryline(milestone.storylineId);
      if (
        storyline.projectId !== projectId ||
        (input.storylineId && milestone.storylineId !== input.storylineId)
      ) {
        throw new CreativeResourceConflictError('Milestone does not match the project storyline.');
      }
    }
    await this.assertCharacters(projectId, input.characterIds ?? []);
    await this.assertLore(projectId, input.loreEntryIds ?? []);
  }

  private async toStoryNode(row: typeof storyNodes.$inferSelect): Promise<StoryNode> {
    const [characterRows, loreRows] = await Promise.all([
      this.db
        .select({ id: storyNodeCharacters.characterId })
        .from(storyNodeCharacters)
        .where(eq(storyNodeCharacters.storyNodeId, row.id)),
      this.db
        .select({ id: storyNodeLoreEntries.loreEntryId })
        .from(storyNodeLoreEntries)
        .where(eq(storyNodeLoreEntries.storyNodeId, row.id)),
    ]);
    return dto<StoryNode>({
      ...row,
      characterIds: characterRows.map(({ id }) => id),
      loreEntryIds: loreRows.map(({ id }) => id),
    });
  }

  private async findWorldRule(id: string) {
    return required(
      (await this.db.select().from(worldRules).where(eq(worldRules.id, id)).limit(1))[0],
    );
  }

  private async findLore(id: string) {
    return required(
      (await this.db.select().from(loreEntries).where(eq(loreEntries.id, id)).limit(1))[0],
    );
  }

  private async findCharacter(id: string) {
    return required(
      (await this.db.select().from(characters).where(eq(characters.id, id)).limit(1))[0],
    );
  }

  private async findCharacterRelation(id: string) {
    return required(
      (
        await this.db
          .select()
          .from(characterRelations)
          .where(eq(characterRelations.id, id))
          .limit(1)
      )[0],
    );
  }

  private async findStoryline(id: string) {
    return required(
      (await this.db.select().from(storylines).where(eq(storylines.id, id)).limit(1))[0],
    );
  }

  private async findMilestone(id: string) {
    return required(
      (
        await this.db
          .select()
          .from(storylineMilestones)
          .where(eq(storylineMilestones.id, id))
          .limit(1)
      )[0],
    );
  }

  private async findStoryNode(id: string) {
    return required(
      (await this.db.select().from(storyNodes).where(eq(storyNodes.id, id)).limit(1))[0],
    );
  }
}

function required<T>(value: T | undefined): T {
  if (!value) throw new CreativeResourceNotFoundError();
  return value;
}

function dto<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
