import { describe, expect, it } from 'vitest';

import { buildChapterGenerationPrompt } from './generation';

describe('chapter generation context', () => {
  it('keeps the current node, milestone order and ending direction in the prompt', () => {
    const prompt = buildChapterGenerationPrompt({
      bible: {
        characterRules: '',
        endingDirection: '主角最终公开真相',
        plotGoals: '逐步发现历史',
        prohibitedContent: '',
        writingStyle: '',
        worldRules: '',
      },
      chapterSummaries: [],
      characters: [],
      foreshadows: [],
      lore: [],
      milestones: [
        { description: '', progress: 20, status: 'active', title: '取得证词' },
        { description: '', progress: 0, status: 'planned', title: '公开档案' },
      ],
      nextNode: { nodeGoal: '寻找第二名证人', summary: '', title: '山城来信' },
      node: {
        conflict: '守卫封锁港口',
        description: '',
        nodeGoal: '取得第一份证词',
        requiredEvents: ['守门人交出证词'],
        summary: '',
        title: '雾港会面',
      },
      storyline: {
        description: '',
        endingGoal: '公开被抹除的历史',
        generationConstraints: ['不得提前揭晓国王身份'],
        title: '返乡主线',
      },
      targetWords: 1500,
    });

    expect(prompt).toContain('取得第一份证词');
    expect(prompt).toContain('取得证词');
    expect(prompt).toContain('山城来信');
    expect(prompt).toContain('公开被抹除的历史');
    expect(prompt).toContain('不得提前揭晓国王身份');
  });
});
