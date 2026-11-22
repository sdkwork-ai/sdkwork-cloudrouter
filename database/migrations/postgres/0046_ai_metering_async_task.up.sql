-- sdkwork:migration
-- id: 0046_ai_metering_async_task
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Persist async usage reconciliation tasks (batch, background Responses, thread runs) so a worker can poll the upstream and settle reported usage exactly once.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s
-- contract_version: 0.5.0
--
-- Rewrite expectation: none. The table is new and empty.
-- WAL/replication impact: DDL only; no row rewrite. Creating the table and its
--   indexes writes catalog/WAL metadata, no heap rewrite.
-- Backfill plan: none. New rows are written by the async usage registration
--   path after the worker feature is enabled; there is no historical backfill.
-- Observability: `pnpm db:plan` shows the new table/indexes; the worker owns
--   `ai_metering_async_task` status transitions and exposes attempts/last_error
--   for operators.
-- Cancellation point: safe before COMMIT (transactional DDL). After COMMIT the
--   migration is forward-only.
-- Recovery command: roll forward with a new migration; do not drop the table
--   while any task row is settled or referenced by billing.
--
-- The table mirrors the root baseline definition (clean installs get it from
-- 0001_cloudrouter_baseline.sql, existing installs from this migration), the
-- same baseline-plus-migration pattern used by 0021.
CREATE TABLE IF NOT EXISTS ai_metering_async_task (
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
    user_id BIGINT,
    request_id VARCHAR(128) NOT NULL,
    api_key_id BIGINT NOT NULL,
    task_kind VARCHAR(32) NOT NULL,
    upstream_id VARCHAR(256) NOT NULL,
    catalog_key VARCHAR(256),
    supplier_code VARCHAR(64) NOT NULL,
    account_id BIGINT NOT NULL,
    region_code VARCHAR(64) NOT NULL,
    task_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_poll_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_error VARCHAR(1024),
    billing_request_id VARCHAR(160),
    usage_snapshot JSONB,
    settled_at TIMESTAMPTZ,
    CONSTRAINT ck_ai_metering_async_task_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_metering_async_task_kind CHECK (task_kind IN ('openai_batch', 'anthropic_batch', 'background_response', 'thread_run')),
    CONSTRAINT ck_ai_metering_async_task_status CHECK (task_status IN ('pending', 'running', 'settled', 'failed', 'expired')),
    CONSTRAINT ck_ai_metering_async_task_attempts CHECK (attempts >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_metering_async_task_uuid ON ai_metering_async_task (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_metering_async_task_upstream ON ai_metering_async_task (tenant_id, organization_id, task_kind, upstream_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_metering_async_task_billing_request ON ai_metering_async_task (tenant_id, organization_id, billing_request_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_metering_async_task_due ON ai_metering_async_task (next_poll_at, id) WHERE task_status IN ('pending', 'running');
CREATE INDEX IF NOT EXISTS idx_ai_metering_async_task_tenant_status ON ai_metering_async_task (tenant_id, organization_id, task_status, next_poll_at, id);
