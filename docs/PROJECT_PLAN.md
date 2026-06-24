# StoryVerse 统一项目蓝图

> 状态：基础 MVP 已完成，进入 AI 原生升级
> 更新日期：2026-06-14
> 需求来源：`StoryVerse_PRD (1).md`、`StoryVerse_Codex_Spec (2).md`
> AI 原生升级细则：`docs/AI_NATIVE_ROADMAP.md`

## 1. 项目目标

StoryVerse 是一个中文优先的 AI 原生 Web 创作工具。它以统一的故事节点为核心，把世界观、
角色、故事线、时间轴、伏笔、正文、视觉素材和分镜连接起来。AI 深度参与规划、生成、审校
和视觉化，但所有正式数据仍由用户确认。

首要目标不是一次实现全部愿景，而是尽快交付以下可用闭环：

1. 创建一个创作项目。
2. 建立创作圣经、角色、Lore 和世界规则。
3. 在故事线中创建并排列情节节点。
4. 将情节节点关联到章节并完成正文写作。
5. 可按故事线生成章节，使每章完成当前节点目标并逐步推进到既定结局。
6. 检查伏笔和基础一致性。
7. 将项目导出为 Markdown 和纯正文。

## 2. 核心原则

### 2.1 产品原则

- AI 是贯穿圣经、世界、角色、故事线、章节、图片和分镜的核心能力。
- 人工创作始终可独立完成，AI 结果默认作为候选内容，不自动覆盖正式数据。
- 同一份数据在画布、时间轴、角色、正文等视图间复用。
- AI 调用必须由用户明确触发，默认使用用户自带 API Key。
- 文本与图片 Provider 分离配置，并允许按任务选择模型。
- 先完成 AI 创作、故事图、视觉时间轴和分镜播放，再开发协作和平台市场。
- 中文优先，同时从代码结构上预留国际化能力。

### 2.2 低成本原则

- 本地开发使用全部免费、开源的组件。
- MVP 不购买云服务器、对象存储、队列、邮件或 AI 平台额度。
- 单机可完成的工作不提前拆分微服务。
- 暂不建设平台积分和平台代付 AI，避免前期资金与滥用风险。
- 云能力通过适配器和环境变量预留，不为“未来也许会用”提前付费。
- 后期有经费时，可迁移到 AWS、Cloudflare、Supabase、Neon 等平台。

## 3. 范围分级

### 3.1 MVP-A：本地核心创作闭环

这是第一个必须完成和验证的版本。

- 本地单用户模式
- 项目 CRUD 与项目仪表盘
- Story Bible 创作圣经
- 世界规则
- Lore 条目
- Character Sheet 与人物关系
- 故事线与 StoryNode 情节卡片
- 基础时间轴
- 伏笔管理与超时提示
- Tiptap 正文编辑器
- 情节节点与章节双向关联
- 故事线驱动的章节生成与推进检查（需用户自带 AI Key）
- 灵感速记
- 写作统计
- Markdown 与纯正文导出
- 本地文件素材上传
- 可选的用户自带 AI Key
- Docker Compose 本地运行

### 3.2 MVP-B：可自托管单用户版

- 邮箱和密码登录
- PostgreSQL 持久化
- API Key 加密存储
- S3 兼容对象存储适配器
- 项目备份与恢复
- 基础版本快照
- 可部署到一台低配主机

### 3.3 Phase 2：增强创作

- 地图上传、地点标记和轻量手绘
- 素材裁剪与本地 REMBG 抠图
- AI 润色、续写、审稿和规则检查
- AI 角色聊天
- 战力系统
- 独立势力系统
- 高级统计分析
- 评论与批注
- 小说文件导入
- 更完整的版本历史

### 3.4 Phase 3：动画与协作

- 剪纸动画场景编辑器与播放器
- 浏览器端 WebM/GIF 导出
- FFmpeg 视频导出
- Yjs 多人实时协作
- 成员与角色权限
- 公开分享和读者模式
- AI 地图生成
- 模拟读者和剧情沙盘

