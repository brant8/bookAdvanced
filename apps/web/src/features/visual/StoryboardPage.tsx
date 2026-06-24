import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';

import { visualApi } from './visualApi';
import { aiSettingsApi } from '../workspace/aiSettingsApi';

export function StoryboardPage() {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const board = useQuery({
    queryFn: () => visualApi.getStoryboard(projectId),
    queryKey: ['storyboard', projectId],
  });
  const providers = useQuery({
    queryFn: aiSettingsApi.listProviders,
    queryKey: ['ai-providers'],
  });
  const textProviders = (providers.data ?? []).filter((item) => item.kind === 'text');
  const [providerId, setProviderId] = useState('');
  const generate = useMutation({
    mutationFn: () => visualApi.generateStoryboard(projectId, providerId || undefined),
    onSuccess: (value) => queryClient.setQueryData(['storyboard', projectId], value),
  });
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!playing || !board.data?.shots[index]) return;
    const timer = window.setTimeout(() => {
      if (index + 1 >= (board.data?.shots.length ?? 0)) {
        setPlaying(false);
        setIndex(0);
      } else setIndex(index + 1);
    }, board.data.shots[index].durationMs);
    return () => window.clearTimeout(timer);
  }, [board.data, index, playing]);
  const shot = board.data?.shots[index];
  return (
    <main className="workspace-page workspace-page--wide">
      <p className="eyebrow">T-024 / STORYBOARD PLAYER</p>
      <div className="page-heading">
        <div>
          <h1>AI 分镜播放器</h1>
          <p>根据故事节点生成定格镜头，并以淡入和平移方式自动播放。</p>
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
      <section className={`story-player story-player--${shot?.transition ?? 'fade'}`}>
        {shot ? (
          <div key={shot.id} className="story-player__shot">
            <small>
              镜头 {index + 1} / {board.data?.shots.length}
            </small>
            <h2>{shot.title}</h2>
            <p>{shot.visualPrompt}</p>
            <blockquote>{shot.narration}</blockquote>
          </div>
        ) : (
          <p>先生成故事分镜。</p>
        )}
        <button
          className="story-player__play"
          disabled={!board.data?.shots.length}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? '暂停' : '▶ 播放'}
        </button>
      </section>
      <div className="shot-strip">
        {(board.data?.shots ?? []).map((item, shotIndex) => (
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
    </main>
  );
}
