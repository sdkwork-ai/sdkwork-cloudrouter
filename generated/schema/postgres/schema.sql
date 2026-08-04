-- Generated from docs/schema-registry/sdkwork-clawrouter.tables.yaml.
-- Registry version: 0.4.0.
-- Registry SHA-256: 6734e8b6c09bcd81a449492347efce95790c8f0358614a35cf73c738093f51a4.
-- Dialect: postgres.
-- Materialize: python -B -m tools.schema_compiler --dialect postgres --materialize.
-- Do not edit by hand; update Schema Registry and regenerate.

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
    cost_amount NUMERIC(38, 12),
    currency VARCHAR(10),
    response_snapshot JSONB,
    usage_snapshot JSONB,
    context_snapshot_id BIGINT,
    context_snapshot_count BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_ai_chat_turn_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT fk_ai_chat_turn_conversation FOREIGN KEY (tenant_id, organization_id, user_id, conversation_id) REFERENCES ai_chat_conversation (tenant_id, organization_id, user_id, id) ON DELETE CASCADE,
    CONSTRAINT ck_ai_chat_turn_subject_scope CHECK (tenant_id > 0 AND organization_id >= 0 AND user_id > 0),
    CONSTRAINT ck_ai_chat_turn_status CHECK (status IN ('queued', 'running', 'streaming', 'requires_action', 'completed', 'failed', 'cancelled', 'deleted')),
    CONSTRAINT ck_ai_chat_turn_non_negative_values CHECK (turn_no > 0 AND input_token_total >= 0 AND output_token_total >= 0 AND cached_token_total >= 0 AND reasoning_token_total >= 0 AND (cost_amount IS NULL OR cost_amount >= 0) AND context_snapshot_count >= 0 AND (final_output_item_id IS NULL OR final_output_item_id > 0) AND (context_snapshot_id IS NULL OR context_snapshot_id > 0)),
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

