# SDKWork Claw Router 标准对齐审计

最后更新：2026-06-30

审计命令：

```bash
pnpm check:alignment:audit
pnpm check:alignment
python tools/sdkwork_standard_alignment_guardian.py --strict
PYTHONPATH=. python -B tools/bootstrap_frontend_route_classification.py --root . --merge-contract-routes
PYTHONPATH=. python -B tools/bootstrap_frontend_contract_from_route_manifest.py --root . --merge-portal-routes
PYTHONPATH=. python -B tools/hydrate_frontend_contract_relay_surfaces.py --root .
python -B -m tools.frontend_field_audit --check
python -B -m tools.frontend_operation_audit --check
```

> 机器可读事实来源：`scripts/refresh-standard-alignment-audit.mjs` → `generated/audit/standard-alignment-facts.json`  
> 禁止手工编造 P0/P1 结论；变更后运行 refresh 脚本保持 CI 可信。  
> 本文 §1–§3 为摘要；细节以 `generated/audit/standard-alignment-facts.json` 与 canonical spec 为准。

## 总览结论

| 维度 | 状态 | 说明 |
| --- | --- | --- |
| sdkwork-specs 与仓库契约 | 已对齐 | `AGENTS.md`、`apis/`、`sdks/`、`deployments/`、`specs/topology.spec.json` |
| 前端 SDK 集成 | 已对齐 | Portal 消费 `@sdkwork/clawrouter-app-sdk` / `@sdkwork/clawrouter-backend-sdk`；domain transport 经 `clawrouter-*-domain-transport-generated-typescript` 挂载；禁止 raw HTTP |
| commerce 过渡层 | **已完成** | 已移除 commerce-service / sdkwork-commerce SDK；`check:commerce-debt` 零发现 |
| vendor 工作区 | 已对齐 | `pnpm check:vendor-workspace`；tracked vendor 索引干净 |
| SBOM | 已对齐 | `pnpm sbom:release` 自 `Cargo.lock` + 根 `pnpm-lock.yaml` 生成 |
| 制品签名配置 | 已对齐 | `sdkwork.app.config.json` `signatureRequired=true` 与 `sdkwork.workflow.json` `signingRequired=true` 一致 |
| 制品签名流水线 | 已对齐 | `sdkwork.workflow.json` `sign` 步骤已替换为跨平台签名（cosign / SBOM / checksums / signtool / codesign+notarytool） |
| CI 安全扫描 | 已对齐 | `.github/workflows/verify.yml`：`cargo audit`、`cargo deny`、Trivy、gitleaks、`pnpm audit`；postgres service + browser/edge smoke opt-in |
| SBOM cargo 覆盖 | 已对齐 | `scripts/generate-release-sbom.mjs` 通过 `cargo metadata` 生成 cargo SBOM 与依赖边 |
| SBOM npm 覆盖 | 已对齐 | `collectPnpmPackages()` 解析根 lockfile 与 transitive deps；`collectDirectDeps()` 生成 SPDX DEPENDS_ON |
| 数据库迁移链（postgres） | 已对齐 | `database/migrations/postgres/0001_initial_schema.{up,down}.sql` baseline-plus-migrations |
| 数据库迁移链（sqlite） | 已对齐 | `database/migrations/sqlite/0001_initial_schema.{up,down}.sql` baseline-plus-migrations |
| 表计数三方一致 | 已对齐 | claw-router-owned 表：DDL(69) / table-registry.json(69) / schema.yaml(69) 一致 |
| 高流量表分区 | 已对齐 | `ai_request_trace` 等 4 张表 `PARTITION BY RANGE (created_at)` + default partition |
| 熔断器实现 | 已对齐 | router-service `circuit_breaker.rs`：Closed/Open/HalfOpen + Redis HA store |
| 幂等实现 | 已对齐 | router-service `idempotency.rs`：Redis SETEX + 流式排除 + SyntheticLocalResponse |
| Provider adapter 流式 | 已对齐 | cloud-gateway `invocation_dispatcher.rs` SSE passthrough；provider passthrough transport |
| App session 签名链路 | 已对齐 | per-tenant signing key store；async verify；`SECURITY.md` 与实现一致 |
| 企业级非对称签名 | **已完成 (P0)** | RS256 / ES256 / EdDSA；`kid` 轮换；`signing_service.rs` per-tenant 管理 |
| 可观测性指标 | 已对齐 | Prometheus `IntCounterVec` + `HistogramVec`；axum middleware |
| OTLP 可观测 + SLO/SLI | **已完成 (P0)** | OTLP 配置、SLO/SLI 定义、Grafana 仪表盘、Prometheus 告警 |
| HTTP handler 响应辅助 | **已对齐** | 禁止 `PlusApiResult`；使用 `success_envelope` + `problem_from_wire_code` / `platform_problem` |
| 集成测试 envelope 断言 | **已对齐** | router-service 测试断言 numeric `code: 0` 与 platform error codes（`40001`/`40101`/`40401`） |
| 生产 IAM 安全策略 | **已对齐** | `ensure_production_web_framework_security_policy` 禁止 production-like 环境禁用 web-framework |
| Frontend field contract | **已对齐** | `frontend_operations` 已剔除退役 commerce/平台 admin 路由；relay 保留 `/admin/ai/*`、`/admin/system/*` |
| Schema 路由登记 | **已对齐** | `PYTHONPATH=. python -B tools/bootstrap_frontend_route_classification.py --root . --check` |
| Schema 操作登记 | **已对齐** | `PYTHONPATH=. python -B tools/bootstrap_frontend_contract_from_route_manifest.py --root . --check` |
| Relay 退役面守卫 | **已对齐** | `PYTHONPATH=. python -B -m unittest tests.test_relay_retired_admin_surfaces_standard` |
| Relay 路由契约回填 | **已对齐** | `PYTHONPATH=. python -B tools/hydrate_frontend_contract_relay_surfaces.py --root .` 负责 auth、notification、admin-model 的 richer schema 回填 |
| TypeScript 严格模式 | 已对齐 | `strict: true` + `noUncheckedIndexedAccess` + `noImplicitAny` |
| K8s 部署清单 | 已对齐 | `deployments/kubernetes/` 8 manifest（gateway / app-api / admin-api / edge / redis / ingress / network-policy / migration-job） |
| Redis HA | 已对齐 | 3-pod Sentinel；PDB；podAntiAffinity；auth Secret |
| Provider 插件实现 | 已对齐 | AliCloud ACS V3 签名；Baidu PaaS native invoke；metadata-only 插件显式 `ProviderNotConfigured` |
| 主文档 TECH_ARCHITECTURE | 已对齐 | `docs/architecture/tech/TECH_ARCHITECTURE.md` 覆盖表模型、API/SDK、部署边界与 ADR 索引 |

