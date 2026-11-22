-- sdkwork:migration
-- id: 0051_storage_center_governance
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Reverse 0051_storage_center_governance.up.sql.
--   Only the Cloud Router-owned storage-center governance tables are dropped;
--   the IAM provider-account catalog and the Drive object-store tables this
--   surface references are never touched.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

DROP TABLE IF EXISTS storage_gc_job;
DROP TABLE IF EXISTS storage_reconciliation_run;
DROP TABLE IF EXISTS storage_usage_counter;
DROP TABLE IF EXISTS storage_quota_policy;
DROP TABLE IF EXISTS storage_default_bucket_policy;
DROP TABLE IF EXISTS storage_bucket;
DROP TABLE IF EXISTS storage_provider;

COMMIT;
