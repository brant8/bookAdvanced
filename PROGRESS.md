# StoryVerse 开发进度

> 此文件是项目进度的唯一追踪入口。每完成一个任务都必须更新状态、验证结果、
> 关键决定和“下一推荐任务”。

## 当前概况

- 当前阶段：基础 MVP 已完成，进入 AI 原生创作平台升级
- 当前里程碑：M6 AI 原生创作底座
- 完成度：基础 MVP 16 / 16；AI 原生升级 10 / 10
- 最近更新：2026-06-14
- 成本策略：本地免费优先，核心功能不得依赖付费服务
- 部署策略：支持本机或 NAS Docker 自托管，后期再考虑商业云

## 状态说明

- `待办`：尚未开始
- `进行中`：当前正在执行
- `阻塞`：需要外部决定或条件
- `完成`：实现并验证
- `延后`：不属于当前阶段

## 任务清单

| ID    | 任务                              | 状态 | 依赖        | 完成标准                              |
| ----- | --------------------------------- | ---- | ----------- | ------------------------------------- |
| T-000 | 统一项目规划与成本策略            | 完成 | -           | 项目蓝图和进度台账落盘                |
| T-001 | 初始化 Git、Monorepo 与质量工具   | 完成 | T-000       | install、typecheck、lint、test 可运行 |
| T-002 | 创建 Web/API/共享包骨架           | 完成 | T-001       | Web 和 API 可启动并健康检查           |
| T-003 | PostgreSQL、Drizzle 与核心 Schema | 完成 | T-002       | migration 成功，核心表有测试          |
| T-004 | 本地用户与 Project CRUD           | 完成 | T-003       | 可创建、读取、更新、删除项目          |
| T-005 | 应用布局与项目仪表盘              | 完成 | T-004       | 可从项目列表进入工作区                |
| T-006 | Story Bible、规则与 Lore          | 完成 | T-004       | 三类数据可完整 CRUD                   |
| T-007 | 角色与人物关系                    | 完成 | T-004       | Character Sheet 和关系可维护          |
| T-008 | 故事线与 StoryNode API            | 完成 | T-004       | 节点可排序并关联角色/Lore             |
| T-009 | 故事线画布                        | 完成 | T-008       | 节点可创建、拖动、连线和保存          |
| T-010 | 时间轴视图                        | 完成 | T-008       | 与画布共享节点和排序数据              |
| T-011 | 正文编辑器与自动保存              | 完成 | T-008       | 正文可恢复且关联 StoryNode            |
| T-012 | 伏笔、灵感与统计                  | 完成 | T-008,T-011 | 可追踪伏笔并显示基础统计              |
| T-013 | 导出、备份与恢复                  | 完成 | T-011,T-012 | 可导出 MD/正文并恢复项目              |
| T-014 | AI Provider 与故事线章节生成      | 完成 | T-006,T-011 | 按当前节点生成并逐步推进既定结局      |
| T-015 | Docker、E2E 与发布文档            | 完成 | T-013,T-014 | 主流程测试通过，一条命令启动          |
| T-016 | AI 原生架构审计与路线图           | 完成 | T-015       | 功能差距、目标架构和任务顺序落盘      |
| T-017 | 账号、登录与本地管理员迁移        | 完成 | T-016       | 本地/NAS 模式具备安全会话             |
| T-018 | AI 设置中心、Provider 与加密密钥  | 完成 | T-017       | 文本/图片模型可独立配置               |
| T-019 | AI 编排、生成记录与审批流程       | 完成 | T-018       | 所有 AI 任务共享可靠执行底座          |
| T-020 | Story Graph 2.0 与显式节点边      | 完成 | T-016       | 主动连线、缩放、平移和小地图可用      |
| T-021 | 圣经、世界、角色和故事线 AI 生成  | 完成 | T-019,T-020 | 结构化候选可审批写入                  |
| T-022 | 时间轴检查器与场景/技能模型       | 完成 | T-020       | 右侧面板可维护场景上下文              |
| T-023 | 本地/NAS 素材库与图片 Provider    | 完成 | T-018,T-022 | 图片生成、上传和实体关联可用          |
| T-024 | AI 分镜与定格/剪纸动画播放器      | 完成 | T-021,T-023 | 故事线可生成并播放分镜                |
| T-025 | 长任务、NAS 安全与全链路 E2E      | 完成 | T-024       | 升级版可自托管发布                    |

## 当前任务记录

### T-000 统一项目规划与成本策略

- 状态：完成
- 完成日期：2026-06-12
- 产出：
  - `README.md`
  - `docs/PROJECT_PLAN.md`
  - `PROGRESS.md`
- 关键决定：
  - 使用模块化单体代替首版多服务架构。
  - MVP 仅要求 Web、API、PostgreSQL 三个核心服务。
  - Redis、BullMQ、MinIO、Yjs WebSocket、平台积分和付费 AI 延后。
  - AI 默认使用用户自带 Key，也允许连接本地兼容服务。
  - 素材首版保存到本地文件系统，通过适配器预留 S3/AWS 迁移。
  - Docker Compose 需兼顾群晖、威联通、TrueNAS 等 NAS 部署场景。
- 验证：
  - 已对照两份原始文档整理功能范围。
  - 已拆分里程碑、任务依赖和验收标准。

### T-001 初始化 Git、Monorepo 与质量工具

- 状态：完成
- 完成日期：2026-06-12
- 变更：
  - 初始化 Git 仓库，默认分支为 `main`。
  - 配置 npm workspaces：`apps/*` 与 `packages/*`。
  - 配置 TypeScript 严格模式和 Node.js 20 最低版本。
  - 配置 ESLint flat config、Prettier 和 Vitest。
  - 添加统一的 `build`、`dev`、`format`、`lint`、`typecheck`、`test`、`check` 脚本。
  - 添加 `.gitignore`、`.editorconfig`、`.npmrc`、`.nvmrc` 和工具链基线测试。
- 工具版本：
  - TypeScript `5.9.3`
  - ESLint `9.39.4`
  - Prettier `3.8.4`
  - Vitest `3.2.6`
- 验证：
  - `npm install` 成功，审计结果为 0 个已知漏洞。
  - `npm run check` 通过。
  - Vitest：1 个测试文件、1 个测试通过。
- 关键决定：
  - 项目最低支持 Node.js 20，开发机可使用当前 Node.js 24。
  - ESLint 负责静态规则，完整类型检查由独立 `tsc` 命令执行。
- 遗留问题：
  - 仓库尚无首次提交，待应用骨架稳定后再决定提交点。

### T-002 创建 Web、API、contracts 与 domain 工作区

- 状态：完成
- 完成日期：2026-06-12
- 变更：
  - 创建 React 19 + Vite 8 Web 工作区。
  - 创建 Hono API 工作区与 `/health` 健康检查。
  - 创建 Zod contracts 工作区，共享并运行时校验 API 契约。
  - 创建无框架依赖的 domain 工作区和项目名称规则示例。
  - 根级 `dev`、`build`、`typecheck` 和 Vitest 已覆盖所有工作区。
  - 开发端口使用 `4310/4311`，后续 PostgreSQL 预留宿主机端口 `55432`。
- 验证：
  - `npm audit`：0 个已知漏洞。
  - `npm run build`：四个工作区全部构建成功。
  - Vitest：5 个测试文件、6 个测试通过。
  - Hono API `http://127.0.0.1:4310/health` 返回预期 JSON。
  - Vite Web `http://127.0.0.1:4311` 返回 HTTP 200。
  - Web `/api/health` 代理到 API 成功。
  - 现有 Docker 容器继续使用 `3000/8080/6379/3306`，与 StoryVerse 无冲突。
- 关键决定：
  - 开发服务器启用严格端口模式，不允许冲突时自动换端口。
  - 所有宿主机端口允许通过环境变量覆盖。
  - 新增 `F-AI-001` 故事线驱动章节生成需求：章节围绕当前节点，并按里程碑推进结局。
- 遗留问题：
  - Browser 插件缺少运行文件，未完成浏览器自动化；HTTP 与代理链路已手动验证。
  - Vite 8 构建时 React Babel 插件输出弃用警告，当前不影响构建或运行。
  - 仓库尚无首次提交。

### T-003 PostgreSQL、Drizzle 与核心 Schema

