-- sdkwork:migration
-- id: 0002_pricing_rule_integrity_guards
-- engine: postgres
-- module: cloudrouter-billing
-- reversible: true
-- transactional: true

DROP TRIGGER IF EXISTS trg_cloudrouter_pricing_rule_validate_payload ON cloudrouter_pricing_rule;
DROP FUNCTION IF EXISTS cloudrouter_validate_pricing_rule_payload();
