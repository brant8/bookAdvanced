# StoryVerse · Codex 技术规格文档 v3.0

> 本文档供 Codex / Claude Code 直接用于代码生成。
> 包含完整技术栈、数据模型、API 接口、模块实现规范、Docker 部署配置。

---

## 一、技术栈

### 前端
- **框架**：React 18 + Vite + TypeScript
- **状态管理**：Zustand（全局） + React Query（服务端数据）
- **画布引擎**：Konva.js（故事线画布/地图手绘）
- **流程图**：ReactFlow（人物关系图）
- **富文本编辑器**：Tiptap v2
- **动画引擎**：自研 Canvas 帧序列播放器
- **实时协作**：Yjs + y-websocket
- **视频导出**：FFmpeg.wasm
- **样式**：Tailwind CSS + shadcn/ui
- **Token 估算**：tiktoken（前端）
- **命令面板**：cmdk

### 后端
- **运行时**：Node.js 20 + TypeScript
- **框架**：Hono（适配 Node.js 和 Cloudflare Workers）
- **数据库 ORM**：Drizzle ORM
- **数据库**：PostgreSQL 15
- **缓存/队列**：Redis 7 + BullMQ
- **认证**：Jose（JWT） + bcryptjs
- **对象存储**：S3 兼容接口（本地 MinIO / 云端 R2 或 S3）
- **WebSocket**：y-websocket（独立服务）

### AI 服务层
- **文字 AI**：统一 AIProvider，支持 OpenAI / Anthropic / Gemini / DeepSeek / Groq
- **图像 AI**：Replicate API（REMBG 抠图 / SDXL 生图）
- **Token 计算**：tiktoken

### 部署
- **容器化**：Docker + Docker Compose
- **反向代理**：Nginx
- **本地对象存储**：MinIO（S3 兼容）
- **云端迁移路径**：PostgreSQL → Supabase/Neon，MinIO → R2/S3，直接改环境变量

---

## 二、目录结构

```
storyverse/
├── apps/
│   ├── web/                          # 前端 React + Vite
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── canvas/           # 故事线画布（Konva.js）
│   │   │   │   ├── timeline/         # 时间轴视图
│   │   │   │   ├── map/              # 世界地图 + 手绘
│   │   │   │   ├── relation/         # 人物关系图（ReactFlow）
│   │   │   │   ├── editor/           # 正文编辑器（Tiptap）
│   │   │   │   ├── animation/        # 剪纸动画播放器
│   │   │   │   ├── asset/            # 素材库 + 剪裁工作台
│   │   │   │   ├── dashboard/        # 项目仪表盘
│   │   │   │   ├── inspiration/      # 灵感速记
│   │   │   │   ├── lore/             # Lore 世界观系统
│   │   │   │   ├── character/        # Character Sheet
│   │   │   │   ├── comment/          # 评论批注
│   │   │   │   ├── command/          # 命令面板（cmdk）
│   │   │   │   └── ui/               # 通用 UI 组件
│   │   │   ├── stores/               # Zustand stores
│   │   │   ├── hooks/                # 自定义 hooks
│   │   │   ├── lib/
│   │   │   │   ├── ai/               # AI 调用封装
│   │   │   │   ├── sync/             # Yjs 协作
│   │   │   │   ├── export/           # MD / 视频导出
│   │   │   │   ├── events/           # EventBus
│   │   │   │   └── shortcuts/        # 键盘快捷键
│   │   │   ├── pages/                # 路由页面
│   │   │   └── types/                # TypeScript 类型（从 packages/shared-types 引入）
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── api/                          # 后端 Hono API
│   │   ├── src/
│   │   │   ├── routes/               # API 路由
│   │   │   ├── services/             # 业务逻辑
│   │   │   ├── ai/                   # AI Gateway
│   │   │   ├── db/                   # Drizzle schema + 查询
│   │   │   ├── middleware/           # 认证/限流/日志
│   │   │   ├── queue/                # BullMQ 任务（视频导出等）
│   │   │   └── storage/              # S3 兼容存储封装
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   └── ws/                           # Yjs WebSocket 协作服务
│       ├── src/server.ts
│       └── package.json
│
├── packages/
│   └── shared-types/                 # 前后端共享 TypeScript 类型
│       └── src/index.ts
│
├── docker/
│   ├── web/Dockerfile
│   ├── api/Dockerfile
│   └── ws/Dockerfile
│
├── nginx/
│   └── nginx.conf
│
├── docker-compose.yml                # 本地开发
├── docker-compose.prod.yml           # 生产覆盖
├── .env.example                      # 完整环境变量模板
└── package.json                      # monorepo 根
```

---

## 三、完整类型定义（packages/shared-types/src/index.ts）

