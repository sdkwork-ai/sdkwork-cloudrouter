-- sdkwork:migration
-- id: 0026_add_upstream_supplier_model_lists
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Add model blacklist/whitelist JSONB arrays to ai_upstream_supplier so a
--   supplier can declare per-vendor model access rules with the same field names
--   and entry structure as ai_upstream_account_group (migration 0025): entries are
--   {"vendorCode": <vendor code>, "models": [<model names>]} with an empty models
--   array meaning every model of the vendor. The blacklist forbids the supplier
--   from serving matching models; the whitelist (when non-empty) restricts the
--   supplier to matching models only.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE ai_upstream_supplier
    ADD COLUMN IF NOT EXISTS model_blacklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS model_whitelist JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMIT;
