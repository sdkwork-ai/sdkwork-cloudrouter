> Migrated from `docs/04-模块规划.md` on 2026-06-24.
> Owner: SDKWork maintainers

# sdkwork-clawrouter 模块规划

## 1. 模块规划目标

模块规划需要服务两个方向：

1. 产品模块：与 `apps/sdkwork-clawrouter-pc` 的 public、console、admin 模块对齐。
2. 后端模块：与 Spring AI Plus 的 backend/app API 标准、business entity 结构、gateway 执行链路对齐。

模块边界的核心原则：

- public、console、admin 共享同一个前端应用，但不共享同一套权限和 API 前缀。
- gateway、control、billing、provider、routing、usage、ops 高内聚，彼此通过应用服务和事件协作。
- 新功能先进入明确业务域，不放入 `common`、`misc`、`router` 这类无边界模块。

## 2. 前端模块

### 2.1 Public 模块

| 包 | 产品能力 | API 面 |
| --- | --- | --- |
| `sdkwork-clawrouter-pc-home` | 首页、能力介绍、下载入口 | app public |
| `sdkwork-clawrouter-pc-models` | 模型目录、模型详情 | app public |
| `sdkwork-clawrouter-pc-rankings` | 模型排行 | app public |
| `sdkwork-clawrouter-pc-app-center` | 应用中心 | app public |
| `sdkwork-clawrouter-pc-skills-hub` | 技能中心 | app public |
| `@sdkwork/documents-pc-api-reference` | API 文档、在线请求 | gateway + app public |
| `@sdkwork/documents-pc-sdk-reference` | SDK 文档、SDK 生成 | app public |
| `sdkwork-clawrouter-pc-playground` | 多模态调试 | gateway + app |
| `sdkwork-clawrouter-pc-forum` | 论坛 | app |

### 2.2 Console 模块

| 包 | 产品能力 | 后端域 |
| --- | --- | --- |
| `console-dashboard` | 用户仪表盘 | usage、billing、routing、monitor projection |
| `console-usage` | 调用统计 | ai_usage、ai_request_trace |
| `console-gateway` | 网关地址、接入说明 | gateway metadata |
| `console-routing` | 本地路由、策略、fallback、日志 | ai_routing、ai_channel |
| `console-api-keys` | Key 创建、轮换、权限 | iam_gateway_api_key |
| `console-user` | 用户资料 | existing `plus_user` |
| `console-commerce` | 钱包、套餐、支付 | sdkwork-appbase commerce/account tables |
| `console-settlements` | 账单、报表、发票 | commerce/ai usage settlement |
| `console-account` | 账户、算力元、VIP、流水 | Token Bank account、existing `plus_vip_*` |
| `console-recharge` | 充值包、充值方式 | existing `plus_vip_recharge*` |
| `console-settings` | 偏好配置 | iam/studio settings |
| `console-messages` | 通知中心 | content/comms/ops notifications |
| `console-providers` | 用户 Provider 和工具配置 | integration provider/account/proxy |

### 2.3 Admin 模块

| 包 | 产品能力 | 后端域 |
| --- | --- | --- |
| `admin-dashboard` | 运营概览 | ops projection |
| `admin-user` | 用户和租户治理 | existing iam/user tables |
| `admin-group` | 分组、权限、Key group | iam |
| `admin-model` | 模型目录和价格 | ai |
| `admin-channel` | Provider、Channel、Account | integration |
| `admin-announcement` | 公告 | content |
| `admin-marketing` | 优惠券、活动、充值包 | existing commerce/vip/coupon |
| `admin-finance` | 订单、支付、退款、对账 | existing commerce/account |
| `admin-record` | 请求、用量、审计 | ai/ops |
| `admin-ratelimit` | 限流、熔断、风控 | ai/iam/ops |
| `admin-monitor` | 实例、任务、缓存、告警 | ops |

## 3. 后端逻辑模块

