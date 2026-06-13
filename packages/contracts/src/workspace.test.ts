import { describe, expect, it } from 'vitest';

import { createForeshadowSchema, saveChapterSchema } from './workspace';

describe('workspace contracts', () => {
  it('validates chapter autosave input', () => {
    expect(
      saveChapterSchema.parse({ chapterNumber: 1, content: '正文', title: '第一章' }),
    ).toMatchObject({ chapterNumber: 1 });
  });

  it('rejects an empty foreshadow title', () => {
    expect(() => createForeshadowSchema.parse({ title: ' ' })).toThrow();
  });
});
