import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router';

import { creativeApi } from './creativeApi';
import { AiGeneratePanel } from './AiGeneratePanel';
import { visualApi } from '../visual/visualApi';

export function CharactersPage() {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const characters = useQuery({
    queryFn: () => creativeApi.listCharacters(projectId),
    queryKey: ['characters', projectId],
  });
  const relations = useQuery({
    queryFn: () => creativeApi.listRelations(projectId),
    queryKey: ['relations', projectId],
  });
  const abilities = useQuery({
    queryFn: () => visualApi.listAbilities(projectId),
    queryKey: ['abilities', projectId],
  });
  const [name, setName] = useState('');
  const [relation, setRelation] = useState({ sourceCharacterId: '', targetCharacterId: '' });
  const [ability, setAbility] = useState({ characterId: '', name: '' });
  const [voiceCharacterId, setVoiceCharacterId] = useState('');
  const [voiceDraft, setVoiceDraft] = useState('');
  const createCharacter = useMutation({
    mutationFn: () => creativeApi.createCharacter(projectId, { name }),
    onSuccess: async () => {
      setName('');
      await queryClient.invalidateQueries({ queryKey: ['characters', projectId] });
    },
  });
  const createRelation = useMutation({
    mutationFn: () => creativeApi.createRelation(projectId, { ...relation, relationType: '关联' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['relations', projectId] }),
  });
  const updateVoiceSamples = useMutation({
    mutationFn: () =>
      creativeApi.updateCharacter(voiceCharacterId, {
        voiceSamples: voiceDraft
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 10),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['characters', projectId] });
    },
  });
  const names = new Map((characters.data ?? []).map((item) => [item.id, item.name]));
  const selectedVoiceCharacter = (characters.data ?? []).find(
    (item) => item.id === voiceCharacterId,
  );
  const loadVoiceSamples = (characterId: string) => {
    const character = (characters.data ?? []).find((item) => item.id === characterId);
    setVoiceCharacterId(characterId);
    setVoiceDraft((character?.voiceSamples ?? []).join('\n'));
  };
  const createVoiceStarter = () => {
    if (!selectedVoiceCharacter) {
      return;
    }
    const starter = [
      `声线：${selectedVoiceCharacter.personality || '根据角色性格补充语气、节奏和情绪底色'}`,
      `样本：${selectedVoiceCharacter.name}在关键冲突中说出一句能代表人物立场的话。`,
      'TTS提示：保持角色一致性，避免过度夸张；旁白和对白分轨时优先使用此声线。',
    ];
    setVoiceDraft(starter.join('\n'));
  };
  return (
    <main className="workspace-page">
      <p className="eyebrow">T-007 / CHARACTERS</p>
      <h1>角色与关系</h1>
      <AiGeneratePanel
        projectId={projectId}
        taskType="character.generate"
        onApply={(candidate) =>
          creativeApi
            .createCharacter(projectId, {
              appearance: String(candidate.appearance ?? ''),
              bio: String(candidate.bio ?? ''),
              name: String(candidate.name ?? 'AI 角色'),
              personality: String(candidate.personality ?? ''),
              voiceSamples: Array.isArray(candidate.voiceSamples)
                ? candidate.voiceSamples.map(String)
                : [],
            })
            .then(() => queryClient.invalidateQueries({ queryKey: ['characters', projectId] }))
        }
      />
      <section className="panel">
        <div className="inline-form">
          <input
            onChange={(event) => setName(event.target.value)}
            placeholder="角色名"
            value={name}
          />
          <button className="button" disabled={!name} onClick={() => createCharacter.mutate()}>
            添加角色
          </button>
        </div>
        <div className="record-grid">
          {(characters.data ?? []).map((item) => (
            <article key={item.id}>
              <h3>{item.name}</h3>
              <p>{item.bio || '等待补充人物小传'}</p>
              <div className="voice-status">
                <span>{item.voiceSamples.length > 0 ? '已配置声音' : '未配置声音'}</span>
                <strong>{item.voiceSamples.length}/10</strong>
              </div>
              {item.voiceSamples.length > 0 ? (
                <p className="voice-preview">{item.voiceSamples.slice(0, 2).join(' / ')}</p>
              ) : null}
              <button
                className="button button--quiet"
                onClick={() =>
                  creativeApi
                    .deleteCharacter(item.id)
                    .then(() =>
                      queryClient.invalidateQueries({ queryKey: ['characters', projectId] }),
                    )
                }
              >
                删除
              </button>
            </article>
          ))}
        </div>
      </section>
      <section className="panel voice-workbench">
        <div>
          <p className="eyebrow">T-032 / VOICE LAB</p>
          <h2>TTS 与角色声音样本</h2>
          <p>
            先用本地文本样本建立角色声线。后续接入免费或自托管 TTS
            时，可以直接把这些样本作为声线提示、 试听台词和分镜配音依据，不强制调用付费模型。
          </p>
        </div>
        <div className="voice-workbench__grid">
          <label>
            选择角色
            <select
              value={voiceCharacterId}
              onChange={(event) => loadVoiceSamples(event.target.value)}
            >
              <option value="">选择角色</option>
              {(characters.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            声音样本与 TTS 提示（每行一条，最多 10 条）
            <textarea
              value={voiceDraft}
              onChange={(event) => setVoiceDraft(event.target.value)}
              placeholder="声线：冷静、低声、语速慢&#10;样本：我不是在逃，我是在等答案自己浮上来。&#10;TTS提示：对白使用近距离麦克风感，避免机械停顿。"
            />
          </label>
        </div>
        <div className="button-row">
          <button
            className="button button--quiet"
            disabled={!selectedVoiceCharacter}
            onClick={createVoiceStarter}
          >
            生成本地起稿
          </button>
          <button
            className="button"
            disabled={!voiceCharacterId || updateVoiceSamples.isPending}
            onClick={() => updateVoiceSamples.mutate()}
          >
            保存声音样本
          </button>
        </div>
        {updateVoiceSamples.isSuccess ? <p className="voice-note">声音样本已保存。</p> : null}
      </section>
      <section className="panel">
        <h2>角色技能</h2>
        <div className="inline-form">
          <select
            value={ability.characterId}
            onChange={(event) => setAbility({ ...ability, characterId: event.target.value })}
          >
            <option value="">选择角色</option>
            {(characters.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            value={ability.name}
            onChange={(event) => setAbility({ ...ability, name: event.target.value })}
            placeholder="技能、能力或专长"
          />
          <button
            className="button"
            disabled={!ability.characterId || !ability.name}
            onClick={() =>
              void visualApi
                .createAbility(projectId, { ...ability, level: 1 })
                .then(() => queryClient.invalidateQueries({ queryKey: ['abilities', projectId] }))
            }
          >
            添加技能
          </button>
        </div>
        <div className="record-list">
          {(abilities.data ?? []).map((item) => (
            <article key={item.id}>
              <strong>
                {names.get(item.characterId)} · {item.name}
              </strong>
              <span>Lv.{item.level}</span>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>人物关系</h2>
        <div className="inline-form">
          {(['sourceCharacterId', 'targetCharacterId'] as const).map((field) => (
            <select
              key={field}
              onChange={(event) => setRelation({ ...relation, [field]: event.target.value })}
              value={relation[field]}
            >
              <option value="">选择角色</option>
              {(characters.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          ))}
          <button
            className="button"
            disabled={!relation.sourceCharacterId || !relation.targetCharacterId}
            onClick={() => createRelation.mutate()}
          >
            建立关系
          </button>
        </div>
        <div className="record-list">
          {(relations.data ?? []).map((item) => (
            <article key={item.id}>
              <strong>
                {names.get(item.sourceCharacterId)} → {names.get(item.targetCharacterId)}
              </strong>
              <span>{item.relationType}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
