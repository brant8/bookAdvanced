import { useMutation, useQuery } from '@tanstack/react-query';
import type { GeneratedChapter } from '@storyverse/contracts';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';

import { TimelineRail } from '../../components/TimelineRail';
import { creativeApi } from '../creative/creativeApi';
import { deleteDraft, getDraft, saveDraft } from '../../lib/drafts';
import { generateChapter, previewGenerationContext } from './aiApi';
import { workspaceApi } from './workspaceApi';

export function WritePage() {
  const { projectId = '' } = useParams();
  const nodes = useQuery({
    queryFn: () => creativeApi.listNodes(projectId),
    queryKey: ['story-nodes', projectId],
  });
  const chapterMeta = useQuery({
    queryFn: () => workspaceApi.chapterMeta(projectId),
    queryKey: ['chapter-meta', projectId],
  });
  const [nodeId, setNodeId] = useState('');
  const selected = nodes.data?.find((node) => node.id === nodeId);
  useEffect(() => {
    if (!nodeId && nodes.data?.[0]) setNodeId(nodes.data[0].id);
  }, [nodeId, nodes.data]);
  return (
    <main className="workspace-page workspace-page--wide">
      <p className="eyebrow">T-011 / WRITING</p>
      <h1>正文编辑器</h1>
      <TimelineRail
        chapters={chapterMeta.data ?? []}
        selectedNodeId={nodeId}
        onSelect={setNodeId}
      />
      <div className="writer-layout">
        <aside className="chapter-list">
          {(nodes.data ?? []).map((node) => (
            <button
              className={node.id === nodeId ? 'active' : ''}
              key={node.id}
              onClick={() => setNodeId(node.id)}
            >
              <small>第 {node.sortOrder + 1} 章</small>
              {node.title}
            </button>
          ))}
        </aside>
        {selected ? (
          <ChapterEditor key={selected.id} node={selected} />
        ) : (
          <section className="editor empty-state">请先创建故事节点。</section>
        )}
      </div>
    </main>
  );
}

