import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
};

export const projectVisibilityEnum = pgEnum('project_visibility', ['private', 'team']);
export const aiModeEnum = pgEnum('ai_mode', ['manual', 'suggest']);
export const userRoleEnum = pgEnum('user_role', ['owner']);
export const aiProviderKindEnum = pgEnum('ai_provider_kind', ['text', 'image']);
export const generationStatusEnum = pgEnum('generation_status', [
  'pending',
  'running',
  'completed',
  'approved',
  'rejected',
  'failed',
]);
export const storyEdgeTypeEnum = pgEnum('story_edge_type', [
  'flow',
  'branch',
  'parallel',
  'causal',
  'foreshadow',
  'reveal',
]);
export const assetKindEnum = pgEnum('asset_kind', [
  'character',
  'scene',
  'background',
  'prop',
  'reference',
]);
export const assetSourceEnum = pgEnum('asset_source', ['upload', 'generated']);
export const storyboardStatusEnum = pgEnum('storyboard_status', ['draft', 'ready']);
export const storylineTypeEnum = pgEnum('storyline_type', ['main', 'sub']);
export const storylinePacingEnum = pgEnum('storyline_pacing', [
  'slow',
  'standard',
  'fast',
  'custom',
]);
export const milestoneStatusEnum = pgEnum('milestone_status', ['planned', 'active', 'completed']);
export const storyNodeStatusEnum = pgEnum('story_node_status', [
  'planned',
  'drafting',
  'completed',
]);
export const chapterSourceEnum = pgEnum('chapter_source', ['human', 'ai', 'mixed']);
export const foreshadowStatusEnum = pgEnum('foreshadow_status', ['planned', 'planted', 'revealed']);
export const foreshadowImportanceEnum = pgEnum('foreshadow_importance', ['low', 'medium', 'high']);
export const inspirationStatusEnum = pgEnum('inspiration_status', ['inbox', 'linked', 'archived']);
export const loreCategoryEnum = pgEnum('lore_category', [
  'faction',
  'ability',
  'history',
  'glossary',
  'custom',
]);
export const worldRuleCategoryEnum = pgEnum('world_rule_category', [
  'ability',
  'geography',
  'society',
  'time',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').unique(),
    displayName: text('display_name').notNull().default('本地创作者'),
    isLocal: boolean('is_local').notNull().default(true),
    passwordHash: text('password_hash'),
    role: userRoleEnum('role').notNull().default('owner'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('users_single_local_idx')
      .on(table.isLocal)
      .where(sql`${table.isLocal} = true`),
  ],
);

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('user_sessions_user_id_idx').on(table.userId)],
);

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    visibility: projectVisibilityEnum('visibility').notNull().default('private'),
    aiMode: aiModeEnum('ai_mode').notNull().default('manual'),
    styleSamples: jsonb('style_samples').$type<string[]>().notNull().default([]),
    ...timestamps,
  },
  (table) => [
    index('projects_owner_id_idx').on(table.ownerId),
    check('projects_name_not_blank', sql`char_length(trim(${table.name})) > 0`),
    check('projects_name_max_length', sql`char_length(${table.name}) <= 80`),
  ],
);

export const projectMembers = pgTable(
  'project_members',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('editor'),
    joinedAt: timestamp('joined_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.userId] }),
    index('project_members_user_id_idx').on(table.userId),
  ],
);

export const storyBibles = pgTable('story_bibles', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: 'cascade' }),
  worldRules: text('world_rules').notNull().default(''),
  writingStyle: text('writing_style').notNull().default(''),
  prohibitedContent: text('prohibited_content').notNull().default(''),
  characterRules: text('character_rules').notNull().default(''),
  plotGoals: text('plot_goals').notNull().default(''),
  endingDirection: text('ending_direction').notNull().default(''),
  compressedSummary: text('compressed_summary').notNull().default(''),
  compressedHash: text('compressed_hash').notNull().default(''),
  ...timestamps,
});

