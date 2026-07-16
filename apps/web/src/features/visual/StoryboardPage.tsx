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
  const ttsPlan = useQuery({
    queryFn: () => visualApi.getTtsDubbingPlan(projectId),
    queryKey: ['storyboard-tts-plan', projectId],
  });
  const ttsReservation = useQuery({
    queryFn: () => visualApi.getTtsProviderReservation(projectId),
    queryKey: ['storyboard-tts-provider-reservation', projectId],
  });
  const workerQueue = useQuery({
    queryFn: () => visualApi.getStoryboardWorkerQueue(projectId),
    queryKey: ['storyboard-worker-queue', projectId],
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
      await queryClient.invalidateQueries({ queryKey: ['storyboard-tts-plan', projectId] });
      await queryClient.invalidateQueries({
        queryKey: ['storyboard-tts-provider-reservation', projectId],
      });
      await queryClient.invalidateQueries({ queryKey: ['storyboard-worker-queue', projectId] });
    },
  });
  const dryRunWorker = useMutation({
    mutationFn: () => visualApi.dryRunStoryboardWorker(projectId),
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
      <section className="panel tts-plan-panel">
        <div className="section-heading">
          <div>
            <h2>TTS 配音计划</h2>
            <p>
              先用浏览器本地试听校准节奏；真实音频生成、音频素材库和付费 Provider
              接入留到显式配置后执行。
            </p>
          </div>
          <span>{ttsPlan.data?.costStrategy ?? '本地/免费优先'}</span>
        </div>
        {ttsPlan.data ? (
          <>
            <div className="tts-provider-grid">
              {ttsPlan.data.providerOptions.map((provider) => (
                <article key={provider.id}>
                  <span>
                    {provider.mode} · {provider.risk}
                  </span>
                  <strong>{provider.label}</strong>
                  <p>{provider.setup}</p>
                  <small>{provider.status}</small>
                </article>
              ))}
            </div>
            <div className="storyboard-export-columns">
              <article>
                <h3>角色声线准备</h3>
                <ul>
                  {ttsPlan.data.voiceReadiness.map((voice) => (
                    <li key={voice.characterId}>
                      {voice.name} · {voice.sampleCount}/10 · {voice.status}
                    </li>
                  ))}
                </ul>
              </article>
              <article>
                <h3>音频素材边界</h3>
                <ul>
                  {ttsPlan.data.audioLibrary.boundaries.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <small>{ttsPlan.data.audioLibrary.suggestedPath}</small>
              </article>
            </div>
            <div className="tts-queue">
              {ttsPlan.data.dubbingQueue.map((item) => (
                <article key={item.shotId}>
                  <div>
                    <strong>
                      {item.sortOrder + 1}. {item.title}
                    </strong>
                    <small>
                      {Math.round(item.durationMs / 1000)}s · {item.preferredVoice} · {item.status}
                    </small>
                    <p>{item.narration || '此镜头暂无旁白文本。'}</p>
                  </div>
                  <button
                    className="button button--quiet"
                    disabled={!item.narration}
                    onClick={() => speakPreview(item.narration)}
                  >
                    浏览器试听
                  </button>
                </article>
              ))}
              {!ttsPlan.data.dubbingQueue.length ? (
                <p className="notice">先生成分镜后再生成配音队列。</p>
              ) : null}
            </div>
          </>
        ) : (
          <p className="notice">正在准备 TTS 配音计划。</p>
        )}
      </section>
      <section className="panel tts-reservation-panel">
        <div className="section-heading">
          <div>
            <h2>TTS Provider 与音频素材库预留</h2>
            <p>
              这里先固定免费优先、密钥存储、模型选择和音频文件边界；真正新增音频表和付费 Provider
              要等工作流稳定后再做。
            </p>
          </div>
          <span>{ttsReservation.data?.audioLibrary.rootPath ?? '准备中'}</span>
        </div>
        {ttsReservation.data ? (
          <>
            <div className="worker-queue-summary">
              <article>
                <span>音频根目录</span>
                <strong>{ttsReservation.data.audioLibrary.artifactTypes.length}</strong>
                <p>{ttsReservation.data.audioLibrary.rootPath}</p>
              </article>
              <article>
                <span>Manifest</span>
                <strong>JSON</strong>
                <p>{ttsReservation.data.audioLibrary.manifestPath}</p>
              </article>
              <article>
                <span>成本策略</span>
                <strong>Free First</strong>
                <p>{ttsReservation.data.costPolicy}</p>
              </article>
            </div>
            <div className="tts-provider-grid">
              {ttsReservation.data.providerSlots.map((provider) => (
                <article key={provider.id}>
                  <span>
                    {provider.mode} · {provider.keyStorage}
                  </span>
                  <strong>{provider.label}</strong>
                  <p>{provider.modelSelection}</p>
                  <small>{provider.requiredBeforeEnable.join(' · ')}</small>
                </article>
              ))}
            </div>
            <div className="storyboard-export-columns">
              <article>
                <h3>素材库规则</h3>
                <ul>
                  <li>{ttsReservation.data.audioLibrary.namingPattern}</li>
                  <li>{ttsReservation.data.audioLibrary.retentionPolicy}</li>
                  {ttsReservation.data.audioLibrary.consentNotes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article>
                <h3>后续接入步骤</h3>
                <ul>
                  {ttsReservation.data.nextSteps.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </div>
          </>
        ) : (
          <p className="notice">正在准备 TTS Provider 预留计划。</p>
        )}
      </section>
      <section className="panel worker-queue-panel">
        <div className="section-heading">
          <div>
            <h2>导出 Worker 队列</h2>
            <p>
              这是给本地/NAS Worker
              读取的文件任务清单雏形；当前页面只规划任务，不启动后台进程、不写视频文件。
            </p>
          </div>
          <span>
            {workerQueue.data ? `${workerQueue.data.mode} · ${workerQueue.data.status}` : '准备中'}
          </span>
        </div>
        {workerQueue.data ? (
          <>
            <div className="worker-queue-summary">
              <article>
                <span>任务队列</span>
                <strong>{workerQueue.data.queueName}</strong>
                <p>{workerQueue.data.rootPath}</p>
              </article>
              <article>
                <span>导出目录</span>
                <strong>{workerQueue.data.tasks.length}</strong>
                <p>{workerQueue.data.outputPath}</p>
              </article>
              <article>
                <span>阻塞项</span>
                <strong>{workerQueue.data.warnings.length}</strong>
                <p>{workerQueue.data.warnings.join(' / ') || '队列可进入后续 Worker 实现'}</p>
              </article>
            </div>
            <div className="worker-task-list">
              {workerQueue.data.tasks.map((task) => (
                <article key={task.id}>
                  <div>
                    <small>
                      {task.type} · {task.status}
                    </small>
                    <strong>{task.title}</strong>
                    <p>
                      depends on {task.dependsOn.length ? task.dependsOn.join(', ') : 'nothing'} ·
                      output {Object.values(task.output).join(', ')}
                    </p>
                  </div>
                </article>
              ))}
            </div>
            <div className="worker-dry-run">
              <button className="button" onClick={() => dryRunWorker.mutate()}>
                Worker Dry-run 写 Manifest
              </button>
              <p>只预演目录、JSON、帧序列、音频和预览视频产物；不启动 FFmpeg、不生成真实视频。</p>
            </div>
            {dryRunWorker.data ? (
              <div className="worker-manifest">
                <div>
                  <span>Dry-run Manifest</span>
                  <strong>{dryRunWorker.data.status}</strong>
                  <p>{dryRunWorker.data.manifestPath}</p>
                </div>
                <div>
                  <span>执行 / 阻塞 / 跳过</span>
                  <strong>
                    {dryRunWorker.data.executedTaskIds.length} /{' '}
                    {dryRunWorker.data.blockedTaskIds.length} /{' '}
                    {dryRunWorker.data.skippedTaskIds.length}
                  </strong>
                  <p>{dryRunWorker.data.warnings.join(' / ')}</p>
                </div>
                <ul>
                  {dryRunWorker.data.artifacts.map((artifact) => (
                    <li key={`${artifact.sourceTaskId}-${artifact.path}`}>
                      {artifact.sourceTaskId} · {artifact.kind} · {artifact.status} ·{' '}
                      {artifact.path}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <p className="notice">正在生成 Worker 队列。</p>
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

function speakPreview(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.92;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}
