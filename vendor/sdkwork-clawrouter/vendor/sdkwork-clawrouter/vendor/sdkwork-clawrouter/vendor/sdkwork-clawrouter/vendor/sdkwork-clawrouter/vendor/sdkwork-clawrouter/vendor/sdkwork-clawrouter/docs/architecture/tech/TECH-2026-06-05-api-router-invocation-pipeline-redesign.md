> Migrated from `docs/superpowers/specs/2026-06-05-api-router-invocation-pipeline-redesign.md` on 2026-06-24.
> Owner: SDKWork maintainers

# API Router Invocation Pipeline Redesign

## 背景

当前 `sdkwork-clawrouter` 仍处于新应用阶段，没有线上兼容压力，也没有外部用户依赖既有调用编排。因此本次重构采用一次性删除旧编排、全新实现统一调用链的方案。

重构目标不是保留旧的三套路径再包一层 facade，而是把所有 API 请求统一抽象为一次资源调用 `Invocation`，并通过高度拆分的 `InvocationPipeline` 和 `InvocationInterceptor` 完成鉴权、资源分类、路由、账号选择、secret、请求转换、调用、计费、sticky、trace 和响应处理。

仍应保留并复用的底层能力：

- `ProviderRouteSelector`：保留路由策略、channel group binding、policy/rule、candidate/fallback、credential rotation 能力。
- `PricingResolver`：保留按 plan、channel group、provider、channel、region、meter 解析价格的能力。
- `GatewayUsageRecorder`：保留 usage/trace 写入模型。
- `ProviderSecretResolver`：保留 secret ref 解析能力。
- `ProviderAdapterRegistry` 和 provider adapter service：保留 adapter manifest、adapter route、adapter invocation 能力。
- 数据库 catalog、schema registry 和 runtime snapshot：作为路由、价格、账号、资源事实来源继续使用。

需要删除并重写的旧编排：

- 标准 OpenAI runtime route 中分散的 chat / embeddings / responses 调用编排。
- route-scoped OpenAI passthrough 中私有的 intent、sticky、target plan、usage 流程。
- provider-native passthrough 中私有的鉴权、adapter/direct dispatch、usage line 流程。
- 只服务 OpenAI runtime 的 `OpenAiInvocationPlugin` 编排方式。
- 重复的 relay request 对象字段拼装逻辑。

## 设计原则

1. 每个请求都是一个资源调用。
2. 资源调用由 `Invocation` 表达，不能把逻辑写死在 path handler 中。
3. 路由到的账户必须通过 `InvocationAccount` 显式表达。
4. 计费方式必须先分类，再按响应或 adapter usage line 确定最终数量。
5. sticky 是路由策略，不是 OpenAI 专属逻辑。
6. provider adapter 是 dispatch 形态，不是独立计费系统。
7. 免费接口也必须走 Invocation，只是 `BillingMode::Free`。
8. OpenAI-compatible、provider-native、cloud storage、IaaS、内部 API 使用同一条链路。
9. 旧编排一次性删除，不做兼容 wrapper。

## 统一调用流程

```text
HTTP Request
  -> RequestCaptureInterceptor
  -> AuthenticationInterceptor
  -> ResourceClassificationInterceptor
  -> PayloadExtractionInterceptor
  -> BillingPolicyInterceptor
  -> StickyResolutionInterceptor
  -> RoutePlanningInterceptor
  -> AccountResolutionInterceptor
  -> SecretResolutionInterceptor
  -> PricingPreflightInterceptor
  -> RequestTransformInterceptor
  -> DispatchExecutor
  -> ResponseNormalizationInterceptor
  -> UsageExtractionInterceptor
  -> PricingSettlementInterceptor
  -> StickyCommitInterceptor
  -> TraceTelemetryInterceptor
  -> HTTP Response
```

失败流：

```text
任何阶段失败
  -> InvocationError
  -> TraceTelemetryInterceptor.on_error
  -> ResponseNormalizationInterceptor.on_error
  -> HTTP error response
```

重试和 fallback 不由各 handler 私自循环，而由 `DispatchExecutor` 根据 `InvocationRouting.route_plan`、`AiRouteFailureStrategy` 和 route retry policy 统一执行。

