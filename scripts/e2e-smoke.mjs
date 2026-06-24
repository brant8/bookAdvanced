const baseUrl = process.env.STORYVERSE_E2E_URL ?? 'http://127.0.0.1:4311';
let projectId;
let providerId;
let assetId;

try {
  const page = await fetch(baseUrl);
  assert(page.ok, `Web returned ${page.status}`);
  const health = await request('/api/health');
  assert(health.status === 'ok', 'API health check failed');
  const auth = await request('/api/auth/status');
  assert(auth.authenticated === true, 'Local auth status should be authenticated');

  const provider = await request('/api/ai/providers', {
    body: JSON.stringify({
      baseUrl: 'http://localhost:11434/v1',
      defaultModel: 'e2e-local-model',
      enabled: true,
      kind: 'text',
      models: ['e2e-local-model'],
      name: `E2E Provider ${Date.now()}`,
      protocol: 'chat-completions',
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  providerId = provider.id;
  assert(provider.hasApiKey === false, 'Provider response should not expose secrets');

  const project = await request('/api/projects', {
    body: JSON.stringify({ name: `E2E ${Date.now()}` }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  projectId = project.id;
  const storyline = await request(`/api/projects/${projectId}/storylines`, {
    body: JSON.stringify({ endingGoal: '主角公开真相', title: 'E2E 主线' }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  const node = await request(`/api/projects/${projectId}/story-nodes`, {
    body: JSON.stringify({
      nodeGoal: '取得证词',
      sortOrder: 0,
      storylineId: storyline.id,
      title: '第一幕',
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  const secondNode = await request(`/api/projects/${projectId}/story-nodes`, {
    body: JSON.stringify({
      nodeGoal: '公开真相',
      sortOrder: 1,
      storylineId: storyline.id,
      title: '第二幕',
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  const edge = await request(`/api/projects/${projectId}/story-node-edges`, {
    body: JSON.stringify({
      label: '推进',
      sourceNodeId: node.id,
      targetNodeId: secondNode.id,
      type: 'flow',
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  assert(edge.sourceNodeId === node.id, 'Story edge was not persisted');

  const character = await request(`/api/projects/${projectId}/characters`, {
    body: JSON.stringify({ bio: 'E2E 角色', name: '证人' }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  const ability = await request(`/api/projects/${projectId}/abilities`, {
    body: JSON.stringify({ characterId: character.id, level: 2, name: '记忆回溯' }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  assert(ability.name === '记忆回溯', 'Ability was not created');

  const scene = await request(`/api/story-nodes/${node.id}/scene`, {
    body: JSON.stringify({
      atmosphere: '紧张',
      location: '审讯室',
      visualPrompt: 'dark room, witness under a lamp',
      weather: '雨夜',
    }),
    headers: { 'content-type': 'application/json' },
    method: 'PUT',
  });
  assert(scene.location === '审讯室', 'Scene inspector data was not saved');

  const form = new FormData();
  form.set('name', 'E2E 本地素材');
  form.set('kind', 'reference');
  form.set('file', new File([new Uint8Array([137, 80, 78, 71])], 'e2e.png', { type: 'image/png' }));
  const assetResponse = await fetch(`${baseUrl}/api/projects/${projectId}/assets/upload`, {
    body: form,
    method: 'POST',
  });
  assert(assetResponse.ok, `Asset upload returned ${assetResponse.status}`);
  const asset = await assetResponse.json();
  assetId = asset.id;
  const assetFile = await fetch(`${baseUrl}${asset.url}`);
  assert(assetFile.ok, 'Uploaded asset file could not be read back');

  const storyboard = await request(`/api/projects/${projectId}/storyboard/generate`, {
    body: JSON.stringify({}),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  assert(storyboard.shots.length === 2, 'Storyboard did not include the two story nodes');

  await request(`/api/story-nodes/${node.id}/chapter`, {
    body: JSON.stringify({ chapterNumber: 1, content: 'E2E 正文内容。', title: '第一章' }),
    headers: { 'content-type': 'application/json' },
    method: 'PUT',
  });
  const exported = await request(`/api/projects/${projectId}/export/novel-md`);
  assert(exported.content.includes('E2E 正文内容'), 'Export did not contain saved prose');
  const runs = await request(`/api/ai/generation-runs?projectId=${projectId}`);
  assert(Array.isArray(runs), 'Generation runs endpoint did not return a list');
  console.log('StoryVerse E2E smoke passed.');
} finally {
  if (assetId) {
    await fetch(`${baseUrl}/api/assets/${assetId}`, { method: 'DELETE' });
  }
  if (providerId) {
    await fetch(`${baseUrl}/api/ai/providers/${providerId}`, { method: 'DELETE' });
  }
  if (projectId) {
    await fetch(`${baseUrl}/api/projects/${projectId}`, { method: 'DELETE' });
  }
}

async function request(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (!response.ok)
    throw new Error(`${path} returned ${response.status}: ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
