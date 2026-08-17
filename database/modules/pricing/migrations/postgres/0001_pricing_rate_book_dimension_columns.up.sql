-- sdkwork:migration
-- id: 0001_pricing_rate_book_dimension_columns
-- engine: postgres
-- module: pricing
-- purpose: Add pricing rate/book dimension columns required by integrity guards
--   when upgrading schemas created before composable pricing dimension keys.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.5.0

ALTER TABLE pricing_price_book
    ADD COLUMN IF NOT EXISTS vendor_code VARCHAR(64);

ALTER TABLE pricing_price_book
    ADD COLUMN IF NOT EXISTS region_code VARCHAR(64);

UPDATE pricing_price_book
SET vendor_code = COALESCE(NULLIF(BTRIM(vendor_code), ''), 'unknown'),
    region_code = COALESCE(NULLIF(BTRIM(region_code), ''), 'global')
WHERE vendor_code IS NULL
   OR region_code IS NULL
   OR BTRIM(vendor_code) = ''
   OR BTRIM(region_code) = '';

ALTER TABLE pricing_price_book
    ALTER COLUMN vendor_code SET DEFAULT 'unknown';
ALTER TABLE pricing_price_book
    ALTER COLUMN vendor_code SET NOT NULL;
ALTER TABLE pricing_price_book
    ALTER COLUMN region_code SET DEFAULT 'global';
ALTER TABLE pricing_price_book
    ALTER COLUMN region_code SET NOT NULL;

ALTER TABLE pricing_rate
    ADD COLUMN IF NOT EXISTS vendor_code VARCHAR(64);

ALTER TABLE pricing_rate
    ADD COLUMN IF NOT EXISTS region_code VARCHAR(64);

ALTER TABLE pricing_rate
    ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3);

UPDATE pricing_rate AS rate
SET vendor_code = COALESCE(
        NULLIF(BTRIM(rate.vendor_code), ''),
        NULLIF(BTRIM(book.vendor_code), ''),
        'unknown'
    ),
    region_code = COALESCE(
        NULLIF(BTRIM(rate.region_code), ''),
        NULLIF(BTRIM(book.region_code), ''),
        'global'
    ),
    currency_code = COALESCE(
        NULLIF(BTRIM(rate.currency_code), ''),
        NULLIF(BTRIM(book.currency_code), ''),
        'USD'
    )
FROM pricing_price_book AS book
WHERE book.tenant_id = rate.tenant_id
  AND book.organization_id = rate.organization_id
  AND book.id = rate.price_book_id
  AND (
      rate.vendor_code IS NULL
      OR rate.region_code IS NULL
      OR rate.currency_code IS NULL
      OR BTRIM(rate.vendor_code) = ''
      OR BTRIM(rate.region_code) = ''
      OR BTRIM(rate.currency_code) = ''
  );

UPDATE pricing_rate
SET vendor_code = COALESCE(NULLIF(BTRIM(vendor_code), ''), 'unknown'),
    region_code = COALESCE(NULLIF(BTRIM(region_code), ''), 'global'),
    currency_code = COALESCE(NULLIF(BTRIM(currency_code), ''), 'USD')
WHERE vendor_code IS NULL
   OR region_code IS NULL
   OR currency_code IS NULL
   OR BTRIM(vendor_code) = ''
   OR BTRIM(region_code) = ''
   OR BTRIM(currency_code) = '';

ALTER TABLE pricing_rate
    ALTER COLUMN vendor_code SET DEFAULT 'unknown';
ALTER TABLE pricing_rate
    ALTER COLUMN vendor_code SET NOT NULL;
ALTER TABLE pricing_rate
    ALTER COLUMN region_code SET DEFAULT 'global';
ALTER TABLE pricing_rate
    ALTER COLUMN region_code SET NOT NULL;
ALTER TABLE pricing_rate
    ALTER COLUMN currency_code SET DEFAULT 'USD';
ALTER TABLE pricing_rate
    ALTER COLUMN currency_code SET NOT NULL;