## 核心对象

### Invocation

```rust
pub struct Invocation {
    pub id: InvocationId,
    pub request: InvocationRequest,
    pub subject: InvocationSubject,
    pub resource: InvocationResource,
    pub billing: InvocationBilling,
    pub routing: InvocationRouting,
    pub account: Option<InvocationAccount>,
    pub dispatch: InvocationDispatch,
    pub response: Option<InvocationResponse>,
    pub usage: InvocationUsage,
    pub telemetry: InvocationTelemetry,
    pub extensions: InvocationExtensions,
}
```

`Invocation` 是整个调用链唯一可变上下文。每个 interceptor 只读写自己负责的字段。

### InvocationRequest

```rust
pub struct InvocationRequest {
    pub method: Method,
    pub path: String,
    pub query: Option<String>,
    pub headers: HeaderMap,
    pub body: InvocationBody,
    pub content_type: Option<String>,
    pub user_agent: Option<String>,
    pub request_id: String,
    pub trace_id: Option<String>,
    pub idempotency_key: Option<String>,
    pub client_ip: Option<String>,
}
```

`InvocationBody` 需要支持：

- JSON body
- raw bytes
- streaming body
- multipart metadata
- empty body

### InvocationSubject

```rust
pub struct InvocationSubject {
    pub auth_type: InvocationAuthType,
    pub api_key_id: Option<i64>,
    pub api_key_name_snapshot: Option<String>,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
    pub channel_group_id: Option<i64>,
    pub channel_group_code: Option<String>,
    pub pricing_plan_code: Option<String>,
    pub roles: Vec<String>,
    pub scopes: Vec<String>,
}
```

```rust
pub enum InvocationAuthType {
    GatewayApiKey,
    AppSession,
    AdminSubject,
    InternalService,
    AnonymousFree,
}
```

规则：

- 需要计费的调用必须有可结算 subject。
- 免费公开接口可使用 `AnonymousFree`，但仍写 trace。
- 内部服务调用必须带 service subject，不能伪装成用户 API key。

### InvocationResource

```rust
pub struct InvocationResource {
    pub surface: InvocationSurface,
    pub provider_family: Option<String>,
    pub provider_code: Option<String>,
    pub route_key: String,
    pub api_code: String,
    pub endpoint_key: Option<String>,
    pub operation_id: Option<String>,
    pub resource_type: ResourceType,
    pub resource_id: Option<String>,
    pub parent_resource_type: Option<ResourceType>,
    pub parent_resource_id: Option<String>,
    pub capability: RoutingCapability,
    pub model_requirement: AiRouteModelRequirement,
    pub requested_model: Option<String>,
    pub requested_model_catalog_key: Option<String>,
    pub provider_native_model: Option<String>,
}
```

```rust
pub enum InvocationSurface {
    OpenAiCompatible,
    ProviderNative,
    CloudStorage,
    CloudIaas,
    AppApi,
    AdminApi,
    Internal,
}
```

```rust
pub enum ResourceType {
    ModelCall,
    ChatCompletion,
    Response,
    Embedding,
    Image,
    Audio,
    Video,
    File,
    Upload,
    Thread,
    Assistant,
    VectorStore,
    Batch,
    FineTuningJob,
    Conversation,
    Container,
    RealtimeSession,
    ProviderNativeApi,
    StorageBucket,
    StorageObject,
    IaasInstance,
    FreeEndpoint,
    Unknown,
}
```

### InvocationBilling

```rust
pub struct InvocationBilling {
    pub mode: BillingMode,
    pub meter: Option<BillingMeter>,
    pub quantity_source: BillingQuantitySource,
    pub pricing_required: bool,
    pub settlement_required: bool,
    pub prepaid_required: bool,
    pub resolved_prices: Vec<ResolvedInvocationPrice>,
    pub estimated_quantity: Option<GatewayUsageQuantity>,
    pub final_quantities: Vec<InvocationUsageQuantity>,
}
```

