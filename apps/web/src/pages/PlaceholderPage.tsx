interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <main className="workspace-page">
      <p className="eyebrow">PROJECT WORKSPACE</p>
      <h1>{title}</h1>
      <div className="empty-state">
        <strong>模块即将接入</strong>
        <p>当前工作区导航已就绪，数据功能会在后续任务中逐步开放。</p>
      </div>
    </main>
  );
}
