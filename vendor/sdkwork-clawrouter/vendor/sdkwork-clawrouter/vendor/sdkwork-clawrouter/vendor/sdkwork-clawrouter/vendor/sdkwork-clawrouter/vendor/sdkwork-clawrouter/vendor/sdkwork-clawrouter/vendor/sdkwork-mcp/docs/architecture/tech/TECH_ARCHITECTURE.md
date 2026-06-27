# SDKWork MCP Technical Architecture

Status: active
Owner: mcp-platform
Updated: 2026-06-26
Specs: `../sdkwork-specs/DATABASE_FRAMEWORK_SPEC.md`, `../sdkwork-specs/WEB_FRAMEWORK_SPEC.md`

## 1. Architecture Overview

SDKWork MCP is an application-root service that exposes MCP registry and capability APIs through the SDKWork web gateway assembly. Persistence uses PostgreSQL with contract-first `database/` assets governed by `sdkwork-database` lifecycle SPI.

```text
Clients (PC/H5/Flutter)
  -> platform.api-gateway / application.public-ingress
  -> sdkwork-mcp-gateway-assembly
      -> sdkwork-routes-mcp-app-api (read)
      -> sdkwork-routes-mcp-backend-api (admin)
      ^ shared: sdkwork-routes-mcp-shared (handlers, HTTP helpers, record builders)
  -> sdkwork-intelligence-mcp-service
  -> sdkwork-intelligence-mcp-repository-sqlx
  -> PostgreSQL (ai_mcp_* tables)
```

## 2. Technology Choices

- Rust workspace crates for API, service, repository, and contracts
- `sqlx` PostgreSQL repository implementation
- `sdkwork-id-core` Snowflake IDs and UUID v4 for runtime entity creation
- JSONB columns for schema/config payloads; BOOLEAN for feature flags
- OpenAPI materialized from `tools/mcp_openapi_materialize.mjs`

## 3. System Boundaries And Modules

| Crate | Role |
| --- | --- |
| `sdkwork-mcp-contract` | Domain records and enums |
| `sdkwork-intelligence-mcp-service` | Validation and orchestration |
| `sdkwork-intelligence-mcp-repository-sqlx` | SQL persistence |
| `sdkwork-routes-mcp-shared` | Shared HTTP handlers, record builders, tenant resolution |
| `sdkwork-routes-mcp-app-api` / `sdkwork-routes-mcp-backend-api` | HTTP route surfaces |
| `sdkwork-mcp-database-host` | Database module SPI registration |

Cross-cutting integrations:

- IAM tenant context via web request context headers
- File icons via `sdkwork-drive` URI validation (`drive://spaces/.../nodes/...`)

## 4. Database Design

Contract version **1.1.0** — see `database/ddl/baseline/postgres/0001_mcp_baseline.sql`.

Active tables:

1. `ai_mcp_server_category` — dictionary (platform `tenant_id=0` + tenant overrides)
2. `ai_mcp_server` — registry metadata (`lifecycle_status`, `data_scope`, `uuid`)
3. `ai_mcp_connector` — `publish_status` + `lifecycle_status`, JSONB config
4. `ai_mcp_tool` / `ai_mcp_resource` / `ai_mcp_prompt` — capability catalogs
5. `ai_mcp_invocation_log` — append-only audit with `idempotency_key`

Planned tables (registry only, no DDL yet):

- `ai_mcp_server_binding`
- `ai_mcp_tool_approval`
- `ai_mcp_capability_sync_job`

## 5. API, SDK, And Data Ownership

- API authority: `sdkwork-mcp.backend`, `sdkwork-mcp.app`
- Generated SDKs: `sdks/sdkwork-mcp-backend-sdk`, `sdks/sdkwork-mcp-app-sdk`
- Breaking field rename in v1.1.0: entity `status` -> `lifecycle_status`; connector publish state -> `publish_status`

## 6. Security, Privacy, And Observability

- Multi-tenant queries always filter `tenant_id` (categories include shared `tenant_id=0`)
- Secrets stored as `secret_ref`, never in `args_json` or invocation payloads at rest without redaction policy
- Invocation log supports `request_id`, `trace_id`, `idempotency_key`
- Backend `POST /backend/v3/api/mcp/invocations` appends audit rows with idempotent replay when `idempotency_key` is supplied
- Health endpoints: `/livez`, `/readyz`, `/healthz` on both API surfaces

## 7. Deployment And Runtime Topology

See `specs/topology.spec.json` for standalone vs cloud profiles. Database URL via `MCP_DATABASE_URL`.

PC client (`apps/sdkwork-mcp-pc`):

- Package directories: `packages/sdkwork-mcp-pc-{core,commons,hub,console,admin,admin-core,shell}`
- npm scopes: `@sdkwork/mcp-pc-*`
- Marketplace: `/mcp-hub` (category filters, server cards, capability tabs)
- Tenant console: `/console/mcp`
- Admin: `/admin/servers`, `/admin/categories`, `/admin/invocations`
- Server detail tabs: Connectors | Capabilities | Settings (`updateAdminServer` for lifecycle, visibility, metadata)
- UI flow: pages → `@sdkwork/mcp-pc-core` services → generated MCP SDKs (no raw HTTP)
- Permissions: `specs/mcp-admin.permissions.json` → `@sdkwork/mcp-pc-admin-core`

H5 client (`apps/sdkwork-mcp-h5`):

- Package directories: `packages/sdkwork-mcp-h5-{core,commons,mcp,shell}`
- npm scopes: `@sdkwork/mcp-h5-*`
- SDK entry: `@sdkwork/mcp-h5-core` → `mcpAppSdkClient` → generated `sdkwork-mcp-app-sdk`
- Feature modules: `@sdkwork/mcp-h5-mcp`

Flutter client (`apps/sdkwork-mcp-flutter-mobile`):

- Dart package: `packages/sdkwork_mcp_flutter_mobile_core`

## 8. Verification

```bash
pnpm db:validate
cargo test --workspace
pnpm api:materialize
pnpm verify
```

## 9. Architecture Decision Index

- ADR-DB-001: Contract-first `ai_mcp_*` module prefix under `ai` intelligence domain
- ADR-DB-002: Application-assigned Snowflake primary keys (no BIGSERIAL)
- ADR-API-001: Separate app read and backend admin route crates
