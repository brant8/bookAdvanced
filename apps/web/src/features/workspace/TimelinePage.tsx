import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';

import { creativeApi } from '../creative/creativeApi';
import { visualApi } from '../visual/visualApi';

export function TimelinePage() {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const nodes = useQuery({
    queryFn: () => creativeApi.listNodes(projectId),
    queryKey: ['story-nodes', projectId],
  });
  const characters = useQuery({
    queryFn: () => creativeApi.listCharacters(projectId),
    queryKey: ['characters', projectId],
  });
  const abilities = useQuery({
    queryFn: () => visualApi.listAbilities(projectId),
    queryKey: ['abilities', projectId],
  });
  const assets = useQuery({
    queryFn: () => visualApi.listAssets(projectId),
    queryKey: ['assets', projectId],
  });
  const [nodeId, setNodeId] = useState('');
  useEffect(() => {
    if (!nodeId && nodes.data?.[0]) setNodeId(nodes.data[0].id);
  }, [nodeId, nodes.data]);
  const scene = useQuery({
    enabled: Boolean(nodeId),
    queryFn: () => visualApi.getScene(nodeId),
    queryKey: ['scene', nodeId],
  });
  const [form, setForm] = useState({
    atmosphere: '',
    location: '',
    timeOfDay: '',
    visualPrompt: '',
    weather: '',
  });
  useEffect(() => {
    if (scene.data) {
      setForm({
        atmosphere: scene.data.atmosphere,
        location: scene.data.location,
        timeOfDay: scene.data.timeOfDay,
        visualPrompt: scene.data.visualPrompt,
        weather: scene.data.weather,
      });
    }
  }, [scene.data]);
  const save = useMutation({
    mutationFn: () => visualApi.saveScene(nodeId, form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scene', nodeId] }),
  });
  const selected = nodes.data?.find((item) => item.id === nodeId);
  return (
    <main className="workspace-page workspace-page--wide">
      <p className="eyebrow">T-022 / VISUAL TIMELINE</p>
      <h1>故事时间轴</h1>
      <div className="timeline-workbench">
        <div className="timeline">
          {(nodes.data ?? []).map((node) => (
            <button
              key={node.id}
              className={
                node.id === nodeId ? 'timeline__item timeline__item--selected' : 'timeline__item'
              }
              onClick={() => setNodeId(node.id)}
            >
              <span>{node.sortOrder + 1}</span>
              <small>{node.storyTimeLabel || '时间待定'}</small>
              <h3>{node.title}</h3>
              <p>{node.summary || node.nodeGoal || '尚未补充摘要'}</p>
            </button>
          ))}
        </div>
        <aside className="panel timeline-inspector">
          <h2>{selected?.title ?? '场景检查器'}</h2>
          {Object.entries({
            location: '地点',
            timeOfDay: '时段',
            weather: '天气',
            atmosphere: '氛围',
            visualPrompt: '视觉描述',
          }).map(([key, label]) => (
            <label key={key}>
              {label}
              <textarea
                value={form[key as keyof typeof form]}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
              />
            </label>
          ))}
          <h3>参与人物</h3>
          <div className="tag-row">
            {(characters.data ?? [])
              .filter((item) => selected?.characterIds.includes(item.id))
              .map((item) => (
                <span key={item.id}>{item.name}</span>
              ))}
          </div>
          <h3>人物技能</h3>
          <div className="tag-row">
            {(abilities.data ?? [])
              .filter((item) => selected?.characterIds.includes(item.characterId))
              .map((item) => (
                <span key={item.id}>
                  {item.name} Lv.{item.level}
                </span>
              ))}
          </div>
          <h3>场景与人物图片</h3>
          <div className="inspector-assets">
            {(assets.data ?? [])
              .filter(
                (item) =>
                  item.storyNodeId === nodeId ||
                  (item.characterId && selected?.characterIds.includes(item.characterId)),
              )
              .map((item) => (
                <img key={item.id} src={item.url} alt={item.name} title={item.name} />
              ))}
          </div>
          <button className="button" disabled={!nodeId} onClick={() => save.mutate()}>
            保存场景
          </button>
        </aside>
      </div>
    </main>
  );
}
