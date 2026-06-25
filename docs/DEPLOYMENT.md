# StoryVerse 部署指南

## 一条命令启动

```bash
cp .env.example .env
docker compose -p storyverse up -d --build
```

默认访问：

- Web：`http://localhost:4311`
- API 健康检查：`http://localhost:4311/api/health`
- PostgreSQL 宿主机端口：`127.0.0.1:55432`

端口均可在 `.env` 中修改。Compose 项目名固定为 `storyverse`，避免与同一主机上的
其他项目共享容器、网络或数据卷名称。

## NAS 部署

适用于群晖 Container Manager、威联通 Container Station、TrueNAS SCALE 和普通
Linux NAS。

1. 将仓库放到 NAS 的应用目录。
2. 复制 `.env.example` 为 `.env`。
3. 设置绝对持久化目录和强数据库密码：

```dotenv
STORYVERSE_DATA_DIR=/volume1/docker/storyverse/postgres
STORYVERSE_UPLOAD_DIR=/volume1/docker/storyverse/uploads
STORYVERSE_WEB_PORT=4311
STORYVERSE_DB_PORT=55432
STORYVERSE_DB_BIND_ADDRESS=127.0.0.1
STORYVERSE_DB_PASSWORD=请替换为长随机密码
STORYVERSE_AUTH_MODE=account
STORYVERSE_SECRET_KEY=请替换为至少32位的长随机密钥
STORYVERSE_GENERATION_TIMEOUT_MS=600000
STORYVERSE_AI_RETRY_ATTEMPTS=3
STORYVERSE_AI_MAX_OUTPUT_TOKENS=4096
STORYVERSE_AI_STRUCTURED_RETRY_ATTEMPTS=2
```

4. 执行 `npm run ops:preflight:nas`，确认账号、密钥、目录和数据库绑定满足 NAS 安全要求。
5. 确保目录仅允许管理员和容器服务账号访问。
6. 执行 `docker compose -p storyverse up -d --build`。

镜像基于官方 Node.js 与 Nginx Alpine，支持常见的 `linux/amd64` 与
`linux/arm64` NAS。

## 公网访问

默认建议仅在局域网访问。需要公网访问时：

- 使用 NAS 自带反向代理、Caddy、Traefik 或 Nginx。
- 只代理 Web 的 `4311` 端口，并配置 HTTPS 和访问控制。
- PostgreSQL 默认只绑定 NAS 的 `127.0.0.1:55432`，不要改为公网或局域网地址。
- `/api` 已由 Web 容器代理到内部 API。
- Web 代理允许 AI 请求运行最多 360 秒，素材上传上限为 20 MB。
- 公网或跨设备访问时必须启用 `STORYVERSE_AUTH_MODE=account`。
- 账号模式下 `STORYVERSE_SECRET_KEY` 不得使用示例值；它用于加密已保存的 AI Key。
- `STORYVERSE_DATA_DIR` 与 `STORYVERSE_UPLOAD_DIR` 都应位于 NAS 持久化目录，并纳入备份。

## AI Provider

AI 是可选功能；不配置模型时，全部非 AI 功能仍可使用。

### 本地 Ollama

在“项目与 AI 设置”中新增文本 Provider：

- 地址：`http://host.docker.internal:11434/v1`
- 协议：`Chat Completions / Ollama`
- 模型：已下载的本地模型名称

Linux/NAS 若不支持 `host.docker.internal`，使用宿主机局域网 IP。

### OpenAI 兼容服务

填写服务的 `/v1` 基础地址、模型和 API Key。Key 会使用 `STORYVERSE_SECRET_KEY`
在服务端加密保存；浏览器只会看到“已配置 Key”，不会读取明文。

图片模型请新增“图片模型”类型的 Provider。StoryVerse 会把生成结果下载到
`STORYVERSE_UPLOAD_DIR`，避免长期依赖第三方临时 URL。

OpenRouter 图片 Provider 使用以下配置：

- 地址：`https://openrouter.ai/api/v1`
- 协议：`openrouter-images`
- 模型：从 OpenRouter 图片模型列表选择

OpenRouter 图片模型可能产生费用。余额不足时应先保持 Provider 禁用，不要用真实生成请求测试连通性。

文本和图片请求会对网络错误、限流与服务端错误进行最多
`STORYVERSE_AI_RETRY_ATTEMPTS` 次尝试。文本请求通过
`STORYVERSE_AI_MAX_OUTPUT_TOKENS` 限制单次最大输出，建议先使用较小值验证质量，再按需提高。
认证失败和参数错误不会自动重试，避免无效请求继续消耗额度。
结构化创作输出若为空或不是有效 JSON，会按
`STORYVERSE_AI_STRUCTURED_RETRY_ATTEMPTS` 再生成，默认最多 2 次；付费模型可设为 `1`
以严格控制费用。

## 备份与恢复

项目设置页可创建事务快照并下载 JSON。完整数据库备份：

```bash
docker compose -p storyverse exec -T postgres \
  pg_dump -U storyverse -d storyverse -Fc > storyverse.dump
```

恢复：

```bash
docker compose -p storyverse stop web api
docker compose -p storyverse exec -T postgres \
  pg_restore -U storyverse -d storyverse --clean --if-exists < storyverse.dump
docker compose -p storyverse start api web
```

NAS 建议同时备份 PostgreSQL 持久化目录、上传素材目录、`storyverse.dump` 和项目 JSON
快照，并至少保留一份不在同一块硬盘上的副本。

## 长任务与 AI 生成

- 章节、结构化创作、图片生成和分镜生成都会写入生成记录。
- `STORYVERSE_GENERATION_TIMEOUT_MS` 控制运行中任务的超时标记，默认 10 分钟。
- 如果容器重启导致任务停在 `running`，下次读取生成记录时会标记为 `failed`，避免 UI
  永远显示运行中。
- 当前版本仍使用进程内执行；大规模批量图片或视频渲染建议在后续版本引入独立 Worker。

## 升级与验收

```bash
git pull
docker compose -p storyverse up -d --build
npm run test:e2e
```

API 容器启动前会自动应用 migration。E2E 脚本通过 Web 入口完成健康检查、认证状态、
AI Provider、故事线、节点、显式边、角色技能、场景检查器、素材上传、分镜生成、正文、
导出 Markdown，并删除测试项目。
