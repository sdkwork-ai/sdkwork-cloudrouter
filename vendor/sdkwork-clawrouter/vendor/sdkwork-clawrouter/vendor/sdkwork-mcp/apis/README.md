# apis

OpenAPI authorities for **sdkwork-mcp**. Materialized from route crates via `pnpm api:materialize`.

| Authority | Path | Surface |
|-----------|------|---------|
| App (read) | `app-api/mcp/mcp-app-api.openapi.json` | `/app/v3/api/mcp/*` |
| Backend (admin) | `backend-api/mcp/mcp-backend-api.openapi.json` | `/backend/v3/api/mcp/*` |

## Backend routes (P1)

| Method | Path | Operation |
|--------|------|-----------|
| GET/POST | `/backend/v3/api/mcp/categories` | list / upsert categories |
| GET/POST/PUT/DELETE | `/backend/v3/api/mcp/servers` | server CRUD |
| GET/POST/DELETE | `/backend/v3/api/mcp/servers/{serverId}/connectors` | connector management |
| POST | `/backend/v3/api/mcp/servers/{serverId}/tools` | upsert tool |
| POST | `/backend/v3/api/mcp/servers/{serverId}/resources` | upsert resource |
| POST | `/backend/v3/api/mcp/servers/{serverId}/prompts` | upsert prompt |
| GET | `/backend/v3/api/mcp/invocations` | list invocation audit |
| POST | `/backend/v3/api/mcp/invocations` | append invocation (idempotent via `idempotency_key`) |

## App routes (P1)

Read-only: categories, servers, tools, resources, prompts, invocations.

## Regenerate

```bash
pnpm api:materialize
pnpm api:check
```
