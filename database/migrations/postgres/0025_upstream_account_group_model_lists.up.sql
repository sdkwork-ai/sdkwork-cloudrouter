-- sdkwork:migration
-- id: 0025_upstream_account_group_model_lists
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Add model blacklist/whitelist JSONB arrays to ai_upstream_account_group
--   so a group can declare per-vendor model access rules: entries are
--   {"vendorCode": <vendor code>, "models": [<model names>]} with an empty
--   models array meaning every model of the vendor. The blacklist forbids the
--   whole group from serving matching models; the whitelist (when non-empty)
--   restricts the group to matching models only. The routing selector enforces
--   both lists; the blacklist wins over the whitelist.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE ai_upstream_account_group
    ADD COLUMN IF NOT EXISTS model_blacklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS model_whitelist JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMIT;
