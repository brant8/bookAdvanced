import {
  generatedChapterSchema,
  type GenerateChapterInput,
  type GeneratedChapter,
} from '@storyverse/contracts';

import { apiRequest } from '../../lib/api';

export async function generateChapter(
  nodeId: string,
  input: GenerateChapterInput,
): Promise<GeneratedChapter> {
  return generatedChapterSchema.parse(
    await apiRequest(`/story-nodes/${nodeId}/generate`, {
      body: JSON.stringify(input),
      method: 'POST',
    }),
  );
}

export function previewGenerationContext(nodeId: string): Promise<unknown> {
  return apiRequest(`/story-nodes/${nodeId}/generation-context`);
}