- 状态：完成
- 完成日期：2026-06-13
- 变更：
  - 添加独立 `storyverse` Docker Compose 项目和 PostgreSQL 17。
  - PostgreSQL 使用可配置宿主机端口 `55432`、独立网络和命名卷。
  - 接入 Drizzle ORM、PostgreSQL 驱动、migration 生成与执行脚本。
  - 创建 13 张首批表及枚举、外键、唯一索引和检查约束。
  - 增加故事线结局目标、里程碑、节点目标和生成约束字段。
  - 新增独立 `chapters` 表，正文不再直接存入 StoryNode。
  - 添加 migration 幂等验证和事务回滚式数据库 smoke test。
  - 记录 ADR：`docs/decisions/0001-separate-chapters-from-story-nodes.md`。
- 数据库表：
  - `users`、`projects`、`project_members`
  - `story_bibles`、`world_rules`、`lore_entries`、`characters`
  - `storylines`、`storyline_milestones`、`story_nodes`、`chapters`
  - `story_node_characters`、`story_node_lore_entries`
- 验证：
  - PostgreSQL 容器健康检查通过。
  - 首个 SQL migration 成功生成并重复应用。
  - Drizzle `check` 通过。
  - 数据库 smoke test 完成完整写入、关联查询和事务回滚。
  - 测试后业务表数据为 0，未残留 smoke 数据。
  - `npm run check`：6 个测试文件、8 个测试通过。
  - 全部 workspace 构建成功。
  - `npm audit --omit=dev`：生产依赖 0 个已知漏洞。
  - 测试结束后已停止 StoryVerse PostgreSQL，数据卷保留，`55432` 已释放。
  - 其他 Docker 容器和端口映射未发生变化。
- 关键决定：
  - StoryNode 管理剧情结构，Chapter 独立管理正文和修订。
  - MVP 保持一个 StoryNode 至多对应一章，后期可扩展为多章。
  - 当前里程碑由第一个未完成里程碑推导，不保存易失效的指针。
  - StoryVerse Compose 资源统一使用独立项目名前缀。
- 遗留问题：
  - 完整 npm 审计仍有 4 个 Drizzle Kit 开发期依赖告警；不进入生产运行依赖，
    等待官方稳定版升级 esbuild 后移除。
  - 跨表的 `project_id` 一致性由 T-004/T-008 服务层事务校验。
  - 仓库尚无首次提交。

### T-004 本地默认用户与 Project CRUD

- 状态：完成
- 完成日期：2026-06-13
- 变更：
  - API 启动时幂等创建唯一的本地默认用户。
  - 新增数据库级部分唯一索引，保证最多一个 `is_local=true` 用户。
  - 新增 Project 的共享 Zod 请求、响应和错误契约。
  - 新增 Project Repository、Service 与 Hono REST 路由。
  - 创建项目时使用事务同步写入 owner 成员记录。
  - 所有读取、更新和删除查询同时校验 `project_id` 与 `owner_id`。
  - 名称和风格样本在 domain 层统一规范化。
  - 新增独立 PostgreSQL 集成测试配置。
- API：
  - `GET /projects`
  - `POST /projects`
  - `GET /projects/:id`
  - `PATCH /projects/:id`
  - `DELETE /projects/:id`
- 验证：
  - 第二个 migration 成功生成并应用。
  - `npm run check`：8 个测试文件、13 个测试通过。
  - PostgreSQL 集成测试：1 个文件、2 个测试通过。
  - 真实 API 入口完成创建、列表、更新和删除验收。
  - 空白名称与无效 ID 返回结构化 400 错误。
  - 删除后的项目返回结构化 404 错误。
  - 测试后数据库仅保留 1 个本地用户，项目与成员记录均为 0。
  - 全部 workspace 构建成功。
  - `npm audit --omit=dev`：生产依赖 0 个已知漏洞。
  - 测试完成后 API 与 PostgreSQL 均已停止，端口已释放。
- 关键决定：
  - 本地模式通过固定 owner scope 访问项目，为后续认证替换保留 Service 边界。
  - Project 创建与 owner 成员关系必须处于同一事务。
  - 集成测试只清理自身创建的项目，不清空开发数据库。
- 遗留问题：
  - 正式账号系统启用时，需要把本地默认用户资源迁移或绑定到真实账号。
  - 仓库尚无首次提交。

### T-005 应用布局与项目仪表盘

- 状态：完成
- 完成日期：2026-06-13
- 变更：
  - 接入 React Router 与 TanStack Query。
  - 实现项目列表、创建、编辑、删除和项目工作区导航。
  - 建立概览、创作圣经、世界设定、角色、故事线、时间轴、正文和设置路由。
  - 开发端继续使用严格的 `4310/4311` 端口策略。
- 验证：
  - Web TypeScript 类型检查、ESLint 和生产构建通过。
  - Vite 生产包构建成功。
- 遗留问题：
  - Browser 插件运行文件仍缺失，本次以构建和 HTTP/API 集成验证代替视觉自动化。

### T-006 Story Bible、规则与 Lore

- 状态：完成
- 完成日期：2026-06-13
- 变更：
  - 新增 Story Bible 单项目读取、更新或创建、删除接口。
  - 新增 World Rule 与 Lore 的完整 CRUD 契约和接口。
  - 增加创作圣经、可执行规则和世界设定页面。
  - Story Bible 保留剧情目标与结局方向，作为后续故事线驱动生成约束。
- 验证：
  - 真实 PostgreSQL 集成测试覆盖 Bible、Rule 与 Lore 写入。
  - 所有资源操作都校验项目 owner scope。

### T-007 角色与人物关系

- 状态：完成
- 完成日期：2026-06-13
- 变更：
  - 新增 `character_relations` 表、外键、唯一索引和强度约束。
  - 新增 Character 与 CharacterRelation 完整 CRUD 契约和接口。
  - 增加角色列表、角色创建和人物关系维护页面。
  - 关系创建验证两个角色属于同一项目，并禁止角色指向自身。
- 验证：
  - 第三个 migration 成功生成、应用并重复应用。
  - Schema 与契约测试覆盖角色关系约束。

### T-008 故事线、里程碑与 StoryNode API

- 状态：完成
- 完成日期：2026-06-13
- 变更：
  - 新增 Storyline、StorylineMilestone 与 StoryNode 完整 CRUD 契约和接口。
  - StoryNode 可保存排序、画布坐标、节点目标、冲突、必须事件和状态。
  - StoryNode 可关联角色与 Lore，关联写入或替换使用数据库事务。
  - 服务层验证故事线、里程碑、角色和 Lore 与节点属于同一项目。
  - 增加故事线与节点基础页面，为 T-009 画布提供数据基础。
- 验证：
  - `npm run check`：9 个测试文件、16 个测试通过。
  - PostgreSQL 集成测试：2 个文件、4 个测试通过。
  - 跨项目 StoryNode 关联返回 409。
  - 全部 workspace 生产构建成功。
  - `npm audit --omit=dev`：生产依赖 0 个已知漏洞。
  - 测试后仅保留 1 个本地用户，业务数据为 0。
- 关键决定：
  - T-008 先提供轻量列表与表单，不提前引入画布组件。
  - 画布坐标已进入 StoryNode Schema，T-009 无需再迁移基础坐标字段。
  - 继续使用免费开源依赖，不增加云服务或付费组件。

### T-009 故事线画布

- 状态：完成
- 完成日期：2026-06-13
- 变更：
  - 使用原生 Pointer Events 实现节点拖动，不新增重量级画布依赖。
  - 节点按结构顺序显示连线，松开后保存画布坐标。
  - 支持直接创建故事线和节点。
- 验证：
  - 坐标更新 API、类型检查和生产构建通过。

### T-010 时间轴视图

- 状态：完成
- 完成日期：2026-06-13
- 变更：
  - 新增横向故事时间轴。
  - 与画布共享 StoryNode、排序、故事时间和关键场景字段。
  - 不创建重复时间轴表，避免多份结构数据冲突。

### T-011 正文编辑器与自动保存

- 状态：完成
- 完成日期：2026-06-13
- 变更：
  - 新增按 StoryNode 幂等读取和保存 Chapter 的 API。
  - 服务端重新计算字数并递增修订号。
  - 停止输入 1.2 秒后自动保存。
  - 未提交正文先写入 IndexedDB，服务端成功后清理本地草稿。
- 验证：
  - 集成测试验证重复保存和 revision 递增。

### T-012 伏笔、灵感与统计

- 状态：完成
- 完成日期：2026-06-13
- 变更：
  - 新增 `foreshadows`、`inspirations` 表、契约和 CRUD API。
  - 新增伏笔追踪、灵感收件箱和仪表盘统计。
  - 高重要度伏笔缺席 20 章、中重要度缺席 40 章时计入预警。
- 关键决定：
  - 预警使用本地确定性规则，不调用 AI，不产生 token 成本。

