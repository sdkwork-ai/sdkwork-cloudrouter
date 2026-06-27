# sdkwork-clawrouter PRD

## 1. 产品定位

`sdkwork-clawrouter` 是 Spring AI Plus 体系下的新一代 AI API Router 产品。它围绕 Rust-first 网关、Java-compatible API 和统一 Portal 产品边界建立，不是只做 OpenAI 兼容转发。它要同时满足：

- 面向开发者的统一 AI API 网关。
- 面向企业用户的 API Key、用量、账务、模型、路由、供应商配置自助控制台。
- 面向运营和管理员的后台控制面。
- 面向私有化和本地用户的快速部署产品。
- 面向后续 SaaS、多 Cell、多 Region 的标准化可扩展平台。

核心差异：

1. 前端产品统一到 `apps/sdkwork-clawrouter-pc` 一个应用，内部拆分 public、console、admin 模块。
2. 新版数据库必须遵守 `DATABASE_SPEC.md` 的合同优先、业务前缀、L1/L2/L3 合规标准。
3. 新版必须对齐 Spring AI Plus 既有业务实体表。用户、VIP、账户、优惠券、积分充值、订单支付等表结构保持与 `legacy-java-plus-entity` 完全一致。
4. 新版 API 管理面和用户面必须使用已存在的 backend/app API 标准，不能重新发明一套控制面协议。

## 2. 目标用户

| 用户 | 诉求 | 对应产品面 |
| --- | --- | --- |
| 开发者 | 统一接入 OpenAI 兼容 API，多模型、多 Provider、低迁移成本 | `/v1/*` Gateway、API Reference、SDK Reference、Playground |
| 企业用户 | 管理 API Key、路由、模型偏好、供应商账号、用量、账单、充值 | `/console/*` |
| 平台管理员 | 管理用户、分组、模型、渠道、公告、营销、财务、记录、限流、监控 | `/admin/*` |
| 运营团队 | 配置套餐、优惠券、公告、模型价格、供应商状态、账务对账 | `/admin/marketing`、`/admin/finance`、`/admin/channel` |
| 私有化客户 | 快速本地、服务器、Docker、K8S 部署，保留可观测与安全审计 | 部署包、安装向导、运维监控 |
| 平台开发团队 | 使用标准数据库、标准 API SDK、清晰模块边界快速扩展 | 设计文档、契约、SDK、模块规划 |

## 3. 产品面

### 3.1 Public 产品门户

来源于当前前端 `src/App.tsx` 中公共路由：

- 首页：产品介绍、下载入口、能力概览。
- 模型广场：模型目录、模型详情、Provider、能力、价格和上下文窗口。
- 排行榜：模型维度排行、供应商、开源/商业、模态筛选。
- 应用中心：应用模板、应用详情、开发者生态。
- 技能中心：技能包、工具能力、安装说明。
- 产品文档：产品说明、API Reference、SDK Reference。
- Playground：文本、图像、音频、视频、音乐、Agent 等多模态调试。
- 论坛：帖子、评论、互动。
- 课程：课程列表、视频详情、教程内容。

### 3.2 Console 用户控制台

当前前端已有 `/console` 路由，应作为用户自助工作台：

| 路由 | 模块 | 核心能力 |
| --- | --- | --- |
| `/console/dashboard` | 仪表盘 | 用量、余额、Key 状态、Provider 健康、路由概览 |
| `/console/usage` | 调用统计 | 请求记录、模型维度、错误率、费用、时间窗口分析 |
| `/console/gateway` | 网关概览 | 网关地址、兼容协议、请求示例、健康状态 |
| `/console/routing` | 本地路由 | 渠道、策略、fallback、日志、请求数据、API key 关联 |
| `/console/api-keys` | 令牌管理 | API Key 创建、停用、轮换、权限、模型范围、限流 |
| `/console/user` | 用户信息 | 用户资料、认证、组织、绑定账号 |
| `/console/commerce` | 钱包与充值 | 余额、套餐、支付、充值记录 |
| `/console/checkout` | 结账 | 订单确认、支付方式、优惠券 |
| `/console/settlements` | 账单报表 | 账单、结算、发票、导出 |
| `/console/account` | 账户详情 | 账户余额、流水、积分、VIP、权益 |
| `/console/recharge` | 充值 | VIP/积分/余额充值包、充值方式 |
| `/console/settings` | 配置中心 | 语言、主题、通知、默认路由偏好 |
| `/console/notifications` | 通知中心 | 系统通知、账务提醒、风控提醒 |
| `/console/providers` | 工具配置 | 用户侧 Provider、代理、凭据引用、本地工具 |

Console 的 API 统一走 Java app-api 标准路径 `/app/v3/api/{resource-path}`，通过 `legacy-java-plus-app-api` 生成 SDK 调用。不同部署环境只切换 SDK base URL，不改变资源路径。

### 3.3 Admin 管理后台

当前前端已有 `/admin` 路由，应作为后台控制平面：

| 路由 | 模块 | 核心能力 |
| --- | --- | --- |
| `/admin/dashboard` | 后台仪表盘 | 总请求、收入、活跃用户、故障、容量、SLO |
| `/admin/user` | 用户管理 | 用户、租户、组织、封禁、认证、风险标签 |
| `/admin/group` | 分组管理 | 用户组、API Key 组、权限组、策略绑定 |
| `/admin/model` | 模型平台管理 | 模型目录、能力、价格、可用区、发布状态 |
| `/admin/channel` | 渠道供应商账号 | Provider、Channel、Account、凭据、代理、健康 |
| `/admin/announcement` | 公告管理 | 公告、版本通知、维护窗口 |
| `/admin/marketing` | 营销管理 | 优惠券、活动、兑换码、充值包、权益 |
| `/admin/finance` | 财务管理 | 订单、支付、退款、发票、对账、结算 |
| `/admin/record` | 使用记录 | 请求明细、决策日志、计费事件、审计事件 |
| `/admin/ratelimit` | 限流与风控 | 限流规则、熔断、黑白名单、风险策略 |
| `/admin/monitor` | 运维监控 | 实例、心跳、缓存、队列、任务、告警 |

