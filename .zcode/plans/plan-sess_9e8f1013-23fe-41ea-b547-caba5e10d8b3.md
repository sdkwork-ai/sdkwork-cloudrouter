# 对外开放 API 调用链（Call Chain）方案

## 一、目标与边界

开放 API（open-api 代理面，如 `/v1/chat/completions`、vendor passthrough）的请求在执行前/执行中通过一条**可组合、可配置的调用链**做守卫：**并发控制 + IP 白名单/黑名单**，支持**全局配置与单个 apikey 配置**。链本身做成**独立通用组件**（积木单元），经现有 interceptor 机制集成，遵循 sdkwork-specs 规范。

**边界**：限流（RateLimit）已有完整实现（`GatewayInvocationRateLimiter` + `ai_quota_policy` + risk rules），不在本次范围，但架构上可后续作为新 stage 接入。不替代标准 `WebCallInterceptorChain`（API_SPEC §10.3 / WEB_FRAMEWORK_SPEC §8 的 18 阶段 HTTP 请求链，由 web-framework 拥有）——新链是业务域守卫链，与之互补。

## 二、模块归属（已确认：并入 sdkwork-web-framework）

新建 crate **`sdkwork-web-chain`**（NAMING_SPEC §4.3 的 `sdkwork-web-<capability>` 家族，capability=`chain`），位于 `E:\sdkwork-space\sdkwork-web-framework\crates\sdkwork-web-chain`，注册进 web-framework `Cargo.toml` members + `[workspace.dependencies]`。依赖 `sdkwork-web-core`（复用 `ConcurrentAdmissionStore`、`RateLimitStore`、`WebFrameworkError`）与 `sdkwork-web-contract`（类型）；axum 仅作可选 feature（WebCallInterceptor 适配器）。遵守其 `dependencyRule: business-repos-depend-on-framework; framework-must-not-depend-on-business`——链只定义 trait 与引擎，业务侧数据由 clawrouter 实现 `PolicyResolver` 注入。

## 三、通用组件设计（sdkwork-web-chain）

### 3.1 链引擎（积木核心）
```rust
pub enum ChainVerdict { Pass, Reject(RejectReason) }          // RejectReason: IpForbidden / ConcurrencyExceeded{retry_after_secs} / Custom{code,message}

#[async_trait]
pub trait ChainStage: Send + Sync {
    fn name(&self) -> &str;
    fn stage_order(&self) -> u32;                              // 排序，可配
    fn enabled(&self, config: &StageEnablement) -> bool;       // 独立启停
    async fn before(&self, ctx: &mut ChainContext) -> Result<ChainVerdict, ChainError>;   // 默认 Pass
    async fn after(&self, ctx: &mut ChainContext) -> Result<(), ChainError>;              // 释放（流式安全）
    async fn on_error(&self, ctx: &mut ChainContext, err: &ChainError) -> Result<(), ChainError>;
}

pub struct CallChain { stages: Vec<Arc<dyn ChainStage>>, resolver: Arc<dyn PolicyResolver> }
// CallChainBuilder::new().with_stage(..).with_policy_resolver(..).build()
// before 按 stage_order 执行、首遇 Reject 短路；after 逆序；on_error 逆序（对齐现有 InvocationPipeline 语义）

pub struct ChainContext {
    pub client_ip: Option<IpAddr>,
    pub scopes: ChainScopes,            // global / api_key_id / tenant_id / organization_id
    pub policy: Arc<ResolvedChainPolicy>, // resolver 合并结果
    stage_state: AnyMap,                // 各 stage 私有状态（如 lease token）
}
```
自由组合 = 编程式 `with_stage`；自由配置 = 配置驱动的 `ChainConfig`（serde，TOML/JSON/DB 均可承载）+ 运行时 `PolicyResolver` 分层解析。**新增 stage（如 RateLimit/Audit）只需实现 trait，引擎零改动**。

### 3.2 策略模型（分层合并，行业对齐 Kong/Envoy per-route 覆盖全局语义）
```rust
pub struct ChainPolicy {
    pub concurrency: Option<ConcurrencyPolicy>,   // { max_inflight: u32 }
    pub ip_access: Option<IpAccessPolicy>,        // { mode: Open|AllowlistOnly, allowlist: Vec<String>, denylist: Vec<String> }
    pub stages: StageEnablement,                  // 每 stage on/off
}
pub trait PolicyResolver: Send + Sync {
    fn resolve(&self, ctx: &ChainScopeContext) -> ResolvedChainPolicy;
}
```
合并规则（字段级，最具体优先）：**内置默认 → 全局策略 → 单个 apikey 策略**；stage 开关采用"显式关闭优先"（安全默认）。