### 3.5 Phase 4：平台化

- IP 宇宙与跨项目资源
- 模板市场
- 创作者社区
- 订阅、平台积分和团队版
- 后台异步视频渲染
- AWS 等商业云基础设施

## 4. 总体架构

### 4.1 MVP 架构选择

采用 TypeScript Monorepo 和模块化单体：

```text
Browser
  |
  v
React Web App
  |
  v
Hono API
  |------------------|
  v                  v
PostgreSQL       Local File Storage
  |
  v
Optional user-owned AI providers
```

MVP 只运行 `web`、`api`、`postgres` 三个核心服务。Nginx、Redis、BullMQ、MinIO、
Yjs WebSocket 均在真正需要时再启用。

### 4.2 为什么暂不照搬原规格的全部服务

原规格一次包含七个服务，适合成熟产品，但会提高本地资源占用、部署复杂度和维护成本。
以下能力暂缓：

| 原设计           | MVP 处理                   | 启用条件               |
| ---------------- | -------------------------- | ---------------------- |
| Redis + BullMQ   | 暂不启用，短任务进程内执行 | 出现可靠异步任务需求   |
| MinIO            | 本地文件系统适配器         | 上云或多实例部署       |
| y-websocket      | 暂不启用                   | 开始多人实时协作       |
| Nginx            | 开发期由 Vite/API 直连     | 自托管生产部署         |
| 平台 AI 积分     | 暂不建设                   | 有预算和计费需求       |
| 独立动画渲染服务 | 暂不建设                   | 浏览器导出无法满足需求 |

### 4.3 可迁移边界

- 数据访问只通过 Repository/Service，不在路由中直接散落 SQL。
- 文件通过 `StorageAdapter` 访问，本地文件与 S3 使用同一接口。
- AI 通过 `AIProvider` 访问，支持 OpenAI 兼容接口和其他供应商。
- 后台任务通过 `JobRunner` 接口执行，首版为进程内实现，后期可替换 BullMQ。
- 实时同步通过独立模块接入，避免业务模型依赖 Yjs。

## 5. 推荐仓库结构

```text
codex-book-advance/
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── app/                 # 路由、布局、Provider
│   │       ├── features/            # 按业务功能组织
│   │       │   ├── projects/
│   │       │   ├── story-bible/
│   │       │   ├── world-rules/
│   │       │   ├── lore/
│   │       │   ├── characters/
│   │       │   ├── storylines/
│   │       │   ├── timeline/
│   │       │   ├── foreshadows/
│   │       │   ├── editor/
│   │       │   ├── inspirations/
│   │       │   ├── assets/
│   │       │   └── export/
│   │       ├── components/ui/
│   │       ├── lib/
│   │       └── styles/
│   └── api/
│       └── src/
│           ├── app/
│           ├── modules/             # route/service/repository/schema
│           ├── db/
│           ├── ai/
│           ├── storage/
│           ├── jobs/
│           └── middleware/
├── packages/
│   ├── contracts/                   # API DTO、共享枚举、Zod schema
│   ├── domain/                      # 无框架依赖的领域规则
│   ├── config/                      # 共享 TS/ESLint 配置
│   └── test-utils/
├── docs/
│   ├── PROJECT_PLAN.md
│   ├── architecture/
│   └── decisions/                   # ADR 架构决策记录
├── data/                            # 本地运行数据，Git 忽略
├── docker/
├── scripts/
├── PROGRESS.md
├── docker-compose.yml
├── package.json
└── README.md
```

相比原规格，前端采用 `features` 而不是按组件类型平铺，后端采用业务模块组织。
这样同一功能的 UI、状态、API 调用和测试更容易一起维护。

## 6. 核心领域模型

### 6.1 必要实体

