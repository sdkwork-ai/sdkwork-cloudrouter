-- sdkwork:migration
-- id: 0010_pricing_rate_batch_variant
-- engine: postgres
-- module: pricing
-- purpose: Allow the vendor batch/offline rate variant in pricing_rate. Batch
--   rows carry no schedule and are selected only by their explicit
--   tier_code=batch condition, never by an interactive request.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.5.0

ALTER TABLE pricing_rate
    DROP CONSTRAINT IF EXISTS ck_pricing_rate_variant;

ALTER TABLE pricing_rate
    ADD CONSTRAINT ck_pricing_rate_variant
    CHECK (rate_variant IN ('standard', 'time_window', 'batch'));

ALTER TABLE pricing_rate
    DROP CONSTRAINT IF EXISTS ck_pricing_rate_schedule_variant;

ALTER TABLE pricing_rate
    ADD CONSTRAINT ck_pricing_rate_schedule_variant
    CHECK (
        (rate_variant IN ('standard', 'batch') AND schedule IS NULL)
        OR (rate_variant = 'time_window' AND schedule IS NOT NULL)
    );
