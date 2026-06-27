# Flyway Schema Contract Audit

`tools.flyway_schema_contract_audit` compares registered Schema Registry table
contracts with upstream Spring AI Plus Flyway PostgreSQL DDL.

## Purpose

- Keep Java-owned `plus_*` tables registered by claw-router aligned with
  production Flyway migrations.
- Detect drift when production DDL adds or changes tables, business
  `NOT NULL` columns, physical business columns, unique constraints, indexes, or
  foreign keys that are not mirrored in
  `docs/schema-registry/sdkwork-clawrouter.tables.yaml`.
- Optionally validate SQL physical column types for tables that declare
  `column_types` in the registry.
- Preserve PostgreSQL index method metadata, including `USING gin` and
  `USING gist`, without requiring non-portable SQLite test DDL.
- Avoid false positives for upstream tables that are not part of the current
  claw-router registry scope.

## Default Scope

The default command audits these upstream migration files when they exist:

```text
spring-ai-plus-server-application/src/main/resources/database/postgresql/V6__vip_membership.sql
spring-ai-plus-server-application/src/main/resources/database/postgresql/feature/V102__commerce_trade_payment.sql
```

Only tables already declared in the Schema Registry are enforced. Missing default
Flyway files are skipped so isolated app-level test fixtures can still run.
Explicit `--flyway` paths are treated as required inputs.

## Enforced Contracts

For every registered table found in Flyway DDL, the audit validates:

- `CREATE TABLE` business `NOT NULL` columns, excluding common inherited base
  columns such as `id`, `uuid`, `created_at`, `updated_at`, `v`, `tenant_id`,
  `organization_id`, and `data_scope`.
- `CREATE TABLE` physical column ownership. Every Flyway column must be covered
  by inherited base columns or declared in registry `columns` /
  `physical_columns` ownership groups such as `own`, `ignored`,
  `projection_only_ignored`, or `unmanaged`.
- Inline column `UNIQUE` constraints and table-level `UNIQUE (...)`
  constraints.
- Inline `REFERENCES` constraints and table-level `FOREIGN KEY (...)`
  constraints.
- Optional exact SQL column type matching for registry `column_types`.
- `CREATE INDEX` and `CREATE UNIQUE INDEX` names.
- Exact index column order.
- Exact uniqueness.
- Explicit PostgreSQL index methods such as `gin` or `gist`.
- `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ... REFERENCES ...`
  names, local columns, referenced table, and referenced columns.

## Commands

```bash
python -B -m tools.flyway_schema_contract_audit
python -B -m tools.flyway_schema_contract_audit --flyway path/to/Vxxx__file.sql
python -B -m tools.schema_quality_gate
```

`tools.schema_quality_gate` runs this audit after Java legacy contract checks and
before frontend contract checks. A failed audit means the registry is no longer a
complete machine-readable mirror of the registered production schema contract.
