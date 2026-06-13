# StoryVerse

面向小说、漫画与动画创作者的空间化叙事构建平台。

## 文档入口

- [产品需求原稿](./StoryVerse_PRD%20%281%29.md)
- [技术规格原稿](./StoryVerse_Codex_Spec%20%282%29.md)
- [统一项目蓝图](./docs/PROJECT_PLAN.md)
- [Docker / NAS 部署指南](./docs/DEPLOYMENT.md)
- [开发进度台账](./PROGRESS.md)

## 当前状态

项目已完成工程、应用和数据库基线。实际开发范围、任务顺序和成本约束以
`docs/PROJECT_PLAN.md` 与 `PROGRESS.md` 为准；原始文档保留为需求来源。

## 本地端口

- Web：`http://localhost:4311`
- API：`http://localhost:4310`
- API 健康检查：`http://localhost:4310/health`
- 预留 PostgreSQL 宿主机端口：`55432`

可通过 `STORYVERSE_WEB_PORT` 和 `STORYVERSE_API_PORT` 覆盖默认端口。开发服务器开启
严格端口模式，端口冲突时会直接提示，避免自动切换后造成 Web 与 API 代理失联。
后续 Docker Compose 也将使用独立项目名和可配置宿主机端口，避免与其他容器栈冲突。

## 本地数据库

```powershell
# 启动独立的 StoryVerse PostgreSQL
docker compose up -d postgres

# 当前 PowerShell 会话配置连接
$env:DATABASE_URL='postgresql://storyverse:storyverse_dev@localhost:55432/storyverse'

# 应用 migration 并运行回滚式 smoke test
npm run db:migrate
npm run db:smoke

# 停止数据库但保留数据卷
docker compose stop postgres
```

Compose 项目固定名为 `storyverse`，容器、网络和数据卷不会与其他项目共用。

## Docker / NAS

完整的 Web、API 和 PostgreSQL 可一条命令启动：

```bash
docker compose -p storyverse up -d --build
```

默认访问 `http://localhost:4311`。NAS 持久化目录、反向代理、HTTPS、AI Provider、
备份和升级步骤见 `docs/DEPLOYMENT.md`。

核心功能不依赖付费服务。AI 可连接本地 Ollama，也可由用户自行提供 OpenAI 兼容
服务的 API Key。

## Project API

API 启动时会幂等创建唯一的本地默认用户。当前项目接口：

- `GET /projects`
- `POST /projects`
- `GET /projects/:id`
- `PATCH /projects/:id`
- `DELETE /projects/:id`

Web 开发服务器通过 `/api/projects` 代理访问这些接口。

## 工作约定

每完成一个任务，都需要：

1. 更新 `PROGRESS.md` 中的任务状态。
2. 记录关键决定、验证结果和未解决问题。
3. 明确标出一个推荐的下一任务。
