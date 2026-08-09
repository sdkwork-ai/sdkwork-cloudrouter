-- sdkwork:migration
-- id: 0019_organization_id_not_null_legacy_tables
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Enforce organization_id NOT NULL DEFAULT on tables created by
--   earlier migrations that predate the standard column contract.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

UPDATE ai_upstream_account_resource SET organization_id = '0' WHERE organization_id IS NULL;
ALTER TABLE ai_upstream_account_resource ALTER COLUMN organization_id SET DEFAULT '0';
ALTER TABLE ai_upstream_account_resource ALTER COLUMN organization_id SET NOT NULL;

UPDATE iam_user_preference SET organization_id = '0' WHERE organization_id IS NULL;
ALTER TABLE iam_user_preference ALTER COLUMN organization_id SET DEFAULT '0';
ALTER TABLE iam_user_preference ALTER COLUMN organization_id SET NOT NULL;

UPDATE integration_webhook_endpoint SET organization_id = '0' WHERE organization_id IS NULL;
ALTER TABLE integration_webhook_endpoint ALTER COLUMN organization_id SET DEFAULT '0';
ALTER TABLE integration_webhook_endpoint ALTER COLUMN organization_id SET NOT NULL;

COMMIT;
