use axum::http::{HeaderMap, StatusCode};
use sdkwork_intelligence_mcp_service::McpServiceError;
use serde::Serialize;

pub const TENANT_HEADER: &str = "x-sdkwork-tenant-id";

pub type SharedMcpService<R> = std::sync::Arc<sdkwork_intelligence_mcp_service::McpService<R>>;

pub fn resolve_tenant_id(headers: &HeaderMap, default_tenant_id: u64) -> u64 {
    headers
        .get(TENANT_HEADER)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(default_tenant_id)
}

pub fn service_error_response(error: McpServiceError) -> (StatusCode, String) {
    match error {
        McpServiceError::NotFound(message) => (StatusCode::NOT_FOUND, message),
        McpServiceError::InvalidArgument(message) => (StatusCode::BAD_REQUEST, message),
        McpServiceError::Repository(message) => (StatusCode::INTERNAL_SERVER_ERROR, message),
        McpServiceError::Drive(message) => (StatusCode::BAD_REQUEST, message),
    }
}

pub fn items_response<T: Serialize>(items: Vec<T>) -> serde_json::Value {
    serde_json::json!({ "items": items })
}

pub fn record_response<T: Serialize>(record: T) -> serde_json::Value {
    serde_json::json!({ "data": record })
}
