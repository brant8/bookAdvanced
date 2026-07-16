import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { and, asc, eq } from 'drizzle-orm';

import type {
  Asset,
  CharacterAbility,
  CreateCharacterAbilityInput,
  GenerateImageInput,
  Scene,
  Storyboard,
  StoryboardExportPlan,
  TtsDubbingPlan,
  UpsertSceneInput,
} from '@storyverse/contracts';

import type { Database } from '../../db/client.js';
import {
  aiProviders,
  assets,
  characterAbilities,
  characters,
  generationRuns,
  projects,
  scenes,
  storyboardShots,
  storyboards,
  storyNodes,
} from '../../db/schema.js';
import type { AiSettingsService } from '../ai-settings/ai-settings.service.js';
import { decryptSecret } from '../ai-settings/secret-box.js';
import type { TextGenerationProvider } from '../ai/ai.provider.js';
import { fetchWithRetry } from '../ai/provider-http.js';
import { generateStructured } from '../ai/structured-generation.js';
import { CreativeResourceNotFoundError } from '../creative/creative.service.js';

export class VisualService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
    private readonly settings?: AiSettingsService,
    private readonly textProvider?: TextGenerationProvider,
    private readonly uploadDir = process.env.STORYVERSE_UPLOAD_DIR ??
      path.resolve('data', 'uploads'),
  ) {}

  async getScene(nodeId: string): Promise<Scene | null> {
    await this.ownedNode(nodeId);
    const [row] = await this.db
      .select()
      .from(scenes)
      .where(eq(scenes.storyNodeId, nodeId))
      .limit(1);
    return row ? dto(row) : null;
  }

  async upsertScene(nodeId: string, input: UpsertSceneInput): Promise<Scene> {
    const node = await this.ownedNode(nodeId);
    const [row] = await this.db
      .insert(scenes)
      .values({ ...input, projectId: node.projectId, storyNodeId: nodeId })
      .onConflictDoUpdate({
        target: scenes.storyNodeId,
        set: { ...input, updatedAt: new Date() },
      })
      .returning();
    return dto(required(row));
  }

  async listAbilities(projectId: string): Promise<CharacterAbility[]> {
    await this.assertProject(projectId);
    return dto(
      await this.db
        .select()
        .from(characterAbilities)
        .where(eq(characterAbilities.projectId, projectId))
        .orderBy(asc(characterAbilities.name)),
    );
  }

  async createAbility(
    projectId: string,
    input: CreateCharacterAbilityInput,
  ): Promise<CharacterAbility> {
    await this.assertProject(projectId);
    const [character] = await this.db
      .select()
      .from(characters)
      .where(and(eq(characters.id, input.characterId), eq(characters.projectId, projectId)))
      .limit(1);
    if (!character) throw new CreativeResourceNotFoundError();
    const [row] = await this.db
      .insert(characterAbilities)
      .values({ ...input, projectId })
      .returning();
    return dto(required(row));
  }

  async listAssets(projectId: string): Promise<Asset[]> {
    await this.assertProject(projectId);
    const rows = await this.db
      .select()
      .from(assets)
      .where(eq(assets.projectId, projectId))
      .orderBy(asc(assets.createdAt));
    return rows.map(assetDto);
  }

  async upload(
    projectId: string,
    file: File,
    metadata: {
      abilityId?: string;
      characterId?: string;
      kind: Asset['kind'];
      name: string;
      storyNodeId?: string;
    },
  ): Promise<Asset> {
    await this.assertProject(projectId);
    await this.assertAbility(projectId, metadata.abilityId);
    await mkdir(this.uploadDir, { recursive: true });
    const extension = safeExtension(file.name, file.type);
    const fileName = `${randomUUID()}${extension}`;
    const storagePath = path.join(this.uploadDir, fileName);
    await writeFile(storagePath, Buffer.from(await file.arrayBuffer()));
    const [row] = await this.db
      .insert(assets)
      .values({
        ...metadata,
        fileName,
        mimeType: file.type || 'application/octet-stream',
        projectId,
        source: 'upload',
        storagePath,
      })
      .returning();
    return assetDto(required(row));
  }

  async generateImage(projectId: string, input: GenerateImageInput): Promise<Asset> {
    await this.assertProject(projectId);
    await this.assertAbility(projectId, input.abilityId ?? undefined);
    const [provider] = await this.db
      .select()
      .from(aiProviders)
      .where(
        and(
          eq(aiProviders.id, input.providerId),
          eq(aiProviders.ownerId, this.ownerId),
          eq(aiProviders.kind, 'image'),
        ),
      )
      .limit(1);
    if (!provider) throw new CreativeResourceNotFoundError();
    const [run] = await this.db
      .insert(generationRuns)
      .values({
        input: { kind: input.kind, prompt: input.prompt, size: input.size },
        ownerId: this.ownerId,
        projectId,
        providerId: input.providerId,
        startedAt: new Date(),
        status: 'running',
        taskType: 'image.generate',
      })
      .returning({ id: generationRuns.id });
    try {
      const baseUrl = provider.baseUrl.replace(/\/+$/, '');
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (provider.encryptedApiKey) {
        headers.authorization = `Bearer ${decryptSecret(provider.encryptedApiKey)}`;
      }
      const isOpenRouter = provider.protocol === 'openrouter-images';
      const response = await fetchWithRetry(
        `${baseUrl}${isOpenRouter ? '/images' : '/images/generations'}`,
        {
          body: JSON.stringify({
            model: provider.defaultModel,
            n: 1,
            prompt: input.prompt,
            ...(isOpenRouter ? {} : { response_format: 'b64_json' }),
            size: input.size,
          }),
          headers,
          method: 'POST',
          signal: AbortSignal.timeout(300_000),
        },
      );
      if (!response.ok) throw new Error(`Image Provider returned ${response.status}.`);
      const payload = (await response.json()) as {
        data?: { b64_json?: string; url?: string }[];
      };
      const first = payload.data?.[0];
      let bytes: Buffer;
      let mimeType = 'image/png';
      if (first?.b64_json) {
        bytes = Buffer.from(first.b64_json, 'base64');
      } else if (first?.url) {
        const image = await fetchWithRetry(first.url, {
          signal: AbortSignal.timeout(120_000),
        });
        if (!image.ok) throw new Error('Could not download generated image.');
        mimeType = image.headers.get('content-type') ?? mimeType;
        bytes = Buffer.from(await image.arrayBuffer());
      } else {
        throw new Error('Image Provider did not return image data.');
      }
      await mkdir(this.uploadDir, { recursive: true });
      const fileName = `${randomUUID()}.${mimeType.includes('jpeg') ? 'jpg' : 'png'}`;
      const storagePath = path.join(this.uploadDir, fileName);
      await writeFile(storagePath, bytes);
      const [row] = await this.db
        .insert(assets)
        .values({
          characterId: input.characterId,
          abilityId: input.abilityId,
          fileName,
          kind: input.kind,
          mimeType,
          name: input.name,
          projectId,
          prompt: input.prompt,
          source: 'generated',
          storagePath,
          storyNodeId: input.storyNodeId,
        })
        .returning();
      const result = assetDto(required(row));
      if (run) {
        await this.db
          .update(generationRuns)
          .set({
            completedAt: new Date(),
            output: { assetId: result.id },
            status: 'completed',
            updatedAt: new Date(),
          })
          .where(eq(generationRuns.id, run.id));
      }
      return result;
    } catch (cause) {
      if (run) {
        await this.db
          .update(generationRuns)
          .set({
            completedAt: new Date(),
            error: cause instanceof Error ? cause.message : 'Image generation failed.',
            status: 'failed',
            updatedAt: new Date(),
          })
          .where(eq(generationRuns.id, run.id));
      }
      throw cause;
    }
  }

  async deleteAsset(id: string) {
    const [row] = await this.db.select().from(assets).where(eq(assets.id, id)).limit(1);
    if (!row) throw new CreativeResourceNotFoundError();
    await this.assertProject(row.projectId);
    await this.db.delete(assets).where(eq(assets.id, id));
    await unlink(row.storagePath).catch(() => undefined);
  }

  async file(id: string) {
    const [row] = await this.db.select().from(assets).where(eq(assets.id, id)).limit(1);
    if (!row) throw new CreativeResourceNotFoundError();
    await this.assertProject(row.projectId);
    return { bytes: await readFile(row.storagePath), mimeType: row.mimeType };
  }

  async generateStoryboard(projectId: string, providerId?: string): Promise<Storyboard> {
    await this.assertProject(projectId);
    const nodes = await this.db
      .select()
      .from(storyNodes)
      .where(eq(storyNodes.projectId, projectId))
      .orderBy(asc(storyNodes.sortOrder));
    let shotDrafts: {
      durationMs: number;
      narration: string;
      sortOrder: number;
      storyNodeId: string | null;
      title: string;
      transition: string;
      visualPrompt: string;
    }[] = nodes.map((node, index) => ({
      durationMs: 3500,
      narration: node.summary || node.nodeGoal,
      sortOrder: index,
      storyNodeId: node.id,
      title: node.title,
      transition: index % 2 === 0 ? 'fade' : 'pan',
      visualPrompt: node.description || node.summary || node.title,
    }));
    if (providerId && this.settings && this.textProvider && nodes.length) {
      const config = await this.settings.providerConfig(providerId);
      const [run] = await this.db
        .insert(generationRuns)
        .values({
          input: { nodeCount: nodes.length },
          ownerId: this.ownerId,
          projectId,
          providerId,
          startedAt: new Date(),
          status: 'running',
          taskType: 'storyboard.generate',
        })
        .returning({ id: generationRuns.id });
      try {
        const generated = await generateStructured(
          this.textProvider,
          config,
          [
            '你是小说分镜导演。只输出 JSON 数组，不要 Markdown。',
            '每个镜头包含 title、narration、visualPrompt、durationMs、transition。',
            'transition 只能是 fade 或 pan，durationMs 在 2000 到 8000 之间。',
            JSON.stringify(
              nodes.map(({ id, title, summary, description }) => ({
                id,
                title,
                summary,
                description,
              })),
            ),
          ].join('\n\n'),
          parseShotDrafts,
        );
        shotDrafts = generated.map((shot, index) => ({
          ...shot,
          sortOrder: index,
          storyNodeId: nodes[index]?.id ?? null,
        }));
        if (run) {
          await this.db
            .update(generationRuns)
            .set({
              completedAt: new Date(),
              output: { shots: generated },
              status: 'completed',
              updatedAt: new Date(),
            })
            .where(eq(generationRuns.id, run.id));
        }
      } catch (cause) {
        if (run) {
          await this.db
            .update(generationRuns)
            .set({
              completedAt: new Date(),
              error: cause instanceof Error ? cause.message : 'Storyboard generation failed.',
              status: 'failed',
              updatedAt: new Date(),
            })
            .where(eq(generationRuns.id, run.id));
        }
        throw cause;
      }
    }
    const [board] = await this.db
      .insert(storyboards)
      .values({ projectId, status: 'ready', title: 'AI 故事分镜' })
      .onConflictDoUpdate({
        target: storyboards.projectId,
        set: { status: 'ready', updatedAt: new Date() },
      })
      .returning();
    const storyboard = required(board);
    await this.db.delete(storyboardShots).where(eq(storyboardShots.storyboardId, storyboard.id));
    if (nodes.length) {
      await this.db
        .insert(storyboardShots)
        .values(shotDrafts.map((shot) => ({ ...shot, storyboardId: storyboard.id })));
    }
    return this.getStoryboard(projectId) as Promise<Storyboard>;
  }

  async getStoryboard(projectId: string): Promise<Storyboard | null> {
    await this.assertProject(projectId);
    const [board] = await this.db
      .select()
      .from(storyboards)
      .where(eq(storyboards.projectId, projectId))
      .limit(1);
    if (!board) return null;
    const shots = await this.db
      .select()
      .from(storyboardShots)
      .where(eq(storyboardShots.storyboardId, board.id))
      .orderBy(asc(storyboardShots.sortOrder));
    return dto({ ...board, shots });
  }

  async getStoryboardExportPlan(projectId: string): Promise<StoryboardExportPlan | null> {
    const storyboard = await this.getStoryboard(projectId);
    if (!storyboard) return null;
    return buildStoryboardExportPlan(storyboard, await this.listAssets(projectId));
  }

  async getTtsDubbingPlan(projectId: string): Promise<TtsDubbingPlan> {
    await this.assertProject(projectId);
    const [storyboard, characterRows] = await Promise.all([
      this.getStoryboard(projectId),
      this.db
        .select()
        .from(characters)
        .where(eq(characters.projectId, projectId))
        .orderBy(asc(characters.name)),
    ]);
    return buildTtsDubbingPlan(projectId, storyboard, characterRows);
  }

  private async ownedNode(nodeId: string) {
    const [node] = await this.db
      .select()
      .from(storyNodes)
      .where(eq(storyNodes.id, nodeId))
      .limit(1);
    if (!node) throw new CreativeResourceNotFoundError();
    await this.assertProject(node.projectId);
    return node;
  }

  private async assertProject(projectId: string) {
    const [project] = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, this.ownerId)))
      .limit(1);
    if (!project) throw new CreativeResourceNotFoundError();
  }

  private async assertAbility(projectId: string, abilityId?: string) {
    if (!abilityId) return;
    const [ability] = await this.db
      .select({ id: characterAbilities.id })
      .from(characterAbilities)
      .where(and(eq(characterAbilities.id, abilityId), eq(characterAbilities.projectId, projectId)))
      .limit(1);
    if (!ability) throw new CreativeResourceNotFoundError();
  }
}

