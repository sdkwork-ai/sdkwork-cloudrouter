-- sdkwork:migration
-- id: 0025_upstream_account_group_model_lists
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the model blacklist/whitelist JSONB columns on
--   ai_upstream_account_group.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE ai_upstream_account_group
    DROP COLUMN IF EXISTS model_blacklist,
    DROP COLUMN IF EXISTS model_whitelist;

COMMIT;
