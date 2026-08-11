-- sdkwork:migration
-- id: 0020_upstream_account_group_default_flag
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Add the is_default flag to ai_upstream_account_group so the admin
--   account group list can designate exactly one default group per tenant and
--   organization. A partial unique index enforces at most one default group per
--   scope while the API transaction clears the previous default when a new one
--   is set. The existing seeded standard-group becomes the default group.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE ai_upstream_account_group ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_group_default_per_tenant
    ON ai_upstream_account_group (tenant_id, organization_id)
    WHERE is_default AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET is_default = TRUE
WHERE group_code = 'standard-group' AND deleted_at IS NULL;

COMMIT;
