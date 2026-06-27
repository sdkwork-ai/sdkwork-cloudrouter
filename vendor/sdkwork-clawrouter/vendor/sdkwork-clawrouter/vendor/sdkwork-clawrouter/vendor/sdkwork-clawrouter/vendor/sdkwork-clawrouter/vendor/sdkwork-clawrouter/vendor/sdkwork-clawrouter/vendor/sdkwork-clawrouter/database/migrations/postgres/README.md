# PostgreSQL migrations

Versioned incremental migrations for post-baseline schema changes.

## Naming

Add SQL files using `{version}_{name}.up.sql` and optional `{version}_{name}.down.sql`.

Example:

```
0005_usage_settlement_index.up.sql
0005_usage_settlement_index.down.sql
```

## Rules

- The baseline in `database/ddl/baseline/postgres/0001_clawrouter_legacy_baseline.sql` represents the initial installed schema.
- After GA, **do not** change production schema only by regenerating the baseline; add an incremental migration and update the schema registry contract.
- Run `pnpm db:plan` and `pnpm db:drift:check` before merge.
- Production upgrades use controlled jobs (`deployments/kubernetes/claw-router-migration-job.yaml`) with `SDKWORK_CLAW_STARTUP_INSTALL_MODE=skip`.
