import { getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  characterRelations,
  chapters,
  projects,
  storylineMilestones,
  storylines,
  storyNodes,
  users,
} from './schema.js';

describe('core database schema', () => {
  it('keeps story structure and prose in separate tables', () => {
    expect(getTableName(storyNodes)).toBe('story_nodes');
    expect(getTableName(chapters)).toBe('chapters');
  });

  it('defines the first core aggregate tables', () => {
    expect(
      [users, projects, storylines, storylineMilestones, storyNodes, chapters].map(getTableName),
    ).toEqual([
      'users',
      'projects',
      'storylines',
      'storyline_milestones',
      'story_nodes',
      'chapters',
    ]);
  });

  it('stores explicit character relationships', () => {
    expect(getTableName(characterRelations)).toBe('character_relations');
  });
});