**当前 blocking P0：0。** 已对齐 P0 共 **11** 项（见 `standard-alignment-facts.json` → `p0Status`）。后续 P1 以 repository-sqlx 迁移与 PaaS metadata-only 插件补全为主。

## 1. sdkwork-web-framework / HTTP 认证链路（摘要）

生产默认路径：

```
IAM JWT (Authorization + Access-Token)
  → sdkwork-web-framework (WebFrameworkLayer)
  → IamWebRequestContextResolver (Postgres pool + database_config)
  → WebRequestContext + WebRequestPrincipal (String snowflake IDs)
  → DomainContextInjector / IamAppContext
  → App-api handler: TenantAppContext → SqlScopedSubject
  → SQL repository (BIGINT scope)
```

- **App-api**：SQL/command handler 已迁移，不依赖 route 层 `TrustedRequestSubject` 阴影 middleware。入口：`api/app_sql_subject.rs`；路由合并：`sdkwork_claw_http::merge_web_framework_scoped_app_router`。
- **Backend-api**：同上模式；入口：`api/admin_sql_subject.rs`（`SqlScopedAdminSubject`）；边界：`layer_with_admin_subject_boundary` / `admin_web_framework_access_boundary`。
- **Legacy 模式**：`SDKWORK_CLAW_WEB_FRAMEWORK_LEGACY=true` 时保留 claw app-session token 与 `TrustedRequestSubject` 桥接；新 handler 不得再依赖 legacy 路径。

权威：`WEB_FRAMEWORK_SPEC.md`、`IAM_SPEC.md`、`SECURITY.md`。

## 2. sdkwork-database（摘要）

