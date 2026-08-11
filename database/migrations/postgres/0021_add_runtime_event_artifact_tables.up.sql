-- sdkwork:migration
-- id: 0021_add_runtime_event_artifact_tables
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Add ai_runtime_invocation_event and ai_runtime_artifact so the
--   app runtime store contract (invocation events and artifacts) is backed by
--   real tables. The app_runtime_store already writes these tables; this
--   migration closes the schema drift between the code and the database.
--   The baseline (0001) carries the same definitions for clean installs.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

CREATE TABLE IF NOT EXISTS ai_runtime_artifact (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    conversation_id VARCHAR(128) NOT NULL DEFAULT '',
    chat_turn_id VARCHAR(128) NOT NULL DEFAULT '',
    chat_item_id VARCHAR(128),
    agent_session_id VARCHAR(128) NOT NULL DEFAULT '',
    agent_run_id VARCHAR(128),
    agent_run_step_id VARCHAR(128),
    runtime_invocation_id BIGINT NOT NULL,
    artifact_type VARCHAR(64) NOT NULL,
    name VARCHAR(512),
    mime_type VARCHAR(128),
    content_text VARCHAR(262144),
    content_json JSONB,
    drive_uri VARCHAR(1024),
    resource_snapshot JSONB,
    sha256 VARCHAR(64),
    size_bytes BIGINT,
    CONSTRAINT ck_ai_runtime_artifact_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT ck_ai_runtime_artifact_subject_scope CHECK (tenant_id > 0 AND organization_id >= 0 AND user_id > 0),
    CONSTRAINT ck_ai_runtime_artifact_type CHECK (length(trim(artifact_type)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_runtime_artifact_scope_id ON ai_runtime_artifact (tenant_id, organization_id, user_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_runtime_artifact_scope_uuid ON ai_runtime_artifact (tenant_id, organization_id, user_id, uuid);
CREATE INDEX IF NOT EXISTS idx_ai_runtime_artifact_invocation_created ON ai_runtime_artifact (tenant_id, organization_id, user_id, runtime_invocation_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_runtime_artifact_user_created ON ai_runtime_artifact (tenant_id, organization_id, user_id, created_at, id);

CREATE TABLE IF NOT EXISTS ai_runtime_invocation_event (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    invocation_id BIGINT NOT NULL,
    conversation_id VARCHAR(128) NOT NULL DEFAULT '',
    chat_turn_id VARCHAR(128) NOT NULL DEFAULT '',
    agent_session_id VARCHAR(128) NOT NULL DEFAULT '',
    agent_run_id VARCHAR(128),
    agent_run_step_id VARCHAR(128),
    event_no BIGINT NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    event_source VARCHAR(64) NOT NULL,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    text_delta VARCHAR(16384),
    CONSTRAINT ck_ai_runtime_invocation_event_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT ck_ai_runtime_invocation_event_subject_scope CHECK (tenant_id > 0 AND organization_id >= 0 AND user_id > 0),
    CONSTRAINT ck_ai_runtime_invocation_event_sequence CHECK (event_no > 0),
    CONSTRAINT ck_ai_runtime_invocation_event_type CHECK (length(trim(event_type)) > 0 AND length(trim(event_source)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_runtime_invocation_event_scope_id ON ai_runtime_invocation_event (tenant_id, organization_id, user_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_runtime_invocation_event_scope_uuid ON ai_runtime_invocation_event (tenant_id, organization_id, user_id, uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_runtime_invocation_event_sequence ON ai_runtime_invocation_event (tenant_id, organization_id, user_id, invocation_id, event_no);
CREATE INDEX IF NOT EXISTS idx_ai_runtime_invocation_event_invocation_created ON ai_runtime_invocation_event (tenant_id, organization_id, user_id, invocation_id, created_at, id);

COMMIT;