```typescript
// ==================== 用户 & 账号 ====================

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  tier: 'free' | 'pro' | 'team';
  ai_credits: number;              // 剩余平台积分
  created_at: string;
}

export interface UserAIConfig {
  id: string;
  user_id: string;
  provider: 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'groq' | 'custom';
  model_id: string;
  api_key_encrypted: string;
  base_url: string | null;
  is_default: boolean;
  purpose: 'text' | 'image' | 'both';
}

// ==================== 项目 ====================

export interface Project {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  visibility: 'private' | 'team';
  ai_mode: 'manual' | 'suggest' | 'auto';
  style_theme: 'papercut' | 'ink' | 'minimal' | 'custom';
  style_samples: string[];          // 风格锁定：参考文体样本（2-3段）
  master_md: string;               // 云端 Master MD 快照
  master_md_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'commenter' | 'viewer';
  joined_at: string;
}

export interface ProjectStats {
  total_words: number;
  ai_words: number;
  human_words: number;
  completed_chapters: number;
  total_chapters: number;
  streak_days: number;             // 连续创作天数
  today_words: number;
}

// ==================== 世界构建 ====================

export interface WorldCircle {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  description: string;
  cover_image_url: string | null;
  level: 'universe' | 'planet' | 'continent' | 'country' | 'city' | 'custom';
  created_at: string;
}

export interface WorldMap {
  id: string;
  world_id: string;
  image_url: string | null;
  source: 'ai' | 'upload' | 'draw';
  canvas_data: object | null;      // Konva JSON（手绘数据）
  created_at: string;
}

export interface LocationNode {
  id: string;
  map_id: string;
  name: string;
  description: string;
  atmosphere_tags: string[];
  map_x: number;                   // 地图坐标比例 0-1
  map_y: number;
  character_ids: string[];
  created_at: string;
}

// ==================== Lore 世界观 ====================

export type LoreCategory = 'faction' | 'ability' | 'history' | 'glossary' | 'custom';

export interface LoreEntry {
  id: string;
  project_id: string;
  category: LoreCategory;
  name: string;
  description: string;
  detail: string;                  // 详细内容（可为 Markdown）
  related_ids: string[];           // 关联其他 Lore 条目
  tags: string[];
  inject_to_ai: boolean;           // 是否注入 AI 上下文
  created_at: string;
  updated_at: string;
}

// ==================== 角色 ====================

export interface Character {
  id: string;
  project_id: string;
  name: string;
  aliases: string[];
  bio: string;
  bio_compressed: string;          // ≤100字，AI 调用时使用
  appearance: string;
  personality: string;
  catchphrase: string;             // 口头禅
  taboos: string;                  // 行为禁忌
  faction_lore_id: string | null;  // 关联势力 Lore 条目
  abilities: string[];             // 关联能力 Lore 条目 ID
  voice_samples: string[];         // 语气锁定：典型对话样本（2-3句）
  avatar_asset_id: string | null;
  first_appear_node_id: string | null;
  created_at: string;
}

export interface CharacterRelation {
  id: string;
  project_id: string;
  from_character_id: string;
  to_character_id: string;
  relation_type: 'enemy' | 'friend' | 'lover' | 'family' | 'mentor' | 'rival' | 'custom';
  relation_label: string;
  strength: number;                // 1-5，连线粗细
}

// ==================== 故事节点 ====================

export interface StoryNode {
  id: string;
  project_id: string;
  storyline_id: string | null;

  // 基础
  title: string;
  summary: string;                 // ≤50字，AI 调用时使用
  description: string;

  // 画布
  canvas_x: number;
  canvas_y: number;

  // 时间轴
  timeline_position: number;       // 故事内时间（毫秒）
  story_time_label: string;

  // 关联
  character_ids: string[];
  location_id: string | null;
  clue_ids: string[];
  lore_ids: string[];              // 关联 Lore 条目

  // 正文
  chapter_index: number | null;
  paragraph_start: number | null;
  paragraph_end: number | null;
  text_content: string;
  text_source: 'ai' | 'human' | 'mixed' | null;
  word_count: number;
  word_count_target: number | null;  // 字数目标

  // 动画
  animation_frame_id: string | null;
  asset_ids: string[];
  is_key_scene: boolean;

  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface Storyline {
  id: string;
  project_id: string;
  title: string;
  character_id: string | null;
  color: string;
  type: 'main' | 'sub';
  parent_storyline_id: string | null;
  merge_node_id: string | null;
  node_order: string[];
  created_at: string;
}

// ==================== 线索 & 灵感 ====================

export interface Clue {
  id: string;
  project_id: string;
  content: string;
  first_appear_node_id: string | null;
  status: 'unused' | 'planted' | 'revealed';
  category: string | null;
  created_at: string;
}

export interface Inspiration {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  tags: ('character' | 'plot' | 'world' | 'dialogue' | 'other')[];
  status: 'inbox' | 'linked' | 'archived';
  linked_node_id: string | null;
  linked_character_id: string | null;
  linked_lore_id: string | null;
  created_at: string;
}

// ==================== 素材 ====================

export interface Asset {
  id: string;
  project_id: string;
  name: string;
  category: 'character' | 'background' | 'building' | 'prop' | 'effect';
  url: string;
  url_thumbnail: string | null;
  url_transparent: string | null;  // 抠图后（透明背景）
  linked_character_id: string | null;
  linked_location_id: string | null;
  tags: string[];
  use_count: number;
  created_at: string;
}

// ==================== 动画 ====================

export interface AnimationFrame {
  id: string;
  project_id: string;
  node_id: string;
  scene_index: number;
  duration: number;
  layers: AnimationLayer[];
  transition: 'fade' | 'wipe' | 'cut' | 'dissolve';
  caption: string;
  style_theme: 'papercut' | 'ink' | 'minimal' | 'custom';
}

export interface AnimationLayer {
  asset_id: string;
  action: AnimationAction;
  delay: number;
  speed: number;
  z_index: number;
  x: number;
  y: number;
  scale: number;
}

export type AnimationAction =
  | 'slide_in_left' | 'slide_in_right' | 'slide_out_left' | 'slide_out_right'
  | 'slow_pan_right' | 'slow_pan_left' | 'slow_pan_up' | 'slow_pan_down'
  | 'shake' | 'zoom_in' | 'zoom_out' | 'float'
  | 'fade_in' | 'fade_out' | 'static'
  | 'enter_and_stop' | 'chase_scene' | 'cross_to';

// ==================== 评论 ====================

export interface Comment {
  id: string;
  project_id: string;
  author_id: string;
  target_type: 'node' | 'character' | 'lore' | 'text_range';
  target_id: string;
  text_range_start: number | null;  // 正文评论的字符位置
  text_range_end: number | null;
  content: string;
  parent_id: string | null;        // 回复
  resolved: boolean;
  created_at: string;
}

// ==================== 版本历史 ====================

export interface TextSnapshot {
  id: string;
  node_id: string;
  diff: string;                    // JSON patch（增量）
  full_text_hash: string;
  created_at: string;
  created_by: string;
}

export interface StructureSnapshot {
  id: string;
  project_id: string;
  description: string;
  snapshot_data: object;           // 完整结构 JSON
  created_at: string;
  created_by: string;
}

// ==================== 功能开关 ====================

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  config: Record<string, unknown>;
  updated_at: string;
}
```

---

## 四、数据库 Schema（Drizzle ORM + PostgreSQL）

```typescript
// apps/api/src/db/schema.ts
import { pgTable, text, uuid, boolean, integer, bigint, real, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  display_name: text('display_name').notNull().default(''),
  avatar_url: text('avatar_url'),
  tier: text('tier').notNull().default('free'),  // free | pro | team
  ai_credits: integer('ai_credits').notNull().default(100),
  streak_days: integer('streak_days').notNull().default(0),
  last_active_date: text('last_active_date'),
  created_at: timestamp('created_at').defaultNow(),
});

export const user_ai_configs = pgTable('user_ai_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  model_id: text('model_id').notNull(),
  api_key_encrypted: text('api_key_encrypted'),
  base_url: text('base_url'),
  is_default: boolean('is_default').notNull().default(false),
  purpose: text('purpose').notNull().default('both'),
});

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  owner_id: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  visibility: text('visibility').notNull().default('private'),
  ai_mode: text('ai_mode').notNull().default('manual'),
  style_theme: text('style_theme').notNull().default('papercut'),
  style_samples: jsonb('style_samples').notNull().default([]),
  master_md: text('master_md').notNull().default(''),
  master_md_updated_at: timestamp('master_md_updated_at'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const project_members = pgTable('project_members', {
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('editor'),
  joined_at: timestamp('joined_at').defaultNow(),
});

export const world_circles = pgTable('world_circles', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  parent_id: uuid('parent_id'),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  cover_image_url: text('cover_image_url'),
  level: text('level').notNull().default('custom'),
  created_at: timestamp('created_at').defaultNow(),
});

export const world_maps = pgTable('world_maps', {
  id: uuid('id').primaryKey().defaultRandom(),
  world_id: uuid('world_id').notNull().references(() => world_circles.id, { onDelete: 'cascade' }),
  image_url: text('image_url'),
  source: text('source').notNull(),
  canvas_data: jsonb('canvas_data'),
  created_at: timestamp('created_at').defaultNow(),
});

export const location_nodes = pgTable('location_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  map_id: uuid('map_id').notNull().references(() => world_maps.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  atmosphere_tags: jsonb('atmosphere_tags').notNull().default([]),
  map_x: real('map_x').notNull().default(0.5),
  map_y: real('map_y').notNull().default(0.5),
  character_ids: jsonb('character_ids').notNull().default([]),
  created_at: timestamp('created_at').defaultNow(),
});

export const lore_entries = pgTable('lore_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  category: text('category').notNull().default('custom'),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  detail: text('detail').notNull().default(''),
  related_ids: jsonb('related_ids').notNull().default([]),
  tags: jsonb('tags').notNull().default([]),
  inject_to_ai: boolean('inject_to_ai').notNull().default(false),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const characters = pgTable('characters', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  aliases: jsonb('aliases').notNull().default([]),
  bio: text('bio').notNull().default(''),
  bio_compressed: text('bio_compressed').notNull().default(''),
  appearance: text('appearance').notNull().default(''),
  personality: text('personality').notNull().default(''),
  catchphrase: text('catchphrase').notNull().default(''),
  taboos: text('taboos').notNull().default(''),
  faction_lore_id: uuid('faction_lore_id'),
  abilities: jsonb('abilities').notNull().default([]),
  voice_samples: jsonb('voice_samples').notNull().default([]),
  avatar_asset_id: uuid('avatar_asset_id'),
  first_appear_node_id: uuid('first_appear_node_id'),
  created_at: timestamp('created_at').defaultNow(),
});

export const character_relations = pgTable('character_relations', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  from_character_id: uuid('from_character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  to_character_id: uuid('to_character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  relation_type: text('relation_type').notNull().default('custom'),
  relation_label: text('relation_label').notNull().default(''),
  strength: integer('strength').notNull().default(3),
});

export const storylines = pgTable('storylines', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  character_id: uuid('character_id').references(() => characters.id),
  color: text('color').notNull().default('#6366f1'),
  type: text('type').notNull().default('main'),
  parent_storyline_id: uuid('parent_storyline_id'),
  merge_node_id: uuid('merge_node_id'),
  node_order: jsonb('node_order').notNull().default([]),
  created_at: timestamp('created_at').defaultNow(),
});

export const story_nodes = pgTable('story_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  storyline_id: uuid('storyline_id').references(() => storylines.id),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  description: text('description').notNull().default(''),
  canvas_x: real('canvas_x').notNull().default(0),
  canvas_y: real('canvas_y').notNull().default(0),
  timeline_position: bigint('timeline_position', { mode: 'number' }).notNull().default(0),
  story_time_label: text('story_time_label').notNull().default(''),
  character_ids: jsonb('character_ids').notNull().default([]),
  location_id: uuid('location_id').references(() => location_nodes.id),
  clue_ids: jsonb('clue_ids').notNull().default([]),
  lore_ids: jsonb('lore_ids').notNull().default([]),
  chapter_index: integer('chapter_index'),
  paragraph_start: integer('paragraph_start'),
  paragraph_end: integer('paragraph_end'),
  text_content: text('text_content').notNull().default(''),
  text_source: text('text_source'),
  word_count: integer('word_count').notNull().default(0),
  word_count_target: integer('word_count_target'),
  animation_frame_id: uuid('animation_frame_id'),
  asset_ids: jsonb('asset_ids').notNull().default([]),
  is_key_scene: boolean('is_key_scene').notNull().default(false),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  created_by: uuid('created_by').references(() => users.id),
}, (table) => ({
  projectIdx: index('idx_nodes_project').on(table.project_id),
  storylineIdx: index('idx_nodes_storyline').on(table.storyline_id),
}));

export const clues = pgTable('clues', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  first_appear_node_id: uuid('first_appear_node_id'),
  status: text('status').notNull().default('unused'),
  category: text('category'),
  created_at: timestamp('created_at').defaultNow(),
});

export const inspirations = pgTable('inspirations', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  tags: jsonb('tags').notNull().default([]),
  status: text('status').notNull().default('inbox'),
  linked_node_id: uuid('linked_node_id'),
  linked_character_id: uuid('linked_character_id'),
  linked_lore_id: uuid('linked_lore_id'),
  created_at: timestamp('created_at').defaultNow(),
});

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  url: text('url').notNull(),
  url_thumbnail: text('url_thumbnail'),
  url_transparent: text('url_transparent'),
  linked_character_id: uuid('linked_character_id'),
  linked_location_id: uuid('linked_location_id'),
  tags: jsonb('tags').notNull().default([]),
  use_count: integer('use_count').notNull().default(0),
  created_at: timestamp('created_at').defaultNow(),
});

export const animation_frames = pgTable('animation_frames', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  node_id: uuid('node_id').notNull().references(() => story_nodes.id, { onDelete: 'cascade' }),
  scene_index: integer('scene_index').notNull().default(0),
  duration: real('duration').notNull().default(3.0),
  layers: jsonb('layers').notNull().default([]),
  transition: text('transition').notNull().default('fade'),
  caption: text('caption').notNull().default(''),
  style_theme: text('style_theme').notNull().default('papercut'),
  created_at: timestamp('created_at').defaultNow(),
});

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  author_id: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  target_type: text('target_type').notNull(),
  target_id: text('target_id').notNull(),
  text_range_start: integer('text_range_start'),
  text_range_end: integer('text_range_end'),
  content: text('content').notNull(),
  parent_id: uuid('parent_id'),
  resolved: boolean('resolved').notNull().default(false),
  created_at: timestamp('created_at').defaultNow(),
});

export const text_snapshots = pgTable('text_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  node_id: uuid('node_id').notNull().references(() => story_nodes.id, { onDelete: 'cascade' }),
  diff: text('diff').notNull(),
  full_text_hash: text('full_text_hash').notNull(),
  created_at: timestamp('created_at').defaultNow(),
  created_by: uuid('created_by').references(() => users.id),
});

export const structure_snapshots = pgTable('structure_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  description: text('description').notNull().default(''),
  snapshot_data: jsonb('snapshot_data').notNull(),
  created_at: timestamp('created_at').defaultNow(),
  created_by: uuid('created_by').references(() => users.id),
});

export const feature_flags = pgTable('feature_flags', {
  key: text('key').primaryKey(),
  enabled: boolean('enabled').notNull().default(true),
  config: jsonb('config').notNull().default({}),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const daily_word_counts = pgTable('daily_word_counts', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),    // YYYY-MM-DD
  words_added: integer('words_added').notNull().default(0),
  ai_words: integer('ai_words').notNull().default(0),
  human_words: integer('human_words').notNull().default(0),
});
```

