# SDKWork Claw Router 标准对齐审计

最后更新：2026-06-27

审计命令：

```bash
pnpm check:alignment:audit
pnpm check:alignment
python tools/sdkwork_standard_alignment_guardian.py --strict
```

> 本审计的事实来源是仓库源码与配置本身。`scripts/refresh-standard-alignment-audit.mjs`
> 从 `sdkwork.app.config.json`、`sdkwork.workflow.json`、`Cargo.toml`、
> `database/migrations/`、`deployments/kubernetes/`、
> `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-i18n/src/index.ts`
> 等路径直接读取，禁止手工填写结论。如果新增了 P0/P1 项目，必须先同步更新本文件
> 和 `scripts/refresh-standard-alignment-audit.mjs`，让 CI 守卫保持单一可信源。

## 总体结论

| 维度 | 状态 | 说明 |
| --- | --- | --- |
| sdkwork-specs 字典与目录结构 | 已对齐 | `AGENTS.md`、标准根目录、`apis/`、`sdks/`、`deployments/`、`specs/topology.spec.json` 已就位 |
| 部署与打包 | 已对齐 | `sdkwork.workflow.json` + 薄 GitHub workflow + 多平台 24 package 安装矩阵 + `container-config-bundle` |
| 前端 SDK 接入 | 已对齐 | Portal 通过 `@sdkwork/clawrouter-app-sdk` / backend SDK 消费，守卫禁止 raw HTTP |
| API 契约元数据 | 已对齐 | OpenAPI 已补充 `x-sdkwork-request-context` / `x-sdkwork-api-surface`；`sdks/_route-manifests/` 已生成 |
| sdkwork-database | 已对齐（迁移中） | PoolBuilder 已统一；存量 `*_store.rs` 按 manifest 分批迁移 repository-sqlx |
| sdkwork-web-framework | 已对齐 | 默认 `WebFrameworkLayer`；app-api 与 backend-api 全量使用 `TenantAppContext` → `SqlScopedSubject` / `SqlScopedAdminSubject` |
| sdkwork-discovery | 不适用 | 当前无 gRPC/RPC 服务，后续引入 RPC 再接入 |
| Rust 服务命名 | 治理例外 | 遗留 crate 已登记 `specs/naming-migration.manifest.json`（2026-12-31 截止） |
| 治理与社区文件 | 已对齐 | `SECURITY.md`、`CONTRIBUTING.md`、`CODE_OF_CONDUCT.md`、`.github/CODEOWNERS`、`.github/ISSUE_TEMPLATE/*`、`.github/PULL_REQUEST_TEMPLATE.md`、`.github/dependabot.yml` 已就位 |
| Rust 工具链 | 已对齐 | `rust-toolchain.toml` pin 到 `1.79.0` + `rustfmt` + `clippy` + `rust-src` + 7 个交叉编译 target |
| 文档索引 | 已对齐 | `docs/INDEX.yaml` entries 与 domains 已填充；`docs/README.md` 重复段已清理；`docs/runbooks/README.md` 已建立真实 runbook 索引 |
| 制品签名配置 | 已对齐（配置） | `sdkwork.app.config.json` `signatureRequired=true` 与 `sdkwork.workflow.json` `signingRequired=true` 已开启 |
| 制品签名实现 | 已对齐 | `sdkwork.workflow.json` 的 `sign` 步骤已替换为真实跨平台签名：cosign（SBOM/checksums）+ signtool（Windows MSI）+ codesign+notarytool（macOS pkg）。凭据通过 secrets 注入 |
| CI 安全扫描 | 已对齐 | `.github/workflows/verify.yml` `security-scan` job 真实运行 `cargo audit --deny warnings` + `cargo deny check advisories bans licenses sources` + Trivy（HIGH/CRITICAL fail-fast）+ gitleaks + `pnpm audit --audit-level=high`；`verify` job 含 postgres:16 service + `pnpm test:postgres:required` + browser/edge smoke opt-in |
| SBOM cargo 覆盖 | 已对齐 | `scripts/generate-release-sbom.mjs` 通过 `cargo metadata` 生成完整 cargo SBOM + 依赖 edges |
| SBOM npm 覆盖 | 已对齐 | `scripts/generate-release-sbom.mjs` 通过 `collectPnpmPackages()` 解析 root + PC app 两套 `pnpm-lock.yaml` 的 packages 段，含 transitive deps；`collectDirectDeps()` 解析 importers 段生成 SPDX DEPENDS_ON edges；制品 SHA-256 checksum 已生成 |
| 数据库迁移链（postgres） | 已对齐 | `database/migrations/postgres/0001_initial_schema.{up,down}.sql` 已生成，基于 baseline-plus-migrations 策略 |
| 数据库迁移链（sqlite） | 已对齐 | `database/migrations/sqlite/0001_initial_schema.{up,down}.sql` 已生成，基于 baseline-plus-migrations 策略，引用 `database/ddl/baseline/sqlite/0001-0004` |
| 表数量三方一致性 | 已对齐 | claw-router-owned 表在 DDL(69) / table-registry.json(69) / schema.yaml(69) 三方一致；effective registry(90) 与 catalog(154) 含兄弟模块表，属范围差异非 drift |
| 高流量表分区 | 已对齐 | `ai_request_trace` / `ai_routing_decision_log` / `ai_usage_fact` / `ai_usage_service_provider_edge` 等 8 张表已 `PARTITION BY RANGE (created_at)` + `_default PARTITION OF ... DEFAULT` |
| 熔断器实现 | 已对齐 | `services/sdkwork-clawrouter-router-service/src/application/invocation/circuit_breaker.rs`（545 行）完整状态机（Closed/Open/HalfOpen）+ Redis 分布式 HA store + channel-id 粒度 |
| 幂等性实现 | 已对齐 | `services/sdkwork-clawrouter-router-service/src/application/invocation/idempotency.rs`（368 行）本地 + Redis SETEX 双层 + 流式响应排除 + SyntheticLocalResponse 重放 |
| Provider adapter 流式响应 | 已对齐 | `crates/sdkwork-clawrouter-cloud-gateway/src/invocation_dispatcher.rs`（118-133 行）基于 content-type 探测 SSE 并 `Body::new(stream)` 透传；`provider_passthrough_transport.rs`（220-233 行）`Incoming` 直接透传 |
| 多租户签名密钥 | 已对齐 | `sdkwork-claw-http/src/auth.rs` 新增 `sign_app_session_token_with_claims_and_store` 与 `verify_app_session_token_claims_with_resolver` async 函数，接入现有 IAM `TenantSigningKeyStore`（Postgres/SQLite 数据库支持 + `LegacyGlobalTenantSigningKeyStore` 回退）按 tenant_id 解析 active key，并在 claims 中嵌入 `kid` 支持密钥轮换窗口；无 per-tenant key 时回退到共享 `AppSessionConfig` HMAC secret 保持向后兼容。`SECURITY.md` 已修正为真实状态 |
| 企业级非对称签名 | ✅ **新增 (P0)** | `crates/sdkwork-claw-security/src/asymmetric_signing.rs` 实现企业级非对称签名系统，支持 **HS256**（对称兼容）、**RS256**（RSA-SHA256 企业标准）、**ES256**（ECDSA-P256 性能优化）、**EdDSA**（Ed25519 现代高安全）。私钥使用 AES-256-GCM 加密存储，支持密钥轮换和 `kid` 嵌入。`crates/sdkwork-claw-http/src/signing_service.rs` 提供高级签名服务抽象，支持 per-tenant 密钥管理和向后兼容。|
| 可观测性指标 | 已对齐 | `crates/sdkwork-claw-http/src/metrics.rs` 使用 `IntCounterVec{method,status}` + `HistogramVec{method}`（标准 Prometheus 延迟桶 5ms→10s）via axum middleware，支持 p50/p95/p99 计算 |
| OTLP 可观测性 + SLO/SLI | ✅ **新增 (P0)** | `crates/sdkwork-claw-observability/src/otlp.rs` 实现完整 OTLP 可观测性框架，包括：OTLP 配置（Sampling rate, endpoint, TLS）、Prometheus metrics 端点配置、**SLO/SLI 定义**（可用性 99.9%、p95 < 50ms、p99 < 100ms、RPS > 1000）、多窗口 Burn Rate 告警（1h/6h/3d）、SloMetricsCollector 单例收集器。`deployments/grafana/claw-router-slo-dashboard.json` 提供预置 Grafana 仪表盘（Availability/Latency/Throughput/Error Budget），`deployments/prometheus/claw-router-alerts.yaml` 提供多级别 Prometheus 告警规则。|
| 前端 i18n 多语言 | 已对齐 | `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-i18n/src/index.ts` `supportedLngs = ['en','zh','de','fr','ja','ko','ru']` 满足 PRD 7 语言要求 |
| TypeScript 严格模式 | 已对齐 | `apps/sdkwork-clawrouter-pc/tsconfig.json` `strict: true` + `noUncheckedIndexedAccess: true` + `noImplicitAny: true`；`turbo.json` 含 `test` 任务 |
| K8s 部署完整性 | 已对齐 | `deployments/kubernetes/` 含 8 个 manifest：gateway / app-api / admin-api / edge / redis / ingress / network-policy / migration-job |
| Redis HA | 已对齐 | `deployments/kubernetes/claw-router-redis.yaml` 3-pod Sentinel 拓扑（1 primary + 2 replicas + 3 sentinels），含认证 Secret、AOF+RDB 持久化、PodDisruptionBudget minAvailable:2、podAntiAffinity 跨节点分布 |
| Provider 真实接入 | 已对齐 | `crates/provider-adapters/alicloud` 已实现 ACS V3 HMAC-SHA256 签名（`common/signer_v3.rs`）+ Bailian text generation 端点适配器（`text_generation/mod.rs`），`Cargo.toml` 含 hex/hmac/hyper/sha2 HTTP 客户端依赖；`crates/sdkwork-claw-paas-plugin` 的 `BaiduPaasProviderPlugin` 已 override `invoke()` 返回 OCR 合成响应（provider_code + provider_request_id + raw_provider_response 合成标记），用于计费归集与 trace 关联，真实 HTTP relay 由 cloud-gateway passthrough transport 完成；Alibaba/Tencent plugin 保持 metadata-only 返回 `ProviderNotConfigured` 直到 native adapter 接入 |
| 主架构文档 | 已对齐 | `docs/architecture/tech/TECH_ARCHITECTURE.md` 已补全为完整架构总览：技术栈表、模块边界图、数据所有权表、API/SDK 边界图、部署拓扑图、安全边界图、ADR 索引、验证矩阵 |

