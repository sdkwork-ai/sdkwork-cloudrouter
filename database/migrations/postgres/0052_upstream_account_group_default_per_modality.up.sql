-- sdkwork:migration
-- id: 0052_upstream_account_group_default_per_modality
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Allow one default account group per (tenant, organization,
--   group_type) so a tenant can run dedicated pools per modality
--   (llm/image/video/audio/music) while keeping the seeded mixed group as the
--   deployment-wide fallback. Session (auth-token) traffic resolves the default
--   for the modality of the request; API keys keep their own bound group.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE ai_upstream_account_group
    ADD COLUMN IF NOT EXISTS group_type VARCHAR(32) NOT NULL DEFAULT 'mixed';
ALTER TABLE ai_upstream_account_group
    ADD COLUMN IF NOT EXISTS modalities JSONB NOT NULL DEFAULT '[]'::jsonb;

-- The pre-modality constraint allowed exactly one default group per tenant and
-- organization, which made per-modality default pools unrepresentable.
DROP INDEX IF EXISTS uk_ai_upstream_account_group_default_per_tenant;
DROP INDEX IF EXISTS uk_ai_upstream_account_group_default_per_modality;

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_group_default_per_modality
    ON ai_upstream_account_group (tenant_id, organization_id, group_type)
    WHERE is_default AND deleted_at IS NULL;

COMMIT;