- `User`：MVP-A 可使用本地默认用户，MVP-B 开启认证。
- `Project`：创作项目根实体。
- `StoryBible`：项目级写作规则和长期目标。
- `WorldRule`：可筛选、可检查的结构化世界规则。
- `LoreEntry`：世界设定条目。
- `Character`、`CharacterRelation`：角色与人物关系。
- `Storyline`：主线或支线。
- `StoryNode`：所有视图共享的核心情节节点。
- `Foreshadow`：伏笔的计划、埋设、出现和揭晓状态。
- `Inspiration`：待整理灵感。
- `Asset`：本地或对象存储中的素材元数据。
- `TextRevision`：正文版本记录。

### 6.2 StoryNode 的职责

`StoryNode` 是首版最重要的聚合点，至少包含：

- 标题、摘要、详细描述
- 所属故事线和排序值
- 故事内时间与时间轴位置
- 关联角色、Lore、地点和伏笔
- 对应章节引用与章节生成目标
- 画布位置
- 创建和更新时间

画布、时间轴和章节顺序需要共享同一个显式排序字段，避免多个视图分别维护冲突顺序。

正文独立存储在 `Chapter`，MVP 使用一节点至多一章。具体理由和扩展方式见
`docs/decisions/0001-separate-chapters-from-story-nodes.md`。

`Storyline` 需要为后续章节生成保留以下结构化信息：

- `ending_goal`：该故事线最终必须到达的结局状态。
- `milestones`：按顺序推进的阶段目标。
- `current_milestone_id`：当前主要推进目标。
- `pacing`：慢速、标准、快速或自定义节奏。
- `generation_constraints`：不可提前揭晓、必须保留和必须回收的约束。

### 6.3 故事线驱动章节生成

功能编号：`F-AI-001`

用户从故事线中的当前 StoryNode 发起章节生成。AI 上下文必须围绕该故事线构建：

1. Story Bible 与相关世界规则。
2. 故事线的结局目标、当前里程碑和剩余里程碑。
3. 当前 StoryNode 的目标、冲突、参与角色和必须发生的事件。
4. 最近章节摘要与尚未回收的伏笔。
5. 下一 StoryNode 的摘要，作为本章结束方向而非提前完成内容。

每次生成的正文必须满足：

- 主要内容服务于当前 StoryNode，不偏离所选故事线。
- 至少推进一个当前阶段目标、角色状态或关键冲突。
- 不得无依据跳过中间里程碑或提前完成最终结局。
- 章节结尾应为下一节点留下自然入口。
- 与其他故事线交叉时，明确主推进线和辅助线。

生成结果除正文外，还应返回结构化的“推进报告”：

- 本章完成的节点目标。
- 推进的里程碑和推进幅度。
- 角色、世界状态与伏笔变化。
- 与结局方向的一致性检查。
- 建议的下一章节目标。

推进报告默认只作为建议。修改节点状态、完成里程碑或调整后续故事线前，必须由用户确认。

## 7. 前端功能结构

### 7.1 页面

- `/`：本地项目列表或登录页
- `/projects/:projectId`：项目仪表盘
- `/projects/:projectId/bible`：创作圣经与世界规则
- `/projects/:projectId/world`：Lore、地图和地点
- `/projects/:projectId/characters`：角色与关系图
- `/projects/:projectId/story`：故事线画布
- `/projects/:projectId/timeline`：时间轴
- `/projects/:projectId/foreshadows`：伏笔管理
- `/projects/:projectId/write/:nodeId`：正文编辑器
- `/projects/:projectId/inspirations`：灵感收件箱
- `/projects/:projectId/assets`：素材库
- `/projects/:projectId/settings`：项目、AI 和导出设置

### 7.2 状态边界

- TanStack Query 管理服务端数据和缓存。
- Zustand 只管理跨页面 UI 状态、选择状态和未提交画布交互。
- 编辑器内容定时保存，并在浏览器 IndexedDB 中保留恢复草稿。
- 联动行为先使用显式 domain commands，不先建设全局通用 EventBus。