### T-013 导出、备份与恢复

- 状态：完成
- 完成日期：2026-06-13
- 变更：
  - 支持项目 Master Markdown、正文 Markdown 和正文 TXT 导出。
  - 新增 PostgreSQL 项目快照、JSON 下载和事务恢复。
  - 快照覆盖故事设定、角色、故事结构、节点关联、章节、伏笔和灵感。
  - 导出直接在浏览器下载，不依赖对象存储或第三方云服务。
- 验证：
  - 第四个 migration 成功应用，数据库共 17 张表。
  - `npm run check`：10 个测试文件、18 个测试通过。
  - PostgreSQL 集成测试：3 个文件、5 个测试通过。
  - 集成测试覆盖章节、统计、导出、快照创建和恢复。
  - 全部 workspace 生产构建成功。
  - `npm audit --omit=dev`：生产依赖 0 个已知漏洞。
  - API 健康检查正常，Web 首页返回 HTTP 200。
- 遗留问题：
  - Browser 安全策略阻止访问本机 URL，未完成自动视觉点击验收。
  - Vite React 插件仍有已记录的弃用警告，不影响构建。

### T-014 AI Provider 与故事线驱动章节生成

- 状态：完成
- 完成日期：2026-06-13
- 变更：
  - 新增 OpenAI 兼容 Provider，支持 Chat Completions 与 Responses 两种协议。
  - 默认支持本地 Ollama，也允许用户填写兼容服务地址、模型和自带 API Key。
  - 生成上下文包含 Story Bible、全局约束、故事线结局、里程碑、当前与下一节点、角色、Lore、未回收伏笔及近期章节摘要。
  - AI 输出正文候选与剧情推进报告，报告包含节点目标、里程碑进度、人物/世界变化、伏笔变化、结局对齐和下一章目标。
  - 候选内容必须由用户手动采纳，不自动覆盖正文或修改故事结构。
- 关键决定：
  - API Key 仅保存在当前页面内存中，不写入数据库或浏览器持久存储。
  - AI 只提出结构推进建议，不直接更新节点、里程碑或伏笔状态。
  - 默认本地免费模型优先，付费兼容服务保持可选。
- 验证：
  - 单元测试验证提示词包含当前目标、全部里程碑、下一节点、既定结局和全局约束。
  - PostgreSQL 集成测试使用无成本 Fake Provider，验证生成上下文、结构化报告及“生成不落库”边界。

### T-015 Docker、NAS 部署、E2E 与发布文档

- 状态：完成
- 完成日期：2026-06-13
- 变更：
  - 新增 Web/API 多阶段 Dockerfile、Nginx SPA/反向代理配置和 `.dockerignore`。
  - Compose 可一条命令启动 Web、API 与 PostgreSQL，使用独立项目网络和可覆盖端口。
  - 支持 NAS 自定义数据目录，补充反向代理、HTTPS、备份恢复、升级及本地 Ollama 配置说明。
  - 新增 HTTP E2E 冒烟脚本，覆盖首页、健康检查、项目、故事线、节点、正文、导出和清理。
- 验证：
  - `docker compose -p storyverse config` 通过。
  - 三个镜像构建成功，PostgreSQL 与 API 健康检查通过，Web 可访问。
  - `npm run test:e2e` 通过，测试项目和章节已自动删除。
  - `npm run check`：11 个测试文件、19 个测试通过。
  - PostgreSQL 集成测试：4 个文件、6 个测试通过。
  - 全部 workspace 生产构建成功。
  - 主机生产依赖及最终 API 镜像 `npm audit --omit=dev` 均为 0 个已知漏洞。

## 关键决策日志

| 日期       | 决策                   | 原因                                               |
| ---------- | ---------------------- | -------------------------------------------------- |
| 2026-06-12 | MVP 采用模块化单体     | 减少服务数量、资源占用和维护成本                   |
| 2026-06-12 | PostgreSQL 保持不变    | 免费开源，且未来迁移 RDS/Neon/Supabase 容易        |
| 2026-06-12 | 暂不使用 Redis/队列    | MVP 没有必须可靠异步执行的任务                     |
| 2026-06-12 | 本地文件存储优先       | 零云存储成本，保留 S3 Adapter                      |
| 2026-06-12 | BYOK 和本地 AI 优先    | 避免平台承担 token 成本                            |
| 2026-06-12 | 动画与协作延后         | 两者开发和基础设施成本较高，不影响首个写作闭环     |
| 2026-06-12 | 支持 NAS Docker 部署   | 复用现有硬件可以降低早期服务器和存储成本           |
| 2026-06-12 | 故事线驱动章节生成     | 保证 AI 正文围绕节点目标并持续推进既定结局         |
| 2026-06-13 | 正文与 StoryNode 分离  | 降低结构编辑、自动保存和版本历史之间的耦合         |
| 2026-06-13 | 独立 Compose 项目名    | 避免容器、网络、数据卷和端口与其他项目冲突         |
| 2026-06-13 | 固定本地 owner scope   | 无认证也保持所有权边界，便于后续替换为真实用户     |
| 2026-06-13 | Project 创建使用事务   | 避免项目存在但 owner 成员记录缺失                  |
| 2026-06-13 | 创作资源统一归属校验   | 防止跨项目关联污染故事结构                         |
| 2026-06-13 | StoryNode 关联使用事务 | 保证节点与角色、Lore 关联同步成功或回滚            |
| 2026-06-13 | 原生 Pointer 画布      | 零新增依赖即可满足 MVP 拖动与坐标保存              |
| 2026-06-13 | IndexedDB 草稿兜底     | API 保存失败时仍可恢复未提交正文                   |
| 2026-06-13 | 本地规则检查伏笔       | 无需 AI 或付费服务即可提供可解释预警               |
| 2026-06-13 | PostgreSQL 项目快照    | 与 NAS 数据卷备份兼容，恢复保持事务一致性          |
| 2026-06-13 | AI 候选正文手动采纳    | 避免模型输出直接覆盖作者正文或污染故事结构         |
| 2026-06-13 | API Key 仅驻留页面内存 | 降低本地/NAS 环境中密钥落盘和泄露风险              |
| 2026-06-13 | Nginx 统一代理 `/api`  | 浏览器仅需访问 Web 端口，减少 NAS 暴露面和跨域配置 |

## 风险与待确认

| 项目                  | 影响                     | 处理方式                                      |
| --------------------- | ------------------------ | --------------------------------------------- |
| 原始 MVP 范围过大     | 难以尽快发布             | 拆为 MVP-A、MVP-B 和后续阶段                  |
| 技术规格存在重复章节  | 实现时容易引用冲突定义   | 以 `docs/PROJECT_PLAN.md` 为实施基线          |
| 画布交互后续扩展      | 大规模节点可能需要优化   | MVP 使用原生实现，需求明确后再评估 React Flow |
| 多项目端口冲突        | 服务或容器无法启动       | 使用 4310/4311/55432 并允许环境变量覆盖       |
| Browser 本机 URL 受限 | 暂不能自动化点击本地页面 | 保留 HTTP、构建与 API 集成验证                |
| Vite React 插件警告   | 后续版本可能移除旧选项   | 跟踪插件升级，不阻塞当前开发                  |
| Drizzle Kit 开发告警  | migration 工具链风险     | 生产依赖已清零，跟踪官方稳定版更新            |

## 后续推荐任务

原 16 项规划任务已经全部实现并验证，现作为基础 MVP 保留。2026-06-14 起进入 AI 原生升级。

### R-001 人工视觉验收

- 状态：完成
- 完成日期：2026-06-13
- 验收范围：
  - 首页空状态、项目创建和项目工作区导航。
  - 创作圣经、世界设定、角色关系、故事线画布、时间轴、正文、伏笔与灵感及设置页面。
  - 故事线和节点创建、时间轴同步、正文自动保存与刷新恢复。
  - AI 设置面板、本地 Ollama 默认配置、内存 API Key 提示及生成上下文预览。
  - PostgreSQL 项目快照创建和下载/恢复入口。
- 结果：
  - 桌面端核心布局和导航正常，页面无浏览器控制台错误或警告。
  - 正文保存后刷新仍完整保留，故事节点正确同步到时间轴。
  - API 与 Nginx 日志未发现异常响应。
  - 验收项目、章节和快照已清理，未留下测试数据。
- 非阻塞改进：
  - 部分创作表单主要依赖占位文字，后续应补充可见标签或 `aria-label`。
  - 项目删除使用浏览器原生确认框，功能有效，但可在后续替换为应用内确认对话框以统一视觉体验。

