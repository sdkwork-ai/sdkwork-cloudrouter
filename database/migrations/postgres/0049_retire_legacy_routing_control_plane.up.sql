-- sdkwork:migration
-- id: 0049_retire_legacy_routing_control_plane
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Retire the routing control plane that the invocation selector no
--   longer reads, and align the seeded default group with the documented
--   price-first strategy.
--
--   The pre-rewrite routing policy/profile/rule tables and the
--   ai_routing_strategy table have no production reader: strategy selection is
--   the closed UpstreamAccountRoutingStrategy enum configured on
--   ai_upstream_account_group.routing_strategy and optionally overridden by
--   iam_gateway_api_key_account_group.routing_strategy. Keeping the tables and
--   the duplicate routing_strategy_code / routing_policy_id columns invited
--   two sources of truth and stale annotations.
--
--   The UPDATE runs before the column drops so existing installations keep the
--   corrected price-first default. The migration is irreversible (forward fix).
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

-- The old seed wrote routing_strategy='weighted' while the annotation said
-- price_first. The selector reads routing_strategy only, so the documented
-- cheapest-account default was never applied.
UPDATE ai_upstream_account_group
SET routing_strategy = 'least_cost',
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE metadata ->> 'itemType' = 'default_admin_upstream_account_group'
  AND group_code = 'default-group'
  AND deleted_at IS NULL
  AND routing_strategy = 'weighted';

-- Converge the column default and CHECK with the contract for existing
-- installations; the regenerated baseline carries the same definition.
ALTER TABLE ai_upstream_account_group
    ALTER COLUMN routing_strategy SET DEFAULT 'least_cost';

ALTER TABLE ai_upstream_account_group
    DROP CONSTRAINT IF EXISTS ck_ai_upstream_account_group_routing_strategy;

ALTER TABLE ai_upstream_account_group
    ADD CONSTRAINT ck_ai_upstream_account_group_routing_strategy
        CHECK (routing_strategy IN ('weighted', 'round_robin', 'least_latency', 'least_cost', 'quality_first', 'failover'));

-- Dead routing identity columns: the decision log never persists a policy,
-- profile, or rule identity after the control-plane retirement.
ALTER TABLE ai_routing_decision_log
    DROP COLUMN IF EXISTS policy_id,
    DROP COLUMN IF EXISTS profile_id,
    DROP COLUMN IF EXISTS rule_id;

-- The group strategy is the closed enum in routing_strategy. The legacy
-- strategy-code annotation and the policy FK duplicated it and drifted.
ALTER TABLE ai_upstream_account_group
    DROP COLUMN IF EXISTS routing_strategy_code,
    DROP COLUMN IF EXISTS routing_policy_id;

-- Child tables first so the existing foreign keys never block the drop.
DROP TABLE IF EXISTS ai_routing_rule;
DROP TABLE IF EXISTS ai_routing_profile;
DROP TABLE IF EXISTS ai_routing_policy;
DROP TABLE IF EXISTS ai_routing_strategy;

COMMIT;
