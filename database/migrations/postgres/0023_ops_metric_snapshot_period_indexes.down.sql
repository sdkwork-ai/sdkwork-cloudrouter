-- sdkwork:migration
-- id: 0023_ops_metric_snapshot_period_indexes
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the ops_metric_snapshot period indexes.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

DROP INDEX IF EXISTS idx_ops_metric_snapshot_name_period;
DROP INDEX IF EXISTS idx_ops_metric_snapshot_scope_period;

COMMIT;
