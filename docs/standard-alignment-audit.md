# SDKWork Claw Router �?�??对齐审计

�??�?�?��?��?2026-06-27

审计�?�令�?
```bash
pnpm check:alignment:audit
pnpm check:alignment
python tools/sdkwork_standard_alignment_guardian.py --strict
```

> �?�审计�??�?�?来源�?��?�?源码�?�?�置�?�身�??`scripts/refresh-standard-alignment-audit.mjs`
> �?`sdkwork.app.config.json`�?�`sdkwork.workflow.json`�?�`Cargo.toml`�??> `database/migrations/`�?�`deployments/kubernetes/`�??> `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-i18n/src/index.ts`
> �?路�?�?��?�读�?�?禁止�??工填�??�?论�??�?�??�?��?�? P0/P1 项�?��?�?须�??�?步�?��?��?��??�?> �??`scripts/refresh-standard-alignment-audit.mjs`�?让 CI �?卫保�?��?�?可信源�??
## �?��?�?论

| 维度 | �?��??| 说�?? |
| --- | --- | --- |
| sdkwork-specs �?�?��?�?��?�?�??| 已对�?| `AGENTS.md`�?��?�??根�?��?�?�`apis/`�?�`sdks/`�?�`deployments/`�?�`specs/topology.spec.json` 已就�?|
| �?�署�?�??�??| 已对�?| `sdkwork.workflow.json` + �??GitHub workflow + �?平�?24 package �?�?�?��?� + `container-config-bundle` |
| �?�端 SDK �?��?� | 已对�?| Portal �??�? `@sdkwork/clawrouter-app-sdk` / backend SDK �?费�?�?卫禁�?raw HTTP |
| API �?约�??�?��?| 已对�?| OpenAPI 已补�??`x-sdkwork-request-context` / `x-sdkwork-api-surface`�?`sdks/_route-manifests/` 已�??�??|
| sdkwork-database | 已对齐�?迁移中�? | PoolBuilder 已�?�?�?�?�??`*_store.rs` �??manifest �??�?�迁移 repository-sqlx |
| sdkwork-web-framework | 已对�?| �?认 `WebFrameworkLayer`�?app-api �?backend-api �?��?�使�?� `TenantAppContext` �??`SqlScopedSubject` / `SqlScopedAdminSubject` |
| sdkwork-discovery | 不�??�?� | �?�?��??gRPC/RPC �?��?��?�?续�?�??RPC �?��?��??|
| Rust �?��?��?�名 | 治�?�?�? | �?�?? crate 已�?��?`specs/naming-migration.manifest.json`�?026-12-31 �?�止�?|
| 治�?�?社�?��??�?| 已对�?| `SECURITY.md`�?�`CONTRIBUTING.md`�?�`CODE_OF_CONDUCT.md`�?�`.github/CODEOWNERS`�?�`.github/ISSUE_TEMPLATE/*`�?�`.github/PULL_REQUEST_TEMPLATE.md`�?�`.github/dependabot.yml` 已就�?|
| Rust 工�?��??| 已对�?| `rust-toolchain.toml` pin �??`1.79.0` + `rustfmt` + `clippy` + `rust-src` + 7 个交�?�?�?target |
| �??档索�? | 已对�?| `docs/INDEX.yaml` entries �?domains 已填�??�?`docs/README.md` �?�复段已�?�?�?`docs/runbooks/README.md` 已建�?�??�?runbook 索�? |
| vendor 工�?�?�治�?| 迁移�?| �?commerce �??`vendor/sdkwork-*` gitlink 已�?索�?移�?��?�?保�?? `vendor/README.md` + `../sdkwork-商���/**`�?`pnpm check:vendor-workspace` �?卫 |
| commerce �?渡�?��?� | 迁移�?| PC Portal 仍�?�??`../sdkwork-商���` �?�?��??console-era `@sdkwork/commerce-pc-*`�?`pnpm check:commerce-debt:strict` �?踪�?�?��?度 |
| �?��?�签名�?�置 | 已对齐�?�?�置�?| `sdkwork.app.config.json` `signatureRequired=true` �?`sdkwork.workflow.json` `signingRequired=true` 已�?�?|
| �?��?�签名�?�?� | 已对�?| `sdkwork.workflow.json` �??`sign` 步骤已�?�换为�??�?跨平台签名�?cosign�?SBOM/checksums�? signtool�?Windows MSI�? codesign+notarytool�?macOS pkg�?�??�?�据�??�? secrets 注�?� |
| CI �?�?��?�描 | 已对�?| `.github/workflows/verify.yml` `security-scan` job �??�?运�? `cargo audit --deny warnings` + `cargo deny check advisories bans licenses sources` + Trivy�?HIGH/CRITICAL fail-fast�? gitleaks + `pnpm audit --audit-level=high`�?`verify` job �?postgres:16 service + `pnpm test:postgres:required` + browser/edge smoke opt-in |
| SBOM cargo �?�?? | 已对�?| `scripts/generate-release-sbom.mjs` �??�? `cargo metadata` �??�?��?�?� cargo SBOM + 依�? edges |
| SBOM npm �?�?? | 已对�?| `scripts/generate-release-sbom.mjs` �??�? `collectPnpmPackages()` 解�?� root + PC app 两�? `pnpm-lock.yaml` �??packages 段�?�?transitive deps�?`collectDirectDeps()` 解�?� importers 段�??�??SPDX DEPENDS_ON edges�?�?��??SHA-256 checksum 已�??�??|
| �?�据�?迁移�?��?postgres�?| 已对�?| `database/migrations/postgres/0001_initial_schema.{up,down}.sql` 已�??�?��?�?��? baseline-plus-migrations �?�?� |
| �?�据�?迁移�?��?sqlite�?| 已对�?| `database/migrations/sqlite/0001_initial_schema.{up,down}.sql` 已�??�?��?�?��? baseline-plus-migrations �?�?��?�?�??`database/ddl/baseline/sqlite/0001-0004` |
| 表�?��?��?�?��?�?��??| 已对�?| claw-router-owned 表�?� DDL(69) / table-registry.json(69) / schema.yaml(69) �?�?��?�?��?effective registry(90) �?catalog(154) 含�??�?模�?表�?�?�??�?�差�?�?drift |
| �?流�?�表�??�?� | 已对�?| `ai_request_trace` / `ai_routing_decision_log` / `ai_usage_fact` / `ai_usage_service_provider_edge` �?8 张表�?`PARTITION BY RANGE (created_at)` + `_default PARTITION OF ... DEFAULT` |
| �??�?��?��?�??| 已对�?| `services/sdkwork-clawrouter-router-service/src/application/invocation/circuit_breaker.rs`�?45 �?�?�?�?��?��?��?��?Closed/Open/HalfOpen�? Redis �??�?�?HA store + channel-id �?度 |
| �?�?�?��?�??| 已对�?| `services/sdkwork-clawrouter-router-service/src/application/invocation/idempotency.rs`�?68 �?�?�?��?� + Redis SETEX �?�? + 流式�?��?�??�?� + SyntheticLocalResponse �?��?� |
| Provider adapter 流式�?��? | 已对�?| `crates/sdkwork-clawrouter-cloud-gateway/src/invocation_dispatcher.rs`�?18-133 �?�?�?��? content-type �?��? SSE �?`Body::new(stream)` �?�传�?`provider_passthrough_transport.rs`�?20-233 �?�?`Incoming` �?��?��?�传 |
| �?�?�?�签名�?�??| 已对�?| `sdkwork-claw-http/src/auth.rs` �?��? `sign_app_session_token_with_claims_and_store` �?`verify_app_session_token_claims_with_resolver` async �?��?��?�?��?��?��??IAM `TenantSigningKeyStore`�?Postgres/SQLite �?�据�?�?��??+ `LegacyGlobalTenantSigningKeyStore` �??�??�?�?? tenant_id 解�?� active key�?并�??claims 中�?�??`kid` �?��?��?�?�轮换�?口�?�?� per-tenant key �?��??�??�?��?��?`AppSessionConfig` HMAC secret 保�?��?�?�?�容�??`SECURITY.md` 已修正为�??�?�?��??|
| 企�?级�?对称签名 | �??**�?��? (P0)** | `crates/sdkwork-claw-security/src/asymmetric_signing.rs` �?�?�企�?级�?对称签名系�?�?�?��??**HS256**�?对称�?�容�?�??*RS256**�?RSA-SHA256 企�?�?�??�?�??*ES256**�?ECDSA-P256 �?��?��?�??�?�??*EdDSA**�?Ed25519 �?�代�?�?�?��?�??私�?�使�??AES-256-GCM �?��?�?�?��?�?��?��?�?�轮换�?? `kid` �?�?��??`crates/sdkwork-claw-http/src/signing_service.rs` 提�?�?级签名�?��?��?�象�?�?��??per-tenant �?�?�管�?�??�?�?�?�容�??|
| 可�?�?�?��??�?| 已对�?| `crates/sdkwork-claw-http/src/metrics.rs` 使�?� `IntCounterVec{method,status}` + `HistogramVec{method}`�?�?�??Prometheus 延�?�?5ms�??0s�?via axum middleware�?�?��??p50/p95/p99 计�? |
| OTLP 可�?�?�??+ SLO/SLI | �??**�?��? (P0)** | `crates/sdkwork-claw-observability/src/otlp.rs` �?�?��?�?� OTLP 可�?�?�?��?�?��?�??�?��?OTLP �?�置�?Sampling rate, endpoint, TLS�?�?�Prometheus metrics 端�?��?�置�??*SLO/SLI �?�?**�?可�?��??99.9%�?�p95 < 50ms�?�p99 < 100ms�?�RPS > 1000�?�?��?�?口 Burn Rate �??警�?h/6h/3d�?�?�SloMetricsCollector �?�?�?��??�?��??`deployments/grafana/claw-router-slo-dashboard.json` 提�?�?置 Grafana 仪表�??�?Availability/Latency/Throughput/Error Budget�?�?`deployments/prometheus/claw-router-alerts.yaml` 提�?�?级�??Prometheus �??警�?�??�??|
| �?�端 i18n �?语�? | 已对�?| `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-i18n/src/index.ts` `supportedLngs = ['en','zh','de','fr','ja','ko','ru']` 满足 PRD 7 语�?要�? |
| TypeScript 严格模式 | 已对�?| `apps/sdkwork-clawrouter-pc/tsconfig.json` `strict: true` + `noUncheckedIndexedAccess: true` + `noImplicitAny: true`�?`turbo.json` �?`test` 任�?� |
| K8s �?�署�?�?��??| 已对�?| `deployments/kubernetes/` �?8 �?manifest�?gateway / app-api / admin-api / edge / redis / ingress / network-policy / migration-job |
| Redis HA | 已对�?| `deployments/kubernetes/claw-router-redis.yaml` 3-pod Sentinel �??�??�? primary + 2 replicas + 3 sentinels�?�?含认�?Secret�?�AOF+RDB �?��?�??�?�PodDisruptionBudget minAvailable:2�?�podAntiAffinity 跨�??�?��??�?|
| Provider �??�?�?��?� | 已对�?| `crates/provider-adapters/alicloud` 已�?�??ACS V3 HMAC-SHA256 签名�?`common/signer_v3.rs`�? Bailian text generation 端�?��??�?��?��?`text_generation/mod.rs`�?�?`Cargo.toml` �?hex/hmac/hyper/sha2 HTTP 客�?�端依�?�?`crates/sdkwork-claw-paas-plugin` �??`BaiduPaasProviderPlugin` �?override `invoke()` �?�?? OCR �?�?��?��?�?provider_code + provider_request_id + raw_provider_response �?�?��?记�?�?�?��?计费�?�??�?trace �?��?�?�??�?HTTP relay �??cloud-gateway passthrough transport �?�?��?Alibaba/Tencent plugin 保�?� metadata-only �?�?? `ProviderNotConfigured` �?��?� native adapter �?��?� |
| 主�?��??�??�?| 已对�?| `docs/architecture/tech/TECH_ARCHITECTURE.md` 已补�?�为�?�?��?��??�?��?�?�??�?��?表�?�模�?边�??�?��?��?�据�??�??�?表�?�API/SDK 边�??�?��?��?�署�??�??�?��?��?�?�边�??�?��?�ADR 索�?�?��?证�?��??|