| 模块 | 责任 | 对外 API |
| --- | --- | --- |
| `claw-router-gateway` | `/v1/*` 协议入口、streaming、Provider 调用、fallback | Gateway |
| `claw-router-app-api` | Console/public 用户自助 API controllers | `/app/v3/api/{resource-path}`，与 Java app-api 保持一致 |
| `claw-router-backend-api` | Admin controllers | `/backend/v3/api/{resource-path}`，与 Java backend-api 保持一致 |
| `claw-router-application` | 用例编排、事务、幂等、事件发布 | 内部 |
| `claw-router-domain` | 路由、模型能力、计量、策略、状态机 | 内部 |
| `claw-router-infra` | Repository、Provider client、Redis、Secret、Object Storage | 内部 |
| `claw-router-worker` | 健康探测、账务结算、聚合、归档、outbox/inbox | 内部 |
| `claw-router-contract` | 数据契约、OpenAPI 扩展、SDK schema | 生成输入 |
| `claw-router-ops` | metrics、tracing、health、runbook、admin monitor | 内部/运维 |

实际落地时可按 Spring AI Plus 根项目现有模块规则命名，本文档定义的是逻辑边界。

## 4. 领域模块

| 领域 | 前缀 | 职责 | 表策略 |
| --- | --- | --- | --- |
| IAM | `iam_` | API Key、Key group、权限策略、主体访问 | 新表 L2/L3，用户表复用 `plus_user` |
| AI | `ai_` | 模型、能力、路由、用量、请求事实、配额 | 新表 L2/L3，可映射既有模型实体 |
| Integration | `integration_` | Provider、Channel、Account、Proxy、Credential reference | 新表 L3 |
| Commerce | `commerce_` | 新增 router 结算读模型或套餐映射 | 账户交易事实复用 `plus_*` |
| Studio | `studio_` | 应用中心、技能、工作区资产 | 新表 L2，必要时映射既有 app/workspace |
| Content | `content_` | 公告、课程、论坛、文档内容 | 新表 L1/L2 |
| Ops | `ops_` | 实例、心跳、事件、审计、outbox、inbox、快照 | 新表 L2/L3 |

## 5. 核心用例拆分

### 5.1 API Key 生命周期

- App：用户创建、查看、停用、轮换自己的 Key。
- Backend：管理员查看、冻结、审计、调整策略。
- Gateway：只校验 Key 摘要、状态、租户、权限、限流。
- Domain：Key 权限、模型范围、配额、过期、风险规则。

### 5.2 Provider 接入

- Backend：创建 Provider、Channel、Account、Secret reference、模型映射。
- Console：用户本地或租户级 Provider 配置。
- Worker：健康探测、恢复探测、容量快照。
- Gateway：按路由策略选择 channel account。

### 5.3 路由策略

- Console：用户配置偏好和本地路由。
- Backend：发布全局策略、灰度、熔断、黑白名单。
- Domain：候选集、排序、过滤、fallback。
- Ops：决策日志、仿真、回放。

### 5.4 用量和账务

- Gateway：记录请求事实和 usage fact，不直接写余额。
- Worker：聚合 usage，生成 billing event，结转账户流水。
- Commerce：复用 `plus_account`、`plus_account_history`、`plus_order`、`plus_payment` 等既有表。
- Console/Admin：展示余额、账单、结算和财务记录。

## 6. 模块红线

1. `admin-*` 前端包不能调用 `/app/v3/api` 完成管理动作。
2. `console-*` 前端包不能调用 `/backend/v3/api` 获取用户数据。
3. App/Backend 公共路径不能加入 `/claw-router`、`/router`、`/sdkwork` 等产品命名空间；新增能力先进入 Java app-api/backend-api 契约和 SDK。
4. Gateway 不能直接执行后台 CRUD。
5. Provider adapter 不能写账户余额。
6. 账户和 VIP 相关逻辑不能创建 claw-router 私有替代表。
7. 新表不能用产品名前缀。

## 7. MVP 模块范围

P1 必须完成：

- Gateway 基础 `/v1/models`、`/v1/chat/completions`、`/v1/responses`、`/v1/embeddings`。
- API Key 生命周期。
- Provider/Channel/Account 基础配置。
- 模型目录和模型映射。
- 路由策略：优先级、权重、fallback。
- 请求日志、usage fact、基础账务结转。
- Console dashboard、api-keys、usage、routing、billing。
- Admin dashboard、user、model、channel、record、ratelimit、monitor。
- 本地 SQLite、Server PostgreSQL、Docker Compose。

P2 再扩展：

- 图像、音频、视频、files/uploads、batch、realtime。
- 营销、优惠券、VIP 权益、充值包完整闭环。
- K8S、HPA、Prometheus/Grafana。
- 前端 mock 全量替换。