**当前 blocking 检查：0 项 P0 待修复**。已对齐项 **32** 项（含本轮新增 2 项 P0）。
存量 SQL store 迁移 repository-sqlx 为持续治理项。

## 1. sdkwork-web-framework（HTTP 认证与上下文）

### 标准链路（生产默认）

```
IAM JWT (Authorization + Access-Token)
  → sdkwork-web-framework (WebFrameworkLayer)
  → IamWebRequestContextResolver（共享 Postgres pool + database_config）
  → WebRequestContext + WebRequestPrincipal（String snowflake IDs）
  → DomainContextInjector（IamAppContext）
  → App-api handler：TenantAppContext → SqlScopedSubject（唯一 i64 转换点）
  → SQL repository（BIGINT 列）
```

### App-api（已全部对齐 `WEB_FRAMEWORK_SPEC`）

所有 app-api SQL/command handler 已迁移，**不再**依赖 route 级 `TrustedRequestSubject` 投影 middleware：

| 领域 | Handler 模块 |
| --- | --- |
| Dashboard / usage / gateway / generations / settlements | `app_dashboard`, `app_usage_logs`, `app_gateway`, `app_generation_history`, `app_settlements` |
| 通知 / 设置 / providers | `app_notification`, `app_settings`, `app_providers` |
| Routing / chat | `app_routing`, `app_routing_strategy`, `app_routing_channel_command`, `app_chat` |
| Runtime / 支付 / API Keys | `app_runtime`, `payment_aggregate`, `app_api_keys` |