---

## 五、API 路由清单

```
# 认证
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
PATCH  /api/auth/me

# 用户 AI 配置
GET    /api/user/ai-configs
POST   /api/user/ai-configs
PATCH  /api/user/ai-configs/:id
DELETE /api/user/ai-configs/:id

# 项目
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id
GET    /api/projects/:id/stats
GET    /api/projects/:id/members
POST   /api/projects/:id/members
PATCH  /api/projects/:id/members/:userId
DELETE /api/projects/:id/members/:userId

# 世界圈
POST   /api/projects/:id/worlds
GET    /api/projects/:id/worlds
PATCH  /api/worlds/:worldId
DELETE /api/worlds/:worldId

# 地图
POST   /api/worlds/:worldId/maps
GET    /api/worlds/:worldId/maps
PATCH  /api/maps/:mapId
GET    /api/maps/:mapId/locations
POST   /api/maps/:mapId/locations
PATCH  /api/locations/:locationId
DELETE /api/locations/:locationId

# Lore 世界观
GET    /api/projects/:id/lore
POST   /api/projects/:id/lore
PATCH  /api/lore/:loreId
DELETE /api/lore/:loreId

# 角色
GET    /api/projects/:id/characters
POST   /api/projects/:id/characters
PATCH  /api/characters/:charId
DELETE /api/characters/:charId
GET    /api/projects/:id/character-relations
POST   /api/projects/:id/character-relations
PATCH  /api/character-relations/:relId
DELETE /api/character-relations/:relId

# 故事线 & 节点
GET    /api/projects/:id/storylines
POST   /api/projects/:id/storylines
PATCH  /api/storylines/:lineId
DELETE /api/storylines/:lineId
PATCH  /api/storylines/:lineId/reorder
GET    /api/projects/:id/nodes
POST   /api/projects/:id/nodes
PATCH  /api/nodes/:nodeId
DELETE /api/nodes/:nodeId
PATCH  /api/nodes/:nodeId/text

# 线索 & 灵感
GET    /api/projects/:id/clues
POST   /api/projects/:id/clues
PATCH  /api/clues/:clueId
GET    /api/projects/:id/inspirations
POST   /api/projects/:id/inspirations
PATCH  /api/inspirations/:inspirationId

# 素材
POST   /api/projects/:id/assets/upload
POST   /api/projects/:id/assets/crop
POST   /api/assets/:assetId/remove-bg
GET    /api/projects/:id/assets

# 动画
GET    /api/projects/:id/frames
PATCH  /api/frames/:frameId

# 评论
GET    /api/projects/:id/comments
POST   /api/projects/:id/comments
PATCH  /api/comments/:commentId
DELETE /api/comments/:commentId
PATCH  /api/comments/:commentId/resolve

# 版本历史
GET    /api/nodes/:nodeId/snapshots
POST   /api/nodes/:nodeId/snapshots
POST   /api/nodes/:nodeId/snapshots/:snapshotId/restore
GET    /api/projects/:id/structure-snapshots
POST   /api/projects/:id/structure-snapshots

# AI
POST   /api/ai/generate-text
POST   /api/ai/optimize-text
POST   /api/ai/continue-text
POST   /api/ai/predict-plot          # AI 反推情节走向
POST   /api/ai/detect-issues         # 漏洞/矛盾检测
POST   /api/ai/suggest-foreshadowing # 伏笔建议
POST   /api/ai/parse-novel           # 小说解析
POST   /api/ai/generate-animation
POST   /api/ai/generate-map
POST   /api/ai/compress-character    # 自动压缩 bio_compressed
POST   /api/ai/summarize-clues
POST   /api/ai/merge-inspirations    # 合并灵感为情节摘要

# 导出
GET    /api/projects/:id/export/md
GET    /api/projects/:id/export/chapters
GET    /api/projects/:id/export/novel
POST   /api/export/video             # 后台视频导出（预留，返回 501）

# 分享
POST   /api/projects/:id/share
GET    /api/share/:token             # 公开只读访问

# 功能开关（Admin）
GET    /api/admin/features
PATCH  /api/admin/features/:key
```

---

## 六、AI Gateway