export const worldRules = pgTable(
  'world_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    condition: text('condition').notNull(),
    result: text('result').notNull(),
    category: worldRuleCategoryEnum('category').notNull(),
    priority: integer('priority').notNull().default(1),
    enabled: boolean('enabled').notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index('world_rules_project_id_idx').on(table.projectId),
    check('world_rules_priority_range', sql`${table.priority} between 1 and 100`),
  ],
);

export const loreEntries = pgTable(
  'lore_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    category: loreCategoryEnum('category').notNull().default('custom'),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    detail: text('detail').notNull().default(''),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    injectToAi: boolean('inject_to_ai').notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index('lore_entries_project_id_idx').on(table.projectId),
    uniqueIndex('lore_entries_project_name_idx').on(table.projectId, table.name),
  ],
);

export const characters = pgTable(
  'characters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    aliases: jsonb('aliases').$type<string[]>().notNull().default([]),
    bio: text('bio').notNull().default(''),
    bioCompressed: text('bio_compressed').notNull().default(''),
    appearance: text('appearance').notNull().default(''),
    personality: text('personality').notNull().default(''),
    voiceSamples: jsonb('voice_samples').$type<string[]>().notNull().default([]),
    ...timestamps,
  },
  (table) => [
    index('characters_project_id_idx').on(table.projectId),
    uniqueIndex('characters_project_name_idx').on(table.projectId, table.name),
  ],
);

export const characterRelations = pgTable(
  'character_relations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    sourceCharacterId: uuid('source_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    targetCharacterId: uuid('target_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    relationType: text('relation_type').notNull(),
    description: text('description').notNull().default(''),
    strength: integer('strength').notNull().default(3),
    ...timestamps,
  },
  (table) => [
    index('character_relations_project_id_idx').on(table.projectId),
    uniqueIndex('character_relations_pair_type_idx').on(
      table.sourceCharacterId,
      table.targetCharacterId,
      table.relationType,
    ),
    check(
      'character_relations_distinct_characters',
      sql`${table.sourceCharacterId} <> ${table.targetCharacterId}`,
    ),
    check('character_relations_strength_range', sql`${table.strength} between 1 and 5`),
  ],
);

export const storylines = pgTable(
  'storylines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    type: storylineTypeEnum('type').notNull().default('main'),
    color: text('color').notNull().default('#6366f1'),
    endingGoal: text('ending_goal').notNull().default(''),
    pacing: storylinePacingEnum('pacing').notNull().default('standard'),
    generationConstraints: jsonb('generation_constraints').$type<string[]>().notNull().default([]),
    ...timestamps,
  },
  (table) => [
    index('storylines_project_id_idx').on(table.projectId),
    uniqueIndex('storylines_project_title_idx').on(table.projectId, table.title),
  ],
);

export const storylineMilestones = pgTable(
  'storyline_milestones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storylineId: uuid('storyline_id')
      .notNull()
      .references(() => storylines.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    sortOrder: integer('sort_order').notNull(),
    status: milestoneStatusEnum('status').notNull().default('planned'),
    progress: integer('progress').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('storyline_milestones_order_idx').on(table.storylineId, table.sortOrder),
    check('storyline_milestones_sort_order_nonnegative', sql`${table.sortOrder} >= 0`),
    check('storyline_milestones_progress_range', sql`${table.progress} between 0 and 100`),
  ],
);

export const storyNodes = pgTable(
  'story_nodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    storylineId: uuid('storyline_id').references(() => storylines.id, {
      onDelete: 'set null',
    }),
    milestoneId: uuid('milestone_id').references(() => storylineMilestones.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    description: text('description').notNull().default(''),
    nodeGoal: text('node_goal').notNull().default(''),
    conflict: text('conflict').notNull().default(''),
    requiredEvents: jsonb('required_events').$type<string[]>().notNull().default([]),
    sortOrder: integer('sort_order').notNull(),
    status: storyNodeStatusEnum('status').notNull().default('planned'),
    storyTimeLabel: text('story_time_label').notNull().default(''),
    canvasX: real('canvas_x').notNull().default(0),
    canvasY: real('canvas_y').notNull().default(0),
    isKeyScene: boolean('is_key_scene').notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index('story_nodes_project_id_idx').on(table.projectId),
    uniqueIndex('story_nodes_storyline_order_idx').on(table.storylineId, table.sortOrder),
    check('story_nodes_sort_order_nonnegative', sql`${table.sortOrder} >= 0`),
  ],
);