### R-002 创建首次 Git 提交

- 状态：完成
- 完成日期：2026-06-13
- 提交范围：
  - Monorepo 工程基线、Web、API、共享契约与领域包。
  - PostgreSQL Schema、迁移、单元测试、集成测试与 E2E 冒烟测试。
  - Docker/NAS 部署配置、项目规划、开发进度和发布文档。
- 提交前检查：
  - `.env`、依赖目录、构建产物、日志和本地数据均已忽略。
  - 未发现真实 API Key、私钥或其他敏感凭据。
  - 示例数据库密码仅用于本地开发，NAS/生产文档明确要求替换。

### R-003 配置免费 CI

- 状态：完成
- 完成日期：2026-06-13
- 变更：
  - 新增 GitHub Actions 工作流，在 `main` 推送、Pull Request 和手动触发时运行。
  - Quality Job 执行格式、Lint、TypeScript、单元测试、生产构建和 Compose 配置校验。
  - Database Job 使用临时 PostgreSQL 17 Service，执行 migration、回滚式 smoke test 和集成测试。
- 成本与安全：
  - 使用 GitHub 托管 Runner 和 npm 缓存，不依赖付费第三方 CI。
  - 同一分支的新运行会取消旧运行，减少免费分钟消耗。
  - `GITHUB_TOKEN` 仅授予 `contents: read`，不上传制品、不构建或推送云镜像。
- 本地验证：
  - 工作流 YAML 已通过 Prettier 解析与格式检查。
  - `npm run check`、`npm run build` 和 `docker compose config --quiet` 通过。
  - PostgreSQL migration、smoke test 和 6 个集成测试通过。
  - 修正 smoke test 用户与已有本地用户唯一约束冲突的问题，支持在空库和已有数据库重复运行。
- 待线上确认：
  - 仓库推送到 GitHub 后，需确认首次 Actions 运行状态和分支保护规则。

### 本地 Docker 部署复验（NAS 前置）

- 状态：完成
- 完成日期：2026-06-13
- 部署：
  - 使用独立 Compose 项目 `storyverse` 构建并启动 Web、API 与 PostgreSQL。
  - Web 使用宿主机端口 `4311`，PostgreSQL 使用 `55432`；API 仅在 Compose 网络内使用 `4310`。
  - 启动前确认端口未被占用，未停止、重建或修改其他项目容器。
- 验证：
  - PostgreSQL 与 API 容器健康检查通过，Web 首页返回 HTTP 200，API 返回 `status: ok`。
  - HTTP E2E 覆盖项目、故事线、节点、正文与导出并通过。
  - E2E 数据已自动删除，数据库中项目和章节数量均为 0。
  - 浏览器首页渲染正常，控制台无错误或警告。
- 当前状态：
  - 本地服务保持运行，可通过 `http://127.0.0.1:4311` 继续人工测试。
  - 后续 NAS 部署沿用当前 Compose 与数据卷方案，并替换数据库密码及持久化目录。

### UI 视觉系统重构

- 状态：完成
- 完成日期：2026-06-14
- 设计依据：
  - `StoryVerse_UI设计规范.md`
  - `ChatGPT Image Jun 13, 2026, 08_30_40 PM.png`
- 变更：
  - 全局替换为“暗夜书房”深紫黑设计系统，统一颜色、边框、圆角、阴影、字体和交互状态。
  - 首页新增品牌侧栏、创作定位和暗色项目卡片，保留原项目 CRUD 功能。
  - 项目工作区重构为固定侧栏、顶部路径栏、内容区和底部连接状态栏。
  - 为导航加入轻量内联 SVG 图标，不增加图标库或外部字体依赖。
  - 仪表盘、故事线点阵画布、时间轴、正文编辑器及 AI 候选面板增加专属视觉样式。
  - 响应式支持窄屏图标侧栏与 1440px 展开侧栏。
- 成本与部署：
  - 不依赖远程字体、付费 UI 套件或新增运行时服务，适合本地与 NAS 离线部署。
- 验证：
  - `npm run check`：11 个测试文件、19 个测试通过。
  - 全部 workspace 生产构建成功。
  - Docker Web 镜像重建并部署成功，API 与 PostgreSQL 保持健康。
  - 首页、仪表盘、故事线和正文页面完成浏览器视觉验收，控制台无错误或警告。

### T-016 AI 原生架构审计与路线图

- 状态：完成
- 完成日期：2026-06-14
- 审计结果：
  - 当前没有注册、登录、会话和权限界面，API 固定使用本地默认用户。
  - AI 仅支持章节生成，配置位于正文页；没有统一 Provider、模型中心或加密密钥存储。
  - Story Bible、世界、角色、关系、故事线和节点均没有 AI 生成能力。
  - 故事画布只有拖动和按数组顺序自动绘线，不支持主动连边、缩放、平移或小地图。
  - 时间轴没有右侧检查器、人物状态、场景、技能、图片素材和播放功能。
  - 素材、图片生成、分镜、定格/剪纸动画和长任务记录尚未实现。
- 架构决定：
  - 保留现有 Monorepo、React、Hono、PostgreSQL、Drizzle、Docker 与核心 CRUD，不推倒重写。
  - 产品定位从“AI 可选增强”调整为“AI 深度参与、人工确认写入”。
  - 故事画布采用 React Flow 和显式 `story_node_edges` 数据模型。
  - 文本与图片 Provider 分开配置，API Key 服务端加密保存。
  - 动画先实现浏览器可编辑分镜播放器，完整视频渲染延后。
  - 详细方案记录于 `docs/AI_NATIVE_ROADMAP.md`。
- 验证：
  - 已核对数据库 Schema、共享契约、API 路由和全部创作工作台实现。
  - 已确认远程仓库为 `https://github.com/brant8/bookAdvanced.git`，本地 `main` 与
    `origin/main` 一致。
- 遗留问题：
  - 当前环境没有可用的 `gh` 命令，尚未读取首次 GitHub Actions 的线上运行结果。
  - NAS 实机部署验收保留到 T-025，不阻塞本地 AI 原生升级。

### T-017 账号、登录与本地管理员迁移

- 状态：完成
- 完成日期：2026-06-14
- 变更：
  - 新增本地模式与账号模式；本地模式继续无感进入。
  - 账号模式首次注册会绑定现有本地所有者，保留全部历史项目。
  - 新增 scrypt 密码哈希、HttpOnly/SameSite Cookie、会话哈希与过期时间。
  - Docker/NAS 可通过 `STORYVERSE_AUTH_MODE=account` 启用登录门禁。
- 验证：
  - 管理员注册、会话识别和退出集成测试通过。
  - 浏览器确认本地模式不会出现多余登录阻断。

### T-018 AI 设置中心、Provider 与加密密钥

- 状态：完成
- 完成日期：2026-06-14
- 变更：
  - 新增文本/图片 Provider、协议、API 地址、默认模型和模型列表。
  - API Key 使用 AES-256-GCM 加密，只向浏览器返回是否已配置。
  - 设置页新增统一 AI Provider 管理界面。
- 验证：
  - 加密保存、服务端解密和列表脱敏集成测试通过。
  - 浏览器完成 Provider 创建、显示和删除验收，测试数据已清理。

### T-019 AI 编排、生成记录与审批流程

- 状态：完成
- 完成日期：2026-06-14
- 变更：
  - 新增 `generation_runs` 统一任务台账。
  - 章节生成记录运行中、完成和失败状态，以及输入摘要和结构化输出。
  - 新增生成记录查询与批准/拒绝 API，设置页可查看项目生成历史。
- 遗留：
  - 已接入章节、结构化创作、图片生成和分镜生成台账；后续长任务队列会继续复用同一框架。

### T-020 Story Graph 2.0 与显式节点边

- 状态：完成
- 完成日期：2026-06-14
- 变更：
  - 新增 `story_node_edges`，支持主流程、分支、并行、因果、伏笔和回收关系。
  - 故事画布替换为 React Flow，支持主动连线、节点拖动、缩放、平移、小地图和适配视图。
  - 节点位置与边均持久化，Delete/Backspace 可删除选中边。
- 验证：
  - 浏览器确认节点、小地图、缩放控制和新版画布正常渲染。
  - 真实 API 完成边的创建、查询和删除，验收边已清理。
  - 浏览器控制台无错误或警告。

### T-021 创作圣经、世界、角色和故事线 AI 生成

