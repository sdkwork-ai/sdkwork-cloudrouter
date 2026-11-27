-- sdkwork:migration
-- id: 0011_pricing_schedule_holiday_backfill
-- engine: postgres
-- module: pricing
-- purpose: Normalize schedules written before 0009 to the holiday-aware shape.
--   0009 tightened pricing_validate_rate_payload to require exactly five
--   schedule keys and six window keys, but existing pricing_rate rows still
--   carry the four-key schedule, so any later UPDATE (including the catalog
--   refresh soft-delete) fails validation. Backfill holidayDates and
--   holidayOnly in place; the new values satisfy the same trigger.
-- reversible: true
-- rollback: forward-fix
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.5.0

ALTER TABLE pricing_rate DISABLE TRIGGER trg_pricing_rate_active_book_guard;
ALTER TABLE pricing_rate DISABLE TRIGGER trg_pricing_rate_validate_payload;

UPDATE pricing_rate AS pr
SET schedule = jsonb_set(
        jsonb_set(
            pr.schedule,
            '{holidayDates}',
            COALESCE(pr.schedule->'holidayDates', '[]'::jsonb),
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
            FROM jsonb_array_elements(pr.schedule->'weeklyWindows')
                WITH ORDINALITY AS windows(window_item, ordinal)
        ),
        true
    )
WHERE pr.schedule IS NOT NULL
  AND (
      NOT (pr.schedule ? 'holidayDates')
      OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(pr.schedule->'weeklyWindows') AS window_item
          WHERE NOT (window_item ? 'holidayOnly')
      )
  );

ALTER TABLE pricing_rate ENABLE TRIGGER trg_pricing_rate_validate_payload;
ALTER TABLE pricing_rate ENABLE TRIGGER trg_pricing_rate_active_book_guard;