Admin 的 API 统一走 Java backend-api 标准路径 `/backend/v3/api/{resource-path}`，通过 `legacy-java-plus-backend-api` 生成 SDK 调用。不同部署环境只切换 SDK base URL，不改变资源路径。

### 3.4 Gateway 开发者 API

Gateway 面保持行业兼容：

- OpenAI Compatible：`/v1/models`、`/v1/chat/completions`、`/v1/responses`、`/v1/embeddings`、`/v1/images/*`、`/v1/audio/*`、`/v1/files`、`/v1/uploads` 等。
- 后续兼容：Anthropic Messages、Gemini generateContent、OpenRouter provider preferences。
- Gateway 响应保持原协议格式，不包装 `PlusApiResult<T>`。
- 所有协议入口都进入同一条身份解析、路由、配额、计费、审计主链路。

## 4. 核心业务需求

### 4.1 统一 API Router

1. 支持 API Key 鉴权，兼容 `Authorization: Bearer`、`x-api-key`、`x-goog-api-key`、`?key=`。
2. 支持模型别名、能力族识别、Provider 候选集、路由策略、健康快照、fallback。
3. 支持流式和非流式请求，流式链路保留 request_id、usage finalize 和失败状态。
4. 支持请求明细、路由决策日志、用量事实、计费事件、审计日志。
5. 支持本地轻量 relay 和服务端完整 stateful 运行两种执行语义。

### 4.2 模型与供应商治理

1. 管理 Provider、Channel、Provider Account、Proxy、Credential Reference。
2. 模型目录支持模态、上下文、输入输出能力、价格、区域、数据策略、可用状态。
3. Provider 账号凭据不得写入普通业务表明文字段，只存 secret reference、hash、masked label。
4. 模型发布和渠道变更必须可灰度、可回滚、可审计。

### 4.3 账户和商业化

1. 用户、VIP、账户、优惠券、积分充值、订单、支付、退款、发票必须复用 `legacy-java-plus-entity` 对应表结构。
2. 网关用量先沉淀为 AI usage/meter fact，再按规则结转到账户、积分、VIP 权益或订单支付体系。
3. 余额变更必须同时写账户流水，不能只改余额。
4. 支付回调、充值、退款、兑换码必须有幂等键和外部事件唯一约束。
5. 账单和结算允许构建读模型，但读模型不能成为资金事实来源。

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
6. 不改名或破坏 `legacy-java-plus-entity` 中用户、VIP、账户、优惠券、交易账户域的既有表结构。
7. 不为 App/Backend API 增加 `/claw-router` 这类产品路径前缀；公共业务路径必须与 Java app-api/backend-api 一致。
8. 不因数据结构、接口契约、SDK 替换或实现问题擅自改变 `apps/sdkwork-clawrouter-pc` 的 UI 视觉设计、布局、交互风格、组件外观或品牌表达；前端视觉以用户当前设计为准。

## 6. 版本路线

| 阶段 | 目标 | 范围 |
| --- | --- | --- |
| P0 标准冻结 | 完成 PRD、架构、数据库、API、部署、安全、性能设计 | 本文档集 |
| P1 标准化 MVP | Spring 控制面、Console/Admin API、基础 `/v1` 网关、数据库契约、单机部署 | API Key、Provider、Model、Routing、Usage、Account 接入 |
| P2 产品闭环 | 商业化、账务、营销、监控、Docker/K8S、生成 SDK 替换前端 mock | 订单、充值、优惠券、VIP、用量结算、可观测 |
| P3 高性能增强 | Gateway 热路径优化、Redis、本地缓存、异步账务、压测门禁 | 大规模流式、fallback、路由仿真、限流 |
| P4 SaaS/多 Cell | Dedicated Cell、多租户隔离、灰度、跨 Region 灾备 | 企业级 SaaS |

## 7. 成功标准

1. 一个前端应用同时承载 public、console、admin，模块边界清晰。
2. Admin API 与 App API 均可由标准 OpenAPI 生成 SDK，前端不再依赖手写 mock service。
3. `/v1/*` 兼容请求可以通过标准 API Key 调用，并完成路由、计费、审计闭环。
4. 新建表全部通过 `DATABASE_SPEC.md` 的 L2/L3 评审。
5. 用户、VIP、账户、优惠券、积分充值、订单支付等直接使用既有 `plus_*` 表结构。
6. 四种部署形态能用相同配置模型启动，差异只体现在 profile、数据库、缓存、实例拓扑和 SDK base URL。
7. 同一套前端构建产物可以在本地 claw-router、私有化 Server、Docker、K8S 和中央 Java app-api/backend-api 之间自由切换，不修改 API 路径和 DTO。
8. 前端实现接入真实 API/SDK 后，视觉表现与 `apps/sdkwork-clawrouter-pc` 当前用户设计保持一致；如需调整视觉、布局、导航、色彩、字体、间距或组件形态，必须先获得用户明确确认。
9. 发布前有单元测试、API 契约测试、数据库契约检查、基础压测和安全检查证据。