```typescript
// apps/api/src/ai/gateway.ts

export type AITask =
  | { type: 'GENERATE_TEXT'; node: StoryNode; prev_nodes: StoryNode[]; next_node?: StoryNode; length: number }
  | { type: 'OPTIMIZE_TEXT'; text: string; context: string; style_samples: string[] }
  | { type: 'CONTINUE_TEXT'; before: string; after: string; characters: Character[]; style_samples: string[] }
  | { type: 'PREDICT_PLOT'; nodes: StoryNode[]; characters: Character[] }
  | { type: 'DETECT_ISSUES'; nodes: StoryNode[]; characters: Character[] }
  | { type: 'SUGGEST_FORESHADOWING'; node: StoryNode; future_nodes: StoryNode[] }
  | { type: 'PARSE_NOVEL'; text_chunk: string; chunk_index: number; total_chunks: number }
  | { type: 'GENERATE_ANIMATION'; node: StoryNode; assets: Asset[]; style: string }
  | { type: 'COMPRESS_CHARACTER'; character: Character }
  | { type: 'SUMMARIZE_CLUES'; clues: Clue[] }
  | { type: 'MERGE_INSPIRATIONS'; inspirations: Inspiration[] };

// 省 token：上下文构建器
export function buildContext(task: AITask, project: ProjectContext): string {
  // 风格锁定样本 hash 缓存
  const stylePrompt = project.style_samples.length > 0
    ? `[参考文体]\n${project.style_samples.join('\n---\n')}\n请模仿以上文体风格。\n\n`
    : '';

  switch (task.type) {
    case 'GENERATE_TEXT': {
      const prevSummaries = task.prev_nodes.slice(-2).map(n => `- ${n.summary}`).join('\n');
      const charSummaries = task.node.character_ids
        .map(id => project.characters.find(c => c.id === id)?.bio_compressed ?? '')
        .filter(Boolean).join('\n');
      const loreSummaries = task.node.lore_ids
        .map(id => project.lore.find(l => l.id === id))
        .filter(Boolean)
        .map(l => `[${l!.name}] ${l!.description}`)
        .join('\n');
      // 总计 ~900 token
      return `${stylePrompt}[角色设定]\n${charSummaries}\n\n[相关世界观]\n${loreSummaries}\n\n[前文摘要]\n${prevSummaries}\n\n[当前情节]\n${task.node.description}\n\n[后续方向]\n${task.next_node?.summary ?? ''}\n\n[任务] 生成本情节正文约${task.length}字。`;
    }

    case 'CONTINUE_TEXT': {
      const before = task.before.slice(-500);    // 前 500 字
      const after = task.after.slice(0, 200);    // 后 200 字
      const voiceSamples = task.characters
        .filter(c => c.voice_samples.length > 0)
        .map(c => `${c.name}的语气：${c.voice_samples.join(' / ')}`)
        .join('\n');
      return `${stylePrompt}[角色语气]\n${voiceSamples}\n\n[前文]\n${before}\n\n[续写位置]\n\n[后文方向]\n${after}\n\n[任务] 在续写位置补充内容，自然衔接前后文。`;
    }

    case 'PREDICT_PLOT': {
      const summaries = task.nodes.slice(-5).map(n => `- ${n.story_time_label} ${n.summary}`).join('\n');
      return `[近期情节]\n${summaries}\n\n[任务] 预测3条后续走向，每条50字以内，JSON格式返回：{"predictions": ["...", "...", "..."]}`;
    }

    default:
      return '';
  }
}
```

---

## 七、EventBus（前端联动系统）

```typescript
// apps/web/src/lib/events/handlers.ts
// 所有纯逻辑联动在此注册，零 AI 调用

export function registerCoreHandlers(bus: EventBus) {

  // 节点创建 → 正文新增空白章节 + 素材库新增角色槽
  bus.on('NODE_CREATED', ({ node }) => {
    useEditorStore.getState().createBlankChapter(node.id);
    node.character_ids.forEach(charId => {
      useAssetStore.getState().ensureCharacterSlot(charId);
    });
    if (node.location_id) {
      useMapStore.getState().highlightLocation(node.location_id);
    }
  });

  // 节点移动 → 时间轴同步
  bus.on('NODE_MOVED', ({ nodeId, x }) => {
    useTimelineStore.getState().syncNodePosition(nodeId, x);
  });

  // 关键场景标记 → 动画时间轴添加标记
  bus.on('NODE_KEY_SCENE_TOGGLED', ({ nodeId, isKeyScene }) => {
    useAnimationStore.getState().toggleFrameMarker(nodeId, isKeyScene);
  });

  // 章节重排 → 画布节点顺序更新
  bus.on('CHAPTER_REORDERED', ({ order }) => {
    useCanvasStore.getState().syncChapterOrder(order);
  });

  // 正文段落点击 → 画布高亮对应节点
  bus.on('PARAGRAPH_CLICKED', ({ nodeId }) => {
    useCanvasStore.getState().highlightNode(nodeId);
  });

  // 角色创建 → 素材库新增角色槽
  bus.on('CHARACTER_CREATED', ({ character }) => {
    useAssetStore.getState().createCharacterSlot(character.id, character.name);
  });

  // 地点创建 → 地图添加标记
  bus.on('LOCATION_CREATED', ({ location }) => {
    useMapStore.getState().addLocationMarker(location);
  });

  // Lore 条目关联节点 → AI 生成时自动注入（标记，不直接调 AI）
  bus.on('LORE_LINKED_TO_NODE', ({ nodeId, loreId }) => {
    useNodeStore.getState().addLoreToNode(nodeId, loreId);
  });
}
```

---

## 八、Docker 部署配置

### docker-compose.yml（本地开发）

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: storyverse
      POSTGRES_USER: storyverse
      POSTGRES_PASSWORD: storyverse_dev
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U storyverse"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - ./data/redis:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    volumes:
      - ./data/minio:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 3

  api:
    build:
      context: .
      dockerfile: docker/api/Dockerfile
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://storyverse:storyverse_dev@postgres:5432/storyverse
      REDIS_URL: redis://redis:6379
      S3_ENDPOINT: http://minio:9000
      S3_ACCESS_KEY: minioadmin
      S3_SECRET_KEY: minioadmin123
      S3_BUCKET: storyverse
      JWT_SECRET: dev_jwt_secret_change_in_production
      ENCRYPTION_KEY: dev_encryption_key_32chars_change!
    ports:
      - "3001:3001"
    volumes:
      - ./apps/api/src:/app/apps/api/src  # 热重载
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy

  ws:
    build:
      context: .
      dockerfile: docker/ws/Dockerfile
    environment:
      PORT: 3002
      REDIS_URL: redis://redis:6379
    ports:
      - "3002:3002"
    depends_on:
      redis:
        condition: service_healthy

  web:
    build:
      context: .
      dockerfile: docker/web/Dockerfile
    environment:
      VITE_API_URL: http://localhost:3001
      VITE_WS_URL: ws://localhost:3002
    ports:
      - "5173:5173"
    volumes:
      - ./apps/web/src:/app/apps/web/src  # 热重载

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "80:80"
    depends_on:
      - web
      - api
      - ws
```

### docker-compose.prod.yml（生产覆盖）

```yaml
version: '3.9'

