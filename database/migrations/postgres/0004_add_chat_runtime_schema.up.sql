-- sdkwork:migration
-- id: 0004_add_chat_runtime_schema
-- engine: postgres
-- module: clawrouter
-- purpose: Materialize the user-scoped chat transcript, context snapshot, runtime invocation, and usage-link authority.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: catalog-and-new-table-ddl
-- lock_timeout: 2s
-- statement_timeout: 5min
-- rewrite: Create-only migration; no existing table or row is rewritten.
-- replication_impact: Bounded to catalog DDL because all created tables are initially empty.
-- backfill: None; this pre-launch authority has no legacy rows to transform.
-- observability: Migration history, PostgreSQL lock waits, schema readiness, and drift verification.
-- cancellation: Transaction rollback removes every table and index created by this migration.
-- recovery: Resolve a rejected partial schema and deploy a reviewed forward-fix before accepting chat writes.
-- contract_version: 0.4.0

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '5min';

DO $sdkwork_migration$
DECLARE
    present_table_count INTEGER;
BEGIN
    SELECT COUNT(*)
      INTO present_table_count
      FROM information_schema.tables
     WHERE table_schema = current_schema()
       AND table_name IN (
           'ai_chat_conversation',
           'ai_chat_turn',
           'ai_chat_item',
           'ai_chat_message',
           'ai_chat_message_part',
           'ai_chat_context_snapshot',
           'ai_runtime_invocation',
           'ai_runtime_usage_link'
       );

    IF present_table_count NOT IN (0, 8) THEN
        RAISE EXCEPTION
            'chat runtime migration refuses a partial schema: expected 0 or 8 canonical tables, found %',
            present_table_count;
    END IF;
END
$sdkwork_migration$;

