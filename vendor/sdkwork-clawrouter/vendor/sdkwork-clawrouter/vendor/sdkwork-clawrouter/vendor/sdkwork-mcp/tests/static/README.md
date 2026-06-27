# static

Node test suite for repository invariants that do not require a running database or gateway.

| Test | Checks |
|------|--------|
| `mcp-contract-boundary.test.mjs` | Contract crate presence, no `sdkwork-discovery` |
| `mcp-database-schema.test.mjs` | DDL ↔ registry ↔ `mcp-database.schema.yaml` alignment; shared route crate wiring |
| `mcp-api-alignment.test.mjs` | Invocation append API + idempotent repository wiring |
| `mcp-pc-admin.test.mjs` | IAM permission catalog ↔ admin-core alignment |

Run:

```bash
node --test tests/static/*.test.mjs
```

Or via `pnpm test`.