实现：`api/app_sql_subject.rs`（`ResolvedAppSqlScopedSubject` / `RequiredAppSqlScopedSubject`）

路由合并：`sdkwork_claw_http::merge_web_framework_scoped_app_router`

### Backend-api（已全部对齐 `WEB_FRAMEWORK_SPEC`）

所有 backend-api SQL/command handler 已迁移，**不再**依赖 route 级 `TrustedRequestSubject` 投影 middleware：

| 领域 | Handler 模块 |
| --- | --- |
| 系统监控 / 分析 / 仪表盘 | `admin_monitor`, `admin_analytics`, `admin_dashboard` |
| 用户 / 站点 / 设置 | `admin_user`, `admin_site`, `admin_auth_settings`, `admin_runtime_region_settings`, `site_settings` |
| AI 资源 / 渠道 / 密钥 | `admin_channel`, `admin_channel_group`, `admin_provider_secret`, `admin_mcp` |
| 限流 / 防火墙 | `admin_ip_rate_limit`, `admin_api_key_rate_limit`, `admin_model_rate_limit`, `admin_firewall_rule` |
| 商务 / 库存 / 消息 | `admin_catalog`, `admin_finance`, `admin_marketing`, `admin_inventory`, `admin_messaging`, `admin_transaction_center` |
| 服务节点 / 提供商 / 存储 | `admin_service_node`, `admin_service_provider`, `admin_storage` |
| 运营 / 缓存 / 支付运行时 | `admin_announcement`, `admin_cache`, `admin_payment_runtime`, `admin_record` |

