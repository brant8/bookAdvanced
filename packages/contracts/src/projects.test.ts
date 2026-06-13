import { describe, expect, it } from 'vitest';

import { createProjectSchema, updateProjectSchema } from './projects';

describe('project contracts', () => {
  it('accepts a minimal project create payload', () => {
    expect(createProjectSchema.parse({ name: '星海纪元' })).toEqual({
      name: '星海纪元',
    });
  });

  it('rejects an empty project update', () => {
    expect(updateProjectSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a whitespace-only project name', () => {
    expect(createProjectSchema.safeParse({ name: '   ' }).success).toBe(false);
  });
});
