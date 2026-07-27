> Migrated from `docs/01-PRD-sdkwork-clawrouter.md` on 2026-06-24.
> Owner: SDKWork maintainers

## 1. 产品定位

`sdkwork-clawrouter` 是 SDKWork 体系下的 AI API Router 产品。它围绕 **Rust-first 网关**、标准 OpenAPI 契约和统一 Portal 产品边界建立，不是只做 OpenAI 兼容转发。它要同时满足：

- 面向开发者的统一 AI API 网关。
- 面向企业用户的 API Key、用量、账务、模型、路由、供应商配置自助控制台。
- 面向运营和管理员的后台控制面。
- 面向私有化和本地用户的快速部署产品。
- 面向后续 SaaS、多 Cell、多 Region 的标准化可扩展平台。

核心差异：

1. 前端产品统一到 `apps/sdkwork-clawrouter-pc` 一个应用，内部拆分 public、console、admin 模块。
2. 新版数据库必须遵守 `DATABASE_SPEC.md` 的合同优先、业务前缀、L1/L2/L3 合规标准；Claw Router 本地 schema 只承载网关、路由、审计与组合边界，模型目录、IAM、Commerce 等域表由对应 SDKWork 产品模块在安装时组合。
3. 新版 API 管理面和用户面必须使用 Rust app-api / backend-api 标准路径（`/app/v3/api/**`、`/backend/v3/api/**`）与生成 SDK，不重新发明控制面协议。

## 2. 目标用户

| 用户 | 诉求 | 对应产品面 |
| --- | --- | --- |
| 开发者 | 统一接入 OpenAI 兼容 API，多模型、多 Provider、低迁移成本 | `/v1/*` Gateway、API Reference、SDK Reference、Playground |
| 企业用户 | 管理 API Key、路由、模型偏好、供应商账号、用量、账单、充值 | `/console/*` |
| 平台管理员 | 管理模型、渠道、分组、用量记录、限流、监控与系统设置 | `/admin/*` |
| 运营团队 | 配置模型价格、供应商状态、渠道账号、运行时区域 | `/admin/model`、`/admin/channel`、`/admin/site` |
| 私有化客户 | 快速本地、服务器、Docker、K8S 部署，保留可观测与安全审计 | 部署包、安装向导、运维监控 |
| 平台开发团队 | 使用标准数据库、标准 API SDK、清晰模块边界快速扩展 | 设计文档、契约、SDK、模块规划 |

## 3. 产品面

### 3.1 Public 产品门户

当前 `apps/sdkwork-clawrouter-pc` 已实现的公共路由：

| 能力 | 路由 | 状态 |
| --- | --- | --- |
| 首页 | `/` | 已实现 |
| 模型广场 | `/models`, `/models/:id` | 已实现 |
| 排行榜 | `/rankings` | 已实现 |
| 产品文档 / API Reference / SDK Reference | `/docs`, `/api-reference`, `/sdk-reference` | 已实现（`@sdkwork/documents-pc-*`） |
| Playground | `/playground`, `/c/:conversationId` | 已实现 |
| 应用中心 | `/apps` | **P2 规划** |
| 技能中心（Public） | `/skills` | **P2 规划** |
| 论坛 | `/forum` | **P2 规划** |
| 课程 | `/courses` | **P2 规划** |

### 3.2 Console 用户控制台

当前前端 `/console` 路由作为用户自助工作台（Rust app-api + `@sdkwork/clawrouter-app-sdk`）：

| 路由 | 模块 | 状态 |
| --- | --- | --- |
| `/console/dashboard` | 仪表盘 | 已实现 |
| `/console/usage` | 调用统计 | 已实现 |
| `/console/gateway` | 网关概览 | 已实现 |
| `/console/api-keys` | 令牌管理 | 已实现 |
| `/console/user` | 用户信息 | 已实现 |
| `/console/account`, `/console/checkout`, `/console/recharge` 等 | 钱包与商业化 | 已实现（`@sdkwork/commerce-pc-*` host） |
| `/console/settlements` | 账单报表 | 已实现 |
| `/console/settings` | 配置中心 | 已实现 |
| `/console/notifications` | 通知中心 | 已实现 |
| `/console/routing` | 本地路由 | **已退役**（路由/Provider 治理收敛至 Admin + Gateway） |
| `/console/providers` | 工具配置 | **已退役** |

