import { useQuery } from '@tanstack/react-query';
import { Link, useOutletContext } from 'react-router';

import type { Project } from '@storyverse/contracts';
import { workspaceApi } from '../workspace/workspaceApi';

export function ProjectDashboardPage() {
  const { project } = useOutletContext<{ project: Project }>();
  const stats = useQuery({
    queryFn: () => workspaceApi.stats(project.id),
    queryKey: ['stats', project.id],
  });

  return (
    <main className="workspace-page">
      <p className="eyebrow">项目概览</p>
      <div className="dashboard-heading">
        <div>
          <h1>{project.name}</h1>
          <p className="page-intro">
            {project.description || '为这个故事添加一句清晰的创作方向。'}
          </p>
        </div>
        <Link className="button" to="write">
          继续写作
        </Link>
      </div>
      <div className="metric-grid">
        <article>
          <span className="metric-icon">◈</span>
          <span>故事节点</span>
          <strong>{stats.data?.nodeCount ?? 0}</strong>
          <small>{stats.data?.chapterCount ?? 0} 个章节</small>
        </article>
        <article>
          <span className="metric-icon">✦</span>
          <span>正文总字数</span>
          <strong>{stats.data?.totalWordCount ?? 0}</strong>
          <small>服务端统计</small>
        </article>
        <article>
          <span className="metric-icon">◇</span>
          <span>待整理事项</span>
          <strong>
            {(stats.data?.inspirationInboxCount ?? 0) + (stats.data?.overdueForeshadowCount ?? 0)}
          </strong>
          <small>灵感与伏笔预警</small>
        </article>
      </div>
      <div className="dashboard-grid">
        <section className="panel next-step">
          <p className="eyebrow">推荐下一步</p>
          <h2>定义故事的规则与结局方向</h2>
          <p>创作圣经会成为角色、情节和 AI 辅助写作共同遵守的基础。</p>
          <Link className="text-link" to="bible">
            打开创作圣经 →
          </Link>
        </section>
        <section className="panel dashboard-shortcuts">
          <p className="eyebrow">快速入口</p>
          <Link to="story">
            故事线画布 <span>构建剧情结构</span>
          </Link>
          <Link to="characters">
            角色关系 <span>维护人物网络</span>
          </Link>
          <Link to="notes">
            伏笔与灵感 <span>整理创作线索</span>
          </Link>
        </section>
      </div>
    </main>
  );
}
