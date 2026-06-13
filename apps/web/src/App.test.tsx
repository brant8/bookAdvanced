import { describe, expect, it } from 'vitest';

import { healthResponseSchema } from '@storyverse/contracts';

describe('web health contract', () => {
  it('accepts the API health response', () => {
    expect(
      healthResponseSchema.parse({
        service: 'storyverse-api',
        status: 'ok',
        version: '0.0.0',
      }),
    ).toEqual({
      service: 'storyverse-api',
      status: 'ok',
      version: '0.0.0',
    });
  });
});