**�?�?� blocking �?�?��?0 �?P0 �?修�?*�??已对齐�?**32** 项�?含�?�轮�?��?2 �?P0�?�??�?�?� SQL store 迁移 repository-sqlx 为�?�续治�?项�??
## 1. sdkwork-web-framework�?HTTP 认证�?�?�?�??�?
### �?�??�?�路�?�??产�?认�?

```
IAM JWT (Authorization + Access-Token)
  �??sdkwork-web-framework (WebFrameworkLayer)
  �??IamWebRequestContextResolver�?�?��?Postgres pool + database_config�?  �??WebRequestContext + WebRequestPrincipal�?String snowflake IDs�?  �??DomainContextInjector�?IamAppContext�?  �??App-api handler�?TenantAppContext �??SqlScopedSubject�?�?��? i64 转换�?��?
  �??SQL repository�?BIGINT �??�?
```

### App-api�?已�?��?�对齐 `WEB_FRAMEWORK_SPEC`�?
�??�??app-api SQL/command handler 已迁移�?**不�?�**依�? route �?`TrustedRequestSubject` �??影 middleware�?
| �?�?? | Handler 模�? |
| --- | --- |
| Dashboard / usage / gateway / generations / settlements | `app_dashboard`, `app_usage_logs`, `app_gateway`, `app_generation_history`, `app_settlements` |
| �??�?� / 设置 / providers | `app_notification`, `app_settings`, `app_providers` |
| Routing / chat | `app_routing`, `app_routing_strategy`, `app_routing_channel_command`, `app_chat` |
| Runtime / �?��? / API Keys | `app_runtime`, `payment_aggregate`, `app_api_keys` |

