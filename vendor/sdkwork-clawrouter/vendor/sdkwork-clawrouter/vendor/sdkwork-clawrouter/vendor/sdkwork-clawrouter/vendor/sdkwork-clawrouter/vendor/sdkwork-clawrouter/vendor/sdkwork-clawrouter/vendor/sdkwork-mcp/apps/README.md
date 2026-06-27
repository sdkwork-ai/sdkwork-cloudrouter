# apps

Client surfaces for **sdkwork-mcp**. Each app consumes generated MCP SDKs through local core packages — no raw HTTP to MCP APIs.

## Surfaces

| App | Path | Role | Dev command |
| --- | --- | --- | --- |
| PC Hub / Admin | `sdkwork-mcp-pc` | Marketplace (`/mcp-hub`), tenant console, admin CRUD | `pnpm start:pc` |
| H5 MCP | `sdkwork-mcp-h5` | Mobile MCP workflows via `@sdkwork/mcp-h5-*` packages | `pnpm start:h5` |
| Flutter Mobile | `sdkwork-mcp-flutter-mobile` | Native mobile shell (scaffold) | `pnpm start:flutter` |

## H5 architecture

```text
pages (@sdkwork/mcp-h5-mcp)
  → @sdkwork/mcp-h5-core/sdk (mcpAppSdkClient)
  → generated sdkwork-mcp-app-sdk
```

Packages live under `apps/sdkwork-mcp-h5/packages/sdkwork-mcp-h5-*` per `NAMING_SPEC.md`.

## PC architecture

```text
pages (@sdkwork/mcp-pc-hub | mcp-pc-admin)
  → @sdkwork/mcp-pc-core/services (marketplaceService, adminMcpService)
  → generated sdkwork-mcp-app-sdk / sdkwork-mcp-backend-sdk
```

Shared UI and labels live in `@sdkwork/mcp-pc-commons`. Admin permissions are declared in `specs/mcp-admin.permissions.json` and enforced in `@sdkwork/mcp-pc-admin-core`.

## Verification

```bash
pnpm verify
node --test tests/static/mcp-app-package-naming.test.mjs
node --test apps/sdkwork-mcp-pc/tests/routes.test.mjs
node --test apps/sdkwork-mcp-h5/tests/routes.test.mjs
```

## Related docs

- [docs/product/prd/PRD.md](../docs/product/prd/PRD.md)
- [docs/architecture/tech/TECH_ARCHITECTURE.md](../docs/architecture/tech/TECH_ARCHITECTURE.md)
