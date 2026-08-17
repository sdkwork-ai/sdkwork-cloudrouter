-- sdkwork:migration
-- id: 0002_pricing_rule_integrity_guards
-- engine: postgres
-- module: cloudrouter-billing
-- purpose: Enforce deep condition and time-window validation for billable policy rules.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.5.0

CREATE OR REPLACE FUNCTION cloudrouter_validate_pricing_rule_payload()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    item JSONB;
    window_item JSONB;
    day_item JSONB;
    item_operator TEXT;
    item_code TEXT;
    seen_codes TEXT[] := ARRAY[]::TEXT[];
    start_time TIME;
    end_time TIME;
    end_day_offset INTEGER;
BEGIN
    IF jsonb_array_length(NEW.conditions) > 32 THEN
        RAISE EXCEPTION 'cloudrouter_pricing_rule.conditions supports at most 32 conditions';
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(NEW.conditions)
    LOOP
        IF jsonb_typeof(item) <> 'object'
            OR (SELECT COUNT(*) FROM jsonb_object_keys(item)) <> 3
            OR jsonb_typeof(item->'dimensionCode') <> 'string'
            OR BTRIM(item->>'dimensionCode') = ''
            OR LENGTH(item->>'dimensionCode') > 96
            OR jsonb_typeof(item->'operatorCode') <> 'string'
            OR NOT (item ? 'value')
            OR jsonb_typeof(item->'value') = 'null'
        THEN
            RAISE EXCEPTION 'cloudrouter_pricing_rule.conditions contains an invalid condition object';
        END IF;
        item_operator := item->>'operatorCode';
        IF item_operator NOT IN ('exists', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in') THEN
            RAISE EXCEPTION 'cloudrouter_pricing_rule.conditions contains unsupported operator %', item_operator;
        END IF;
        IF item_operator = 'exists' AND jsonb_typeof(item->'value') <> 'boolean' THEN
            RAISE EXCEPTION 'exists condition value must be boolean';
        ELSIF item_operator IN ('in', 'not_in') AND (
            jsonb_typeof(item->'value') <> 'array'
            OR jsonb_array_length(item->'value') = 0
            OR jsonb_array_length(item->'value') > 64
            OR EXISTS (
                SELECT 1 FROM jsonb_array_elements(item->'value') member
                WHERE jsonb_typeof(member) NOT IN ('string', 'number', 'boolean')
            )
        ) THEN
            RAISE EXCEPTION '% condition value must be a non-empty scalar array of at most 64 values', item_operator;
        ELSIF item_operator IN ('gt', 'gte', 'lt', 'lte')
            AND jsonb_typeof(item->'value') NOT IN ('string', 'number')
        THEN
            RAISE EXCEPTION '% condition value must be a numeric string or number', item_operator;
        ELSIF item_operator IN ('eq', 'neq')
            AND jsonb_typeof(item->'value') NOT IN ('string', 'number', 'boolean')
        THEN
            RAISE EXCEPTION '% condition value must be scalar', item_operator;
        END IF;
    END LOOP;

    IF NEW.schedule IS NULL THEN
        RETURN NEW;
    END IF;
    IF jsonb_typeof(NEW.schedule->'timeZone') <> 'string'
        OR BTRIM(NEW.schedule->>'timeZone') = ''
        OR LENGTH(NEW.schedule->>'timeZone') > 128
        OR (SELECT COUNT(*) FROM jsonb_object_keys(NEW.schedule)) <> 4
        OR jsonb_typeof(NEW.schedule->'weeklyWindows') <> 'array'
        OR jsonb_array_length(NEW.schedule->'weeklyWindows') = 0
        OR jsonb_array_length(NEW.schedule->'weeklyWindows') > 64
        OR jsonb_typeof(NEW.schedule->'includeDates') <> 'array'
        OR jsonb_typeof(NEW.schedule->'excludeDates') <> 'array'
        OR jsonb_array_length(NEW.schedule->'includeDates') > 366
        OR jsonb_array_length(NEW.schedule->'excludeDates') > 366
    THEN
        RAISE EXCEPTION 'cloudrouter_pricing_rule.schedule has an invalid timezone or array shape';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_timezone_names WHERE name = NEW.schedule->>'timeZone'
    ) THEN
        RAISE EXCEPTION 'cloudrouter_pricing_rule.schedule contains an unknown IANA timezone %', NEW.schedule->>'timeZone';
    END IF;
    seen_codes := ARRAY[]::TEXT[];
    FOR window_item IN SELECT value FROM jsonb_array_elements(NEW.schedule->'weeklyWindows')
    LOOP
        IF jsonb_typeof(window_item) <> 'object'
            OR (SELECT COUNT(*) FROM jsonb_object_keys(window_item)) <> 5
            OR jsonb_typeof(window_item->'windowCode') <> 'string'
            OR BTRIM(window_item->>'windowCode') = ''
            OR LENGTH(window_item->>'windowCode') > 96
            OR jsonb_typeof(window_item->'daysOfWeek') <> 'array'
            OR jsonb_array_length(window_item->'daysOfWeek') = 0
            OR jsonb_typeof(window_item->'startTime') <> 'string'
            OR jsonb_typeof(window_item->'endTime') <> 'string'
            OR window_item->>'startTime' !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$'
            OR window_item->>'endTime' !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$'
            OR jsonb_typeof(window_item->'endDayOffset') <> 'number'
            OR window_item->>'endDayOffset' NOT IN ('0', '1')
        THEN
            RAISE EXCEPTION 'cloudrouter_pricing_rule.schedule contains an invalid weekly window';
        END IF;
        item_code := window_item->>'windowCode';
        IF item_code = ANY(seen_codes) THEN
            RAISE EXCEPTION 'cloudrouter_pricing_rule.schedule contains duplicate windowCode %', item_code;
        END IF;
        seen_codes := array_append(seen_codes, item_code);
        IF EXISTS (
            SELECT 1 FROM jsonb_array_elements(window_item->'daysOfWeek') day
            WHERE jsonb_typeof(day) <> 'number' OR day #>> '{}' !~ '^[1-7]$'
        ) OR (
            SELECT COUNT(*) FROM jsonb_array_elements(window_item->'daysOfWeek')
        ) <> (
            SELECT COUNT(DISTINCT value) FROM jsonb_array_elements(window_item->'daysOfWeek')
        ) THEN
            RAISE EXCEPTION 'cloudrouter_pricing_rule.schedule daysOfWeek must contain unique ISO days 1..7';
        END IF;
        start_time := (window_item->>'startTime')::TIME;
        end_time := (window_item->>'endTime')::TIME;
        end_day_offset := (window_item->>'endDayOffset')::INTEGER;
        IF (end_day_offset = 0 AND start_time >= end_time)
            OR (end_day_offset = 1 AND start_time <= end_time)
        THEN
            RAISE EXCEPTION 'cloudrouter_pricing_rule.schedule window bounds do not match endDayOffset';
        END IF;
    END LOOP;
    FOR day_item IN
        SELECT value FROM jsonb_array_elements(NEW.schedule->'includeDates')
        UNION ALL
        SELECT value FROM jsonb_array_elements(NEW.schedule->'excludeDates')
    LOOP
        IF jsonb_typeof(day_item) <> 'string'
            OR (day_item #>> '{}') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        THEN
            RAISE EXCEPTION 'cloudrouter_pricing_rule.schedule dates must use YYYY-MM-DD';
        END IF;
        PERFORM (day_item #>> '{}')::DATE;
    END LOOP;
    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(NEW.schedule->'includeDates') included(value)
        JOIN jsonb_array_elements_text(NEW.schedule->'excludeDates') excluded(value)
          ON excluded.value = included.value
    ) THEN
        RAISE EXCEPTION 'cloudrouter_pricing_rule.schedule includeDates and excludeDates must be disjoint';
    END IF;
    IF (
        SELECT COUNT(*) FROM jsonb_array_elements_text(NEW.schedule->'includeDates')
    ) <> (
        SELECT COUNT(DISTINCT value) FROM jsonb_array_elements_text(NEW.schedule->'includeDates')
    ) OR (
        SELECT COUNT(*) FROM jsonb_array_elements_text(NEW.schedule->'excludeDates')
    ) <> (
        SELECT COUNT(DISTINCT value) FROM jsonb_array_elements_text(NEW.schedule->'excludeDates')
    ) THEN
        RAISE EXCEPTION 'cloudrouter_pricing_rule.schedule dates must not contain duplicates';
    END IF;
    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_cloudrouter_pricing_rule_validate_payload ON cloudrouter_pricing_rule;
CREATE TRIGGER trg_cloudrouter_pricing_rule_validate_payload
BEFORE INSERT OR UPDATE ON cloudrouter_pricing_rule
FOR EACH ROW EXECUTE FUNCTION cloudrouter_validate_pricing_rule_payload();