�?�?��?`api/app_sql_subject.rs`�?`ResolvedAppSqlScopedSubject` / `RequiredAppSqlScopedSubject`�?
路�?��?并�?`sdkwork_claw_http::merge_web_framework_scoped_app_router`

### Backend-api�?已�?��?�对齐 `WEB_FRAMEWORK_SPEC`�?
�??�??backend-api SQL/command handler 已迁移�?**不�?�**依�? route �?`TrustedRequestSubject` �??影 middleware�?
| �?�?? | Handler 模�? |
| --- | --- |
| 系�?�??�?� / �??�?� / 仪表�??| `admin_monitor`, `admin_analytics`, `admin_dashboard` |
| �?��?� / �?�?� / 设置 | `admin_user`, `admin_site`, `admin_auth_settings`, `admin_runtime_region_settings`, `site_settings` |
| AI �?源 / 渠�? / �?�?� | `admin_channel`, `admin_channel_group`, `admin_provider_secret`, `admin_mcp` |
| �?�流 / �?�火�?| `admin_ip_rate_limit`, `admin_api_key_rate_limit`, `admin_model_rate_limit`, `admin_firewall_rule` |
| �??�?� / �?�? / �?息 | `admin_catalog`, `admin_finance`, `admin_marketing`, `admin_inventory`, `admin_messaging`, `admin_transaction_center` |
| �?��?��??�?� / 提�?�??/ �?�?� | `admin_service_node`, `admin_service_provider`, `admin_storage` |
| 运营 / �?�? / �?��?运�?�??| `admin_announcement`, `admin_cache`, `admin_payment_runtime`, `admin_record` |

