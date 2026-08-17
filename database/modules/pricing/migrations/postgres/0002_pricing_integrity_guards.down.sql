-- sdkwork:migration
-- id: 0002_pricing_integrity_guards
-- engine: postgres
-- module: pricing
-- reversible: true
-- transactional: true

DROP TRIGGER IF EXISTS trg_pricing_rate_active_book_guard ON pricing_rate;
DROP TRIGGER IF EXISTS trg_pricing_price_book_active_guard ON pricing_price_book;
DROP TRIGGER IF EXISTS trg_pricing_rate_validate_payload ON pricing_rate;
DROP FUNCTION IF EXISTS pricing_guard_active_rate();
DROP FUNCTION IF EXISTS pricing_guard_active_price_book();
DROP FUNCTION IF EXISTS pricing_validate_rate_payload();
DROP FUNCTION IF EXISTS pricing_json_decimal(JSONB, TEXT);
ALTER TABLE pricing_rate DROP CONSTRAINT IF EXISTS fk_pricing_rate_book_dimensions;
DROP INDEX IF EXISTS uq_pricing_price_book_rate_dimensions;
