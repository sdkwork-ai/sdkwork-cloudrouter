-- sdkwork:migration
-- id: 0053_generation_asset_delivery
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Provision the storage-center generation asset delivery configuration:
--   `storage_generation_delivery_policy` (tenant/organization/user scoped
--   decision to download generated media into SDKWork Drive, with its target
--   space/folder and vendor-expiry handling) and `storage_vendor_asset_ttl`
--   (per-vendor generated-asset lifetime used to compute the download deadline).
--
--   Ownership: these are Cloud Router-owned storage-center governance records,
--   served by `services/sdkwork-cloudrouter-router-service` behind
--   `/backend/v3/api/storage/generation_delivery_policies` and
--   `/backend/v3/api/storage/vendor_asset_ttls`. The generated media itself and
--   its Drive object bytes stay owned by the generation modules and Drive.
--
--   All statements are `IF NOT EXISTS`, so replaying against a database whose
--   baseline already carries the tables (new installations) is a no-op.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

CREATE TABLE IF NOT EXISTS storage_generation_delivery_policy (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    scope_type VARCHAR(32) NOT NULL,
    scope_id VARCHAR(128) NOT NULL,
    media_kind VARCHAR(16) NOT NULL DEFAULT 'all',
    delivery_mode VARCHAR(16) NOT NULL,
    drive_space_id VARCHAR(128),
    drive_folder_node_id VARCHAR(128),
    download_deadline_seconds INTEGER,
    vendor_expiry_action VARCHAR(16) NOT NULL DEFAULT 'keep_reference',
    delete_remote_after_download BOOLEAN NOT NULL DEFAULT TRUE,
    reason VARCHAR(512),
    request_id VARCHAR(128) NOT NULL DEFAULT '',
    CONSTRAINT ck_storage_generation_delivery_policy_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_storage_generation_delivery_policy_scope CHECK (tenant_id >= 0 AND organization_id >= 0),
    CONSTRAINT ck_storage_generation_delivery_policy_values CHECK (
        scope_type IN ('organization', 'tenant', 'user')
        AND media_kind IN ('all', 'image', 'video', 'audio')
        AND delivery_mode IN ('remote_only', 'to_drive')
        AND vendor_expiry_action IN ('delete_remote', 'fail_job', 'keep_reference')
        AND (download_deadline_seconds IS NULL OR download_deadline_seconds > 0)
        AND length(scope_id) > 0
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_storage_generation_delivery_policy_scope
    ON storage_generation_delivery_policy (tenant_id, organization_id, scope_type, scope_id, media_kind);
CREATE INDEX IF NOT EXISTS ix_storage_generation_delivery_policy_scope_status
    ON storage_generation_delivery_policy (tenant_id, organization_id, status, media_kind, id);

CREATE TABLE IF NOT EXISTS storage_vendor_asset_ttl (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    vendor_code VARCHAR(64) NOT NULL,
    media_kind VARCHAR(16) NOT NULL,
    ttl_seconds INTEGER NOT NULL,
    source VARCHAR(16) NOT NULL DEFAULT 'default',
    reason VARCHAR(512),
    request_id VARCHAR(128) NOT NULL DEFAULT '',
    CONSTRAINT ck_storage_vendor_asset_ttl_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_storage_vendor_asset_ttl_scope CHECK (tenant_id >= 0 AND organization_id >= 0),
    CONSTRAINT ck_storage_vendor_asset_ttl_values CHECK (
        media_kind IN ('image', 'video', 'audio')
        AND source IN ('default', 'operator', 'upstream')
        AND ttl_seconds > 0
        AND length(vendor_code) > 0
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_storage_vendor_asset_ttl_scope
    ON storage_vendor_asset_ttl (tenant_id, organization_id, vendor_code, media_kind);
CREATE INDEX IF NOT EXISTS ix_storage_vendor_asset_ttl_scope_status
    ON storage_vendor_asset_ttl (tenant_id, organization_id, status, media_kind, id);

COMMIT;
