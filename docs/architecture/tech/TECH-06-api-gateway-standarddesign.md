> Migrated from `docs/06-API-Gateway与接口标准设计.md` on 2026-06-24.
> Owner: SDKWork maintainers

## 1. 接口面总览

`sdkwork-clawrouter` 对外暴露三类稳定接口面：

| 接口面 | 前缀 | 标准 | 返回 |
| --- | --- | --- | --- |
| Gateway API | `/v1/*` | OpenAI compatible 和其它兼容协议 | 原协议响应，不包装 |
| App API | `/app/v3/api/{resource-path}` | `legacy-java-plus-app-api` Java `ApiPaths` + OpenAPI + generated SDK | `PlusApiResult<T>` |
| Backend API | `/backend/v3/api/{resource-path}` | `legacy-java-plus-backend-api` Java `ApiPaths` + OpenAPI + generated SDK | `PlusApiResult<T>` |

内部接口包括 worker、runtime、event、snapshot，不作为外部长期公共契约。

App/Backend API 的公共路径必须与 Java API 模块完全一致。claw-router 只能切换 `baseUrl`，不得在公共路径中额外插入 `/claw-router`、`/router`、`/sdkwork` 等产品或部署命名空间。详细自由切换标准见 [10-API路径一致性与自由切换架构.md](./10-API路径一致性与自由切换架构.md)。

## 2. Gateway API

### 2.1 设计原则

1. `/v1/*` 必须兼容现有 OpenAI SDK 调用习惯。
2. Gateway API 不返回 `PlusApiResult<T>`。
3. 兼容协议输入不得绕过统一身份、租户、配额、计费、审计。
4. 新协议只做翻译，不重建路由和计费内核。
5. 能力真值以兼容矩阵记录：`native`、`relay`、`translated`、`emulated`、`unsupported`。

### 2.2 P1 API 家族

| API | 能力 |
| --- | --- |
| `GET /v1/models` | 模型列表 |
| `GET /v1/models/{model}` | 模型详情 |
| `POST /v1/chat/completions` | Chat Completions |
| `POST /v1/responses` | Responses |
| `POST /v1/embeddings` | Embeddings |

### 2.3 P2 API 家族

| API | 能力 |
| --- | --- |
| `/v1/images/*` | 图片生成、编辑、变体 |
| `/v1/audio/*` | TTS、STT、翻译 |
| `/v1/files`、`/v1/uploads` | 文件和上传 |
| `/v1/videos/*` | 视频生成和任务 |
| `/v1/realtime/*` | Realtime sessions |
| `/v1/batches` | 批处理 |
| `/v1/vector_stores/*` | 向量存储 |
| `/v1/webhooks` | Webhook 管理或事件 |

### 2.4 Gateway 认证输入

兼容输入：

- `Authorization: Bearer <key>`
- `x-api-key: <key>`
- `x-goog-api-key: <key>`
- `?key=<key>`

解析输出：

```text
subject_type
tenant_id
organization_id
user_id
api_key_id
channel_group_id
data_scope
permission_scope
rate_limit_policy_id
quota_policy_id
```

API Key 明文只在请求入口出现，服务端只使用 hash 匹配，不在日志、错误、审计中输出原文。

## 3. App API 标准

路径统一：

```text
/app/v3/api/{resource-path}
```

Java API path 必须以 `com.sdkwork.app.api.ApiPaths.API_PREFIX` 为唯一前缀，也就是 `/app/v3/api`。推荐使用 `com.sdkwork.app.api.ApiPaths.appPath(...)` 或同等标准生成，不手写散落字符串。`{resource-path}` 必须来自 `legacy-java-plus-app-api` 的 controller/OpenAPI/SDK 契约。

App API 典型分组：

| 分组 | 路径 |
| --- | --- |
| 用户仪表盘 | `/app/v3/api/dashboard/**` 或 Java app-api 已登记的 dashboard 资源路径 |
| API Key | `/app/v3/api/api-keys/**` 或 Java app-api 已登记的 API Key 资源路径 |
| 用量 | `/app/v3/api/usage/**` |
| 网关信息 | `/app/v3/api/gateway/**` |
| 路由配置 | `/app/v3/api/routing/**` |
| 账务 | `/app/v3/api/billing/**`；支付回调仅使用 `/app/v3/api/payments/callback/**` |
| 结算 | `/app/v3/api/settlements/**` |
| 账户 | `/app/v3/api/account/**` |
| 充值 | `/app/v3/api/recharge/**` 或 Java app-api 已登记的 VIP/充值资源路径 |
| 消息 | `/app/v3/api/messages/**` |
| Provider 配置 | `/app/v3/api/providers/**` |
| 模型目录 | `/app/v3/api/models/**` |
| 公共内容 | `/app/v3/api/content/**` |

App API 权限标准：

- 从当前登录用户解析 `user_id`。
- 服务层校验资源归属，不依赖前端传入用户 ID。
- 所有可写接口支持 `request_id`，资金、充值、支付、Key 创建、Provider 凭据写入支持 `idempotency_key`。
- int64 返回 string，decimal 返回 string。

## 4. Backend API 标准

