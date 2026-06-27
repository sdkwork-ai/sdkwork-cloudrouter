# COMMERCE Database Module

Canonical lifecycle assets for `sdkwork-commerce` per `DATABASE_FRAMEWORK_SPEC.md`.

- moduleId: `commerce`
- serviceCode: `COMMERCE`
- tablePrefix: `commerce_`

## Commands

```bash
pnpm run db:materialize:contract
pnpm run db:validate
pnpm run db:bootstrap
```

## Baseline

Legacy SQL: `crates/sdkwork-commerce-storage-repository-sqlx/migrations/0001_commerce_foundation.sql` → `database/ddl/baseline/postgres/0001_commerce_legacy_baseline.sql`.

## Runtime bootstrap

PostgreSQL RPC host: `ensure_commerce_schema()` calls `bootstrap_commerce_database()` when the runtime pool is Postgres.

SQLite tests continue to apply `commerce_initial_migration_sql()` inline.
