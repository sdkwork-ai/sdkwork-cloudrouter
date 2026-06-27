use sdkwork_mcp_contract::{
    McpAuthKind, McpConnectorRecord, McpHealthStatus, McpInvocationKind, McpInvocationRecord,
    McpLifecycleStatus, McpPromptRecord, McpPublishStatus, McpResourceRecord,
    McpServerCategoryRecord, McpServerRecord, McpToolRecord, McpTransportKind, McpVisibility,
};

#[derive(Debug, Clone, Copy)]
pub struct EntityWriteContext {
    pub tenant_id: u64,
    pub operator_id: u64,
}

impl EntityWriteContext {
    pub fn organization_id(self) -> u64 {
        0
    }

    pub fn actor_id(self) -> u64 {
        self.operator_id
    }
}

pub fn server_record(
    ctx: EntityWriteContext,
    owner_user_id: u64,
    server_key: String,
    name: String,
    transport: McpTransportKind,
    visibility: McpVisibility,
) -> McpServerRecord {
    McpServerRecord {
        id: 0,
        uuid: String::new(),
        tenant_id: ctx.tenant_id,
        organization_id: ctx.organization_id(),
        owner_user_id,
        server_key,
        name,
        description: None,
        category_id: None,
        category_code: None,
        transport,
        visibility,
        data_scope: visibility.default_data_scope(),
        latest_connector_id: None,
        published_connector_id: None,
        health_status: McpHealthStatus::Unknown,
        last_checked_at: None,
        last_error_masked: None,
        lifecycle_status: McpLifecycleStatus::Active,
        tags: vec![],
        icon_ref: None,
        published_at: None,
        deprecated_at: None,
        version: 0,
        created_at: String::new(),
        updated_at: String::new(),
        created_by: owner_user_id,
        updated_by: owner_user_id,
        deleted_at: None,
    }
}

pub fn category_record(
    ctx: EntityWriteContext,
    category_code: String,
    name: String,
    description: Option<String>,
    parent_id: u64,
    sort_order: i32,
    icon_ref: Option<String>,
) -> McpServerCategoryRecord {
    McpServerCategoryRecord {
        id: 0,
        uuid: String::new(),
        tenant_id: ctx.tenant_id,
        organization_id: ctx.organization_id(),
        category_code,
        name,
        description,
        parent_id,
        sort_order,
        icon_ref,
        lifecycle_status: McpLifecycleStatus::Active,
        version: 0,
        created_at: String::new(),
        updated_at: String::new(),
        created_by: ctx.actor_id(),
        updated_by: ctx.actor_id(),
        deleted_at: None,
    }
}

pub fn connector_record(
    ctx: EntityWriteContext,
    server_id: u64,
    connector_key: String,
    transport: McpTransportKind,
    endpoint_url: Option<String>,
    command_ref: Option<String>,
    args_json: String,
    env_schema_json: String,
    auth_type: McpAuthKind,
    secret_ref: Option<String>,
    timeout_ms: u32,
    retry_policy_json: String,
    publish_status: McpPublishStatus,
    lifecycle_status: McpLifecycleStatus,
) -> McpConnectorRecord {
    McpConnectorRecord {
        id: 0,
        uuid: String::new(),
        tenant_id: ctx.tenant_id,
        organization_id: ctx.organization_id(),
        server_id,
        connector_key,
        publish_status,
        transport,
        endpoint_url,
        command_ref,
        args_json,
        env_schema_json,
        auth_type,
        secret_ref,
        timeout_ms,
        retry_policy_json,
        config_hash: None,
        lifecycle_status,
        version: 0,
        created_at: String::new(),
        updated_at: String::new(),
        created_by: ctx.actor_id(),
        updated_by: ctx.actor_id(),
        deleted_at: None,
    }
}

pub fn tool_record(
    ctx: EntityWriteContext,
    server_id: u64,
    connector_id: u64,
    tool_key: String,
    name: String,
    description: Option<String>,
    input_schema_json: String,
    output_schema_json: String,
    risk_level: String,
    requires_approval: bool,
    enabled: bool,
    sort_weight: i32,
) -> McpToolRecord {
    McpToolRecord {
        id: 0,
        uuid: String::new(),
        tenant_id: ctx.tenant_id,
        organization_id: ctx.organization_id(),
        server_id,
        connector_id,
        tool_key,
        name,
        description,
        input_schema_json,
        output_schema_json,
        risk_level,
        requires_approval,
        enabled,
        lifecycle_status: McpLifecycleStatus::Active,
        rate_limit_policy_json: "{}".to_string(),
        schema_hash: None,
        discovered_at: None,
        last_invoked_at: None,
        sort_weight,
        version: 0,
        created_at: String::new(),
        updated_at: String::new(),
        created_by: ctx.actor_id(),
        updated_by: ctx.actor_id(),
        deleted_at: None,
    }
}

pub fn resource_record(
    ctx: EntityWriteContext,
    server_id: u64,
    connector_id: u64,
    resource_key: String,
    uri: String,
    name: String,
    description: Option<String>,
    mime_type: Option<String>,
    enabled: bool,
) -> McpResourceRecord {
    McpResourceRecord {
        id: 0,
        uuid: String::new(),
        tenant_id: ctx.tenant_id,
        organization_id: ctx.organization_id(),
        server_id,
        connector_id,
        resource_key,
        uri,
        name,
        description,
        mime_type,
        enabled,
        lifecycle_status: McpLifecycleStatus::Active,
        discovered_at: None,
        version: 0,
        created_at: String::new(),
        updated_at: String::new(),
        created_by: ctx.actor_id(),
        updated_by: ctx.actor_id(),
        deleted_at: None,
    }
}

pub fn prompt_record(
    ctx: EntityWriteContext,
    server_id: u64,
    connector_id: u64,
    prompt_key: String,
    name: String,
    description: Option<String>,
    arguments_schema_json: String,
    enabled: bool,
) -> McpPromptRecord {
    McpPromptRecord {
        id: 0,
        uuid: String::new(),
        tenant_id: ctx.tenant_id,
        organization_id: ctx.organization_id(),
        server_id,
        connector_id,
        prompt_key,
        name,
        description,
        arguments_schema_json,
        enabled,
        lifecycle_status: McpLifecycleStatus::Active,
        discovered_at: None,
        version: 0,
        created_at: String::new(),
        updated_at: String::new(),
        created_by: ctx.actor_id(),
        updated_by: ctx.actor_id(),
        deleted_at: None,
    }
}

pub fn invocation_record(
    ctx: EntityWriteContext,
    user_id: u64,
    server_id: u64,
    connector_id: Option<u64>,
    invocation_kind: McpInvocationKind,
    target_key: String,
    request_id: Option<String>,
    trace_id: Option<String>,
    idempotency_key: Option<String>,
    request_json: String,
    response_json: Option<String>,
    status: String,
    error_message: Option<String>,
    duration_ms: Option<u32>,
) -> McpInvocationRecord {
    McpInvocationRecord {
        id: 0,
        uuid: String::new(),
        tenant_id: ctx.tenant_id,
        organization_id: ctx.organization_id(),
        user_id,
        server_id,
        connector_id,
        invocation_kind,
        target_key,
        request_id,
        trace_id,
        idempotency_key,
        request_json,
        response_json,
        status,
        error_message,
        duration_ms,
        invoked_at: String::new(),
        created_at: String::new(),
    }
}
