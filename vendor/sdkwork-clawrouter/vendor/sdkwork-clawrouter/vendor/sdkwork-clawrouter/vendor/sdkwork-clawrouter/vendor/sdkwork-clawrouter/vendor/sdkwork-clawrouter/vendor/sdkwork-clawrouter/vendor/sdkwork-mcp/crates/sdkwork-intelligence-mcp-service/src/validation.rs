use sdkwork_drive_contract::DriveUri;
use sdkwork_mcp_contract::{
    McpAuthKind, McpConnectorRecord, McpInvocationKind, McpInvocationRecord, McpPromptRecord,
    McpResourceRecord, McpServerCategoryRecord, McpServerRecord, McpToolRecord, McpTransportKind,
};
use sdkwork_utils_rust::{is_blank, trim};

use crate::{McpResult, McpServiceError};

const SERVER_KEY_PATTERN: &str = r"^mcp\.[a-z0-9_-]+(\.[a-z0-9_-]+)*$";
const ENTITY_KEY_PATTERN: &str = r"^[a-z0-9][a-z0-9_-]{1,127}$";


pub fn validate_category_code(category_code: &str) -> McpResult<()> {
    validate_entity_key(category_code, "category_code")
}

pub fn validate_category_record(record: &McpServerCategoryRecord) -> McpResult<()> {
    validate_category_code(record.category_code.as_str())?;
    if is_blank(Some(trim(record.name.as_str()).as_str())) {
        return Err(McpServiceError::InvalidArgument(
            "category name must not be empty".to_string(),
        ));
    }
    if let Some(icon_ref) = record.icon_ref.as_deref() {
        validate_icon_ref(icon_ref)?;
    }
    Ok(())
}

pub fn validate_server_key(server_key: &str) -> McpResult<()> {
    let normalized = trim(server_key);
    let valid = regex_lite::Regex::new(SERVER_KEY_PATTERN)
        .map_err(|error| McpServiceError::Repository(error.to_string()))?
        .is_match(&normalized);
    if !valid {
        return Err(McpServiceError::InvalidArgument(format!(
            "server_key must match {SERVER_KEY_PATTERN}: {server_key}"
        )));
    }
    Ok(())
}

pub fn validate_connector_key(connector_key: &str) -> McpResult<()> {
    validate_entity_key(connector_key, "connector_key")
}

pub fn validate_entity_key(value: &str, field: &str) -> McpResult<()> {
    let normalized = trim(value);
    let valid = regex_lite::Regex::new(ENTITY_KEY_PATTERN)
        .map_err(|error| McpServiceError::Repository(error.to_string()))?
        .is_match(&normalized);
    if !valid {
        return Err(McpServiceError::InvalidArgument(format!(
            "{field} must match {ENTITY_KEY_PATTERN}: {value}"
        )));
    }
    Ok(())
}

pub fn validate_icon_ref(icon_ref: &str) -> McpResult<()> {
    let normalized = trim(icon_ref);
    if is_blank(Some(&normalized)) {
        return Err(McpServiceError::InvalidArgument(
            "icon_ref must not be empty".to_string(),
        ));
    }
    DriveUri::parse(&normalized).map_err(|error| {
        McpServiceError::InvalidArgument(format!(
            "icon_ref must be a canonical sdkwork-drive URI: {error}"
        ))
    })?;
    Ok(())
}

pub fn validate_server_record(record: &McpServerRecord) -> McpResult<()> {
    validate_server_key(record.server_key.as_str())?;
    if is_blank(Some(trim(record.name.as_str()).as_str())) {
        return Err(McpServiceError::InvalidArgument(
            "name must not be empty".to_string(),
        ));
    }
    validate_transport_kind(record.transport)?;
    validate_visibility(record.visibility)?;
    if let Some(icon_ref) = record.icon_ref.as_deref() {
        validate_icon_ref(icon_ref)?;
    }
    Ok(())
}

pub fn validate_connector_record(record: &McpConnectorRecord) -> McpResult<()> {
    validate_connector_key(record.connector_key.as_str())?;
    validate_transport_kind(record.transport)?;
    validate_auth_kind(record.auth_type)?;
    validate_json_object(record.args_json.as_str(), "args_json")?;
    validate_json_object(record.env_schema_json.as_str(), "env_schema_json")?;
    validate_json_object(record.retry_policy_json.as_str(), "retry_policy_json")?;
    match record.transport {
        McpTransportKind::Stdio => {
            if is_blank(record.command_ref.as_deref()) {
                return Err(McpServiceError::InvalidArgument(
                    "command_ref is required for stdio transport".to_string(),
                ));
            }
        }
        McpTransportKind::Sse | McpTransportKind::Http | McpTransportKind::StreamableHttp => {
            if is_blank(record.endpoint_url.as_deref()) {
                return Err(McpServiceError::InvalidArgument(
                    "endpoint_url is required for remote transports".to_string(),
                ));
            }
        }
    }
    Ok(())
}

pub fn validate_tool_record(record: &McpToolRecord) -> McpResult<()> {
    validate_entity_key(record.tool_key.as_str(), "tool_key")?;
    if is_blank(Some(trim(record.name.as_str()).as_str())) {
        return Err(McpServiceError::InvalidArgument(
            "tool name must not be empty".to_string(),
        ));
    }
    validate_json_object(record.input_schema_json.as_str(), "input_schema_json")?;
    validate_json_object(record.output_schema_json.as_str(), "output_schema_json")?;
    validate_json_object(
        record.rate_limit_policy_json.as_str(),
        "rate_limit_policy_json",
    )?;
    Ok(())
}

