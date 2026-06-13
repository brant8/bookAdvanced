import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { creativeApi } from '../creative/creativeApi';

export function TimelinePage() {
  const { projectId = '' } = useParams();
  const nodes = useQuery({
    queryFn: () => creativeApi.listNodes(projectId),
    queryKey: ['story-nodes', projectId],
  });
  return (
    <main className="workspace-page workspace-page--wide">
      <p className="eyebrow">T-010 / SHARED TIMELINE</p>
      <h1>故事时间轴</h1>
      <p className="page-intro">与故事线画布共享节点和排序，不维护第二份结构数据。</p>
      <div className="timeline">
        {(nodes.data ?? []).map((node) => (
          <article
            key={node.id}
            className={node.isKeyScene ? 'timeline__item timeline__item--key' : 'timeline__item'}
          >
            <span>{node.sortOrder + 1}</span>
            <small>{node.storyTimeLabel || '时间待定'}</small>
            <h3>{node.title}</h3>
            <p>{node.summary || node.nodeGoal || '尚未补充摘要'}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
