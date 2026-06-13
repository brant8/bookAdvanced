import {
  projectListSchema,
  projectSchema,
  type CreateProjectInput,
  type Project,
  type UpdateProjectInput,
} from '@storyverse/contracts';

import { apiRequest } from '../../lib/api';

export async function listProjects(): Promise<Project[]> {
  return projectListSchema.parse(await apiRequest('/projects'));
}

export async function getProject(projectId: string): Promise<Project> {
  return projectSchema.parse(await apiRequest(`/projects/${projectId}`));
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  return projectSchema.parse(
    await apiRequest('/projects', {
      body: JSON.stringify(input),
      method: 'POST',
    }),
  );
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput,
): Promise<Project> {
  return projectSchema.parse(
    await apiRequest(`/projects/${projectId}`, {
      body: JSON.stringify(input),
      method: 'PATCH',
    }),
  );
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiRequest(`/projects/${projectId}`, { method: 'DELETE' });
}