```rust
pub enum BillingMode {
    Free,
    ApiRequest,
    Token,
    ResultCount,
    ItemCount,
    Character,
    AudioSecond,
    VideoSecond,
    Storage,
    Bandwidth,
    Composite,
    ExternalUsageLine,
}
```

```rust
pub enum BillingQuantitySource {
    None,
    FixedRequest,
    RequestBody,
    ResponseBody,
    ResponseHeaders,
    AdapterUsageLines,
    StreamingAccumulator,
    Composite,
}
```

### InvocationRouting

```rust
pub struct InvocationRouting {
    pub strategy: AiRouteStrategy,
    pub failure_strategy: AiRouteFailureStrategy,
    pub sticky: Option<StickyRouting>,
    pub route_plan: Option<RoutePlan>,
    pub attempted_routes: Vec<RouteAttempt>,
    pub policy_id: Option<i64>,
    pub rule_id: Option<i64>,
}
```

```rust
pub struct StickyRouting {
    pub mode: StickyMode,
    pub object_type: String,
    pub object_id: Option<String>,
    pub parent_object_type: Option<String>,
    pub parent_object_id: Option<String>,
    pub scope: StickyScope,
    pub binding: Option<StickyObjectRouteBinding>,
}
```

```rust
pub enum StickyMode {
    None,
    CreateThenSticky,
    ParentSticky,
    LookupSticky,
}
```

### InvocationAccount

```rust
pub struct InvocationAccount {
    pub provider_code: String,
    pub channel_id: i64,
    pub region_code: String,
    pub credential_id: Option<i64>,
    pub credential_rotation: Option<String>,
    pub base_url: Option<String>,
    pub secret_ref: Option<String>,
    pub auth_profile: ProviderAuthProfile,
    pub timeout_ms: Option<u64>,
    pub retry_policy: Option<ProviderRetryPolicy>,
    pub provider_model: Option<String>,
}
```

### InvocationDispatch

```rust
pub struct InvocationDispatch {
    pub mode: DispatchMode,
    pub invocation_shape: InvocationShape,
    pub adapter_route: Option<ProviderAdapterRouteConfig>,
    pub upstream_uri: Option<Uri>,
    pub transformed_body: Option<InvocationBody>,
}
```

```rust
pub enum DispatchMode {
    DirectOpenAiRelay,
    DirectHttpPassthrough,
    InternalProviderAdapter,
    SyntheticLocalResponse,
    NoopFree,
}
```

## Interceptor 切分

### RequestCaptureInterceptor

职责：

- 捕获 method/path/query/header/body。
- 生成 request id。
- 读取 trace id、idempotency key、user-agent、client ip。

不做：

- 不鉴权。
- 不解析业务资源。
- 不改 body。

### AuthenticationInterceptor

职责：

- 解析 Gateway API Key、App Session、Admin Subject、Internal Service、Anonymous Free。
- 填充 `InvocationSubject`。
- 对需要鉴权的资源提前失败。

复用：

- 现有 `authenticate_gateway_api_key` 和 `ApiKeyAuthenticator`。

### ResourceClassificationInterceptor

职责：

- 根据 method/path/provider prefix/adapter manifest/openapi operation 识别资源。
- 填充 `InvocationResource`。
- 决定 `route_key`、`api_code`、`capability`、`model_requirement`。

迁移：

- 当前 `openai_route_taxonomy.rs` 的分类规则迁移到 `OpenAiResourceClassifier`。
- provider-native 路径迁移到 `ProviderNativeResourceClassifier`。
- cloud storage/IaaS 由 adapter manifest 或 cloud openapi operation 生成 classification。

### PayloadExtractionInterceptor

职责：

- 提取 model。
- 提取 resource id 和 parent resource id。
- 提取 stream 标记。
- 提取 provider-native model。
- 对 Required model 缺失返回标准错误。

### BillingPolicyInterceptor

职责：

- 根据 resource/api_code/capability 决定 `BillingMode`。
- 决定是否需要 pricing、settlement、prepaid。
- 设定默认 meter。

规则示例：

