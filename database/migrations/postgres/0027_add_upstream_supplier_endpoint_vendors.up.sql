-- sdkwork:migration
-- id: 0027_add_upstream_supplier_endpoint_vendors
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Add a vendor_codes JSONB array to ai_upstream_supplier_endpoint so a
--   relay station (endpoint) can serve multiple official vendors at once. Each
--   entry is a vendor code from the AI resource catalog (resourceType "vendor"),
--   e.g. ["openai", "anthropic", "gemini"]. At least one official vendor is
--   required for every endpoint (validated by the service layer).
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE ai_upstream_supplier_endpoint
    ADD COLUMN IF NOT EXISTS vendor_codes JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMIT;
