# CLOUD_ROUTER Database Module

Canonical lifecycle assets for `sdkwork-cloudrouter` per `DATABASE_FRAMEWORK_SPEC.md`.

- moduleId: `cloudrouter`
- serviceCode: `CLOUD_ROUTER`
- tablePrefix: `ai_` (cloud-router-owned generated schema)

## Composition

Cloud-router **generated schema** (`generated/schema/postgres/schema.sql`) owns gateway, routing, usage settlement projections, and cloud-router operational tables only.

`database.manifest.json` describes only the Cloud Router-owned database module. Sibling modules keep independent manifests, migrations, history, and ownership; they are not duplicated in the Cloud Router baseline.

The product installer performs explicit lifecycle orchestration. It migrates `sdkwork-models` first and then the Cloud Router database host before application-data bootstrap. IAM and other product domains remain independent service or SDK boundaries.

| Dependency | Lifecycle owner | Runtime role |
| --- | --- | --- |
| `sdkwork-models` | `sdkwork-models` database host | Model catalog tables migrated before Cloud Router bootstrap |
| `sdkwork-iam` | IAM service/database host | Authentication and identity data consumed through IAM boundaries |
| `sdkwork-log` | `sdkwork-log` database host | `log_request` request-log tables (metadata + redacted bodies) — independent database host composed as a workspace dependency via `SDKWORK_LOG_APP_ROOT`; its lifecycle is orchestrated before application-data bootstrap |

Gateway / routing / ops tables remain owned by `cloudrouter` in `generated/schema/postgres/schema.sql`.

See `docs/31-product-composition-model.md`.

## Initialization state

This module is in **initialization state** for greenfield deployments:

1. **Baseline** — `database/ddl/baseline/{engine}/0001_cloudrouter_baseline.sql` contains the full DDL snapshot.
2. **Migrations** — `database/migrations/{engine}/` is reserved for post-GA incremental schema changes only. It is intentionally empty at initialization.
3. **Drift** — run `pnpm db:drift:check` before release.

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
