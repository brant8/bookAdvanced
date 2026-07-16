import { describe, expect, it } from 'vitest';

import type { StoryboardExportPlan, TtsDubbingPlan } from '@storyverse/contracts';

import { buildStoryboardWorkerQueue } from './visual.service.js';

const now = new Date('2026-07-15T00:00:00.000Z').toISOString();
const projectId = '00000000-0000-4000-8000-000000000201';
const storyboardId = '00000000-0000-4000-8000-000000000202';
const shotId = '00000000-0000-4000-8000-000000000203';

describe('buildStoryboardWorkerQueue', () => {
  it('creates a blocked file queue when storyboard assets are missing', () => {
    const queue = buildStoryboardWorkerQueue(projectId, exportPlan(1), ttsPlan(1));

    expect(queue.status).toBe('blocked');
    expect(queue.warnings).toContain('1 storyboard shots still miss visual assets.');
    expect(queue.tasks.find((task) => task.id === 'resolve-assets')?.status).toBe('blocked');
    expect(queue.tasks.find((task) => task.id === 'prepare-audio')?.status).toBe('planned');
  });

  it('creates a ready local/NAS queue when assets and dubbing queue exist', () => {
    const queue = buildStoryboardWorkerQueue(projectId, exportPlan(0), ttsPlan(1));

    expect(queue.status).toBe('ready');
    expect(queue.warnings).toHaveLength(0);
    expect(queue.tasks.find((task) => task.id === 'resolve-assets')?.status).toBe('ready');
    expect(queue.tasks.find((task) => task.id === 'mux-preview')?.status).toBe('planned');
  });
});

function exportPlan(missingAssetCount: number): StoryboardExportPlan {
  return {
    audioMix: { boundaries: [], status: 'planned', tracks: ['narration'] },
    browserPreview: { available: true, notes: [], output: 'interactive-html-preview' },
    estimatedFrameCount: 72,
    frameRate: 24,
    generatedAt: now,
    missingAssetCount,
    nasWorker: { queueName: 'storyboard-export', required: true, steps: [], suggestedMounts: [] },
    projectId,
    shots: [
      {
        assetId: null,
        durationMs: 3000,
        estimatedFrameCount: 72,
        hasVisualAsset: missingAssetCount === 0,
        narration: 'The archive wakes.',
        shotId,
        sortOrder: 0,
        storyNodeId: null,
        title: 'Opening',
        visualPrompt: 'Archive',
      },
    ],
    storyboardId,
    totalDurationMs: 3000,
    videoExport: {
      boundaries: [],
      codec: 'h264',
      container: 'webm',
      fps: 24,
      resolution: '1920x1080',
      status: missingAssetCount ? 'blocked' : 'planned',
    },
  };
}

function ttsPlan(queueItems: number): TtsDubbingPlan {
  return {
    audioLibrary: {
      artifactTypes: ['narration-wav'],
      boundaries: [],
      status: 'planned',
      suggestedPath: '/data/audio/storyboard',
    },
    costStrategy: 'free first',
    dubbingQueue: Array.from({ length: queueItems }, () => ({
      audioAssetId: null,
      durationMs: 3000,
      narration: 'The archive wakes.',
      preferredVoice: 'Narrator',
      shotId,
      sortOrder: 0,
      status: 'ready' as const,
      title: 'Opening',
    })),
    generatedAt: now,
    projectId,
    providerOptions: [],
    storyboardId,
    voiceReadiness: [],
  };
}