Console API 统一走 Rust app-api 标准路径，通过 `@sdkwork/clawrouter-app-sdk` 调用。不同部署环境只切换 SDK base URL，不改变资源路径。

### 3.3 Admin 管理后台

当前前端 `/admin` 路由作为 **AI Router 专用**后台控制平面（Rust backend-api + `@sdkwork/clawrouter-backend-sdk`），仅承载网关与路由运维能力；commerce、IAM 用户组织、OAuth、消息、agents/skill/prompts/MCP、file-platform 等平台域能力由 `sdkwork-manager` 或对应域应用承接，不再挂载在 Claw Router Admin。

| 模块 | 路由前缀 | 说明 |
| --- | --- | --- |
| 首页 | `/admin/dashboard` | 运营概览 |
| 模型治理 | `/admin/model/*` | 厂商、资源、上游站点、映射（复用 `@sdkwork/models-pc-admin-catalog`） |
| 渠道与分组 | `/admin/group`、`/admin/channel` | 账号池与渠道供应商 |
| 数据 | `/admin/record`、`/admin/analytics` | 使用记录与统计 |
| 运维 | `/admin/monitor`、`/admin/ratelimit`、`/admin/service-nodes`、`/admin/cache` | 监控、限流、节点、缓存 |
| 系统 | `/admin/settings`、`/admin/runtime-region`、`/admin/site` | 认证、运行区域、站点设置 |

Admin API 统一走 Rust backend-api 标准路径，通过 `@sdkwork/clawrouter-backend-sdk` 调用。不同部署环境只切换 SDK base URL，不改变资源路径。

### 3.4 Gateway 开发者 API

Gateway 面保持行业兼容：

- OpenAI Compatible：`/v1/models`、`/v1/chat/completions`、`/v1/responses`、`/v1/embeddings`、`/v1/images/*`、`/v1/audio/*`、`/v1/files`、`/v1/uploads` 等。
- 后续兼容：Anthropic Messages、Gemini generateContent、OpenRouter provider preferences。
- Gateway 响应保持原协议格式，不包装 `PlusApiResult<T>`。
- 所有协议入口都进入同一条身份解析、路由、配额、计费、审计主链路。

## 4. 核心业务需求

### 4.1 统一 API Router

1. 支持 API Key 鉴权，兼容 `Authorization: Bearer`、`x-api-key`、`x-goog-api-key`、`?key=`。
2. 支持模型别名、能力族识别、Provider 候选集、路由策略、渠道/凭证运行时健康事实、派生健康视图和 fallback；运行时真值写入 `ai_channel` / `ai_channel_credential`，运营快照由 `ops-worker` 异步投影。
3. 支持流式和非流式请求，流式链路保留 request_id、usage finalize 和失败状态。
4. 支持请求明细、路由决策日志、用量事实、计费事件、审计日志。
5. 支持本地轻量 relay 和服务端完整 stateful 运行两种执行语义。

### 4.2 模型与供应商治理

1. 管理 Provider、Channel、Provider Account、Proxy、Credential Reference。
2. 模型目录支持模态、上下文、输入输出能力、价格、区域、数据策略、可用状态。
3. Provider 账号凭据不得写入普通业务表明文字段，只存 secret reference、hash、masked label。
4. 模型发布和渠道变更必须可灰度、可回滚、可审计。

### 4.3 账户和商业化

1. 用户、VIP、账户、优惠券、算力元充值（Token Bank）、订单、支付、退款、发票由 `sdkwork-account`、`sdkwork-order`、`sdkwork-payment`、`sdkwork-iam` 等组合模块提供表结构与 API；Claw Router 只消费生成 SDK 与组合契约，不在本地重复定义资金事实表。
2. 网关用量先沉淀为 AI usage/meter fact，再按规则结转到 Token Bank 算力元账户、VIP 权益或订单支付体系。
3. 余额变更必须同时写账户流水，不能只改余额。
4. 支付回调、充值、退款、兑换码必须有幂等键和外部事件唯一约束。
5. 账单和结算允许构建读模型，但读模型不能成为资金事实来源。
6. Token Plan 必须通过同一套 Membership 目录、Order 购买意图和 Payment 执行模块组合；不同应用只配置 SDK 与运行时装配，不复制套餐、订单或支付逻辑。相同用户对同一有效套餐意图的重复点击复用订单，过期意图才创建新订单。

