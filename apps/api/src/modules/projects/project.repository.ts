import { and, asc, eq } from 'drizzle-orm';

import type { CreateProjectInput, UpdateProjectInput } from '@storyverse/contracts';

import type { Database } from '../../db/client.js';
import { projectMembers, projects } from '../../db/schema.js';

type ProjectRow = typeof projects.$inferSelect;

export interface ProjectRepository {
  create(ownerId: string, input: CreateProjectInput): Promise<ProjectRow>;
  delete(ownerId: string, projectId: string): Promise<boolean>;
  findById(ownerId: string, projectId: string): Promise<ProjectRow | null>;
  list(ownerId: string): Promise<ProjectRow[]>;
  update(ownerId: string, projectId: string, input: UpdateProjectInput): Promise<ProjectRow | null>;
}

export class DrizzleProjectRepository implements ProjectRepository {
  constructor(private readonly db: Database) {}

  async create(ownerId: string, input: CreateProjectInput): Promise<ProjectRow> {
    return this.db.transaction(async (tx) => {
      const [project] = await tx
        .insert(projects)
        .values({
          aiMode: input.aiMode,
          description: input.description,
          name: input.name,
          ownerId,
          styleSamples: input.styleSamples,
          visibility: input.visibility,
        })
        .returning();

      if (!project) {
        throw new Error('Failed to create project.');
      }

      await tx.insert(projectMembers).values({
        projectId: project.id,
        role: 'owner',
        userId: ownerId,
      });

      return project;
    });
  }

  async delete(ownerId: string, projectId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
      .returning({ id: projects.id });

    return deleted.length === 1;
  }

  async findById(ownerId: string, projectId: string): Promise<ProjectRow | null> {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
      .limit(1);

    return project ?? null;
  }

  async list(ownerId: string): Promise<ProjectRow[]> {
    return this.db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, ownerId))
      .orderBy(asc(projects.createdAt), asc(projects.id));
  }

  async update(
    ownerId: string,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<ProjectRow | null> {
    const [project] = await this.db
      .update(projects)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
      .returning();

    return project ?? null;
  }
}
