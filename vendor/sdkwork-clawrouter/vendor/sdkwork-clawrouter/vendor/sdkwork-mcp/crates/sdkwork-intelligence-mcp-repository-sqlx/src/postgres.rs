use sdkwork_intelligence_mcp_service::{McpResult, McpServiceError};
use sdkwork_mcp_contract::{
    McpAuthKind, McpConnectorRecord, McpDataScope, McpHealthStatus, McpInvocationKind,
    McpInvocationRecord, McpLifecycleStatus, McpPromptRecord, McpPublishStatus, McpResourceRecord,
    McpServerCategoryRecord, McpServerRecord, McpToolRecord, McpTransportKind, McpVisibility,
};
use sqlx::{PgPool, Row};

use crate::entity_ids::{new_mcp_snowflake_id, new_mcp_uuid};
use crate::json_util::{
    json_value_to_string, parse_json_value, string_list_from_json, string_list_to_json,
    timestamp_to_rfc3339,
};

const ACTIVE_ENTITY_FILTER: &str = "deleted_at IS NULL AND lifecycle_status <> 4";

const CATEGORY_SELECT: &str = r#"
    id, uuid, tenant_id, organization_id, category_code, name, description, parent_id,
    sort_order, icon_ref, lifecycle_status, version, created_at, updated_at, created_by,
    updated_by, deleted_at
"#;

const SERVER_SELECT: &str = r#"
    id, uuid, tenant_id, organization_id, owner_user_id, server_key, name, description,
    category_id, category_code, transport, visibility, data_scope, latest_connector_id,
    published_connector_id, health_status, last_checked_at, last_error_masked,
    lifecycle_status, tags_json, icon_ref, published_at, deprecated_at, version,
    created_at, updated_at, created_by, updated_by, deleted_at
"#;

const CONNECTOR_SELECT: &str = r#"
    id, uuid, tenant_id, organization_id, server_id, connector_key, publish_status, transport,
    endpoint_url, command_ref, args_json, env_schema_json, auth_type, secret_ref, timeout_ms,
    retry_policy_json, config_hash, lifecycle_status, version, created_at, updated_at,
    created_by, updated_by, deleted_at
"#;

const TOOL_SELECT: &str = r#"
    id, uuid, tenant_id, organization_id, server_id, connector_id, tool_key, name, description,
    input_schema_json, output_schema_json, risk_level, requires_approval, enabled, lifecycle_status,
    rate_limit_policy_json, schema_hash, discovered_at, last_invoked_at, sort_weight, version,
    created_at, updated_at, created_by, updated_by, deleted_at
"#;

const RESOURCE_SELECT: &str = r#"
    id, uuid, tenant_id, organization_id, server_id, connector_id, resource_key, uri, name,
    description, mime_type, enabled, lifecycle_status, discovered_at, version, created_at,
    updated_at, created_by, updated_by, deleted_at
"#;

const PROMPT_SELECT: &str = r#"
    id, uuid, tenant_id, organization_id, server_id, connector_id, prompt_key, name, description,
    arguments_schema_json, enabled, lifecycle_status, discovered_at, version, created_at, updated_at,
    created_by, updated_by, deleted_at
"#;

const INVOCATION_SELECT: &str = r#"
    id, uuid, tenant_id, organization_id, user_id, server_id, connector_id, invocation_kind,
    target_key, request_id, trace_id, idempotency_key, request_json, response_json, status,
    error_message, duration_ms, invoked_at, created_at
"#;

fn map_sqlx(error: sqlx::Error) -> McpServiceError {
    McpServiceError::Repository(error.to_string())
}

fn resolve_entity_id(id: u64) -> i64 {
    if id == 0 {
        new_mcp_snowflake_id() as i64
    } else {
        id as i64
    }
}

fn resolve_entity_uuid(uuid: &str) -> String {
    if uuid.is_empty() {
        new_mcp_uuid()
    } else {
        uuid.to_string()
    }
}

fn read_json_string(row: &sqlx::postgres::PgRow, field: &str) -> McpResult<String> {
    json_value_to_string(
        row.try_get::<serde_json::Value, _>(field).map_err(map_sqlx)?,
        field,
    )
}

fn read_optional_json_string(
    row: &sqlx::postgres::PgRow,
    field: &str,
) -> McpResult<Option<String>> {
    match row
        .try_get::<Option<serde_json::Value>, _>(field)
        .map_err(map_sqlx)?
    {
        None => Ok(None),
        Some(value) => Ok(Some(json_value_to_string(value, field)?)),
    }
}

fn bind_json_string(input: &str, field: &str) -> McpResult<serde_json::Value> {
    parse_json_value(input, field)
}

fn bind_optional_json_string(
    input: &Option<String>,
    field: &str,
) -> McpResult<Option<serde_json::Value>> {
    match input {
        None => Ok(None),
        Some(value) => Ok(Some(parse_json_value(value, field)?)),
    }
}

fn map_transport(value: &str) -> McpResult<McpTransportKind> {
    McpTransportKind::parse(value)
        .ok_or_else(|| McpServiceError::Repository(format!("invalid transport: {value}")))
}

fn map_auth(value: &str) -> McpResult<McpAuthKind> {
    McpAuthKind::parse(value)
        .ok_or_else(|| McpServiceError::Repository(format!("invalid auth_type: {value}")))
}

fn map_visibility(value: &str) -> McpResult<McpVisibility> {
    McpVisibility::parse(value)
        .ok_or_else(|| McpServiceError::Repository(format!("invalid visibility: {value}")))
}

fn map_lifecycle(value: i16) -> McpResult<McpLifecycleStatus> {
    McpLifecycleStatus::from_db_code(value)
        .ok_or_else(|| McpServiceError::Repository(format!("invalid lifecycle status: {value}")))
}

fn map_health(value: &str) -> McpResult<McpHealthStatus> {
    McpHealthStatus::parse(value)
        .ok_or_else(|| McpServiceError::Repository(format!("invalid health_status: {value}")))
}

fn map_publish_status(value: &str) -> McpResult<McpPublishStatus> {
    McpPublishStatus::parse(value)
        .ok_or_else(|| McpServiceError::Repository(format!("invalid publish_status: {value}")))
}

