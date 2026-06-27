# specs

Local application contracts for **sdkwork-mcp**. Root SDKWork standards live in `../sdkwork-specs/`.

## Index

| File | Purpose |
|------|---------|
| `component.spec.json` | Component identity (`intelligence` / `mcp`) and ownership |
| `mcp-admin.permissions.json` | IAM permission/role catalog for PC admin surfaces (bind in platform IAM) |
| `mcp-database.schema.yaml` | Active `ai_mcp_*` table list (7 tables, L2) |
| `topology.spec.json` | Gateway / client topology for `@sdkwork/app-topology` |

## Database contract

Authoritative DDL and registry:

- `database/ddl/baseline/postgres/0001_mcp_baseline.sql`
- `database/contract/schema.yaml` (schema version **1.1.0**)
- `database/contract/table-registry.json`

`database/database.manifest.json` keeps framework `contractVersion` **1.0.0**; schema evolution is tracked in `schema.yaml` only.

## Validation

```bash
pnpm db:validate
pnpm check:architecture-alignment
node --test tests/static/mcp-database-schema.test.mjs tests/static/mcp-pc-admin.test.mjs
node --test apps/sdkwork-mcp-pc/tests/routes.test.mjs
```