services:
  api:
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      S3_ENDPOINT: ${S3_ENDPOINT}
      S3_ACCESS_KEY: ${S3_ACCESS_KEY}
      S3_SECRET_KEY: ${S3_SECRET_KEY}
      S3_BUCKET: ${S3_BUCKET}
      JWT_SECRET: ${JWT_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  ws:
    restart: always

  web:
    restart: always
    environment:
      VITE_API_URL: ${PUBLIC_API_URL}
      VITE_WS_URL: ${PUBLIC_WS_URL}

  nginx:
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./data/certbot:/etc/letsencrypt:ro  # HTTPS 证书
```

### .env.example（完整模板）

```env
# ===== 数据库 =====
# 本地：postgresql://storyverse:storyverse_dev@localhost:5432/storyverse
# 云端 Supabase：postgresql://postgres:[password]@[host]:5432/postgres
# 云端 Neon：postgresql://[user]:[password]@[host]/storyverse?sslmode=require
DATABASE_URL=postgresql://storyverse:storyverse_dev@postgres:5432/storyverse

# ===== Redis =====
# 本地：redis://localhost:6379
# 云端 Upstash：rediss://:[password]@[host]:6380
REDIS_URL=redis://redis:6379

# ===== 对象存储 =====
# 本地 MinIO
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin123
S3_BUCKET=storyverse
S3_REGION=us-east-1
# 云端 Cloudflare R2（只需改以下三项，其余保持）
# S3_ENDPOINT=https://[account_id].r2.cloudflarestorage.com
# S3_ACCESS_KEY=[r2_access_key]
# S3_SECRET_KEY=[r2_secret_key]

# ===== 认证 =====
JWT_SECRET=your_jwt_secret_at_least_32_chars
ENCRYPTION_KEY=your_32_char_encryption_key_here!  # 用于加密用户 API Key

# ===== AI（平台预制，用于积分模式）=====
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
GROQ_API_KEY=

# ===== 图像服务 =====
REPLICATE_API_KEY=      # REMBG 抠图 + 图像生成
REMOVEBG_API_KEY=       # 备选抠图方案

# ===== 前端公开变量 =====
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3002

# ===== 生产环境额外配置 =====
PUBLIC_API_URL=https://api.yourdomain.com
PUBLIC_WS_URL=wss://ws.yourdomain.com

# ===== Admin =====
ADMIN_SECRET=your_admin_secret
```

### Makefile（常用操作快捷命令）

```makefile
# 本地开发
up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

# 数据库
db-migrate:
	docker compose exec api npm run db:migrate

db-seed:
	docker compose exec api npm run db:seed

db-reset:
	docker compose down -v && docker compose up -d postgres && sleep 3 && make db-migrate

# 生产部署
prod-up:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

prod-down:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# 备份
backup-db:
	docker compose exec postgres pg_dump -U storyverse storyverse > backup_$(shell date +%Y%m%d).sql

# 清理
clean:
	docker compose down -v
	rm -rf data/
```

---

## 九、开发优先级（Phase 1 MVP）

按此顺序实现，每步完成后再进入下一步：

1. **Docker 环境搭建**：docker-compose.yml、所有 Dockerfile、Makefile、.env.example
2. **数据库 Schema**：Drizzle schema 全部表，执行 migrate
3. **认证系统**：注册/登录/JWT，用户 AI 配置 CRUD
4. **项目 CRUD + 成员管理**：基础项目管理
5. **EventBus**：事件总线 + 所有核心联动 handlers
6. **故事线画布**：Konva.js，节点增删改，连线，支持拖拽
7. **时间轴视图**：横向时间线，节点拖拽排序
8. **人物关系图 + Character Sheet**：ReactFlow + 详细角色设定
9. **世界圈 + 地图 + Lore 系统**：世界构建完整模块
10. **正文编辑器**：Tiptap + 章节管理 + 风格锁定 + 与画布联动
11. **灵感速记**：快捷键呼出 + 状态管理 + 关联
12. **素材库 + 剪裁工作台**：上传、框选、抠图
13. **AI Gateway**：所有 AI 任务 + 省 token 上下文构建
14. **命令面板 + 快捷键**：cmdk + 全局快捷键注册
15. **项目仪表盘 + 写作统计**：数据汇总展示
16. **导出 MD + 小说正文**：Master MD 生成 + 正文导出


---

# ── v3.0 新增技术规格 ──

## 十、新增数据库表（Drizzle ORM）

```typescript
// ==================== Story Bible ====================

export const story_bible = pgTable('story_bible', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }).unique(),
  world_rules: text('world_rules').notNull().default(''),
  writing_style: text('writing_style').notNull().default(''),
  prohibited_content: text('prohibited_content').notNull().default(''),
  power_system_rules: text('power_system_rules').notNull().default(''),
  character_rules: text('character_rules').notNull().default(''),
  plot_goals: text('plot_goals').notNull().default(''),
  ending_direction: text('ending_direction').notNull().default(''),
  // 压缩摘要，AI 调用时使用（~150 token）
  summary_compressed: text('summary_compressed').notNull().default(''),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// ==================== 伏笔系统（升级线索库）====================

export const foreshadows = pgTable('foreshadows', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  planted_node_id: uuid('planted_node_id').references(() => story_nodes.id),
  reveal_node_id: uuid('reveal_node_id').references(() => story_nodes.id),
  status: text('status').notNull().default('planned'), // planned | planted | revealed
  importance: text('importance').notNull().default('medium'), // low | medium | high
  last_appeared_node_id: uuid('last_appeared_node_id'), // 最近一次出现的节点
  absent_chapters: integer('absent_chapters').notNull().default(0), // 已连续缺席章节数
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
  projectIdx: index('idx_foreshadows_project').on(table.project_id),
}));

// ==================== 世界规则引擎 ====================

export const world_rules = pgTable('world_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  condition: text('condition').notNull(),
  result: text('result').notNull(),
  category: text('category').notNull().default('ability'), // ability | geography | society | time | custom
  priority: integer('priority').notNull().default(5), // 1-10，越高越优先注入
  enabled: boolean('enabled').notNull().default(true),
  created_at: timestamp('created_at').defaultNow(),
});

// ==================== 战力系统 ====================

export const power_ranks = pgTable('power_ranks', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),          // 如"金丹期"
  level: integer('level').notNull(),     // 数字等级，用于比较
  description: text('description').notNull().default(''),
  sort_order: integer('sort_order').notNull().default(0),
});

export const character_power_history = pgTable('character_power_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  character_id: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  node_id: uuid('node_id').references(() => story_nodes.id),
  power_rank_id: uuid('power_rank_id').references(() => power_ranks.id),
  combat_power: integer('combat_power'),
  note: text('note').notNull().default(''),
  recorded_at: timestamp('recorded_at').defaultNow(),
});

// ==================== 势力系统 ====================

export const factions = pgTable('factions', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  power_level: integer('power_level').notNull().default(1),
  territory: jsonb('territory').notNull().default([]),   // location_node id 列表
  member_ids: jsonb('member_ids').notNull().default([]), // character id 列表
  lore_id: uuid('lore_id'),  // 关联原有 Lore 条目（向后兼容）
  universe_id: uuid('universe_id'),  // IP 宇宙预留
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const faction_relations = pgTable('faction_relations', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  from_faction_id: uuid('from_faction_id').notNull().references(() => factions.id, { onDelete: 'cascade' }),
  to_faction_id: uuid('to_faction_id').notNull().references(() => factions.id, { onDelete: 'cascade' }),
  relation_type: text('relation_type').notNull().default('neutral'), // ally | enemy | vassal | neutral | custom
  relation_label: text('relation_label').notNull().default(''),
  strength: integer('strength').notNull().default(3), // 1-5
});

// ==================== AI 角色聊天记录 ====================

