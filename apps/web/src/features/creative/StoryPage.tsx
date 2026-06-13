import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router';

import type { StoryNode } from '@storyverse/contracts';

import { creativeApi } from './creativeApi';

export function StoryPage() {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const storylines = useQuery({
    queryFn: () => creativeApi.listStorylines(projectId),
    queryKey: ['storylines', projectId],
  });
  const nodes = useQuery({
    queryFn: () => creativeApi.listNodes(projectId),
    queryKey: ['story-nodes', projectId],
  });
  const [title, setTitle] = useState('');
  const createStoryline = useMutation({
    mutationFn: () => creativeApi.createStoryline(projectId, { title }),
    onSuccess: () => {
      setTitle('');
      return queryClient.invalidateQueries({ queryKey: ['storylines', projectId] });
    },
  });
  const moveNode = useMutation({
    mutationFn: ({ id, x, y }: { id: string; x: number; y: number }) =>
      creativeApi.updateNode(id, { canvasX: x, canvasY: y }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['story-nodes', projectId] }),
  });

  return (
    <main className="workspace-page workspace-page--wide">
      <p className="eyebrow">T-009 / STORY CANVAS</p>
      <div className="page-heading">
        <div>
          <h1>故事线画布</h1>
          <p>拖动节点调整空间布局，松开后自动保存坐标。</p>
        </div>
        <div className="compact-form">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="新故事线"
          />
          <button className="button" disabled={!title} onClick={() => createStoryline.mutate()}>
            创建
          </button>
        </div>
      </div>
      <div className="story-canvas">
        <svg className="story-canvas__lines">
          {(nodes.data ?? []).slice(1).map((node, index) => {
            const previous = nodes.data?.[index];
            return previous ? (
              <line
                key={node.id}
                x1={previous.canvasX + 90}
                y1={previous.canvasY + 55}
                x2={node.canvasX + 90}
                y2={node.canvasY + 55}
              />
            ) : null;
          })}
        </svg>
        {(nodes.data ?? []).map((node) => (
          <CanvasNode
            key={`${node.id}-${node.canvasX}-${node.canvasY}`}
            node={node}
            onMove={(x, y) => moveNode.mutate({ id: node.id, x, y })}
          />
        ))}
        {!nodes.data?.length ? <p className="canvas-empty">先在下方创建一个故事节点。</p> : null}
      </div>
      <NodeCreator
        projectId={projectId}
        count={nodes.data?.length ?? 0}
        storylines={storylines.data ?? []}
      />
    </main>
  );
}

function CanvasNode({ node, onMove }: { node: StoryNode; onMove(x: number, y: number): void }) {
  const [position, setPosition] = useState({ x: node.canvasX, y: node.canvasY });
  return (
    <article
      className={`canvas-node canvas-node--${node.status}`}
      style={{ left: position.x, top: position.y }}
      onPointerDown={(event) => {
        const origin = { clientX: event.clientX, clientY: event.clientY, ...position };
        let latest = position;
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.onpointermove = (move) => {
          latest = {
            x: Math.max(0, origin.x + move.clientX - origin.clientX),
            y: Math.max(0, origin.y + move.clientY - origin.clientY),
          };
          setPosition(latest);
        };
        event.currentTarget.onpointerup = () => onMove(latest.x, latest.y);
      }}
    >
      <small>#{node.sortOrder + 1}</small>
      <strong>{node.title}</strong>
      <p>{node.nodeGoal || '等待定义节点目标'}</p>
    </article>
  );
}

function NodeCreator({
  projectId,
  count,
  storylines,
}: {
  projectId: string;
  count: number;
  storylines: { id: string; title: string }[];
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState({ storylineId: '', title: '' });
  const create = useMutation({
    mutationFn: () =>
      creativeApi.createNode(projectId, {
        canvasX: 30 + (count % 4) * 210,
        canvasY: 40 + Math.floor(count / 4) * 150,
        sortOrder: count,
        storylineId: value.storylineId || null,
        title: value.title,
      }),
    onSuccess: () => {
      setValue({ ...value, title: '' });
      return queryClient.invalidateQueries({ queryKey: ['story-nodes', projectId] });
    },
  });
  return (
    <section className="panel inline-form">
      <select
        value={value.storylineId}
        onChange={(event) => setValue({ ...value, storylineId: event.target.value })}
      >
        <option value="">独立节点</option>
        {storylines.map((line) => (
          <option key={line.id} value={line.id}>
            {line.title}
          </option>
        ))}
      </select>
      <input
        value={value.title}
        onChange={(event) => setValue({ ...value, title: event.target.value })}
        placeholder="节点标题"
      />
      <button className="button" disabled={!value.title} onClick={() => create.mutate()}>
        添加节点
      </button>
    </section>
  );
}