�?�?��?`api/admin_sql_subject.rs`�?`SqlScopedAdminSubject` / `RequiredAdminSqlScopedSubject` + 端口 `From` �?��?�?
路�?�边�??�?`layer_with_admin_subject_boundary` �??web-framework 模式使�?� `admin_web_framework_access_boundary`�?`TenantAppContext` �??SQL scope + `has_admin_access`�?�?legacy 模式保�?? `admin_request_subject_boundary`�??
### �?�?�落�?�

| 模�? | �?责 |
| --- | --- |
| `crates/sdkwork-claw-http/src/claw_web_resolver.rs` | �?�? IAM resolver 工�??�?�? claw `DatabaseConfig` �?��?? IAM env |
| `crates/sdkwork-routes-{app,backend}-api/src/web_bootstrap.rs` | `WebFrameworkLayer::new` + route manifest + `ClawRouter*DomainInjector` |
| `services/.../api/app_sql_subject.rs` | App `TenantAppContext` �??`SqlScopedSubject` |
| `services/.../api/admin_sql_subject.rs` | Backend `TenantAppContext` �??`SqlScopedAdminSubject` |
| `crates/sdkwork-claw-http/src/web_bridge.rs` | **Legacy only**�?�?�迁移 handler �??`TrustedRequestSubject` 桥�?� |
| `crates/sdkwork-claw-http/src/web_framework_compat.rs` | Legacy 模式 subject boundary�?`merge_web_framework_scoped_app_router` |
| `crates/sdkwork-clawrouter-cloud-gateway/src/runtime.rs` | `finalize_all_in_one_route_surfaces` 传�?� `database_config` �?�?��?`postgres_pool` |

