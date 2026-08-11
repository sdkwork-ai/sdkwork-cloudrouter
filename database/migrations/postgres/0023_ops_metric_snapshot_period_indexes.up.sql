-- sdkwork:migration
-- id: 0023_ops_metric_snapshot_period_indexes
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Add period-range indexes to ops_metric_snapshot so the admin
--   monitor performance query (metric_name IN (...) AND period_start >=
--   now() - interval) is served by an index instead of a full scan. The
--   baseline carries the same definitions for clean installs.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

CREATE INDEX IF NOT EXISTS idx_ops_metric_snapshot_name_period
    ON ops_metric_snapshot (tenant_id, organization_id, metric_name, period_start, id);

CREATE INDEX IF NOT EXISTS idx_ops_metric_snapshot_scope_period
    ON ops_metric_snapshot (tenant_id, organization_id, metric_scope, metric_period, period_start, id);

COMMIT;
