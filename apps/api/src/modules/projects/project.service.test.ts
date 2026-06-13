import { describe, expect, it, vi } from 'vitest';

import type { ProjectRepository } from './project.repository.js';
import { ProjectService } from './project.service.js';

const now = new Date('2026-06-13T12:00:00.000Z');

function createRepository(): ProjectRepository {
  return {
    create: vi.fn(async (ownerId, input) => ({
      aiMode: input.aiMode ?? 'manual',
      createdAt: now,
      description: input.description ?? '',
      id: '00000000-0000-4000-8000-000000000001',
      name: input.name,
      ownerId,
      styleSamples: input.styleSamples ?? [],
      updatedAt: now,
      visibility: input.visibility ?? 'private',
    })),
    delete: vi.fn(async () => true),
    findById: vi.fn(async () => null),
    list: vi.fn(async () => []),
    update: vi.fn(async () => null),
  };
}

describe('ProjectService', () => {
  it('normalizes project input before persistence', async () => {
    const repository = createRepository();
    const service = new ProjectService(repository, '00000000-0000-4000-8000-000000000002');

    const project = await service.create({
      name: '  星海   纪元 ',
      styleSamples: ['  样例一  ', ''],
    });

    expect(project.name).toBe('星海 纪元');
    expect(repository.create).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000002', {
      name: '星海 纪元',
      styleSamples: ['样例一'],
    });
  });
});