CREATE TABLE IF NOT EXISTS ai_config_change_event (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    config_scope VARCHAR(64) NOT NULL,
    changed_object_type VARCHAR(64),
    changed_object_id BIGINT,
    config_version BIGINT NOT NULL,
    event_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    event_payload JSONB,
    published_at TIMESTAMPTZ,
    publish_attempts INTEGER NOT NULL DEFAULT 0,
    last_error_message VARCHAR(512),
    CONSTRAINT ck_ai_config_change_event_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_config_change_event_uuid ON ai_config_change_event (uuid);
CREATE INDEX IF NOT EXISTS idx_ai_config_change_event_pending ON ai_config_change_event (tenant_id, organization_id, event_status, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_config_change_event_scope_version ON ai_config_change_event (tenant_id, organization_id, config_scope, config_version, id);
CREATE INDEX IF NOT EXISTS idx_ai_config_change_event_retention ON ai_config_change_event (retention_until, id);

CREATE TABLE IF NOT EXISTS ai_config_version (
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
    config_scope VARCHAR(64) NOT NULL,
    config_version BIGINT NOT NULL DEFAULT 0,
    changed_object_type VARCHAR(64),
    changed_object_id BIGINT,
    published_at TIMESTAMPTZ,
    CONSTRAINT ck_ai_config_version_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_config_version_uuid ON ai_config_version (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_config_version_scope ON ai_config_version (tenant_id, organization_id, config_scope);
CREATE INDEX IF NOT EXISTS idx_ai_config_version_scope_updated ON ai_config_version (tenant_id, organization_id, config_scope, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_config_version_scope_status ON ai_config_version (config_scope, status, deleted_at, id);

CREATE TABLE IF NOT EXISTS ai_model_mapping_rule (
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
    source_vendor_id BIGINT,
    source_vendor_code VARCHAR(64) NOT NULL DEFAULT '',
    target_vendor_id BIGINT,
    target_vendor_code VARCHAR(64) NOT NULL DEFAULT '',
    mapping_mode VARCHAR(32) NOT NULL DEFAULT 'alias',
    match_type VARCHAR(32) NOT NULL DEFAULT 'exact',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_ai_model_mapping_rule_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_model_mapping_rule_uuid ON ai_model_mapping_rule (uuid) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_source_vendor ON ai_model_mapping_rule (tenant_id, organization_id, status, enabled, source_vendor_code, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_target_vendor ON ai_model_mapping_rule (tenant_id, organization_id, status, enabled, target_vendor_code, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_enabled ON ai_model_mapping_rule (tenant_id, organization_id, status, enabled, id);

CREATE TABLE IF NOT EXISTS ai_model_mapping_rule_binding (
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
    rule_id BIGINT NOT NULL DEFAULT 0,
    rule_uuid VARCHAR(128),
    binding_type VARCHAR(32) NOT NULL DEFAULT 'global',
    binding_id BIGINT,
    binding_code VARCHAR(128),
    binding_name_snapshot VARCHAR(256),
    sort_order INTEGER NOT NULL DEFAULT 100,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_ai_model_mapping_rule_binding_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_model_mapping_rule_binding_uuid ON ai_model_mapping_rule_binding (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_model_mapping_rule_binding_target ON ai_model_mapping_rule_binding (tenant_id, organization_id, rule_id, binding_type, binding_id, binding_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_binding_rule_lookup ON ai_model_mapping_rule_binding (tenant_id, organization_id, rule_id, status, enabled, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_binding_target_lookup ON ai_model_mapping_rule_binding (tenant_id, organization_id, binding_type, binding_id, binding_code, status, enabled, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_binding_account_group_lookup ON ai_model_mapping_rule_binding (tenant_id, organization_id, binding_type, binding_code, status, enabled, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_binding_vendor_lookup ON ai_model_mapping_rule_binding (tenant_id, organization_id, binding_type, binding_code, status, enabled, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_binding_global_lookup ON ai_model_mapping_rule_binding (tenant_id, organization_id, binding_type, status, enabled, id);

CREATE TABLE IF NOT EXISTS ai_model_mapping_rule_item (
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
    rule_id BIGINT NOT NULL DEFAULT 0,
    rule_uuid VARCHAR(128),
    source_model VARCHAR(256) NOT NULL DEFAULT '',
    source_catalog_key VARCHAR(256),
    target_model VARCHAR(256) NOT NULL DEFAULT '',
    target_catalog_key VARCHAR(256),
    target_provider_model VARCHAR(256),
    target_provider_native_model VARCHAR(256),
    sort_order INTEGER NOT NULL DEFAULT 100,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_ai_model_mapping_rule_item_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_model_mapping_rule_item_uuid ON ai_model_mapping_rule_item (uuid) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_item_rule_lookup ON ai_model_mapping_rule_item (tenant_id, organization_id, rule_id, status, enabled, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_item_source_lookup ON ai_model_mapping_rule_item (tenant_id, organization_id, source_model, status, enabled, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_item_target_lookup ON ai_model_mapping_rule_item (tenant_id, organization_id, target_catalog_key, target_model, status, id);

CREATE TABLE IF NOT EXISTS ai_pricing_import_snapshot (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    import_source INTEGER NOT NULL,
    source_name VARCHAR(128) NOT NULL,
    source_url VARCHAR(1024),
    source_version VARCHAR(128),
    source_hash VARCHAR(128) NOT NULL,
    upstream_commit VARCHAR(128),
    data_format VARCHAR(64),
    row_count BIGINT,
    accepted_count BIGINT,
    rejected_count BIGINT,
    currency VARCHAR(10),
    published_at TIMESTAMPTZ,
    observed_at TIMESTAMPTZ NOT NULL,
    raw_payload_ref VARCHAR(512),
    normalized_payload_hash VARCHAR(128),
    schema_version VARCHAR(32),
    error_message_masked VARCHAR(1024),
    CONSTRAINT ck_ai_pricing_import_snapshot_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_import_snapshot_uuid ON ai_pricing_import_snapshot (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_import_snapshot_hash ON ai_pricing_import_snapshot (tenant_id, organization_id, import_source, source_hash);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_import_snapshot_tenant_latest ON ai_pricing_import_snapshot (tenant_id, organization_id, status, import_source, observed_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_import_snapshot_retention ON ai_pricing_import_snapshot (retention_until, id);

CREATE TABLE IF NOT EXISTS ai_pricing_plan (
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
    plan_code VARCHAR(64) NOT NULL,
    plan_name VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    plan_scope INTEGER,
    base_price_side INTEGER NOT NULL,
    base_pricing_scope INTEGER,
    default_reference_price_id BIGINT,
    default_multiplier NUMERIC(38, 12),
    default_markup_amount NUMERIC(38, 12),
    currency VARCHAR(10) NOT NULL,
    billing_mode INTEGER,
    rounding_mode INTEGER,
    min_charge_amount NUMERIC(38, 12),
    fallback_mode INTEGER,
    priority INTEGER,
    price_version VARCHAR(64),
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_ai_pricing_plan_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_pricing_plan_non_negative_amounts CHECK ((default_multiplier IS NULL OR default_multiplier >= 0) AND (default_markup_amount IS NULL OR default_markup_amount >= 0) AND (min_charge_amount IS NULL OR min_charge_amount >= 0)),
    CONSTRAINT ck_ai_pricing_plan_effective_interval CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_plan_uuid ON ai_pricing_plan (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_plan_tenant_code ON ai_pricing_plan (tenant_id, organization_id, plan_code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_plan_scope_id ON ai_pricing_plan (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_plan_scope_status ON ai_pricing_plan (tenant_id, organization_id, plan_scope, status, priority, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_plan_effective ON ai_pricing_plan (tenant_id, organization_id, status, effective_from, effective_to, id);

CREATE TABLE IF NOT EXISTS ai_pricing_plan_binding (
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
    pricing_plan_id BIGINT NOT NULL,
    pricing_plan_code VARCHAR(64),
    subject_type INTEGER NOT NULL,
    subject_id BIGINT,
    subject_code VARCHAR(128),
    binding_source INTEGER,
    multiplier_override NUMERIC(38, 12),
    rpm_override BIGINT,
    tpm_override BIGINT,
    quota_policy_id BIGINT,
    priority INTEGER NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_ai_pricing_plan_binding_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_plan_binding_uuid ON ai_pricing_plan_binding (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_plan_binding_subject ON ai_pricing_plan_binding (tenant_id, organization_id, subject_type, subject_id, pricing_plan_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_pricing_plan_binding_tenant_status_effective ON ai_pricing_plan_binding (tenant_id, organization_id, status, effective_from, priority, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_plan_binding_subject_effective ON ai_pricing_plan_binding (tenant_id, organization_id, subject_type, subject_id, status, effective_from, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_plan_binding_plan ON ai_pricing_plan_binding (tenant_id, organization_id, pricing_plan_id, status, priority, id);

CREATE TABLE IF NOT EXISTS ai_pricing_rule (
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
    pricing_plan_id BIGINT NOT NULL,
    pricing_plan_code VARCHAR(64),
    rule_code VARCHAR(64) NOT NULL,
    rule_name VARCHAR(128),
    match_type INTEGER,
    vendor_code VARCHAR(64),
    family_code VARCHAR(64),
    model_id BIGINT,
    model VARCHAR(256),
    supplier_code VARCHAR(64),
    account_id BIGINT,
    provider_model VARCHAR(256),
    capability_code VARCHAR(64),
    platform_code VARCHAR(64),
    service_tier VARCHAR(64),
    region VARCHAR(64),
    price_side INTEGER,
    reference_price_side INTEGER,
    reference_pricing_id BIGINT,
    reference_pricing_scope INTEGER,
    price_item_type INTEGER,
    billing_type INTEGER,
    billing_mode INTEGER,
    billing_meter_id BIGINT,
    billing_meter_code VARCHAR(64) NOT NULL,
    unit INTEGER,
    unit_size NUMERIC(38, 12),
    metering_mode INTEGER,
    quantity_source INTEGER,
    quantity_formula TEXT,
    result_selector VARCHAR(256),
    minimum_quantity NUMERIC(38, 12),
    quantity_step NUMERIC(38, 12),
    included_quantity NUMERIC(38, 12),
    formula_mode INTEGER NOT NULL,
    multiplier NUMERIC(38, 12),
    markup_amount NUMERIC(38, 12),
    unit_price_override NUMERIC(38, 12),
    expression TEXT,
    expression_hash VARCHAR(128),
    fallback_mode INTEGER,
    priority INTEGER NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_ai_pricing_rule_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_pricing_rule_plan FOREIGN KEY (tenant_id, organization_id, pricing_plan_id) REFERENCES ai_pricing_plan (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_pricing_rule_positive_units CHECK ((unit_size IS NULL OR unit_size > 0) AND (minimum_quantity IS NULL OR minimum_quantity >= 0) AND (quantity_step IS NULL OR quantity_step > 0) AND (included_quantity IS NULL OR included_quantity >= 0)),
    CONSTRAINT ck_ai_pricing_rule_non_negative_amounts CHECK ((multiplier IS NULL OR multiplier >= 0) AND (markup_amount IS NULL OR markup_amount >= 0) AND (unit_price_override IS NULL OR unit_price_override >= 0)),
    CONSTRAINT ck_ai_pricing_rule_effective_interval CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_rule_uuid ON ai_pricing_rule (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_rule_plan_code ON ai_pricing_rule (tenant_id, organization_id, pricing_plan_id, rule_code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_rule_scope_id ON ai_pricing_rule (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_rule_tenant_status_priority ON ai_pricing_rule (tenant_id, organization_id, status, priority, effective_from, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_rule_model_lookup ON ai_pricing_rule (tenant_id, organization_id, pricing_plan_id, model, supplier_code, account_id, billing_meter_code, status, priority, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_rule_meter_lookup ON ai_pricing_rule (tenant_id, organization_id, pricing_plan_id, billing_meter_code, match_type, status, priority, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_rule_reference ON ai_pricing_rule (tenant_id, organization_id, reference_price_side, reference_pricing_id, status, id);

CREATE TABLE IF NOT EXISTS ai_pricing_tier (
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
    pricing_rule_id BIGINT NOT NULL,
    model_pricing_id BIGINT,
    tier_code VARCHAR(64) NOT NULL,
    tier_label VARCHAR(64),
    price_item_type INTEGER,
    billing_mode INTEGER,
    billing_meter_id BIGINT,
    billing_meter_code VARCHAR(64) NOT NULL,
    min_quantity NUMERIC(38, 12),
    max_quantity NUMERIC(38, 12),
    quantity_unit INTEGER,
    quantity_step NUMERIC(38, 12),
    included_quantity NUMERIC(38, 12),
    result_selector VARCHAR(256),
    input_unit_price NUMERIC(38, 12),
    output_unit_price NUMERIC(38, 12),
    cache_write_unit_price NUMERIC(38, 12),
    cache_read_unit_price NUMERIC(38, 12),
    image_unit_price NUMERIC(38, 12),
    audio_unit_price NUMERIC(38, 12),
    video_unit_price NUMERIC(38, 12),
    per_request_price NUMERIC(38, 12),
    multiplier NUMERIC(38, 12),
    currency VARCHAR(10),
    sort_order INTEGER NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_ai_pricing_tier_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_pricing_tier_rule FOREIGN KEY (tenant_id, organization_id, pricing_rule_id) REFERENCES ai_pricing_rule (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_pricing_tier_quantity_range CHECK ((min_quantity IS NULL OR min_quantity >= 0) AND (max_quantity IS NULL OR max_quantity >= 0) AND (min_quantity IS NULL OR max_quantity IS NULL OR max_quantity >= min_quantity) AND (quantity_step IS NULL OR quantity_step > 0) AND (included_quantity IS NULL OR included_quantity >= 0)),
    CONSTRAINT ck_ai_pricing_tier_non_negative_amounts CHECK ((input_unit_price IS NULL OR input_unit_price >= 0) AND (output_unit_price IS NULL OR output_unit_price >= 0) AND (cache_write_unit_price IS NULL OR cache_write_unit_price >= 0) AND (cache_read_unit_price IS NULL OR cache_read_unit_price >= 0) AND (image_unit_price IS NULL OR image_unit_price >= 0) AND (audio_unit_price IS NULL OR audio_unit_price >= 0) AND (video_unit_price IS NULL OR video_unit_price >= 0) AND (per_request_price IS NULL OR per_request_price >= 0) AND (multiplier IS NULL OR multiplier >= 0)),
    CONSTRAINT ck_ai_pricing_tier_effective_interval CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_tier_uuid ON ai_pricing_tier (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_tier_rule_code ON ai_pricing_tier (tenant_id, organization_id, pricing_rule_id, tier_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_pricing_tier_tenant_status_effective ON ai_pricing_tier (tenant_id, organization_id, status, effective_from, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_tier_rule_range ON ai_pricing_tier (tenant_id, organization_id, pricing_rule_id, billing_meter_code, min_quantity, max_quantity, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_tier_model_pricing ON ai_pricing_tier (tenant_id, organization_id, model_pricing_id, price_item_type, sort_order, id);

CREATE TABLE IF NOT EXISTS ai_quota_policy (
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
    policy_code VARCHAR(64),
    name VARCHAR(128),
    subject_type INTEGER,
    subject_id BIGINT,
    subject_ref_hash VARCHAR(128),
    subject_ref_masked VARCHAR(128),
    scope_type INTEGER,
    scope_id BIGINT,
    account_group_id BIGINT,
    model VARCHAR(256),
    quota_period INTEGER,
    quota_unit INTEGER,
    quota_limit NUMERIC(38, 12),
    requests_per_second BIGINT,
    requests_per_minute BIGINT,
    requests_per_day BIGINT,
    tokens_per_minute BIGINT,
    burst_limit NUMERIC(38, 12),
    block_duration_seconds BIGINT,
    reset_mode INTEGER,
    exhausted_at TIMESTAMPTZ,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_ai_quota_policy_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_quota_policy_tenant_subject ON ai_quota_policy (tenant_id, organization_id, subject_type, subject_id, quota_period, quota_unit) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_quota_policy_subject_ref ON ai_quota_policy (tenant_id, organization_id, subject_type, subject_ref_hash, status);
CREATE INDEX IF NOT EXISTS idx_ai_quota_policy_model_account_group ON ai_quota_policy (tenant_id, organization_id, model, account_group_id, status);

CREATE TABLE IF NOT EXISTS ai_request_trace (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    request_id VARCHAR(128) NOT NULL,
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    attempt_no INTEGER NOT NULL,
    decision_log_id BIGINT,
    api_key_id BIGINT,
    api_key_name_snapshot VARCHAR(128),
    account_group_id BIGINT,
    account_group_snapshot VARCHAR(128),
    owner_type INTEGER,
    owner_id BIGINT,
    owner_name_snapshot VARCHAR(128),
    supplier_id BIGINT,
    account_id BIGINT,
    account_name_snapshot VARCHAR(128),
    requested_model VARCHAR(256),
    requested_model_catalog_key VARCHAR(256),
    provider_model VARCHAR(256),
    provider_native_model VARCHAR(256),
    gateway_instance_id BIGINT,
    gateway_instance_code_snapshot VARCHAR(128),
    gateway_region_code_snapshot VARCHAR(64),
    gateway_node_name_snapshot VARCHAR(128),
    region_code VARCHAR(64),
    endpoint VARCHAR(256),
    request_path VARCHAR(256),
    http_method VARCHAR(16),
    http_status INTEGER,
    provider_error_code VARCHAR(128),
    error_type VARCHAR(128),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    latency_ms INTEGER,
    ttft_ms INTEGER,
    streaming BOOLEAN,
    request_bytes BIGINT,
    response_bytes BIGINT,
    prompt_tokens BIGINT,
    completion_tokens BIGINT,
    cached_tokens BIGINT,
    total_tokens BIGINT,
    request_payload_hash VARCHAR(128),
    response_payload_hash VARCHAR(128),
    error_message_masked VARCHAR(1024),
    reasoning_effort VARCHAR(64),
    client_ip_hash VARCHAR(128),
    client_ip_masked VARCHAR(64),
    client_ip_region VARCHAR(128),
    user_agent_hash VARCHAR(128),
    CONSTRAINT ck_ai_request_trace_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT ck_ai_request_trace_attempt CHECK (attempt_no >= 1),
    CONSTRAINT ck_ai_request_trace_http_status CHECK (http_status IS NULL OR http_status BETWEEN 100 AND 599),
    CONSTRAINT ck_ai_request_trace_non_negative_metrics CHECK ((latency_ms IS NULL OR latency_ms >= 0) AND (ttft_ms IS NULL OR ttft_ms >= 0) AND (prompt_tokens IS NULL OR prompt_tokens >= 0) AND (completion_tokens IS NULL OR completion_tokens >= 0) AND (cached_tokens IS NULL OR cached_tokens >= 0) AND (total_tokens IS NULL OR total_tokens >= 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_request_trace_request_attempt ON ai_request_trace (tenant_id, organization_id, request_id, attempt_no);
CREATE INDEX IF NOT EXISTS idx_ai_request_trace_tenant_trace ON ai_request_trace (tenant_id, organization_id, trace_id);
CREATE INDEX IF NOT EXISTS idx_ai_request_trace_api_key_started ON ai_request_trace (tenant_id, organization_id, api_key_id, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_request_trace_model_started ON ai_request_trace (tenant_id, organization_id, requested_model, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_request_trace_tenant_status_started ON ai_request_trace (tenant_id, organization_id, status, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_request_trace_user_status_started ON ai_request_trace (tenant_id, organization_id, user_id, status, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_request_trace_retention ON ai_request_trace (retention_until, id);

CREATE TABLE IF NOT EXISTS ai_routing_decision_log (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    api_key_id BIGINT,
    policy_id BIGINT,
    profile_id BIGINT,
    rule_id BIGINT,
    requested_model VARCHAR(256),
    resolved_model VARCHAR(256),
    capability INTEGER,
    selected_supplier_id BIGINT,
    selected_account_id BIGINT,
    selected_credential_id BIGINT,
    decision_mode INTEGER,
    decision_reason JSONB,
    candidate_snapshot JSONB,
    fallback_chain JSONB,
    decision_latency_ms INTEGER,
    CONSTRAINT ck_ai_routing_decision_log_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_decision_log_request ON ai_routing_decision_log (tenant_id, organization_id, request_id);
CREATE INDEX IF NOT EXISTS idx_ai_routing_decision_tenant_model_created ON ai_routing_decision_log (tenant_id, organization_id, requested_model, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_routing_decision_log_retention ON ai_routing_decision_log (retention_until, id);

CREATE TABLE IF NOT EXISTS ai_routing_policy (
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
    policy_code VARCHAR(64) NOT NULL,
    name VARCHAR(128),
    policy_scope INTEGER,
    subject_id BIGINT,
    capability INTEGER,
    default_profile_id BIGINT,
    fallback_mode INTEGER,
    slo_latency_ms INTEGER,
    slo_success_rate NUMERIC(38, 12),
    cost_ceiling NUMERIC(38, 12),
    currency VARCHAR(10),
    CONSTRAINT ck_ai_routing_policy_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_routing_policy_non_negative_limits CHECK ((slo_latency_ms IS NULL OR slo_latency_ms >= 0) AND (cost_ceiling IS NULL OR cost_ceiling >= 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_policy_tenant_code ON ai_routing_policy (tenant_id, organization_id, policy_code);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_policy_scope_id ON ai_routing_policy (tenant_id, organization_id, id);

CREATE TABLE IF NOT EXISTS ai_routing_profile (
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
    policy_id BIGINT NOT NULL,
    profile_version BIGINT NOT NULL,
    profile_name VARCHAR(128),
    release_status INTEGER,
    traffic_percent NUMERIC(38, 12),
    config_hash VARCHAR(128),
    published_at TIMESTAMPTZ,
    published_by BIGINT,
    rollback_from_profile_id BIGINT,
    CONSTRAINT ck_ai_routing_profile_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_routing_profile_policy FOREIGN KEY (tenant_id, organization_id, policy_id) REFERENCES ai_routing_policy (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_routing_profile_version CHECK (profile_version > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_profile_policy_version ON ai_routing_profile (policy_id, profile_version) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_profile_scope_id ON ai_routing_profile (tenant_id, organization_id, id);

CREATE TABLE IF NOT EXISTS ai_routing_rule (
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
    profile_id BIGINT NOT NULL,
    rule_code VARCHAR(64) NOT NULL,
    priority INTEGER,
    match_expression JSONB,
    target_model VARCHAR(256),
    candidate_account_groups JSONB,
    fallback_chain JSONB,
    constraints JSONB,
    rate_limit_policy_id BIGINT,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_ai_routing_rule_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_routing_rule_profile FOREIGN KEY (tenant_id, organization_id, profile_id) REFERENCES ai_routing_profile (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_routing_rule_priority CHECK (priority IS NULL OR priority >= 0),
    CONSTRAINT ck_ai_routing_rule_effective_interval CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_rule_profile_code ON ai_routing_rule (profile_id, rule_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_routing_rule_tenant_profile_priority ON ai_routing_rule (tenant_id, organization_id, profile_id, priority, status);

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
    cost_amount NUMERIC(38, 12),
    currency VARCHAR(10),
    occurred_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_ai_runtime_usage_link_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT ck_ai_runtime_usage_link_subject_scope CHECK (tenant_id > 0 AND organization_id >= 0 AND user_id > 0),
    CONSTRAINT ck_ai_runtime_usage_link_non_negative_values CHECK (input_tokens >= 0 AND output_tokens >= 0 AND cached_tokens >= 0 AND reasoning_tokens >= 0 AND total_tokens >= 0 AND (cost_amount IS NULL OR cost_amount >= 0) AND (usage_fact_id IS NULL OR usage_fact_id > 0)),
    CONSTRAINT ck_ai_runtime_usage_link_usage_type CHECK (length(trim(usage_type)) > 0),
    CONSTRAINT ck_ai_runtime_usage_link_currency CHECK (currency IS NULL OR length(trim(currency)) BETWEEN 3 AND 10)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_runtime_usage_link_scope_id ON ai_runtime_usage_link (tenant_id, organization_id, user_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_runtime_usage_link_scope_uuid ON ai_runtime_usage_link (tenant_id, organization_id, user_id, uuid);
CREATE INDEX IF NOT EXISTS idx_ai_runtime_usage_link_message ON ai_runtime_usage_link (tenant_id, organization_id, user_id, message_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_runtime_usage_link_invocation ON ai_runtime_usage_link (tenant_id, organization_id, user_id, runtime_invocation_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_runtime_usage_link_usage_fact ON ai_runtime_usage_link (tenant_id, organization_id, user_id, usage_fact_id, id);

CREATE TABLE IF NOT EXISTS ai_upstream_supplier (
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
    supplier_code VARCHAR(64) NOT NULL,
    supplier_name VARCHAR(128) NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    icon_drive_uri VARCHAR(512),
    icon_resource_snapshot JSONB,
    color_token VARCHAR(64),
    docs_url VARCHAR(512),
    website_url VARCHAR(512),
    default_vendor_code VARCHAR(64),
    supplier_type VARCHAR(32) NOT NULL DEFAULT 'official',
    adapter_code VARCHAR(64) NOT NULL,
    protocol_code VARCHAR(64) NOT NULL,
    owner_kind VARCHAR(32),
    region_code VARCHAR(64),
    environment INTEGER NOT NULL DEFAULT 1,
    metadata_schema_version VARCHAR(32),
    sort_order INTEGER NOT NULL DEFAULT 100,
    CONSTRAINT ck_ai_upstream_supplier_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_upstream_supplier_type CHECK (supplier_type IN ('official', 'relay'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_supplier_uuid ON ai_upstream_supplier (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_supplier_tenant_code ON ai_upstream_supplier (tenant_id, organization_id, supplier_code);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_supplier_scope_id ON ai_upstream_supplier (tenant_id, organization_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_supplier_scope_identity ON ai_upstream_supplier (tenant_id, organization_id, id, supplier_code);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_supplier_status_sort ON ai_upstream_supplier (tenant_id, organization_id, status, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_supplier_adapter_status ON ai_upstream_supplier (tenant_id, organization_id, adapter_code, protocol_code, status, id);

CREATE TABLE IF NOT EXISTS ai_upstream_supplier_endpoint (
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
    supplier_id BIGINT NOT NULL,
    supplier_code VARCHAR(64) NOT NULL,
    endpoint_code VARCHAR(64) NOT NULL,
    endpoint_name VARCHAR(128) NOT NULL,
    base_url VARCHAR(512) NOT NULL,
    protocol_code VARCHAR(64),
    region_code VARCHAR(64),
    environment INTEGER NOT NULL DEFAULT 1,
    priority INTEGER NOT NULL DEFAULT 100,
    routing_weight INTEGER NOT NULL DEFAULT 100,
    timeout_ms INTEGER,
    CONSTRAINT ck_ai_upstream_supplier_endpoint_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_upstream_supplier_endpoint_supplier FOREIGN KEY (tenant_id, organization_id, supplier_id, supplier_code) REFERENCES ai_upstream_supplier (tenant_id, organization_id, id, supplier_code) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_upstream_supplier_endpoint_values CHECK (priority >= 0 AND routing_weight >= 0 AND (timeout_ms IS NULL OR timeout_ms > 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_supplier_endpoint_uuid ON ai_upstream_supplier_endpoint (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_supplier_endpoint_tenant_code ON ai_upstream_supplier_endpoint (tenant_id, organization_id, supplier_id, endpoint_code);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_supplier_endpoint_scope_id ON ai_upstream_supplier_endpoint (tenant_id, organization_id, supplier_id, id);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_supplier_endpoint_supplier_status ON ai_upstream_supplier_endpoint (tenant_id, organization_id, supplier_id, status, priority, routing_weight, id);

CREATE TABLE IF NOT EXISTS ai_upstream_supplier_auth_method (
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
    supplier_id BIGINT NOT NULL,
    supplier_code VARCHAR(64) NOT NULL,
    auth_method_code VARCHAR(64) NOT NULL,
    auth_method_name VARCHAR(128) NOT NULL,
    auth_type VARCHAR(64) NOT NULL,
    config_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    runtime_auth_config JSONB NOT NULL,
    priority INTEGER NOT NULL DEFAULT 100,
    CONSTRAINT ck_ai_upstream_supplier_auth_method_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_upstream_supplier_auth_method_supplier FOREIGN KEY (tenant_id, organization_id, supplier_id, supplier_code) REFERENCES ai_upstream_supplier (tenant_id, organization_id, id, supplier_code) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_upstream_supplier_auth_method_type CHECK (auth_type IN ('api_key', 'bearer_token', 'custom') AND priority >= 0),
    CONSTRAINT ck_ai_upstream_supplier_auth_method_runtime_auth_config CHECK (jsonb_typeof(runtime_auth_config) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_supplier_auth_method_uuid ON ai_upstream_supplier_auth_method (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_supplier_auth_method_supplier_code ON ai_upstream_supplier_auth_method (tenant_id, organization_id, supplier_id, auth_method_code);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_supplier_auth_method_supplier_status ON ai_upstream_supplier_auth_method (tenant_id, organization_id, supplier_id, status, priority, id);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_supplier_auth_method_type_status ON ai_upstream_supplier_auth_method (tenant_id, organization_id, auth_type, status, id);

CREATE TABLE IF NOT EXISTS ai_upstream_account (
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
    supplier_id BIGINT NOT NULL,
    supplier_code VARCHAR(64) NOT NULL,
    preferred_endpoint_id BIGINT,
    account_code VARCHAR(64) NOT NULL,
    account_name VARCHAR(128) NOT NULL,
    account_type VARCHAR(32) NOT NULL DEFAULT 'standard',
    auth_method_code VARCHAR(64) NOT NULL,
    external_account_id VARCHAR(128),
    credential_rotation_policy JSONB,
    credential_rotation_strategy VARCHAR(64) NOT NULL DEFAULT 'default',
    environment INTEGER,
    region_code VARCHAR(64),
    quota_unit INTEGER,
    quota_limit NUMERIC(38, 12),
    quota_used NUMERIC(38, 12),
    upstream_balance_amount NUMERIC(38, 12),
    upstream_balance_currency VARCHAR(10),
    contract_cost_multiplier NUMERIC(38, 12) NOT NULL DEFAULT 1,
    last_balance_checked_at TIMESTAMPTZ,
    last_rotated_at TIMESTAMPTZ,
    next_rotate_at TIMESTAMPTZ,
    rpm_limit BIGINT,
    timeout_ms INTEGER,
    retry_policy JSONB,
    circuit_breaker_policy JSONB,
    proxy_id BIGINT,
    risk_level INTEGER,
    CONSTRAINT ck_ai_upstream_account_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_upstream_account_supplier FOREIGN KEY (tenant_id, organization_id, supplier_id, supplier_code) REFERENCES ai_upstream_supplier (tenant_id, organization_id, id, supplier_code) ON DELETE RESTRICT,
    CONSTRAINT fk_ai_upstream_account_preferred_endpoint FOREIGN KEY (tenant_id, organization_id, supplier_id, preferred_endpoint_id) REFERENCES ai_upstream_supplier_endpoint (tenant_id, organization_id, supplier_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_ai_upstream_account_auth_method FOREIGN KEY (tenant_id, organization_id, supplier_id, auth_method_code) REFERENCES ai_upstream_supplier_auth_method (tenant_id, organization_id, supplier_id, auth_method_code) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_upstream_account_financial_values CHECK (contract_cost_multiplier > 0 AND (quota_limit IS NULL OR quota_limit >= 0) AND (quota_used IS NULL OR quota_used >= 0) AND (upstream_balance_amount IS NULL OR upstream_balance_amount >= 0)),
    CONSTRAINT ck_ai_upstream_account_timeout CHECK (timeout_ms IS NULL OR timeout_ms > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_uuid ON ai_upstream_account (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_tenant_code ON ai_upstream_account (tenant_id, organization_id, account_code);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_scope_id ON ai_upstream_account (tenant_id, organization_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_scope_auth_method ON ai_upstream_account (tenant_id, organization_id, id, auth_method_code);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_account_supplier_status ON ai_upstream_account (tenant_id, organization_id, supplier_id, status, id);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_account_preferred_endpoint ON ai_upstream_account (tenant_id, organization_id, preferred_endpoint_id, status, id);

CREATE TABLE IF NOT EXISTS ai_upstream_account_credential (
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
    account_id BIGINT NOT NULL,
    auth_method_code VARCHAR(64) NOT NULL,
    credential_name VARCHAR(128) NOT NULL,
    secret_ciphertext TEXT NOT NULL,
    secret_key_id VARCHAR(64) NOT NULL,
    secret_fingerprint VARCHAR(128) NOT NULL,
    masked_label VARCHAR(128),
    credential_version BIGINT NOT NULL DEFAULT 1,
    priority INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    last_rotated_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    CONSTRAINT ck_ai_upstream_account_credential_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_upstream_account_credential_account FOREIGN KEY (tenant_id, organization_id, account_id, auth_method_code) REFERENCES ai_upstream_account (tenant_id, organization_id, id, auth_method_code) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_upstream_account_credential_version CHECK (credential_version > 0 AND priority >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_credential_uuid ON ai_upstream_account_credential (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_credential_version ON ai_upstream_account_credential (tenant_id, organization_id, account_id, credential_version);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_account_credential_account ON ai_upstream_account_credential (tenant_id, organization_id, account_id, status, is_active, priority, id);

CREATE TABLE IF NOT EXISTS ai_upstream_account_group (
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
    group_code VARCHAR(64) NOT NULL,
    group_name VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    group_type VARCHAR(32) NOT NULL DEFAULT 'shared',
    routing_strategy VARCHAR(32) NOT NULL DEFAULT 'weighted',
    fallback_mode VARCHAR(32) NOT NULL DEFAULT 'sequential',
    priority INTEGER NOT NULL DEFAULT 100,
    routing_policy_id BIGINT,
    quota_policy_id BIGINT,
    rate_limit_policy_id BIGINT,
    environment INTEGER,
    pricing_plan_id BIGINT,
    pricing_plan_code VARCHAR(64),
    cost_multiplier NUMERIC(38, 12) NOT NULL DEFAULT 1,
    sale_multiplier NUMERIC(38, 12) NOT NULL DEFAULT 1,
    billing_type INTEGER,
    capacity_limit BIGINT,
    allowed_origin JSONB,
    vendor_code VARCHAR(64),
    modalities JSONB NOT NULL DEFAULT '[]'::jsonb,
    CONSTRAINT ck_ai_upstream_account_group_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_upstream_account_group_routing_strategy CHECK (routing_strategy IN ('weighted', 'round_robin', 'least_latency', 'least_cost', 'failover')),
    CONSTRAINT ck_ai_upstream_account_group_fallback_mode CHECK (fallback_mode IN ('none', 'sequential', 'same_supplier', 'cross_supplier')),
    CONSTRAINT ck_ai_upstream_account_group_financial_values CHECK (cost_multiplier > 0 AND sale_multiplier > 0 AND priority >= 0 AND (capacity_limit IS NULL OR capacity_limit >= 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_group_uuid ON ai_upstream_account_group (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_group_tenant_code ON ai_upstream_account_group (tenant_id, organization_id, group_code);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_group_scope_id ON ai_upstream_account_group (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_account_group_tenant_status_updated ON ai_upstream_account_group (tenant_id, organization_id, status, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_account_group_pricing ON ai_upstream_account_group (tenant_id, organization_id, pricing_plan_id, status, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_account_group_vendor ON ai_upstream_account_group (tenant_id, organization_id, vendor_code, status, id);

CREATE TABLE IF NOT EXISTS ai_upstream_account_group_member (
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
    account_group_id BIGINT NOT NULL,
    account_id BIGINT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 100,
    routing_weight INTEGER NOT NULL DEFAULT 100,
    cost_multiplier_override NUMERIC(38, 12),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_ai_upstream_account_group_member_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_upstream_account_group_member_group FOREIGN KEY (tenant_id, organization_id, account_group_id) REFERENCES ai_upstream_account_group (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_ai_upstream_account_group_member_account FOREIGN KEY (tenant_id, organization_id, account_id) REFERENCES ai_upstream_account (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_upstream_account_group_member_non_negative_weighting CHECK (priority >= 0 AND routing_weight >= 0 AND (cost_multiplier_override IS NULL OR cost_multiplier_override > 0)),
    CONSTRAINT ck_ai_upstream_account_group_member_effective_interval CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_group_member_uuid ON ai_upstream_account_group_member (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_group_member ON ai_upstream_account_group_member (tenant_id, organization_id, account_group_id, account_id);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_account_group_member_status ON ai_upstream_account_group_member (tenant_id, organization_id, status, account_group_id, priority, id);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_account_group_member_group ON ai_upstream_account_group_member (tenant_id, organization_id, account_group_id, status, priority, routing_weight, id);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_account_group_member_account ON ai_upstream_account_group_member (tenant_id, organization_id, account_id, status, id);

CREATE TABLE IF NOT EXISTS ai_upstream_account_group_metric_snapshot (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    source_type VARCHAR(128),
    source_id BIGINT,
    source_version BIGINT NOT NULL,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rebuild_version BIGINT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    account_group_id BIGINT NOT NULL,
    group_code VARCHAR(64),
    account_available_count BIGINT,
    account_total_count BIGINT,
    capacity_used NUMERIC(38, 12),
    capacity_limit NUMERIC(38, 12),
    request_count_today BIGINT,
    request_count_total BIGINT,
    usage_amount_today NUMERIC(38, 12),
    usage_amount_total NUMERIC(38, 12),
    health_status INTEGER,
    snapshot_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_ai_upstream_account_group_metric_snapshot_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT ck_ai_upstream_account_group_metric_counts CHECK ((account_available_count IS NULL OR account_available_count >= 0) AND (account_total_count IS NULL OR account_total_count >= 0) AND (request_count_today IS NULL OR request_count_today >= 0) AND (request_count_total IS NULL OR request_count_total >= 0)),
    CONSTRAINT ck_ai_upstream_account_group_metric_amounts CHECK ((capacity_used IS NULL OR capacity_used >= 0) AND (capacity_limit IS NULL OR capacity_limit >= 0) AND (usage_amount_today IS NULL OR usage_amount_today >= 0) AND (usage_amount_total IS NULL OR usage_amount_total >= 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_group_metric_snapshot_uuid ON ai_upstream_account_group_metric_snapshot (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_group_metric_snapshot ON ai_upstream_account_group_metric_snapshot (tenant_id, organization_id, account_group_id, snapshot_at);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_account_group_metric_tenant_status ON ai_upstream_account_group_metric_snapshot (tenant_id, organization_id, status, snapshot_at, id);

CREATE TABLE IF NOT EXISTS ai_upstream_account_group_resource (
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
    account_group_id BIGINT NOT NULL,
    resource_id BIGINT,
    resource_code VARCHAR(192) NOT NULL DEFAULT '',
    resource_group_id BIGINT,
    resource_group_code VARCHAR(128) NOT NULL DEFAULT '',
    grant_type VARCHAR(32) NOT NULL DEFAULT 'allow',
    priority INTEGER NOT NULL DEFAULT 100,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_ai_upstream_account_group_resource_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_upstream_account_group_resource_group FOREIGN KEY (tenant_id, organization_id, account_group_id) REFERENCES ai_upstream_account_group (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_upstream_account_group_resource_target CHECK ((NULLIF(resource_code, '') IS NOT NULL) <> (NULLIF(resource_group_code, '') IS NOT NULL) AND grant_type IN ('allow', 'deny') AND priority >= 0 AND (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_group_resource_uuid ON ai_upstream_account_group_resource (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_group_resource ON ai_upstream_account_group_resource (tenant_id, organization_id, account_group_id, resource_code, resource_group_code);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_account_group_resource_status ON ai_upstream_account_group_resource (tenant_id, organization_id, status, account_group_id, grant_type, priority, id);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_account_group_resource_lookup ON ai_upstream_account_group_resource (tenant_id, organization_id, account_group_id, status, grant_type, priority, id);

CREATE TABLE IF NOT EXISTS ai_upstream_account_health_state (
    id BIGINT NOT NULL PRIMARY KEY,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    account_id BIGINT NOT NULL,
    health_status INTEGER NOT NULL DEFAULT 0,
    last_latency_ms INTEGER,
    consecutive_error_count BIGINT NOT NULL DEFAULT 0,
    last_verified_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    CONSTRAINT ck_ai_upstream_account_health_state_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_upstream_account_health_state_account FOREIGN KEY (tenant_id, organization_id, account_id) REFERENCES ai_upstream_account (tenant_id, organization_id, id) ON DELETE CASCADE,
    CONSTRAINT ck_ai_upstream_account_health_state_identity CHECK (id = account_id),
    CONSTRAINT ck_ai_upstream_account_health_state_values CHECK (health_status IN (0, 1, 2) AND (last_latency_ms IS NULL OR last_latency_ms >= 0) AND consecutive_error_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_health_state_scope ON ai_upstream_account_health_state (tenant_id, organization_id, account_id);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_account_health_state_health ON ai_upstream_account_health_state (tenant_id, organization_id, health_status, updated_at, account_id);

CREATE TABLE IF NOT EXISTS ai_upstream_object_route (
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
    api_key_id BIGINT,
    account_group_id BIGINT,
    object_type VARCHAR(64) NOT NULL,
    object_id VARCHAR(256) NOT NULL,
    object_key_hash VARCHAR(128) NOT NULL,
    parent_object_type VARCHAR(64),
    parent_object_id VARCHAR(256),
    supplier_code VARCHAR(64),
    account_id BIGINT NOT NULL,
    vendor_code VARCHAR(64),
    api_code VARCHAR(128),
    catalog_key VARCHAR(256),
    provider_model VARCHAR(256),
    region_code VARCHAR(64),
    sticky_scope VARCHAR(64),
    expires_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    CONSTRAINT ck_ai_upstream_object_route_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_object_route_uuid ON ai_upstream_object_route (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_object_route_object ON ai_upstream_object_route (tenant_id, organization_id, object_type, object_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_upstream_object_route_fast ON ai_upstream_object_route (tenant_id, organization_id, object_key_hash, status, id);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_object_route_parent ON ai_upstream_object_route (tenant_id, organization_id, parent_object_type, parent_object_id, status, id);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_object_route_account ON ai_upstream_object_route (tenant_id, organization_id, account_group_id, account_id, status, id);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_object_route_expiry ON ai_upstream_object_route (tenant_id, organization_id, expires_at, status, id);

CREATE TABLE IF NOT EXISTS ai_upstream_supplier_endpoint_health_state (
    id BIGINT NOT NULL PRIMARY KEY,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    supplier_id BIGINT NOT NULL,
    endpoint_id BIGINT NOT NULL,
    health_status INTEGER NOT NULL DEFAULT 0,
    last_latency_ms INTEGER,
    consecutive_error_count BIGINT NOT NULL DEFAULT 0,
    last_checked_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    CONSTRAINT ck_ai_upstream_supplier_endpoint_health_state_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_upstream_supplier_endpoint_health_state_endpoint FOREIGN KEY (tenant_id, organization_id, supplier_id, endpoint_id) REFERENCES ai_upstream_supplier_endpoint (tenant_id, organization_id, supplier_id, id) ON DELETE CASCADE,
    CONSTRAINT ck_ai_upstream_supplier_endpoint_health_state_identity CHECK (id = endpoint_id),
    CONSTRAINT ck_ai_upstream_supplier_endpoint_health_state_values CHECK (health_status IN (0, 1, 2) AND (last_latency_ms IS NULL OR last_latency_ms >= 0) AND consecutive_error_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_supplier_endpoint_health_state_scope ON ai_upstream_supplier_endpoint_health_state (tenant_id, organization_id, endpoint_id);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_supplier_endpoint_health_state_health ON ai_upstream_supplier_endpoint_health_state (tenant_id, organization_id, health_status, updated_at, endpoint_id);

CREATE TABLE IF NOT EXISTS ai_upstream_supplier_resource (
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
    supplier_id BIGINT NOT NULL,
    supplier_code VARCHAR(64) NOT NULL,
    resource_id BIGINT,
    resource_code VARCHAR(192) NOT NULL DEFAULT '',
    resource_group_id BIGINT,
    resource_group_code VARCHAR(128) NOT NULL DEFAULT '',
    grant_type VARCHAR(32) NOT NULL DEFAULT 'allow',
    priority INTEGER NOT NULL DEFAULT 100,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_ai_upstream_supplier_resource_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_upstream_supplier_resource_supplier FOREIGN KEY (tenant_id, organization_id, supplier_id, supplier_code) REFERENCES ai_upstream_supplier (tenant_id, organization_id, id, supplier_code) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_upstream_supplier_resource_target CHECK ((NULLIF(resource_code, '') IS NOT NULL) <> (NULLIF(resource_group_code, '') IS NOT NULL) AND grant_type IN ('allow', 'deny') AND priority >= 0 AND (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_supplier_resource_uuid ON ai_upstream_supplier_resource (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_supplier_resource ON ai_upstream_supplier_resource (tenant_id, organization_id, supplier_id, resource_code, resource_group_code);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_supplier_resource_lookup ON ai_upstream_supplier_resource (tenant_id, organization_id, status, supplier_id, grant_type, priority, id);

CREATE TABLE IF NOT EXISTS ai_usage (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    request_id VARCHAR(128) NOT NULL,
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    idempotency_key VARCHAR(128) NOT NULL,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    decision_log_id BIGINT,
    api_key_id BIGINT,
    api_key_name_snapshot VARCHAR(128),
    account_group_id BIGINT,
    account_group_snapshot VARCHAR(128),
    owner_type INTEGER,
    owner_id BIGINT,
    owner_name_snapshot VARCHAR(128),
    catalog_key VARCHAR(256) NOT NULL,
    requested_model_catalog_key VARCHAR(256),
    model VARCHAR(256),
    provider_native_model VARCHAR(256),
    region_code VARCHAR(64),
    supplier_id BIGINT,
    account_id BIGINT,
    modality INTEGER,
    usage_type INTEGER NOT NULL,
    billing_type INTEGER,
    billing_mode INTEGER,
    billing_meter_id BIGINT,
    billing_meter_code VARCHAR(64) NOT NULL,
    billing_tier VARCHAR(64),
    billable_quantity NUMERIC(38, 12) NOT NULL,
    billable_unit INTEGER,
    prompt_tokens BIGINT,
    completion_tokens BIGINT,
    cached_tokens BIGINT,
    total_tokens BIGINT,
    request_count BIGINT,
    result_count BIGINT,
    item_count BIGINT,
    character_count BIGINT,
    image_count BIGINT,
    audio_seconds NUMERIC(38, 12),
    video_seconds NUMERIC(38, 12),
    storage_byte_hours NUMERIC(38, 12),
    bandwidth_bytes BIGINT,
    base_input_unit_price NUMERIC(38, 12),
    base_output_unit_price NUMERIC(38, 12),
    cache_read_unit_price NUMERIC(38, 12),
    rate_multiplier NUMERIC(38, 12),
    reference_multiplier NUMERIC(38, 12),
    official_reference_amount NUMERIC(38, 12),
    upstream_cost_amount NUMERIC(38, 12),
    customer_charge_amount NUMERIC(38, 12),
    currency VARCHAR(10) NOT NULL,
    pricing_id BIGINT,
    pricing_plan_id BIGINT,
    pricing_plan_code VARCHAR(64),
    pricing_rule_id BIGINT,
    pricing_tier_id BIGINT,
    pricing_snapshot JSONB,
    reasoning_effort VARCHAR(64),
    occurred_at TIMESTAMPTZ NOT NULL,
    settlement_status INTEGER NOT NULL,
    settlement_id BIGINT,
    CONSTRAINT ck_ai_usage_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT ck_ai_usage_non_negative_counts CHECK ((prompt_tokens IS NULL OR prompt_tokens >= 0) AND (completion_tokens IS NULL OR completion_tokens >= 0) AND (cached_tokens IS NULL OR cached_tokens >= 0) AND (total_tokens IS NULL OR total_tokens >= 0) AND (request_count IS NULL OR request_count >= 0) AND (result_count IS NULL OR result_count >= 0) AND (item_count IS NULL OR item_count >= 0) AND (character_count IS NULL OR character_count >= 0) AND (image_count IS NULL OR image_count >= 0)),
    CONSTRAINT ck_ai_usage_non_negative_amounts CHECK (billable_quantity >= 0 AND (audio_seconds IS NULL OR audio_seconds >= 0) AND (video_seconds IS NULL OR video_seconds >= 0) AND (storage_byte_hours IS NULL OR storage_byte_hours >= 0) AND (official_reference_amount IS NULL OR official_reference_amount >= 0) AND (upstream_cost_amount IS NULL OR upstream_cost_amount >= 0) AND (customer_charge_amount IS NULL OR customer_charge_amount >= 0)),
    CONSTRAINT ck_ai_usage_currency CHECK (length(trim(currency)) BETWEEN 3 AND 10)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_usage_scope_id ON ai_usage (tenant_id, organization_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_usage_idempotency ON ai_usage (tenant_id, organization_id, idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_usage_request ON ai_usage (tenant_id, organization_id, request_id, usage_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant_owner_occurred ON ai_usage (tenant_id, organization_id, owner_type, owner_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_api_key_occurred ON ai_usage (tenant_id, organization_id, api_key_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model_occurred ON ai_usage (tenant_id, organization_id, catalog_key, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_pricing_plan_occurred ON ai_usage (tenant_id, organization_id, pricing_plan_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_meter_occurred ON ai_usage (tenant_id, organization_id, billing_meter_code, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_settlement_status ON ai_usage (tenant_id, organization_id, settlement_status, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_retention ON ai_usage (retention_until, id);

CREATE TABLE IF NOT EXISTS iam_gateway_access_policy (
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
    name VARCHAR(128),
    policy_type INTEGER,
    subject_type INTEGER,
    subject_id BIGINT,
    subject_ref_hash VARCHAR(128),
    subject_ref_masked VARCHAR(128),
    allowed_capabilities JSONB,
    denied_capabilities JSONB,
    allowed_models JSONB,
    denied_models JSONB,
    network_policy_mode INTEGER,
    ip_rule_count INTEGER,
    ip_allowlist JSONB,
    ip_denylist JSONB,
    region_allowlist JSONB,
    max_context_tokens BIGINT,
    data_retention_mode INTEGER,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_iam_gateway_access_policy_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE INDEX IF NOT EXISTS idx_iam_gateway_access_policy_tenant_subject_status ON iam_gateway_access_policy (tenant_id, organization_id, subject_type, subject_id, status);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_access_policy_subject_ref ON iam_gateway_access_policy (tenant_id, organization_id, subject_type, subject_ref_hash, status);

CREATE TABLE IF NOT EXISTS iam_gateway_api_key (
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
    user_id BIGINT NOT NULL,
    owner_type INTEGER,
    owner_id BIGINT,
    account_group_id BIGINT NOT NULL,
    name VARCHAR(128) NOT NULL,
    key_prefix VARCHAR(32) NOT NULL,
    key_display_masked VARCHAR(64) NOT NULL,
    key_hash VARCHAR(128) NOT NULL,
    hash_alg VARCHAR(32) NOT NULL,
    secret_version BIGINT NOT NULL,
    key_secret_mode VARCHAR(16) NOT NULL DEFAULT 'plaintext',
    key_secret_plaintext TEXT,
    key_secret_ciphertext TEXT,
    key_secret_key_id VARCHAR(64),
    idempotency_key VARCHAR(128) NOT NULL,
    policy_id BIGINT,
    quota_policy_id BIGINT,
    rate_limit_policy_id BIGINT,
    environment INTEGER,
    expire_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    last_used_ip_hash VARCHAR(128),
    last_used_ip_masked VARCHAR(64),
    last_used_ip_region VARCHAR(128),
    last_revealed_at TIMESTAMPTZ,
    rotated_from_key_id BIGINT,
    revoked_at TIMESTAMPTZ,
    revoked_by BIGINT,
    CONSTRAINT ck_iam_gateway_api_key_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_hash ON iam_gateway_api_key (key_hash) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_idempotency ON iam_gateway_api_key (tenant_id, idempotency_key) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_scope_id ON iam_gateway_api_key (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_api_key_tenant_user_status ON iam_gateway_api_key (tenant_id, organization_id, user_id, status, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_api_key_ai_account_group_status ON iam_gateway_api_key (tenant_id, organization_id, account_group_id, status, updated_at, id);

CREATE TABLE IF NOT EXISTS iam_gateway_api_key_account_group (
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
    user_id BIGINT NOT NULL,
    owner_type INTEGER,
    owner_id BIGINT,
    api_key_id BIGINT NOT NULL DEFAULT 0,
    account_group_id BIGINT NOT NULL DEFAULT 0,
    account_group_code VARCHAR(64),
    binding_role VARCHAR(32) NOT NULL DEFAULT 'route',
    routing_strategy VARCHAR(32) NOT NULL DEFAULT 'auto',
    priority INTEGER NOT NULL DEFAULT 100,
    weight INTEGER NOT NULL DEFAULT 100,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_iam_gateway_api_key_account_group_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_iam_gateway_api_key_account_group_api_key FOREIGN KEY (tenant_id, organization_id, api_key_id) REFERENCES iam_gateway_api_key (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_iam_gateway_api_key_account_group_ids CHECK (api_key_id > 0 AND account_group_id > 0),
    CONSTRAINT ck_iam_gateway_api_key_account_group_weighting CHECK (priority >= 0 AND weight >= 0),
    CONSTRAINT ck_iam_gateway_api_key_account_group_effective_interval CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_account_group_uuid ON iam_gateway_api_key_account_group (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_account_group_binding ON iam_gateway_api_key_account_group (tenant_id, organization_id, api_key_id, account_group_id, binding_role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_iam_gateway_api_key_account_group_active ON iam_gateway_api_key_account_group (tenant_id, organization_id, api_key_id, status, priority, weight, id);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_api_key_account_group_group ON iam_gateway_api_key_account_group (tenant_id, organization_id, account_group_id, status, priority, id);

CREATE TABLE IF NOT EXISTS iam_gateway_chain_policy (
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
    policy_name VARCHAR(128),
    scope_type INTEGER,
    scope_id BIGINT,
    payload JSONB,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_iam_gateway_chain_policy_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_chain_policy_scope ON iam_gateway_chain_policy (tenant_id, organization_id, scope_type, scope_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_iam_gateway_chain_policy_scope_status ON iam_gateway_chain_policy (tenant_id, organization_id, scope_type, scope_id, status);

CREATE TABLE IF NOT EXISTS iam_gateway_risk_rule (
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
    rule_name VARCHAR(128),
    rule_category INTEGER,
    rule_type INTEGER,
    scope_type INTEGER,
    scope_id BIGINT,
    target_type INTEGER,
    target_value VARCHAR(256),
    target_value_hash VARCHAR(128),
    target_value_masked VARCHAR(128),
    target_value_cipher_ref VARCHAR(256),
    match_mode INTEGER,
    reason VARCHAR(512),
    action INTEGER,
    priority INTEGER,
    requests_per_second BIGINT,
    requests_per_minute BIGINT,
    requests_per_day BIGINT,
    tokens_per_minute BIGINT,
    burst_limit NUMERIC(38, 12),
    block_duration_seconds BIGINT,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    hit_count BIGINT,
    last_hit_at TIMESTAMPTZ,
    CONSTRAINT ck_iam_gateway_risk_rule_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_risk_rule_tenant_target ON iam_gateway_risk_rule (tenant_id, organization_id, rule_type, target_type, target_value) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_iam_gateway_risk_rule_scope_priority ON iam_gateway_risk_rule (tenant_id, organization_id, rule_category, scope_type, scope_id, priority, status);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_risk_rule_target_hash ON iam_gateway_risk_rule (tenant_id, organization_id, target_type, target_value_hash, status);

CREATE TABLE IF NOT EXISTS ops_alert_event (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    alert_no VARCHAR(128),
    severity INTEGER,
    source VARCHAR(128),
    title VARCHAR(200),
    message VARCHAR(1024),
    alert_status INTEGER,
    first_seen_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolved_by BIGINT,
    CONSTRAINT ck_ops_alert_event_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_alert_event_no ON ops_alert_event (alert_no);
CREATE INDEX IF NOT EXISTS idx_ops_alert_event_tenant_status_latest ON ops_alert_event (tenant_id, organization_id, status, last_seen_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_alert_event_retention ON ops_alert_event (retention_until, id);

CREATE TABLE IF NOT EXISTS ops_audit_log (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    operator_id BIGINT,
    action VARCHAR(128),
    target_type INTEGER,
    target_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    operator_type INTEGER,
    operator_name_snapshot VARCHAR(128),
    target_uuid VARCHAR(64),
    client_ip_hash VARCHAR(128),
    user_agent_hash VARCHAR(128),
    before_hash VARCHAR(128),
    after_hash VARCHAR(128),
    change_summary JSONB,
    risk_level INTEGER,
    approval_id BIGINT,
    CONSTRAINT ck_ops_audit_log_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ops_audit_log_tenant_operator_created ON ops_audit_log (tenant_id, organization_id, operator_type, operator_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_audit_log_tenant_target_created ON ops_audit_log (tenant_id, organization_id, target_type, target_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_audit_log_request ON ops_audit_log (tenant_id, organization_id, request_id);
CREATE INDEX IF NOT EXISTS idx_ops_audit_log_retention ON ops_audit_log (retention_until, id);

CREATE TABLE IF NOT EXISTS ops_config_snapshot (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    snapshot_no VARCHAR(128),
    config_scope INTEGER,
    config_type INTEGER,
    source_table VARCHAR(128),
    source_ids JSONB,
    config_payload JSONB,
    config_hash VARCHAR(128),
    published_at TIMESTAMPTZ,
    published_by BIGINT,
    rollback_from_snapshot_id BIGINT,
    CONSTRAINT ck_ops_config_snapshot_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_config_snapshot_no ON ops_config_snapshot (snapshot_no);
CREATE INDEX IF NOT EXISTS idx_ops_config_snapshot_tenant_scope ON ops_config_snapshot (tenant_id, organization_id, config_scope, config_type, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_config_snapshot_retention ON ops_config_snapshot (retention_until, id);

CREATE TABLE IF NOT EXISTS ops_gateway_heartbeat (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    instance_id BIGINT,
    heartbeat_at TIMESTAMPTZ,
    cpu_percent NUMERIC(38, 12),
    memory_percent NUMERIC(38, 12),
    disk_percent NUMERIC(38, 12),
    network_in_bytes BIGINT,
    network_out_bytes BIGINT,
    active_connections BIGINT,
    uptime_seconds BIGINT,
    open_file_count BIGINT,
    thread_count BIGINT,
    payload JSONB,
    CONSTRAINT ck_ops_gateway_heartbeat_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE INDEX IF NOT EXISTS idx_ops_gateway_heartbeat_instance_status_time ON ops_gateway_heartbeat (instance_id, status, heartbeat_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_gateway_heartbeat_retention ON ops_gateway_heartbeat (retention_until, id);

CREATE TABLE IF NOT EXISTS ops_gateway_instance (
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
    instance_code VARCHAR(128),
    deployment_mode INTEGER,
    region VARCHAR(64),
    cell VARCHAR(64),
    version_name VARCHAR(64),
    host_name VARCHAR(128),
    ip_address_hash VARCHAR(128),
    ip_address_masked VARCHAR(64),
    node_name VARCHAR(128),
    pod_name VARCHAR(128),
    container_id_hash VARCHAR(128),
    desktop_device_hash VARCHAR(128),
    runtime_type INTEGER,
    orchestrator INTEGER,
    started_at TIMESTAMPTZ,
    last_heartbeat_at TIMESTAMPTZ,
    health_status INTEGER,
    config_hash VARCHAR(128),
    CONSTRAINT ck_ops_gateway_instance_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_gateway_instance_code ON ops_gateway_instance (instance_code);
CREATE INDEX IF NOT EXISTS idx_ops_gateway_instance_tenant_status_heartbeat ON ops_gateway_instance (tenant_id, organization_id, status, deleted_at, last_heartbeat_at, updated_at, id);

CREATE TABLE IF NOT EXISTS ops_job_execution (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    job_name VARCHAR(128),
    job_type INTEGER,
    trigger_type INTEGER,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_ms BIGINT,
    execution_status INTEGER,
    processed_count BIGINT,
    success_count BIGINT,
    failure_count BIGINT,
    failure_reason VARCHAR(1024),
    payload JSONB,
    CONSTRAINT ck_ops_job_execution_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE INDEX IF NOT EXISTS idx_ops_job_execution_name_started ON ops_job_execution (job_name, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_job_execution_status_started ON ops_job_execution (execution_status, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_job_execution_model_ranking_scope_started ON ops_job_execution (tenant_id, organization_id, status, job_type, job_name, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_job_execution_retention ON ops_job_execution (retention_until, id);

CREATE TABLE IF NOT EXISTS ops_metric_snapshot (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    source_type VARCHAR(128),
    source_id BIGINT,
    source_version BIGINT NOT NULL,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rebuild_version BIGINT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    metric_scope INTEGER NOT NULL,
    metric_name VARCHAR(128) NOT NULL,
    metric_period INTEGER NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ,
    dimension_key VARCHAR(128) NOT NULL,
    dimension_value VARCHAR(256) NOT NULL,
    metric_value NUMERIC(38, 12) NOT NULL,
    metric_unit VARCHAR(64),
    payload JSONB,
    CONSTRAINT ck_ops_metric_snapshot_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT ck_ops_metric_snapshot_period_interval CHECK (period_end IS NULL OR period_end > period_start)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_metric_snapshot ON ops_metric_snapshot (tenant_id, organization_id, metric_scope, metric_name, metric_period, period_start, dimension_key, dimension_value);

CREATE TABLE IF NOT EXISTS ops_notification_message (
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
    app_id VARCHAR(128),
    scope_type INTEGER NOT NULL DEFAULT 1,
    message_code VARCHAR(128),
    message_type INTEGER,
    title VARCHAR(200),
    summary VARCHAR(512),
    content TEXT,
    severity INTEGER,
    priority INTEGER NOT NULL DEFAULT 0,
    show_as_popup BOOLEAN NOT NULL DEFAULT FALSE,
    action_url VARCHAR(1024),
    published_at TIMESTAMPTZ,
    expire_at TIMESTAMPTZ,
    CONSTRAINT ck_ops_notification_message_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_notification_message_scope_id ON ops_notification_message (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_ops_notification_message_scope ON ops_notification_message (tenant_id, organization_id, app_id, scope_type, status, published_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_notification_message_popup ON ops_notification_message (tenant_id, organization_id, show_as_popup, published_at, id);

CREATE TABLE IF NOT EXISTS ops_notification_delivery (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    app_id VARCHAR(128) NOT NULL DEFAULT 'default',
    message_id BIGINT NOT NULL,
    delivery_channel INTEGER NOT NULL,
    delivery_status INTEGER,
    read_at TIMESTAMPTZ,
    popup_seen_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failure_code VARCHAR(128),
    retry_count INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT ck_ops_notification_delivery_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT fk_ops_notification_delivery_message FOREIGN KEY (tenant_id, organization_id, message_id) REFERENCES ops_notification_message (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_ops_notification_delivery_retry_count CHECK (retry_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_notification_delivery_user_message_app ON ops_notification_delivery (tenant_id, organization_id, message_id, user_id, app_id, delivery_channel);
CREATE INDEX IF NOT EXISTS idx_ops_notification_delivery_user_read ON ops_notification_delivery (tenant_id, organization_id, user_id, app_id, read_at, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_notification_delivery_popup_seen ON ops_notification_delivery (tenant_id, organization_id, user_id, app_id, popup_seen_at, id);

CREATE TABLE IF NOT EXISTS ops_notification_recipient (
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
    message_id BIGINT NOT NULL,
    app_id VARCHAR(128),
    recipient_type INTEGER NOT NULL,
    recipient_value VARCHAR(256),
    recipient_user_id BIGINT,
    recipient_role_code VARCHAR(128),
    CONSTRAINT ck_ops_notification_recipient_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ops_notification_recipient_message FOREIGN KEY (tenant_id, organization_id, message_id) REFERENCES ops_notification_message (tenant_id, organization_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_ops_notification_recipient_message ON ops_notification_recipient (tenant_id, organization_id, message_id, status, id);
CREATE INDEX IF NOT EXISTS idx_ops_notification_recipient_user ON ops_notification_recipient (tenant_id, organization_id, recipient_type, recipient_user_id, status, id);
CREATE INDEX IF NOT EXISTS idx_ops_notification_recipient_role ON ops_notification_recipient (tenant_id, organization_id, recipient_type, recipient_role_code, status, id);
