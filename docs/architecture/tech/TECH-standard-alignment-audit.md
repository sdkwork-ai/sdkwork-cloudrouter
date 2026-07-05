# SDKWork Claw Router 标准对齐审计

最后更新：2026-07-05

审计命令：

```bash
pnpm check:alignment:audit
pnpm check:alignment
node ../sdkwork-specs/tools/check-api-response-envelope.mjs --workspace .
node ../sdkwork-specs/tools/check-app-sdk-consumer-imports.mjs --workspace .
node ../sdkwork-specs/tools/check-pagination.mjs --workspace .
python tools/sdkwork_standard_alignment_guardian.py --strict
```

## 总体结论

| 维度 | 状态 | 说明 |
| --- | --- | --- |
| sdkwork-specs 字典与目录结构 | 已对齐 | `AGENTS.md`、标准根目录、`apis/`、`sdks/`、`deployments/`、`specs/topology.spec.json` 已就位 |
| 部署与打包 | 已对齐 | `sdkwork.workflow.json` + 薄 GitHub workflow + 多平台安装包矩阵；K8s egress/Redis 外部密钥模板已补充 |
| 前端 SDK 接入 | 已对齐 | Portal 通过 `@sdkwork/clawrouter-app-sdk` / backend SDK 消费；兑换码已接入 federated promotion API |
| API 契约元数据 | 已对齐 | OpenAPI 已补充 `x-sdkwork-request-context` / `x-sdkwork-api-surface`；promotions redeem 请求体已定义 |
| 商业化安全基线 | 已对齐（私测） | 租户隔离 metric、metrics bearer、OOM 上限、支付生产 bootstrap、结算 worker 租户 scope |
| sdkwork-database | 已对齐（迁移中） | PoolBuilder 已统一；存量 `*_store.rs` 按 manifest 分批迁移 repository-sqlx |
| sdkwork-web-framework | 已对齐 | 默认 `WebFrameworkLayer`；app-api 与 backend-api 全量使用 `TenantAppContext` → `SqlScopedSubject` / `SqlScopedAdminSubject` |
| sdkwork-discovery | 不适用 | 当前无 gRPC/RPC 服务，后续引入 RPC 再接入 |
| Rust 服务命名 | 治理例外 | 遗留 crate 已登记 `specs/naming-migration.manifest.json` |

**当前 blocking 检查：0 项失败。** 详见 [2026-07-05 商业化就绪审计](../../engineering/reviews/2026-07-05-commercial-readiness-audit.md)。

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

## 2. sdkwork-database

- `Cargo.toml` 已声明 `sdkwork-database-config`、`sdkwork-database-sqlx`、`sdkwork-database-repository`
- Gateway / router-service 建连已统一为 `PoolBuilder`
- 存量 SQL store 按 `specs/database-store-migration.manifest.json` 分批迁移

## 3. 部署、API 与前端

- 拓扑：`configs/topology/*.env` + `pnpm topology:validate`
- 契约权威：`apis/` → `generated/openapi` / SDK
- PC 应用：`apps/sdkwork-clawrouter-pc`；SDK：`@sdkwork/clawrouter-app-sdk`、`@sdkwork/clawrouter-backend-sdk`

## 4. 遗留治理项

| 优先级 | 项 | 建议 |
| --- | --- | --- |
| P1 | database repository 存量迁移 | 按 manifest 分批迁移剩余 `*_store.rs` |
| P1 | 多租户 GA | 全量 SQL 热路径调用 `ensure_row_tenant_matches`；Redis TLS 启动校验 |
| P2 | sdkwork-utils 扩展采纳 | 继续替换重复 helper |
| P2 | i18n | 7 语种完整翻译（en/zh 已完整） |
| P3 | Rust 服务重命名 | 按 `specs/naming-migration.manifest.json` 在 2026-12-31 前完成 |

## 5. 验证命令

```bash
pnpm check:alignment:audit
python tools/sdkwork_standard_alignment_guardian.py --strict
cargo test -p sdkwork-claw-http --test auth
cargo test -p sdkwork-claw-http --test web_framework_compat
cargo test -p sdkwork-clawrouter-router-service app_sql_subject
cargo test -p sdkwork-clawrouter-router-service --test app_dashboard_api
cargo test -p sdkwork-routes-clawrouter-app-api claw_router_app_domain_injector
cargo test -p sdkwork-clawrouter-standalone-gateway database_config_dashboard_scopes_metrics_to_app_session_subject
cargo check -p sdkwork-routes-clawrouter-app-api -p sdkwork-routes-clawrouter-backend-api -p sdkwork-clawrouter-cloud-gateway -p sdkwork-clawrouter-router-service
cargo test -p sdkwork-claw-http --test tenant_isolation
pnpm verify:fast
```