fn map_data_scope(value: i16) -> McpResult<McpDataScope> {
    McpDataScope::from_db_code(value)
        .ok_or_else(|| McpServiceError::Repository(format!("invalid data_scope: {value}")))
}

fn map_invocation_kind(value: &str) -> McpResult<McpInvocationKind> {
    McpInvocationKind::parse(value)
        .ok_or_else(|| McpServiceError::Repository(format!("invalid invocation_kind: {value}")))
}

fn row_to_category(row: &sqlx::postgres::PgRow) -> McpResult<McpServerCategoryRecord> {
    Ok(McpServerCategoryRecord {
        id: row.try_get::<i64, _>("id").map_err(map_sqlx)? as u64,
        uuid: row.try_get("uuid").map_err(map_sqlx)?,
        tenant_id: row.try_get::<i64, _>("tenant_id").map_err(map_sqlx)? as u64,
        organization_id: row.try_get::<i64, _>("organization_id").map_err(map_sqlx)? as u64,
        category_code: row.try_get("category_code").map_err(map_sqlx)?,
        name: row.try_get("name").map_err(map_sqlx)?,
        description: row.try_get("description").map_err(map_sqlx)?,
        parent_id: row.try_get::<i64, _>("parent_id").map_err(map_sqlx)? as u64,
        sort_order: row.try_get("sort_order").map_err(map_sqlx)?,
        icon_ref: row.try_get("icon_ref").map_err(map_sqlx)?,
        lifecycle_status: map_lifecycle(row.try_get("lifecycle_status").map_err(map_sqlx)?)?,
        version: row.try_get::<i64, _>("version").map_err(map_sqlx)? as u64,
        created_at: timestamp_to_rfc3339(row.try_get("created_at").map_err(map_sqlx)?),
        updated_at: timestamp_to_rfc3339(row.try_get("updated_at").map_err(map_sqlx)?),
        created_by: row.try_get::<i64, _>("created_by").map_err(map_sqlx)? as u64,
        updated_by: row.try_get::<i64, _>("updated_by").map_err(map_sqlx)? as u64,
        deleted_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("deleted_at")
            .map_err(map_sqlx)?
            .map(timestamp_to_rfc3339),
    })
}

fn row_to_server(row: &sqlx::postgres::PgRow) -> McpResult<McpServerRecord> {
    Ok(McpServerRecord {
        id: row.try_get::<i64, _>("id").map_err(map_sqlx)? as u64,
        uuid: row.try_get("uuid").map_err(map_sqlx)?,
        tenant_id: row.try_get::<i64, _>("tenant_id").map_err(map_sqlx)? as u64,
        organization_id: row.try_get::<i64, _>("organization_id").map_err(map_sqlx)? as u64,
        owner_user_id: row.try_get::<i64, _>("owner_user_id").map_err(map_sqlx)? as u64,
        server_key: row.try_get("server_key").map_err(map_sqlx)?,
        name: row.try_get("name").map_err(map_sqlx)?,
        description: row.try_get("description").map_err(map_sqlx)?,
        category_id: row
            .try_get::<Option<i64>, _>("category_id")
            .map_err(map_sqlx)?
            .map(|value| value as u64),
        category_code: row.try_get("category_code").map_err(map_sqlx)?,
        transport: map_transport(
            row.try_get::<String, _>("transport")
                .map_err(map_sqlx)?
                .as_str(),
        )?,
        visibility: map_visibility(
            row.try_get::<String, _>("visibility")
                .map_err(map_sqlx)?
                .as_str(),
        )?,
        data_scope: map_data_scope(row.try_get("data_scope").map_err(map_sqlx)?)?,
        latest_connector_id: row
            .try_get::<Option<i64>, _>("latest_connector_id")
            .map_err(map_sqlx)?
            .map(|value| value as u64),
        published_connector_id: row
            .try_get::<Option<i64>, _>("published_connector_id")
            .map_err(map_sqlx)?
            .map(|value| value as u64),
        health_status: map_health(
            row.try_get::<String, _>("health_status")
                .map_err(map_sqlx)?
                .as_str(),
        )?,
        last_checked_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("last_checked_at")
            .map_err(map_sqlx)?
            .map(timestamp_to_rfc3339),
        last_error_masked: row.try_get("last_error_masked").map_err(map_sqlx)?,
        lifecycle_status: map_lifecycle(row.try_get("lifecycle_status").map_err(map_sqlx)?)?,
        tags: string_list_from_json(read_json_string(row, "tags_json")?.as_str(), "tags_json")?,
        icon_ref: row.try_get("icon_ref").map_err(map_sqlx)?,
        published_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("published_at")
            .map_err(map_sqlx)?
            .map(timestamp_to_rfc3339),
        deprecated_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("deprecated_at")
            .map_err(map_sqlx)?
            .map(timestamp_to_rfc3339),
        version: row.try_get::<i64, _>("version").map_err(map_sqlx)? as u64,
        created_at: timestamp_to_rfc3339(row.try_get("created_at").map_err(map_sqlx)?),
        updated_at: timestamp_to_rfc3339(row.try_get("updated_at").map_err(map_sqlx)?),
        created_by: row.try_get::<i64, _>("created_by").map_err(map_sqlx)? as u64,
        updated_by: row.try_get::<i64, _>("updated_by").map_err(map_sqlx)? as u64,
        deleted_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("deleted_at")
            .map_err(map_sqlx)?
            .map(timestamp_to_rfc3339),
    })
}

