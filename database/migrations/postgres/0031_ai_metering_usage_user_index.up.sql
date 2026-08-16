-- sdkwork:migration
-- id: 0031_ai_metering_usage_user_index
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Add a tenant/org/user-scoped occurred_at composite index on
--   ai_metering_usage. Console dashboard overview (summary, chart, totals,
--   modality distribution) and usage logs aggregate by user_id with a time
--   window; the existing owner/api-key indexes cannot serve those lookups.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 60s

BEGIN;

CREATE INDEX IF NOT EXISTS idx_ai_metering_usage_user_occurred
    ON ai_metering_usage (tenant_id, organization_id, user_id, occurred_at, id);

COMMIT;