- Workspace 已声明 `sdkwork-database-config`、`sdkwork-database-sqlx`、`sdkwork-database-repository`。
- Gateway / router-service 使用 `PoolBuilder` 建连。
- 存量 `*_store.rs` 按 `specs/database-store-migration.manifest.json` 迁移至 repository-sqlx（P1 进行中）。
- Postgres / SQLite 均已提供 `0001_initial_schema.{up,down}.sql`。

## 3. 部署与 API 拓扑（摘要）

- 拓扑：`configs/topology/*.env` + `pnpm topology:validate`。
- 契约权威：`apis/` → OpenAPI → `sdks/` 生成物。
- PC 门户：`apps/sdkwork-clawrouter-pc`；产品 SDK：`@sdkwork/clawrouter-app-sdk`、`@sdkwork/clawrouter-backend-sdk`；域 API 经 domain transport 包挂载至 `getClawRouter*SdkClient().<domain>`。
- K8s：`deployments/kubernetes/`（8 manifest）；Redis HA + ingress + network-policy + migration-job。

## 4. vendor 与 commerce 对齐

- **vendor 策略**：`.gitignore` 忽略 `vendor/`；`pnpm check:vendor-workspace` 确保 Git 跟踪的 vendor 条目合法。
- **治理命令**：
  - `pnpm check:vendor-workspace` — vendor 工作区完整性
  - `pnpm check:commerce-debt` — commerce 技术债扫描（报告模式）
  - `pnpm check:commerce-debt:strict` — 禁止 console-era commerce PC 包、legacy commerce service facades、broad commerce tailwind glob 等
- **Rust 依赖**：`Cargo.toml` 通过 sibling T1 capability crate 引用，不再依赖 monolithic commerce crate。
- **PC 前端**：`apps/sdkwork-clawrouter-pc` 通过 per-domain Claw Router SDK（`getClawRouterBackendSdkClient().<domain>`）与 T1 `@sdkwork/<capability>-*` 包集成；commerce 过渡层已移除。
- **commerce 债务状态**：domain transport 位于 `clawrouter-*-domain-transport-typescript`；Vite dev 经 alias + `isSdkworkWorkspaceDependency` 排除 workspace resolver 误解析 `dist/`；admin 域包已对齐独立 domain/capability 规格；会员等级删除通过 `plans.update(status: inactive)`（OpenAPI 无 DELETE）。

## 5. 待治理项

| 优先级 | 项 | 状态 | 说明 |
| --- | --- | --- | --- |
| ~~P0~~ | ~~Per-tenant 非对称签名~~ | **已完成** | 支持 RS256/ES256/EdDSA |
| ~~P0~~ | ~~OTLP 可观测 + SLO/SLI~~ | **已完成** | Grafana 仪表盘 + Prometheus 告警 |
| P1 | Alibaba/Tencent PaaS native adapter | 进行中 | `AlibabaPaasProviderPlugin` / `TencentPaasProviderPlugin` 仍为 metadata-only |
| P1 | database repository 层迁移 | 进行中 | 按 manifest 迁移 `*_store.rs` 至 repository-sqlx |
| ~~P1~~ | ~~commerce 过渡层清理~~ | **已完成** | Portal 已移除 commerce-service / sdkwork-commerce SDK；`check:commerce-debt` 零发现 |
| P1 | vendor 索引卫生 | 已对齐 | `pnpm check:vendor-workspace` |
| P1 | Rust 命名迁移 | 进行中 | `specs/naming-migration.manifest.json` 截止 2026-12-31 |

## 6. 验证命令

```bash
pnpm check:vendor-workspace
pnpm check:commerce-debt
pnpm check:commerce-debt:strict
pnpm sbom:release
pnpm check:alignment:audit
python tools/sdkwork_standard_alignment_guardian.py --strict
PYTHONPATH=. python -B tools/bootstrap_frontend_route_classification.py --root . --merge-contract-routes
PYTHONPATH=. python -B tools/bootstrap_frontend_contract_from_route_manifest.py --root . --merge-portal-routes
PYTHONPATH=. python -B tools/hydrate_frontend_contract_relay_surfaces.py --root .
PYTHONPATH=. python -B -m unittest tests.test_relay_retired_admin_surfaces_standard
python -B -m tools.frontend_field_audit --check
python -B -m tools.frontend_operation_audit --check
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
cd apps/sdkwork-clawrouter-pc
node --test commerce-debt-runtime.test.ts sdk-composition-standard.test.mjs commerce-business-runtime.test.ts
```
