import type { CreateProjectInput, Project, UpdateProjectInput } from '@storyverse/contracts';
import { normalizeProjectName, normalizeStyleSamples } from '@storyverse/domain';

import type { ProjectRepository } from './project.repository.js';

export class ProjectNotFoundError extends Error {
  constructor() {
    super('Project not found.');
  }
}

export class ProjectService {
  constructor(
    private readonly repository: ProjectRepository,
    private readonly ownerId: string,
  ) {}

  async create(input: CreateProjectInput): Promise<Project> {
    const project = await this.repository.create(this.ownerId, normalizeInput(input));

    return toProject(project);
  }

  async delete(projectId: string): Promise<void> {
    const deleted = await this.repository.delete(this.ownerId, projectId);

    if (!deleted) {
      throw new ProjectNotFoundError();
    }
  }

  async get(projectId: string): Promise<Project> {
    const project = await this.repository.findById(this.ownerId, projectId);

    if (!project) {
      throw new ProjectNotFoundError();
    }

    return toProject(project);
  }

  async list(): Promise<Project[]> {
    const projects = await this.repository.list(this.ownerId);

    return projects.map(toProject);
  }

  async update(projectId: string, input: UpdateProjectInput): Promise<Project> {
    const project = await this.repository.update(this.ownerId, projectId, normalizeInput(input));

    if (!project) {
      throw new ProjectNotFoundError();
    }

    return toProject(project);
  }
}

type ProjectRow = NonNullable<Awaited<ReturnType<ProjectRepository['findById']>>>;

function normalizeInput<T extends CreateProjectInput | UpdateProjectInput>(input: T): T {
  return {
    ...input,
    ...(input.name === undefined ? {} : { name: normalizeProjectName(input.name) }),
    ...(input.styleSamples === undefined
      ? {}
      : { styleSamples: normalizeStyleSamples(input.styleSamples) }),
  };
}

function toProject(project: ProjectRow): Project {
  return {
    aiMode: project.aiMode,
    createdAt: project.createdAt.toISOString(),
    description: project.description,
    id: project.id,
    name: project.name,
    ownerId: project.ownerId,
    styleSamples: project.styleSamples,
    updatedAt: project.updatedAt.toISOString(),
    visibility: project.visibility,
  };
}
