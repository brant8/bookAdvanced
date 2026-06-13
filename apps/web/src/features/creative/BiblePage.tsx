import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router';

import { creativeApi } from './creativeApi';

export function BiblePage() {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const bible = useQuery({
    queryFn: () => creativeApi.getBible(projectId),
    queryKey: ['bible', projectId],
  });
  const rules = useQuery({
    queryFn: () => creativeApi.listWorldRules(projectId),
    queryKey: ['world-rules', projectId],
  });
  const saveBible = useMutation({
    mutationFn: (input: Record<string, string>) => creativeApi.saveBible(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bible', projectId] }),
  });
  const createRule = useMutation({
    mutationFn: (input: { condition: string; result: string }) =>
      creativeApi.createWorldRule(projectId, { ...input, category: 'society' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['world-rules', projectId] }),
  });
  const [rule, setRule] = useState({ condition: '', result: '' });

  return (
    <main className="workspace-page">
      <p className="eyebrow">T-006 / STORY BIBLE</p>
      <h1>创作圣经</h1>
      <p className="page-intro">锁定世界规则、写作风格、剧情目标和结局方向。</p>
      <form
        className="panel form-grid"
        key={bible.data?.updatedAt ?? 'new'}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          saveBible.mutate(Object.fromEntries(data) as Record<string, string>);
        }}
      >
        {[
          ['worldRules', '世界总则'],
          ['writingStyle', '写作风格'],
          ['characterRules', '角色行为原则'],
          ['plotGoals', '剧情目标'],
          ['endingDirection', '结局方向'],
          ['prohibitedContent', '禁止内容'],
        ].map(([name, label]) => (
          <label key={name}>
            {label}
            <textarea
              defaultValue={bible.data?.[name as keyof typeof bible.data] ?? ''}
              name={name}
            />
          </label>
        ))}
        <button className="button" disabled={saveBible.isPending} type="submit">
          保存创作圣经
        </button>
      </form>
      <section className="panel">
        <h2>可执行世界规则</h2>
        <div className="inline-form">
          <input
            onChange={(event) => setRule({ ...rule, condition: event.target.value })}
            placeholder="当……"
            value={rule.condition}
          />
          <input
            onChange={(event) => setRule({ ...rule, result: event.target.value })}
            placeholder="则……"
            value={rule.result}
          />
          <button
            className="button"
            onClick={() => {
              createRule.mutate(rule);
              setRule({ condition: '', result: '' });
            }}
          >
            添加规则
          </button>
        </div>
        <div className="record-list">
          {(rules.data ?? []).map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.condition}</strong>
                <p>{item.result}</p>
              </div>
              <button
                className="button button--quiet"
                onClick={() =>
                  creativeApi
                    .deleteWorldRule(item.id)
                    .then(() =>
                      queryClient.invalidateQueries({ queryKey: ['world-rules', projectId] }),
                    )
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