fn row_to_connector(row: &sqlx::postgres::PgRow) -> McpResult<McpConnectorRecord> {
    Ok(McpConnectorRecord {
        id: row.try_get::<i64, _>("id").map_err(map_sqlx)? as u64,
        uuid: row.try_get("uuid").map_err(map_sqlx)?,
        tenant_id: row.try_get::<i64, _>("tenant_id").map_err(map_sqlx)? as u64,
        organization_id: row.try_get::<i64, _>("organization_id").map_err(map_sqlx)? as u64,
        server_id: row.try_get::<i64, _>("server_id").map_err(map_sqlx)? as u64,
        connector_key: row.try_get("connector_key").map_err(map_sqlx)?,
        publish_status: map_publish_status(
            row.try_get::<String, _>("publish_status")
                .map_err(map_sqlx)?
                .as_str(),
        )?,
        transport: map_transport(
            row.try_get::<String, _>("transport")
                .map_err(map_sqlx)?
                .as_str(),
        )?,
        endpoint_url: row.try_get("endpoint_url").map_err(map_sqlx)?,
        command_ref: row.try_get("command_ref").map_err(map_sqlx)?,
        args_json: read_json_string(row, "args_json")?,
        env_schema_json: read_json_string(row, "env_schema_json")?,
        auth_type: map_auth(
            row.try_get::<String, _>("auth_type")
                .map_err(map_sqlx)?
                .as_str(),
        )?,
        secret_ref: row.try_get("secret_ref").map_err(map_sqlx)?,
        timeout_ms: row.try_get::<i32, _>("timeout_ms").map_err(map_sqlx)? as u32,
        retry_policy_json: read_json_string(row, "retry_policy_json")?,
        config_hash: row.try_get("config_hash").map_err(map_sqlx)?,
        lifecycle_status: map_lifecycle(row.try_get("lifecycle_status").map_err(map_sqlx)?)?,
        version: row.try_get::<i64, _>("version").map_err(map_sqlx)? as u64,
        created_at: timestamp_to_rfc3339(row.try_get("created_at").map_err(map_sqlx)?),
        updated_at: timestamp_to_rfc3339(row.try_get("updated_at").map_err(map_sqlx)?),
        created_by: row.try_get::<i64, _>("created_by").map_err(map_sqlx)? as u64,
        updated_by: row.try_get::<i64, _>("updated_by").map_err(map_sqlx)? as u64,
        deleted_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("deleted_at")
            .map_err(map_sqlx)?
            .map(timestamp_to_rfc3339),
    })
}

fn row_to_tool(row: &sqlx::postgres::PgRow) -> McpResult<McpToolRecord> {
    Ok(McpToolRecord {
        id: row.try_get::<i64, _>("id").map_err(map_sqlx)? as u64,
        uuid: row.try_get("uuid").map_err(map_sqlx)?,
        tenant_id: row.try_get::<i64, _>("tenant_id").map_err(map_sqlx)? as u64,
        organization_id: row.try_get::<i64, _>("organization_id").map_err(map_sqlx)? as u64,
        server_id: row.try_get::<i64, _>("server_id").map_err(map_sqlx)? as u64,
        connector_id: row.try_get::<i64, _>("connector_id").map_err(map_sqlx)? as u64,
        tool_key: row.try_get("tool_key").map_err(map_sqlx)?,
        name: row.try_get("name").map_err(map_sqlx)?,
        description: row.try_get("description").map_err(map_sqlx)?,
        input_schema_json: read_json_string(row, "input_schema_json")?,
        output_schema_json: read_json_string(row, "output_schema_json")?,
        risk_level: row.try_get("risk_level").map_err(map_sqlx)?,
        requires_approval: row.try_get("requires_approval").map_err(map_sqlx)?,
        enabled: row.try_get("enabled").map_err(map_sqlx)?,
        lifecycle_status: map_lifecycle(row.try_get("lifecycle_status").map_err(map_sqlx)?)?,
        rate_limit_policy_json: read_json_string(row, "rate_limit_policy_json")?,
        schema_hash: row.try_get("schema_hash").map_err(map_sqlx)?,
        discovered_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("discovered_at")
            .map_err(map_sqlx)?
            .map(timestamp_to_rfc3339),
        last_invoked_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("last_invoked_at")
            .map_err(map_sqlx)?
            .map(timestamp_to_rfc3339),
        sort_weight: row.try_get("sort_weight").map_err(map_sqlx)?,
        version: row.try_get::<i64, _>("version").map_err(map_sqlx)? as u64,
        created_at: timestamp_to_rfc3339(row.try_get("created_at").map_err(map_sqlx)?),
        updated_at: timestamp_to_rfc3339(row.try_get("updated_at").map_err(map_sqlx)?),
        created_by: row.try_get::<i64, _>("created_by").map_err(map_sqlx)? as u64,
        updated_by: row.try_get::<i64, _>("updated_by").map_err(map_sqlx)? as u64,
        deleted_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("deleted_at")
            .map_err(map_sqlx)?
            .map(timestamp_to_rfc3339),
    })
}

fn row_to_resource(row: &sqlx::postgres::PgRow) -> McpResult<McpResourceRecord> {
    Ok(McpResourceRecord {
        id: row.try_get::<i64, _>("id").map_err(map_sqlx)? as u64,
        uuid: row.try_get("uuid").map_err(map_sqlx)?,
        tenant_id: row.try_get::<i64, _>("tenant_id").map_err(map_sqlx)? as u64,
        organization_id: row.try_get::<i64, _>("organization_id").map_err(map_sqlx)? as u64,
        server_id: row.try_get::<i64, _>("server_id").map_err(map_sqlx)? as u64,
        connector_id: row.try_get::<i64, _>("connector_id").map_err(map_sqlx)? as u64,
        resource_key: row.try_get("resource_key").map_err(map_sqlx)?,
        uri: row.try_get("uri").map_err(map_sqlx)?,
        name: row.try_get("name").map_err(map_sqlx)?,
        description: row.try_get("description").map_err(map_sqlx)?,
        mime_type: row.try_get("mime_type").map_err(map_sqlx)?,
        enabled: row.try_get("enabled").map_err(map_sqlx)?,
        lifecycle_status: map_lifecycle(row.try_get("lifecycle_status").map_err(map_sqlx)?)?,
        discovered_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("discovered_at")
            .map_err(map_sqlx)?
            .map(timestamp_to_rfc3339),
        version: row.try_get::<i64, _>("version").map_err(map_sqlx)? as u64,
        created_at: timestamp_to_rfc3339(row.try_get("created_at").map_err(map_sqlx)?),
        updated_at: timestamp_to_rfc3339(row.try_get("updated_at").map_err(map_sqlx)?),
        created_by: row.try_get::<i64, _>("created_by").map_err(map_sqlx)? as u64,
        updated_by: row.try_get::<i64, _>("updated_by").map_err(map_sqlx)? as u64,
        deleted_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("deleted_at")
            .map_err(map_sqlx)?
            .map(timestamp_to_rfc3339),
    })
}

