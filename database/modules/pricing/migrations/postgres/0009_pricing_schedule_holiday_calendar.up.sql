-- sdkwork:migration
-- id: 0009_pricing_schedule_holiday_calendar
-- engine: postgres
-- module: pricing
-- purpose: Extend the closed rate schedule with holiday-only windows and a
--   statutory holiday calendar so time-window pricing can express "weekends
--   and public holidays are off-peak" without enumerating every hour as a
--   separate weekly window.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.5.0

CREATE OR REPLACE FUNCTION pricing_validate_rate_payload()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    item JSONB;
    window_item JSONB;
    day_item JSONB;
    item_count INTEGER;
    item_index INTEGER := 0;
    item_code TEXT;
    item_operator TEXT;
    seen_codes TEXT[] := ARRAY[]::TEXT[];
    lower_bound NUMERIC;
    upper_bound NUMERIC;
    previous_upper NUMERIC;
    unit_size_value NUMERIC;
    unit_price_value NUMERIC;
    flat_amount_value NUMERIC;
    minimum_units NUMERIC;
    maximum_units NUMERIC;
    coefficient NUMERIC;
    start_time TIME;
    end_time TIME;
    end_day_offset INTEGER;
BEGIN
    IF jsonb_array_length(NEW.conditions) > 32 THEN
        RAISE EXCEPTION 'pricing_rate.conditions supports at most 32 conditions';
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
            RAISE EXCEPTION 'pricing_rate.conditions contains an invalid condition object';
        END IF;
        item_operator := item->>'operatorCode';
        IF item_operator NOT IN ('exists', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in') THEN
            RAISE EXCEPTION 'pricing_rate.conditions contains unsupported operator %', item_operator;
        END IF;
        IF item_operator = 'exists' AND jsonb_typeof(item->'value') <> 'boolean' THEN
            RAISE EXCEPTION 'exists condition value must be boolean';
        ELSIF item_operator IN ('gt', 'gte', 'lt', 'lte') THEN
            PERFORM pricing_json_decimal(item->'value', 'condition.value');
        ELSIF item_operator IN ('in', 'not_in')
            AND (jsonb_typeof(item->'value') <> 'array' OR jsonb_array_length(item->'value') = 0)
        THEN
            RAISE EXCEPTION '% condition value must be a non-empty array', item_operator;
        ELSIF item_operator IN ('in', 'not_in')
            AND (
                jsonb_array_length(item->'value') > 64
                OR EXISTS (
                    SELECT 1 FROM jsonb_array_elements(item->'value') member
                    WHERE jsonb_typeof(member) NOT IN ('string', 'number', 'boolean')
                )
            )
        THEN
            RAISE EXCEPTION '% condition value must contain at most 64 scalar values', item_operator;
        ELSIF item_operator IN ('eq', 'neq')
            AND jsonb_typeof(item->'value') NOT IN ('string', 'number', 'boolean')
        THEN
            RAISE EXCEPTION '% condition value must be scalar', item_operator;
        END IF;
    END LOOP;

    item_count := jsonb_array_length(NEW.tiers);
    IF item_count > 128 THEN
        RAISE EXCEPTION 'pricing_rate.tiers supports at most 128 tiers';
    END IF;
    item_index := 0;
    previous_upper := NULL;
    seen_codes := ARRAY[]::TEXT[];
    FOR item IN SELECT value FROM jsonb_array_elements(NEW.tiers)
    LOOP
        IF jsonb_typeof(item) <> 'object'
            OR jsonb_typeof(item->'tierCode') <> 'string'
            OR BTRIM(item->>'tierCode') = ''
            OR LENGTH(item->>'tierCode') > 96
        THEN
            RAISE EXCEPTION 'pricing_rate.tiers contains an invalid tier object';
        END IF;
        item_code := item->>'tierCode';
        IF item_code = ANY(seen_codes) THEN
            RAISE EXCEPTION 'pricing_rate.tiers contains duplicate tierCode %', item_code;
        END IF;
        seen_codes := array_append(seen_codes, item_code);
        lower_bound := pricing_json_decimal(item->'lowerBound', 'tier.lowerBound');
        unit_size_value := pricing_json_decimal(item->'unitSize', 'tier.unitSize');
        unit_price_value := pricing_json_decimal(item->'unitPrice', 'tier.unitPrice');
        flat_amount_value := pricing_json_decimal(item->'flatAmount', 'tier.flatAmount');
        upper_bound := CASE
            WHEN NOT (item ? 'upperBound') OR jsonb_typeof(item->'upperBound') = 'null' THEN NULL
            ELSE pricing_json_decimal(item->'upperBound', 'tier.upperBound')
        END;
        IF lower_bound < 0 OR unit_size_value <= 0
            OR unit_price_value < 0 OR flat_amount_value < 0
        THEN
            RAISE EXCEPTION 'pricing_rate.tiers contains invalid numeric bounds or prices';
        END IF;
        IF item_index = 0 AND lower_bound <> 0 THEN
            RAISE EXCEPTION 'pricing_rate.tiers must start at zero';
        ELSIF item_index > 0 AND lower_bound IS DISTINCT FROM previous_upper THEN
            RAISE EXCEPTION 'pricing_rate.tiers must be contiguous';
        END IF;
        IF upper_bound IS NOT NULL AND upper_bound <= lower_bound THEN
            RAISE EXCEPTION 'pricing_rate tier upperBound must exceed lowerBound';
        END IF;
        IF upper_bound IS NULL AND item_index <> item_count - 1 THEN
            RAISE EXCEPTION 'only the final pricing_rate tier may be unbounded';
        END IF;
        IF item_index = item_count - 1 AND upper_bound IS NOT NULL THEN
            RAISE EXCEPTION 'the final pricing_rate tier must be unbounded';
        END IF;
        previous_upper := upper_bound;
        item_index := item_index + 1;
    END LOOP;

    IF NEW.formula IS NOT NULL THEN
        IF jsonb_typeof(NEW.formula->'formulaCode') <> 'string'
            OR BTRIM(NEW.formula->>'formulaCode') = ''
            OR jsonb_typeof(NEW.formula->'formulaVersion') <> 'string'
            OR BTRIM(NEW.formula->>'formulaVersion') = ''
            OR jsonb_typeof(NEW.formula->'terms') <> 'array'
            OR jsonb_array_length(NEW.formula->'terms') > 32
        THEN
            RAISE EXCEPTION 'pricing_rate.formula has an invalid identity or terms array';
        END IF;
        IF pricing_json_decimal(NEW.formula->'constantUnits', 'formula.constantUnits') < 0
            OR pricing_json_decimal(NEW.formula->'quantityCoefficient', 'formula.quantityCoefficient') < 0
        THEN
            RAISE EXCEPTION 'pricing_rate.formula coefficients must be non-negative';
        END IF;
        minimum_units := CASE
            WHEN NOT (NEW.formula ? 'minimumUnits') OR jsonb_typeof(NEW.formula->'minimumUnits') = 'null' THEN NULL
            ELSE pricing_json_decimal(NEW.formula->'minimumUnits', 'formula.minimumUnits')
        END;
        maximum_units := CASE
            WHEN NOT (NEW.formula ? 'maximumUnits') OR jsonb_typeof(NEW.formula->'maximumUnits') = 'null' THEN NULL
            ELSE pricing_json_decimal(NEW.formula->'maximumUnits', 'formula.maximumUnits')
        END;
        IF minimum_units < 0 OR maximum_units < 0
            OR (minimum_units IS NOT NULL AND maximum_units IS NOT NULL AND minimum_units > maximum_units)
        THEN
            RAISE EXCEPTION 'pricing_rate.formula has invalid minimum/maximum units';
        END IF;
        seen_codes := ARRAY[]::TEXT[];
        FOR item IN SELECT value FROM jsonb_array_elements(NEW.formula->'terms')
        LOOP
            IF jsonb_typeof(item) <> 'object'
                OR jsonb_typeof(item->'termCode') <> 'string'
                OR BTRIM(item->>'termCode') = ''
                OR jsonb_typeof(item->'dimensionCode') <> 'string'
                OR BTRIM(item->>'dimensionCode') = ''
            THEN
                RAISE EXCEPTION 'pricing_rate.formula contains an invalid term';
            END IF;
            item_code := item->>'termCode';
            IF item_code = ANY(seen_codes) THEN
                RAISE EXCEPTION 'pricing_rate.formula contains duplicate termCode %', item_code;
            END IF;
            seen_codes := array_append(seen_codes, item_code);
            coefficient := pricing_json_decimal(item->'coefficient', 'formula.term.coefficient');
            IF coefficient < 0 THEN
                RAISE EXCEPTION 'pricing_rate.formula term coefficients must be non-negative';
            END IF;
        END LOOP;
    END IF;

    IF NEW.schedule IS NOT NULL THEN
        IF jsonb_typeof(NEW.schedule->'timeZone') <> 'string'
            OR BTRIM(NEW.schedule->>'timeZone') = ''
            OR LENGTH(NEW.schedule->>'timeZone') > 128
            OR (SELECT COUNT(*) FROM jsonb_object_keys(NEW.schedule)) <> 5
            OR jsonb_typeof(NEW.schedule->'weeklyWindows') <> 'array'
            OR jsonb_array_length(NEW.schedule->'weeklyWindows') = 0
            OR jsonb_array_length(NEW.schedule->'weeklyWindows') > 64
            OR jsonb_typeof(NEW.schedule->'includeDates') <> 'array'
            OR jsonb_typeof(NEW.schedule->'excludeDates') <> 'array'
            OR jsonb_typeof(NEW.schedule->'holidayDates') <> 'array'
            OR jsonb_array_length(NEW.schedule->'includeDates') > 366
            OR jsonb_array_length(NEW.schedule->'excludeDates') > 366
            OR jsonb_array_length(NEW.schedule->'holidayDates') > 366
        THEN
            RAISE EXCEPTION 'pricing_rate.schedule has an invalid timezone or array shape';
        END IF;
        IF NEW.schedule->>'timeZone' <> 'UTC'
            AND NEW.schedule->>'timeZone' !~ '^[A-Za-z_]+/[A-Za-z0-9_+.-]+(?:/[A-Za-z0-9_+.-]+)?$'
        THEN
            RAISE EXCEPTION 'pricing_rate.schedule timeZone must be an IANA timezone name';
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_timezone_names
            WHERE name = NEW.schedule->>'timeZone'
        ) THEN
            RAISE EXCEPTION 'pricing_rate.schedule contains an unknown IANA timezone %', NEW.schedule->>'timeZone';
        END IF;
        seen_codes := ARRAY[]::TEXT[];
        FOR window_item IN SELECT value FROM jsonb_array_elements(NEW.schedule->'weeklyWindows')
        LOOP
            IF jsonb_typeof(window_item) <> 'object'
                OR (SELECT COUNT(*) FROM jsonb_object_keys(window_item)) <> 6
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
                OR (window_item ? 'holidayOnly' AND jsonb_typeof(window_item->'holidayOnly') <> 'boolean')
            THEN
                RAISE EXCEPTION 'pricing_rate.schedule contains an invalid weekly window';
            END IF;
            item_code := window_item->>'windowCode';
            IF item_code = ANY(seen_codes) THEN
                RAISE EXCEPTION 'pricing_rate.schedule contains duplicate windowCode %', item_code;
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
                RAISE EXCEPTION 'pricing_rate.schedule daysOfWeek must contain unique ISO days 1..7';
            END IF;
            start_time := (window_item->>'startTime')::TIME;
            end_time := (window_item->>'endTime')::TIME;
            IF window_item->>'endDayOffset' NOT IN ('0', '1') THEN
                RAISE EXCEPTION 'pricing_rate.schedule endDayOffset must be zero or one';
            END IF;
            end_day_offset := (window_item->>'endDayOffset')::INTEGER;
            IF end_day_offset NOT IN (0, 1)
                OR (end_day_offset = 0 AND start_time >= end_time)
                OR (end_day_offset = 1 AND start_time <= end_time)
            THEN
                RAISE EXCEPTION 'pricing_rate.schedule window bounds do not match endDayOffset';
            END IF;
            IF COALESCE((window_item->>'holidayOnly')::BOOLEAN, FALSE)
                AND (start_time <> '00:00:00' OR end_time <> '23:59:59' OR end_day_offset <> 0)
            THEN
                RAISE EXCEPTION 'pricing_rate.schedule holidayOnly window must cover the whole day';
            END IF;
        END LOOP;
        FOR day_item IN
            SELECT value FROM jsonb_array_elements(NEW.schedule->'includeDates')
            UNION ALL
            SELECT value FROM jsonb_array_elements(NEW.schedule->'excludeDates')
            UNION ALL
            SELECT value FROM jsonb_array_elements(NEW.schedule->'holidayDates')
        LOOP
            IF jsonb_typeof(day_item) <> 'string'
                OR (day_item #>> '{}') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
            THEN
                RAISE EXCEPTION 'pricing_rate.schedule dates must use YYYY-MM-DD';
            END IF;
            PERFORM (day_item #>> '{}')::DATE;
        END LOOP;
        IF EXISTS (
            SELECT 1
            FROM (
                SELECT value, 'include' AS bucket FROM jsonb_array_elements_text(NEW.schedule->'includeDates')
                UNION ALL
                SELECT value, 'exclude' AS bucket FROM jsonb_array_elements_text(NEW.schedule->'excludeDates')
                UNION ALL
                SELECT value, 'holiday' AS bucket FROM jsonb_array_elements_text(NEW.schedule->'holidayDates')
            ) dates
            GROUP BY value HAVING COUNT(DISTINCT bucket) > 1
        ) THEN
            RAISE EXCEPTION 'pricing_rate.schedule includeDates, excludeDates and holidayDates must be pairwise disjoint';
        END IF;
        IF (
            SELECT COUNT(*) FROM jsonb_array_elements_text(NEW.schedule->'includeDates')
        ) <> (
            SELECT COUNT(DISTINCT value) FROM jsonb_array_elements_text(NEW.schedule->'includeDates')
        ) OR (
            SELECT COUNT(*) FROM jsonb_array_elements_text(NEW.schedule->'excludeDates')
        ) <> (
            SELECT COUNT(DISTINCT value) FROM jsonb_array_elements_text(NEW.schedule->'excludeDates')
        ) OR (
            SELECT COUNT(*) FROM jsonb_array_elements_text(NEW.schedule->'holidayDates')
        ) <> (
            SELECT COUNT(DISTINCT value) FROM jsonb_array_elements_text(NEW.schedule->'holidayDates')
        ) THEN
            RAISE EXCEPTION 'pricing_rate.schedule dates must not contain duplicates';
        END IF;
    END IF;
    RETURN NEW;
END
$$;
