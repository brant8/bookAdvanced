import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router';

import { creativeApi } from './creativeApi';

export function WorldPage() {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const lore = useQuery({
    queryFn: () => creativeApi.listLore(projectId),
    queryKey: ['lore', projectId],
  });
  const [entry, setEntry] = useState({ description: '', name: '' });
  const create = useMutation({
    mutationFn: () => creativeApi.createLore(projectId, entry),
    onSuccess: async () => {
      setEntry({ description: '', name: '' });
      await queryClient.invalidateQueries({ queryKey: ['lore', projectId] });
    },
  });
  return (
    <main className="workspace-page">
      <p className="eyebrow">T-006 / LORE</p>
      <h1>世界设定</h1>
      <section className="panel">
        <div className="inline-form">
          <input
            onChange={(event) => setEntry({ ...entry, name: event.target.value })}
            placeholder="势力、能力、历史或术语"
            value={entry.name}
          />
          <input
            onChange={(event) => setEntry({ ...entry, description: event.target.value })}
            placeholder="一句话说明"
            value={entry.description}
          />
          <button className="button" disabled={!entry.name} onClick={() => create.mutate()}>
            添加设定
          </button>
        </div>
        <div className="record-grid">
          {(lore.data ?? []).map((item) => (
            <article key={item.id}>
              <small>{item.category}</small>
              <h3>{item.name}</h3>
              <p>{item.description || '尚未补充说明'}</p>
              <button
                className="button button--quiet"
                onClick={() =>
                  creativeApi
                    .deleteLore(item.id)
                    .then(() => queryClient.invalidateQueries({ queryKey: ['lore', projectId] }))
                }
              >
                删除
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
