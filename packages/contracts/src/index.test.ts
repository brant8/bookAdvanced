import { describe, expect, it } from 'vitest';

import { createHealthResponse } from './index';

describe('health response contract', () => {
  it('creates a valid response', () => {
    expect(createHealthResponse('1.2.3')).toEqual({
      service: 'storyverse-api',
      status: 'ok',
      version: '1.2.3',
    });
  });
});
