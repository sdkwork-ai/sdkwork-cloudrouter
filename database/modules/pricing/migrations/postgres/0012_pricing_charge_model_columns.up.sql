success

-- sdkwork:migration
-- id: 0012_pricing_charge_model_columns
-- engine: postgres
-- module: pricing
-- purpose: Give every rate row an explicit charge-model declaration.
--
--   The reusable pricing catalog used to infer the charge model from the
--   meter code alone: the billing strategies composed their behaviour from
--   `calculation_mode` plus a hard-coded meter-to-strategy table inside the
--   runtime. A catalog author could therefore not say what a rate IS — only
--   what it costs — and the same meter could not express an included quantity,
--   a period-aggregated meter, or a rate that is billed before the usage it
--   describes is known.
--
--   The four columns close that gap and mirror the model the sibling
--   `sdkwork-models` catalog already publishes per price row
--   (`ai_model_pricing.price_item_type`, `metering_mode`, `quantity_source`,
--   `rounding_mode`), so the import and the runtime description stop diverging.
--
--   Every column carries a default that reproduces the behaviour of the rows
--   already stored, so the backfill is exact rather than approximate.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.6.0

ALTER TABLE pricing_rate
    ADD COLUMN IF NOT EXISTS price_item_type VARCHAR(16) NOT NULL DEFAULT 'usage',
    ADD COLUMN IF NOT EXISTS metering_mode VARCHAR(16) NOT NULL DEFAULT 'per_quantity',
    ADD COLUMN IF NOT EXISTS quantity_source VARCHAR(24) NOT NULL DEFAULT 'provider_usage',
    ADD COLUMN IF NOT EXISTS rounding_mode VARCHAR(16) NOT NULL DEFAULT 'half_up',
    ADD COLUMN IF NOT EXISTS included_quantity NUMERIC(38, 12) NOT NULL DEFAULT 0;

ALTER TABLE pricing_rate
    DROP CONSTRAINT IF EXISTS ck_pricing_rate_price_item_type;
ALTER TABLE pricing_rate
    ADD CONSTRAINT ck_pricing_rate_price_item_type
    CHECK (price_item_type IN ('usage', 'recurring', 'one_time', 'adjustment'));

ALTER TABLE pricing_rate
    DROP CONSTRAINT IF EXISTS ck_pricing_rate_metering_mode;
ALTER TABLE pricing_rate
    ADD CONSTRAINT ck_pricing_rate_metering_mode
    CHECK (metering_mode IN ('flat', 'per_quantity', 'graduated', 'volume', 'formula'));

ALTER TABLE pricing_rate
    DROP CONSTRAINT IF EXISTS ck_pricing_rate_quantity_source;
ALTER TABLE pricing_rate
    ADD CONSTRAINT ck_pricing_rate_quantity_source
    CHECK (quantity_source IN ('request_invariant', 'request_body', 'provider_usage', 'period_meter'));

ALTER TABLE pricing_rate
    DROP CONSTRAINT IF EXISTS ck_pricing_rate_rounding_mode;
ALTER TABLE pricing_rate
    ADD CONSTRAINT ck_pricing_rate_rounding_mode
    CHECK (rounding_mode IN ('half_up', 'half_even', 'up', 'down'));

ALTER TABLE pricing_rate
    DROP CONSTRAINT IF EXISTS ck_pricing_rate_included_quantity;
ALTER TABLE pricing_rate
    ADD CONSTRAINT ck_pricing_rate_included_quantity
    CHECK (included_quantity >= 0);

-- The declared charge model must agree with the payload that is actually
-- stored. Without this, a row could claim `graduated` and carry no tiers (the
-- runtime would then fail at rating time instead of at import time) or claim
-- `per_quantity` while shipping tiers nothing would ever read.
ALTER TABLE pricing_rate
    DROP CONSTRAINT IF EXISTS ck_pricing_rate_metering_mode_payload;
ALTER TABLE pricing_rate
    ADD CONSTRAINT ck_pricing_rate_metering_mode_payload
    CHECK (
        (metering_mode = 'flat' AND unit_size = 1)
        OR (metering_mode IN ('per_quantity') AND jsonb_array_length(tiers) = 0 AND formula IS NULL)
        OR (metering_mode IN ('graduated', 'volume') AND jsonb_array_length(tiers) > 0 AND formula IS NULL)
        OR (metering_mode = 'formula' AND formula IS NOT NULL AND jsonb_array_length(tiers) = 0)
    );

-- `calculation_mode` predates `metering_mode` and stays the projection the
-- runtime already reads. Keeping the two in lockstep prevents a row whose two
-- declarations disagree from ever being written.
CREATE OR REPLACE FUNCTION pricing_sync_calculation_mode()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.metering_mode IS DISTINCT FROM OLD.metering_mode
        OR TG_OP = 'INSERT'
    THEN
        NEW.calculation_mode := NEW.metering_mode;
    ELSIF NEW.calculation_mode IS DISTINCT FROM OLD.calculation_mode
        AND NEW.calculation_mode IS DISTINCT FROM NEW.metering_mode
    THEN
        RAISE EXCEPTION
            'pricing_rate.calculation_mode (%) must equal metering_mode (%)',
            NEW.calculation_mode, NEW.metering_mode;
    END IF;
    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_pricing_rate_sync_calculation_mode ON pricing_rate;
CREATE TRIGGER trg_pricing_rate_sync_calculation_mode
BEFORE INSERT OR UPDATE ON pricing_rate
FOR EACH ROW EXECUTE FUNCTION pricing_sync_calculation_mode();

-- Backfill: existing rows describe per-unit charges whose quantity arrives with
-- the provider usage report, which is exactly the default pair above. Rows
-- that already carry tiers or a formula are re-declared accordingly so the new
-- payload constraint holds for historical data too.
UPDATE pricing_rate
SET metering_mode = CASE
        WHEN formula IS NOT NULL THEN 'formula'
        WHEN jsonb_array_length(tiers) > 0 THEN CASE
            WHEN calculation_mode = 'volume' THEN 'volume'
            ELSE 'graduated'
        END
        ELSE CASE
            WHEN calculation_mode = 'flat' THEN 'flat'
            ELSE 'per_quantity'
        END
    END
WHERE metering_mode IS DISTINCT FROM CASE
        WHEN formula IS NOT NULL THEN 'formula'
        WHEN jsonb_array_length(tiers) > 0 THEN CASE
            WHEN calculation_mode = 'volume' THEN 'volume'
            ELSE 'graduated'
        END
        ELSE CASE
            WHEN calculation_mode = 'flat' THEN 'flat'
            ELSE 'per_quantity'
        END
    END;

UPDATE pricing_rate
SET calculation_mode = metering_mode
WHERE calculation_mode IS DISTINCT FROM metering_mode;

CREATE INDEX IF NOT EXISTS idx_pricing_rate_charge_model
    ON pricing_rate (tenant_id, organization_id, price_item_type, quantity_source, status, id);
