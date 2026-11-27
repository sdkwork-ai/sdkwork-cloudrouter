-- sdkwork:migration
-- id: 0013_pricing_tier_semantics_guard
-- engine: postgres
-- module: pricing
-- purpose: Remove the tier-semantics guard trigger and its function.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.6.0

DROP TRIGGER IF EXISTS trg_pricing_rate_tier_semantics ON pricing_rate;
DROP FUNCTION IF EXISTS pricing_guard_tier_semantics();