export const character_chat_sessions = pgTable('character_chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  character_id: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  messages: jsonb('messages').notNull().default([]), // [{role, content, timestamp}]
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// ==================== IP 宇宙预留字段（projects / characters / lore_entries 修改）====================
// 在现有表上运行 migration 添加 universe_id 字段：
// ALTER TABLE projects ADD COLUMN universe_id UUID;
// ALTER TABLE characters ADD COLUMN universe_id UUID;
// ALTER TABLE lore_entries ADD COLUMN universe_id UUID;
// ALTER TABLE factions ADD COLUMN universe_id UUID;

// ==================== Character 扩展字段（migration）====================
// ALTER TABLE characters ADD COLUMN power_rank_id UUID REFERENCES power_ranks(id);
// ALTER TABLE characters ADD COLUMN combat_power INTEGER DEFAULT 0;
// ALTER TABLE characters ADD COLUMN power_tags JSONB DEFAULT '[]';
```

---

## 十一、新增 API 路由

```
# Story Bible
GET    /api/projects/:id/bible
PUT    /api/projects/:id/bible          # 整体保存（upsert）

# 世界规则引擎
GET    /api/projects/:id/world-rules
POST   /api/projects/:id/world-rules
PATCH  /api/world-rules/:ruleId
DELETE /api/world-rules/:ruleId

# 伏笔管理
GET    /api/projects/:id/foreshadows
POST   /api/projects/:id/foreshadows
PATCH  /api/foreshadows/:id
DELETE /api/foreshadows/:id
POST   /api/projects/:id/foreshadows/check-overdue   # 检查超时未回收的伏笔

# 战力系统
GET    /api/projects/:id/power-ranks
POST   /api/projects/:id/power-ranks
PATCH  /api/power-ranks/:id
DELETE /api/power-ranks/:id
GET    /api/characters/:charId/power-history
POST   /api/characters/:charId/power-history

# 势力系统
GET    /api/projects/:id/factions
POST   /api/projects/:id/factions
PATCH  /api/factions/:id
DELETE /api/factions/:id
GET    /api/projects/:id/faction-relations
POST   /api/projects/:id/faction-relations
PATCH  /api/faction-relations/:id
DELETE /api/faction-relations/:id

# AI 新增任务
POST   /api/ai/review                  # AI 审稿人
POST   /api/ai/chat-as-character       # AI 角色聊天
POST   /api/ai/simulate-readers        # AI 模拟读者（Phase 3）
POST   /api/ai/sandbox-simulate        # 剧情沙盘（Phase 3）
POST   /api/ai/check-world-rules       # 世界规则合规检查
POST   /api/ai/check-power-consistency # 战力一致性检查

# 高级分析（纯数据库查询，零 AI）
GET    /api/projects/:id/analytics/characters    # 人物统计
GET    /api/projects/:id/analytics/locations     # 地点统计
GET    /api/projects/:id/analytics/plot-types    # 情节类型占比
GET    /api/projects/:id/analytics/pacing        # 情节节奏热力图数据
```

---

## 十二、AI Gateway 新增任务类型

```typescript
// 追加到 AITask 联合类型：

export type AITask =
  // ... 原有任务 ...
  | {
      type: 'REVIEW_AS_EDITOR';
      mode: 'webnovel_editor' | 'novel_editor' | 'screenwriter' | 'reader';
      // 省 token：只传摘要链，不传全文
      node_summaries: string[];       // 章节摘要链
      bible_summary: string;          // Story Bible 压缩摘要
      scope: 'single' | 'multi' | 'full';
    }
  | {
      type: 'CHAT_AS_CHARACTER';
      character: Character;           // 完整 Character Sheet
      lore_snippets: LoreEntry[];     // 相关 Lore 条目
      bible_summary: string;
      history: { role: string; content: string }[]; // 最近 6 条对话
      user_message: string;
    }
  | {
      type: 'CHECK_WORLD_RULES';
      text: string;                   // 待检查的生成内容
      rules: WorldRule[];             // 相关规则（按 priority 排序，最多 10 条）
    }
  | {
      type: 'CHECK_POWER_CONSISTENCY';
      character: Character;
      power_history: { rank: string; level: number; node_title: string }[];
      current_node_summary: string;
    }
  | {
      type: 'SIMULATE_READERS';       // Phase 3
      reader_types: string[];
      node_summaries: string[];
      bible_summary: string;
    }
  | {
      type: 'SANDBOX_SIMULATE';       // Phase 3
      hypothesis: string;             // "如果主角闭关三个月"
      current_state: {
        nodes: { title: string; summary: string }[];
        characters: { name: string; bio_compressed: string }[];
        factions: { name: string; power_level: number }[];
      };
    };

// buildContext 新增分支：

case 'REVIEW_AS_EDITOR': {
  const modePrompts = {
    webnovel_editor: '你是一位起点网文编辑，关注爽点密度、留存率和付费转化节点。',
    novel_editor: '你是一位文学编辑，关注人物塑造、剧情节奏和结构合理性。',
    screenwriter: '你是一位编剧，关注戏剧冲突、转折和高潮设计。',
    reader: '你是一位普通读者，关注代入感、沉浸感和阅读体验。',
  };
  return `${modePrompts[task.mode]}\n\n[创作圣经摘要]\n${task.bible_summary}\n\n[章节摘要]\n${task.node_summaries.join('\n')}\n\n[任务] 以 JSON 格式输出审稿意见：{"strengths":[...],"weaknesses":[...],"improvement":[...]}`;
}

case 'CHAT_AS_CHARACTER': {
  const voiceSamples = task.character.voice_samples.join(' / ');
  return `你现在扮演角色"${task.character.name}"，必须完全以该角色的视角和语气回复，不得跳出角色。\n\n[角色设定]\n${task.character.bio}\n\n[语气参考]\n${voiceSamples}\n\n[相关世界观]\n${task.lore_snippets.map(l => l.description).join('\n')}\n\n[对话历史]\n${task.history.map(h => `${h.role}: ${h.content}`).join('\n')}\n\n用户说：${task.user_message}`;
}

case 'CHECK_WORLD_RULES': {
  const rulesText = task.rules.map(r => `- 若${r.condition}，则${r.result}`).join('\n');
  return `[世界规则]\n${rulesText}\n\n[待检查内容]\n${task.text}\n\n[任务] 检查内容是否违反以上规则，输出 JSON：{"violations":[{"rule":"...","issue":"..."}],"passed":true/false}`;
}
```

---

## 十三、EventBus 新增联动事件

```typescript
// 追加到 StoryVerseEvent 联合类型：

| { type: 'FORESHADOW_PLANTED'; payload: { foreshadowId: string; nodeId: string } }
| { type: 'FORESHADOW_REVEALED'; payload: { foreshadowId: string; nodeId: string } }
| { type: 'CHARACTER_POWER_UPDATED'; payload: { characterId: string; newRankId: string } }
| { type: 'FACTION_MEMBER_CHANGED'; payload: { factionId: string; characterId: string; action: 'join' | 'leave' } }
| { type: 'BIBLE_UPDATED'; payload: { projectId: string } }

// 新增联动 handlers（纯逻辑，无 AI）：

// 伏笔状态变更 → 时间轴标记更新
bus.on('FORESHADOW_PLANTED', ({ foreshadowId, nodeId }) => {
  useTimelineStore.getState().addForeshadowMarker(nodeId, foreshadowId, 'planted');
});

bus.on('FORESHADOW_REVEALED', ({ foreshadowId, nodeId }) => {
  useTimelineStore.getState().addForeshadowMarker(nodeId, foreshadowId, 'revealed');
  useForeshadowStore.getState().markRevealed(foreshadowId, nodeId);
});

// 角色战力更新 → 战力成长记录自动创建
bus.on('CHARACTER_POWER_UPDATED', ({ characterId, newRankId }) => {
  useCharacterStore.getState().appendPowerHistory(characterId, newRankId);
});

// 势力成员变更 → 人物关系图刷新
bus.on('FACTION_MEMBER_CHANGED', ({ factionId, characterId, action }) => {
  useRelationStore.getState().refreshFactionMembership(factionId, characterId, action);
});

// Story Bible 更新 → 清除 AI prompt hash 缓存，强制下次重新注入
bus.on('BIBLE_UPDATED', ({ projectId }) => {
  useAIStore.getState().invalidateBibleCache(projectId);
});
```

---

## 十四、省 Token 规则（新模块补充）

| 新模块 | 省 Token 策略 |
|--------|--------------|
| Story Bible 注入 | 维护 `summary_compressed` 字段（~150 token），hash 缓存 24h |
| 世界规则检查 | 按节点关联的角色/Lore 筛选相关规则，最多注入 10 条，不全量注入 |
| 伏笔超时检测 | 只传伏笔列表（title + status + absent_chapters），不传正文 |
| AI 审稿人 | 只传章节摘要链 + Bible 摘要，不传正文，用户手动选范围 |
| AI 角色聊天 | Character Sheet + 最近 6 条对话历史，不传故事正文 |
| 战力一致性检查 | 只传战力成长历史数组 + 当前节点摘要，不传正文 |
| 高级分析中心 | 全部数据库聚合查询，**零 AI 消耗** |

---

## 十五、更新后 Phase 1 开发顺序

按此顺序实现，每步完成后再进入下一步：

1. **Docker 环境搭建**：所有 Dockerfile、docker-compose.yml、Makefile
2. **数据库 Schema**：全部 Drizzle 表 + universe_id 预留字段 migration
3. **认证系统**：注册/登录/JWT/用户 AI 配置
4. **项目 CRUD + 成员管理**
5. **EventBus**：事件总线 + 所有核心联动 handlers（含新模块事件）
6. **故事线画布**：Konva.js，节点增删改，连线
7. **时间轴视图**：横向时间线，伏笔标记层
8. **人物关系图 + Character Sheet**：含战力字段预留
9. **世界圈 + 地图 + Lore 系统**
10. **Story Bible**：项目级创作圣经编辑器（富文本）
11. **世界规则引擎**：规则条目 CRUD + AI 注入
12. **伏笔管理系统**：升级线索库，含超时预警
13. **正文编辑器**：Tiptap + 风格锁定 + Story Bible 联动
14. **灵感速记**：快捷键呼出 + 关联
15. **素材库 + 剪裁工作台**
16. **AI Gateway**：全部任务 + 省 token 上下文构建（含 Bible/Rules 注入）
17. **命令面板 + 快捷键**
18. **项目仪表盘 + 写作统计 + 伏笔预警**
19. **导出 MD + 小说正文**

---

# ── v3.0 新增技术规格 ──

## 十、新增数据库表（Drizzle ORM）

```typescript
// 追加到 apps/api/src/db/schema.ts

// ==================== Story Bible ====================
export const story_bible = pgTable('story_bible', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }).unique(),
  world_rules: text('world_rules').notNull().default(''),
  writing_style: text('writing_style').notNull().default(''),
  prohibited_content: text('prohibited_content').notNull().default(''),
  character_rules: text('character_rules').notNull().default(''),
  plot_goals: text('plot_goals').notNull().default(''),
  ending_direction: text('ending_direction').notNull().default(''),
  // 压缩摘要，AI 调用时使用，~150 token
  compressed_summary: text('compressed_summary').notNull().default(''),
  compressed_hash: text('compressed_hash').notNull().default(''),
  updated_at: timestamp('updated_at').defaultNow(),
});

