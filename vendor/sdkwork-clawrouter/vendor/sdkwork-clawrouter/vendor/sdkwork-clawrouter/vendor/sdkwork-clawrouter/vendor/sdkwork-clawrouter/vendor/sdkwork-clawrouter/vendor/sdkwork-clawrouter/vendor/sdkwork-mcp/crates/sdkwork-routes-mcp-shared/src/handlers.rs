use axum::http::StatusCode;
use sdkwork_intelligence_mcp_service::{McpRepository, McpService};
use sdkwork_mcp_contract::{
    McpConnectorRecord, McpInvocationRecord, McpPromptRecord, McpResourceRecord,
    McpServerCategoryRecord, McpServerRecord, McpToolRecord,
};

use crate::http::{items_response, record_response, service_error_response};

pub async fn list_categories<R: McpRepository>(
    service: &McpService<R>,
    tenant_id: u64,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let items = service
        .list_categories(tenant_id)
        .await
        .map_err(service_error_response)?;
    Ok(items_response(items))
}

pub async fn list_servers<R: McpRepository>(
    service: &McpService<R>,
    tenant_id: u64,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let items = service
        .list_servers(tenant_id)
        .await
        .map_err(service_error_response)?;
    Ok(items_response(items))
}

pub async fn get_server<R: McpRepository>(
    service: &McpService<R>,
    tenant_id: u64,
    server_key: &str,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let record = service
        .get_server(tenant_id, server_key)
        .await
        .map_err(service_error_response)?;
    Ok(record_response(record))
}

pub async fn list_connectors<R: McpRepository>(
    service: &McpService<R>,
    tenant_id: u64,
    server_id: u64,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let items = service
        .list_connectors(tenant_id, server_id)
        .await
        .map_err(service_error_response)?;
    Ok(items_response(items))
}

pub async fn list_tools<R: McpRepository>(
    service: &McpService<R>,
    tenant_id: u64,
    server_id: u64,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let items = service
        .list_tools(tenant_id, server_id)
        .await
        .map_err(service_error_response)?;
    Ok(items_response(items))
}

pub async fn get_tool<R: McpRepository>(
    service: &McpService<R>,
    tenant_id: u64,
    server_id: u64,
    tool_key: &str,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let record = service
        .get_tool(tenant_id, server_id, tool_key)
        .await
        .map_err(service_error_response)?;
    Ok(record_response(record))
}

pub async fn list_resources<R: McpRepository>(
    service: &McpService<R>,
    tenant_id: u64,
    server_id: u64,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let items = service
        .list_resources(tenant_id, server_id)
        .await
        .map_err(service_error_response)?;
    Ok(items_response(items))
}

pub async fn list_prompts<R: McpRepository>(
    service: &McpService<R>,
    tenant_id: u64,
    server_id: u64,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let items = service
        .list_prompts(tenant_id, server_id)
        .await
        .map_err(service_error_response)?;
    Ok(items_response(items))
}

pub async fn list_invocations<R: McpRepository>(
    service: &McpService<R>,
    tenant_id: u64,
    server_id: Option<u64>,
    limit: u32,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let items = service
        .list_invocations(tenant_id, server_id, limit)
        .await
        .map_err(service_error_response)?;
    Ok(items_response(items))
}

pub async fn append_invocation<R: McpRepository>(
    service: &McpService<R>,
    record: McpInvocationRecord,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let saved = service
        .append_invocation(record)
        .await
        .map_err(service_error_response)?;
    Ok(record_response(saved))
}

pub async fn upsert_category<R: McpRepository>(
    service: &McpService<R>,
    record: McpServerCategoryRecord,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let saved = service
        .upsert_category(record)
        .await
        .map_err(service_error_response)?;
    Ok(record_response(saved))
}

pub async fn upsert_server<R: McpRepository>(
    service: &McpService<R>,
    record: McpServerRecord,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let saved = service
        .upsert_server(record)
        .await
        .map_err(service_error_response)?;
    Ok(record_response(saved))
}

pub async fn delete_server<R: McpRepository>(
    service: &McpService<R>,
    tenant_id: u64,
    server_key: &str,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let deleted = service
        .delete_server(tenant_id, server_key)
        .await
        .map_err(service_error_response)?;
    Ok(record_response(deleted))
}

pub async fn upsert_connector<R: McpRepository>(
    service: &McpService<R>,
    record: McpConnectorRecord,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let saved = service
        .upsert_connector(record)
        .await
        .map_err(service_error_response)?;
    Ok(record_response(saved))
}

pub async fn delete_connector<R: McpRepository>(
    service: &McpService<R>,
    tenant_id: u64,
    server_id: u64,
    connector_key: &str,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let deleted = service
        .delete_connector(tenant_id, server_id, connector_key)
        .await
        .map_err(service_error_response)?;
    Ok(record_response(deleted))
}

pub async fn upsert_tool<R: McpRepository>(
    service: &McpService<R>,
    record: McpToolRecord,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let saved = service
        .upsert_tool(record)
        .await
        .map_err(service_error_response)?;
    Ok(record_response(saved))
}

pub async fn upsert_resource<R: McpRepository>(
    service: &McpService<R>,
    record: McpResourceRecord,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let saved = service
        .upsert_resource(record)
        .await
        .map_err(service_error_response)?;
    Ok(record_response(saved))
}

pub async fn upsert_prompt<R: McpRepository>(
    service: &McpService<R>,
    record: McpPromptRecord,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let saved = service
        .upsert_prompt(record)
        .await
        .map_err(service_error_response)?;
    Ok(record_response(saved))
}