CREATE TABLE IF NOT EXISTS ai_chat_conversation (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    data_scope INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    conversation_code VARCHAR(64) NOT NULL,
    title VARCHAR(256) NOT NULL,
    source_surface VARCHAR(64) NOT NULL DEFAULT 'chat',
    default_provider VARCHAR(128),
    default_model VARCHAR(128),
    agent_id VARCHAR(128),
    agent_session_id VARCHAR(128),
    memory_space_id VARCHAR(128),
    last_message_preview VARCHAR(1024),
    message_count BIGINT NOT NULL DEFAULT 0,
    turn_count BIGINT NOT NULL DEFAULT 0,
    item_count BIGINT NOT NULL DEFAULT 0,
    input_token_total BIGINT NOT NULL DEFAULT 0,
    output_token_total BIGINT NOT NULL DEFAULT 0,
    cached_token_total BIGINT NOT NULL DEFAULT 0,
    reasoning_token_total BIGINT NOT NULL DEFAULT 0,
    cost_amount_total NUMERIC(38, 12) NOT NULL DEFAULT 0,
    currency VARCHAR(10),
    last_turn_id BIGINT,
    last_item_id BIGINT,
    CONSTRAINT ck_ai_chat_conversation_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT ck_ai_chat_conversation_subject_scope CHECK (tenant_id > 0 AND organization_id >= 0 AND user_id > 0),
    CONSTRAINT ck_ai_chat_conversation_status CHECK (status IN ('active', 'archived', 'deleted')),
    CONSTRAINT ck_ai_chat_conversation_non_negative_counts CHECK (message_count >= 0 AND turn_count >= 0 AND item_count >= 0 AND input_token_total >= 0 AND output_token_total >= 0 AND cached_token_total >= 0 AND reasoning_token_total >= 0 AND cost_amount_total >= 0 AND version >= 0),
    CONSTRAINT ck_ai_chat_conversation_last_ids CHECK ((last_turn_id IS NULL OR last_turn_id > 0) AND (last_item_id IS NULL OR last_item_id > 0)),
    CONSTRAINT ck_ai_chat_conversation_currency CHECK (currency IS NULL OR length(trim(currency)) BETWEEN 3 AND 10)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_conversation_scope_id ON ai_chat_conversation (tenant_id, organization_id, user_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_conversation_scope_uuid ON ai_chat_conversation (tenant_id, organization_id, user_id, uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_conversation_scope_code ON ai_chat_conversation (tenant_id, organization_id, user_id, conversation_code);
CREATE INDEX IF NOT EXISTS idx_ai_chat_conversation_user_status_updated ON ai_chat_conversation (tenant_id, organization_id, user_id, status, updated_at, id);

CREATE TABLE IF NOT EXISTS ai_chat_turn (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    conversation_id BIGINT NOT NULL,
    turn_no BIGINT NOT NULL,
    mode VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'queued',
    completed_at TIMESTAMPTZ,
    provider VARCHAR(128),
    model VARCHAR(128),
    agent_id VARCHAR(128),
    agent_session_id VARCHAR(128),
    final_output_item_id BIGINT,
    input_token_total BIGINT NOT NULL DEFAULT 0,
    output_token_total BIGINT NOT NULL DEFAULT 0,
    cached_token_total BIGINT NOT NULL DEFAULT 0,
    reasoning_token_total BIGINT NOT NULL DEFAULT 0,
    cost_amount NUMERIC(38, 12) NOT NULL DEFAULT 0,
    currency VARCHAR(10),
    response_snapshot JSONB,
    usage_snapshot JSONB,
    context_snapshot_id BIGINT,
    context_snapshot_count BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_ai_chat_turn_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT fk_ai_chat_turn_conversation FOREIGN KEY (tenant_id, organization_id, user_id, conversation_id) REFERENCES ai_chat_conversation (tenant_id, organization_id, user_id, id) ON DELETE CASCADE,
    CONSTRAINT ck_ai_chat_turn_subject_scope CHECK (tenant_id > 0 AND organization_id >= 0 AND user_id > 0),
    CONSTRAINT ck_ai_chat_turn_status CHECK (status IN ('queued', 'running', 'streaming', 'requires_action', 'completed', 'failed', 'cancelled', 'deleted')),
    CONSTRAINT ck_ai_chat_turn_non_negative_values CHECK (turn_no > 0 AND input_token_total >= 0 AND output_token_total >= 0 AND cached_token_total >= 0 AND reasoning_token_total >= 0 AND cost_amount >= 0 AND context_snapshot_count >= 0 AND (final_output_item_id IS NULL OR final_output_item_id > 0) AND (context_snapshot_id IS NULL OR context_snapshot_id > 0)),
    CONSTRAINT ck_ai_chat_turn_currency CHECK (currency IS NULL OR length(trim(currency)) BETWEEN 3 AND 10)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_turn_scope_id ON ai_chat_turn (tenant_id, organization_id, user_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_turn_scope_uuid ON ai_chat_turn (tenant_id, organization_id, user_id, uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_turn_scope_conversation_id ON ai_chat_turn (tenant_id, organization_id, user_id, conversation_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_turn_scope_conversation_no ON ai_chat_turn (tenant_id, organization_id, user_id, conversation_id, turn_no);
CREATE INDEX IF NOT EXISTS idx_ai_chat_turn_conversation_created ON ai_chat_turn (tenant_id, organization_id, user_id, conversation_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_turn_conversation_status ON ai_chat_turn (tenant_id, organization_id, user_id, conversation_id, status, updated_at, id);

CREATE TABLE IF NOT EXISTS ai_runtime_invocation (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    conversation_id VARCHAR(128),
    chat_turn_id VARCHAR(128),
    chat_item_id VARCHAR(128),
    agent_session_id VARCHAR(128),
    agent_run_id VARCHAR(128),
    agent_run_step_id VARCHAR(128),
    invocation_no BIGINT NOT NULL,
    invocation_type VARCHAR(128) NOT NULL,
    runtime VARCHAR(128) NOT NULL,
    endpoint VARCHAR(128),
    attempt_no BIGINT NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'running',
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    provider_response_id VARCHAR(128),
    provider_session_id VARCHAR(128),
    provider_conversation_id VARCHAR(128),
    provider_step_id VARCHAR(128),
    model VARCHAR(128),
    provider VARCHAR(128),
    tool_name VARCHAR(128),
    tool_call_id VARCHAR(128),
    cwd VARCHAR(2048),
    sandbox_policy VARCHAR(128),
    approval_policy VARCHAR(128),
    permission_mode VARCHAR(128),
    streaming BOOLEAN NOT NULL DEFAULT FALSE,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    latency_ms BIGINT,
    ttft_ms BIGINT,
    exit_code BIGINT,
    finish_reason VARCHAR(128),
    error_type VARCHAR(128),
    error_code VARCHAR(128),
    error_message_masked VARCHAR(1024),
    request_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_json JSONB,
    usage_json JSONB,
    CONSTRAINT ck_ai_runtime_invocation_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT ck_ai_runtime_invocation_subject_scope CHECK (tenant_id > 0 AND organization_id >= 0 AND user_id > 0),
    CONSTRAINT ck_ai_runtime_invocation_sequence CHECK (invocation_no > 0 AND attempt_no > 0),
    CONSTRAINT ck_ai_runtime_invocation_status CHECK (status IN ('pending', 'running', 'streaming', 'completed', 'failed', 'cancelled')),
    CONSTRAINT ck_ai_runtime_invocation_runtime CHECK (length(trim(invocation_type)) > 0 AND length(trim(runtime)) > 0),
    CONSTRAINT ck_ai_runtime_invocation_metrics CHECK ((latency_ms IS NULL OR latency_ms >= 0) AND (ttft_ms IS NULL OR ttft_ms >= 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_runtime_invocation_scope_id ON ai_runtime_invocation (tenant_id, organization_id, user_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_runtime_invocation_scope_uuid ON ai_runtime_invocation (tenant_id, organization_id, user_id, uuid);
CREATE INDEX IF NOT EXISTS idx_ai_runtime_invocation_user_created ON ai_runtime_invocation (tenant_id, organization_id, user_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_runtime_invocation_chat_created ON ai_runtime_invocation (tenant_id, organization_id, user_id, conversation_id, chat_turn_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_runtime_invocation_runtime_status ON ai_runtime_invocation (tenant_id, organization_id, user_id, runtime, status, created_at, id);

CREATE TABLE IF NOT EXISTS ai_chat_context_snapshot (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    conversation_id BIGINT NOT NULL,
    turn_id BIGINT NOT NULL,
    runtime_invocation_id BIGINT,
    snapshot_no BIGINT NOT NULL,
    strategy VARCHAR(64) NOT NULL,
    included_item_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    excluded_item_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    included_memory_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    excluded_memory_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    memory_pack JSONB NOT NULL DEFAULT '{}'::jsonb,
    memory_token_count BIGINT NOT NULL DEFAULT 0,
    provider_conversation_id VARCHAR(128),
    previous_response_id VARCHAR(128),
    input_token_estimate BIGINT NOT NULL DEFAULT 0,
    truncation_reason VARCHAR(128),
    context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT ck_ai_chat_context_snapshot_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT fk_ai_chat_context_snapshot_turn FOREIGN KEY (tenant_id, organization_id, user_id, conversation_id, turn_id) REFERENCES ai_chat_turn (tenant_id, organization_id, user_id, conversation_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_chat_context_snapshot_invocation FOREIGN KEY (tenant_id, organization_id, user_id, runtime_invocation_id) REFERENCES ai_runtime_invocation (tenant_id, organization_id, user_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_chat_context_snapshot_subject_scope CHECK (tenant_id > 0 AND organization_id >= 0 AND user_id > 0),
    CONSTRAINT ck_ai_chat_context_snapshot_status CHECK (status IN ('active', 'superseded', 'deleted')),
    CONSTRAINT ck_ai_chat_context_snapshot_values CHECK (snapshot_no > 0 AND memory_token_count >= 0 AND input_token_estimate >= 0 AND length(trim(strategy)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_context_snapshot_scope_id ON ai_chat_context_snapshot (tenant_id, organization_id, user_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_context_snapshot_scope_uuid ON ai_chat_context_snapshot (tenant_id, organization_id, user_id, uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_context_snapshot_scope_turn_no ON ai_chat_context_snapshot (tenant_id, organization_id, user_id, turn_id, snapshot_no);
CREATE INDEX IF NOT EXISTS idx_ai_chat_context_snapshot_conversation_created ON ai_chat_context_snapshot (tenant_id, organization_id, user_id, conversation_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_context_snapshot_invocation ON ai_chat_context_snapshot (tenant_id, organization_id, user_id, runtime_invocation_id, id);

CREATE TABLE IF NOT EXISTS ai_chat_item (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    conversation_id BIGINT NOT NULL,
    turn_id BIGINT NOT NULL,
    sequence_no BIGINT NOT NULL,
    item_type VARCHAR(64) NOT NULL,
    role VARCHAR(32),
    direction VARCHAR(16) NOT NULL,
    status VARCHAR(32) NOT NULL,
    content_text TEXT,
    content_json JSONB,
    provider VARCHAR(128),
    model VARCHAR(128),
    runtime_invocation_id VARCHAR(128),
    completed_at TIMESTAMPTZ,
    CONSTRAINT ck_ai_chat_item_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT fk_ai_chat_item_turn FOREIGN KEY (tenant_id, organization_id, user_id, conversation_id, turn_id) REFERENCES ai_chat_turn (tenant_id, organization_id, user_id, conversation_id, id) ON DELETE CASCADE,
    CONSTRAINT ck_ai_chat_item_subject_scope CHECK (tenant_id > 0 AND organization_id >= 0 AND user_id > 0),
    CONSTRAINT ck_ai_chat_item_sequence CHECK (sequence_no > 0),
    CONSTRAINT ck_ai_chat_item_values CHECK (length(trim(item_type)) > 0 AND direction IN ('input', 'output', 'internal') AND (role IS NULL OR role IN ('system', 'developer', 'user', 'assistant', 'tool')) AND status IN ('pending', 'running', 'streaming', 'completed', 'failed', 'cancelled', 'deleted'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_item_scope_id ON ai_chat_item (tenant_id, organization_id, user_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_item_scope_uuid ON ai_chat_item (tenant_id, organization_id, user_id, uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_item_scope_turn_id ON ai_chat_item (tenant_id, organization_id, user_id, conversation_id, turn_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_item_scope_conversation_sequence ON ai_chat_item (tenant_id, organization_id, user_id, conversation_id, sequence_no);
CREATE INDEX IF NOT EXISTS idx_ai_chat_item_turn_direction_status ON ai_chat_item (tenant_id, organization_id, user_id, conversation_id, turn_id, direction, role, status, sequence_no, id);

CREATE TABLE IF NOT EXISTS ai_chat_message (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    conversation_id BIGINT NOT NULL,
    turn_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    message_no BIGINT NOT NULL,
    role VARCHAR(32) NOT NULL,
    message_kind VARCHAR(64) NOT NULL,
    direction VARCHAR(16) NOT NULL,
    status VARCHAR(32) NOT NULL,
    content_text TEXT NOT NULL,
    content_json JSONB,
    model VARCHAR(128),
    provider VARCHAR(128),
    runtime VARCHAR(128),
    runtime_invocation_id VARCHAR(128),
    usage_link_id VARCHAR(64),
    CONSTRAINT ck_ai_chat_message_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT fk_ai_chat_message_item FOREIGN KEY (tenant_id, organization_id, user_id, conversation_id, turn_id, item_id) REFERENCES ai_chat_item (tenant_id, organization_id, user_id, conversation_id, turn_id, id) ON DELETE CASCADE,
    CONSTRAINT ck_ai_chat_message_subject_scope CHECK (tenant_id > 0 AND organization_id >= 0 AND user_id > 0),
    CONSTRAINT ck_ai_chat_message_sequence CHECK (message_no > 0),
    CONSTRAINT ck_ai_chat_message_values CHECK (role IN ('system', 'developer', 'user', 'assistant', 'tool') AND direction IN ('input', 'output', 'internal') AND length(trim(message_kind)) > 0 AND status IN ('pending', 'running', 'streaming', 'completed', 'failed', 'cancelled', 'deleted'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_message_scope_id ON ai_chat_message (tenant_id, organization_id, user_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_message_scope_uuid ON ai_chat_message (tenant_id, organization_id, user_id, uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_message_scope_item_id ON ai_chat_message (tenant_id, organization_id, user_id, item_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_message_scope_conversation_no ON ai_chat_message (tenant_id, organization_id, user_id, conversation_id, message_no);
CREATE INDEX IF NOT EXISTS idx_ai_chat_message_turn_status ON ai_chat_message (tenant_id, organization_id, user_id, conversation_id, turn_id, role, direction, status, message_no, id);

CREATE TABLE IF NOT EXISTS ai_chat_message_part (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    message_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    part_no BIGINT NOT NULL,
    part_type VARCHAR(64) NOT NULL,
    text_content TEXT,
    json_content JSONB,
    CONSTRAINT ck_ai_chat_message_part_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT fk_ai_chat_message_part_message_item FOREIGN KEY (tenant_id, organization_id, user_id, item_id, message_id) REFERENCES ai_chat_message (tenant_id, organization_id, user_id, item_id, id) ON DELETE CASCADE,
    CONSTRAINT ck_ai_chat_message_part_subject_scope CHECK (tenant_id > 0 AND organization_id >= 0 AND user_id > 0),
    CONSTRAINT ck_ai_chat_message_part_values CHECK (part_no > 0 AND length(trim(part_type)) > 0 AND (text_content IS NOT NULL OR json_content IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_message_part_scope_id ON ai_chat_message_part (tenant_id, organization_id, user_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_message_part_scope_uuid ON ai_chat_message_part (tenant_id, organization_id, user_id, uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_chat_message_part_scope_message_no ON ai_chat_message_part (tenant_id, organization_id, user_id, message_id, part_no);
CREATE INDEX IF NOT EXISTS idx_ai_chat_message_part_item ON ai_chat_message_part (tenant_id, organization_id, user_id, item_id, message_id, part_no, id);

CREATE TABLE IF NOT EXISTS ai_runtime_usage_link (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    conversation_id VARCHAR(128),
    chat_turn_id VARCHAR(128),
    message_id VARCHAR(128),
    runtime_invocation_id VARCHAR(128),
    usage_fact_id BIGINT,
    usage_type VARCHAR(64) NOT NULL,
    provider VARCHAR(128),
    model VARCHAR(128),
    input_tokens BIGINT NOT NULL DEFAULT 0,
    output_tokens BIGINT NOT NULL DEFAULT 0,
    cached_tokens BIGINT NOT NULL DEFAULT 0,
    reasoning_tokens BIGINT NOT NULL DEFAULT 0,
    total_tokens BIGINT NOT NULL DEFAULT 0,
    cost_amount NUMERIC(38, 12) NOT NULL DEFAULT 0,
    currency VARCHAR(10),
    occurred_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_ai_runtime_usage_link_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT ck_ai_runtime_usage_link_subject_scope CHECK (tenant_id > 0 AND organization_id >= 0 AND user_id > 0),
    CONSTRAINT ck_ai_runtime_usage_link_non_negative_values CHECK (input_tokens >= 0 AND output_tokens >= 0 AND cached_tokens >= 0 AND reasoning_tokens >= 0 AND total_tokens >= 0 AND cost_amount >= 0 AND (usage_fact_id IS NULL OR usage_fact_id > 0)),
    CONSTRAINT ck_ai_runtime_usage_link_usage_type CHECK (length(trim(usage_type)) > 0),
    CONSTRAINT ck_ai_runtime_usage_link_currency CHECK (currency IS NULL OR length(trim(currency)) BETWEEN 3 AND 10)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_runtime_usage_link_scope_id ON ai_runtime_usage_link (tenant_id, organization_id, user_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_runtime_usage_link_scope_uuid ON ai_runtime_usage_link (tenant_id, organization_id, user_id, uuid);
CREATE INDEX IF NOT EXISTS idx_ai_runtime_usage_link_message ON ai_runtime_usage_link (tenant_id, organization_id, user_id, message_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_runtime_usage_link_invocation ON ai_runtime_usage_link (tenant_id, organization_id, user_id, runtime_invocation_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_runtime_usage_link_usage_fact ON ai_runtime_usage_link (tenant_id, organization_id, user_id, usage_fact_id, id);

DO $sdkwork_migration$
DECLARE
    required_column_count INTEGER;
    required_index_count INTEGER;
BEGIN
    SELECT COUNT(*)
      INTO required_column_count
      FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND (table_name, column_name) IN (
           ('ai_chat_conversation', 'message_count'),
           ('ai_chat_conversation', 'turn_count'),
           ('ai_chat_conversation', 'item_count'),
           ('ai_chat_conversation', 'last_message_preview'),
           ('ai_chat_turn', 'context_snapshot_count'),
           ('ai_chat_item', 'sequence_no'),
           ('ai_chat_message', 'message_no'),
           ('ai_chat_context_snapshot', 'snapshot_no'),
           ('ai_runtime_invocation', 'invocation_no'),
           ('ai_runtime_usage_link', 'user_id')
       );

    SELECT COUNT(*)
      INTO required_index_count
      FROM pg_indexes
     WHERE schemaname = current_schema()
       AND indexname IN (
           'uk_ai_chat_conversation_scope_code',
           'uk_ai_chat_turn_scope_conversation_no',
           'uk_ai_chat_item_scope_conversation_sequence',
           'uk_ai_chat_message_scope_conversation_no',
           'uk_ai_chat_context_snapshot_scope_turn_no',
           'uk_ai_runtime_invocation_scope_uuid',
           'uk_ai_runtime_usage_link_scope_uuid'
       );

    IF required_column_count <> 10 OR required_index_count <> 7 THEN
        RAISE EXCEPTION
            'chat runtime schema verification failed: columns %, indexes %',
            required_column_count,
            required_index_count;
    END IF;
END
$sdkwork_migration$;

COMMIT;
