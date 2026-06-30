import { z } from 'zod';

const id = z.uuid();
const timestamps = {
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
};

export const chapterSchema = z.object({
  id,
  projectId: id,
  storyNodeId: id,
  chapterNumber: z.number().int().positive(),
  title: z.string(),
  content: z.string(),
  summary: z.string(),
  source: z.enum(['human', 'ai', 'mixed']),
  wordCount: z.number().int().min(0),
  targetWordCount: z.number().int().positive().nullable(),
  revision: z.number().int().positive(),
  ...timestamps,
});
export const chapterMetaSchema = z.object({
  chapterNumber: z.number().int().positive(),
  hasContent: z.boolean(),
  isKeyScene: z.boolean(),
  nodeId: id,
  source: z.enum(['human', 'ai', 'mixed']),
  status: z.enum(['planned', 'drafting', 'completed']),
  storyTimeLabel: z.string(),
  targetWordCount: z.number().int().positive().nullable(),
  title: z.string(),
  wordCount: z.number().int().min(0),
});
export const saveChapterSchema = z.object({
  chapterNumber: z.number().int().positive(),
  title: z.string().trim().min(1).max(160),
  content: z.string().max(2_000_000),
  summary: z.string().max(20_000).optional(),
  targetWordCount: z.number().int().positive().nullable().optional(),
});

export const foreshadowSchema = z.object({
  id,
  projectId: id,
  title: z.string(),
  description: z.string(),
  plantedNodeId: id.nullable(),
  revealNodeId: id.nullable(),
  status: z.enum(['planned', 'planted', 'revealed']),
  importance: z.enum(['low', 'medium', 'high']),
  lastAppearedChapter: z.number().int().positive().nullable(),
  ...timestamps,
});
export const createForeshadowSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(20_000).optional(),
  plantedNodeId: id.nullable().optional(),
  revealNodeId: id.nullable().optional(),
  status: z.enum(['planned', 'planted', 'revealed']).optional(),
  importance: z.enum(['low', 'medium', 'high']).optional(),
  lastAppearedChapter: z.number().int().positive().nullable().optional(),
});
export const updateForeshadowSchema = createForeshadowSchema.partial();

export const inspirationSchema = z.object({
  id,
  projectId: id,
  content: z.string(),
  tags: z.array(z.string()),
  status: z.enum(['inbox', 'linked', 'archived']),
  linkedNodeId: id.nullable(),
  ...timestamps,
});
export const createInspirationSchema = z.object({
  content: z.string().trim().min(1).max(20_000),
  tags: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  status: z.enum(['inbox', 'linked', 'archived']).optional(),
  linkedNodeId: id.nullable().optional(),
});
export const updateInspirationSchema = createInspirationSchema.partial();

export const projectStatsSchema = z.object({
  chapterCount: z.number().int().min(0),
  inspirationInboxCount: z.number().int().min(0),
  nodeCount: z.number().int().min(0),
  overdueForeshadowCount: z.number().int().min(0),
  totalWordCount: z.number().int().min(0),
});
export const directorDashboardSchema = z.object({
  aiQueuePending: z.number().int().min(0),
  assets: z.object({
    byKind: z.record(z.string(), z.number().int().min(0)),
    total: z.number().int().min(0),
  }),
  characters: z.array(
    z.object({
      hasVoice: z.boolean(),
      id,
      name: z.string(),
    }),
  ),
  foreshadows: z.object({
    overdue: z.array(
      z.object({
        id,
        importance: z.string(),
        title: z.string(),
      }),
    ),
    revealed: z.number().int().min(0),
    total: z.number().int().min(0),
  }),
  recentGenerations: z.array(
    z.object({
      createdAt: z.iso.datetime(),
      id,
      status: z.string(),
      taskType: z.string(),
    }),
  ),
  storyboardShotCount: z.number().int().min(0),
  story: z.object({
    chapterCount: z.number().int().min(0),
    completedNodes: z.number().int().min(0),
    targetNodes: z.number().int().min(0),
    totalWordCount: z.number().int().min(0),
  }),
});
export const exportFormatSchema = z.enum(['master-md', 'novel-md', 'novel-txt']);
export const exportParamsSchema = z.object({
  projectId: id,
  format: exportFormatSchema,
});
export const exportDocumentSchema = z.object({
  content: z.string(),
  contentType: z.string(),
  fileName: z.string(),
});
export const projectSnapshotSchema = z.object({
  id,
  projectId: id,
  label: z.string(),
  createdAt: z.iso.datetime(),
});
export const createSnapshotSchema = z.object({
  label: z.string().trim().min(1).max(160).optional(),
});

export type Chapter = z.infer<typeof chapterSchema>;
export type ChapterMeta = z.infer<typeof chapterMetaSchema>;
export type SaveChapterInput = z.infer<typeof saveChapterSchema>;
export type Foreshadow = z.infer<typeof foreshadowSchema>;
export type CreateForeshadowInput = z.infer<typeof createForeshadowSchema>;
export type UpdateForeshadowInput = z.infer<typeof updateForeshadowSchema>;
export type Inspiration = z.infer<typeof inspirationSchema>;
export type CreateInspirationInput = z.infer<typeof createInspirationSchema>;
export type UpdateInspirationInput = z.infer<typeof updateInspirationSchema>;
export type ProjectStats = z.infer<typeof projectStatsSchema>;
export type DirectorDashboard = z.infer<typeof directorDashboardSchema>;
export type ExportDocument = z.infer<typeof exportDocumentSchema>;
export type ProjectSnapshot = z.infer<typeof projectSnapshotSchema>;
