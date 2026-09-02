-- sdkwork:migration
-- id: 0038_ai_routing_policy_profile_rule
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the routing decision-plane tables. Only valid before any
--   routing policy/profile/rule rows have been written; once populated, prefer
--   a forward-fix plan over dropping live routing state.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 60s

BEGIN;

DROP INDEX IF EXISTS idx_ai_routing_rule_tenant_profile_priority;
DROP INDEX IF EXISTS uk_ai_routing_rule_profile_code;
DROP TABLE IF EXISTS ai_routing_rule;

DROP INDEX IF EXISTS uk_ai_routing_profile_scope_id;
DROP INDEX IF EXISTS uk_ai_routing_profile_policy_version;
DROP TABLE IF EXISTS ai_routing_profile;

DROP INDEX IF EXISTS uk_ai_routing_policy_scope_id;
DROP INDEX IF EXISTS uk_ai_routing_policy_tenant_code;
DROP TABLE IF EXISTS ai_routing_policy;

COMMIT;
