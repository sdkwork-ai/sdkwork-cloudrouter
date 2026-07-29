# PostgreSQL migrations

Versioned incremental migrations for post-baseline schema changes. These files
remain immutable after their checksums enter lifecycle history, including during
pre-release baseline consolidation.

Current migrations:

- `0002_ai_request_trace_gateway_attribution.up.sql` is the historical migration
  recorded in existing development lifecycle history.
- `0003_standardize_upstream_supplier_routing.up.sql` migrates the legacy
  provider/site/channel model to supplier/account aggregates. It is an
  irreversible, forward-fix migration and requires human review before
  execution because its verified contract phase drops retired legacy tables.

## Naming

Add SQL files using `{version}_{name}.up.sql` and optional `{version}_{name}.down.sql`.

Example:

```
0005_usage_settlement_index.up.sql
0005_usage_settlement_index.down.sql
```

## Rules

- The baseline in `database/ddl/baseline/postgres/0001_clawrouter_baseline.sql` represents the initial installed schema.
- Development migrations run only in the shared `sdkwork_ai_dev` database and
  `sdkwork_ai_dev` schema. They must not create, drop, alter, or switch databases
  or schemas.
- Do not replay the baseline over a non-empty shared schema or replace an applied
  migration with a folded-baseline revision. Repair drift through a reviewed
  forward migration while preserving lifecycle history.
- After GA, **do not** change production schema only by regenerating the baseline; add an incremental migration and update the schema registry contract.
- Run `pnpm db:plan` and `pnpm db:drift:check` before merge.
- Production upgrades use controlled jobs (`deployments/kubernetes/claw-router-migration-job.yaml`) with `SDKWORK_CLAW_STARTUP_INSTALL_MODE=skip`.