- `/v1/chat/completions`：`Composite + Token`。
- `/v1/embeddings`：`Composite + EmbeddingInputToken`。
- `/v1/files` POST：`ApiRequest`。
- `/v1/files/{id}/content`：可配置为 `ApiRequest` 或 `Free`。
- provider-native video task start：`ApiRequest` 或 `ExternalUsageLine`。
- metadata/list/public docs：`Free`。

### StickyResolutionInterceptor

职责：

- 根据 `AiRouteStrategy` lookup sticky binding。
- 对 `LookupSticky` 找不到 binding 时 fail closed。
- 对 `ParentSticky` 查 parent binding。
- 对 `CreateThenSticky` 只准备上下文，成功后由 `StickyCommitInterceptor` 写入。

迁移：

- 当前 `StickyObjectRouteStore` 提升为产品层 port：`StickyRouteStore`。

### RoutePlanningInterceptor

职责：

- model route：调用 `ProviderRouteSelector.select_plan`。
- channel route：调用 `ProviderRouteSelector.select_channel_route`。
- sticky route：由 binding 生成单路由 plan。
- primary channel：选择 channel route。
- fanout aggregate：生成多 route plan。

输出：

```rust
pub struct RoutePlan {
    pub routes: Vec<RoutePlanCandidate>,
    pub policy_id: Option<i64>,
    pub rule_id: Option<i64>,
    pub failure_strategy: AiRouteFailureStrategy,
}
```

### AccountResolutionInterceptor

职责：

- 将 route plan 当前 candidate 转为 `InvocationAccount`。
- 对缺少 base_url、secret_ref、auth_profile 的调用提前失败。
- 保留 region、credential、provider_model。

### SecretResolutionInterceptor

职责：

- 解析 `secret_ref`。
- 渲染 bearer/header/query/default headers。
- 明文 secret 只存在 dispatch auth material，禁止进入 telemetry。

### PricingPreflightInterceptor

职责：

- 对需要预先确认价格的请求调用 `PricingResolver`。
- 对 `Free` 跳过。
- 对 `ExternalUsageLine` 可延迟到响应后处理。

### RequestTransformInterceptor

职责：

- 重写 model/body/query。
- 注入 provider auth。
- 设置 provider default headers。
- 构造 adapter invocation request。

### DispatchExecutor

职责：

- 执行真实调用。
- 统一 retry/failover。
- 记录每个 candidate 的 attempt。

支持：

- `DirectOpenAiRelay`
- `DirectHttpPassthrough`
- `InternalProviderAdapter`
- `SyntheticLocalResponse`
- `NoopFree`

### ResponseNormalizationInterceptor

职责：

- 统一 OpenAI-compatible error。
- 统一 provider-native adapter error。
- 统一 internal router error。
- 保留 provider 原始成功响应。

### UsageExtractionInterceptor

职责：

- 从 OpenAI usage 解析 token。
- 从 adapter usage_lines 解析数量。
- 从 response body/header 解析 result/item/audio/video 等数量。
- 对 `ApiRequest` 生成 fixed quantity。
- 对 `Free` 不生成 settlement quantity。

### PricingSettlementInterceptor

职责：

- 根据 final quantities 和 pricing 生成 `GatewayUsageRecordCommand`。
- 一次调用可生成多条 usage。
- 写 usage recorder。
- 唤醒 settlement worker。

### StickyCommitInterceptor

职责：

- 对 `CreateThenSticky` 从成功响应提取 object id。
- 对 `ParentSticky` 写子资源或关联资源 binding。
- 只在成功响应后提交。

### TraceTelemetryInterceptor

职责：

- 成功、失败、跳过计费、免费接口、鉴权失败、路由失败都写 trace。
- 错误信息必须脱敏。
- secret 禁止落 trace。

## 典型流程

### Token 模型调用

```text
POST /v1/chat/completions
  -> GatewayApiKey
  -> OpenAiCompatible / ChatCompletion / RequiredModel
  -> Composite Token billing
  -> StatelessFailover
  -> select model route plan
  -> resolve account and secret
  -> dispatch candidate chain
  -> extract prompt/completion/cache tokens
  -> resolve prices by meter
  -> write usage and trace
```

### API 次数计费调用

