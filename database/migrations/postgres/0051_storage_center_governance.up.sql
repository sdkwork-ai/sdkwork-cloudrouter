-- sdkwork:migration
-- id: 0051_storage_center_governance
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Provision the storage-center governance tables that
--   `services/sdkwork-cloudrouter-router-service` already reads and writes.
--
--   The authoring defect: `admin_storage.rs` / `admin_storage_store.rs` serve the
--   whole `/backend/v3/api/storage/*` surface (default buckets, quota policies,
--   usage counters, reconciliation runs, garbage-collection jobs), and their SQL
--   referenced
--
--     * `storage_default_bucket_policy`
--     * `storage_quota_policy`
--     * `storage_usage_counter`
--     * `storage_reconciliation_run`
--     * `storage_gc_job`
--     * `storage_provider` / `storage_bucket` (the bucket reference the default
--       bucket policy resolves through)
--
--   but no `CREATE TABLE` for any of them existed in this module's baseline or
--   migrations. Every request therefore failed at prepare time with
--   `relation "..." does not exist`, and the console surfaced HTTP 500
--   (`errors.result.50001`) on all five governance list endpoints.
--
--   Ownership: these are Cloud Router-owned governance records. The object
--   provider *account* catalog stays IAM-owned (`iam_provider_account`) and the
--   object bytes stay Drive-owned (`dr_drive_storage_provider`); the two storage
--   catalog tables here only carry the bucket reference a default-bucket policy
--   joins through, seeded with the built-in Tencent Cloud COS default.
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

