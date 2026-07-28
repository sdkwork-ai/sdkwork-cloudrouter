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

The following lifecycle description is not evidence of a feature-complete
runtime schema. The active
[readiness review](../docs/engineering/reviews/REVIEW-20260714-production-readiness-revalidation.md)
records that the canonical schema does not currently create the app-chat or
runtime usage-link tables required by the wired app-chat stores. A successful
`db:init`, `db:validate`, or `/readyz` must not be presented as proof that chat
routes are safe until that ownership and migration gap is closed.

This module is in **initialization state** for greenfield deployments:

1. **Baseline** - `database/ddl/baseline/{engine}/0001_clawrouter_baseline.sql` contains the complete pre-release DDL snapshot.
2. **Migrations** - `database/migrations/{engine}/` is intentionally empty until the first post-baseline schema change. Pre-release provider, site, channel, and channel-group upgrade scripts have been folded into the canonical baseline and removed.
3. **Drift** - run `pnpm db:drift:check` before release.

Fresh installations must start from the generated PostgreSQL baseline. Historical pre-release schemas are not supported installation or rollback targets.

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
