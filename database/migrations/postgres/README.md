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
- `0004_add_chat_runtime_schema.up.sql` creates the user-scoped chat transcript,
  context snapshot, runtime invocation, and usage-link authority. It accepts
  either an empty pre-launch schema or the complete folded-baseline shape and
  fails closed when only part of the eight-table contract exists.
- `0005_reconcile_upstream_supplier_routing.up.sql` repairs a partially applied
  `0003` without changing lifecycle history. It backfills canonical supplier and
  account references, retires remaining provider/channel columns and empty
  prototype tables, and fails closed on conflicts, orphan references, or legacy
  fields that still contain data.
- `0006_align_chat_runtime_optional_cost.up.sql` keeps `0004` immutable while
  aligning chat turn and runtime usage costs with the optional decimal contract.
  It performs metadata-only nullability/default changes and replaces the two
  non-negative checks with null-aware constraints.
- `0007_reconcile_canonical_contract_constraints.up.sql` reconciles legacy
  nullability, validated constraints, and soft-delete-aware unique indexes with
  the materialized Claw Router contract. It fails closed on null, scope, range,
  relationship, or uniqueness violations instead of rewriting business data.
- `0009_account_group_vendor_modalities.up.sql` adds optional model vendor
  binding (`vendor_code`, NULL = not vendor-bound) and the supported modality
  set (`modalities` JSONB array of text/audio/image/video/music) to
  `ai_upstream_account_group`, with a vendor lookup index. It is a
  column-addition-only migration with no row backfill.

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
- If `0004` rejects a partial pre-launch chat schema, stop chat writes, inspect
  drift against `database/contract/schema.yaml`, and use a reviewed forward-fix
  or recreate the disposable pre-launch database. Do not bypass its shape
  verification or mark the migration as applied manually.
- If `0005` rejects legacy data, keep `0003` history intact, stop routing writes,
  archive or reconcile the named rows, and rerun `0005`. Do not rename columns
  manually or mark the repair migration as applied.
- If `0007` rejects existing data, keep prior migration history intact and repair
  the named rows under the owning service before rerunning it. Do not weaken the
  contract or mark constraints valid without PostgreSQL validation.
- After GA, **do not** change production schema only by regenerating the baseline; add an incremental migration and update the schema registry contract.
- Run `pnpm db:plan` and `pnpm db:drift:check` before merge.
- Production upgrades use controlled jobs (`deployments/kubernetes/claw-router-migration-job.yaml`) with `SDKWORK_CLAW_STARTUP_INSTALL_MODE=skip`.
