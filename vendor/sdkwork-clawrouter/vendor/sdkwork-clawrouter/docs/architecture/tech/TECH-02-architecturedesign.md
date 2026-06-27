> Migrated from `docs/02-技术架构设计.md` on 2026-06-24.
> Owner: SDKWork maintainers

# sdkwork-clawrouter 技术架构设计

## 1. 架构目标

`sdkwork-clawrouter` 是 Rust-first 高性能 AI 网关运行时。它围绕统一数据库标准、稳定 app/backend API 路径、生成 SDK 边界、统一 portal 产品体验建立标准化运行时。

架构目标：

- 高性能：网关热路径、流式代理、路由决策、限流和用量归集由 Rust native runtime 承载。
- 高标准：数据库、API、SDK、类型、部署和文档均进入可执行质量门禁。
- 高内聚：gateway、app-api、admin-api、core、config、contract、observability 按清晰职责拆分。
- 低耦合：前端、API surface、domain、storage、provider adapter、worker 只通过明确契约协作。
- 高安全：密钥不明文落库，API key hash 校验，租户隔离、审计、幂等和日志脱敏为默认能力。
- 高扩展：desktop、server、docker、kubernetes 四种部署方式只改变装配，不改变核心业务逻辑。

## 2. 总体架构

推荐架构是 **Rust-first Modular Runtime + Stable API Contract + Generated SDK Boundary**。

```text
apps/sdkwork-clawrouter-pc
  -> generated TypeScript app/backend SDK
  -> /app/v3/api/**      sdkwork-clawrouter-app-api-server
  -> /backend/v3/api/**  sdkwork-clawrouter-admin-api-server

OpenAI-compatible SDK / curl / third-party clients
  -> /v1/**              sdkwork-clawrouter-cloud-gateway

Rust runtime services
  -> sdkwork-claw-core
  -> sdkwork-claw-config
  -> sdkwork-claw-contract
  -> sdkwork-claw-observability
  -> domain/application crates
  -> storage/cache/secret/provider adapters

State
  -> PostgreSQL / SQLite
  -> Redis / memory cache
  -> OS keychain / file secret / K8S Secret / Vault
  -> object storage optional
```

`sdkwork-clawrouter` 以 `/app/v3/api/**` 与 `/backend/v3/api/**` 为稳定公共面，通过 OpenAPI 契约与生成 SDK 对外暴露能力；Commerce、IAM、Models 等域由组合模块提供，前端与外部调用方只切换 base URL 即可在不同部署 profile 间迁移。

## 3. Runtime Plane

| Plane | Rust 服务/模块 | 职责 | 公共路径 |
| --- | --- | --- | --- |
| Gateway Plane | `sdkwork-clawrouter-cloud-gateway` | OpenAI-compatible 请求、streaming、provider relay、routing、quota、usage finalize | `/v1/**` |
| App Plane | `sdkwork-clawrouter-app-api-server` | console/public 用户自助 API，用户上下文和资源归属校验 | `/app/v3/api/**` |
| Admin Plane | `sdkwork-clawrouter-admin-api-server` | admin 控制台 API，后台 RBAC/ABAC、审计和配置治理 | `/backend/v3/api/**` |
| Product Plane | `sdkwork-clawrouter-router-service` | 本地桌面/服务端组合入口、静态 portal 装配、部署 profile glue | internal |
| Worker Plane | 后续 worker crates | usage 聚合、账务结转、健康探测、归档、告警、outbox/inbox | internal |
| Contract Plane | `sdkwork-claw-contract` | API surface、SDK client、路径前缀、生成 manifest 类型 | internal |
| Config Plane | `sdkwork-claw-config` | `desktop/server/docker/kubernetes` profile、env/file 配置解析 | internal |
| Core Plane | `sdkwork-claw-core` | health、error、app state、request context 通用模型 | internal |
| Observability Plane | `sdkwork-claw-observability` | tracing、request_id、structured logs、metrics exporter glue | internal |

## 4. 分层规则

```text
interface
  -> application
  -> domain
  -> infrastructure
```

| 层 | 责任 | 禁止事项 |
| --- | --- | --- |
| Interface | Axum router、DTO、auth extractor、OpenAPI annotation、协议响应整形 | 不写业务真值，不拼接 SQL，不保存 secret 明文 |
| Application | 用例编排、事务边界、幂等、事件发布、SDK 边界调用 | 不直接依赖 React、provider 私有协议或具体表结构细节 |
| Domain | 路由策略、模型能力、计费规则、账户不变量、风控状态机 | 不依赖 HTTP、数据库驱动、SDK transport |
| Infrastructure | SQLx repository、Redis/moka cache、secret backend、provider client、generated SDK client | 不反向定义产品规则 |

跨层对象命名必须清晰：

- `ApiDto`：app/backend/gateway 请求响应结构。
- `DomainModel`：承载业务不变量。
- `EntityContract`：数据库契约和持久化映射。
- `Projection`：dashboard、列表页、报表读模型。
- `Snapshot`：路由策略、模型目录、价格、provider 健康快照。

## 5. 状态真值模型