function ChapterEditor({
  node,
}: {
  node: {
    conflict: string;
    description: string;
    id: string;
    nodeGoal: string;
    requiredEvents: string[];
    sortOrder: number;
    status: 'planned' | 'drafting' | 'completed';
    storyTimeLabel: string;
    summary: string;
    title: string;
  };
}) {
  const draftKey = `chapter:${node.id}`;
  const chapter = useQuery({
    queryFn: () => workspaceApi.getChapter(node.id),
    queryKey: ['chapter', node.id],
  });
  const [content, setContent] = useState('');
  const [showAi, setShowAi] = useState(false);
  const [saveState, setSaveState] = useState('正在载入');
  const cleanLength = content.replace(/\s/g, '').length;
  const requiredHits = node.requiredEvents.filter((event) => event && content.includes(event));
  const completionHints = [
    node.nodeGoal && content.includes(node.nodeGoal) ? '节点目标已在正文中出现' : '',
    requiredHits.length
      ? `已覆盖 ${requiredHits.length}/${node.requiredEvents.length} 个必需事件`
      : '',
    node.status === 'completed' ? '故事节点已标记完成' : '',
  ].filter(Boolean);
  const save = useMutation({
    mutationFn: (value: string) =>
      workspaceApi.saveChapter(node.id, {
        chapterNumber: node.sortOrder + 1,
        content: value,
        title: node.title,
      }),
    onSuccess: async () => {
      await deleteDraft(draftKey);
      setSaveState('已保存');
    },
    onError: () => setSaveState('离线草稿已保留'),
  });
  useEffect(() => {
    void getDraft(draftKey).then((draft) => {
      setContent(draft ?? chapter.data?.content ?? '');
      setSaveState(draft ? '已恢复本地草稿' : '已同步');
    });
  }, [chapter.data?.content, draftKey]);
  useEffect(() => {
    if (chapter.isLoading) return;
    setSaveState('等待保存');
    const timer = window.setTimeout(() => {
      void saveDraft(draftKey, content).then(() => save.mutate(content));
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [content, draftKey, chapter.isLoading]);
  return (
    <section className="editor">
      <header>
        <div>
          <small>节点目标</small>
          <strong>{node.nodeGoal || '尚未定义'}</strong>
          <small>
            {node.storyTimeLabel || `第 ${node.sortOrder + 1} 章`} · {node.status}
          </small>
        </div>
        <div className="button-row">
          <span>{saveState}</span>
          <button className="button button--quiet" onClick={() => setShowAi(!showAi)}>
            AI 生成候选
          </button>
        </div>
      </header>
      {showAi ? <GenerationPanel nodeId={node.id} onApply={(value) => setContent(value)} /> : null}
      <div className="chapter-health">
        <article>
          <span>当前长度</span>
          <strong>{cleanLength}</strong>
          <small>字，自动保存中</small>
        </article>
        <article>
          <span>节点完成度</span>
          <strong>{completionHints.length ? '有进展' : '待确认'}</strong>
          <small>{completionHints[0] ?? '采用 AI 候选后请检查目标与必需事件。'}</small>
        </article>
        <article>
          <span>冲突/张力</span>
          <strong>{node.conflict ? '已设定' : '未设定'}</strong>
          <small>{node.conflict || node.summary || '建议补充本章核心冲突。'}</small>
        </article>
      </div>
      <input className="editor__title" value={node.title} readOnly />
      <textarea
        aria-label="章节正文"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="从这一幕开始写……"
      />
      <footer>
        <span>{cleanLength} 字</span>
        <span>停止输入 1.2 秒后自动保存</span>
      </footer>
    </section>
  );
}

function GenerationPanel({ nodeId, onApply }: { nodeId: string; onApply(content: string): void }) {
  const [baseUrl, setBaseUrl] = useState(
    () => localStorage.getItem('storyverse.ai.baseUrl') ?? 'http://localhost:11434/v1',
  );
  const [model, setModel] = useState(
    () => localStorage.getItem('storyverse.ai.model') ?? 'qwen2.5:7b',
  );
  const [apiKey, setApiKey] = useState('');
  const [targetWords, setTargetWords] = useState(1500);
  const [extraInstructions, setExtraInstructions] = useState('');
  const [protocol, setProtocol] = useState<'chat-completions' | 'responses'>('chat-completions');
  const [context, setContext] = useState<unknown>(null);
  const generation = useMutation({
    mutationFn: () =>
      generateChapter(nodeId, {
        provider: { apiKey: apiKey || undefined, baseUrl, model, protocol },
        extraInstructions: extraInstructions || undefined,
        targetWords,
      }),
    onSuccess: () => {
      localStorage.setItem('storyverse.ai.baseUrl', baseUrl);
      localStorage.setItem('storyverse.ai.model', model);
    },
  });
  return (
    <aside className="generation-panel">
      <div className="generation-panel__config">
        <label>
          兼容接口地址
          <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
        </label>
        <label>
          模型
          <input value={model} onChange={(event) => setModel(event.target.value)} />
        </label>
        <label>
          协议
          <select
            value={protocol}
            onChange={(event) =>
              setProtocol(event.target.value as 'chat-completions' | 'responses')
            }
          >
            <option value="chat-completions">Chat Completions / Ollama</option>
            <option value="responses">OpenAI Responses</option>
          </select>
        </label>
        <label>
          API Key（仅本次页面内存）
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </label>
        <label>
          目标字数
          <input
            min={200}
            max={20000}
            type="number"
            value={targetWords}
            onChange={(event) => setTargetWords(Number(event.target.value))}
          />
        </label>
        <label>
          本章补充指令
          <textarea
            value={extraInstructions}
            onChange={(event) => setExtraInstructions(event.target.value)}
            placeholder="例如：加强对话、不要提前揭露结局、让主角在结尾作出选择。"
          />
        </label>
      </div>
      <div className="button-row">
        <button
          className="button button--quiet"
          onClick={() => void previewGenerationContext(nodeId).then(setContext)}
        >
          预览发送范围
        </button>
        <button
          className="button"
          disabled={generation.isPending}
          onClick={() => generation.mutate()}
        >
          {generation.isPending ? '正在生成…' : '生成候选章节'}
        </button>
      </div>
      {context ? <pre className="context-preview">{JSON.stringify(context, null, 2)}</pre> : null}
      {generation.error ? <p className="notice notice--error">{generation.error.message}</p> : null}
      {generation.data ? (
        <div className="generation-result">
          <h3>{generation.data.title}</h3>
          <p>{generation.data.summary}</p>
          <ChapterGenerationReport candidate={generation.data} targetWords={targetWords} />
          <button className="button" onClick={() => onApply(generation.data.content)}>
            采用为当前正文
          </button>
        </div>
      ) : null}
    </aside>
  );
}

function ChapterGenerationReport({
  candidate,
  targetWords,
}: {
  candidate: GeneratedChapter;
  targetWords: number;
}) {
  const wordCount = candidate.content.replace(/\s/g, '').length;
  const completion = Math.min(100, Math.round((wordCount / targetWords) * 100));
  const reportItems = [
    ['节点目标', candidate.report.completedNodeGoals],
    ['角色变化', candidate.report.characterChanges],
    ['世界变化', candidate.report.worldChanges],
    ['伏笔变化', candidate.report.foreshadowChanges],
  ] as const;
  return (
    <section className="ai-report">
      <div className="ai-report__score">
        <article>
          <span>长度完成度</span>
          <strong>{completion}%</strong>
          <small>
            {wordCount} / {targetWords} 字
          </small>
        </article>
        <article>
          <span>故事线推进</span>
          <strong>{candidate.report.milestoneProgress || '待复核'}</strong>
          <small>{candidate.report.endingAlignment || '模型未说明与结局的关系。'}</small>
        </article>
        <article>
          <span>下一章目标</span>
          <strong>{candidate.report.nextChapterGoal || '待作者指定'}</strong>
        </article>
      </div>
      {candidate.report.warnings.length ? (
        <div className="ai-report__warnings">
          <strong>警告</strong>
          {candidate.report.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : (
        <p className="notice">AI 未报告明显偏离，但仍建议人工复核伏笔和结局收束。</p>
      )}
      <div className="ai-report__grid">
        {reportItems.map(([label, values]) => (
          <article key={label}>
            <strong>{label}</strong>
            {values.length ? (
              <ul>
                {values.map((value) => (
                  <li key={value}>{value}</li>
                ))}
              </ul>
            ) : (
              <small>暂无记录</small>
            )}
          </article>
        ))}
      </div>
      <details>
        <summary>查看原始 JSON 报告</summary>
        <pre>{JSON.stringify(candidate.report, null, 2)}</pre>
      </details>
    </section>
  );
}