pub fn validate_resource_record(record: &McpResourceRecord) -> McpResult<()> {
    validate_entity_key(record.resource_key.as_str(), "resource_key")?;
    if is_blank(Some(trim(record.uri.as_str()).as_str())) {
        return Err(McpServiceError::InvalidArgument(
            "resource uri must not be empty".to_string(),
        ));
    }
    if is_blank(Some(trim(record.name.as_str()).as_str())) {
        return Err(McpServiceError::InvalidArgument(
            "resource name must not be empty".to_string(),
        ));
    }
    Ok(())
}

pub fn validate_prompt_record(record: &McpPromptRecord) -> McpResult<()> {
    validate_entity_key(record.prompt_key.as_str(), "prompt_key")?;
    if is_blank(Some(trim(record.name.as_str()).as_str())) {
        return Err(McpServiceError::InvalidArgument(
            "prompt name must not be empty".to_string(),
        ));
    }
    validate_json_array(record.arguments_schema_json.as_str(), "arguments_schema_json")?;
    Ok(())
}

pub fn validate_invocation_record(record: &McpInvocationRecord) -> McpResult<()> {
    validate_invocation_target_key(record.invocation_kind, record.target_key.as_str())?;
    validate_invocation_kind(record.invocation_kind)?;
    validate_invocation_status(record.status.as_str())?;
    validate_json_object(record.request_json.as_str(), "request_json")?;
    if let Some(response_json) = record.response_json.as_deref() {
        validate_json_object(response_json, "response_json")?;
    }
    if let Some(key) = record.idempotency_key.as_deref() {
        if key.len() > 200 {
            return Err(McpServiceError::InvalidArgument(
                "idempotency_key must be at most 200 characters".to_string(),
            ));
        }
    }
    Ok(())
}

pub fn validate_transport_kind(kind: McpTransportKind) -> McpResult<()> {
    match kind {
        McpTransportKind::Stdio
        | McpTransportKind::Sse
        | McpTransportKind::Http
        | McpTransportKind::StreamableHttp => Ok(()),
    }
}

pub fn validate_auth_kind(kind: McpAuthKind) -> McpResult<()> {
    match kind {
        McpAuthKind::None | McpAuthKind::Bearer | McpAuthKind::ApiKey | McpAuthKind::OAuth => {
            Ok(())
        }
    }
}

pub fn validate_visibility(visibility: sdkwork_mcp_contract::McpVisibility) -> McpResult<()> {
    match visibility {
        sdkwork_mcp_contract::McpVisibility::Private
        | sdkwork_mcp_contract::McpVisibility::Tenant
        | sdkwork_mcp_contract::McpVisibility::Organization
        | sdkwork_mcp_contract::McpVisibility::Public => Ok(()),
    }
}

pub fn validate_invocation_kind(kind: McpInvocationKind) -> McpResult<()> {
    match kind {
        McpInvocationKind::Tool | McpInvocationKind::Resource | McpInvocationKind::Prompt => {
            Ok(())
        }
    }
}

pub fn validate_invocation_target_key(
    kind: McpInvocationKind,
    target_key: &str,
) -> McpResult<()> {
    match kind {
        McpInvocationKind::Tool | McpInvocationKind::Prompt => {
            validate_entity_key(target_key, "target_key")
        }
        McpInvocationKind::Resource => {
            if is_blank(Some(trim(target_key).as_str())) {
                return Err(McpServiceError::InvalidArgument(
                    "target_key must not be empty for resource invocations".to_string(),
                ));
            }
            if target_key.len() > 255 {
                return Err(McpServiceError::InvalidArgument(
                    "target_key must be at most 255 characters".to_string(),
                ));
            }
            Ok(())
        }
    }
}

pub fn validate_invocation_status(status: &str) -> McpResult<()> {
    if is_blank(Some(trim(status).as_str())) {
        return Err(McpServiceError::InvalidArgument(
            "invocation status must not be empty".to_string(),
        ));
    }
    if status.len() > 32 {
        return Err(McpServiceError::InvalidArgument(
            "invocation status must be at most 32 characters".to_string(),
        ));
    }
    Ok(())
}

fn validate_json_object(input: &str, field: &str) -> McpResult<()> {
    let value: serde_json::Value = serde_json::from_str(input).map_err(|error| {
        McpServiceError::InvalidArgument(format!("{field} must be valid json: {error}"))
    })?;
    if !value.is_object() && !value.is_array() {
        return Err(McpServiceError::InvalidArgument(format!(
            "{field} must be a json object or array"
        )));
    }
    Ok(())
}

fn validate_json_array(input: &str, field: &str) -> McpResult<()> {
    let value: serde_json::Value = serde_json::from_str(input).map_err(|error| {
        McpServiceError::InvalidArgument(format!("{field} must be valid json: {error}"))
    })?;
    if !value.is_array() {
        return Err(McpServiceError::InvalidArgument(format!(
            "{field} must be a json array"
        )));
    }
    Ok(())
}
