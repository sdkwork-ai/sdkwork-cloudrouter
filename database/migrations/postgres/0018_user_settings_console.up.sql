-- sdkwork:migration
-- id: 0018_user_settings_console
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Materialize the console user settings tables backing the app
--   settings surface (`/app/v3/api/iam/users/settings`): per-user preference
--   rows (`iam_user_preference`) and the console webhook endpoint
--   (`integration_webhook_endpoint`). These tables were inventoried in
--   specs/database-store-migration.manifest.json (settings capability,
--   migrationOrder 29) but never shipped; the settings API returned 50001
--   because the store SQL referenced relations with no DDL anywhere.
--   Both tables use IF NOT EXISTS so fresh baseline installs (which will
--   contain the same DDL after the next baseline materialization) no-op here.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s
-- contract_version: 0.5.0

CREATE TABLE IF NOT EXISTS iam_user_preference (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL,
    owner_type INTEGER NOT NULL DEFAULT 1,
    owner_id BIGINT NOT NULL,
    data_scope INTEGER NOT NULL DEFAULT 1,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    language VARCHAR(32) NOT NULL DEFAULT '',
    timezone VARCHAR(64) NOT NULL DEFAULT '',
    notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_user_preference_scope
    ON iam_user_preference (tenant_id, organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_iam_user_preference_user_updated
    ON iam_user_preference (tenant_id, organization_id, user_id, updated_at, id);

CREATE TABLE IF NOT EXISTS integration_webhook_endpoint (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL,
    owner_type INTEGER NOT NULL DEFAULT 1,
    owner_id BIGINT NOT NULL,
    data_scope INTEGER NOT NULL DEFAULT 1,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    endpoint_code VARCHAR(128) NOT NULL,
    name VARCHAR(128) NOT NULL,
    target_url VARCHAR(1024) NOT NULL DEFAULT '',
    event_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    signing_alg VARCHAR(64) NOT NULL DEFAULT 'hmac-sha256',
    retry_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    failure_count BIGINT NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_integration_webhook_endpoint_scope_code
    ON integration_webhook_endpoint (tenant_id, organization_id, endpoint_code);
CREATE INDEX IF NOT EXISTS idx_integration_webhook_endpoint_scope_code
    ON integration_webhook_endpoint (tenant_id, organization_id, endpoint_code, id);