CREATE TABLE IF NOT EXISTS storage_provider (
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
    name VARCHAR(128) NOT NULL DEFAULT '',
    supplier_code VARCHAR(64) NOT NULL,
    provider_type VARCHAR(64) NOT NULL,
    endpoint_url VARCHAR(512) NOT NULL DEFAULT '',
    region VARCHAR(64) NOT NULL DEFAULT '',
    CONSTRAINT ck_storage_provider_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_storage_provider_scope CHECK (tenant_id >= 0 AND organization_id >= 0),
    CONSTRAINT ck_storage_provider_values CHECK (length(supplier_code) > 0 AND length(provider_type) > 0 AND length(endpoint_url) <= 512 AND length(region) <= 64)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_storage_provider_scope_code ON storage_provider (tenant_id, organization_id, supplier_code);
CREATE INDEX IF NOT EXISTS ix_storage_provider_scope_status ON storage_provider (tenant_id, organization_id, status, supplier_code);

CREATE TABLE IF NOT EXISTS storage_bucket (
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
    provider_id BIGINT NOT NULL,
    bucket_name VARCHAR(128) NOT NULL,
    bucket_region VARCHAR(64) NOT NULL DEFAULT '',
    logical_scope VARCHAR(64) NOT NULL,
    CONSTRAINT ck_storage_bucket_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_storage_bucket_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND provider_id > 0),
    CONSTRAINT ck_storage_bucket_values CHECK (length(bucket_name) > 0 AND length(logical_scope) > 0 AND length(bucket_region) <= 64)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_storage_bucket_scope_name ON storage_bucket (tenant_id, organization_id, provider_id, bucket_name);
CREATE INDEX IF NOT EXISTS ix_storage_bucket_scope_scope ON storage_bucket (tenant_id, organization_id, logical_scope, bucket_name);

CREATE TABLE IF NOT EXISTS storage_default_bucket_policy (
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
    logical_scope VARCHAR(64) NOT NULL,
    bucket_id BIGINT NOT NULL,
    bucket_logical_scope VARCHAR(64) NOT NULL,
    updated_by BIGINT NOT NULL DEFAULT 0,
    reason VARCHAR(512) NOT NULL DEFAULT '',
    request_id VARCHAR(128) NOT NULL DEFAULT '',
    CONSTRAINT ck_storage_default_bucket_policy_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_storage_default_bucket_scope CHECK (tenant_id >= 0 AND organization_id >= 0),
    CONSTRAINT ck_storage_default_bucket_values CHECK (length(logical_scope) > 0 AND length(bucket_logical_scope) > 0 AND bucket_id > 0 AND length(reason) <= 512)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_storage_default_bucket_scope ON storage_default_bucket_policy (tenant_id, organization_id, logical_scope);
CREATE INDEX IF NOT EXISTS ix_storage_default_bucket_scope_updated ON storage_default_bucket_policy (tenant_id, organization_id, status, updated_at);

CREATE TABLE IF NOT EXISTS storage_quota_policy (
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
    quota_limit_bytes BIGINT NOT NULL,
    single_file_limit_bytes BIGINT,
    enforcement VARCHAR(16) NOT NULL DEFAULT 'hard',
    idempotency_key VARCHAR(128) NOT NULL,
    request_id VARCHAR(128) NOT NULL DEFAULT '',
    CONSTRAINT ck_storage_quota_policy_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_storage_quota_policy_scope CHECK (tenant_id >= 0 AND organization_id >= 0),
    CONSTRAINT ck_storage_quota_policy_values CHECK (quota_limit_bytes >= 0 AND (single_file_limit_bytes IS NULL OR single_file_limit_bytes >= 0) AND enforcement IN ('hard', 'soft') AND length(scope_type) > 0 AND length(scope_id) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_storage_quota_policy_scope ON storage_quota_policy (tenant_id, organization_id, scope_type, scope_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_storage_quota_policy_idempotency ON storage_quota_policy (tenant_id, organization_id, idempotency_key);
CREATE INDEX IF NOT EXISTS ix_storage_quota_policy_scope_status ON storage_quota_policy (tenant_id, organization_id, scope_type, status, id);

CREATE TABLE IF NOT EXISTS storage_usage_counter (
    id BIGINT NOT NULL PRIMARY KEY,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    scope_type VARCHAR(32) NOT NULL,
    scope_id VARCHAR(128) NOT NULL,
    used_logical_bytes BIGINT NOT NULL DEFAULT 0,
    reserved_bytes BIGINT NOT NULL DEFAULT 0,
    file_count BIGINT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_storage_usage_counter_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_storage_usage_counter_scope CHECK (tenant_id >= 0 AND organization_id >= 0),
    CONSTRAINT ck_storage_usage_counter_values CHECK (used_logical_bytes >= 0 AND reserved_bytes >= 0 AND file_count >= 0 AND length(scope_type) > 0 AND length(scope_id) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_storage_usage_counter_scope ON storage_usage_counter (tenant_id, organization_id, scope_type, scope_id);
CREATE INDEX IF NOT EXISTS ix_storage_usage_counter_scope_id ON storage_usage_counter (tenant_id, organization_id, scope_type, id);

CREATE TABLE IF NOT EXISTS storage_reconciliation_run (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    provider_id BIGINT,
    bucket_id BIGINT,
    run_type VARCHAR(32) NOT NULL,
    dry_run BOOLEAN NOT NULL DEFAULT TRUE,
    requested_by BIGINT NOT NULL DEFAULT 0,
    idempotency_key VARCHAR(128) NOT NULL,
    request_id VARCHAR(128) NOT NULL DEFAULT '',
    summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    status INTEGER NOT NULL DEFAULT 1,
    missing_object_count BIGINT NOT NULL DEFAULT 0,
    orphan_object_count BIGINT NOT NULL DEFAULT 0,
    checksum_mismatch_count BIGINT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_storage_reconciliation_run_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_storage_reconciliation_run_scope CHECK (tenant_id >= 0 AND organization_id >= 0),
    CONSTRAINT ck_storage_reconciliation_run_values CHECK (missing_object_count >= 0 AND orphan_object_count >= 0 AND checksum_mismatch_count >= 0 AND length(run_type) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_storage_reconciliation_run_idempotency ON storage_reconciliation_run (tenant_id, organization_id, idempotency_key);
CREATE INDEX IF NOT EXISTS ix_storage_reconciliation_run_scope_created ON storage_reconciliation_run (tenant_id, organization_id, status, id);
CREATE INDEX IF NOT EXISTS ix_storage_reconciliation_run_uuid ON storage_reconciliation_run (uuid);

CREATE TABLE IF NOT EXISTS storage_gc_job (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    job_type VARCHAR(32) NOT NULL,
    dry_run BOOLEAN NOT NULL DEFAULT TRUE,
    requested_by BIGINT NOT NULL DEFAULT 0,
    idempotency_key VARCHAR(128) NOT NULL,
    request_id VARCHAR(128) NOT NULL DEFAULT '',
    criteria_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    candidate_count BIGINT NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    CONSTRAINT ck_storage_gc_job_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_storage_gc_job_scope CHECK (tenant_id >= 0 AND organization_id >= 0),
    CONSTRAINT ck_storage_gc_job_values CHECK (candidate_count >= 0 AND length(job_type) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_storage_gc_job_idempotency ON storage_gc_job (tenant_id, organization_id, idempotency_key);
CREATE INDEX IF NOT EXISTS ix_storage_gc_job_scope_created ON storage_gc_job (tenant_id, organization_id, status, id);
CREATE INDEX IF NOT EXISTS ix_storage_gc_job_uuid ON storage_gc_job (uuid);

COMMIT;
