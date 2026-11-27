-- sdkwork:migration
-- id: 0005_pricing_rule_schedule_holiday_backfill
-- engine: postgres
-- module: cloudrouter-billing
-- purpose: Apply the same holiday-shape backfill to operator-authored pricing
--   rules that 0004 tightened without normalizing. Rules written before 0004
--   carry the four-key schedule, so any later UPDATE fails the payload guard.
-- reversible: true
-- rollback: forward-fix
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.5.0

ALTER TABLE cloudrouter_pricing_rule DISABLE TRIGGER trg_cloudrouter_pricing_rule_validate_payload;

UPDATE cloudrouter_pricing_rule AS rule
SET schedule = jsonb_set(
        jsonb_set(
            rule.schedule,
            '{holidayDates}',
            COALESCE(rule.schedule->'holidayDates', '[]'::jsonb),
            true
        ),
        '{weeklyWindows}',
        (
            SELECT COALESCE(
                       jsonb_agg(
                           CASE
                               WHEN window_item ? 'holidayOnly' THEN window_item
                               ELSE window_item || jsonb_build_object('holidayOnly', false)
                           END
                           ORDER BY ordinal
                       ),
                       '[]'::jsonb
                   )
            FROM jsonb_array_elements(rule.schedule->'weeklyWindows')
                WITH ORDINALITY AS windows(window_item, ordinal)
        ),
        true
    )
WHERE rule.schedule IS NOT NULL
  AND (
      NOT (rule.schedule ? 'holidayDates')
      OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(rule.schedule->'weeklyWindows') AS window_item
          WHERE NOT (window_item ? 'holidayOnly')
      )
  );

ALTER TABLE cloudrouter_pricing_rule ENABLE TRIGGER trg_cloudrouter_pricing_rule_validate_payload;
