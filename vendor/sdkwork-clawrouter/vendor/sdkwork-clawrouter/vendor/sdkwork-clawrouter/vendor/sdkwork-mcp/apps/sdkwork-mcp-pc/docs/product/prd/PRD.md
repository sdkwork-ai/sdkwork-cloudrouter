# SDKWork MCP PC

Browser application for the MCP marketplace, tenant console, and admin surfaces.

## Surfaces

| Route | Package | Purpose |
|-------|---------|---------|
| `/mcp-hub` | `@sdkwork/mcp-pc-hub` | MCP marketplace (category filters, server cards, capability detail) |
| `/console/mcp` | `@sdkwork/mcp-pc-console` | Tenant operational overview |
| `/admin/servers` | `@sdkwork/mcp-pc-admin` | Server registry CRUD + connector/capability management |
| `/admin/categories` | `@sdkwork/mcp-pc-admin` | Category dictionary |
| `/admin/invocations` | `@sdkwork/mcp-pc-admin` | Invocation audit log |

## Architecture

```text
pages (hub/admin/console)
  -> @sdkwork/mcp-pc-core services (marketplaceService, adminMcpService)
  -> generated sdkwork-mcp-app-sdk / sdkwork-mcp-backend-sdk
```

Shared UI primitives and MCP label helpers live in `@sdkwork/mcp-pc-commons`.

## Development

```bash
pnpm dev
pnpm typecheck
```

Canonical product docs: [../../docs/product/prd/PRD.md](../../docs/product/prd/PRD.md)
