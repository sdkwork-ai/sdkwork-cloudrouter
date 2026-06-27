use sdkwork_mcp_contract::{
    McpAuthKind, McpHealthStatus, McpLifecycleStatus, McpPublishStatus, McpServerRecord,
    McpTransportKind, McpVisibility,
};

use crate::validation::{
    validate_connector_record, validate_icon_ref, validate_server_key, validate_server_record,
};

#[test]
fn accepts_drive_icon_ref() {
    assert!(validate_icon_ref("drive://spaces/mcp-space/nodes/icon-node-1").is_ok());
}

#[test]
fn rejects_invalid_server_key() {
    assert!(validate_server_key("invalid").is_err());
}

#[test]
fn accepts_valid_server_record() {
    let record = McpServerRecord {
        id: 1,
        uuid: "01940000-0000-7000-8000-000000000099".to_string(),
        tenant_id: 100_001,
        organization_id: 0,
        owner_user_id: 0,
        server_key: "mcp.demo.sample".to_string(),
        name: "Demo MCP".to_string(),
        description: None,
        category_id: None,
        category_code: None,
        transport: McpTransportKind::Stdio,
        visibility: McpVisibility::Tenant,
        data_scope: McpVisibility::Tenant.default_data_scope(),
        latest_connector_id: None,
        published_connector_id: None,
        health_status: McpHealthStatus::Unknown,
        last_checked_at: None,
        last_error_masked: None,
        lifecycle_status: McpLifecycleStatus::Active,
        tags: vec![],
        icon_ref: Some("drive://spaces/mcp-space/nodes/icon-node-1".to_string()),
        published_at: None,
        deprecated_at: None,
        version: 1,
        created_at: "2026-01-01T00:00:00Z".to_string(),
        updated_at: "2026-01-01T00:00:00Z".to_string(),
        created_by: 0,
        updated_by: 0,
        deleted_at: None,
    };
    assert!(validate_server_record(&record).is_ok());
}

#[test]
fn accepts_valid_invocation_record() {
    use sdkwork_mcp_contract::{McpInvocationKind, McpInvocationRecord};

    use crate::validation::validate_invocation_record;

    let record = McpInvocationRecord {
        id: 0,
        uuid: String::new(),
        tenant_id: 100_001,
        organization_id: 0,
        user_id: 1,
        server_id: 10,
        connector_id: Some(20),
        invocation_kind: McpInvocationKind::Tool,
        target_key: "demo_tool".to_string(),
        request_id: Some("req-1".to_string()),
        trace_id: Some("trace-1".to_string()),
        idempotency_key: Some("idem-1".to_string()),
        request_json: "{}".to_string(),
        response_json: Some("{}".to_string()),
        status: "success".to_string(),
        error_message: None,
        duration_ms: Some(12),
        invoked_at: String::new(),
        created_at: String::new(),
    };
    assert!(validate_invocation_record(&record).is_ok());
}

#[test]
fn rejects_oversized_idempotency_key() {
    use sdkwork_mcp_contract::{McpInvocationKind, McpInvocationRecord};

    use crate::validation::validate_invocation_record;

    let record = McpInvocationRecord {
        id: 0,
        uuid: String::new(),
        tenant_id: 100_001,
        organization_id: 0,
        user_id: 1,
        server_id: 10,
        connector_id: None,
        invocation_kind: McpInvocationKind::Tool,
        target_key: "demo_tool".to_string(),
        request_id: None,
        trace_id: None,
        idempotency_key: Some("x".repeat(201)),
        request_json: "{}".to_string(),
        response_json: None,
        status: "success".to_string(),
        error_message: None,
        duration_ms: None,
        invoked_at: String::new(),
        created_at: String::new(),
    };
    assert!(validate_invocation_record(&record).is_err());
}

#[test]
fn accepts_resource_invocation_uri_target_key() {
    use sdkwork_mcp_contract::{McpInvocationKind, McpInvocationRecord};

    use crate::validation::validate_invocation_record;

    let record = McpInvocationRecord {
        id: 0,
        uuid: String::new(),
        tenant_id: 100_001,
        organization_id: 0,
        user_id: 1,
        server_id: 10,
        connector_id: Some(20),
        invocation_kind: McpInvocationKind::Resource,
        target_key: "file:///workspace/docs/readme.md".to_string(),
        request_id: None,
        trace_id: None,
        idempotency_key: None,
        request_json: "{}".to_string(),
        response_json: None,
        status: "success".to_string(),
        error_message: None,
        duration_ms: None,
        invoked_at: String::new(),
        created_at: String::new(),
    };
    assert!(validate_invocation_record(&record).is_ok());
}

#[test]
fn connector_requires_command_for_stdio() {
    let record = sdkwork_mcp_contract::McpConnectorRecord {
        id: 0,
        uuid: String::new(),
        tenant_id: 100_001,
        organization_id: 0,
        server_id: 1,
        connector_key: "default".to_string(),
        publish_status: McpPublishStatus::Draft,
        transport: McpTransportKind::Stdio,
        endpoint_url: None,
        command_ref: None,
        args_json: "[]".to_string(),
        env_schema_json: "{}".to_string(),
        auth_type: McpAuthKind::None,
        secret_ref: None,
        timeout_ms: 30_000,
        retry_policy_json: "{}".to_string(),
        config_hash: None,
        lifecycle_status: McpLifecycleStatus::Draft,
        version: 0,
        created_at: String::new(),
        updated_at: String::new(),
        created_by: 0,
        updated_by: 0,
        deleted_at: None,
    };
    assert!(validate_connector_record(&record).is_err());
}