// ==================== 伏笔系统（升级线索库）====================
export const foreshadows = pgTable('foreshadows', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  planted_node_id: uuid('planted_node_id').references(() => story_nodes.id),
  reveal_node_id: uuid('reveal_node_id').references(() => story_nodes.id),
  planted_chapter: integer('planted_chapter'),   // 埋设章节号，用于超时预警
  status: text('status').notNull().default('planned'), // planned | planted | revealed
  importance: text('importance').notNull().default('medium'), // low | medium | high
  last_appeared_chapter: integer('last_appeared_chapter'), // 最后出现章节，用于超时检测
  created_at: timestamp('created_at').defaultNow(),
});

// ==================== 世界规则引擎 ====================
export const world_rules = pgTable('world_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  condition: text('condition').notNull(),
  result: text('result').notNull(),
  category: text('category').notNull().default('ability'), // ability | geography | society | time
  priority: integer('priority').notNull().default(1),
  enabled: boolean('enabled').notNull().default(true),
  created_at: timestamp('created_at').defaultNow(),
});

// ==================== 战力系统 ====================
export const power_ranks = pgTable('power_ranks', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),          // 如"金丹期"
  level: integer('level').notNull(),     // 等级序号，数字越大越强
  description: text('description').notNull().default(''),
  created_at: timestamp('created_at').defaultNow(),
});

export const character_power_history = pgTable('character_power_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  character_id: uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  node_id: uuid('node_id').references(() => story_nodes.id),
  power_rank_id: uuid('power_rank_id').references(() => power_ranks.id),
  combat_power: integer('combat_power'),
  note: text('note').notNull().default(''),
  recorded_at: timestamp('recorded_at').defaultNow(),
});

// ==================== 势力系统 ====================
export const factions = pgTable('factions', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  universe_id: uuid('universe_id'),      // Phase 4 IP宇宙预留
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  power_level: integer('power_level').notNull().default(1),
  territory: jsonb('territory').notNull().default([]),    // location_node id 列表
  member_ids: jsonb('member_ids').notNull().default([]),  // character id 列表
  created_at: timestamp('created_at').defaultNow(),
});

export const faction_relations = pgTable('faction_relations', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  from_faction_id: uuid('from_faction_id').notNull().references(() => factions.id, { onDelete: 'cascade' }),
  to_faction_id: uuid('to_faction_id').notNull().references(() => factions.id, { onDelete: 'cascade' }),
  relation_type: text('relation_type').notNull().default('neutral'), // ally | enemy | vassal | neutral
  relation_label: text('relation_label').notNull().default(''),
  strength: integer('strength').notNull().default(3),
});

export const faction_history = pgTable('faction_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  faction_id: uuid('faction_id').notNull().references(() => factions.id, { onDelete: 'cascade' }),
  node_id: uuid('node_id').references(() => story_nodes.id),
  event_description: text('event_description').notNull(),
  recorded_at: timestamp('recorded_at').defaultNow(),
});

// ==================== IP 宇宙系统（预留表）Phase 4 ====================
export const universes = pgTable('universes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  owner_id: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow(),
});
```

### 现有表字段扩展

```typescript
// characters 表追加字段（通过 migration 新增列）:
// power_rank_id    uuid references power_ranks(id)
// combat_power     integer default 0
// power_tags       jsonb default '[]'
// faction_id       uuid references factions(id)
// universe_id      uuid  （Phase 4 预留）

// projects 表追加字段:
// universe_id      uuid references universes(id)  （Phase 4 预留，nullable）

// lore_entries 表追加字段:
// universe_id      uuid  （Phase 4 预留）
```

---

## 十一、新增类型定义（shared-types）

```typescript
// 追加到 packages/shared-types/src/index.ts

// ==================== Story Bible ====================
export interface StoryBible {
  id: string;
  project_id: string;
  world_rules: string;
  writing_style: string;
  prohibited_content: string;
  character_rules: string;
  plot_goals: string;
  ending_direction: string;
  compressed_summary: string;   // AI 调用时注入，~150 token
  compressed_hash: string;      // 缓存用
  updated_at: string;
}

// ==================== 伏笔 ====================
export interface Foreshadow {
  id: string;
  project_id: string;
  title: string;
  description: string;
  planted_node_id: string | null;
  reveal_node_id: string | null;
  planted_chapter: number | null;
  status: 'planned' | 'planted' | 'revealed';
  importance: 'low' | 'medium' | 'high';
  last_appeared_chapter: number | null;
  created_at: string;
}

// ==================== 世界规则 ====================
export interface WorldRule {
  id: string;
  project_id: string;
  condition: string;
  result: string;
  category: 'ability' | 'geography' | 'society' | 'time';
  priority: number;
  enabled: boolean;
  created_at: string;
}

// ==================== 战力系统 ====================
export interface PowerRank {
  id: string;
  project_id: string;
  name: string;
  level: number;
  description: string;
  created_at: string;
}

export interface CharacterPowerHistory {
  id: string;
  character_id: string;
  node_id: string | null;
  power_rank_id: string | null;
  combat_power: number | null;
  note: string;
  recorded_at: string;
}

// ==================== 势力系统 ====================
export interface Faction {
  id: string;
  project_id: string;
  universe_id: string | null;
  name: string;
  description: string;
  power_level: number;
  territory: string[];
  member_ids: string[];
  created_at: string;
}

export interface FactionRelation {
  id: string;
  project_id: string;
  from_faction_id: string;
  to_faction_id: string;
  relation_type: 'ally' | 'enemy' | 'vassal' | 'neutral';
  relation_label: string;
  strength: number;
}

// ==================== AI 审稿输出 ====================
export interface ReviewResult {
  mode: 'webnovel_editor' | 'novel_editor' | 'screenwriter' | 'reader';
  strengths: string[];
  weaknesses: string[];
  improvement: string[];
}

// ==================== 剧情沙盘 ====================
export interface SandboxResult {
  hypothesis: string;
  outcomes: Array<{
    probability: 'high' | 'medium' | 'low';
    description: string;
    affected_characters: string[];
    affected_factions: string[];
  }>;
}
```

---

## 十二、新增 API 路由

```
# Story Bible
GET    /api/projects/:id/bible           # 获取创作圣经
PUT    /api/projects/:id/bible           # 创建或更新（upsert）
POST   /api/projects/:id/bible/compress  # 触发 AI 压缩摘要

# 伏笔系统
GET    /api/projects/:id/foreshadows
POST   /api/projects/:id/foreshadows
PATCH  /api/foreshadows/:id
DELETE /api/foreshadows/:id
GET    /api/projects/:id/foreshadows/overdue   # 超时未回收的高重要度伏笔

