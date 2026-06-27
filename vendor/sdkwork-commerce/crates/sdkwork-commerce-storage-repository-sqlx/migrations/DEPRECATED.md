# Deprecated legacy migration

Canonical baseline: `database/ddl/baseline/postgres/0001_commerce_legacy_baseline.sql`.

PostgreSQL bootstrap MUST use `sdkwork-commerce-database-host` via `bootstrap_commerce_database()`.

SQLite tests continue to apply `commerce_initial_migration_sql()` inline.
