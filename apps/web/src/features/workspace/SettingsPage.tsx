import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router';

import { aiSettingsApi } from './aiSettingsApi';
import { downloadText, workspaceApi } from './workspaceApi';

export function SettingsPage() {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const snapshots = useQuery({
    queryFn: () => workspaceApi.listSnapshots(projectId),
    queryKey: ['snapshots', projectId],
  });
  const snapshot = useMutation({
    mutationFn: () => workspaceApi.createSnapshot(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['snapshots', projectId] }),
  });
  const providers = useQuery({
    queryFn: aiSettingsApi.listProviders,
    queryKey: ['ai-providers'],
  });
  const runs = useQuery({
    queryFn: () => aiSettingsApi.listRuns(projectId),
    queryKey: ['generation-runs', projectId],
  });
  const [provider, setProvider] = useState({
    apiKey: '',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'qwen2.5:7b',
    kind: 'text' as 'text' | 'image',
    models: 'qwen2.5:7b',
    name: '本地 Ollama',
    protocol: 'chat-completions',
  });
  const createProvider = useMutation({
    mutationFn: () =>
      aiSettingsApi.createProvider({
        ...provider,
        apiKey: provider.apiKey || undefined,
        enabled: true,
        models: provider.models
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-providers'] }),
  });
  const runExport = async (format: string) => {
    const document = await workspaceApi.export(projectId, format);
    downloadText(document.fileName, document.contentType, document.content);
  };
  return (
    <main className="workspace-page">
      <p className="eyebrow">T-013 / PORTABILITY</p>
      <h1>项目与 AI 设置</h1>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>AI Provider 与模型</h2>
            <p>文本和图片接口独立配置；API Key 加密保存在服务端。</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            名称
            <input
              value={provider.name}
              onChange={(event) => setProvider({ ...provider, name: event.target.value })}
            />
          </label>
          <label>
            类型
            <select
              value={provider.kind}
              onChange={(event) =>
                setProvider({ ...provider, kind: event.target.value as 'text' | 'image' })
              }
            >
              <option value="text">文本模型</option>
              <option value="image">图片模型</option>
            </select>
          </label>
          <label>
            API 地址
            <input
              value={provider.baseUrl}
              onChange={(event) => setProvider({ ...provider, baseUrl: event.target.value })}
            />
          </label>
          <label>
            协议
            <input
              value={provider.protocol}
              onChange={(event) => setProvider({ ...provider, protocol: event.target.value })}
            />
          </label>
          <label>
            默认模型
            <input
              value={provider.defaultModel}
              onChange={(event) => setProvider({ ...provider, defaultModel: event.target.value })}
            />
          </label>
          <label>
            可选模型（逗号分隔）
            <input
              value={provider.models}
              onChange={(event) => setProvider({ ...provider, models: event.target.value })}
            />
          </label>
          <label>
            API Key
            <input
              type="password"
              value={provider.apiKey}
              onChange={(event) => setProvider({ ...provider, apiKey: event.target.value })}
            />
          </label>
          <button className="button" onClick={() => createProvider.mutate()}>
            保存 Provider
          </button>
        </div>
        <div className="record-list">
          {(providers.data ?? []).map((item) => (
            <article key={item.id}>
              <div>
                <strong>
                  {item.name} · {item.kind === 'text' ? '文本' : '图片'}
                </strong>
                <small>
                  {item.defaultModel} · {item.hasApiKey ? '已配置 Key' : '无 Key'}
                </small>
              </div>
              <button
                className="button button--danger"
                onClick={() =>
                  void aiSettingsApi
                    .deleteProvider(item.id)
                    .then(() => queryClient.invalidateQueries({ queryKey: ['ai-providers'] }))
                }
              >
                删除
              </button>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>AI 生成记录</h2>
        <div className="record-list">
          {(runs.data ?? []).map((run) => (
            <article key={run.id}>
              <div>
                <strong>{run.taskType}</strong>
                <small>
                  {run.status} · {new Date(run.createdAt).toLocaleString()}
                </small>
              </div>
            </article>
          ))}
          {!runs.data?.length ? <p>尚无生成记录。</p> : null}
        </div>
      </section>
      <section className="panel">
        <h2>离线导出</h2>
        <p>文件直接在浏览器生成并下载，不上传到第三方服务。</p>
        <div className="button-row">
          <button className="button" onClick={() => void runExport('master-md')}>
            项目 Master MD
          </button>
          <button className="button button--quiet" onClick={() => void runExport('novel-md')}>
            正文 Markdown
          </button>
          <button className="button button--quiet" onClick={() => void runExport('novel-txt')}>
            正文 TXT
          </button>
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>项目快照</h2>
            <p>快照保存在 PostgreSQL 数据卷中，适合 NAS 定期备份。</p>
          </div>
          <button className="button" onClick={() => snapshot.mutate()}>
            创建快照
          </button>
        </div>
        <div className="record-list">
          {(snapshots.data ?? []).map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.label}</strong>
                <small>{new Date(item.createdAt).toLocaleString()}</small>
              </div>
              <div className="button-row">
                <button
                  className="button button--quiet"
                  onClick={() =>
                    void workspaceApi
                      .downloadSnapshot(item.id)
                      .then((data) =>
                        downloadText(
                          `${item.label}.json`,
                          'application/json',
                          JSON.stringify(data, null, 2),
                        ),
                      )
                  }
                >
                  下载 JSON
                </button>
                <button
                  className="button button--danger"
                  onClick={() => {
                    if (window.confirm('恢复会覆盖当前项目内容，确定继续？'))
                      void workspaceApi
                        .restoreSnapshot(item.id)
                        .then(() => window.location.reload());
                  }}
                >
                  恢复
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
