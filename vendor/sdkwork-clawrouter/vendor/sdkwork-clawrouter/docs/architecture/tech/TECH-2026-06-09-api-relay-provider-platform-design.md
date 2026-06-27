> Migrated from `docs/superpowers/specs/2026-06-09-api-relay-provider-platform-design.md` on 2026-06-24.
> Owner: SDKWork maintainers

Date: 2026-06-09

## Goal

将 `sdkwork-clawrouter` 从单一 AI 网关打磨成可运营的 API 中转服务商平台。平台必须支持运营方接入多类上游 API 服务，配置账号池和路由策略，对外提供统一资源 API、API Key、计量、计费、风控、诊断和审计能力。

当前 P0 的落点是让已有 AI 号池配置链路更可解释：

```text
Provider -> Account/Credential -> Resource/Operation -> Pool -> Route Policy
  -> API Key Entitlement -> Invocation -> Usage/Billing/Diagnostics
```

## Current Findings

1. OAuth 与路由号池不是同一类配置。OAuth 是 IAM 授权、第三方账号链接、授权流和资源账号管理入口；AI/API 路由号池是 provider account、resource、channel group、policy 和 gateway invocation 的组合。
2. 现有管理端已有 `ai.channelGroups`、`channelBindings`、`aiResources`、`aiResourceGroups` 等基础面，可以支撑 P0 的“配置号池后能否路由”预检。
3. 当前前端可以看到 `resourceCodes`、`apiScope`、`capabilities`、`status`、`healthStatus`，但成员级资源范围是否作为后端强约束仍需后续通过后端 selector、DB schema 和 route explain API 确认。
4. 不应为临时诊断绕过生成 SDK 或新增 raw HTTP。缺少后台诊断 API 时，P0 先用已有 SDK 数据做本地预检，P1 再补后端 route explain 合同。

## Product Model

### Provider

Provider 表示一个上游服务商或服务族，例如 OpenAI、Anthropic、Gemini、Azure OpenAI、OpenRouter、Replicate、Runway、Kling、Minimax、Stripe、PayPal、AWS、Aliyun、Tencent Cloud。

Provider 必须配置：

- `providerCode`: 稳定编码。
- `providerFamily`: 服务族，用于适配器选择。
- `providerType`: `llm`、`image`、`video`、`audio`、`payment`、`cloud`、`generic_api` 等。
- `protocol`: OpenAI-compatible、REST、SSE、Webhook、Async Task、Cloud Signed API、RPC 等。
- `adapterMode`: direct、adapter、hybrid。

### Account / Credential

Account 是可路由的上游账号，不等同于 OAuth 账号。它可以来自手动 API Key、云服务 AK/SK、OAuth grant、企业专线凭据或内部服务授权。

Account 必须配置：

- 凭据引用 `secretRef`，不暴露明文。
- 可用资源范围 `resourceCodes`。
- API 能力范围 `apiScope`。
- 能力标签 `capabilities`。
- 健康状态、限流状态、余额或额度状态。
- 结算主体和成本策略。

### Resource / Operation

Resource 是对外售卖和授权的稳定能力，Operation 是具体调用点。

示例：

```text
api.openai.chat_completions
api.openai.responses
api.openai.embeddings
api.image.generation
api.video.text_to_video
api.audio.speech_to_text
api.payment.payment_intents.create
api.cloud.object_storage.put_object
```

Resource/Operation 应有：

- 标准请求/响应合同。
- provider-native 映射。
- modality、capability、billing meter。
- 同步、流式、异步任务、回调语义。
- 是否允许 fallback。
- 是否要求幂等。

### Pool

Pool 是对外路由的账号池。现有 AI 场景对应 `ai_channel_group` 和 channel bindings。

Pool 配置应简化成四类输入：

1. 这个池能访问什么资源。
2. 这个池里有哪些上游账号。
3. 这些账号如何排序、加权、限流、熔断。
4. 这个池对外如何授权和计价。

### Route Policy

Route Policy 描述一次调用如何从资源 API 路由到账号池成员。

P0 支持：

- enabled/disabled。
- priority/weight。
- active/health。
- resource overlap 预检。

P1 应支持：

- cost optimized。
- latency optimized。
- quota aware。
- health aware。
- tenant entitlement aware。
- fallback chain。
- sticky session 或会话一致性。
- region and compliance routing。

### Entitlement

