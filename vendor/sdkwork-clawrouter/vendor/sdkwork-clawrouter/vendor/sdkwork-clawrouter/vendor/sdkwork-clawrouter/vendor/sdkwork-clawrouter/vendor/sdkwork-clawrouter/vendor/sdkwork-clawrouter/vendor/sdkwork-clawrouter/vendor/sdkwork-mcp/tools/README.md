# tools

Workspace automation for **sdkwork-mcp**.

| Script | Purpose |
|--------|---------|
| `mcp_openapi_materialize.mjs` | Materialize app/backend OpenAPI from route inventory |
| `mcp_sdk_generate.mjs` | Generate TypeScript SDKs from OpenAPI |
| `check_sdkwork_mcp_architecture_alignment.mjs` | Repository layout and dependency gates (`pnpm check:architecture-alignment`) |

Gateway scripts live under `scripts/gateway/`.

```bash
pnpm api:materialize
pnpm sdk:generate
pnpm check:architecture-alignment
```