### 类�??�?�系

| 类�?? | �?�?� | �?�?? |
| --- | --- | --- |
| `WebRequestContext` | HTTP 边�??�?威�?�?�??| `WEB_FRAMEWORK_SPEC.md` |
| `TenantAppContext` | Service �?String ID �?�?� | `WEB_FRAMEWORK_SPEC.md` |
| `IamAppContext` | IAM �??�??�?| `IAM_SPEC.md` |
| `SqlScopedSubject` | Claw SQL BIGINT �?�?��??�?repository 边�??�?| 产�?��??�?��?�?� `TenantAppContext` �?次�?��? |
| `SqlScopedAdminSubject` | Backend SQL BIGINT �?��?�??�?�?��?? | �??`TenantAppContext` �?次�?��? |
| `TrustedRequestSubject` | **Legacy**�?�?�?�??�?? / `SDKWORK_CLAW_WEB_FRAMEWORK_LEGACY=true` | 不�?�?为�??handler �??认证源 |

### Legacy 模式�?�?�?�? / �?�式�??�??�?
设置 `SDKWORK_CLAW_WEB_FRAMEWORK_LEGACY=true` �?��?

- �?��?� web-framework �?认路�?
- 使�?� claw app-session token �?`app_request_subject_boundary`
- �??�?��?�? `database_config_router.rs` �?��?�启�?�
- SQL �?handler 仍可�??�? `TrustedRequestSubject::resolve_optional` �??�??解�?�

设置 `SDKWORK_CLAW_WEB_FRAMEWORK_ENABLED=false` 可�?�?��?��??web-framework �??裹�??
### App session token 签名�?�? GA �?��?�?
�?�?� 0.3.x�?`AppSessionConfig` 使�?��?�?�?�享 HMAC secret�?`SDKWORK_CLAW_APP_SESSION_SECRET`�?�??�?32 �?符�?�?�??`sdkwork-claw-http::sign_app_session_token_with_claims_and_secret` 签�?�?�?证�??�?�??�?��?�??�?beta�?�?**不�?� per-tenant** �??�?�??secret �?�?��?�??�??�?�?��?? token �?�可被伪�?��??
GA �?��?须迁移�?� per-tenant �?对称签名�?

- �?�据�?表 `iam_tenant_signing_key`�?key_id / tenant_id / algorithm / public_key_pem / private_key_encrypted / rotated_at / retired_at�?- `AppSessionConfig` �?�?�?`AppSessionKeyResolver`�?�?? `tenant_id` 解�?��?�?� active key�?- �?�?�?RS256�?�?认�?/ ES256�?�?��?��?�??�? EdDSA�?�??�?�?�?��?
- 90 天�?��?�轮�?+ key_id �??token header 中�?�式声�??�?�?��?��?��?� key �?�叠�??
## 2. sdkwork-database

