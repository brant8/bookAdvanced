import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useOutletContext } from 'react-router';

import type { Project } from '@storyverse/contracts';
import { TimelineRail } from '../../components/TimelineRail';
import { workspaceApi } from '../workspace/workspaceApi';

export function DirectorPage() {
  const { project } = useOutletContext<{ project: Project }>();
  const dashboard = useQuery({
    queryFn: () => workspaceApi.directorDashboard(project.id),
    queryKey: ['director-dashboard', project.id],
  });
  const chapterMeta = useQuery({
    queryFn: () => workspaceApi.chapterMeta(project.id),
    queryKey: ['chapter-meta', project.id],
  });
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const data = dashboard.data;
  const nodeCompletion = data?.story.targetNodes
    ? Math.round((data.story.completedNodes / data.story.targetNodes) * 100)
    : 0;
  const voiceCompletion = data?.characters.length
    ? Math.round(
        (data.characters.filter((character) => character.hasVoice).length /
          data.characters.length) *
          100,
      )
    : 0;

  return (
    <main className="workspace-page">
      <p className="eyebrow">T-028 / DIRECTOR DASHBOARD</p>
      <div className="dashboard-heading">
        <div>
          <h1>导演仪表盘</h1>
          <p className="page-intro">
            从故事推进、AI 队列、伏笔风险和视觉素材四个角度检查项目是否还在朝结局前进。
          </p>
        </div>
        <Link className="button" to="../write">
          回到正文
        </Link>
      </div>
      <div className="metric-grid">
        <article>
          <span>故事节点完成度</span>
          <strong>{nodeCompletion}%</strong>
          <small>
            {data?.story.completedNodes ?? 0} / {data?.story.targetNodes ?? 0} 个节点
          </small>
        </article>
        <article>
          <span>正文总字数</span>
          <strong>{data?.story.totalWordCount ?? 0}</strong>
          <small>{data?.story.chapterCount ?? 0} 个章节</small>
        </article>
        <article>
          <span>AI 队列</span>
          <strong>{data?.aiQueuePending ?? 0}</strong>
          <small>pending / running</small>
        </article>
        <article>
          <span>视觉素材</span>
          <strong>{data?.assets.total ?? 0}</strong>
          <small>{data?.storyboardShotCount ?? 0} 个分镜镜头</small>
        </article>
      </div>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>NVR 章节轨道</h2>
            <p>横向拖动或滚轮平移，快速检查章节密度、关键场景和当前完成状态。</p>
          </div>
          <Link className="text-link" to="../write">
            打开正文编辑器
          </Link>
        </div>
        <TimelineRail
          chapters={chapterMeta.data ?? []}
          selectedNodeId={selectedNodeId}
          onSelect={setSelectedNodeId}
        />
      </section>
      <div className="director-grid">
        <section className="panel director-progress">
          <h2>故事进度</h2>
          <ProgressBar label="节点完成" value={nodeCompletion} />
          <ProgressBar
            label="伏笔回收"
            value={
              data?.foreshadows.total
                ? Math.round((data.foreshadows.revealed / data.foreshadows.total) * 100)
                : 0
            }
          />
          <ProgressBar label="角色声音" value={voiceCompletion} />
        </section>
        <section className="panel">
          <h2>角色声音绑定</h2>
          <div className="record-list">
            {(data?.characters ?? []).map((character) => (
              <article key={character.id}>
                <div>
                  <strong>{character.name}</strong>
                  <small>{character.hasVoice ? '已有声音样本' : '未配置声音样本'}</small>
                </div>
              </article>
            ))}
            {!data?.characters.length ? <p>暂无角色。</p> : null}
          </div>
        </section>
        <section className="panel">
          <h2>伏笔预警</h2>
          <div className="record-list">
            {(data?.foreshadows.overdue ?? []).map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.importance} · 已达到预警阈值</small>
                </div>
              </article>
            ))}
            {!data?.foreshadows.overdue.length ? <p>暂无过期伏笔。</p> : null}
          </div>
        </section>
        <section className="panel">
          <h2>素材分布</h2>
          <div className="asset-kind-grid">
            {Object.entries(data?.assets.byKind ?? {}).map(([kind, count]) => (
              <article key={kind}>
                <span>{kind}</span>
                <strong>{count}</strong>
              </article>
            ))}
            {!Object.keys(data?.assets.byKind ?? {}).length ? <p>暂无素材。</p> : null}
          </div>
        </section>
        <section className="panel">
          <h2>最近 AI 任务</h2>
          <div className="record-list">
            {(data?.recentGenerations ?? []).map((run) => (
              <article key={run.id}>
                <div>
                  <strong>{run.taskType}</strong>
                  <small>
                    {run.status} · {new Date(run.createdAt).toLocaleString()}
                  </small>
                </div>
              </article>
            ))}
            {!data?.recentGenerations.length ? <p>暂无 AI 任务。</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="director-progress__item">
      <div>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="director-progress__bar">
        <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}
