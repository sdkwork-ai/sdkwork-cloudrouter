# CLAW_ROUTER Database Module

Canonical lifecycle assets for `sdkwork-clawrouter` per `DATABASE_FRAMEWORK_SPEC.md`.

- moduleId: `clawrouter`
- serviceCode: `CLAW_ROUTER`
- tablePrefix: `ai_` (claw-router-owned generated schema)

## Composition

Claw-router **generated schema** (`generated/schema/postgres/schema.sql`) owns gateway, routing, usage settlement projections, and claw-router operational tables only.

Sibling product domains are declared in `database.manifest.json` `composeDependencies` for **install-time composition** through `sdkwork-database` (IAM bootstrap, models catalog, commerce). Those tables are not duplicated inside the generated claw-router baseline DDL; they are applied by the database framework during `db:init` / `db:migrate` according to each dependency's ownership mode:

| Dependency | Ownership in manifest | Runtime role |
| --- | --- | --- |
| `sdkwork-models` | `compose_at_install` | Models catalog tables composed at install |
| `iam` | `bootstrap_standalone` | IAM base tables bootstrapped for standalone |

Gateway / routing / ops tables remain owned by `clawrouter` in `generated/schema/postgres/schema.sql`.

See `docs/31-product-composition-model.md`.

## Initialization state

This module is in **initialization state** for greenfield deployments:

1. **Baseline** — `database/ddl/baseline/{engine}/0001_clawrouter_baseline.sql` contains the full DDL snapshot.
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
