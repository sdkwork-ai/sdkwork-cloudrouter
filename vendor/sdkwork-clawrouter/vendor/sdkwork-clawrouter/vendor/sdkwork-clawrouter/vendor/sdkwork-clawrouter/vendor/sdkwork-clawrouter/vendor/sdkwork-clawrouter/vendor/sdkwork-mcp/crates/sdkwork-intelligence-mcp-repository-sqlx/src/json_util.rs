use sdkwork_intelligence_mcp_service::{McpResult, McpServiceError};
use sdkwork_utils_rust::format_datetime;

pub fn string_list_from_json(input: &str, field: &str) -> McpResult<Vec<String>> {
    let value: serde_json::Value = serde_json::from_str(input).map_err(|error| {
        McpServiceError::Repository(format!("invalid {field} json: {error}"))
    })?;
    let Some(items) = value.as_array() else {
        return Err(McpServiceError::Repository(format!(
            "{field} must be a json array"
        )));
    };
    let mut out = Vec::with_capacity(items.len());
    for item in items {
        let Some(text) = item.as_str() else {
            return Err(McpServiceError::Repository(format!(
                "{field} items must be strings"
            )));
        };
        out.push(text.to_string());
    }
    Ok(out)
}

pub fn string_list_to_json(items: &[String], field: &str) -> McpResult<String> {
    serde_json::to_string(items)
        .map_err(|error| McpServiceError::Repository(format!("encode {field} json failed: {error}")))
}

pub fn json_value_to_string(value: serde_json::Value, field: &str) -> McpResult<String> {
    serde_json::to_string(&value)
        .map_err(|error| McpServiceError::Repository(format!("encode {field} json failed: {error}")))
}

pub fn parse_json_value(input: &str, field: &str) -> McpResult<serde_json::Value> {
    serde_json::from_str(input)
        .map_err(|error| McpServiceError::Repository(format!("invalid {field} json: {error}")))
}

pub fn timestamp_to_rfc3339(value: chrono::DateTime<chrono::Utc>) -> String {
    format_datetime(value, None)
}
