# CLAW_ROUTER Database Module

Canonical lifecycle assets for `sdkwork-clawrouter` per `DATABASE_FRAMEWORK_SPEC.md`.

- moduleId: `clawrouter`
- serviceCode: `CLAW_ROUTER`
- tablePrefix: `ai_` (claw-router-owned generated schema)

## Composition

Claw-router **generated schema** (`generated/schema/postgres/schema.sql`) owns gateway, routing, usage settlement projections, and claw-router operational tables only.

`database.manifest.json` describes only the Claw Router-owned database module. Sibling modules keep independent manifests, migrations, history, and ownership; they are not duplicated in the Claw Router baseline.

The product installer performs explicit lifecycle orchestration. It migrates `sdkwork-models` first and then the Claw Router database host before application-data bootstrap. IAM and other product domains remain independent service or SDK boundaries.

| Dependency | Lifecycle owner | Runtime role |
| --- | --- | --- |
| `sdkwork-models` | `sdkwork-models` database host | Model catalog tables migrated before Claw Router bootstrap |
| `sdkwork-iam` | IAM service/database host | Authentication and identity data consumed through IAM boundaries |

Gateway / routing / ops tables remain owned by `clawrouter` in `generated/schema/postgres/schema.sql`.

See `docs/31-product-composition-model.md`.

## Initialization state

This module is in **initialization state** for greenfield deployments:

1. **Baseline** — `database/ddl/baseline/{engine}/0001_clawrouter_baseline.sql` contains the full DDL snapshot.
2. **Migrations** — `database/migrations/{engine}/` contains paired incremental changes after the folded baseline. Migration `0002_ai_request_trace_gateway_attribution` adds immutable gateway attribution, normalizes `ai_request_trace.error_type`, and adds retention/operations indexes.
3. **Drift** — run `pnpm db:drift:check` before release.

Migration `0002` is conditionally reversible: rollback refuses to discard non-empty gateway attribution snapshots. Production recovery should prefer a reviewed forward fix after data has been written.

## Commands

```bash
pnpm run db:validate
pnpm run db:materialize:contract
pnpm run db:plan
pnpm run db:init
pnpm run db:migrate
pnpm run db:seed
pnpm run db:status
pnpm run db:drift:check
```
