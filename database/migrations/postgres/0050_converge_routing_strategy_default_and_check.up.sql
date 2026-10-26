-- sdkwork:migration
-- id: 0050_converge_routing_strategy_default_and_check
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Converge ai_upstream_account_group.routing_strategy on existing installations with the contract the regenerated baseline already carries: the column default becomes least_cost and the CHECK enumerates the full closed strategy set.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s
--
-- Databases installed before the baseline regeneration carry the old
-- `weighted` default and a CHECK without `least_cost`, so a row inserted
-- without an explicit strategy stores `weighted` even though the selector
-- documented price-first as the default. This migration converges the column
-- default and constraint for those installations; the regenerated baseline
-- carries the same definition for clean installs.
ALTER TABLE ai_upstream_account_group
    ALTER COLUMN routing_strategy SET DEFAULT 'least_cost';

ALTER TABLE ai_upstream_account_group
    DROP CONSTRAINT IF EXISTS ck_ai_upstream_account_group_routing_strategy;

ALTER TABLE ai_upstream_account_group
    ADD CONSTRAINT ck_ai_upstream_account_group_routing_strategy
        CHECK (routing_strategy IN ('weighted', 'round_robin', 'least_latency', 'least_cost', 'quality_first', 'failover'));
