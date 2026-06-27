# crates

Rust workspace members for **sdkwork-mcp** (MCP platform backend).

## Layer map

| Crate | Role |
|-------|------|
| `sdkwork-mcp-contract` | Domain records, enums, validation errors |
| `sdkwork-intelligence-mcp-service` | Business logic, repository trait, drive port |
| `sdkwork-intelligence-mcp-repository-sqlx` | PostgreSQL persistence (`ai_mcp_*`) |
| `sdkwork-routes-mcp-shared` | Shared HTTP helpers, record builders, service handlers |
| `sdkwork-routes-mcp-app-api` | App-facing read routes (`/app/mcp/v1/*`) |
| `sdkwork-routes-mcp-backend-api` | Admin write/read routes (`/admin/mcp/v1/*`) |
| `sdkwork-mcp-api-server` | Axum server binary / bootstrap |
| `sdkwork-mcp-database-host` | Database host integration |
| `sdkwork-mcp-gateway-assembly` | Gateway cloud bundle assembly |

## Conventions

- Snowflake IDs via `sdkwork-id-core`; UUIDs via `sdkwork_utils_rust::uuid`
- Entity lifecycle: `lifecycle_status`; connector publish: `publish_status`
- Route crates delegate handler logic to `sdkwork-routes-mcp-shared` (no duplicated HTTP/service glue)

## Verification

```bash
cargo test --workspace
```
