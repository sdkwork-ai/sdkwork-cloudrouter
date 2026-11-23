-- sdkwork:migration
-- id: 0010_pricing_rate_batch_variant
-- engine: postgres
-- module: pricing
-- purpose: Restore the pre-batch rate variant enumeration.
-- reversible: true
-- rollback: forward-fix
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.5.0

UPDATE pricing_rate SET rate_variant = 'standard' WHERE rate_variant = 'batch';

ALTER TABLE pricing_rate
    DROP CONSTRAINT IF EXISTS ck_pricing_rate_variant;

ALTER TABLE pricing_rate
    ADD CONSTRAINT ck_pricing_rate_variant
    CHECK (rate_variant IN ('standard', 'time_window'));

ALTER TABLE pricing_rate
    DROP CONSTRAINT IF EXISTS ck_pricing_rate_schedule_variant;

ALTER TABLE pricing_rate
    ADD CONSTRAINT ck_pricing_rate_schedule_variant
    CHECK (
        (rate_variant = 'standard' AND schedule IS NULL)
        OR (rate_variant = 'time_window' AND schedule IS NOT NULL)
    );
