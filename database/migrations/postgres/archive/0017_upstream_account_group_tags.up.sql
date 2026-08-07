-- sdkwork:migration
-- id: 0017_upstream_account_group_tags
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Add marketing/operational tags to ai_upstream_account_group so
--   account groups can be labelled (stable, hot, recommended, promotion, new,
--   premium, high_value, official, beta, limited) and filtered by tag. The
--   tags column is a JSONB string array with a GIN index for containment
--   lookups; existing rows default to an empty tag set.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s
-- contract_version: 0.5.0
-- rewrite: column addition only; no row backfill

ALTER TABLE ai_upstream_account_group
    ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_ai_upstream_account_group_tags
    ON ai_upstream_account_group USING GIN (tags);