Entitlement 是客户、API Key、套餐、会员、租户或项目对资源和池的访问权限。

必须回答：

- 这个 API Key 可以访问哪些 Resource/Operation。
- 可以访问哪个 Pool 或 Pool Set。
- 配额、限速、预算和有效期是多少。
- 价格以哪个销售规则计算。
- 是否允许 fallback 到更贵或更慢的 provider。

### Invocation

Invocation 是一次对外 API 调用的完整事实。

必须记录：

- 调用方、API Key、tenant、organization、user。
- resourceCode、operationCode、model 或 provider-native resource。
- route decision、candidate filtering、selected account。
- provider attempt、latency、error、retry、fallback。
- usage meter、cost、price、margin。
- requestId、traceId、audit evidence。

## Domain Treatment

### LLM API

LLM 是当前最成熟的路由场景，应继续以 OpenAI-compatible gateway 为主，同时支持 Anthropic、Gemini、Azure OpenAI、OpenRouter 等 provider adapter。

关键能力：

- chat/completions、responses、embeddings、rerank、moderation。
- SSE streaming。
- tool call 和 structured output 透传或标准化。
- token 计量、缓存 token 计量。
- 模型别名、模型目录、价格目录。
- provider fallback 和上下文长度选择。

### Image API

图片生成和编辑应建成独立资源族，不要只塞进 LLM 模型目录。

关键能力：

- text-to-image、image-to-image、edit、upscale、background removal。
- 输出文件进入 Drive 或稳定 media resource，不把 provider 临时 URL 作为业务身份。
- 按张数、尺寸、质量、步数、provider usage 计量。
- 支持同步返回和异步任务。

### Video API

视频属于异步任务优先的资源族。

关键能力：

- text-to-video、image-to-video、start-end-frame、extend、upscale。
- task start/query/cancel/callback。
- provider task id 与 invocation 绑定。
- 输出视频、封面、缩略图进入 Drive/media resource。
- 计量包含时长、分辨率、帧率、任务档位和 provider usage。

### Audio API

音频资源族应拆分 speech-to-text、text-to-speech、music、sfx、voice clone。

关键能力：

- 流式转写和批量转写。
- TTS 同步/异步输出。
- voice profile 权限和安全审核。
- 按字符、音频时长、输出时长、音色档位计量。

### Payment API

支付不能按普通泛 API 透传处理。支付是账务和合规域，必须有独立交易状态机。

支付中转必须支持：

- idempotency key。
- payment intent/order/refund/settlement/reconciliation。
- webhook signature verification。
- ledger and audit。
- dispute、chargeback、refund。
- provider reconciliation。

支付可以共享 Provider、Credential、Adapter、Health、Audit 的基础设施，但不能共享普通 Pool fallback 语义。一次支付不能因为上游失败自动切换到另一个 provider 创建第二笔交易，除非业务合同明确支持并有幂等保护。

### Cloud Service API

云服务 API 包括对象存储、短信、邮件、OCR、语音、函数计算、CDN、数据库、队列等。

关键能力：

- action-level scope。
- region、resource arn、project/account 隔离。
- least privilege credential。
- provider native signing。
- 操作幂等、重试和审计。
- 对高危操作增加 policy approval。

### Generic API

Generic API 用于接入普通第三方 REST 服务，不能变成无约束的反向代理。

必须有：

- Operation catalog。
- request schema、response schema。
- credential binding。
- timeout、retry、rate limit。
- redaction rules。
- billing meter。
- allowed outbound host allowlist。

## Configuration Flow

推荐把管理端配置拆成 7 个连续步骤：

1. Provider Catalog
   - 选择或创建服务商。
   - 明确 provider family、protocol、adapter mode、支持资源。
2. Account Onboarding
   - 添加账号和凭据引用。
   - 选择资源范围、API scope、capabilities。
   - 执行健康检查和余额/额度检查。
3. Operation Catalog
   - 配置标准资源和 provider-native operation 映射。
   - 配置同步、流式、异步、回调和计量规则。
4. Pool Builder
   - 选择资源范围。
   - 添加账号。
   - 配置 priority、weight、status。
   - 执行 route preflight。
5. Route Policy
   - 配置成本、延迟、健康、配额、fallback 和区域策略。
   - 提供 route explain。
6. Entitlement and Pricing
   - 把 API Key、套餐、租户、用户组绑定到资源和池。
   - 配置售价、成本价、毛利保护、预算。