路径统一：

```text
/backend/v3/api/{resource-path}
```

Java API path 必须以 `com.sdkwork.backend.api.ApiPaths.API_PREFIX` 为唯一前缀，也就是 `/backend/v3/api`。推荐使用 `com.sdkwork.backend.api.ApiPaths.backendPath(...)` 或同等标准生成。`{resource-path}` 必须来自 `legacy-java-plus-backend-api` 的 controller/OpenAPI/SDK 契约。

Backend API 典型分组：

| 分组 | 路径 |
| --- | --- |
| 后台仪表盘 | `/backend/v3/api/dashboard/**` 或 Java backend-api 已登记的 dashboard 资源路径 |
| 用户管理 | `/backend/v3/api/user/**` 或 Java backend-api 已登记的 user 资源路径 |
| 分组权限 | `/backend/v3/api/group/**`、`/backend/v3/api/role/**`、`/backend/v3/api/permission/**` |
| 模型管理 | `/backend/v3/api/model/**` |
| Provider/Channel | `/backend/v3/api/channel/**`、`/backend/v3/api/channel/account/**` |
| 公告 | `/backend/v3/api/announcement/**` |
| 营销 | `/backend/v3/api/promotions/**` |
| 财务 | `/backend/v3/api/finance/**`、`/backend/v3/api/order/**`、`/backend/v3/api/payment/**` |
| 使用记录 | `/backend/v3/api/record/**`、`/backend/v3/api/usage/**` |
| 限流风控 | `/backend/v3/api/rate-limit/**`、`/backend/v3/api/security/**` |
| 运维监控 | `/backend/v3/api/monitor/**`、`/backend/v3/api/ops/**` |
| 配置发布 | `/backend/v3/api/config-snapshots/**` 或 Java backend-api 已登记的配置发布资源路径 |

Backend API 权限标准：

- 后台角色必须显式校验：admin、manager、finance、operator、auditor 等。
- 关键写操作必须写 `ops_audit_log`。
- 跨租户查询必须有后台能力授权和审计。
- 密钥、token、Provider secret 只返回 masked label 和状态，不返回 secret reference 给普通管理页面。

## 5. SDK 生成标准

1. Backend API 进入 `legacy-java-plus-backend-api` 生成 SDK，SDK 以 `/backend/v3/api` 作为 Java 标准前缀。
2. App API 进入 `legacy-java-plus-app-api` 生成 SDK，SDK 以 `/app/v3/api` 作为 Java 标准前缀。
3. 前端 `admin-*` 包依赖 backend SDK。
4. 前端 `console-*` 和 public 用户态包依赖 app SDK。
5. Gateway `/v1/*` 可以提供 OpenAPI/兼容文档，但不走 `PlusApiResult<T>` SDK。
6. 自由切换只能通过 SDK client 的 base URL 完成，不能通过改 path 或复制 SDK 完成。

禁止：

- 前端长期手写 `fetch('/backend/v3/api/...')`。
- console 调用 backend 管理接口。
- admin 调用 app 用户接口完成后台管理。
- 为 Provider 私有协议复制一套平台 API。
- 为 claw-router 新增本地专用 App/Backend path，绕过 Java app-api/backend-api 契约。

## 6. 请求上下文标准

所有 App/Backend/Gateway 请求统一生成：

```text
request_id
trace_id
source_ip
user_agent
subject_type
tenant_id
organization_id
user_id
operator_id
api_key_id
channel_group_id
data_scope
```

Gateway 额外生成：

```text
protocol_profile
capability_family
requested_model
resolved_model
routing_policy_id
routing_profile_id
selected_provider
selected_channel_id
provider_attempt_id
usage_fact_id
```

## 7. 错误模型

App/Backend：

- 使用 `BusinessException`。
- 返回 `PlusApiResult<T>`。
- 错误码按 Spring AI Plus 既有 `CommonErrorCode` 体系。

Gateway：

- 返回兼容协议错误结构。
- 保留 `request_id`。
- 不泄露 Provider key、内部路由规则、密钥引用和数据库 ID。

## 8. 流式协议标准

1. SSE 响应必须在链路上保留 `request_id`。
2. 网关应区分：用户取消、上游失败、网关超时、主动 fallback、限流拒绝。
3. 流式完成后必须 finalize usage。
4. 中途中断也必须写请求事实，状态为 partial/cancelled/failed。
5. 禁止为了统计而全量缓存流式内容。

## 9. API 验收标准

- [ ] Admin 接口全部位于 Java backend-api 标准 `/backend/v3/api/{resource-path}`。
- [ ] App/Console/Public 接口全部位于 Java app-api 标准 `/app/v3/api/{resource-path}`。
- [ ] Gateway 兼容接口全部位于 `/v1/*` 或明确兼容协议前缀。
- [ ] 前端调用通过生成 SDK。
- [ ] Desktop、Server、Docker、K8S、中央 Java 服务之间只切换 base URL，不改 resource path。
- [ ] Gateway 错误结构兼容 OpenAI 风格，不包装 `PlusApiResult<T>`。
- [ ] 所有资金、密钥、配置发布写操作有幂等和审计。