## 8. 后端模块

每个业务模块包含 `route`、`service`、`repository`、`schema` 和测试：

- projects
- story-bible
- world-rules
- lore
- characters
- storylines
- story-nodes
- foreshadows
- inspirations
- assets
- export
- ai
- auth（MVP-B）

API 使用 REST 和 JSON。输入、输出统一使用 Zod schema，前后端共享契约。

## 9. AI 与成本控制

### 9.1 MVP 支持范围

- 用户手动配置自己的 API Key。
- 默认支持一个 OpenAI 兼容 Provider，再逐步添加其他供应商适配器。
- 没有 Key 时，所有非 AI 功能仍可使用。
- API Key 只在后端使用；MVP-B 开始必须加密落库。

### 9.2 上下文控制

- Story Bible 使用压缩摘要。
- 角色使用 `bio_compressed` 和少量语气样本。
- Lore 只注入当前节点明确关联的条目。
- 前文优先传节点摘要链，正文只传局部窗口。
- 每次请求展示预计输入范围，用户确认后再调用。
- 记录 token 数和估算费用，但不建设平台计费。
- 章节生成只传当前故事线、当前/相邻节点、相关角色与伏笔，不传全部项目正文。

### 9.3 故事线生成约束

- 生成前展示本章目标、当前里程碑和结局方向，允许用户临时调整。
- 生成后运行纯结构检查，确认当前节点、下一节点和里程碑顺序没有被跳过。
- AI 只生成候选正文和推进报告，不直接更改故事线。
- 用户接受正文后，才更新字数、完成度和里程碑进度。
- 续写时使用最近正文窗口；跨章规划优先使用摘要链以节省 token。

### 9.4 免费优先选项

- 用户可连接本地 Ollama 或其他 OpenAI 兼容本地服务。
- REMBG 优先本地运行，不默认调用付费 Replicate。
- 图片生成进入 AI 原生升级范围，但必须支持本地/NAS 存储，并与文本 Provider 分离。

## 10. 数据、备份与部署

### 10.1 本地开发

- PostgreSQL 使用 Docker 官方镜像。
- 素材写入 `data/uploads`。
- 每日或手动生成项目 JSON/Markdown 备份。
- `data/`、密钥和 `.env` 不进入 Git。

### 10.2 免费或低成本上线顺序

1. 单机 Docker Compose 自托管。
2. 优先考虑在群晖、威联通、TrueNAS 或其他支持 Docker/Container Manager 的 NAS 上部署。
3. 前端可选部署到 Cloudflare Pages 或同类免费静态托管。
4. 数据库可选 Neon/Supabase 免费额度。
5. 素材较少时继续本机或 NAS 存储，之后迁移 Cloudflare R2。
6. 有稳定收入或团队需求后再评估 AWS。

NAS 部署继续复用 Docker Compose，并注意以下约束：

- 应用数据、PostgreSQL 和上传素材必须挂载到 NAS 持久化目录。
- 默认仅在局域网访问；需要公网访问时，应使用 HTTPS、反向代理和访问控制。
- ARM 架构 NAS 使用的容器镜像必须支持 `linux/arm64`。
- 提供数据库与素材目录的定期备份方案。

### 10.3 AWS 迁移映射

| 当前接口            | AWS 目标                  |
| ------------------- | ------------------------- |
| PostgreSQL          | RDS PostgreSQL / Aurora   |
| LocalStorageAdapter | S3                        |
| InProcessJobRunner  | SQS + Worker / ECS        |
| Docker Compose API  | ECS/Fargate 或 App Runner |
| 本地日志            | CloudWatch                |
| 用户密钥加密        | KMS                       |

## 11. 测试策略

