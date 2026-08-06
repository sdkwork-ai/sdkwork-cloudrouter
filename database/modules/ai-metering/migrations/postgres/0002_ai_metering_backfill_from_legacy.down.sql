-- sdkwork:migration
-- id: 0002_ai_metering_backfill_from_legacy
-- engine: postgres
-- module: ai-metering
-- purpose: The backfill is forward-only: ai_metering_* rows are the runtime
--          authority after the rename, and legacy ai_usage/ai_request_trace
--          rows are intentionally NOT re-created (they remain in the root
--          baseline as legacy-compat). No-op down migration.

SELECT 1;
