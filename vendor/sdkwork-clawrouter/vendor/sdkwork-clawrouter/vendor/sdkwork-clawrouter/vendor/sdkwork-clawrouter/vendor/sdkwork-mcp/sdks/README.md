# sdks

Generated TypeScript SDK families for **sdkwork-mcp**. Do not hand-edit `generated/` output.

| SDK family | Consumer | OpenAPI source |
|------------|----------|----------------|
| `sdkwork-mcp-app-sdk` | PC / H5 / Flutter app clients | `apis/app-api/mcp/` |
| `sdkwork-mcp-backend-sdk` | Admin / operator consoles | `apis/backend-api/mcp/` |

## Regenerate

```bash
pnpm api:materialize
pnpm sdk:generate
pnpm sdk:generate:check
```

## Integration rules

- Use generated SDK transport; no raw HTTP to `/app/v3/api/mcp/*` or `/backend/v3/api/mcp/*`
- Tenant context via IAM web adapter headers (see `sdkwork-iam-web-adapter`)
- File icons via `sdkwork-drive` URIs only
