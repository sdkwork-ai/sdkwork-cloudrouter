-- sdkwork:migration
-- id: 0014_pricing_tier_guard_lifecycle_scope
-- engine: postgres
-- module: pricing
-- purpose: Restore the 0013 guard body, which validates every write.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.6.0

CREATE OR REPLACE FUNCTION pricing_guard_tier_semantics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    time_word TEXT;
BEGIN
    IF NEW.conditions IS NULL OR jsonb_typeof(NEW.conditions) <> 'array' THEN
        RETURN NEW;
    END IF;

    SELECT item.value #>> '{}' INTO time_word
    FROM jsonb_array_elements(NEW.conditions) AS item
    WHERE item.value->>'dimensionCode' IN ('tier_code', 'tier', 'service_tier')
      AND item.value->>'operatorCode' = 'eq'
      AND jsonb_typeof(item.value->'value') = 'string'
      AND (item.value->'value') #>> '{}' ~* '(off_?peak|peak|valley|trough|holiday|weekend|night)'
    LIMIT 1;

    IF time_word IS NOT NULL THEN
        RAISE EXCEPTION
            'pricing_rate tier condition % names a time window; time-of-day pricing must use rate_variant = time_window with a schedule',
            time_word
            USING ERRCODE = 'check_violation';
    END IF;

    SELECT item.value #>> '{}' INTO time_word
    FROM jsonb_array_elements(NEW.conditions) AS item
    WHERE item.value->>'dimensionCode' IN ('tier_code', 'tier', 'service_tier')
      AND item.value->>'operatorCode' = 'eq'
      AND jsonb_typeof(item.value->'value') = 'string'
      AND (item.value->'value') #>> '{}' ~* '(first_|additional_|subsequent_|initial_|beyond_)'
    LIMIT 1;

    IF time_word IS NOT NULL THEN
        RAISE EXCEPTION
            'pricing_rate tier condition % encodes a graduated scale position; store the scale in tiers with calculation_mode = graduated',
            time_word
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_pricing_rate_tier_semantics ON pricing_rate;
CREATE TRIGGER trg_pricing_rate_tier_semantics
BEFORE INSERT OR UPDATE ON pricing_rate
FOR EACH ROW EXECUTE FUNCTION pricing_guard_tier_semantics();
