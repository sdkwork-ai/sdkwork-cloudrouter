-- sdkwork:migration
-- id: 0028_add_upstream_supplier_default_base_url
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Add a default_base_url column to ai_upstream_supplier so a supplier
--   can declare a fallback Base URL used when an invocation resource (e.g. image,
--   video, audio APIs) does not match any configured LLM API protocol endpoint.
--   Nullable: when absent, routing falls back to the protocol endpoint Base URL.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE ai_upstream_supplier
    ADD COLUMN IF NOT EXISTS default_base_url VARCHAR(2048);

COMMIT;