### 3.3 ConcurrencyStage（并发控制，bulkhead 模式）
- 复用 `sdkwork-web-core::ConcurrentAdmissionStore`（`try_acquire(key, limit)` / `release(key)` / `is_distributed_ha`，已有 memory 实现；`api_chain.rs:600-617` 已有 `tenant:{id}:concurrent`/`cred:{id}:concurrent` 先例）。
- 作用域 key：`global:concurrent`、`api-key:{id}:concurrent`（本次新增）、`tenant:{id}:concurrent`（迁移现有 TenantInflight 用）。
- 分布式：新增 Redis 租约实现（Lua acquire + TTL 续租 + lease lost 取消，对齐现有 `TenantInflightCounter` 模式与 `sdkwork-web-store-redis`），存入 `sdkwork-web-store-redis` 或本 crate 的 redis feature。
- 生命周期：`before` 获取 lease → `after`/`on_error` 释放；流式由调用方保证 after 在 EOF 后执行（clawrouter pipeline 已具备该机制）。
- 拒绝：**429 + Retry-After**（RFC 6585，与现有 rate_limit_error 一致），可选 503。

### 3.4 IpAccessStage（IP 白名单/黑名单）
- 语义（对齐 AWS WAF/安全组）：**denylist 恒优先拒绝**；`AllowlistOnly` 且 allowlist 非空时仅命中者放行；`Open` 且名单为空 = 全放行。
- 匹配：`ipnet` crate，IPv4/IPv6 + CIDR + 精确。
- `IpExtractor` trait 可插拔（防伪策略由调用方注入；clawrouter 复用现有 `extract_client_ip` 的 `trust_forwarded_headers` 逻辑）。
- 拒绝：403。

### 3.5 WebCallInterceptor 适配器（可选，跨面复用）
提供 `impl WebCallInterceptor` 适配器，使同一链可挂入标准 18 阶段链（不改变标准阶段顺序），供 app-api/backend-api 等面复用——体现"自由组合"。

## 四、Claw Router 集成（统一收敛，分步迁移）

### 4.1 依赖与治理
- clawrouter 根 `Cargo.toml` `[workspace.dependencies]` 声明 `sdkwork-web-chain = { path = "../sdkwork-web-framework/crates/sdkwork-web-chain" }`（DEPENDENCY_MANAGEMENT_SPEC §3；成员 crate 用 `{ workspace = true }`）。

### 4.2 执行接线（基于现有 interceptor 机制）
1. **新增 `CallChainInterceptor`**（承载整条链）注册进 `invocation_pipeline_with_redis`（`crates/sdkwork-clawrouter-edge-runtime/src/invocation_router.rs:432-492`）——ConcurrencyStage（global + per-key 作用域）经 before/after/on_error 获得流式安全的租约生命周期。
2. **预检快路径**：`GatewayInvocationPolicyGuard::enforce`（`services/.../application/gateway_invocation_policy.rs:42-107`）的 IP 判定委托 `IpAccessStage`（预检仍 403 前置、免进 pipeline）；rate limit 逻辑不动。
3. **迁移 TenantInflight**（分步灰度）：新增 ConcurrencyStage 的 tenant 作用域模式（默认 `max_inflight=100` 等值），配置开关 `tenantInflight.useChainStage` 灰度，等价验证后移除 `TenantInflightInterceptor` 及其租约代码。
4. 拒绝响应复用现有 429/403 结构（`invocation_http.rs:591-608`）。

### 4.3 配置持久化（DB）
新增表 **`iam_gateway_chain_policy`**（registry 驱动：`docs/schema-registry/sdkwork-clawrouter.tables.yaml` → materialize DDL → migration）：
```
id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, deleted_at, deleted_by, metadata,
scope_type (GLOBAL=0 | API_KEY=1), scope_id (0 或 api_key_id),
policy_name, payload JSONB, effective_from, effective_to
```
payload 示例：`{"concurrency":{"maxInflight":50},"ipAccess":{"mode":"allowlistOnly","allowlist":["1.2.3.0/24"],"denylist":[]},"stages":{"enabled":["concurrency","ipAccess"]}}`

**兼容数据源**：clawrouter 的 `PolicyResolver` 实现合并 内置默认 → 全局行 → per-key 行，并保留旧数据源等值兼容（`iam_gateway_access_policy.ip_allowlist/ip_denylist`、`iam_gateway_risk_rule` WAF），收敛为统一求值、行为不变。