| 真值类型 | 内容 | 存储 | 一致性 |
| --- | --- | --- | --- |
| Durable Truth | 用户、租户、Provider、Channel、Model、Pricing、Routing、Quota、Account、Order、Payment、Usage Fact、Audit | PostgreSQL/SQLite | 强一致或事务后事件一致 |
| Cache Truth | API key 摘要、模型目录、路由策略、provider 健康、限流桶 | moka/Redis | 可失效、可重建 |
| Query Truth | dashboard、榜单、报表、结算视图、模型排名 | projection table/materialized view | 延迟一致，可回放 |
| Secret Truth | provider key、OAuth secret、private key、token seed | OS keychain/file/K8S Secret/Vault | 只通过 secret_ref 访问 |

红线：

- 资金、订单、支付、结算、审计不能只写缓存。
- Query Truth 不能成为余额或订单事实来源。
- Provider 凭据不能作为普通 JSON 明文字段存储。

## 6. 主请求链路

Gateway `/v1/**` 请求生命周期：

1. 接收请求，创建 `request_id` 和 tracing span。
2. 解析兼容认证输入：`Authorization: Bearer`、`x-api-key`、`x-goog-api-key`、`?key=`。
3. 使用 API key hash 得到 tenant、organization、user、api_key、channel_group 和 data_scope。
4. 解析 capability family、requested model、protocol profile 和调用参数。
5. 读取模型目录、价格、路由策略、quota、rate limit、provider health snapshot。
6. 通过 deterministic priority、weighted random、SLO-aware、geo affinity、fallback chain 生成候选。
7. 选择 provider/channel/account 并执行 provider adapter。
8. 对 streaming 响应进行 backpressure-safe 转发，不全量缓冲。
9. 写入 request trace、route decision、usage fact、provider attempt 和 audit evidence。
10. 通过 outbox/batch writer 异步执行 usage finalize、账务结转、报表聚合、告警。

## 7. API Surface

| Surface | 前缀 | 标准 | 返回结构 | 调用方 |
| --- | --- | --- | --- | --- |
| Gateway | `/v1/**` | OpenAI-compatible / provider-compatible | 原协议结构 | OpenAI SDK、curl、第三方客户端 |
| App | `/app/v3/api/**` | Rust app-api + generated SDK | SDKWork API envelope | console/public portal |
| Admin | `/backend/v3/api/**` | Rust backend-api + generated SDK | SDKWork API envelope | admin portal |
| Internal | internal event/RPC | private contract | internal model | worker/runtime/sync |

App/Admin 公共路径保持 `/app/v3/api/**` 与 `/backend/v3/api/**` 稳定。新增能力先进入 API contract manifest、OpenAPI snapshot 和 generated SDK，再实现 Rust handler。

## 8. SDK Boundary

前端业务调用链：

```text
React component/hook
  -> portal service wrapper
  -> generated app/backend SDK
  -> Rust app/admin API
```

Rust 远端 app/backend business 调用链：

```text
Rust application service
  -> generated Rust app/backend SDK
  -> composed module or local Rust API target
```

缺失 SDK 方法时，不允许补 raw HTTP。必须修复 controller/OpenAPI/generator，再 regenerate。

当前机器可读 API 合约：

```text
generated/api/api-contract-manifest.json
```

质量门禁：

```text
python -B -m tools.api_contract_manifest --check
python -B -m tools.frontend_operation_audit --check
python -B -m tools.schema_quality_gate
```

## 9. 数据与业务域

数据库以 `docs/schema-registry/sdkwork-clawrouter.tables.yaml` 为唯一新增表契约来源。

复用原则：

- 用户、VIP、account、优惠券、积分充值、订单、支付、退款、发票由 `sdkwork-commerce`、`sdkwork-iam` 等组合模块提供；Claw Router 通过生成 SDK 消费，不在本地重复定义资金事实表。
- AppCenter、SkillsHub、模型目录等通过 `sdkwork-agent`、`sdkwork-models` 等组合模块接入。
- 新建 AI gateway、routing、pricing、provider、usage、ops 表使用 `ai_`、`integration_`、`iam_`、`commerce_`、`studio_`、`content_`、`ops_` 等业务前缀。

## 10. 部署模式

`sdkwork-clawrouter` 使用统一 Rust runtime，按 profile 变更基础设施装配：

| Profile | 目标 | DB | Cache | Secret |
| --- | --- | --- | --- | --- |
| `desktop` | 本地桌面、个人开发、离线基础能力 | SQLite | memory/moka | OS keychain/file |
| `server` | 单机或少量节点生产 | PostgreSQL | moka/Redis | env/file/KMS |
| `docker` | Compose、CI、私有化标准交付 | PostgreSQL/SQLite | Redis | Docker secret/env |
| `kubernetes` | SaaS、大规模企业生产 | PostgreSQL/cloud DB | Redis/cloud cache | K8S Secret/Vault/KMS |

部署切换只允许改变 base URL、profile、storage/cache/secret adapter，不允许改变 `/app/v3/api`、`/backend/v3/api`、`/v1` 资源路径。

## 11. 架构验收标准

1. 任一接口都能归类到 Gateway、App、Admin、Internal 之一。
2. 任一 App/Admin 接口都能追溯到 API contract manifest、OpenAPI path 和 generated SDK 方法。
3. 任一表都能归类为组合模块 owned 表或 Claw Router 本地业务前缀表。
4. 任一资金变动都能追踪到订单、支付、流水、幂等键。
5. 任一 provider secret 都只通过 secret_ref 访问。
6. 任一路由决策都能解释候选、过滤、排序、fallback 和最终目标。
7. 任一部署形态都不改变核心业务逻辑。
8. 任一前端接入改造都不改变 portal UI 视觉设计。

