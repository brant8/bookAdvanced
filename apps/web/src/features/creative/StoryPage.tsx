import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router';

import { creativeApi } from './creativeApi';
import { AiGeneratePanel } from './AiGeneratePanel';
import '@xyflow/react/dist/style.css';

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
  const edges = useQuery({
    queryFn: () => creativeApi.listEdges(projectId),
    queryKey: ['story-node-edges', projectId],
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
  const createEdge = useMutation({
    mutationFn: (connection: Connection) =>
      creativeApi.createEdge(projectId, {
        sourceNodeId: connection.source,
        targetNodeId: connection.target,
        type: 'flow',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['story-node-edges', projectId] }),
  });
  const flowNodes = useMemo<Node[]>(
    () =>
      (nodes.data ?? []).map((node) => ({
        className: `story-flow-node story-flow-node--${node.status}`,
        data: {
          label: (
            <>
              <small>#{node.sortOrder + 1}</small>
              <strong>{node.title}</strong>
              <span>{node.nodeGoal || '等待定义节点目标'}</span>
            </>
          ),
        },
        id: node.id,
        position: { x: node.canvasX, y: node.canvasY },
      })),
    [nodes.data],
  );
  const flowEdges = useMemo<Edge[]>(
    () =>
      (edges.data ?? []).map((edge) => ({
        animated: edge.type === 'flow',
        id: edge.id,
        label: edge.label || undefined,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        type: 'smoothstep',
      })),
    [edges.data],
  );

  return (
    <main className="workspace-page workspace-page--wide">
      <p className="eyebrow">T-009 / STORY CANVAS</p>
      <div className="page-heading">
        <div>
          <h1>故事线画布</h1>
          <p>拖动节点端口主动连线，支持画布平移、缩放、小地图和坐标自动保存。</p>
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
      <AiGeneratePanel
        projectId={projectId}
        taskType="storyline.generate"
        onApply={async (candidate) => {
          const line = await creativeApi.createStoryline(projectId, {
            description: String(candidate.description ?? ''),
            endingGoal: String(candidate.endingGoal ?? ''),
            generationConstraints: Array.isArray(candidate.generationConstraints)
              ? candidate.generationConstraints.map(String)
              : [],
            title: String(candidate.title ?? 'AI 故事线'),
          });
          if (Array.isArray(candidate.milestones)) {
            await Promise.all(
              candidate.milestones.map((value, index) => {
                const item = value as Record<string, unknown>;
                return creativeApi.createMilestone(line.id, {
                  description: String(item.description ?? ''),
                  sortOrder: index,
                  title: String(item.title ?? `里程碑 ${index + 1}`),
                });
              }),
            );
          }
          await queryClient.invalidateQueries({ queryKey: ['storylines', projectId] });
        }}
      />
      <div className="story-canvas story-canvas--flow">
        <ReactFlow
          deleteKeyCode={['Backspace', 'Delete']}
          edges={flowEdges}
          fitView
          minZoom={0.2}
          nodes={flowNodes}
          onConnect={(connection) => createEdge.mutate(connection)}
          onEdgesDelete={(deleted) => {
            for (const edge of deleted) void creativeApi.deleteEdge(edge.id);
            void queryClient.invalidateQueries({ queryKey: ['story-node-edges', projectId] });
          }}
          onNodeDragStop={(_, node) =>
            moveNode.mutate({ id: node.id, x: node.position.x, y: node.position.y })
          }
        >
          <Background gap={20} size={1} />
          <MiniMap pannable zoomable />
          <Controls />
        </ReactFlow>
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
