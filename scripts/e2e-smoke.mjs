const baseUrl = process.env.STORYVERSE_E2E_URL ?? 'http://127.0.0.1:4311';
let projectId;

try {
  const page = await fetch(baseUrl);
  assert(page.ok, `Web returned ${page.status}`);
  const health = await request('/api/health');
  assert(health.status === 'ok', 'API health check failed');

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
  await request(`/api/story-nodes/${node.id}/chapter`, {
    body: JSON.stringify({ chapterNumber: 1, content: 'E2E 正文内容。', title: '第一章' }),
    headers: { 'content-type': 'application/json' },
    method: 'PUT',
  });
  const exported = await request(`/api/projects/${projectId}/export/novel-md`);
  assert(exported.content.includes('E2E 正文内容'), 'Export did not contain saved prose');
  console.log('StoryVerse E2E smoke passed.');
} finally {
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
