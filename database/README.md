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

## Migration strategy

`baselineStrategy` is `baseline-plus-migrations`:

1. **Baseline** — `database/ddl/baseline/postgres/0001_clawrouter_legacy_baseline.sql` is the authoritative initial schema snapshot (regenerated from schema registry when the contract changes).
2. **Incremental migrations** — post-baseline schema changes MUST be added under `database/migrations/postgres/` using `{version}_{name}.up.sql` (and optional `.down.sql`). Do not mutate production databases by editing the baseline alone after GA.
3. **Drift** — use `pnpm db:drift:check` before release; production uses `SDKWORK_CLAW_STARTUP_INSTALL_MODE=skip` and controlled upgrade jobs.

`0002`–`0004` baseline stubs are retired (empty commentary only).

## Commands

```bash
pnpm run db:validate
pnpm run db:plan
pnpm run db:init
pnpm run db:migrate
pnpm run db:seed
pnpm run db:status
pnpm run db:drift:check
pnpm run check:database-ownership
```

Runtime services create pools through `sdkwork-database-sqlx` and register `DefaultDatabaseModule` at bootstrap.
