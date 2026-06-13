export interface GenerationContext {
  bible: {
    characterRules: string;
    endingDirection: string;
    plotGoals: string;
    prohibitedContent: string;
    writingStyle: string;
    worldRules: string;
  } | null;
  chapterSummaries: string[];
  characters: { name: string; bio: string; personality: string }[];
  extraInstructions?: string;
  foreshadows: { title: string; description: string; status: string }[];
  lore: { name: string; description: string; detail: string }[];
  milestones: { title: string; description: string; status: string; progress: number }[];
  nextNode: { title: string; summary: string; nodeGoal: string } | null;
  node: {
    title: string;
    summary: string;
    description: string;
    nodeGoal: string;
    conflict: string;
    requiredEvents: string[];
  };
  storyline: {
    title: string;
    description: string;
    endingGoal: string;
    generationConstraints: string[];
  } | null;
  targetWords: number;
}

export function buildChapterGenerationPrompt(context: GenerationContext): string {
  return [
    '你是长篇小说章节生成器。只输出一个 JSON 对象，不要输出 Markdown 代码块。',
    '正文必须围绕当前故事节点，逐步推进当前里程碑和既定结局，不得跳过中间阶段。',
    '不要自行修改故事结构；推进报告只是建议，等待作者确认。',
    section('创作圣经', context.bible),
    section('故事线', context.storyline),
    section('里程碑顺序', context.milestones),
    section('当前节点', context.node),
    section('下一节点入口', context.nextNode),
    section('相关角色', context.characters),
    section('相关世界设定', context.lore),
    section('未回收伏笔', context.foreshadows),
    section('最近章节摘要', context.chapterSummaries),
    section('作者补充要求', context.extraInstructions ?? ''),
    `目标字数：约 ${context.targetWords} 字。`,
    'JSON 格式：',
    JSON.stringify({
      title: '章节标题',
      content: '章节正文',
      summary: '章节摘要',
      report: {
        completedNodeGoals: ['本章完成的节点目标'],
        milestoneProgress: '推进的里程碑与建议幅度',
        characterChanges: ['角色状态变化'],
        worldChanges: ['世界状态变化'],
        foreshadowChanges: ['伏笔变化'],
        endingAlignment: '与结局方向的一致性检查',
        nextChapterGoal: '建议的下一章节目标',
        warnings: ['可能跳跃、偏离或提前揭晓的风险'],
      },
    }),
  ].join('\n\n');
}

function section(title: string, value: unknown): string {
  return `[${title}]\n${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}`;
}
