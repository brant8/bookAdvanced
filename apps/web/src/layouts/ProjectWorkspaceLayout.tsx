import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, Outlet, useParams } from 'react-router';

import { getProject } from '../features/projects/projectApi';

const navigation = [
  ['概览', ''],
  ['创作圣经', 'bible'],
  ['世界设定', 'world'],
  ['角色', 'characters'],
  ['故事线', 'story'],
  ['时间轴', 'timeline'],
  ['正文', 'write'],
  ['伏笔与灵感', 'notes'],
  ['设置', 'settings'],
] as const;

export function ProjectWorkspaceLayout() {
  const { projectId = '' } = useParams();
  const projectQuery = useQuery({
    enabled: Boolean(projectId),
    queryFn: () => getProject(projectId),
    queryKey: ['project', projectId],
  });

  if (projectQuery.isLoading) {
    return <p className="notice workspace-loading">正在打开项目…</p>;
  }

  if (!projectQuery.data) {
    return (
      <main className="empty-state workspace-loading">
        <strong>无法打开项目</strong>
        <Link to="/">返回项目列表</Link>
      </main>
    );
  }

  return (
    <div className="workspace">
      <aside className="workspace__sidebar">
        <Link className="brand" to="/">
          StoryVerse
        </Link>
        <div className="workspace__project">
          <span>{projectQuery.data.name.slice(0, 1)}</span>
          <div>
            <strong>{projectQuery.data.name}</strong>
            <small>本地项目</small>
          </div>
        </div>
        <nav>
          {navigation.map(([label, path]) => (
            <NavLink end={path === ''} key={path} to={path}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="workspace__content">
        <Outlet context={{ project: projectQuery.data }} />
      </section>
    </div>
  );
}
