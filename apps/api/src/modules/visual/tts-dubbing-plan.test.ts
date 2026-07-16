import { describe, expect, it } from 'vitest';

import type { Storyboard } from '@storyverse/contracts';

import { buildTtsDubbingPlan } from './visual.service.js';

const now = new Date('2026-07-15T00:00:00.000Z').toISOString();
const projectId = '00000000-0000-4000-8000-000000000101';
const storyboardId = '00000000-0000-4000-8000-000000000102';
const shotId = '00000000-0000-4000-8000-000000000103';
const characterId = '00000000-0000-4000-8000-000000000104';

describe('buildTtsDubbingPlan', () => {
  it('prefers browser preview and marks queue ready when a voice sample exists', () => {
    const storyboard: Storyboard = {
      createdAt: now,
      id: storyboardId,
      projectId,
      shots: [
        {
          assetId: null,
          createdAt: now,
          durationMs: 2400,
          id: shotId,
          narration: 'The archive wakes.',
          sortOrder: 0,
          storyboardId,
          storyNodeId: null,
          title: 'Awakening',
          transition: 'fade',
          updatedAt: now,
          visualPrompt: 'Archive lights',
        },
      ],
      status: 'ready',
      title: 'TTS test',
      updatedAt: now,
    };

    const plan = buildTtsDubbingPlan(projectId, storyboard, [
      {
        id: characterId,
        name: 'Navigator',
        voiceSamples: ['样本：We keep moving.'],
      },
    ]);

    expect(plan.providerOptions[0]?.id).toBe('browser-speech-synthesis');
    expect(plan.providerOptions[0]?.risk).toBe('free');
    expect(plan.voiceReadiness[0]?.status).toBe('ready');
    expect(plan.dubbingQueue[0]?.preferredVoice).toBe('Navigator');
    expect(plan.dubbingQueue[0]?.status).toBe('ready');
  });

  it('keeps the queue blocked when no voice samples are configured', () => {
    const plan = buildTtsDubbingPlan(projectId, null, [
      { id: characterId, name: 'Navigator', voiceSamples: [] },
    ]);

    expect(plan.storyboardId).toBeNull();
    expect(plan.voiceReadiness[0]?.status).toBe('needs-samples');
    expect(plan.dubbingQueue).toHaveLength(0);
    expect(plan.audioLibrary.status).toBe('planned');
  });
});
