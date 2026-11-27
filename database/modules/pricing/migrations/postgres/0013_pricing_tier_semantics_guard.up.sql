-- sdkwork:migration
-- id: 0013_pricing_tier_semantics_guard
-- engine: postgres
-- module: pricing
-- purpose: Reject rate rows whose conditions smuggle time or graduated-tier
--   semantics into a dimension value.
--
--   Two real catalog defects motivated this guard:
--
--   1. Vendor off-peak rates were authored as `tier_code=offpeak_res_720p`
--      with `rate_variant=standard`. No request can ever produce that
--      dimension value, so those rows were unreachable and the discounted
--      price the vendor publishes could never be charged. Time-of-day pricing
--      has exactly one correct home: `rate_variant=time_window` plus a
--      `schedule`. A tier code that names a time window is a contradiction.
--
--   2. Graduated vendor rates were authored as two peer rows
--      (`tier_code=first_megapixel` and `tier_code=additional_megapixel`).
--      Both rows match the same request at the same specificity and priority,
--      so the selector correctly reported an ambiguous rate and the whole
--      resource became unrated instead of incorrectly billed. A scale belongs
--      in `tiers` with contiguous bounds, which is what `graduated` and
--      `volume` already mean.
--
--   The guard is a statement-level trigger rather than a CHECK because the
--   predicate has to inspect the element values of a JSONB array.
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

    -- A `tier_code` condition must be a mutually exclusive selector (a
    -- resolution, a quality level, a batch marker). It must never encode the
    -- time window or a graduated position.
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