- 状态：完成
- 完成日期：2026-06-14
- 变更：
  - 新增统一结构化创作生成接口，支持圣经、Lore、角色和故事线四类任务。
  - 生成时注入现有圣经、世界、角色和故事线上下文。
  - 四个创作页面均增加 Provider 选择、补充要求、候选预览和“采用候选”入口。
  - 生成过程写入 `generation_runs`，失败也保留错误记录。
- 验证：
  - 使用测试 Provider 验证结构化候选和生成记录均正确写入。
  - 浏览器确认创作圣经页面显示 AI 候选工作台。

### T-022 时间轴检查器与场景/技能模型

- 状态：完成
- 完成日期：2026-06-14
- 变更：
  - 新增 `scenes` 与 `character_abilities`。
  - 时间轴重构为节点轨道和右侧检查器，可维护地点、时段、天气、氛围和视觉描述。
  - 检查器显示当前节点参与人物、相关技能、人物图片和场景图片。
  - 角色页增加技能创建和等级显示。
- 验证：
  - 场景写入、读取和角色技能关联集成测试通过。
  - 浏览器确认时间轴右侧检查器完整渲染。

### T-023 本地/NAS 素材库与图片 Provider

- 状态：完成
- 完成日期：2026-06-14
- 变更：
  - 新增素材表和视觉素材工作台，支持角色、场景、背景、道具和参考图。
  - 支持浏览器上传图片，文件写入 `STORYVERSE_UPLOAD_DIR`。
  - Docker 新增独立 `storyverse_uploads` 持久卷，NAS 可改为绝对挂载目录。
  - 图片 Provider 与文本 Provider 独立；支持 OpenAI 兼容图片生成响应的 Base64 或 URL。
  - 第三方生成结果会下载并保存到本地/NAS，不长期依赖远程 URL。
- 验证：
  - 本地素材上传、二进制读取、删除和数据库元数据集成测试通过。
  - 浏览器确认上传与 AI 生图入口正常。

### T-024 AI 分镜与定格/剪纸动画播放器

- 状态：完成
- 完成日期：2026-06-14
- 变更：
  - 新增 `storyboards` 与 `storyboard_shots`。
  - 可选择文本 Provider 生成镜头标题、旁白、视觉提示、时长和转场。
  - 没有可用模型时可免费按故事节点生成分镜草稿。
  - 浏览器播放器支持自动播放、镜头切换、淡入和水平平移动画。
- 验证：
  - 分镜持久化集成测试通过。
  - 浏览器从两个故事节点生成分镜，并自动从镜头 1 播放到镜头 2。
  - 控制台无错误或警告；验收分镜已经清理。
- 遗留：
  - 当前为定格与分层动画第一版，尚未实现多图层人物骨骼、音频轨道和视频导出。

### T-025 长任务可靠性、NAS 安全与全链路 E2E

- 状态：完成
- 完成日期：2026-06-15
- 变更：
  - 新增运行时配置校验：账号模式必须配置至少 32 位 `STORYVERSE_SECRET_KEY`，避免 NAS 上使用默认密钥保存 AI Key。
  - 新增 `STORYVERSE_GENERATION_TIMEOUT_MS`，读取生成记录时会把超时卡住的 `running` 任务标记为 `failed`。
  - 新增 `npm run ops:preflight`，用于 NAS 部署前检查账号模式密钥、默认数据库密码、数据目录、上传目录和端口配置。
  - 扩展 E2E：覆盖健康检查、认证状态、AI Provider、故事线、节点、显式边、角色技能、场景检查器、素材上传/读取/删除、分镜生成、正文和导出。
  - GitHub Actions 新增 Docker E2E Job，在免费 Runner 上启动完整 Compose 栈并运行全链路 E2E。
  - 部署文档更新 NAS 账号模式、加密密钥、上传素材卷、图片 Provider、本地/NAS 备份和长任务恢复说明。
- 验证：
  - `npm run format:check` 通过。
  - `npm run lint` 通过。
  - `npm run typecheck` 通过。
  - `npm run build` 通过。
  - `npm audit --omit=dev`：0 个生产依赖漏洞。
  - `npm run test`：11 个测试文件、19 个测试通过。
  - `npm run test:integration`：8 个测试文件、10 个测试通过。
  - `docker compose up -d --build api web` 成功，API 与 PostgreSQL 健康。
  - `npm run test:e2e` 通过，测试项目与素材已由脚本清理。
- 后续优化：
  - Web 主包约 575 KB 已在 R-006 处理，按路由拆分 React Flow、素材库和分镜播放器。
  - Docker Web 构建阶段安装 dev 依赖时仍显示开发依赖审计警告；生产依赖审计为 0 漏洞。
  - 当前长任务仍是进程内执行；真正的视频导出或大量图片批量生成时再引入独立 Worker。

### R-006 前端路由拆包与包体优化

- 状态：完成
- 完成日期：2026-06-21
- 变更：
  - Web 路由页面改为 `React.lazy` + `Suspense` 按需加载，避免首页同步加载所有工作台页面。
  - React Flow 样式从全局入口移动到故事线页面，进入故事线画布时再加载。
  - Vite 新增手动 chunk 分组，把 React、React Query 和 React Flow 拆为独立产物。
- 验证：
  - `npm run format:check` 通过。
  - `npm run lint` 通过。
  - `npm run typecheck` 通过。
  - `npm run build` 通过。
  - 构建结果不再出现单 chunk 超 500 KB 警告；入口 JS 约 97 KB，React chunk 约 220 KB，React Flow chunk 约 186 KB。
- 关键决定：
  - 优先使用 Vite 原生 code splitting，不引入额外路由框架或付费监控工具，继续保持小成本方案。

### R-008 提交并推送 AI 原生升级与包体优化

- 状态：完成
- 完成日期：2026-06-23
- 变更：
  - 将 T-016 至 R-006 的认证、AI 设置、统一生成、Story Graph 2.0、视觉素材、分镜播放器、NAS 安全、E2E 与前端拆包变更统一提交。
  - 主提交为 `50df9b8 Add AI-native creation and optimize web bundles`。
  - 提交已推送至 `origin/main`，触发 GitHub Actions CI。
- 验证：
  - `git diff --check` 通过。
  - `npm run format:check` 通过。
  - `npm run lint` 通过。
  - `npm run typecheck` 通过。
  - `npm test`：11 个测试文件、19 个测试通过。
  - `npm run build` 通过，最大单个 JS chunk 约 220 KB。
- 遗留问题：
  - 当前环境未安装 GitHub CLI，无法在本地直接查询本次 Actions 运行结果；可通过 GitHub 仓库 Actions 页面查看。

### R-009 NAS 实机部署验收

- 状态：部分完成（本机预演通过，NAS 实机待连接）
- 更新日期：2026-06-23
- 变更：
  - PostgreSQL 宿主端口默认改为仅监听 `127.0.0.1`，避免 NAS 数据库端口暴露到局域网或公网。
  - 新增 `npm run ops:preflight:nas` 严格预检，要求 `.env`、账号模式、强数据库密码、至少 32 位加密密钥、绝对持久化目录和回环数据库绑定。
  - 部署文档补充数据库绑定地址与严格预检命令。
- 验证：
  - 普通本地预检通过，并保留开发配置警告。
  - 严格预检会阻断缺失或不安全配置；使用完整 NAS 示例配置时通过。
  - `docker compose -p storyverse up -d --build` 成功。
  - PostgreSQL 与 API 健康，Web 和 `/api/health` 均返回 HTTP 200。
  - PostgreSQL 实际绑定为 `127.0.0.1:55432`。
  - `npm run test:e2e` 通过；其他项目容器未被启动或修改。
- 待完成：
  - 需要 NAS 地址、部署目录和连接方式后，在目标 NAS 执行严格预检、构建、E2E、重启恢复与备份恢复验收。

### T-026 真实 AI Provider 联调与费用控制

- 状态：部分完成（可靠性与费用控制完成，真实模型凭据待配置）
- 更新日期：2026-06-23
- 变更：
  - 文本与图片 Provider 共用带指数退避的 HTTP 请求层，默认最多尝试 3 次。
  - 仅网络错误、限流、请求超时和服务端错误自动重试；认证与参数错误立即返回。
  - 文本 Chat Completions 和 Responses 请求统一应用 `STORYVERSE_AI_MAX_OUTPUT_TOKENS`，默认 4096，限制单次生成消耗。
  - 新增重试次数、基础退避和 token 上限环境变量，并传入 Docker API 容器。
  - 已禁用或非文本 Provider 不再允许用于文本生成。
