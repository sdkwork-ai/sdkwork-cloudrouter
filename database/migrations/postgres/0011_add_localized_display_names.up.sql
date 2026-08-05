-- sdkwork:migration
-- id: 0011_add_localized_display_names
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Add locale-keyed display name columns (JSONB maps such as
--   {"zh-CN": "...", "en-US": "..."}) to ai_upstream_account_group,
--   ai_upstream_supplier and ai_resource. The existing single-language
--   columns remain as the fallback display name; the i18n columns carry
--   locale-specific names seeded during initialization. Existing rows keep
--   an empty object '{}'.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s
-- contract_version: 0.4.0
-- rewrite: column addition only; no row backfill

ALTER TABLE ai_upstream_account_group
    ADD COLUMN IF NOT EXISTS group_name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE ai_upstream_supplier
    ADD COLUMN IF NOT EXISTS display_name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE ai_resource
    ADD COLUMN IF NOT EXISTS display_name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb;
