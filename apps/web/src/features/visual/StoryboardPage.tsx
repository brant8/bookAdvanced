import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Asset, Storyboard } from '@storyverse/contracts';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';

import { TimelineRail } from '../../components/TimelineRail';
import { aiSettingsApi } from '../workspace/aiSettingsApi';
import { workspaceApi } from '../workspace/workspaceApi';
import { visualApi } from './visualApi';

export function StoryboardPage() {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const board = useQuery({
    queryFn: () => visualApi.getStoryboard(projectId),
    queryKey: ['storyboard', projectId],
  });
  const chapterMeta = useQuery({
    queryFn: () => workspaceApi.chapterMeta(projectId),
    queryKey: ['chapter-meta', projectId],
  });
  const assets = useQuery({
    queryFn: () => visualApi.listAssets(projectId),
    queryKey: ['assets', projectId],
  });
  const exportPlan = useQuery({
    enabled: Boolean(board.data),
    queryFn: () => visualApi.getStoryboardExportPlan(projectId),
    queryKey: ['storyboard-export-plan', projectId],
  });
  const providers = useQuery({
    queryFn: aiSettingsApi.listProviders,
    queryKey: ['ai-providers'],
  });
  const textProviders = (providers.data ?? []).filter((item) => item.kind === 'text');
  const [providerId, setProviderId] = useState('');
  const generate = useMutation({
    mutationFn: () => visualApi.generateStoryboard(projectId, providerId || undefined),
    onSuccess: async (value) => {
      queryClient.setQueryData(['storyboard', projectId], value);
      await queryClient.invalidateQueries({ queryKey: ['storyboard-export-plan', projectId] });
    },
  });
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const shots = board.data?.shots ?? [];
  const shot = shots[index];
  const selectedNodeId = shot?.storyNodeId ?? '';
  const playheadRatio = shots.length <= 1 ? 0 : index / (shots.length - 1);
  const shotAsset = useMemo(
    () => findShotAsset(board.data, assets.data ?? [], index),
    [assets.data, board.data, index],
  );

  useEffect(() => {
    if (!playing || !shot) return;
    const timer = window.setTimeout(() => {
      if (index + 1 >= shots.length) {
        setPlaying(false);
        setIndex(0);
      } else {
        setIndex(index + 1);
      }
    }, shot.durationMs);
    return () => window.clearTimeout(timer);
  }, [index, playing, shot, shots.length]);

  return (
    <main className="workspace-page workspace-page--wide">
      <p className="eyebrow">T-031 / STORYBOARD PLAYER</p>
      <div className="page-heading">
        <div>
          <h1>分镜 / 定格播放器</h1>
          <p>把章节轨道、分镜镜头和素材图层连起来，先用浏览器完成低成本剪纸动画预览。</p>
        </div>
        <div className="button-row">
          <select value={providerId} onChange={(event) => setProviderId(event.target.value)}>
            <option value="">免费节点草稿</option>
            {textProviders.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.defaultModel}
              </option>
            ))}
          </select>
          <button className="button" onClick={() => generate.mutate()}>
            {providerId ? 'AI 生成分镜' : '生成节点分镜'}
          </button>
        </div>
      </div>
      <TimelineRail
        chapters={chapterMeta.data ?? []}
        height={86}
        playheadRatio={playheadRatio}
        selectedNodeId={selectedNodeId}
        showPlayhead
        onPlayheadMove={(ratio) => setIndex(indexFromRatio(ratio, shots.length))}
        onSelect={(nodeId) => {
          const nextIndex = shots.findIndex((item) => item.storyNodeId === nodeId);
          if (nextIndex >= 0) setIndex(nextIndex);
        }}
      />
      <section className={`story-player story-player--${shot?.transition ?? 'fade'}`}>
        {shot ? (
          <div key={shot.id} className="story-player__shot">
            <div className="story-player__stage">
              <div className="paper-layer paper-layer--back" />
              {shotAsset ? (
                <img
                  className="paper-layer paper-layer--image"
                  src={shotAsset.url}
                  alt={shotAsset.name}
                />
              ) : (
                <div className="paper-layer paper-layer--prompt">{shot.visualPrompt}</div>
              )}
              <div className="paper-layer paper-layer--front" />
            </div>
            <div className="story-player__caption">
              <small>
                镜头 {index + 1} / {shots.length} · {shot.durationMs / 1000}s · {shot.transition}
              </small>
              <h2>{shot.title}</h2>
              <p>{shot.visualPrompt}</p>
              <blockquote>{shot.narration}</blockquote>
            </div>
          </div>
        ) : (
          <p>先生成故事分镜。</p>
        )}
        <div className="story-player__controls">
          <button
            className="button button--quiet"
            disabled={!shots.length}
            onClick={() => setIndex(0)}
          >
            回到开头
          </button>
          <button className="button" disabled={!shots.length} onClick={() => setPlaying(!playing)}>
            {playing ? '暂停' : '播放'}
          </button>
          <button
            className="button button--quiet"
            disabled={!shots.length}
            onClick={() => setIndex((current) => Math.min(shots.length - 1, current + 1))}
          >
            下一镜
          </button>
        </div>
      </section>
      <div className="shot-strip">
        {shots.map((item, shotIndex) => (
          <button
            key={item.id}
            className={shotIndex === index ? 'active' : ''}
            onClick={() => setIndex(shotIndex)}
          >
            <small>{shotIndex + 1}</small>
            {item.title}
          </button>
        ))}
      </div>
      <section className="panel storyboard-export-panel">
        <div className="section-heading">
          <div>
            <h2>分镜导出规划</h2>
            <p>
              当前阶段只生成可审查的导出清单：浏览器负责低成本预览，真正视频导出、音频混流和批量渲染留给
              NAS Worker。
            </p>
          </div>
          <span>
            {exportPlan.data
              ? `${Math.round(exportPlan.data.totalDurationMs / 1000)}s`
              : '待生成分镜'}
          </span>
        </div>
        {exportPlan.data ? (
          <>
            <div className="storyboard-export-grid">
              <article>
                <span>浏览器预览</span>
                <strong>{exportPlan.data.browserPreview.available ? '可用' : '不可用'}</strong>
                <p>{exportPlan.data.browserPreview.output}</p>
              </article>
              <article>
                <span>估算帧数</span>
                <strong>{exportPlan.data.estimatedFrameCount}</strong>
                <p>
                  {exportPlan.data.frameRate} fps · {exportPlan.data.videoExport.resolution}
                </p>
              </article>
              <article>
                <span>缺失素材</span>
                <strong>{exportPlan.data.missingAssetCount}</strong>
                <p>
                  {exportPlan.data.missingAssetCount ? '需要先补场景图或镜头图' : '视觉素材已覆盖'}
                </p>
              </article>
              <article>
                <span>视频导出</span>
                <strong>{exportPlan.data.videoExport.status}</strong>
                <p>
                  {exportPlan.data.videoExport.container} · {exportPlan.data.videoExport.codec}
                </p>
              </article>
            </div>
            <div className="storyboard-export-columns">
              <article>
                <h3>NAS Worker 边界</h3>
                <ul>
                  {exportPlan.data.nasWorker.steps.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <small>{exportPlan.data.nasWorker.suggestedMounts.join(' · ')}</small>
              </article>
              <article>
                <h3>音频混流边界</h3>
                <ul>
                  {exportPlan.data.audioMix.boundaries.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <small>{exportPlan.data.audioMix.tracks.join(' · ')}</small>
              </article>
            </div>
          </>
        ) : (
          <p className="notice">先生成分镜后再查看导出规划。</p>
        )}
      </section>
    </main>
  );
}

function indexFromRatio(ratio: number, count: number) {
  if (count <= 1) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1))));
}

function findShotAsset(board: Storyboard | null | undefined, assets: Asset[], index: number) {
  const shot = board?.shots[index];
  if (!shot) return null;
  return (
    assets.find((asset) => asset.id === shot.assetId) ??
    assets.find((asset) => asset.storyNodeId === shot.storyNodeId && asset.kind === 'scene') ??
    null
  );
}