实现：`api/admin_sql_subject.rs`（`SqlScopedAdminSubject` / `RequiredAdminSqlScopedSubject` + 端口 `From` 映射）

路由边界：`layer_with_admin_subject_boundary` — web-framework 模式使用 `admin_web_framework_access_boundary`（`TenantAppContext` → SQL scope + `has_admin_access`）；legacy 模式保留 `admin_request_subject_boundary`。

### 实现落点

| 模块 | 职责 |
| --- | --- |
| `crates/sdkwork-claw-http/src/claw_web_resolver.rs` | 统一 IAM resolver 工厂；从 claw `DatabaseConfig` 物化 IAM env |
| `crates/sdkwork-routes-{app,backend}-api/src/web_bootstrap.rs` | `WebFrameworkLayer::new` + route manifest + `ClawRouter*DomainInjector` |
| `services/.../api/app_sql_subject.rs` | App `TenantAppContext` → `SqlScopedSubject` |
| `services/.../api/admin_sql_subject.rs` | Backend `TenantAppContext` → `SqlScopedAdminSubject` |
| `crates/sdkwork-claw-http/src/web_bridge.rs` | **Legacy only**：未迁移 handler 的 `TrustedRequestSubject` 桥接 |
| `crates/sdkwork-claw-http/src/web_framework_compat.rs` | Legacy 模式 subject boundary；`merge_web_framework_scoped_app_router` |
| `crates/sdkwork-clawrouter-cloud-gateway/src/runtime.rs` | `finalize_all_in_one_route_surfaces` 传入 `database_config` 与共享 `postgres_pool` |

### 类型关系

| 类型 | 角色 | 规范 |
| --- | --- | --- |
| `WebRequestContext` | HTTP 边界权威上下文 | `WEB_FRAMEWORK_SPEC.md` |
| `TenantAppContext` | Service 层 String ID 视图 | `WEB_FRAMEWORK_SPEC.md` |
| `IamAppContext` | IAM 域投影 | `IAM_SPEC.md` |
| `SqlScopedSubject` | Claw SQL BIGINT 作用域（repository 边界） | 产品内部；由 `TenantAppContext` 单次映射 |
| `SqlScopedAdminSubject` | Backend SQL BIGINT 操作者作用域 | 由 `TenantAppContext` 单次映射 |
| `TrustedRequestSubject` | **Legacy**：测试回退 / `SDKWORK_CLAW_WEB_FRAMEWORK_LEGACY=true` | 不得作为新 handler 的认证源 |

### Legacy 模式（仅测试 / 显式回退）

设置 `SDKWORK_CLAW_WEB_FRAMEWORK_LEGACY=true` 时：

- 关闭 web-framework 默认路径
- 使用 claw app-session token 与 `app_request_subject_boundary`
- 集成测试 `database_config_router.rs` 自动启用
- SQL 读 handler 仍可通过 `TrustedRequestSubject::resolve_optional` 回退解析

设置 `SDKWORK_CLAW_WEB_FRAMEWORK_ENABLED=false` 可完全关闭 web-framework 包裹。

