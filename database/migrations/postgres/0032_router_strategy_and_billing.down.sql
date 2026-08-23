-- sdkwork:migration
-- id: 0032_router_strategy_and_billing
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the unified routing model introduced by
--   0032_router_strategy_and_billing.up.sql.
-- reversible: true
-- rollback: up-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

-- Drop unified routing tables (reverse creation order for FK safety).
DROP TABLE IF EXISTS ai_resource_binding;
DROP TABLE IF EXISTS ai_model_access_policy;
DROP TABLE IF EXISTS ai_routing_strategy;

-- Drop account-group routing strategy code column.
ALTER TABLE ai_upstream_account_group
    DROP COLUMN IF EXISTS routing_strategy_code;

-- Drop account billing mode column.
ALTER TABLE ai_upstream_account
    DROP COLUMN IF EXISTS billing_mode;

COMMIT;
