import { describe, expect, it } from 'vitest';

import {
  createCharacterRelationSchema,
  createStoryNodeSchema,
  upsertStoryBibleSchema,
} from './creative';

describe('creative contracts', () => {
  it('accepts story-driven chapter planning fields', () => {
    expect(
      createStoryNodeSchema.parse({
        nodeGoal: '主角取得第一把钥匙',
        requiredEvents: ['发现守门人的真实身份'],
        sortOrder: 0,
        title: '雾港入口',
      }),
    ).toMatchObject({ sortOrder: 0, title: '雾港入口' });
    expect(upsertStoryBibleSchema.parse({ endingDirection: '主角最终选择放弃王位' })).toBeTruthy();
  });

  it('rejects invalid relationship strength', () => {
    expect(() =>
      createCharacterRelationSchema.parse({
        relationType: '盟友',
        sourceCharacterId: '00000000-0000-4000-8000-000000000001',
        strength: 6,
        targetCharacterId: '00000000-0000-4000-8000-000000000002',
      }),
    ).toThrow();
  });
});
