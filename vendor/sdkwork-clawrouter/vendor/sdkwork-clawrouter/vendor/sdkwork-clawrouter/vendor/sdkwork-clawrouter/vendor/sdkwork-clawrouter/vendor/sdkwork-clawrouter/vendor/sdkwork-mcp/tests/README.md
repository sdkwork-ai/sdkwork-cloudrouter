# tests

Verification suites for **sdkwork-mcp**.

| Suite | Command | Purpose |
|-------|---------|---------|
| Rust unit/integration | `cargo test --workspace` | Service validation, contract enums |
| Static invariants | `node --test tests/static/*.test.mjs` | DDL/schema alignment, API wiring |
| Database contract | `pnpm test:contract:database` | SDKWork database framework standard |
| Full gate | `pnpm verify` | Architecture + db + topology + all tests |

## Static tests

- `mcp-contract-boundary.test.mjs` — contract crate, no `sdkwork-discovery`
- `mcp-database-schema.test.mjs` — seven active `ai_mcp_*` tables aligned across DDL/registry/spec
- `mcp-api-alignment.test.mjs` — invocation append route + idempotency repository wiring
