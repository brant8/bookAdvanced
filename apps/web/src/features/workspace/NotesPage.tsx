import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router';

import { workspaceApi } from './workspaceApi';

export function NotesPage() {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const foreshadows = useQuery({
    queryFn: () => workspaceApi.listForeshadows(projectId),
    queryKey: ['foreshadows', projectId],
  });
  const inspirations = useQuery({
    queryFn: () => workspaceApi.listInspirations(projectId),
    queryKey: ['inspirations', projectId],
  });
  const [foreshadow, setForeshadow] = useState('');
  const [inspiration, setInspiration] = useState('');
  const addForeshadow = useMutation({
    mutationFn: () => workspaceApi.createForeshadow(projectId, { title: foreshadow }),
    onSuccess: () => {
      setForeshadow('');
      return queryClient.invalidateQueries({ queryKey: ['foreshadows', projectId] });
    },
  });
  const addInspiration = useMutation({
    mutationFn: () => workspaceApi.createInspiration(projectId, { content: inspiration }),
    onSuccess: () => {
      setInspiration('');
      return queryClient.invalidateQueries({ queryKey: ['inspirations', projectId] });
    },
  });
  return (
    <main className="workspace-page">
      <p className="eyebrow">T-012 / NOTES</p>
      <h1>伏笔与灵感</h1>
      <div className="two-column">
        <section className="panel">
          <h2>伏笔追踪</h2>
          <div className="compact-form">
            <input
              value={foreshadow}
              onChange={(event) => setForeshadow(event.target.value)}
              placeholder="准备埋下什么伏笔？"
            />
            <button
              className="button"
              disabled={!foreshadow}
              onClick={() => addForeshadow.mutate()}
            >
              添加
            </button>
          </div>
          <div className="record-list">
            {(foreshadows.data ?? []).map((item) => (
              <article key={item.id}>
                <div>
                  <small>
                    {item.importance} / {item.status}
                  </small>
                  <strong>{item.title}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>灵感收件箱</h2>
          <div className="compact-form">
            <textarea
              value={inspiration}
              onChange={(event) => setInspiration(event.target.value)}
              placeholder="先记下来，稍后整理。"
            />
            <button
              className="button"
              disabled={!inspiration}
              onClick={() => addInspiration.mutate()}
            >
              收集
            </button>
          </div>
          <div className="record-list">
            {(inspirations.data ?? []).map((item) => (
              <article key={item.id}>
                <div>
                  <small>{item.status}</small>
                  <p>{item.content}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
