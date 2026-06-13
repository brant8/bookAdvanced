import {
  chapterSchema,
  exportDocumentSchema,
  foreshadowSchema,
  inspirationSchema,
  projectSnapshotSchema,
  projectStatsSchema,
  type CreateForeshadowInput,
  type CreateInspirationInput,
  type SaveChapterInput,
} from '@storyverse/contracts';

import { apiRequest } from '../../lib/api';

const parseList = <T>(values: unknown, schema: { parse(value: unknown): T }) =>
  (values as unknown[]).map((value) => schema.parse(value));

export const workspaceApi = {
  getChapter: async (nodeId: string) => {
    const value = await apiRequest(`/story-nodes/${nodeId}/chapter`);
    return value === null ? null : chapterSchema.parse(value);
  },
  saveChapter: async (nodeId: string, input: SaveChapterInput) =>
    chapterSchema.parse(
      await apiRequest(`/story-nodes/${nodeId}/chapter`, {
        body: JSON.stringify(input),
        method: 'PUT',
      }),
    ),
  stats: async (projectId: string) =>
    projectStatsSchema.parse(await apiRequest(`/projects/${projectId}/stats`)),
  listForeshadows: async (projectId: string) =>
    parseList(await apiRequest(`/projects/${projectId}/foreshadows`), foreshadowSchema),
  createForeshadow: async (projectId: string, input: CreateForeshadowInput) =>
    foreshadowSchema.parse(
      await apiRequest(`/projects/${projectId}/foreshadows`, {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    ),
  listInspirations: async (projectId: string) =>
    parseList(await apiRequest(`/projects/${projectId}/inspirations`), inspirationSchema),
  createInspiration: async (projectId: string, input: CreateInspirationInput) =>
    inspirationSchema.parse(
      await apiRequest(`/projects/${projectId}/inspirations`, {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    ),
  export: async (projectId: string, format: string) =>
    exportDocumentSchema.parse(await apiRequest(`/projects/${projectId}/export/${format}`)),
  listSnapshots: async (projectId: string) =>
    parseList(await apiRequest(`/projects/${projectId}/snapshots`), projectSnapshotSchema),
  createSnapshot: async (projectId: string, label?: string) =>
    projectSnapshotSchema.parse(
      await apiRequest(`/projects/${projectId}/snapshots`, {
        body: JSON.stringify({ label }),
        method: 'POST',
      }),
    ),
  downloadSnapshot: (id: string) => apiRequest(`/snapshots/${id}/download`),
  restoreSnapshot: (id: string) =>
    apiRequest(`/snapshots/${id}/restore`, { body: '{}', method: 'POST' }),
};

export function downloadText(fileName: string, contentType: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: contentType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
