import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { downloadText, workspaceApi } from './workspaceApi';

export function SettingsPage() {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const snapshots = useQuery({
    queryFn: () => workspaceApi.listSnapshots(projectId),
    queryKey: ['snapshots', projectId],
  });
  const snapshot = useMutation({
    mutationFn: () => workspaceApi.createSnapshot(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['snapshots', projectId] }),
  });
  const runExport = async (format: string) => {
    const document = await workspaceApi.export(projectId, format);
    downloadText(document.fileName, document.contentType, document.content);
  };
  return (
    <main className="workspace-page">
      <p className="eyebrow">T-013 / PORTABILITY</p>
      <h1>导出与备份</h1>
      <section className="panel">
        <h2>离线导出</h2>
        <p>文件直接在浏览器生成并下载，不上传到第三方服务。</p>
        <div className="button-row">
          <button className="button" onClick={() => void runExport('master-md')}>
            项目 Master MD
          </button>
          <button className="button button--quiet" onClick={() => void runExport('novel-md')}>
            正文 Markdown
          </button>
          <button className="button button--quiet" onClick={() => void runExport('novel-txt')}>
            正文 TXT
          </button>
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>项目快照</h2>
            <p>快照保存在 PostgreSQL 数据卷中，适合 NAS 定期备份。</p>
          </div>
          <button className="button" onClick={() => snapshot.mutate()}>
            创建快照
          </button>
        </div>
        <div className="record-list">
          {(snapshots.data ?? []).map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.label}</strong>
                <small>{new Date(item.createdAt).toLocaleString()}</small>
              </div>
              <div className="button-row">
                <button
                  className="button button--quiet"
                  onClick={() =>
                    void workspaceApi
                      .downloadSnapshot(item.id)
                      .then((data) =>
                        downloadText(
                          `${item.label}.json`,
                          'application/json',
                          JSON.stringify(data, null, 2),
                        ),
                      )
                  }
                >
                  下载 JSON
                </button>
                <button
                  className="button button--danger"
                  onClick={() => {
                    if (window.confirm('恢复会覆盖当前项目内容，确定继续？'))
                      void workspaceApi
                        .restoreSnapshot(item.id)
                        .then(() => window.location.reload());
                  }}
                >
                  恢复
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
