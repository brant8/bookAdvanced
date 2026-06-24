import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import type { CreativeGenerationRequest } from '@storyverse/contracts';

import { aiSettingsApi } from '../workspace/aiSettingsApi';
import { creativeGenerationApi } from './creativeGenerationApi';

export function AiGeneratePanel({
  projectId,
  taskType,
  onApply,
}: {
  projectId: string;
  taskType: CreativeGenerationRequest['taskType'];
  onApply(candidate: Record<string, unknown>): void | Promise<void>;
}) {
  const providers = useQuery({
    queryFn: aiSettingsApi.listProviders,
    queryKey: ['ai-providers'],
  });
  const textProviders = (providers.data ?? []).filter((item) => item.kind === 'text');
  const [providerId, setProviderId] = useState('');
  const [instructions, setInstructions] = useState('');
  const generation = useMutation({
    mutationFn: () =>
      creativeGenerationApi.generate(projectId, {
        instructions,
        providerId: providerId || textProviders[0]?.id || '',
        taskType,
      }),
  });
  return (
    <section className="panel ai-candidate-panel">
      <div className="section-heading">
        <div>
          <h2>AI 结构化生成</h2>
          <p>生成结果先作为候选，确认后才写入项目。</p>
        </div>
      </div>
      <div className="inline-form">
        <select value={providerId} onChange={(event) => setProviderId(event.target.value)}>
          <option value="">选择文本模型</option>
          {textProviders.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.defaultModel}
            </option>
          ))}
        </select>
        <input
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder="补充题材、风格或角色要求"
        />
        <button
          className="button"
          disabled={generation.isPending || (!providerId && !textProviders[0])}
          onClick={() => generation.mutate()}
        >
          {generation.isPending ? '生成中…' : '生成候选'}
        </button>
      </div>
      {generation.error ? <p className="notice notice--error">{generation.error.message}</p> : null}
      {generation.data ? (
        <div className="generation-result">
          <pre>{JSON.stringify(generation.data.candidate, null, 2)}</pre>
          <button className="button" onClick={() => void onApply(generation.data.candidate)}>
            采用候选
          </button>
        </div>
      ) : null}
    </section>
  );
}