export const storyNodeEdges = pgTable(
  'story_node_edges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    sourceNodeId: uuid('source_node_id')
      .notNull()
      .references(() => storyNodes.id, { onDelete: 'cascade' }),
    targetNodeId: uuid('target_node_id')
      .notNull()
      .references(() => storyNodes.id, { onDelete: 'cascade' }),
    type: storyEdgeTypeEnum('type').notNull().default('flow'),
    label: text('label').notNull().default(''),
    condition: text('condition').notNull().default(''),
    ...timestamps,
  },
  (table) => [
    index('story_node_edges_project_id_idx').on(table.projectId),
    uniqueIndex('story_node_edges_unique_idx').on(
      table.sourceNodeId,
      table.targetNodeId,
      table.type,
    ),
    check('story_node_edges_not_self', sql`${table.sourceNodeId} <> ${table.targetNodeId}`),
  ],
);

export const aiProviders = pgTable(
  'ai_providers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    kind: aiProviderKindEnum('kind').notNull(),
    protocol: text('protocol').notNull(),
    baseUrl: text('base_url').notNull(),
    defaultModel: text('default_model').notNull(),
    models: jsonb('models').$type<string[]>().notNull().default([]),
    encryptedApiKey: text('encrypted_api_key'),
    enabled: boolean('enabled').notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index('ai_providers_owner_id_idx').on(table.ownerId),
    uniqueIndex('ai_providers_owner_name_idx').on(table.ownerId, table.name),
  ],
);

export const generationRuns = pgTable(
  'generation_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id').references(() => aiProviders.id, { onDelete: 'set null' }),
    taskType: text('task_type').notNull(),
    status: generationStatusEnum('status').notNull().default('pending'),
    input: jsonb('input').$type<Record<string, unknown>>().notNull().default({}),
    output: jsonb('output').$type<Record<string, unknown> | null>(),
    error: text('error'),
    startedAt: timestamp('started_at', { mode: 'date', withTimezone: true }),
    completedAt: timestamp('completed_at', { mode: 'date', withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('generation_runs_owner_id_idx').on(table.ownerId),
    index('generation_runs_project_id_idx').on(table.projectId),
  ],
);

export const scenes = pgTable(
  'scenes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyNodeId: uuid('story_node_id')
      .notNull()
      .unique()
      .references(() => storyNodes.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    location: text('location').notNull().default(''),
    timeOfDay: text('time_of_day').notNull().default(''),
    weather: text('weather').notNull().default(''),
    atmosphere: text('atmosphere').notNull().default(''),
    visualPrompt: text('visual_prompt').notNull().default(''),
    ...timestamps,
  },
  (table) => [index('scenes_project_id_idx').on(table.projectId)],
);

export const characterAbilities = pgTable(
  'character_abilities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    level: integer('level').notNull().default(1),
    ...timestamps,
  },
  (table) => [
    index('character_abilities_project_id_idx').on(table.projectId),
    uniqueIndex('character_abilities_name_idx').on(table.characterId, table.name),
  ],
);

export const assets = pgTable(
  'assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    kind: assetKindEnum('kind').notNull().default('reference'),
    source: assetSourceEnum('source').notNull(),
    name: text('name').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    storagePath: text('storage_path').notNull(),
    prompt: text('prompt').notNull().default(''),
    characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
    storyNodeId: uuid('story_node_id').references(() => storyNodes.id, { onDelete: 'set null' }),
    abilityId: uuid('ability_id').references(() => characterAbilities.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (table) => [
    index('assets_project_id_idx').on(table.projectId),
    index('assets_ability_id_idx').on(table.abilityId),
  ],
);

export const storyboards = pgTable('storyboards', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('故事分镜'),
  status: storyboardStatusEnum('status').notNull().default('draft'),
  ...timestamps,
});

