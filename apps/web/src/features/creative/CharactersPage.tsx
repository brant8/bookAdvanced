import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router';

import { creativeApi } from './creativeApi';

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
  const [name, setName] = useState('');
  const [relation, setRelation] = useState({ sourceCharacterId: '', targetCharacterId: '' });
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
  const names = new Map((characters.data ?? []).map((item) => [item.id, item.name]));
  return (
    <main className="workspace-page">
      <p className="eyebrow">T-007 / CHARACTERS</p>
      <h1>角色与关系</h1>
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