fn row_to_prompt(row: &sqlx::postgres::PgRow) -> McpResult<McpPromptRecord> {
    Ok(McpPromptRecord {
        id: row.try_get::<i64, _>("id").map_err(map_sqlx)? as u64,
        uuid: row.try_get("uuid").map_err(map_sqlx)?,
        tenant_id: row.try_get::<i64, _>("tenant_id").map_err(map_sqlx)? as u64,
        organization_id: row.try_get::<i64, _>("organization_id").map_err(map_sqlx)? as u64,
        server_id: row.try_get::<i64, _>("server_id").map_err(map_sqlx)? as u64,
        connector_id: row.try_get::<i64, _>("connector_id").map_err(map_sqlx)? as u64,
        prompt_key: row.try_get("prompt_key").map_err(map_sqlx)?,
        name: row.try_get("name").map_err(map_sqlx)?,
        description: row.try_get("description").map_err(map_sqlx)?,
        arguments_schema_json: read_json_string(row, "arguments_schema_json")?,
        enabled: row.try_get("enabled").map_err(map_sqlx)?,
        lifecycle_status: map_lifecycle(row.try_get("lifecycle_status").map_err(map_sqlx)?)?,
        discovered_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("discovered_at")
            .map_err(map_sqlx)?
            .map(timestamp_to_rfc3339),
        version: row.try_get::<i64, _>("version").map_err(map_sqlx)? as u64,
        created_at: timestamp_to_rfc3339(row.try_get("created_at").map_err(map_sqlx)?),
        updated_at: timestamp_to_rfc3339(row.try_get("updated_at").map_err(map_sqlx)?),
        created_by: row.try_get::<i64, _>("created_by").map_err(map_sqlx)? as u64,
        updated_by: row.try_get::<i64, _>("updated_by").map_err(map_sqlx)? as u64,
        deleted_at: row
            .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("deleted_at")
            .map_err(map_sqlx)?
            .map(timestamp_to_rfc3339),
    })
}

fn row_to_invocation(row: &sqlx::postgres::PgRow) -> McpResult<McpInvocationRecord> {
    Ok(McpInvocationRecord {
        id: row.try_get::<i64, _>("id").map_err(map_sqlx)? as u64,
        uuid: row.try_get("uuid").map_err(map_sqlx)?,
        tenant_id: row.try_get::<i64, _>("tenant_id").map_err(map_sqlx)? as u64,
        organization_id: row.try_get::<i64, _>("organization_id").map_err(map_sqlx)? as u64,
        user_id: row.try_get::<i64, _>("user_id").map_err(map_sqlx)? as u64,
        server_id: row.try_get::<i64, _>("server_id").map_err(map_sqlx)? as u64,
        connector_id: row
            .try_get::<Option<i64>, _>("connector_id")
            .map_err(map_sqlx)?
            .map(|value| value as u64),
        invocation_kind: map_invocation_kind(
            row.try_get::<String, _>("invocation_kind")
                .map_err(map_sqlx)?
                .as_str(),
        )?,
        target_key: row.try_get("target_key").map_err(map_sqlx)?,
        request_id: row.try_get("request_id").map_err(map_sqlx)?,
        trace_id: row.try_get("trace_id").map_err(map_sqlx)?,
        idempotency_key: row.try_get("idempotency_key").map_err(map_sqlx)?,
        request_json: read_json_string(row, "request_json")?,
        response_json: read_optional_json_string(row, "response_json")?,
        status: row.try_get("status").map_err(map_sqlx)?,
        error_message: row.try_get("error_message").map_err(map_sqlx)?,
        duration_ms: row
            .try_get::<Option<i32>, _>("duration_ms")
            .map_err(map_sqlx)?
            .map(|value| value as u32),
        invoked_at: timestamp_to_rfc3339(row.try_get("invoked_at").map_err(map_sqlx)?),
        created_at: timestamp_to_rfc3339(row.try_get("created_at").map_err(map_sqlx)?),
    })
}

pub async fn list_categories(
    pool: &PgPool,
    tenant_id: u64,
) -> McpResult<Vec<McpServerCategoryRecord>> {
    let query = format!(
        r#"
        SELECT {CATEGORY_SELECT}
        FROM ai_mcp_server_category
        WHERE tenant_id IN (0, $1) AND {ACTIVE_ENTITY_FILTER}
        ORDER BY sort_order ASC, category_code ASC
        "#
    );
    let rows = sqlx::query(&query)
        .bind(tenant_id as i64)
        .fetch_all(pool)
        .await
        .map_err(map_sqlx)?;
    rows.iter().map(row_to_category).collect()
}

pub async fn get_category(
    pool: &PgPool,
    tenant_id: u64,
    category_code: &str,
) -> McpResult<McpServerCategoryRecord> {
    let query = format!(
        r#"
        SELECT {CATEGORY_SELECT}
        FROM ai_mcp_server_category
        WHERE tenant_id = $1 AND category_code = $2 AND deleted_at IS NULL
        LIMIT 1
        "#
    );
    let row = sqlx::query(&query)
        .bind(tenant_id as i64)
        .bind(category_code)
        .fetch_optional(pool)
        .await
        .map_err(map_sqlx)?;
    row.as_ref()
        .map(row_to_category)
        .transpose()?
        .ok_or_else(|| McpServiceError::NotFound(category_code.to_string()))
}

pub async fn upsert_category(
    pool: &PgPool,
    record: McpServerCategoryRecord,
) -> McpResult<McpServerCategoryRecord> {
    let id = resolve_entity_id(record.id);
    let uuid = resolve_entity_uuid(&record.uuid);
    let query = format!(
        r#"
        INSERT INTO ai_mcp_server_category (
            id, uuid, tenant_id, organization_id, category_code, name, description, parent_id,
            sort_order, icon_ref, lifecycle_status, version, created_by, updated_by
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )
        ON CONFLICT (tenant_id, category_code) DO UPDATE SET
            organization_id = EXCLUDED.organization_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            parent_id = EXCLUDED.parent_id,
            sort_order = EXCLUDED.sort_order,
            icon_ref = EXCLUDED.icon_ref,
            lifecycle_status = EXCLUDED.lifecycle_status,
            version = ai_mcp_server_category.version + 1,
            updated_by = EXCLUDED.updated_by,
            updated_at = CURRENT_TIMESTAMP,
            deleted_at = NULL
        RETURNING {CATEGORY_SELECT}
        "#
    );
    let row = sqlx::query(&query)
        .bind(id)
        .bind(uuid)
        .bind(record.tenant_id as i64)
        .bind(record.organization_id as i64)
        .bind(&record.category_code)
        .bind(&record.name)
        .bind(&record.description)
        .bind(record.parent_id as i64)
        .bind(record.sort_order)
        .bind(&record.icon_ref)
        .bind(record.lifecycle_status.as_db_code())
        .bind(record.version as i64)
        .bind(record.created_by as i64)
        .bind(record.updated_by as i64)
        .fetch_one(pool)
        .await
        .map_err(map_sqlx)?;
    row_to_category(&row)
}

