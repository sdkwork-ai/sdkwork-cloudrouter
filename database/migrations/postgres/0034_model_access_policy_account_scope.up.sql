-- sdkwork:migration
-- id: 0034_model_access_policy_account_scope
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Extend ai_model_access_policy.scope_type to accept 'account' so the
--   account-level model blacklist/whitelist (deny/allow rows scoped to a single
--   upstream account) can be stored and enforced by the routing filter chain.
--   Precedence at runtime: account > supplier > account_group (any deny wins).
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE ai_model_access_policy
    DROP CONSTRAINT IF EXISTS ck_ai_model_access_policy_scope;

ALTER TABLE ai_model_access_policy
    ADD CONSTRAINT ck_ai_model_access_policy_scope
        CHECK (scope_type IN ('supplier', 'account_group', 'account'));

COMMIT;
