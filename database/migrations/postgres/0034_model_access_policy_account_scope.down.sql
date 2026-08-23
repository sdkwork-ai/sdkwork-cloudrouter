-- sdkwork:migration
-- id: 0034_model_access_policy_account_scope
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Rollback - restore the original scope_type constraint (supplier +
--   account_group only). Any existing 'account' rows must be migrated/deleted
--   before applying this rollback.
-- reversible: true
-- rollback: this-file
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE ai_model_access_policy
    DROP CONSTRAINT IF EXISTS ck_ai_model_access_policy_scope;

ALTER TABLE ai_model_access_policy
    ADD CONSTRAINT ck_ai_model_access_policy_scope
        CHECK (scope_type IN ('supplier', 'account_group'));

COMMIT;
