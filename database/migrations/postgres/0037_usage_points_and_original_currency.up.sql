-- sdkwork:migration
-- id: 0037_usage_points_and_original_currency
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Persist, on every billable usage fact and charge line, the
--   settlement-derived token points actually debited from the account Token
--   Bank wallet (`debit_points`) together with the pre-settlement original
--   billing money amount and its currency
--   (`original_currency_amount` / `original_currency_code`). This makes the
--   cash/currency and points tracks fully traceable and immune to later price
--   changes. Both columns are additive (expand-contract); existing rows keep
--   NULL until their next settlement or a backfill.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 60s

BEGIN;

ALTER TABLE ai_metering_usage
    ADD COLUMN IF NOT EXISTS debit_points BIGINT;

ALTER TABLE ai_metering_usage
    ADD COLUMN IF NOT EXISTS original_currency_amount NUMERIC(38, 12);

ALTER TABLE ai_metering_usage
    ADD COLUMN IF NOT EXISTS original_currency_code VARCHAR(10);

ALTER TABLE cloudrouter_charge_line
    ADD COLUMN IF NOT EXISTS debit_points BIGINT;

ALTER TABLE cloudrouter_charge_line
    ADD COLUMN IF NOT EXISTS original_currency_amount NUMERIC(38, 12);

ALTER TABLE cloudrouter_charge_line
    ADD COLUMN IF NOT EXISTS original_currency_code VARCHAR(10);

COMMIT;