```text
POST /v1/files
  -> GatewayApiKey
  -> OpenAiCompatible / File / ApiRequest
  -> CreateThenSticky
  -> select channel route
  -> dispatch
  -> extract file_id
  -> upsert sticky binding
  -> write 1 request usage and trace
```

### Sticky 查询调用

```text
GET /v1/files/file_123/content
  -> GatewayApiKey
  -> OpenAiCompatible / File / LookupSticky
  -> lookup sticky binding
  -> selected bound account
  -> fail closed dispatch
  -> usage/trace according to billing policy
```

### Provider-native adapter 调用

```text
POST /tencent-cloud/vidu/ent/v2/start-end2video
  -> GatewayApiKey
  -> ProviderNative / Video / endpoint_key
  -> ApiRequest or ExternalUsageLine billing
  -> select channel route
  -> resolve adapter route
  -> build AdapterInvocationRequest
  -> dispatch adapter
  -> parse adapter usage_lines
  -> write usage and trace
```

### 免费接口

```text
GET /some/free/metadata
  -> AnonymousFree or GatewayApiKey
  -> FreeEndpoint
  -> BillingMode::Free
  -> SyntheticLocalResponse or DirectHttpPassthrough
  -> trace only
```

## 文件结构目标

新增产品层模块：

```text
services/sdkwork-clawrouter-router-service/src/application/invocation/
  mod.rs
  account.rs
  billing.rs
  body.rs
  classification.rs
  dispatch.rs
  error.rs
  extension.rs
  interceptor.rs
  invocation.rs
  pipeline.rs
  pricing.rs
  resource.rs
  routing.rs
  sticky.rs
  subject.rs
  telemetry.rs
  usage.rs
```

新增 gateway HTTP 适配层：

```text
crates/sdkwork-clawrouter-cloud-gateway/src/invocation_http.rs
crates/sdkwork-clawrouter-cloud-gateway/src/invocation_router.rs
```

删除或大幅替换：

```text
services/sdkwork-clawrouter-router-service/src/api/openai_chat.rs
services/sdkwork-clawrouter-router-service/src/api/openai_embeddings.rs
services/sdkwork-clawrouter-router-service/src/api/openai_responses.rs
services/sdkwork-clawrouter-router-service/src/api/openai_invocation.rs
services/sdkwork-clawrouter-router-service/src/api/openai_runtime.rs
services/sdkwork-clawrouter-router-service/src/api/openai_usage.rs
crates/sdkwork-clawrouter-cloud-gateway/src/passthrough.rs
crates/sdkwork-clawrouter-cloud-gateway/src/route_scoped_openai_passthrough.rs
```

这些文件可先替换为薄路由入口，再逐步删除旧私有函数。最终不保留旧编排。

## 测试策略

必须覆盖：

- Chat completion token 计费。
- Embeddings token 计费。
- Responses token 计费。
- API request 计费。
- Free endpoint trace only。
- CreateThenSticky。
- ParentSticky。
- LookupSticky。
- Sticky lookup miss fail closed。
- StatelessFailover candidate retry。
- StatelessFailClosed 不重试。
- Provider-native direct passthrough。
- Provider-native internal adapter。
- Adapter usage lines。
- Secret ref auth rendering。
- Region-specific pricing。
- Credential rotation。
- Streaming response trace。

## 风险和约束

- 一次性重写会导致短期大量测试失败，必须按新测试矩阵重建。
- 删除旧编排前要确认 public exports 不再被其他 crate 引用。
- 需要保留 OpenAPI route surface，不能因为内部重构丢接口。
- Secret 明文不能进入 `InvocationTelemetry`。
- Streaming usage 需要单独 accumulator，不能只按普通 JSON response body 解析。
- Multipart/body streaming 不能在 request capture 阶段无限制缓存。

## 结论

采用一次性重写是合理的。当前应用尚未形成用户兼容约束，旧实现已经出现三套调用编排并行，继续叠加兼容层会留下长期技术债。本次应删除旧编排，建立统一 `Invocation` 和 `InvocationPipeline`，保留底层可复用能力，重新实现所有 API router 调用处理流程。