- `Cargo.toml` 已声�??`sdkwork-database-config`�?�`sdkwork-database-sqlx`�?�`sdkwork-database-repository`
- Gateway / router-service 建�?已�?�?�?`PoolBuilder`
- �?�?� SQL store �??`specs/database-store-migration.manifest.json` �??�?�迁移
- 迁移�?��?postgres �?sqlite �?已�??�?� `0001_initial_schema.{up,down}.sql`�?�?��?baseline-plus-migrations �?�?�

## 3. �?�署�?�API �?�?��?
- �??�??�?`configs/topology/*.env` + `pnpm topology:validate`
- �?约�?威�?`apis/` �??`generated/openapi` / SDK
- PC �?�?��?`apps/sdkwork-clawrouter-pc`�?SDK�?`@sdkwork/clawrouter-app-sdk`�?�`@sdkwork/clawrouter-backend-sdk`
- K8s�?`deployments/kubernetes/` 8 manifest �?��?�?gateway / app-api / admin-api / edge / redis / ingress / network-policy / migration-job�?�?�?PodDisruptionBudget + HorizontalPodAutoscaler

## 4. vendor ? commerce ????

- **vendor ??**?????????`.gitignore` ?? `vendor/`?`pnpm check:vendor-workspace` ?? Git ??? **?** ? `vendor/` ??
- **????**?
  - `pnpm check:vendor-workspace` ? ????????? `vendor/` ???`pnpm check` ????
  - `pnpm check:commerce-debt` ? ? workspace ???????? fail?
  - `pnpm check:commerce-debt:strict` ? ? Claw Router ??? forbidden console-era commerce PC ??mall ??? peer `@sdkwork/commerce-service`?? PC `index.css` ?? broad commerce tailwind glob ? fail
- **Rust ????**?? `Cargo.toml` ?? sibling `../sdkwork-商���/crates/*` ?? T1 capability ???? commerce ??/?? crate
- **PC ????**?`apps/sdkwork-clawrouter-pc` ? monorepo package graph?tsconfig path alias?Vite/Tailwind ??? `../sdkwork-商���` ? transitional commerce PC ???? T1 capability ??? `@sdkwork/<capability>-*` SDK ?????? `../../sdkwork-specs/MIGRATION_SPEC.md` �8?
- **commerce ??????**?mall ???? transitional commerce ??T1 SDK/??????`check:commerce-debt:strict` ???composed commerce SDK ? per-T1 SDK ??

## 5. �?�??治�?�?
| �?�??�?| �?| �?��??| 说�?? |
| --- | --- | --- | --- |
| ~~P0~~ | ~~Per-tenant �?对称签名~~ | �??**已�?�??* | �?级�?RS256/ES256/EdDSA �?��?� |
| ~~P0~~ | ~~OTLP 可�?�?�??+ SLO/SLI~~ | �??**已�?�??* | Grafana 仪表�??+ Prometheus �??警 |
| P1 | Alibaba/Tencent PaaS native adapter | �?�?�?| `AlibabaPaasProviderPlugin` / `TencentPaasProviderPlugin` 仍为 metadata-only |
| P1 | database repository �?�?�迁移 | �?�?�?| 42% �?�?��??�?�?迁�?11 个�?�?�??�?store |
| P1 | commerce �?渡�?��?��?�?� | �?�?�?| Portal 仍依�?`../sdkwork-商���`�?�?? `check:commerce-debt:strict` �?MIGRATION_SPEC §8 迁移 |
| P1 | vendor 索�?卫�?? | 已对�?| `pnpm check:vendor-workspace` �??�?�?索�?�? 1244 �?commerce 快�?�路�? |
| P1 | Rust �?��?��?��?��?| �?�?�?| �??`specs/naming-migration.manifest.json` �??2026-12-31 �?��?�??|

## 6. �?证�?�令

```bash
pnpm check:vendor-workspace
pnpm check:commerce-debt
pnpm check:commerce-debt:strict
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
