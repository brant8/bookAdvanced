import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';

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
  const [nodeId, setNodeId] = useState('');
  const selected = nodes.data?.find((node) => node.id === nodeId);
  useEffect(() => {
    if (!nodeId && nodes.data?.[0]) setNodeId(nodes.data[0].id);
  }, [nodeId, nodes.data]);
  return (
    <main className="workspace-page workspace-page--wide">
      <p className="eyebrow">T-011 / WRITING</p>
      <h1>正文编辑器</h1>
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
  node: { id: string; sortOrder: number; title: string; nodeGoal: string };
}) {
  const draftKey = `chapter:${node.id}`;
  const chapter = useQuery({
    queryFn: () => workspaceApi.getChapter(node.id),
    queryKey: ['chapter', node.id],
  });
  const [content, setContent] = useState('');
  const [showAi, setShowAi] = useState(false);
  const [saveState, setSaveState] = useState('正在载入');
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
        </div>
        <div className="button-row">
          <span>{saveState}</span>
          <button className="button button--quiet" onClick={() => setShowAi(!showAi)}>
            AI 生成候选
          </button>
        </div>
      </header>
      {showAi ? <GenerationPanel nodeId={node.id} onApply={(value) => setContent(value)} /> : null}
      <input className="editor__title" value={node.title} readOnly />
      <textarea
        aria-label="章节正文"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="从这一幕开始写……"
      />
      <footer>
        <span>{content.replace(/\s/g, '').length} 字</span>
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
  const [protocol, setProtocol] = useState<'chat-completions' | 'responses'>('chat-completions');
  const [context, setContext] = useState<unknown>(null);
  const generation = useMutation({
    mutationFn: () =>
      generateChapter(nodeId, {
        provider: { apiKey: apiKey || undefined, baseUrl, model, protocol },
        targetWords: 1500,
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
          <details>
            <summary>查看故事线推进报告</summary>
            <pre>{JSON.stringify(generation.data.report, null, 2)}</pre>
          </details>
          <button className="button" onClick={() => onApply(generation.data.content)}>
            采用为当前正文
          </button>
        </div>
      ) : null}
    </aside>
  );
}