pub async fn list_servers(pool: &PgPool, tenant_id: u64) -> McpResult<Vec<McpServerRecord>> {
    let query = format!(
        r#"
        SELECT {SERVER_SELECT}
        FROM ai_mcp_server
        WHERE tenant_id = $1 AND {ACTIVE_ENTITY_FILTER}
        ORDER BY updated_at DESC, server_key ASC
        "#
    );
    let rows = sqlx::query(&query)
        .bind(tenant_id as i64)
        .fetch_all(pool)
        .await
        .map_err(map_sqlx)?;
    rows.iter().map(row_to_server).collect()
}

pub async fn get_server(pool: &PgPool, tenant_id: u64, server_key: &str) -> McpResult<McpServerRecord> {
    let query = format!(
        r#"
        SELECT {SERVER_SELECT}
        FROM ai_mcp_server
        WHERE tenant_id = $1 AND server_key = $2 AND deleted_at IS NULL
        LIMIT 1
        "#
    );
    let row = sqlx::query(&query)
        .bind(tenant_id as i64)
        .bind(server_key)
        .fetch_optional(pool)
        .await
        .map_err(map_sqlx)?;
    row.as_ref()
        .map(row_to_server)
        .transpose()?
        .ok_or_else(|| McpServiceError::NotFound(server_key.to_string()))
}

pub async fn upsert_server(pool: &PgPool, record: McpServerRecord) -> McpResult<McpServerRecord> {
    let id = resolve_entity_id(record.id);
    let uuid = resolve_entity_uuid(&record.uuid);
    let tags_json = bind_json_string(&string_list_to_json(&record.tags, "tags")?, "tags_json")?;
    let query = format!(
        r#"
        INSERT INTO ai_mcp_server (
            id, uuid, tenant_id, organization_id, owner_user_id, server_key, name, description,
            category_id, category_code, transport, visibility, data_scope, latest_connector_id,
            published_connector_id, health_status, lifecycle_status, tags_json, icon_ref, version,
            created_by, updated_by
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
            $19, $20, $21, $22
        )
        ON CONFLICT (tenant_id, server_key) DO UPDATE SET
            organization_id = EXCLUDED.organization_id,
            owner_user_id = EXCLUDED.owner_user_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            category_id = EXCLUDED.category_id,
            category_code = EXCLUDED.category_code,
            transport = EXCLUDED.transport,
            visibility = EXCLUDED.visibility,
            data_scope = EXCLUDED.data_scope,
            latest_connector_id = EXCLUDED.latest_connector_id,
            published_connector_id = EXCLUDED.published_connector_id,
            health_status = EXCLUDED.health_status,
            lifecycle_status = EXCLUDED.lifecycle_status,
            tags_json = EXCLUDED.tags_json,
            icon_ref = EXCLUDED.icon_ref,
            version = ai_mcp_server.version + 1,
            updated_by = EXCLUDED.updated_by,
            updated_at = CURRENT_TIMESTAMP,
            deleted_at = NULL
        RETURNING {SERVER_SELECT}
        "#
    );
    let row = sqlx::query(&query)
        .bind(id)
        .bind(uuid)
        .bind(record.tenant_id as i64)
        .bind(record.organization_id as i64)
        .bind(record.owner_user_id as i64)
        .bind(&record.server_key)
        .bind(&record.name)
        .bind(&record.description)
        .bind(record.category_id.map(|value| value as i64))
        .bind(&record.category_code)
        .bind(record.transport.as_str())
        .bind(record.visibility.as_str())
        .bind(record.data_scope.as_db_code())
        .bind(record.latest_connector_id.map(|value| value as i64))
        .bind(record.published_connector_id.map(|value| value as i64))
        .bind(record.health_status.as_str())
        .bind(record.lifecycle_status.as_db_code())
        .bind(tags_json)
        .bind(&record.icon_ref)
        .bind(record.version as i64)
        .bind(record.created_by as i64)
        .bind(record.updated_by as i64)
        .fetch_one(pool)
        .await
        .map_err(map_sqlx)?;
    row_to_server(&row)
}

pub async fn delete_server(
    pool: &PgPool,
    tenant_id: u64,
    server_key: &str,
) -> McpResult<McpServerRecord> {
    let query = format!(
        r#"
        UPDATE ai_mcp_server
        SET lifecycle_status = 4, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND server_key = $2 AND deleted_at IS NULL
        RETURNING {SERVER_SELECT}
        "#
    );
    let row = sqlx::query(&query)
        .bind(tenant_id as i64)
        .bind(server_key)
        .fetch_optional(pool)
        .await
        .map_err(map_sqlx)?;
    row.as_ref()
        .map(row_to_server)
        .transpose()?
        .ok_or_else(|| McpServiceError::NotFound(server_key.to_string()))
}

pub async fn list_connectors(
    pool: &PgPool,
    tenant_id: u64,
    server_id: u64,
) -> McpResult<Vec<McpConnectorRecord>> {
    let query = format!(
        r#"
        SELECT {CONNECTOR_SELECT}
        FROM ai_mcp_connector
        WHERE tenant_id = $1 AND server_id = $2 AND {ACTIVE_ENTITY_FILTER}
        ORDER BY updated_at DESC, connector_key ASC
        "#
    );
    let rows = sqlx::query(&query)
        .bind(tenant_id as i64)
        .bind(server_id as i64)
        .fetch_all(pool)
        .await
        .map_err(map_sqlx)?;
    rows.iter().map(row_to_connector).collect()
}

