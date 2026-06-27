> Migrated from `docs/28-architecture-standard-guardian.md` on 2026-06-24.
> Owner: SDKWork maintainers

# sdkwork-clawrouter Architecture Standard Guardian

## 1. 目标

`tools.architecture_standard_guardian` 用于防止架构文档重新漂回旧的主实现路线。`sdkwork-clawrouter` 的当前裁决是：

```text
Rust-first Modular Runtime
  + Stable API Contract
  + Generated SDK Boundary
```

这意味着 Rust 是 gateway、app-api、admin-api、worker、product runtime 的主实现语言；Commerce、IAM、Models 等组合模块通过生成 SDK 与安装时 schema 组合接入，不是本应用的主运行时。

## 2. 检查范围

当前检查这些核心文档：

```text
docs/02-技术架构设计.md
docs/03-技术选型.md
docs/07-性能设计.md
docs/09-部署架构设计.md
```

## 3. 守卫规则

守卫会阻止核心架构文档出现旧路线漂移词，例如：

- `Spring-first`
- `Java 21`
- `Spring Boot`
- `Spring WebFlux`
- `Rust/Pingora`
- `Sidecar`
- `Caffeine`
- `Micrometer`
- `SLF4J`
- `Logback`
- `Local Spring`

这些词并不是全仓库禁词；它们只在核心架构/技术选型/性能/部署文档中代表错误方向。其它文档仍可描述组合模块 SDK 边界与 `/app/v3/api`、`/backend/v3/api` 稳定路径。

## 4. 必须出现的 Rust-first 术语

核心文档必须明确表达当前标准：

- `docs/02-技术架构设计.md`
  - `Rust-first`
  - `sdkwork-clawrouter-cloud-gateway`
  - `sdkwork-clawrouter-standalone-gateway`
  - `sdkwork-clawrouter-admin-gateway`
  - `/app/v3/api`
  - `/backend/v3/api`
  - `/v1`

- `docs/03-技术选型.md`
  - `Rust-first`
  - `axum`
  - `tokio`
  - `sqlx`
  - `tower`
  - `hyper`
  - `utoipa`
  - `tracing`
  - `moka`
  - `rust_decimal`

- `docs/07-性能设计.md`
  - `Rust-first`
  - `Tokio`
  - `Axum`
  - `moka`
  - `Redis`
  - `streaming`
  - `batch writer`
  - `connection pool`

- `docs/09-部署架构设计.md`
  - `Rust-first`
  - `Rust services`
  - `desktop`
  - `server`
  - `docker`
  - `kubernetes`
  - `SDKWORK_CLAW_DEPLOYMENT_MODE`
  - `SDKWORK_CLAW_GATEWAY_BIND`
  - `SDKWORK_CLAW_APP_API_BIND`
  - `SDKWORK_CLAW_ADMIN_API_BIND`

## 5. 命令

单独运行：

```powershell
python -B -m tools.architecture_standard_guardian
```

质量门禁：

```powershell
python -B -m tools.schema_quality_gate
```

单元测试：

```powershell
python -B -m unittest tests.test_architecture_standard_guardian
python -B -m unittest tests.test_schema_quality_gate
```

## 6. 维护原则

1. 如果架构方向发生真实变更，必须先修改本守卫和测试，再修改文档。
2. 如果只是补充组合模块 API 或外部 entity 说明，不需要修改守卫。
3. 不允许用更模糊的语言绕过守卫，例如把主实现写成“后端主栈”但不说明 Rust services。
4. 文档必须与实际 Rust workspace 保持一致。