- Domain：Vitest 单元测试，覆盖排序、伏笔预警和规则筛选。
- API：路由集成测试，使用独立测试数据库。
- Web：React Testing Library 覆盖表单和关键交互。
- E2E：Playwright 覆盖“建项目 -> 建节点 -> 写正文 -> 导出”主流程。
- 每个任务至少通过类型检查、Lint 和相关测试后才标记完成。

## 12. 里程碑与验收

### M0：工程基线

- Monorepo 可安装、构建和测试。
- Web、API、PostgreSQL 可一条命令启动。
- CI 或本地质量命令固定。

### M1：项目与设定

- 可创建项目。
- 可维护 Story Bible、世界规则、Lore 和角色。
- 数据刷新后不丢失。

### M2：故事结构

- 可创建故事线与节点。
- 可拖动、排序和关联角色。
- 时间轴与画布读取同一节点数据。

### M3：写作闭环

- 可在节点中编写正文并自动保存。
- 可管理伏笔和灵感。
- 仪表盘显示基础统计。
- 可导出 Markdown 和纯正文。

### M4：AI 章节生成基线

- 用户可配置自己的兼容 API。
- 至少完成润色和续写两种任务。
- 请求只发送选定的最小上下文。
- 可从 StoryNode 生成章节，并输出故事线推进报告。
- 测试覆盖“不偏离当前节点、不跳过里程碑、不提前完成结局”。

### M5：首个可发布版本

- 完成备份恢复、错误提示和 E2E 主流程。
- 提供本地部署文档。
- 不配置任何付费服务也能使用核心功能。

### M6：AI 原生创作底座

- 具备账号会话、统一 AI 设置中心、加密密钥、模型配置和生成记录。
- Story Bible、世界设定、角色和故事线可以 AI 生成并经过用户审批。
- Story Graph 支持主动连线、缩放、平移、小地图和显式边持久化。

### M7：视觉叙事闭环

- 时间轴右侧可维护人物状态、场景、技能和关联素材。
- 文本与图片 Provider 独立配置，素材保存到本地或 NAS。
- 可由故事线生成分镜，并以定格/剪纸动画方式在浏览器播放。

## 13. 初始任务顺序

1. `T-001` 初始化 Git、TypeScript Monorepo 和基础质量工具。
2. `T-002` 创建 Web、API、contracts、domain 工作区。
3. `T-003` 配置 PostgreSQL、Drizzle 和首批核心表。
4. `T-004` 实现本地默认用户与 Project CRUD。
5. `T-005` 实现项目仪表盘骨架与统一应用布局。
6. `T-006` 实现 Story Bible、World Rule、Lore。
7. `T-007` 实现 Character 与 CharacterRelation。
8. `T-008` 实现 Storyline 与 StoryNode API。
9. `T-009` 实现故事线画布和节点排序。
10. `T-010` 实现时间轴共享视图。
11. `T-011` 实现正文编辑器和自动保存。
12. `T-012` 实现伏笔、灵感和统计。
13. `T-013` 实现 Markdown/正文导出和备份。
14. `T-014` 实现可选 AI Provider 与故事线驱动章节生成。
15. `T-015` 完成 Docker Compose、E2E 和发布文档。

## 14. 已确定与待确认事项

### 已确定

- 采用 TypeScript Monorepo。
- 前端 React + Vite，后端 Hono，数据库 PostgreSQL + Drizzle。
- 采用模块化单体，不在 MVP 拆分微服务。
- 核心功能无 AI 也必须可用。
- 默认本地免费方案，保留 AWS 迁移接口。
- NAS Docker 部署作为低成本自托管的重要目标。
- 定格/剪纸动画从远期愿景提升为 AI 原生升级范围；完整视频渲染仍延后。
- 协作和平台化能力继续保留，但延后实现。

### 后续通过原型验证

- Story Graph 2.0 已确定优先使用 React Flow，原型阶段验证大节点量性能。
- 地图手绘是否值得进入 Phase 2，或仅保留上传和标记。
- 本地默认用户模式与正式认证之间的升级迁移方式。