pub async fn get_connector(
    pool: &PgPool,
    tenant_id: u64,
    server_id: u64,
    connector_key: &str,
) -> McpResult<McpConnectorRecord> {
    let query = format!(
        r#"
        SELECT {CONNECTOR_SELECT}
        FROM ai_mcp_connector
        WHERE tenant_id = $1 AND server_id = $2 AND connector_key = $3 AND deleted_at IS NULL
        LIMIT 1
        "#
    );
    let row = sqlx::query(&query)
        .bind(tenant_id as i64)
        .bind(server_id as i64)
        .bind(connector_key)
        .fetch_optional(pool)
        .await
        .map_err(map_sqlx)?;
    row.as_ref()
        .map(row_to_connector)
        .transpose()?
        .ok_or_else(|| McpServiceError::NotFound(connector_key.to_string()))
}

pub async fn upsert_connector(
    pool: &PgPool,
    record: McpConnectorRecord,
) -> McpResult<McpConnectorRecord> {
    let id = resolve_entity_id(record.id);
    let uuid = resolve_entity_uuid(&record.uuid);
    let args_json = bind_json_string(&record.args_json, "args_json")?;
    let env_schema_json = bind_json_string(&record.env_schema_json, "env_schema_json")?;
    let retry_policy_json = bind_json_string(&record.retry_policy_json, "retry_policy_json")?;
    let query = format!(
        r#"
        INSERT INTO ai_mcp_connector (
            id, uuid, tenant_id, organization_id, server_id, connector_key, publish_status,
            transport, endpoint_url, command_ref, args_json, env_schema_json, auth_type,
            secret_ref, timeout_ms, retry_policy_json, config_hash, lifecycle_status, version,
            created_by, updated_by
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
            $19, $20, $21
        )
        ON CONFLICT (tenant_id, server_id, connector_key) DO UPDATE SET
            publish_status = EXCLUDED.publish_status,
            transport = EXCLUDED.transport,
            endpoint_url = EXCLUDED.endpoint_url,
            command_ref = EXCLUDED.command_ref,
            args_json = EXCLUDED.args_json,
            env_schema_json = EXCLUDED.env_schema_json,
            auth_type = EXCLUDED.auth_type,
            secret_ref = EXCLUDED.secret_ref,
            timeout_ms = EXCLUDED.timeout_ms,
            retry_policy_json = EXCLUDED.retry_policy_json,
            config_hash = EXCLUDED.config_hash,
            lifecycle_status = EXCLUDED.lifecycle_status,
            version = ai_mcp_connector.version + 1,
            updated_by = EXCLUDED.updated_by,
            updated_at = CURRENT_TIMESTAMP,
            deleted_at = NULL
        RETURNING {CONNECTOR_SELECT}
        "#
    );
    let row = sqlx::query(&query)
        .bind(id)
        .bind(uuid)
        .bind(record.tenant_id as i64)
        .bind(record.organization_id as i64)
        .bind(record.server_id as i64)
        .bind(&record.connector_key)
        .bind(record.publish_status.as_str())
        .bind(record.transport.as_str())
        .bind(&record.endpoint_url)
        .bind(&record.command_ref)
        .bind(args_json)
        .bind(env_schema_json)
        .bind(record.auth_type.as_str())
        .bind(&record.secret_ref)
        .bind(record.timeout_ms as i32)
        .bind(retry_policy_json)
        .bind(&record.config_hash)
        .bind(record.lifecycle_status.as_db_code())
        .bind(record.version as i64)
        .bind(record.created_by as i64)
        .bind(record.updated_by as i64)
        .fetch_one(pool)
        .await
        .map_err(map_sqlx)?;
    row_to_connector(&row)
}

pub async fn delete_connector(
    pool: &PgPool,
    tenant_id: u64,
    server_id: u64,
    connector_key: &str,
) -> McpResult<McpConnectorRecord> {
    let query = format!(
        r#"
        UPDATE ai_mcp_connector
        SET lifecycle_status = 4, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND server_id = $2 AND connector_key = $3 AND deleted_at IS NULL
        RETURNING {CONNECTOR_SELECT}
        "#
    );
    let row = sqlx::query(&query)
        .bind(tenant_id as i64)
        .bind(server_id as i64)
        .bind(connector_key)
        .fetch_optional(pool)
        .await
        .map_err(map_sqlx)?;
    row.as_ref()
        .map(row_to_connector)
        .transpose()?
        .ok_or_else(|| McpServiceError::NotFound(connector_key.to_string()))
}

pub async fn list_tools(pool: &PgPool, tenant_id: u64, server_id: u64) -> McpResult<Vec<McpToolRecord>> {
    let query = format!(
        r#"
        SELECT {TOOL_SELECT}
        FROM ai_mcp_tool
        WHERE tenant_id = $1 AND server_id = $2 AND deleted_at IS NULL AND enabled = TRUE
        ORDER BY sort_weight ASC, tool_key ASC
        "#
    );
    let rows = sqlx::query(&query)
        .bind(tenant_id as i64)
        .bind(server_id as i64)
        .fetch_all(pool)
        .await
        .map_err(map_sqlx)?;
    rows.iter().map(row_to_tool).collect()
}

pub async fn get_tool(
    pool: &PgPool,
    tenant_id: u64,
    server_id: u64,
    tool_key: &str,
) -> McpResult<McpToolRecord> {
    let query = format!(
        r#"
        SELECT {TOOL_SELECT}
        FROM ai_mcp_tool
        WHERE tenant_id = $1 AND server_id = $2 AND tool_key = $3 AND deleted_at IS NULL
        LIMIT 1
        "#
    );
    let row = sqlx::query(&query)
        .bind(tenant_id as i64)
        .bind(server_id as i64)
        .bind(tool_key)
        .fetch_optional(pool)
        .await
        .map_err(map_sqlx)?;
    row.as_ref()
        .map(row_to_tool)
        .transpose()?
        .ok_or_else(|| McpServiceError::NotFound(tool_key.to_string()))
}