- 验证：
  - 新增限流、网络失败、不重试认证失败、Chat Completions token 上限和 Responses token 上限测试。
  - `npm run format:check`、`npm run lint`、`npm run typecheck` 和 `npm run build` 通过。
  - `npm test`：13 个测试文件、24 个测试通过。
  - `npm run test:integration`：8 个测试文件、10 个测试通过。
  - Docker API 容器确认加载重试 3 次、退避 500 ms、最大输出 4096 token。
  - 容器重建后 `npm run test:e2e` 通过。
- 待完成：
  - 本机未安装 Ollama；OpenRouter 真实联调结果见 T-026B。

### T-026B OpenRouter 真实 Provider 联调

- 状态：部分完成（文本完成，图片因零余额安全禁用）
- 更新日期：2026-06-25
- 变更：
  - 配置并加密保存 `OpenRouter 免费文本` Provider，默认模型为 `openrouter/free`。
  - 配置 `OpenRouter 图片` Provider，新增 `openrouter-images` 协议以支持 `/api/v1/images`，但保持禁用。
  - 新增结构化输出重试：空文本或无效 JSON 默认最多生成 2 次；认证、余额和参数错误不重试。
  - 修复 Provider PATCH schema 默认值污染，局部修改名称不会再意外启用已禁用模型。
  - Web 代理 AI 请求超时提高到 360 秒，素材上传上限提高到 20 MB。
- 验证：
  - OpenRouter Key 为免费层，最小真实请求由免费路由完成，36 tokens，费用为 0。
  - StoryVerse 自身接口成功生成结构化角色候选并创建生成记录。
  - OpenRouter 账户余额为 0，图片模型均为付费模型，因此未执行图片生成，避免产生费用或 402 错误。
  - Provider 列表不返回 Key 明文；文本 Provider 启用，图片 Provider 禁用。

### R-007 真实创作样例验收

- 状态：完成
- 完成日期：2026-06-25
- 样例项目：
  - `AI Validation Sample: Echo Archive`
  - 项目 ID：`36a7792c-2dc6-40fa-9103-1218c0045cf7`
- 验收内容：
  - 使用真实免费模型生成并保存创作圣经、角色“林默”、世界设定“记忆税网”、三幕故事线和第一章。
  - 故事线包含 3 个里程碑、3 个主动关联节点和因果边。
- 发现与改进：
  - 首轮 8 条生成记录中 5 条成功、3 条因空文本或无效 JSON 失败，促成结构化输出有限重试。
  - 首版章节提前透露下一节点秘密；章节上下文现只暴露未来里程碑标题与下一节点标题，不再提供未来目标和摘要。
  - A/B 复测章节未命中“自愿存储证据”“记忆用于密钥/证据”“个人记忆被提取”等提前揭晓模式。
  - 改进版第一章已保存，完成当前节点目标并以分析审计碎片推动下一节点。
- 验证：
  - `npm run format:check`、`npm run lint`、`npm run typecheck` 和 `npm run build` 通过。
  - `npm test`：14 个测试文件、26 个测试通过。
  - `npm run test:integration`：8 个测试文件、10 个测试通过。
  - `npm run test:e2e` 通过，StoryVerse 三个容器健康。

### R-010 样例项目第二、三章与结局收束验收

- 状态：完成
- 完成日期：2026-06-27
- 样例项目：
  - `AI Validation Sample: Echo Archive`
  - 项目 ID：`36a7792c-2dc6-40fa-9103-1218c0045cf7`
- 变更：
  - 使用真实 OpenRouter 免费模型生成并保存第二章、第三章。
  - 文本 Provider 默认模型调整为 `cohere/north-mini-code:free`；保留 `openrouter/free`、Gemma 和 Qwen 作为候选。
  - 章节提示新增正文长度硬约束：中文按汉字估算，正文至少达到目标字数 70%，并要求按场景展开而不是写梗概。
  - 对象型结构化生成启用 Chat Completions `response_format: json_object`。
  - 章节报告字段新增安全默认值，模型遗漏 `foreshadowChanges` 等非核心报告字段时不再丢弃正文。
  - 终点节点提示要求 `report.nextChapterGoal` 写“主线已完成，等待作者开启新线”。
- 验收结果：
  - 第二章《真相的反向推导》：1630 字符，完成“确认林默记忆作为加密见证并选择继续调查”节点目标。
  - 第三章《系统崩溃与真相的代价》：1048 字符，完成“公开独立可验证证据并抵达计划结局”节点目标。
  - 导出正文总长约 3442 字符，包含审计碎片、哈希异常、自愿存储和记忆删除等关键收束元素。
  - 第三章 `nextChapterGoal` 已正确收束为“主线已完成，等待作者开启新线”。
- 发现：
  - `openrouter/free` 适合低成本短结构化候选，但长章 JSON 稳定性不足。
  - Gemma 免费模型可连通，但长 JSON 输出多次出现格式错误。
  - Cohere 免费模型在本轮长章生成中表现最好，但模型仍可能给出需要人工复核的警告。

### T-027 Provider 健康检查、模型试运行与费用面板

- 状态：完成
- 完成日期：2026-06-29
- 变更：
  - 合约层新增 `AiProviderTest` 与 `AiUsageSummary`，统一描述 Provider 试运行、费用风险、生成成功率、运行中任务和最近失败。
  - API 新增 `GET /ai/usage-summary` 与 `POST /ai/providers/:id/test`。
  - 文本 Provider 试运行会发起极小 JSON 请求并记录延迟；图片 Provider 健康检查只确认配置与启用状态，不主动生成图片，避免消耗图片额度。
  - 设置页新增“Provider 健康与费用”面板，可查看成功率、运行中数量、失败数量、Provider 风险说明、最近失败和单个 Provider 试运行结果。
  - API 服务启动时把 OpenAI-compatible Provider 注入 AI 设置服务，保证真实文本 Provider 可从健康检查路径调用。
  - 参考 `StoryVerse_Codex_Prompt.md` 中 Claude 给出的框架，确认“导演仪表盘、NVR 时间线、图片流水线、剪纸动画、TTS”方向可实现；它们应作为后续增量任务接在健康/费用/可靠性能力之后。
- 验证：
  - `npm run format:check` 通过。
  - `npm run lint` 通过。
  - `npm run typecheck` 通过。
  - `npm test`：14 个测试文件、27 个测试通过。
  - `DATABASE_URL=postgresql://storyverse:storyverse_dev@localhost:55432/storyverse npm run test:integration`：8 个测试文件、11 个测试通过。
  - `npm run build` 通过；最大 JS chunk 保持在约 220 KB。
  - `docker compose up -d --build` 通过；`storyverse-api-1` healthy，Web 监听 `4311`，Postgres 仅监听 `127.0.0.1:55432`。
  - `/api/health`、`/api/ai/usage-summary`、`/api/ai/providers` 均返回 HTTP 200。
  - OpenRouter 免费文本 Provider 试运行成功，延迟约 2965 ms，风险识别为 `free`。
  - OpenRouter 图片 Provider 当前禁用，试运行安全跳过，风险识别为 `disabled`，未触发图片生成。
  - `npm run test:e2e` 通过。
- 端口与容器：
  - 当前其他项目容器占用 `3000`、`3306`、`6379`、`8080`；StoryVerse 使用 `4311`、`4310`、`127.0.0.1:55432`，未与现有容器冲突。
- 关键决定：
  - 小成本优先：图片健康检查默认不生成真实图片；费用判断先用本地/免费模型、禁用状态和 Provider 类型做保守分级，后续再接更细的余额/用量查询。
  - Claude 框架可落地，但不一次性大改；推荐拆为 Director Dashboard、TimelineRail、图片流水线、动画播放器、TTS 等独立任务，逐步并入现有 StoryVerse 架构。

### R-011 章节编辑体验强化

- 状态：完成
- 完成日期：2026-06-29
- 变更：
  - 正文编辑器新增章节健康条，展示当前字数、节点完成提示、冲突/张力状态。
  - AI 章节生成面板新增目标字数与本章补充指令，可在生成前控制长度和创作重点。
  - AI 候选章节报告从原始 JSON 升级为结构化验收卡，展示长度完成度、故事线推进、结局对齐、下一章目标、警告、节点目标、角色变化、世界变化和伏笔变化。
  - 保留原始 JSON 报告折叠入口，方便后续调试 Provider 输出。

### T-028 导演仪表盘

- 状态：完成
- 完成日期：2026-06-29
- 变更：
  - 合约层新增 `DirectorDashboard`，聚合故事进度、伏笔、角色声音、素材、分镜镜头和最近 AI 任务。
  - API 新增 `GET /projects/:projectId/director-dashboard`。
  - Web 新增“导演视角”页面和侧边栏入口，展示节点完成度、字数、AI 队列、视觉素材、伏笔预警、角色声音绑定、素材分布和最近生成任务。