function assetDto(row: typeof assets.$inferSelect): Asset {
  return dto({ ...row, url: `/api/assets/${row.id}/file` });
}
function required<T>(value: T | undefined): T {
  if (!value) throw new CreativeResourceNotFoundError();
  return value;
}
function dto<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
function safeExtension(name: string, mimeType: string) {
  const extension = path.extname(name).toLowerCase();
  if (/^\.[a-z0-9]{1,8}$/.test(extension)) return extension;
  return mimeType.includes('jpeg') ? '.jpg' : mimeType.includes('png') ? '.png' : '.bin';
}

function parseShotDrafts(value: string) {
  const clean = value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const parsed: unknown = JSON.parse(clean);
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('AI storyboard is empty.');
  return parsed.map((item) => {
    const shot = item as Record<string, unknown>;
    return {
      durationMs: Math.max(2000, Math.min(8000, Number(shot.durationMs) || 3500)),
      narration: String(shot.narration ?? ''),
      title: String(shot.title ?? '未命名镜头'),
      transition: shot.transition === 'pan' ? 'pan' : 'fade',
      visualPrompt: String(shot.visualPrompt ?? ''),
    };
  });
}

export function buildStoryboardExportPlan(
  storyboard: Storyboard,
  assetList: Asset[],
): StoryboardExportPlan {
  const frameRate = 24;
  const shots = storyboard.shots.map((shot) => {
    const hasVisualAsset = Boolean(
      shot.assetId
        ? assetList.some((asset) => asset.id === shot.assetId)
        : assetList.some(
            (asset) => asset.storyNodeId === shot.storyNodeId && asset.kind === 'scene',
          ),
    );
    return {
      assetId: shot.assetId,
      durationMs: shot.durationMs,
      estimatedFrameCount: Math.ceil((shot.durationMs / 1000) * frameRate),
      hasVisualAsset,
      narration: shot.narration,
      shotId: shot.id,
      sortOrder: shot.sortOrder,
      storyNodeId: shot.storyNodeId,
      title: shot.title,
      visualPrompt: shot.visualPrompt,
    };
  });
  const totalDurationMs = shots.reduce((total, shot) => total + shot.durationMs, 0);
  const missingAssetCount = shots.filter((shot) => !shot.hasVisualAsset).length;
  return {
    audioMix: {
      boundaries: [
        'T-034 only defines narration, SFX and music lanes; no audio file is rendered yet.',
        'TTS provider selection, voice sample playback and audio asset storage belong to T-035.',
        'Final loudness normalization and muxing should run in the NAS Worker stage.',
      ],
      status: 'planned',
      tracks: ['narration', 'character-dialogue', 'sfx', 'music-bed'],
    },
    browserPreview: {
      available: true,
      notes: [
        'Uses the existing CSS paper-cut player and TimelineRail playhead.',
        'Safe for local preview because it does not invoke image, TTS or video providers.',
        missingAssetCount
          ? 'Some shots still fall back to visual prompts because bound scene assets are missing.'
          : 'Every shot has a visual asset candidate.',
      ],
      output: 'interactive-html-preview',
    },
    estimatedFrameCount: Math.ceil((totalDurationMs / 1000) * frameRate),
    frameRate,
    generatedAt: new Date().toISOString(),
    missingAssetCount,
    nasWorker: {
      queueName: 'storyboard-export',
      required: true,
      steps: [
        'Read storyboard export plan and resolve bound assets from local/NAS storage.',
        'Render image sequence from shot durations, transitions and paper-cut layers.',
        'Render or import narration/audio tracks after TTS provider is configured.',
        'Mux video and audio, write output to NAS export directory, then persist artifact metadata.',
      ],
      suggestedMounts: ['/data/uploads', '/data/exports', '/data/tmp/storyboard-render'],
    },
    projectId: storyboard.projectId,
    shots,
    storyboardId: storyboard.id,
    totalDurationMs,
    videoExport: {
      boundaries: [
        'No FFmpeg dependency is added to the web or API container in T-034.',
        'Browser preview is not treated as production video output.',
        'Actual MP4/WebM rendering should run as an optional NAS Worker capability.',
      ],
      codec: 'h264-or-vp9-worker-selected',
      container: 'mp4-or-webm',
      fps: frameRate,
      resolution: '1920x1080',
      status: missingAssetCount ? 'blocked' : 'planned',
    },
  };
}