pub async fn upsert_tool(pool: &PgPool, record: McpToolRecord) -> McpResult<McpToolRecord> {
    let id = resolve_entity_id(record.id);
    let uuid = resolve_entity_uuid(&record.uuid);
    let input_schema_json = bind_json_string(&record.input_schema_json, "input_schema_json")?;
    let output_schema_json = bind_json_string(&record.output_schema_json, "output_schema_json")?;
    let rate_limit_policy_json =
        bind_json_string(&record.rate_limit_policy_json, "rate_limit_policy_json")?;
    let query = format!(
        r#"
        INSERT INTO ai_mcp_tool (
            id, uuid, tenant_id, organization_id, server_id, connector_id, tool_key, name,
            description, input_schema_json, output_schema_json, risk_level, requires_approval,
            enabled, lifecycle_status, rate_limit_policy_json, schema_hash, sort_weight, version,
            created_by, updated_by
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
            $19, $20, $21
        )
        ON CONFLICT (tenant_id, server_id, tool_key) DO UPDATE SET
            connector_id = EXCLUDED.connector_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            input_schema_json = EXCLUDED.input_schema_json,
            output_schema_json = EXCLUDED.output_schema_json,
            risk_level = EXCLUDED.risk_level,
            requires_approval = EXCLUDED.requires_approval,
            enabled = EXCLUDED.enabled,
            lifecycle_status = EXCLUDED.lifecycle_status,
            rate_limit_policy_json = EXCLUDED.rate_limit_policy_json,
            schema_hash = EXCLUDED.schema_hash,
            sort_weight = EXCLUDED.sort_weight,
            version = ai_mcp_tool.version + 1,
            updated_by = EXCLUDED.updated_by,
            updated_at = CURRENT_TIMESTAMP,
            deleted_at = NULL
        RETURNING {TOOL_SELECT}
        "#
    );
    let row = sqlx::query(&query)
        .bind(id)
        .bind(uuid)
        .bind(record.tenant_id as i64)
        .bind(record.organization_id as i64)
        .bind(record.server_id as i64)
        .bind(record.connector_id as i64)
        .bind(&record.tool_key)
        .bind(&record.name)
        .bind(&record.description)
        .bind(input_schema_json)
        .bind(output_schema_json)
        .bind(&record.risk_level)
        .bind(record.requires_approval)
        .bind(record.enabled)
        .bind(record.lifecycle_status.as_db_code())
        .bind(rate_limit_policy_json)
        .bind(&record.schema_hash)
        .bind(record.sort_weight)
        .bind(record.version as i64)
        .bind(record.created_by as i64)
        .bind(record.updated_by as i64)
        .fetch_one(pool)
        .await
        .map_err(map_sqlx)?;
    row_to_tool(&row)
}

pub async fn list_resources(
    pool: &PgPool,
    tenant_id: u64,
    server_id: u64,
) -> McpResult<Vec<McpResourceRecord>> {
    let query = format!(
        r#"
        SELECT {RESOURCE_SELECT}
        FROM ai_mcp_resource
        WHERE tenant_id = $1 AND server_id = $2 AND deleted_at IS NULL AND enabled = TRUE
        ORDER BY resource_key ASC
        "#
    );
    let rows = sqlx::query(&query)
        .bind(tenant_id as i64)
        .bind(server_id as i64)
        .fetch_all(pool)
        .await
        .map_err(map_sqlx)?;
    rows.iter().map(row_to_resource).collect()
}

pub async fn get_resource(
    pool: &PgPool,
    tenant_id: u64,
    server_id: u64,
    resource_key: &str,
) -> McpResult<McpResourceRecord> {
    let query = format!(
        r#"
        SELECT {RESOURCE_SELECT}
        FROM ai_mcp_resource
        WHERE tenant_id = $1 AND server_id = $2 AND resource_key = $3 AND deleted_at IS NULL
        LIMIT 1
        "#
    );
    let row = sqlx::query(&query)
        .bind(tenant_id as i64)
        .bind(server_id as i64)
        .bind(resource_key)
        .fetch_optional(pool)
        .await
        .map_err(map_sqlx)?;
    row.as_ref()
        .map(row_to_resource)
        .transpose()?
        .ok_or_else(|| McpServiceError::NotFound(resource_key.to_string()))
}

