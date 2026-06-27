use sdkwork_mcp_contract::{
    McpDataScope, McpLifecycleStatus, McpPublishStatus, McpTransportKind, McpVisibility,
};

#[test]
fn transport_kind_roundtrip() {
    assert_eq!(
        McpTransportKind::parse("streamable-http"),
        Some(McpTransportKind::StreamableHttp)
    );
    assert_eq!(
        McpTransportKind::StreamableHttp.as_str(),
        "streamable-http"
    );
}

#[test]
fn publish_status_roundtrip() {
    assert_eq!(
        McpPublishStatus::parse("published"),
        Some(McpPublishStatus::Published)
    );
    assert_eq!(McpPublishStatus::Published.as_str(), "published");
}

#[test]
fn lifecycle_status_db_codes_are_stable() {
    assert_eq!(McpLifecycleStatus::Active.as_db_code(), 1);
    assert_eq!(McpLifecycleStatus::Deleted.as_db_code(), 4);
}

#[test]
fn visibility_maps_to_data_scope() {
    assert_eq!(
        McpVisibility::Tenant.default_data_scope(),
        McpDataScope::Tenant
    );
    assert_eq!(McpDataScope::Tenant.as_db_code(), 3);
}
