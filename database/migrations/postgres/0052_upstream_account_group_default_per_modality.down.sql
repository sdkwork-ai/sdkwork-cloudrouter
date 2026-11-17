-- sdkwork:migration
-- id: 0052_upstream_account_group_default_per_modality
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the per-modality default account group constraint to the
--   single "one default per tenant and organization" constraint.
-- reversible: true
-- transactional: true

BEGIN;

DROP INDEX IF EXISTS uk_ai_upstream_account_group_default_per_modality;

-- Collapse per-modality defaults back to one default per (tenant, organization)
-- before recreating the stricter unique index, otherwise the index creation
-- fails on the first tenant that configured more than one modality default.
UPDATE ai_upstream_account_group AS g
SET is_default = FALSE,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE g.is_default
  AND g.deleted_at IS NULL
  AND g.id <> COALESCE((
      SELECT MIN(d.id)
      FROM ai_upstream_account_group AS d
      WHERE d.tenant_id = g.tenant_id
        AND d.organization_id = g.organization_id
        AND d.is_default
        AND d.deleted_at IS NULL
  ), g.id);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_group_default_per_tenant
    ON ai_upstream_account_group (tenant_id, organization_id)
    WHERE is_default AND deleted_at IS NULL;

COMMIT;