export function buildTtsDubbingPlan(
  projectId: string,
  storyboard: Storyboard | null,
  characterRows: { id: string; name: string; voiceSamples: string[] }[],
): TtsDubbingPlan {
  const voiceReadiness = characterRows.map((character) => {
    const previewText =
      character.voiceSamples.find((sample) => sample.startsWith('样本：')) ??
      character.voiceSamples.find((sample) => sample.startsWith('sample:')) ??
      character.voiceSamples[0] ??
      `${character.name} 的声音样本尚未配置。`;
    return {
      characterId: character.id,
      hasVoiceSamples: character.voiceSamples.length > 0,
      name: character.name,
      previewText,
      sampleCount: character.voiceSamples.length,
      status: character.voiceSamples.length > 0 ? ('ready' as const) : ('needs-samples' as const),
    };
  });
  const defaultVoice = voiceReadiness.find((voice) => voice.status === 'ready')?.name ?? '旁白';
  const hasReadyVoice = voiceReadiness.some((voice) => voice.status === 'ready');
  const dubbingQueue = (storyboard?.shots ?? []).map((shot) => ({
    audioAssetId: null,
    durationMs: shot.durationMs,
    narration: shot.narration,
    preferredVoice: defaultVoice,
    shotId: shot.id,
    sortOrder: shot.sortOrder,
    status: hasReadyVoice ? ('ready' as const) : ('needs-voice' as const),
    title: shot.title,
  }));
  return {
    audioLibrary: {
      artifactTypes: ['narration-wav', 'dialogue-wav', 'sfx-wav', 'music-bed', 'mixdown-preview'],
      boundaries: [
        'T-035 does not persist audio files or introduce a new audio table.',
        'Generated audio should later be stored under local/NAS assets before video muxing.',
        'Provider-specific voice cloning, consent rules and cost limits must be configured before real rendering.',
      ],
      status: 'planned',
      suggestedPath: '/data/audio/storyboard',
    },
    costStrategy:
      'Default to browser SpeechSynthesis for preview, then local/self-hosted TTS before any paid provider.',
    dubbingQueue,
    generatedAt: new Date().toISOString(),
    projectId,
    providerOptions: [
      {
        id: 'browser-speech-synthesis',
        label: 'Browser SpeechSynthesis preview',
        mode: 'browser',
        notes: [
          'Runs in the browser and is suitable for quick timing checks.',
          'Voice quality depends on the operating system and installed voices.',
          'No API key, no server call and no external cost.',
        ],
        risk: 'free',
        setup: 'Use the browser built-in speechSynthesis API.',
        status: 'available',
      },
      {
        id: 'local-open-tts',
        label: 'Local open-source TTS',
        mode: 'local',
        notes: [
          'Can run on the author machine or NAS when resources allow.',
          'Recommended before paid cloud TTS for privacy and cost control.',
        ],
        risk: 'low',
        setup: 'Reserve a future local adapter such as Piper or compatible HTTP TTS.',
        status: 'planned',
      },
      {
        id: 'paid-cloud-tts',
        label: 'Paid cloud TTS',
        mode: 'paid',
        notes: [
          'Deferred until there is budget and explicit provider configuration.',
          'Must expose per-run cost warnings and model selection before rendering.',
        ],
        risk: 'paid',
        setup: 'Add a dedicated TTS provider type after local preview workflow is proven.',
        status: 'deferred',
      },
    ],
    storyboardId: storyboard?.id ?? null,
    voiceReadiness,
  };
}