# 世界规则引擎
GET    /api/projects/:id/world-rules
POST   /api/projects/:id/world-rules
PATCH  /api/world-rules/:id
DELETE /api/world-rules/:id

# 战力系统
GET    /api/projects/:id/power-ranks
POST   /api/projects/:id/power-ranks
PATCH  /api/power-ranks/:id
DELETE /api/power-ranks/:id
GET    /api/characters/:id/power-history
POST   /api/characters/:id/power-history

# 势力系统
GET    /api/projects/:id/factions
POST   /api/projects/:id/factions
PATCH  /api/factions/:id
DELETE /api/factions/:id
GET    /api/projects/:id/faction-relations
POST   /api/projects/:id/faction-relations
PATCH  /api/faction-relations/:id
DELETE /api/faction-relations/:id
GET    /api/factions/:id/history

# AI 新增任务
POST   /api/ai/review                    # AI 审稿人
POST   /api/ai/chat-as-character         # AI 角色聊天
POST   /api/ai/check-world-rules         # 世界规则检查
POST   /api/ai/simulate-reader           # 模拟读者（Phase 3）
POST   /api/ai/sandbox-simulate          # 剧情沙盘（Phase 3）
POST   /api/ai/check-power-consistency   # 战力一致性检查
POST   /api/ai/predict-faction           # 势力走向预测

# 分析中心（纯数据库聚合，零 AI）
GET    /api/projects/:id/analytics/characters   # 人物出场统计
GET    /api/projects/:id/analytics/locations    # 地点使用统计
GET    /api/projects/:id/analytics/plot-types   # 情节类型分布
GET    /api/projects/:id/analytics/rhythm       # 节奏热力图数据

# IP 宇宙（Phase 4 预留，返回 501）
GET    /api/universes
POST   /api/universes
GET    /api/universes/:id/projects
```

---

## 十三、AI Gateway 新增任务类型

```typescript
// 追加到 apps/api/src/ai/gateway.ts

export type AITask =
  // ... 原有任务类型 ...
  | { type: 'REVIEW'; chapters: StoryNode[]; mode: ReviewMode; bible: StoryBible }
  | { type: 'CHAT_AS_CHARACTER'; character: Character; lore: LoreEntry[]; bible: StoryBible; history: ChatMessage[] }
  | { type: 'CHECK_WORLD_RULES'; node: StoryNode; rules: WorldRule[]; generated_text: string }
  | { type: 'CHECK_POWER_CONSISTENCY'; character: Character; power_history: CharacterPowerHistory[]; power_ranks: PowerRank[] }
  | { type: 'SIMULATE_READER'; chapters: StoryNode[]; reader_type: ReaderType }
  | { type: 'SANDBOX_SIMULATE'; hypothesis: string; current_nodes: StoryNode[]; characters: Character[]; factions: Faction[] }
  | { type: 'PREDICT_FACTION'; factions: Faction[]; current_nodes: StoryNode[] }
  | { type: 'COMPRESS_BIBLE'; bible: StoryBible };

export type ReviewMode = 'webnovel_editor' | 'novel_editor' | 'screenwriter' | 'reader';
export type ReaderType = 'qidian' | 'jjwxc' | 'light_novel' | 'female' | 'male' | 'teen' | 'mature';

// Story Bible 注入到所有生成任务的 buildContext 中
function injectBible(bible: StoryBible): string {
  // 使用压缩摘要，约 150 token，hash 缓存 24 小时
  if (!bible.compressed_summary) return '';
  return `[创作圣经]\n${bible.compressed_summary}\n\n`;
}

// 世界规则筛选注入（只注入与当前节点相关的规则）
function injectRelevantRules(rules: WorldRule[], node: StoryNode, characters: Character[]): string {
  // 根据节点关联的角色能力标签和地点，过滤相关规则
  const relevant = rules.filter(r => r.enabled && isRuleRelevant(r, node, characters));
  if (relevant.length === 0) return '';
  return `[世界规则]\n${relevant.map(r => `- 若${r.condition}，则${r.result}`).join('\n')}\n\n`;
}

// 完整生成正文上下文（含新增字段）
export function buildGenerateTextContext(
  task: Extract<AITask, { type: 'GENERATE_TEXT' }>,
  project: ProjectContext
): string {
  const bible = project.bible ? injectBible(project.bible) : '';
  const rules = project.world_rules ? injectRelevantRules(project.world_rules, task.node, project.characters) : '';
  const charSummaries = task.node.character_ids
    .map(id => project.characters.find(c => c.id === id)?.bio_compressed ?? '')
    .filter(Boolean).join('\n');
  const loreSummaries = task.node.lore_ids
    .map(id => project.lore.find(l => l.id === id))
    .filter(Boolean)
    .map(l => `[${l!.name}] ${l!.description}`)
    .join('\n');
  const prevSummaries = task.prev_nodes.slice(-2).map(n => `- ${n.summary}`).join('\n');
  const stylePrompt = project.style_samples?.length
    ? `[参考文体]\n${project.style_samples.join('\n---\n')}\n\n`
    : '';

  // 总计约 ~1100 token（含 Story Bible）
  return [
    bible,
    rules,
    stylePrompt,
    `[角色设定]\n${charSummaries}`,
    `[相关世界观]\n${loreSummaries}`,
    `[前文摘要]\n${prevSummaries}`,
    `[当前情节]\n${task.node.description}`,
    `[后续方向]\n${task.next_node?.summary ?? ''}`,
    `[任务] 生成本情节正文约${task.length}字，严格遵守创作圣经和世界规则。`,
  ].filter(Boolean).join('\n\n');
}
```

---

## 十四、伏笔超时预警逻辑

```typescript
// apps/api/src/services/foreshadowAlert.ts
// 在仪表盘数据接口中调用，纯数据库查询，零 AI

export async function getOverdueForeshadows(projectId: string, db: DB) {
  // 获取项目当前最大章节号
  const maxChapter = await db
    .select({ max: sql<number>`MAX(chapter_index)` })
    .from(story_nodes)
    .where(eq(story_nodes.project_id, projectId))
    .then(r => r[0]?.max ?? 0);

  // 高重要度：超过 20 章未出现；中重要度：超过 40 章未出现
  const overdue = await db
    .select()
    .from(foreshadows)
    .where(
      and(
        eq(foreshadows.project_id, projectId),
        eq(foreshadows.status, 'planted'),
        or(
          and(
            eq(foreshadows.importance, 'high'),
            lt(foreshadows.last_appeared_chapter, maxChapter - 20)
          ),
          and(
            eq(foreshadows.importance, 'medium'),
            lt(foreshadows.last_appeared_chapter, maxChapter - 40)
          )
        )
      )
    );

  return overdue;
}
```

---

## 十五、开发优先级更新（Phase 1 完整列表）

按此顺序实现，每步完成后再进入下一步：

1. **Docker 环境搭建**：docker-compose.yml、所有 Dockerfile、Makefile、.env.example
2. **数据库 Schema**：全部 Drizzle 表（含 v3.0 新增表），执行 migrate
3. **认证系统**：注册/登录/JWT，用户 AI 配置 CRUD
4. **项目 CRUD + 成员管理**
5. **EventBus**：事件总线 + 所有核心联动 handlers
6. **Story Bible**：创作圣经 CRUD + AI 压缩摘要
7. **世界规则引擎（轻量版）**：规则 CRUD + AI 生成前注入
8. **故事线画布**：Konva.js，节点增删改，连线，支持拖拽
9. **时间轴视图**：横向时间线，节点拖拽排序
10. **人物关系图 + Character Sheet**：ReactFlow + 详细角色设定（含战力字段预留）
11. **世界圈 + 地图 + Lore 系统**
12. **伏笔管理系统**：替换线索库，含超时预警逻辑
13. **正文编辑器**：Tiptap + 章节管理 + 风格锁定 + 与画布联动
14. **灵感速记**：快捷键呼出 + 状态管理 + 关联
15. **素材库 + 剪裁工作台**：上传、框选、抠图
16. **AI Gateway**：所有 AI 任务 + Story Bible/WorldRule 注入 + 省 token 上下文构建
17. **命令面板 + 快捷键**：cmdk + 全局快捷键注册
18. **项目仪表盘 + 写作统计 + 伏笔预警**
19. **导出 MD + 小说正文**
