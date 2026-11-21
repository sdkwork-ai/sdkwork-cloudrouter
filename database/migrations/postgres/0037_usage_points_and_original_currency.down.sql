-- sdkwork:migration
-- id: 0037_usage_points_and_original_currency
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the settlement points and original-currency columns. Only
--   valid before any settlement backfills these columns; once written, prefer
--   a forward-fix retention/archive plan over dropping the columns.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 60s

BEGIN;

ALTER TABLE ai_metering_usage
    DROP COLUMN IF EXISTS original_currency_code;

ALTER TABLE ai_metering_usage
    DROP COLUMN IF EXISTS original_currency_amount;

ALTER TABLE ai_metering_usage
    DROP COLUMN IF EXISTS debit_points;

ALTER TABLE cloudrouter_charge_line
    DROP COLUMN IF EXISTS original_currency_code;

ALTER TABLE cloudrouter_charge_line
    DROP COLUMN IF EXISTS original_currency_amount;

ALTER TABLE cloudrouter_charge_line
    DROP COLUMN IF EXISTS debit_points;

COMMIT;