### T-029 NVR 时间线轨道

- 状态：完成（基础版）
- 完成日期：2026-06-29
- 变更：
  - 合约层新增 `ChapterMeta`，API 新增 `GET /projects/:projectId/chapters/meta`。
  - 新增可复用 `TimelineRail` 组件，支持横向拖拽、滚轮平移、双击回到开头、选中章节、关键场景高亮、章节状态颜色、AI/mixed 来源标记。
  - 正文编辑器和导演仪表盘已接入同一条章节轨道。
- 遗留问题：
  - 当前为轻量基础版，尚未实现惯性滑动、播放头拖动和分镜播放器深度联动；这些适合在动画/分镜任务中继续做。

### T-030 视觉流水线规划与落地

- 状态：完成（低成本基础版）
- 完成日期：2026-07-02
- 变更：
  - 视觉素材页升级为“角色 / 场景 / 技能 → 提示词 → 素材库”的流水线工作台。
  - 新增流水线目标：场景定格图、角色设定图、技能视觉图、世界参考图。
  - 可绑定角色、故事节点和技能，自动生成适合图片模型的视觉提示词。
  - 本地/NAS 上传和 AI 生图统一进入素材库；上传接口新增可选 `characterId` 与 `storyNodeId` 绑定。
  - 图片 Provider 仍需显式选择已启用模型才会调用；未启用图片 Provider 时只支持提示词准备和本地上传，符合小成本策略。
  - 素材库卡片展示类型、来源、角色/节点绑定和 prompt 摘要，方便后续分镜与动画复用。
- 关键决定：
  - 暂不新增数据库表，先复用 `assets.characterId`、`assets.storyNodeId`、`character_abilities` 和 `scenes`。
  - 技能图暂以 `prop` 类型入库，并通过所选技能对应角色建立间接关联；后续若需要技能级素材绑定，再新增 `abilityId` 字段或关联表。
  - 不自动批量生图，避免在图片额度不足或 Provider 计费不清时产生费用。

### T-031 分镜/定格播放器增强

- 状态：完成（浏览器预览版）
- 完成日期：2026-07-02
- 变更：
  - `TimelineRail` 新增可选播放头：`showPlayhead`、`playheadRatio`、`onPlayheadMove`。
  - 分镜播放器接入章节轨道，当前镜头会同步高亮对应故事节点；拖动播放头会跳转到最近镜头。
  - 分镜播放器接入素材库：优先使用镜头绑定素材，其次使用同故事节点的场景素材；没有素材时显示视觉 prompt 定格卡。
  - 播放器从纯文字列表升级为“舞台 + 字幕 + 控制条”结构，加入低成本剪纸动画层：背景层、图片层、前景遮罩层。
  - 新增回到开头、播放/暂停、下一镜控制，镜头条、播放头与当前镜头状态联动。
- 关键决定：
  - 暂不导出真实视频，不引入 FFmpeg、Canvas 录制或外部动画库；先用 CSS 动画完成浏览器内预览。
  - 真正的视频导出、音频混流和批量渲染可在 NAS/Worker 阶段实现，避免本地小成本阶段复杂度膨胀。

本批验证：

- `npm run format:check` 通过。
- `npm run lint` 通过。
- `npm run typecheck` 通过。
- `npm test`：14 个测试文件、27 个测试通过。
- `DATABASE_URL=postgresql://storyverse:storyverse_dev@localhost:55432/storyverse npm run test:integration`：8 个测试文件、11 个测试通过。
- `npm run build` 通过；最大 JS chunk 仍约 220 KB。
- `npm run test:e2e` 通过。
- `docker compose up -d --build` 通过；`storyverse-api-1` healthy，Web 监听 `4311`，Postgres 仅监听 `127.0.0.1:55432`。
- `/api/projects/:projectId/director-dashboard` 与 `/api/projects/:projectId/chapters/meta` 均返回 HTTP 200。
- T-030 追加验证：`/api/projects/:projectId/assets` 返回 HTTP 200；视觉服务集成测试确认上传素材能保留角色/节点绑定。
- T-031 追加验证：`/api/projects/:projectId/storyboard` 返回 HTTP 200；样例项目未生成分镜时返回 `null`，页面会提示先生成分镜。

下一推荐任务可连续执行：

1. **T-032：TTS 与角色声音样本管理，把导演仪表盘的角色声音状态变成可配置工作流**
2. **T-033：视觉素材绑定深化，按需新增技能素材关联、批量提示词队列和素材缺口检查**
3. **T-034：分镜导出规划，设计浏览器预览、NAS Worker、视频导出和音频混流边界**
4. **T-026C：账户具备图片额度后完成真实图片生成与素材持久化验收**
5. **R-009B：连接 NAS 后完成实机部署、备份恢复与重启验收**

T-032 已完成；下一推荐任务：**T-033 视觉素材绑定深化**；随后可继续 **T-034 分镜导出规划**。获得图片额度后继续 **T-026C**，获得 NAS 信息后继续 **R-009B**。

### T-032 TTS 与角色声音样本管理

- 状态：完成（低成本基础版）
- 完成日期：2026-07-05
- 变更：
  - 前端 `creativeApi` 新增角色 PATCH 更新入口，复用现有 `voiceSamples` 合约与数据库字段。
  - 角色页新增“TTS 与角色声音样本”工作台，可选择角色、载入现有样本、按行编辑声线/样本/TTS 提示并保存。
  - 角色卡新增声音配置状态、样本数量和前两条样本预览；导演仪表盘已有的角色声音绑定状态现在有了可维护入口。
  - 新增“生成本地起稿”按钮，仅基于角色姓名和性格生成本地文本草稿，不调用付费 TTS 或外部 AI。
  - API 集成测试覆盖角色声音样本 PATCH 持久化。
- 关键决定：
  - 小成本优先：TTS 本阶段只做声线文本、试听台词和提示词管理，不引入付费语音模型、不保存音频文件。
  - 继续复用 `characters.voiceSamples`，避免为未确定的 TTS Provider 提前设计复杂表结构；后续接入自托管/免费/付费 TTS 时再补 provider、音频资产和队列。
  - 声音样本最多 10 条，每条可承载“声线、样本台词、TTS 提示”等文本，方便后续分镜配音和角色一致性控制。
- 验证：
  - `npm run format:check` 通过。
  - `npm run lint` 通过。
  - `npm run typecheck` 通过。
  - `npm test`：14 个测试文件、27 个测试通过。
  - `DATABASE_URL=postgresql://storyverse:storyverse_dev@127.0.0.1:55432/storyverse npm run test:integration`：8 个测试文件、11 个测试通过，新增断言覆盖 `PATCH /characters/:id` 可保存并返回声音样本。
  - `npm run build` 通过。
  - `npm run test:e2e` 通过。
  - `docker compose up -d --build` 通过；`storyverse-api-1` healthy，Web 监听 `4311`，Postgres 仅监听 `127.0.0.1:55432`，未与当前 `pindan-*` 容器端口冲突。
  - `http://127.0.0.1:4311/api/health` 返回 HTTP 200。
- 下一推荐任务：
  - T-033 视觉素材绑定深化：技能素材关联、批量提示词队列和素材缺口检查。
  - T-034 分镜导出规划：浏览器预览、NAS Worker、视频导出和音频混流边界。
  - T-035 TTS Provider 接入规划：本地/免费优先、音频素材库、角色声线试听与分镜配音队列。

### T-033 视觉素材绑定深化

- 状态：完成（代码完成；Docker/数据库实机验证待 Docker Desktop 启动后复跑）
- 完成日期：2026-07-15
- 变更：
  - 数据库 `assets` 新增可空 `ability_id` 外键，直接绑定 `character_abilities`，并新增索引 `assets_ability_id_idx`。
  - 合约层 `Asset` 与 `GenerateImageInput` 新增 `abilityId`，上传与 AI 生图都能保存技能素材绑定。
  - API 上传路由支持 `abilityId` 表单字段，视觉服务校验技能必须属于当前项目，避免跨项目素材污染。
  - 视觉素材页新增“素材缺口检查”，分别统计缺角色设定图、缺场景定格图、缺技能视觉图。
  - 新增“缺口提示词队列”：根据缺口批量生成本地 prompt 草稿，但不自动调用图片 Provider，继续遵守小成本策略。
  - 素材卡展示技能绑定名称，技能图不再只能通过角色间接关联。
