import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Character, CharacterAbility, StoryNode } from '@storyverse/contracts';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router';

import { creativeApi } from '../creative/creativeApi';
import { aiSettingsApi } from '../workspace/aiSettingsApi';
import { visualApi } from './visualApi';

type PipelineTarget = 'character' | 'scene' | 'ability' | 'reference';
type PromptQueueItem = {
  id: string;
  target: PipelineTarget;
  title: string;
  prompt: string;
  characterId?: string;
  storyNodeId?: string;
  abilityId?: string;
};

const targetKind = {
  ability: 'prop',
  character: 'character',
  reference: 'reference',
  scene: 'scene',
} as const;

export function AssetsPage() {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const assets = useQuery({
    queryFn: () => visualApi.listAssets(projectId),
    queryKey: ['assets', projectId],
  });
  const characters = useQuery({
    queryFn: () => creativeApi.listCharacters(projectId),
    queryKey: ['characters', projectId],
  });
  const nodes = useQuery({
    queryFn: () => creativeApi.listNodes(projectId),
    queryKey: ['story-nodes', projectId],
  });
  const abilities = useQuery({
    queryFn: () => visualApi.listAbilities(projectId),
    queryKey: ['abilities', projectId],
  });
  const providers = useQuery({
    queryFn: aiSettingsApi.listProviders,
    queryKey: ['ai-providers'],
  });
  const imageProviders = (providers.data ?? []).filter((item) => item.kind === 'image');
  const enabledImageProviders = imageProviders.filter((item) => item.enabled);
  const [target, setTarget] = useState<PipelineTarget>('scene');
  const [characterId, setCharacterId] = useState('');
  const [storyNodeId, setStoryNodeId] = useState('');
  const [abilityId, setAbilityId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [providerId, setProviderId] = useState('');
  const selectedCharacter = characters.data?.find((item) => item.id === characterId);
  const selectedNode = nodes.data?.find((item) => item.id === storyNodeId);
  const selectedAbility = abilities.data?.find((item) => item.id === abilityId);
  const abilityNames = new Map((abilities.data ?? []).map((item) => [item.id, item.name]));
  const linkedAbilityId = target === 'ability' ? abilityId || undefined : undefined;
  const linkedCharacterId =
    target === 'character'
      ? characterId || undefined
      : target === 'ability'
        ? selectedAbility?.characterId
        : undefined;
  const linkedStoryNodeId = target === 'scene' ? storyNodeId || undefined : undefined;
  const missingCharacterAssets = (characters.data ?? []).filter(
    (character) =>
      !(assets.data ?? []).some(
        (asset) => asset.kind === 'character' && asset.characterId === character.id,
      ),
  );
  const missingSceneAssets = (nodes.data ?? []).filter(
    (node) =>
      !(assets.data ?? []).some((asset) => asset.kind === 'scene' && asset.storyNodeId === node.id),
  );
  const missingAbilityAssets = (abilities.data ?? []).filter(
    (ability) =>
      !(assets.data ?? []).some((asset) => asset.kind === 'prop' && asset.abilityId === ability.id),
  );
  const [promptQueue, setPromptQueue] = useState<PromptQueueItem[]>([]);
  const assetName = useMemo(
    () =>
      target === 'character'
        ? `${selectedCharacter?.name ?? '角色'} 设定图`
        : target === 'scene'
          ? `${selectedNode?.title ?? '场景'} 定格图`
          : target === 'ability'
            ? `${selectedAbility?.name ?? '技能'} 视觉图`
            : file?.name || '参考图',
    [file?.name, selectedAbility?.name, selectedCharacter?.name, selectedNode?.title, target],
  );
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['assets', projectId] });
  const upload = useMutation({
    mutationFn: () =>
      visualApi.uploadAsset(projectId, file!, assetName, targetKind[target], {
        abilityId: linkedAbilityId,
        characterId: linkedCharacterId,
        storyNodeId: linkedStoryNodeId,
      }),
    onSuccess: refresh,
  });
  const generate = useMutation({
    mutationFn: () =>
      visualApi.generateImage(projectId, {
        characterId: linkedCharacterId ?? null,
        abilityId: linkedAbilityId ?? null,
        kind: targetKind[target],
        name: assetName.slice(0, 120),
        prompt,
        providerId: providerId || enabledImageProviders[0]?.id || '',
        size: '1024x1024',
        storyNodeId: linkedStoryNodeId ?? null,
      }),
    onSuccess: refresh,
  });
  const draftPrompt = () => {
    setPrompt(
      buildVisualPrompt({
        ability: selectedAbility,
        character: selectedCharacter,
        node: selectedNode,
        target,
      }),
    );
  };
  const queueMissingPrompts = () => {
    const queued: PromptQueueItem[] = [
      ...missingCharacterAssets.map((character) => ({
        characterId: character.id,
        id: `character:${character.id}`,
        prompt: buildVisualPrompt({ character, target: 'character' }),
        target: 'character' as const,
        title: `${character.name} 角色设定图`,
      })),
      ...missingSceneAssets.map((node) => ({
        id: `scene:${node.id}`,
        prompt: buildVisualPrompt({ node, target: 'scene' }),
        storyNodeId: node.id,
        target: 'scene' as const,
        title: `${node.title} 场景定格图`,
      })),
      ...missingAbilityAssets.map((ability) => {
        const character = (characters.data ?? []).find((item) => item.id === ability.characterId);
        return {
          abilityId: ability.id,
          characterId: ability.characterId,
          id: `ability:${ability.id}`,
          prompt: buildVisualPrompt({ ability, character, target: 'ability' }),
          target: 'ability' as const,
          title: `${ability.name} 技能视觉图`,
        };
      }),
    ];
    setPromptQueue(queued);
  };
  const useQueueItem = (item: PromptQueueItem) => {
    setTarget(item.target);
    setCharacterId(item.characterId ?? '');
    setStoryNodeId(item.storyNodeId ?? '');
    setAbilityId(item.abilityId ?? '');
    setPrompt(item.prompt);
  };

  return (
    <main className="workspace-page workspace-page--wide">
      <p className="eyebrow">T-030 / VISUAL PIPELINE</p>
      <h1>视觉流水线</h1>
      <section className="panel visual-pipeline">
        <div className="section-heading">
          <div>
            <h2>角色 / 场景 / 技能 → 提示词 → 素材库</h2>
            <p>
              小成本优先：先生成提示词和本地上传；只有选择已启用图片 Provider
              并点击生成时才会调用外部图片接口。
            </p>
          </div>
          <span>
            {enabledImageProviders.length ? '图片 Provider 可用' : '图片 Provider 未启用'}
          </span>
        </div>
        <div className="visual-pipeline__grid">
          <label>
            流水线目标
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value as PipelineTarget)}
            >
              <option value="scene">场景定格图</option>
              <option value="character">角色设定图</option>
              <option value="ability">技能视觉图</option>
              <option value="reference">世界参考图</option>
            </select>
          </label>
          <label>
            绑定角色
            <select value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
              <option value="">不绑定角色</option>
              {(characters.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            绑定故事节点
            <select value={storyNodeId} onChange={(event) => setStoryNodeId(event.target.value)}>
              <option value="">不绑定节点</option>
              {(nodes.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sortOrder + 1}. {item.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            绑定技能
            <select value={abilityId} onChange={(event) => setAbilityId(event.target.value)}>
              <option value="">不绑定技能</option>
              {(abilities.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} Lv.{item.level}
                </option>
              ))}
            </select>
          </label>
          <label>
            图片 Provider
            <select value={providerId} onChange={(event) => setProviderId(event.target.value)}>
              <option value="">选择已启用图片模型</option>
              {imageProviders.map((item) => (
                <option disabled={!item.enabled} key={item.id} value={item.id}>
                  {item.name} · {item.defaultModel} {item.enabled ? '' : '（禁用）'}
                </option>
              ))}
            </select>
          </label>
          <label>
            本地图片
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <label className="visual-pipeline__prompt">
          视觉提示词
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="选择目标后点击生成提示词，或直接粘贴你要给图片模型的 prompt。"
          />
        </label>
        <div className="button-row">
          <button className="button button--quiet" onClick={draftPrompt}>
            生成提示词
          </button>
          <button className="button" disabled={!file} onClick={() => upload.mutate()}>
            上传到本地/NAS 素材库
          </button>
          <button
            className="button"
            disabled={!prompt || (!providerId && !enabledImageProviders[0]) || generate.isPending}
            onClick={() => generate.mutate()}
          >
            {generate.isPending ? '正在生成…' : 'AI 生图并入库'}
          </button>
        </div>
        {generate.error ? <p className="notice notice--error">{generate.error.message}</p> : null}
      </section>
      <section className="panel asset-gap-panel">
        <div className="section-heading">
          <div>
            <h2>素材缺口检查</h2>
            <p>
              检查角色设定图、场景定格图和技能视觉图是否已经有绑定素材。批量队列只生成提示词草稿，
              不会自动调用图片 Provider。
            </p>
          </div>
          <button className="button button--quiet" onClick={queueMissingPrompts}>
            生成缺口提示词队列
          </button>
        </div>
        <div className="asset-gap-grid">
          <article>
            <span>缺角色图</span>
            <strong>{missingCharacterAssets.length}</strong>
            <p>{missingCharacterAssets.map((item) => item.name).join('、') || '已覆盖'}</p>
          </article>
          <article>
            <span>缺场景图</span>
            <strong>{missingSceneAssets.length}</strong>
            <p>{missingSceneAssets.map((item) => item.title).join('、') || '已覆盖'}</p>
          </article>
          <article>
            <span>缺技能图</span>
            <strong>{missingAbilityAssets.length}</strong>
            <p>{missingAbilityAssets.map((item) => item.name).join('、') || '已覆盖'}</p>
          </article>
        </div>
        {promptQueue.length > 0 ? (
          <div className="prompt-queue">
            {promptQueue.map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <small>
                    {targetKind[item.target]} · {item.target}
                  </small>
                  <p>{item.prompt.slice(0, 180)}</p>
                </div>
                <button className="button button--quiet" onClick={() => useQueueItem(item)}>
                  载入提示词
                </button>
              </article>
            ))}
          </div>
        ) : null}
      </section>
      <section className="visual-pipeline__summary">
        {(['character', 'scene', 'prop', 'background', 'reference'] as const).map((kind) => (
          <article className="panel" key={kind}>
            <span>{kind}</span>
            <strong>{(assets.data ?? []).filter((asset) => asset.kind === kind).length}</strong>
          </article>
        ))}
      </section>
      <div className="asset-grid">
        {(assets.data ?? []).map((asset) => (
          <article className="panel" key={asset.id}>
            <img src={asset.url} alt={asset.name} />
            <strong>{asset.name}</strong>
            <small>
              {asset.kind} · {asset.source}
              {asset.characterId ? ' · 角色绑定' : ''}
              {asset.storyNodeId ? ' · 节点绑定' : ''}
              {asset.abilityId ? ` · 技能：${abilityNames.get(asset.abilityId) ?? '已绑定'}` : ''}
            </small>
            {asset.prompt ? <p>{asset.prompt.slice(0, 120)}</p> : null}
            <button
              className="button button--danger"
              onClick={() => void visualApi.deleteAsset(asset.id).then(refresh)}
            >
              删除
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}

function buildVisualPrompt({
  ability,
  character,
  node,
  target,
}: {
  ability?: CharacterAbility;
  character?: Character;
  node?: StoryNode;
  target: PipelineTarget;
}) {
  const characterText = character
    ? `角色：${character.name}。简介：${character.bio || '未填写'}。性格：${
        character.personality || '未填写'
      }。`
    : '';
  const nodeText = node
    ? `故事节点：${node.title}。目标：${node.nodeGoal || '未填写'}。摘要：${
        node.summary || node.description || '未填写'
      }。`
    : '';
  const abilityText = ability
    ? `技能：${ability.name} Lv.${ability.level}。描述：${ability.description || '未填写'}。`
    : '';
  const base =
    target === 'character'
      ? `${characterText} 生成暗夜书房风格的角色设定图，半身像，清晰轮廓，适合小说人物卡。`
      : target === 'scene'
        ? `${nodeText} ${characterText} 生成电影感定格场景图，强调空间层次、情绪氛围、关键道具。`
        : target === 'ability'
          ? `${abilityText} ${characterText} 生成技能释放瞬间或技能图标，适合后续剪纸动画分层。`
          : '生成可作为世界观参考的视觉素材，暗色奇幻/科幻质感，保留可复用的设计元素。';
  return `${base} 不要文字水印，不要 UI 边框，画面干净。`;
}