### 4.4 API 管理面（双管理面）
- **backend-api（管理员·全局）**：`GET/PATCH /backend/v3/api/system/chains/policy`（全局并发上限、IP 名单、stage 开关）；`GET .../chains/policy/keys/{apiKeyId}`（查看单个 key 合并后的生效策略）。`x-sdkwork-resource: chains.policy`；写表 `iam_gateway_chain_policy`、`ops_audit_log`。
- **app-api（key 属主·单个 apikey）**：`POST/PATCH /app/v3/api/iam/api_keys{/{apiKeyId}}` 扩展 `chain` 字段（maxInflight、ipAllowlist、ipDenylist、stages）；`GET` 返回 chain 配置。
- 契约更新（`apis/backend-api/`、`apis/app-api/`）→ `pnpm api:materialize:write` → 经 clawrouter-sdk-generation skill 重新生成 `@sdkwork/clawrouter-backend-sdk`、`@sdkwork/clawrouter-app-sdk`。
- open-api 面不加管理端点，仅执行链。

### 4.5 PC 前端
- 管理后台：`sdkwork-clawrouter-pc-admin-ratelimit`（风控）新增"调用链"tab（全局并发、全局 IP 名单编辑、stage 启停），走 backend SDK。
- Console：`sdkwork-clawrouter-pc-console-api-keys` 创建/编辑 Key 抽屉新增"调用链策略"区（per-key 并发 + IP 名单），走 app SDK。

## 五、规范合规
- NAMING_SPEC：`sdkwork-web-chain` 属 `sdkwork-web-<capability>` 家族、归 web-framework（满足"business repos must not create local sdkwork-web-*"）；不引入 common/core/manager 后缀。
- web-framework：更新 `specs/component.spec.json`（extensionTraits 登记 `ChainStage`/`PolicyResolver`/`IpExtractor`/`ConcurrencyLeaseStore`）、`specs/web-framework-capability.matrix.json`；必要时 `specs/WEB_FRAMEWORK_STANDARD.md` 补链章节（不复制全局规范正文）。
- clawrouter：DB 表走 schema-registry/materialize；API 走 apis/manifest.json + materialize；SDK 走生成管线；前端走生成 SDK 集成（不得 raw fetch）。
- 不复制标准 18 阶段链语义（API_SPEC §10.3）；新链以组件身份被调用方组合。

## 六、实施里程碑
- **M1 组件骨架**：`sdkwork-web-chain` crate（engine + ChainPolicy + 合并逻辑 + ChainStage/PolicyResolver traits）+ 单测（顺序/短路/合并/启停）。web-framework 规范文件登记。
- **M2 内置 stage**：ConcurrencyStage（复用 ConcurrentAdmissionStore + Redis 租约 store）+ IpAccessStage（ipnet 匹配）+ 属性测试。
- **M3 clawrouter 接线**：workspace 依赖 + `CallChainInterceptor` 入 pipeline（global/per-key 并发生效）+ 预检 IP 委托 IpAccessStage。
- **M4 配置层**：`iam_gateway_chain_policy` 表 + 读模型 + `PolicyResolver` 实现（含旧数据源兼容合并）。
- **M5 管理面**：backend-api/app-api 契约 + materialize + SDK 生成 + 管理后台"调用链"tab + Console Key 抽屉扩展。
- **M6 收敛迁移**：TenantInflight → ConcurrencyStage tenant 作用域（灰度开关、等值验证后移除旧实现）；全量验证与文档。

## 七、验证计划
- web-framework：`cargo test -p sdkwork-web-chain`（含 IP/CIDR 匹配、策略合并、并发租约行为、链短路属性测试）；`cargo test --workspace`。
- clawrouter：`cargo check`/`cargo test` 触及 crate（router-service、edge-runtime、repository）；`pnpm api:materialize:write` + SDK 生成 + 集成检查（clawrouter-sdk-generation skill）；前端受影响包 build + runtime tests（admin-sidebar-runtime / console-usage-runtime 等）；schema-registry 校验与 migration up/down 测试。

## 风险与对策
- TenantInflight 为生产关键路径 → 分步灰度（开关 + 等值默认 100 + 对比验证）。
- 旧 IP 数据源与新链策略并存 → 明确合并优先级（链策略 > 旧数据源），先等值后扩展。
- web-framework 不得依赖业务 → 数据解析全部经 clawrouter 注入的 `PolicyResolver`。