- 关键决定：
  - 技能素材继续使用 `prop` 类型入库，但通过 `abilityId` 建立明确绑定；这样不需要新增 asset kind，也不会破坏现有素材筛选。
  - 批量队列只生成提示词草稿，作者仍需主动载入并选择上传或生图，避免误触付费图片额度。
  - 这次只做视觉资产组织能力，不引入队列 Worker；真正后台批量渲染留给 T-034/T-035 的 NAS Worker 边界设计。
- 验证：
  - `npm run format:check` 通过。
  - `npm run lint` 通过。
  - `npm run typecheck` 通过。
  - `npm test`：14 个测试文件、27 个测试通过。
  - `npm run build` 通过；`AssetsPage` chunk 约 9.30 KB，仍保持轻量。
  - `docker compose up -d --build` 当前未执行成功：Docker Desktop daemon 未运行，报错为无法连接 `dockerDesktopLinuxEngine`。
  - `npm run test:integration` 与 `npm run test:e2e` 待 Docker Desktop 启动后复跑；集成测试已新增技能素材绑定断言。
- 下一推荐任务：
  - T-034 分镜导出规划：浏览器预览、NAS Worker、视频导出和音频混流边界。
  - T-035 TTS Provider 接入规划：本地/免费优先、音频素材库、角色声线试听与分镜配音队列。
  - R-012 Docker 启动后复跑 T-033 migration、集成测试、E2E 和本地部署健康检查。

### T-034 分镜导出规划

- 状态：完成（不使用 Docker 的规划与代码版）
- 完成日期：2026-07-15
- 变更：
  - 合约层新增 `StoryboardExportPlan`，统一描述浏览器预览、NAS Worker、视频导出、音频混流和镜头清单。
  - API 新增 `GET /projects/:projectId/storyboard/export-plan`，从现有分镜和素材库生成可审查的导出计划。
  - 新增纯函数 `buildStoryboardExportPlan`，计算总时长、帧率、估算帧数、缺失素材数量和每个镜头的导出状态。
  - 分镜播放器页面新增“分镜导出规划”面板，展示浏览器预览状态、估算帧数、缺失素材、视频导出状态、NAS Worker 步骤和音频混流边界。
  - 新增单元测试覆盖导出计划的帧数、缺失素材和 Worker 边界计算。
- 关键决定：
  - 当前不引入 FFmpeg、Canvas 录制、后台 Worker 或新容器；浏览器只负责低成本预览。
  - 真正 MP4/WebM 渲染、图片序列生成、TTS 音轨渲染和音频混流留给可选 NAS Worker。
  - 导出计划 API 先作为 Worker 合约边界，后续 Worker 可以按该 JSON 读取素材、渲染帧序列、混流并写入 NAS 导出目录。
  - 音频混流只定义 narration、character-dialogue、sfx、music-bed 轨道边界；真实 TTS Provider 与音频素材库接入放到 T-035。
- 验证：
  - `npm run format:check` 通过。
  - `npm run lint` 通过。
  - `npm run typecheck` 通过。
  - `npm test`：15 个测试文件、28 个测试通过。
  - `npm run build` 通过；`StoryboardPage` chunk 约 6.30 KB，仍保持轻量。
  - 本轮按用户要求不使用 Docker，因此不执行 `docker compose`、数据库集成测试或 E2E。
- 下一推荐任务：
  - T-035 TTS Provider 接入规划：本地/免费优先、音频素材库、角色声线试听与分镜配音队列。
  - R-012 Docker 可用后复跑 T-033/T-034 的 migration、集成测试、E2E 和本地部署健康检查。

### T-035 TTS Provider 接入规划

- 状态：完成（不使用 Docker 的规划与浏览器试听版）
- 完成日期：2026-07-15
- 变更：
  - 合约层新增 `TtsDubbingPlan`，统一描述 Provider 选项、角色声线准备度、分镜配音队列和音频素材库边界。
  - API 新增 `GET /projects/:projectId/storyboard/tts-plan`，基于角色 `voiceSamples` 与现有分镜生成配音计划。
  - 新增纯函数 `buildTtsDubbingPlan`，优先推荐浏览器 `speechSynthesis` 免费试听，再规划本地/自托管 TTS，付费云 TTS 延后。
  - 分镜播放器页面新增“TTS 配音计划”面板，展示免费/本地/付费 Provider 路线、角色声线准备、音频素材边界和镜头配音队列。
  - 配音队列新增“浏览器试听”按钮，仅调用浏览器本地 SpeechSynthesis，不访问外部 API、不产生费用。
  - 新增单元测试覆盖有声线样本时队列 ready、无声线样本时仍需补样本。
- 关键决定：
  - 当前不修改 `ai_provider_kind` 数据库枚举，不新增 `tts` Provider 类型，避免在未验证工作流前引入 migration 和 Provider 复杂度。
  - TTS 的真实生成、音频文件持久化、音频资产表和成本面板联动留到后续任务；本阶段只建立计划和低成本试听。
  - 优先顺序固定为：浏览器本地试听 -> 本地/自托管 TTS -> 明确预算后的付费云 TTS。
  - 角色声线继续复用 T-032 的 `voiceSamples`，音频混流继续承接 T-034 的 narration、character-dialogue、sfx、music-bed 轨道边界。
- 验证：
  - `npm run format:check` 通过。
  - `npm run lint` 通过。
  - `npm run typecheck` 通过。
  - `npm test`：16 个测试文件、30 个测试通过。
  - `npm run build` 通过；`StoryboardPage` chunk 约 8.60 KB，仍保持轻量。
  - 本轮继续按用户要求不使用 Docker，因此不执行 `docker compose`、数据库集成测试或 E2E。
- 下一推荐任务：
  - T-036 导出 Worker 雏形：仅做本地/NAS 文件任务队列，不实际引入昂贵云服务。
  - T-037 音频素材库与 TTS 真实 Provider 预留：在需要时再新增 schema、成本控制和 Provider 适配器。
  - R-012 Docker 可用后复跑 T-033/T-034/T-035 的 migration、集成测试、E2E 和本地部署健康检查。

### T-036 导出 Worker 雏形

- 状态：完成（不使用 Docker 的本地/NAS 文件队列版）
- 完成日期：2026-07-15
- 变更：
  - 合约层新增 `StoryboardWorkerQueue`，描述本地/NAS 文件任务队列、根目录、导出目录、阻塞原因和任务依赖。
  - API 新增 `GET /projects/:projectId/storyboard/worker-queue`，由 T-034 导出计划与 T-035 配音计划合成 Worker 队列。
  - 新增纯函数 `buildStoryboardWorkerQueue`，生成目录准备、素材解析、帧序列渲染、音频准备、预览混流和 manifest 写入任务。
  - 分镜播放器新增“导出 Worker 队列”面板，展示任务路径、队列状态、阻塞项、任务依赖和输出文件位置。
  - 新增单元测试覆盖缺素材时队列 blocked、素材和配音队列齐备时可进入后续 Worker 实现。
- 关键决定：
  - 当前只生成 JSON 任务清单，不启动常驻 Worker、不写视频、不运行 FFmpeg、不引入 Redis/BullMQ/云队列。
  - Worker 默认模式为 `nas-file`，用 `/data/tmp/storyboard-render/:projectId` 和 `/data/exports/:projectId` 作为后续 NAS 挂载边界。
  - 队列状态由现有导出计划和 TTS 计划推导；缺分镜、缺视觉素材或缺配音队列都会在 warnings 中暴露。
  - 真正 Worker 执行器留到后续任务，可读取此队列 JSON 后执行本地/NAS 文件任务。
- 验证：
  - `npm run format:check` 通过。
  - `npm run lint` 通过。
  - `npm run typecheck` 通过。
  - `npm test`：17 个测试文件、32 个测试通过。
  - `npm run build` 通过；`StoryboardPage` chunk 约 10.29 KB，仍保持轻量。
  - 本轮继续按用户要求不使用 Docker，因此不执行 `docker compose`、数据库集成测试或 E2E。
- 下一推荐任务：
  - T-037 音频素材库与 TTS 真实 Provider 预留：需要时再新增 schema、成本控制和适配器。
  - T-038 Worker 执行器本地 dry-run：读取队列 JSON，写 manifest，不渲染视频。
  - R-012 Docker 可用后复跑 T-033 至 T-036 的 migration、集成测试、E2E 和本地部署健康检查。

## 更新模板

完成后在本文件追加：

```markdown
### T-XXX 任务名称

- 状态：完成
- 完成日期：YYYY-MM-DD
- 变更：
- 验证：
- 关键决定：
- 遗留问题：
- 下一推荐任务：T-XXX
```
