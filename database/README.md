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

The canonical baseline contains the complete current Claw Router-owned schema,
including app-chat and runtime usage-link tables. Product installation remains
a composed lifecycle: migrate the `sdkwork-models` module first, migrate this
module and its declared child modules, then bootstrap application data.

This authoritative-server module uses the following greenfield lifecycle:

1. **Baseline** - `database/ddl/baseline/postgres/0001_clawrouter_baseline.sql` contains the complete pre-release DDL snapshot.
2. **Migrations** - `database/migrations/postgres/` contains guarded upgrade paths for pre-release installations. The folded baseline already reflects their canonical end state; fresh installs apply the baseline and record or skip compatible migrations through the lifecycle framework.
3. **Drift** - run `pnpm db:drift:check` before release.

Fresh installations must start from the generated PostgreSQL baseline. Historical pre-release schemas are not supported installation or rollback targets.

SQLite is not a server engine for this module. A desktop client that needs local cache,
offline projection, draft, preference, local search, or a resumable queue must own a separate
`client-local` contract and migration history; it must not materialize this PostgreSQL authority
as an interchangeable SQLite mirror.

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