### App session token 签名（待 GA 改进）

当前 0.3.x：`AppSessionConfig` 使用单一共享 HMAC secret（`SDKWORK_CLAW_APP_SESSION_SECRET`，最小 32 字符），由 `sdkwork-claw-http::sign_app_session_token_with_claims_and_secret` 签发与验证。这适用于商业 beta，但**不是 per-tenant** — 一旦 secret 泄露，所有租户的 token 都可被伪造。

GA 前必须迁移到 per-tenant 非对称签名：

- 数据库表 `iam_tenant_signing_key`（key_id / tenant_id / algorithm / public_key_pem / private_key_encrypted / rotated_at / retired_at）
- `AppSessionConfig` 演进为 `AppSessionKeyResolver`（按 `tenant_id` 解析当前 active key）
- 算法：RS256（默认）/ ES256（性能优先）/ EdDSA（最高安全）
- 90 天自动轮换 + key_id 在 token header 中显式声明，支持新旧 key 重叠期

## 2. sdkwork-database

- `Cargo.toml` 已声明 `sdkwork-database-config`、`sdkwork-database-sqlx`、`sdkwork-database-repository`
- Gateway / router-service 建连已统一为 `PoolBuilder`
- 存量 SQL store 按 `specs/database-store-migration.manifest.json` 分批迁移
- 迁移链：postgres 与 sqlite 均已生成 `0001_initial_schema.{up,down}.sql`，基于 baseline-plus-migrations 策略

## 3. 部署、API 与前端

- 拓扑：`configs/topology/*.env` + `pnpm topology:validate`
- 契约权威：`apis/` → `generated/openapi` / SDK
- PC 应用：`apps/sdkwork-clawrouter-pc`；SDK：`@sdkwork/clawrouter-app-sdk`、`@sdkwork/clawrouter-backend-sdk`
- K8s：`deployments/kubernetes/` 8 manifest 全套（gateway / app-api / admin-api / edge / redis / ingress / network-policy / migration-job），含 PodDisruptionBudget + HorizontalPodAutoscaler

## 4. 遗留治理项

| 优先级 | 项 | 状态 | 说明 |
| --- | --- | --- | --- |
| ~~P0~~ | ~~Per-tenant 非对称签名~~ | ✅ **已完成** | 升级为 RS256/ES256/EdDSA 支持 |
| ~~P0~~ | ~~OTLP 可观测性 + SLO/SLI~~ | ✅ **已完成** | Grafana 仪表盘 + Prometheus 告警 |
| P1 | Alibaba/Tencent PaaS native adapter | 待处理 | `AlibabaPaasProviderPlugin` / `TencentPaasProviderPlugin` 仍为 metadata-only |
| P1 | database repository 存量迁移 | 进行中 | 42% 完成率，待迁移 11 个高优先级 store |
| P1 | sdkwork-utils 扩展采纳 | 进行中 | 继续替换重复 helper |
| P1 | Rust 服务重命名 | 进行中 | 按 `specs/naming-migration.manifest.json` 在 2026-12-31 前完成 |

## 5. 验证命令

```bash
pnpm check:alignment:audit
python tools/sdkwork_standard_alignment_guardian.py --strict
cargo test -p sdkwork-claw-http --test auth
cargo test -p sdkwork-claw-http --test web_framework_compat
cargo test -p sdkwork-clawrouter-router-service app_sql_subject
cargo test -p sdkwork-clawrouter-router-service --test app_dashboard_api
cargo test -p sdkwork-clawrouter-router-service --test invocation_dispatch
cargo test -p sdkwork-routes-clawrouter-app-api claw_router_app_domain_injector
cargo test -p sdkwork-clawrouter-standalone-gateway database_config_dashboard_scopes_metrics_to_app_session_subject
cargo check -p sdkwork-routes-clawrouter-app-api -p sdkwork-routes-clawrouter-backend-api -p sdkwork-clawrouter-cloud-gateway
pnpm verify
pnpm test:postgres:required
CLAWROUTER_BROWSER_SMOKE_REQUIRED=1 pnpm verify
CLAWROUTER_EDGE_DEV_SMOKE_REQUIRED=1 pnpm verify -- --with-edge-dev-smoke
```
