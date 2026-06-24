import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router';

import { aiSettingsApi } from '../workspace/aiSettingsApi';
import { visualApi } from './visualApi';

export function AssetsPage() {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const assets = useQuery({
    queryFn: () => visualApi.listAssets(projectId),
    queryKey: ['assets', projectId],
  });
  const providers = useQuery({
    queryFn: aiSettingsApi.listProviders,
    queryKey: ['ai-providers'],
  });
  const imageProviders = (providers.data ?? []).filter((item) => item.kind === 'image');
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [providerId, setProviderId] = useState('');
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['assets', projectId] });
  const upload = useMutation({
    mutationFn: () => visualApi.uploadAsset(projectId, file!, file!.name, 'reference'),
    onSuccess: refresh,
  });
  const generate = useMutation({
    mutationFn: () =>
      visualApi.generateImage(projectId, {
        kind: 'scene',
        name: prompt.slice(0, 40) || 'AI 场景图',
        prompt,
        providerId: providerId || imageProviders[0]?.id || '',
        size: '1024x1024',
      }),
    onSuccess: refresh,
  });
  return (
    <main className="workspace-page workspace-page--wide">
      <p className="eyebrow">T-023 / ASSET LIBRARY</p>
      <h1>视觉素材库</h1>
      <section className="panel asset-toolbar">
        <label>
          本地图片
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <button className="button" disabled={!file} onClick={() => upload.mutate()}>
          上传到本地/NAS
        </button>
        <select value={providerId} onChange={(event) => setProviderId(event.target.value)}>
          <option value="">选择图片模型</option>
          {imageProviders.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.defaultModel}
            </option>
          ))}
        </select>
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="描述要生成的角色或场景"
        />
        <button
          className="button"
          disabled={!prompt || (!providerId && !imageProviders[0])}
          onClick={() => generate.mutate()}
        >
          AI 生图
        </button>
      </section>
      <div className="asset-grid">
        {(assets.data ?? []).map((asset) => (
          <article className="panel" key={asset.id}>
            <img src={asset.url} alt={asset.name} />
            <strong>{asset.name}</strong>
            <small>
              {asset.kind} · {asset.source}
            </small>
            <button
              className="button button--danger"
              onClick={() => void visualApi.deleteAsset(asset.id).then(refresh)}
            >
              删除
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}
