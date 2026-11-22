-- sdkwork:migration
-- id: 0020_upstream_account_group_default_flag
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the is_default flag and its per-tenant uniqueness index.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

DROP INDEX IF EXISTS uk_ai_upstream_account_group_default_per_tenant;
ALTER TABLE ai_upstream_account_group DROP COLUMN IF EXISTS is_default;

COMMIT;
