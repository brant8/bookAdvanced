import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router';

import { getProject } from '../features/projects/projectApi';

const navigation = [
  ['概览', '', 'grid'],
  ['导演视角', 'director', 'spark'],
  ['创作圣经', 'bible', 'book'],
  ['世界设定', 'world', 'globe'],
  ['角色', 'characters', 'users'],
  ['故事线', 'story', 'nodes'],
  ['时间轴', 'timeline', 'timeline'],
  ['正文', 'write', 'edit'],
  ['伏笔与灵感', 'notes', 'spark'],
  ['视觉素材', 'assets', 'grid'],
  ['分镜播放', 'storyboard', 'timeline'],
  ['设置', 'settings', 'settings'],
] as const;

export function ProjectWorkspaceLayout() {
  const { projectId = '' } = useParams();
  const location = useLocation();
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

  const activeNavigation =
    navigation.find(([, path]) =>
      path
        ? location.pathname.endsWith(`/${path}`)
        : location.pathname === `/projects/${projectId}`,
    ) ?? navigation[0];

  return (
    <div className="workspace">
      <aside className="workspace__sidebar">
        <Link className="brand" to="/" aria-label="返回 StoryVerse 项目列表">
          <span className="brand__mark">S</span>
          <span>
            StoryVerse
            <small>故事宇宙工作台</small>
          </span>
        </Link>
        <div className="workspace__project">
          <span>{projectQuery.data.name.slice(0, 1)}</span>
          <div>
            <strong>{projectQuery.data.name}</strong>
            <small>本地项目</small>
          </div>
        </div>
        <nav aria-label="项目工作区">
          {navigation.map(([label, path, icon]) => (
            <NavLink end={path === ''} key={path} to={path}>
              <NavIcon name={icon} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="workspace__local">
          <span className="status-dot" />
          本地优先 · 数据自托管
        </div>
      </aside>
      <section className="workspace__content">
        <header className="workspace__topbar">
          <div>
            <span>StoryVerse</span>
            <b>/</b>
            <strong>{projectQuery.data.name}</strong>
            <b>/</b>
            <span>{activeNavigation[0]}</span>
          </div>
          <div className="workspace__topbar-actions">
            <span className="topbar-chip">
              <span className="status-dot status-dot--ai" />
              AI 手动模式
            </span>
            <span className="topbar-chip">本地保存</span>
          </div>
        </header>
        <div className="workspace__viewport">
          <Outlet context={{ project: projectQuery.data }} />
        </div>
        <footer className="workspace__statusbar">
          <span>
            <span className="status-dot" />
            服务已连接
          </span>
          <span>PostgreSQL · 本地数据卷</span>
          <span>StoryVerse / 暗夜书房</span>
        </footer>
      </section>
    </div>
  );
}

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    book: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v14H6.5A2.5 2.5 0 0 0 4 19.5z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v14h4.5a2.5 2.5 0 0 1 2.5 2.5z" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    nodes: (
      <>
        <rect x="3" y="4" width="6" height="5" rx="1" />
        <rect x="15" y="15" width="6" height="5" rx="1" />
        <path d="M9 6.5h4a4 4 0 0 1 4 4V15M7 9v7a3 3 0 0 0 3 3h5" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z" />
      </>
    ),
    spark: (
      <path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4zM5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8z" />
    ),
    timeline: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="8" cy="7" r="2" />
        <circle cx="16" cy="17" r="2" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20a6 6 0 0 1 12 0M16 4.5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" className="nav-icon" fill="none" viewBox="0 0 24 24">
      {paths[name]}
    </svg>
  );
}
