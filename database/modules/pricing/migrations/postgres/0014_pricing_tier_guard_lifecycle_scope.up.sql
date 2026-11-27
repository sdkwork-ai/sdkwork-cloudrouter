-- sdkwork:migration
-- id: 0014_pricing_tier_guard_lifecycle_scope
-- engine: postgres
-- module: pricing
-- purpose: Scope the 0013 tier-semantics guard to semantic writes.
--
--   0013 rejects a rate row whose `tier_code` condition encodes a time window
--   or a graduated position. As written it fired for every UPDATE, including
--   the lifecycle-only updates the catalog sync performs when it supersedes a
--   previous price-book version (`deleted_at`, `version`, `updated_at`). Those
--   rows already exist with the conditions the guard rejects, so retiring them
--   failed and the whole official pricing sync aborted before the new catalog
--   version could activate.
--
--   Two corrections:
--
--   1. An UPDATE that leaves `conditions` untouched, or that performs a soft
--      delete, is not an authoring write. The guard now returns early for both.
--      The predicate it protects is unchanged for INSERT and for any UPDATE
--      that rewrites the condition array.
--
--   2. The time-window rule matched any value containing a window word, so a
--      resolution selector such as `offpeak_res_720p` was rejected even though
--      it names a resolution variant, not a window. The rule now matches only
--      a bare window token (`peak`, `off_peak`, `night`, ...). The graduated
--      rule is unchanged: `first_megapixel`-style values are still rejected.
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
    tier_value TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.conditions IS NOT DISTINCT FROM OLD.conditions THEN
            RETURN NEW;
        END IF;
        IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
            RETURN NEW;
        END IF;
    END IF;

    IF NEW.conditions IS NULL OR jsonb_typeof(NEW.conditions) <> 'array' THEN
        RETURN NEW;
    END IF;

    -- A `tier_code` condition must be a mutually exclusive selector (a
    -- resolution, a quality level, a batch marker). A bare window token is a
    -- time-of-day declaration and belongs in `rate_variant` plus `schedule`.
    SELECT item.value #>> '{}' INTO tier_value
    FROM jsonb_array_elements(NEW.conditions) AS item
    WHERE item.value->>'dimensionCode' IN ('tier_code', 'tier', 'service_tier')
      AND item.value->>'operatorCode' = 'eq'
      AND jsonb_typeof(item.value->'value') = 'string'
      AND lower(btrim(item.value #>> '{}')) IN (
          'peak', 'off_peak', 'offpeak', 'off-peak', 'valley', 'trough',
          'holiday', 'weekend', 'night'
      )
    LIMIT 1;

    IF tier_value IS NOT NULL THEN
        RAISE EXCEPTION
            'pricing_rate tier condition % names a time window; time-of-day pricing must use rate_variant = time_window with a schedule',
            tier_value
            USING ERRCODE = 'check_violation';
    END IF;

    SELECT item.value #>> '{}' INTO tier_value
    FROM jsonb_array_elements(NEW.conditions) AS item
    WHERE item.value->>'dimensionCode' IN ('tier_code', 'tier', 'service_tier')
      AND item.value->>'operatorCode' = 'eq'
      AND jsonb_typeof(item.value->'value') = 'string'
      AND (item.value->'value') #>> '{}' ~* '(first_|additional_|subsequent_|initial_|beyond_)'
    LIMIT 1;

    IF tier_value IS NOT NULL THEN
        RAISE EXCEPTION
            'pricing_rate tier condition % encodes a graduated scale position; store the scale in tiers with calculation_mode = graduated',
            tier_value
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_pricing_rate_tier_semantics ON pricing_rate;
CREATE TRIGGER trg_pricing_rate_tier_semantics
BEFORE INSERT OR UPDATE ON pricing_rate
FOR EACH ROW EXECUTE FUNCTION pricing_guard_tier_semantics();
