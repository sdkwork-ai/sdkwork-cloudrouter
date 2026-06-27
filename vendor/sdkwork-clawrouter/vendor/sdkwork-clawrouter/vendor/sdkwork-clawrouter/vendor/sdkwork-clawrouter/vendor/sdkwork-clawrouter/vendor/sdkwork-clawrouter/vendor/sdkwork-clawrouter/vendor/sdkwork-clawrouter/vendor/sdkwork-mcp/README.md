# SDKWork MCP

Model Context Protocol (MCP) connector registry, server management, tools/resources/prompts catalog, and multi-client surfaces (PC, H5, Flutter).

## Quick start

```powershell
pnpm verify
pnpm start:pc    # http://localhost:5175/mcp-hub
```

## Surfaces

| Surface | Routes | Status |
| --- | --- | --- |
| PC marketplace | `/mcp-hub`, `/mcp-hub/:serverKey` | active |
| PC tenant console | `/console/mcp` | active |
| PC admin | `/admin/servers`, `/admin/categories`, `/admin/invocations` | active |
| H5 MCP | mobile MCP workflows (`@sdkwork/mcp-h5-*`) | active |
| Flutter mobile | native shell | scaffold |

## Backend

- PostgreSQL `ai_mcp_*` tables (contract v1.1.0)
- Admin API: `/backend/v3/api/mcp/*`
- App read API: `/app/v3/api/mcp/*`
- Shared route handlers: `crates/sdkwork-routes-mcp-shared`

## Docs

- [docs/README.md](docs/README.md)
- [docs/product/prd/PRD.md](docs/product/prd/PRD.md)
- [docs/architecture/tech/TECH_ARCHITECTURE.md](docs/architecture/tech/TECH_ARCHITECTURE.md)
- [apps/README.md](apps/README.md)
- [specs/README.md](specs/README.md)

## Verification

```powershell
pnpm verify          # architecture + db + topology + cargo + static tests
pnpm api:check       # OpenAPI materialization drift
pnpm sdk:generate:check
```
