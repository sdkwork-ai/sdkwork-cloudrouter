-- sdkwork:migration
-- id: 0009_account_group_vendor_modalities
-- engine: postgres
-- module: sdkwork-clawrouter
-- purpose: Add optional model vendor binding and supported modality set to
--   ai_upstream_account_group. vendor_code is NULL for groups that are not
--   vendor-bound (apply to all vendors); modalities is a JSONB array of
--   supported modality codes (text, audio, image, video, music), defaulting
--   to an empty set. Existing rows keep vendor_code NULL and modalities '[]'.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s
-- contract_version: 0.4.0
-- rewrite: column addition only; no row backfill

ALTER TABLE ai_upstream_account_group
    ADD COLUMN IF NOT EXISTS vendor_code VARCHAR(64);

ALTER TABLE ai_upstream_account_group
    ADD COLUMN IF NOT EXISTS modalities JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_ai_upstream_account_group_vendor
    ON ai_upstream_account_group (tenant_id, organization_id, vendor_code, status, id);
