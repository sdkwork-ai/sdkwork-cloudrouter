-- sdkwork:migration
-- id: 0016_upstream_account_group_type_enum
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Replace the legacy account group type values (shared/dedicated)
--   with the content-category enum mixed, llm, image, video, audio, music,
--   other. Legacy rows are normalized to 'mixed' (the general-purpose group
--   type), the column default follows the API default, and a CHECK constraint
--   now guards the enum at the database level, matching
--   routing_strategy/fallback_mode.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s
-- contract_version: 0.5.0
-- rewrite: data normalization + column default change + CHECK constraint

UPDATE ai_upstream_account_group
SET group_type = 'mixed'
WHERE group_type NOT IN ('mixed', 'llm', 'image', 'video', 'audio', 'music', 'other');

ALTER TABLE ai_upstream_account_group
    ALTER COLUMN group_type SET DEFAULT 'mixed';

ALTER TABLE ai_upstream_account_group
    ADD CONSTRAINT ck_ai_upstream_account_group_type CHECK (
        group_type IN ('mixed', 'llm', 'image', 'video', 'audio', 'music', 'other')
    );
