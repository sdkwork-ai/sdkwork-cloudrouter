-- sdkwork:migration
-- id: 0054_user_model_group_routing
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Drop the user-scoped model routing control plane.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

DROP INDEX IF EXISTS ix_ai_user_account_group_route_group;
DROP INDEX IF EXISTS ix_ai_user_account_group_route_user;
DROP INDEX IF EXISTS uk_ai_user_account_group_route_scope_group;
DROP TABLE IF EXISTS ai_user_account_group_route;

COMMIT;