### 4.4 多部署形态

| 部署形态 | 核心目标 | 数据库 | 缓存 | 典型用户 |
| --- | --- | --- | --- | --- |
| 本地桌面 | 单机快速运行，管理本地 Provider 和个人 Key | SQLite | memory | 个人开发者、离线环境 |
| Server | 单机或少量节点生产部署 | PostgreSQL | Redis 可选 | 企业私有化、小团队 |
| Docker | 标准容器快速交付 | PostgreSQL/SQLite | Redis | 私有化交付、测试 |
| K8S | 多副本、高可用、弹性扩缩容 | PostgreSQL/云数据库 | Redis/云缓存 | SaaS、企业生产 |

## 5. 非目标

1. 不自研模型推理引擎。
2. 不把每个 Provider 做成独立计费和路由系统。
3. 不在前端长期维护手写 HTTP wrapper 或 mock 数据作为业务真值。
4. 不为桌面、Server、Docker、K8S 各写一套业务逻辑。
5. 不把新表命名为 `claw_*`、`router_*`、`sdkwork_*` 这种产品前缀。
6. 不改名或破坏组合模块（Commerce、IAM 等）已发布的公共表结构与 SDK 契约。
7. 不为 App/Backend API 增加 `/claw-router` 这类产品路径前缀；公共业务路径保持 `/app/v3/api/**` 与 `/backend/v3/api/**` 稳定面。
8. 不因数据结构、接口契约、SDK 替换或实现问题擅自改变 `apps/sdkwork-clawrouter-pc` 的 UI 视觉设计、布局、交互风格、组件外观或品牌表达；前端视觉以用户当前设计为准。

## 6. 版本路线

| 阶段 | 目标 | 范围 |
| --- | --- | --- |
| P0 标准冻结 | 完成 PRD、架构、数据库、API、部署、安全、性能设计 | 本文档集 |
| P1 标准化 MVP | Rust 控制面、Console/Admin API、基础 `/v1` 网关、数据库契约、单机部署 | API Key、Provider、Model、Routing、Usage、Account 接入 |
| P2 产品闭环 | 商业化、账务、营销、监控、Docker/K8S、生成 SDK 替换前端 mock | 订单、充值、优惠券、VIP、用量结算、可观测 |
| P3 高性能增强 | Gateway 热路径优化、Redis、本地缓存、异步账务、压测门禁 | 大规模流式、fallback、路由仿真、限流 |
| P4 SaaS/多 Cell | Dedicated Cell、多租户隔离、灰度、跨 Region 灾备 | 企业级 SaaS |

## 7. 成功标准

1. 一个前端应用同时承载 public、console、admin，模块边界清晰。
2. Admin API 与 App API 均可由标准 OpenAPI 生成 `@sdkwork/clawrouter-*` SDK，前端不再依赖手写 mock service。
3. `/v1/*` 兼容请求可以通过标准 API Key 调用，并完成路由、计费、审计闭环。
4. 新建表全部通过 `DATABASE_SPEC.md` 的 L2/L3 评审。
5. 用户、VIP、账户、优惠券、算力元充值（Token Bank）、订单支付等通过领域 SDK 与 IAM 组合模块接入，Claw Router 不维护平行资金表。
6. 四种部署形态能用相同配置模型启动，差异只体现在 profile、数据库、缓存、实例拓扑和 SDK base URL。
7. 同一套前端构建产物可以在本地桌面、私有化 Server、Docker、K8S 与统一 Rust app-api/backend-api 之间自由切换，不修改 API 路径和 DTO。
8. 前端实现接入真实 API/SDK 后，视觉表现与 `apps/sdkwork-clawrouter-pc` 当前用户设计保持一致；如需调整视觉、布局、导航、色彩、字体、间距或组件形态，必须先获得用户明确确认。
9. 发布前有单元测试、API 契约测试、数据库契约检查、基础压测和安全检查证据。
