-- Migration: 0001_initial_schema
-- Version: 0.3.0
-- Description: Initial schema for sdkwork-clawrouter (baseline snapshot).
-- Strategy: baseline-plus-migrations
--
-- The canonical baseline DDL lives in:
--   database/ddl/baseline/sqlite/0001_clawrouter_legacy_baseline.sql
--   database/ddl/baseline/sqlite/0002_clawrouter_legacy_projection.sql
--   database/ddl/baseline/sqlite/0003_gateway_routing_dictionary.sql
--   database/ddl/baseline/sqlite/0004_messaging_runtime_projection.sql
--
-- In baseline-plus-migrations mode, the database framework applies the
-- baseline first, then applies this migration. Because the baseline uses
-- CREATE TABLE IF NOT EXISTS, re-applying the DDL here is idempotent.
-- In migrations-only mode, this migration installs the complete schema.
--
-- Note: SQLite does not support native range partitioning. The high-traffic
-- tables (ai_request_trace, ai_routing_decision_log, ai_usage_fact) are
-- created as regular tables in SQLite mode. Partitioning and retention are
-- enforced at the application layer for desktop/development deployments.
-- Production deployments MUST use PostgreSQL where range partitioning is
-- available.

\ir ../../ddl/baseline/sqlite/0001_clawrouter_legacy_baseline.sql
\ir ../../ddl/baseline/sqlite/0002_clawrouter_legacy_projection.sql
\ir ../../ddl/baseline/sqlite/0003_gateway_routing_dictionary.sql
\ir ../../ddl/baseline/sqlite/0004_messaging_runtime_projection.sql