7. Runtime Diagnostics
   - 查看 invocation、route decision、provider attempt、usage、billing、errors。
   - 提供配置缺口提示和修复入口。

## P0 Implementation Scope

P0 目标是让现有管理端不再只保存配置，而是能立即提示配置是否可路由。

已落地或应保持：

- OAuth admin 使用 appbase backend SDK 的 IAM OAuth resource tree，避免 `flowConfigs`、`resourceAccounts`、`providerCatalog` 未定义崩溃。
- Admin group 服务增加本地 route preflight。
- Channel bindings 抽屉显示 route preflight 状态。
- 阻塞项：
  - pool disabled。
  - zero available accounts。
  - empty resource access。
  - empty bindings。
  - no active healthy member。
- 警告项：
  - account resources do not overlap group resources。
  - missing apiScope/capabilities metadata。

P0 不做：

- 不新增数据库迁移。
- 不手写 raw HTTP。
- 不手改生成 SDK。
- 不把 OAuth resource account 当成 AI routing account。

## P1 Backend Contract

P1 应新增后端 route explain 能力，并通过 OpenAPI 和 backend SDK 暴露：

```text
GET /backend/v3/api/ai/channel_groups/{channelGroupId}/route_explain
POST /backend/v3/api/ai/route_explain
```

建议响应：

```json
{
  "resourceCode": "api.openai.responses",
  "ready": true,
  "candidateCount": 3,
  "selectedCandidates": [],
  "blockedReasons": [],
  "warnings": [],
  "policySnapshotVersion": "2026-06-09T00:00:00Z"
}
```

后端 explain 必须从真实 selector、store、health snapshot、entitlement 和 policy 读取，不返回 demo/synthetic success。

## P2 Platform Capabilities

P2 是完整服务商平台能力：

- Provider marketplace。
- Adapter package registry。
- Operation catalog builder。
- Pool set and policy templates。
- API Key entitlement designer。
- Multi-domain metering and pricing。
- Usage invoice and reconciliation。
- SLA dashboard。
- Provider health and cost optimizer。
- Tenant self-service provider account onboarding。
- Webhook receiver and callback normalizer。
- Async task center。
- Compliance and audit export。

## Product Optimization

### Simplify Configuration

管理端不应要求运营人员理解所有底层表。推荐把配置压缩为：

- 先选服务商。
- 再加账号。
- 勾选账号支持的资源。
- 放入号池。
- 选择路由策略模板。
- 绑定 API Key 或套餐。
- 运行预检。

高级项放入折叠区：

- provider-native headers。
- adapter route override。
- retry/fallback matrix。
- region and compliance。
- custom billing meter。

### Make Missing Configuration Actionable

每个错误都要能指向下一步：

- 没资源，跳到资源选择。
- 没账号，打开添加账号。
- 账号不健康，打开健康诊断。
- 资源不匹配，打开账号资源范围。
- 没授权，打开 API Key entitlement。
- 没价格，打开价格设置。

### Preserve Domain Boundaries

平台化不是把所有 API 都压成一个泛表和一个泛代理。

- AI/media 可以共享 routing pool。
- Payment 要有独立交易状态机。
- Cloud 要有 action-level policy 和 least privilege。
- OAuth 是授权和账号链接，不是路由池。
- Generic API 必须有 operation catalog 和 outbound allowlist。

## Acceptance Criteria

P0 验收：

- OAuth admin 页面不因缺少 optional SDK resource tree 崩溃。
- Admin group 可以显示 route preflight。
- 号池缺少资源、账号、健康账号、可用账号时给出明确阻塞项。
- 账号资源与号池资源不匹配时给出警告。
- 所有 admin/frontend 业务调用继续通过 generated backend SDK 或 approved appbase backend SDK。

P1 验收：

- 后端 route explain API 与真实 selector 一致。
- 生成 backend SDK 暴露 route explain 方法。
- 管理端 route preflight 从本地预检升级为后端 explain 优先、本地预检兜底。
- selector、runtime invocation、admin explain 使用同一套路由事实。

P2 验收：

- 至少 LLM、图片、视频、音频四类资源可通过统一 operation catalog、pool、policy、entitlement、meter 配置。
- 支付域以独立 payment transaction state machine 接入。
- 至少一个云服务 API 通过 provider-native signing adapter 接入。
- 每次 invocation 都可解释路由、计量、成本、售价和错误。

