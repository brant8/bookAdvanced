import { describe, expect, it } from 'vitest';

import type { Asset, Storyboard } from '@storyverse/contracts';

import { buildStoryboardExportPlan } from './visual.service.js';

const now = new Date('2026-07-15T00:00:00.000Z').toISOString();
const projectId = '00000000-0000-4000-8000-000000000001';
const storyboardId = '00000000-0000-4000-8000-000000000002';
const firstShotId = '00000000-0000-4000-8000-000000000003';
const secondShotId = '00000000-0000-4000-8000-000000000004';
const nodeId = '00000000-0000-4000-8000-000000000005';
const assetId = '00000000-0000-4000-8000-000000000006';

describe('buildStoryboardExportPlan', () => {
  it('summarizes frames, missing assets and worker boundaries', () => {
    const storyboard: Storyboard = {
      createdAt: now,
      id: storyboardId,
      projectId,
      shots: [
        {
          assetId,
          createdAt: now,
          durationMs: 3000,
          id: firstShotId,
          narration: 'First narration',
          sortOrder: 0,
          storyboardId,
          storyNodeId: nodeId,
          title: 'Opening',
          transition: 'fade',
          updatedAt: now,
          visualPrompt: 'A bright archive',
        },
        {
          assetId: null,
          createdAt: now,
          durationMs: 1500,
          id: secondShotId,
          narration: 'Second narration',
          sortOrder: 1,
          storyboardId,
          storyNodeId: null,
          title: 'Signal',
          transition: 'pan',
          updatedAt: now,
          visualPrompt: 'A quiet signal',
        },
      ],
      status: 'ready',
      title: 'Export test',
      updatedAt: now,
    };
    const assets: Asset[] = [
      {
        abilityId: null,
        characterId: null,
        createdAt: now,
        fileName: 'scene.png',
        id: assetId,
        kind: 'scene',
        mimeType: 'image/png',
        name: 'Scene',
        projectId,
        prompt: '',
        source: 'upload',
        storyNodeId: nodeId,
        updatedAt: now,
        url: '/api/assets/scene/file',
      },
    ];

    const plan = buildStoryboardExportPlan(storyboard, assets);

    expect(plan.totalDurationMs).toBe(4500);
    expect(plan.estimatedFrameCount).toBe(108);
    expect(plan.missingAssetCount).toBe(1);
    expect(plan.videoExport.status).toBe('blocked');
    expect(plan.nasWorker.required).toBe(true);
    expect(plan.shots[0]?.hasVisualAsset).toBe(true);
    expect(plan.shots[1]?.hasVisualAsset).toBe(false);
  });
});
