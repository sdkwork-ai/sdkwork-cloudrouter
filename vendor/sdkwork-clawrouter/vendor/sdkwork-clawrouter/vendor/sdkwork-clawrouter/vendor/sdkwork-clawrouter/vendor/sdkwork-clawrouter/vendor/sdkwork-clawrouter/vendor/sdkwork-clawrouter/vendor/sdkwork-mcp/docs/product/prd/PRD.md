# SDKWork MCP PRD

Status: active
Owner: mcp-platform
Application: sdkwork-mcp
Updated: 2026-06-26
Specs: `../sdkwork-specs/DATABASE_SPEC.md`, `../sdkwork-specs/DATABASE_FRAMEWORK_SPEC.md`

## 1. Background And Problem

SDKWork applications and AI runtimes need a governed registry for Model Context Protocol (MCP) servers, connectors, and capabilities (tools, resources, prompts). Operators require multi-tenant administration, auditability, and secure credential handling without storing secrets in application tables.

## 2. Target Users

- Platform operators managing tenant MCP catalogs
- Application developers integrating MCP servers into SDKWork applications and AI workflows
- Security reviewers auditing tool invocation and approval policies

## 3. Goals And Non-Goals

Goals:

- Register MCP servers with transport, visibility, health, and categorization metadata
- Manage connector runtime configuration with secret references (not plaintext secrets)
- Catalog discovered tools, resources, and prompts per server
- Record invocation audit trails with idempotency and trace correlation
- Comply with SDKWork database L2 contract governance (`ai_mcp_*` tables)

Non-goals (current phase):

- `ai_mcp_server_binding` tenant subscription workflows
- `ai_mcp_tool_approval` approval state machines
- `ai_mcp_capability_sync_job` scheduled discovery workers

## 4. Scope

In scope:

- Backend admin API (`/backend/v3/api/mcp/*`) including invocation append (`POST .../invocations`)
- App read API (`/app/v3/api/mcp/*`)
- PC marketplace (`apps/sdkwork-mcp-pc` `/mcp-hub`) with category filters and capability detail
- H5 mobile marketplace (`apps/sdkwork-mcp-h5`) with server browse and capability detail (`@sdkwork/mcp-h5-mcp`)
- Flutter mobile shell (`apps/sdkwork-mcp-flutter-mobile`) with MCP SDK bootstrap scaffold
- PC admin console (`/admin/servers`, `/admin/categories`, `/admin/invocations`) with server lifecycle settings, connector CRUD, and capability upsert
- PostgreSQL persistence via `database/` contract and baseline DDL v1.1.0
- Icon uploads through `sdkwork-drive` references only

## 5. Data Modules (Building Blocks)

| Module | Tables | Responsibility |
| --- | --- | --- |
| Registry | `ai_mcp_server_category`, `ai_mcp_server` | Catalog metadata, categories, visibility |
| Connector | `ai_mcp_connector` | Transport, auth ref, runtime JSON config |
| Capability | `ai_mcp_tool`, `ai_mcp_resource`, `ai_mcp_prompt` | MCP primitives per server |
| Observability | `ai_mcp_invocation_log` | Append-only invocation audit |

Prefix: `ai_mcp_` (registered in `database/contract/prefix-registry.json`).

## 6. Success Metrics

- All active tables registered in `database/contract/table-registry.json`
- `pnpm db:validate` and `pnpm verify` pass in CI
- No plaintext secrets in MCP tables; `secret_ref` only
- Snowflake IDs assigned by application layer for runtime inserts

## 7. Phases

| Phase | Deliverable | Status |
| --- | --- | --- |
| P1 | Core 7 tables + APIs + seeds | active |
| P2 | Binding, approval, sync job tables | planned |

## 8. Linked Requirements

- Database contract: `database/contract/schema.yaml` v1.1.0
- API authority: `apis/backend-api/mcp`, `apis/app-api/mcp`
- Application identity: `sdkwork.app.config.json`
- Admin IAM catalog: `specs/mcp-admin.permissions.json` (bind roles in platform IAM before production)

## 9. Open Questions

None for P1 schema baseline. P2 features require separate PRD shards when scheduled.