export const storyboardShots = pgTable(
  'storyboard_shots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyboardId: uuid('storyboard_id')
      .notNull()
      .references(() => storyboards.id, { onDelete: 'cascade' }),
    storyNodeId: uuid('story_node_id').references(() => storyNodes.id, { onDelete: 'set null' }),
    assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'set null' }),
    sortOrder: integer('sort_order').notNull(),
    title: text('title').notNull(),
    narration: text('narration').notNull().default(''),
    visualPrompt: text('visual_prompt').notNull().default(''),
    durationMs: integer('duration_ms').notNull().default(4000),
    transition: text('transition').notNull().default('fade'),
    ...timestamps,
  },
  (table) => [uniqueIndex('storyboard_shots_order_idx').on(table.storyboardId, table.sortOrder)],
);

export const chapters = pgTable(
  'chapters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    storyNodeId: uuid('story_node_id')
      .notNull()
      .unique()
      .references(() => storyNodes.id, { onDelete: 'cascade' }),
    chapterNumber: integer('chapter_number').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull().default(''),
    summary: text('summary').notNull().default(''),
    source: chapterSourceEnum('source').notNull().default('human'),
    wordCount: integer('word_count').notNull().default(0),
    targetWordCount: integer('target_word_count'),
    revision: integer('revision').notNull().default(1),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('chapters_project_number_idx').on(table.projectId, table.chapterNumber),
    check('chapters_number_positive', sql`${table.chapterNumber} > 0`),
    check('chapters_word_count_nonnegative', sql`${table.wordCount} >= 0`),
    check(
      'chapters_target_word_count_positive',
      sql`${table.targetWordCount} is null or ${table.targetWordCount} > 0`,
    ),
    check('chapters_revision_positive', sql`${table.revision} > 0`),
  ],
);

export const foreshadows = pgTable(
  'foreshadows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    plantedNodeId: uuid('planted_node_id').references(() => storyNodes.id, {
      onDelete: 'set null',
    }),
    revealNodeId: uuid('reveal_node_id').references(() => storyNodes.id, {
      onDelete: 'set null',
    }),
    status: foreshadowStatusEnum('status').notNull().default('planned'),
    importance: foreshadowImportanceEnum('importance').notNull().default('medium'),
    lastAppearedChapter: integer('last_appeared_chapter'),
    ...timestamps,
  },
  (table) => [
    index('foreshadows_project_id_idx').on(table.projectId),
    check(
      'foreshadows_last_chapter_positive',
      sql`${table.lastAppearedChapter} is null or ${table.lastAppearedChapter} > 0`,
    ),
  ],
);

export const inspirations = pgTable(
  'inspirations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    status: inspirationStatusEnum('status').notNull().default('inbox'),
    linkedNodeId: uuid('linked_node_id').references(() => storyNodes.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (table) => [index('inspirations_project_id_idx').on(table.projectId)],
);

export const projectSnapshots = pgTable(
  'project_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('project_snapshots_project_id_idx').on(table.projectId)],
);

export const storyNodeCharacters = pgTable(
  'story_node_characters',
  {
    storyNodeId: uuid('story_node_id')
      .notNull()
      .references(() => storyNodes.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.storyNodeId, table.characterId] }),
    index('story_node_characters_character_idx').on(table.characterId),
  ],
);

export const storyNodeLoreEntries = pgTable(
  'story_node_lore_entries',
  {
    storyNodeId: uuid('story_node_id')
      .notNull()
      .references(() => storyNodes.id, { onDelete: 'cascade' }),
    loreEntryId: uuid('lore_entry_id')
      .notNull()
      .references(() => loreEntries.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.storyNodeId, table.loreEntryId] }),
    index('story_node_lore_entries_lore_idx').on(table.loreEntryId),
  ],
);
