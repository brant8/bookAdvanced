import { describe, expect, it } from 'vitest';

import { healthResponseSchema } from '@storyverse/contracts';

import { createApp } from './app.js';

describe('API health endpoint', () => {
  it('returns the shared health response', async () => {
    const app = createApp();
    const response = await app.request('/health');
    const payload: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(healthResponseSchema.parse(payload)).toEqual({
      service: 'storyverse-api',
      status: 'ok',
      version: '0.0.0',
    });
  });
});
