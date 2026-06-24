import {
  creativeGenerationResultSchema,
  type CreativeGenerationRequest,
} from '@storyverse/contracts';

import { apiRequest } from '../../lib/api';

export const creativeGenerationApi = {
  generate: async (projectId: string, input: CreativeGenerationRequest) =>
    creativeGenerationResultSchema.parse(
      await apiRequest(`/projects/${projectId}/ai/generate`, {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    ),
};
