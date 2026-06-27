-- Migration: 0001_initial_schema
-- Version: 0.3.0
-- Description: Initial schema for sdkwork-clawrouter (baseline snapshot).
-- Strategy: baseline-plus-migrations
--
-- The canonical baseline DDL lives in:
--   database/ddl/baseline/postgres/0001_clawrouter_legacy_baseline.sql
--
-- In baseline-plus-migrations mode, the database framework applies the
-- baseline first, then applies this migration. Because the baseline uses
-- CREATE TABLE IF NOT EXISTS, re-applying the DDL here is idempotent.
-- In migrations-only mode, this migration installs the complete schema.
--
-- High-traffic tables are range-partitioned by created_at with DEFAULT
-- partitions to catch out-of-range rows. Monthly partitions should be
-- created by a scheduled retention job (see ops_metric_snapshot job_type).

\ir ../../ddl/baseline/postgres/0001_clawrouter_legacy_baseline.sql