pub async fn upsert_resource(
    pool: &PgPool,
    record: McpResourceRecord,
) -> McpResult<McpResourceRecord> {
    let id = resolve_entity_id(record.id);
    let uuid = resolve_entity_uuid(&record.uuid);
    let query = format!(
        r#"
        INSERT INTO ai_mcp_resource (
            id, uuid, tenant_id, organization_id, server_id, connector_id, resource_key, uri,
            name, description, mime_type, enabled, lifecycle_status, version, created_by,
            updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (tenant_id, server_id, resource_key) DO UPDATE SET
            connector_id = EXCLUDED.connector_id,
            uri = EXCLUDED.uri,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            mime_type = EXCLUDED.mime_type,
            enabled = EXCLUDED.enabled,
            lifecycle_status = EXCLUDED.lifecycle_status,
            version = ai_mcp_resource.version + 1,
            updated_by = EXCLUDED.updated_by,
            updated_at = CURRENT_TIMESTAMP,
            deleted_at = NULL
        RETURNING {RESOURCE_SELECT}
        "#
    );
    let row = sqlx::query(&query)
        .bind(id)
        .bind(uuid)
        .bind(record.tenant_id as i64)
        .bind(record.organization_id as i64)
        .bind(record.server_id as i64)
        .bind(record.connector_id as i64)
        .bind(&record.resource_key)
        .bind(&record.uri)
        .bind(&record.name)
        .bind(&record.description)
        .bind(&record.mime_type)
        .bind(record.enabled)
        .bind(record.lifecycle_status.as_db_code())
        .bind(record.version as i64)
        .bind(record.created_by as i64)
        .bind(record.updated_by as i64)
        .fetch_one(pool)
        .await
        .map_err(map_sqlx)?;
    row_to_resource(&row)
}

pub async fn list_prompts(
    pool: &PgPool,
    tenant_id: u64,
    server_id: u64,
) -> McpResult<Vec<McpPromptRecord>> {
    let query = format!(
        r#"
        SELECT {PROMPT_SELECT}
        FROM ai_mcp_prompt
        WHERE tenant_id = $1 AND server_id = $2 AND deleted_at IS NULL AND enabled = TRUE
        ORDER BY prompt_key ASC
        "#
    );
    let rows = sqlx::query(&query)
        .bind(tenant_id as i64)
        .bind(server_id as i64)
        .fetch_all(pool)
        .await
        .map_err(map_sqlx)?;
    rows.iter().map(row_to_prompt).collect()
}

pub async fn get_prompt(
    pool: &PgPool,
    tenant_id: u64,
    server_id: u64,
    prompt_key: &str,
) -> McpResult<McpPromptRecord> {
    let query = format!(
        r#"
        SELECT {PROMPT_SELECT}
        FROM ai_mcp_prompt
        WHERE tenant_id = $1 AND server_id = $2 AND prompt_key = $3 AND deleted_at IS NULL
        LIMIT 1
        "#
    );
    let row = sqlx::query(&query)
        .bind(tenant_id as i64)
        .bind(server_id as i64)
        .bind(prompt_key)
        .fetch_optional(pool)
        .await
        .map_err(map_sqlx)?;
    row.as_ref()
        .map(row_to_prompt)
        .transpose()?
        .ok_or_else(|| McpServiceError::NotFound(prompt_key.to_string()))
}

pub async fn upsert_prompt(pool: &PgPool, record: McpPromptRecord) -> McpResult<McpPromptRecord> {
    let id = resolve_entity_id(record.id);
    let uuid = resolve_entity_uuid(&record.uuid);
    let arguments_schema_json =
        bind_json_string(&record.arguments_schema_json, "arguments_schema_json")?;
    let query = format!(
        r#"
        INSERT INTO ai_mcp_prompt (
            id, uuid, tenant_id, organization_id, server_id, connector_id, prompt_key, name,
            description, arguments_schema_json, enabled, lifecycle_status, version, created_by,
            updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (tenant_id, server_id, prompt_key) DO UPDATE SET
            connector_id = EXCLUDED.connector_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            arguments_schema_json = EXCLUDED.arguments_schema_json,
            enabled = EXCLUDED.enabled,
            lifecycle_status = EXCLUDED.lifecycle_status,
            version = ai_mcp_prompt.version + 1,
            updated_by = EXCLUDED.updated_by,
            updated_at = CURRENT_TIMESTAMP,
            deleted_at = NULL
        RETURNING {PROMPT_SELECT}
        "#
    );
    let row = sqlx::query(&query)
        .bind(id)
        .bind(uuid)
        .bind(record.tenant_id as i64)
        .bind(record.organization_id as i64)
        .bind(record.server_id as i64)
        .bind(record.connector_id as i64)
        .bind(&record.prompt_key)
        .bind(&record.name)
        .bind(&record.description)
        .bind(arguments_schema_json)
        .bind(record.enabled)
        .bind(record.lifecycle_status.as_db_code())
        .bind(record.version as i64)
        .bind(record.created_by as i64)
        .bind(record.updated_by as i64)
        .fetch_one(pool)
        .await
        .map_err(map_sqlx)?;
    row_to_prompt(&row)
}

pub async fn list_invocations(
    pool: &PgPool,
    tenant_id: u64,
    server_id: Option<u64>,
    limit: u32,
) -> McpResult<Vec<McpInvocationRecord>> {
    let limit = limit.clamp(1, 500) as i64;
    let rows = if let Some(server_id) = server_id {
        let query = format!(
            r#"
            SELECT {INVOCATION_SELECT}
            FROM ai_mcp_invocation_log
            WHERE tenant_id = $1 AND server_id = $2
            ORDER BY invoked_at DESC
            LIMIT $3
            "#
        );
        sqlx::query(&query)
            .bind(tenant_id as i64)
            .bind(server_id as i64)
            .bind(limit)
            .fetch_all(pool)
            .await
            .map_err(map_sqlx)?
    } else {
        let query = format!(
            r#"
            SELECT {INVOCATION_SELECT}
            FROM ai_mcp_invocation_log
            WHERE tenant_id = $1
            ORDER BY invoked_at DESC
            LIMIT $2
            "#
        );
        sqlx::query(&query)
            .bind(tenant_id as i64)
            .bind(limit)
            .fetch_all(pool)
            .await
            .map_err(map_sqlx)?
    };
    rows.iter().map(row_to_invocation).collect()
}

pub async fn get_invocation_by_idempotency(
    pool: &PgPool,
    tenant_id: u64,
    idempotency_key: &str,
) -> McpResult<Option<McpInvocationRecord>> {
    let query = format!(
        r#"
        SELECT {INVOCATION_SELECT}
        FROM ai_mcp_invocation_log
        WHERE tenant_id = $1 AND idempotency_key = $2
        LIMIT 1
        "#
    );
    let row = sqlx::query(&query)
        .bind(tenant_id as i64)
        .bind(idempotency_key)
        .fetch_optional(pool)
        .await
        .map_err(map_sqlx)?;
    row.as_ref().map(row_to_invocation).transpose()
}

pub async fn append_invocation(
    pool: &PgPool,
    record: McpInvocationRecord,
) -> McpResult<McpInvocationRecord> {
    if let Some(key) = record
        .idempotency_key
        .as_deref()
        .filter(|value| !value.is_empty())
    {
        if let Some(existing) = get_invocation_by_idempotency(pool, record.tenant_id, key).await? {
            return Ok(existing);
        }
    }
    let id = resolve_entity_id(record.id);
    let uuid = resolve_entity_uuid(&record.uuid);
    let request_json = bind_json_string(&record.request_json, "request_json")?;
    let response_json = bind_optional_json_string(&record.response_json, "response_json")?;
    let query = format!(
        r#"
        INSERT INTO ai_mcp_invocation_log (
            id, uuid, tenant_id, organization_id, user_id, server_id, connector_id,
            invocation_kind, target_key, request_id, trace_id, idempotency_key, request_json,
            response_json, status, error_message, duration_ms
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        RETURNING {INVOCATION_SELECT}
        "#
    );
    let row = sqlx::query(&query)
        .bind(id)
        .bind(uuid)
        .bind(record.tenant_id as i64)
        .bind(record.organization_id as i64)
        .bind(record.user_id as i64)
        .bind(record.server_id as i64)
        .bind(record.connector_id.map(|value| value as i64))
        .bind(record.invocation_kind.as_str())
        .bind(&record.target_key)
        .bind(&record.request_id)
        .bind(&record.trace_id)
        .bind(&record.idempotency_key)
        .bind(request_json)
        .bind(response_json)
        .bind(&record.status)
        .bind(&record.error_message)
        .bind(record.duration_ms.map(|value| value as i32))
        .fetch_one(pool)
        .await
        .map_err(map_sqlx)?;
    row_to_invocation(&row)
}
