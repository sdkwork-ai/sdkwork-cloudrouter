use std::time::{SystemTime, UNIX_EPOCH};

use serde_json::{Map, Value};
use sqlx::{Row, SqlitePool};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    AdminServiceNodeCommandFuture, AdminServiceNodeDeleteOutcome, AdminServiceNodeItem,
    AdminServiceNodeStore, CreateAdminServiceNodeCommand, DeleteAdminServiceNodeCommand,
    ListAdminServiceNodesQuery, UpdateAdminServiceNodeCommand, UpdateAdminServiceNodeStatusCommand,
};

#[derive(Debug, Clone)]
pub struct SqliteAdminServiceNodeStore {
    pool: SqlitePool,
}

impl SqliteAdminServiceNodeStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl AdminServiceNodeStore for SqliteAdminServiceNodeStore {
    fn list_service_nodes<'a>(
        &'a self,
        query: ListAdminServiceNodesQuery,
    ) -> AdminServiceNodeCommandFuture<'a, Vec<AdminServiceNodeItem>> {
        Box::pin(async move { list_service_nodes(&self.pool, query).await })
    }

    fn create_service_node<'a>(
        &'a self,
        command: CreateAdminServiceNodeCommand,
    ) -> AdminServiceNodeCommandFuture<'a, AdminServiceNodeItem> {
        Box::pin(async move { create_service_node(&self.pool, command).await })
    }

    fn update_service_node<'a>(
        &'a self,
        command: UpdateAdminServiceNodeCommand,
    ) -> AdminServiceNodeCommandFuture<'a, AdminServiceNodeItem> {
        Box::pin(async move { update_service_node(&self.pool, command).await })
    }

    fn update_service_node_status<'a>(
        &'a self,
        command: UpdateAdminServiceNodeStatusCommand,
    ) -> AdminServiceNodeCommandFuture<'a, AdminServiceNodeItem> {
        Box::pin(async move { update_service_node_status(&self.pool, command).await })
    }

    fn delete_service_node<'a>(
        &'a self,
        command: DeleteAdminServiceNodeCommand,
    ) -> AdminServiceNodeCommandFuture<'a, AdminServiceNodeDeleteOutcome> {
        Box::pin(async move { delete_service_node(&self.pool, command).await })
    }
}

async fn list_service_nodes(
    pool: &SqlitePool,
    query: ListAdminServiceNodesQuery,
) -> DomainResult<Vec<AdminServiceNodeItem>> {
    let status = optional_status_int(query.status.as_deref())?;
    let rows = sqlx::query(
        r#"
        SELECT
            COALESCE(NULLIF(instance_code, ''), CAST(id AS TEXT)) AS service_node_id,
            COALESCE(NULLIF(node_name, ''), NULLIF(host_name, ''), NULLIF(instance_code, ''), uuid) AS service_node_name,
            COALESCE(metadata, '{}') AS metadata,
            COALESCE(ip_address_masked, '') AS ip,
            status,
            health_status,
            COALESCE(updated_at, created_at, '') AS updated_at
        FROM ops_gateway_instance
        WHERE (tenant_id = ? OR tenant_id = 0 OR tenant_id IS NULL)
          AND (organization_id = ? OR organization_id = 0 OR organization_id IS NULL)
          AND deleted_at IS NULL
          AND (? IS NULL
               OR LOWER(COALESCE(instance_code, '')) LIKE '%' || LOWER(?) || '%'
               OR LOWER(COALESCE(node_name, '')) LIKE '%' || LOWER(?) || '%'
               OR LOWER(COALESCE(host_name, '')) LIKE '%' || LOWER(?) || '%'
               OR LOWER(COALESCE(ip_address_masked, '')) LIKE '%' || LOWER(?) || '%'
               OR LOWER(COALESCE(metadata, '')) LIKE '%' || LOWER(?) || '%')
          AND (? IS NULL OR status = ?)
        ORDER BY updated_at DESC, id DESC
        LIMIT 500
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.search.clone())
    .bind(query.search.clone())
    .bind(query.search.clone())
    .bind(query.search.clone())
    .bind(query.search.clone())
    .bind(query.search)
    .bind(status)
    .bind(status)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list service nodes", error))?;

    rows.into_iter().map(item_from_row).collect()
}

async fn create_service_node(
    pool: &SqlitePool,
    command: CreateAdminServiceNodeCommand,
) -> DomainResult<AdminServiceNodeItem> {
    let status = optional_status_int(command.status.as_deref())?.unwrap_or(1);
    let code = generated_instance_code(&command.name, command.subject.tenant_id);
    let metadata = metadata_json(&command.domain, &command.remark)?;
    sqlx::query(
        r#"
        INSERT INTO ops_gateway_instance (
            uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at,
            version, deleted_at, deleted_by, metadata, instance_code, deployment_mode,
            ip_address_masked, node_name, health_status
        )
        VALUES (
            ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
            1, NULL, NULL, ?, ?, 2, ?, ?, NULL
        )
        "#,
    )
    .bind(&code)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(status)
    .bind(metadata)
    .bind(&code)
    .bind(command.ip)
    .bind(command.name)
    .execute(pool)
    .await
    .map_err(|error| store_error("failed to create service node", error))?;

    load_service_node(
        pool,
        command.subject.tenant_id,
        command.subject.organization_id,
        &code,
    )
    .await
}

async fn update_service_node(
    pool: &SqlitePool,
    command: UpdateAdminServiceNodeCommand,
) -> DomainResult<AdminServiceNodeItem> {
    let mut metadata = load_metadata(
        pool,
        command.subject.tenant_id,
        command.subject.organization_id,
        &command.node_id,
    )
    .await?;
    if let Some(domain) = &command.domain {
        metadata.insert("domain".to_owned(), Value::String(domain.clone()));
    }
    if let Some(remark) = &command.remark {
        metadata.insert("remark".to_owned(), Value::String(remark.clone()));
    }
    let metadata = serde_json::to_string(&Value::Object(metadata)).map_err(|error| {
        DomainError::new(format!(
            "failed to serialize service node metadata: {error}"
        ))
    })?;

    let result = sqlx::query(
        r#"
        UPDATE ops_gateway_instance
        SET node_name = COALESCE(?, node_name),
            ip_address_masked = COALESCE(?, ip_address_masked),
            metadata = ?,
            updated_at = CURRENT_TIMESTAMP,
            version = COALESCE(version, 0) + 1
        WHERE (tenant_id = ? OR tenant_id = 0 OR tenant_id IS NULL)
          AND (organization_id = ? OR organization_id = 0 OR organization_id IS NULL)
          AND deleted_at IS NULL
          AND (instance_code = ? OR CAST(id AS TEXT) = ?)
        "#,
    )
    .bind(command.name)
    .bind(command.ip)
    .bind(metadata)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.node_id)
    .bind(&command.node_id)
    .execute(pool)
    .await
    .map_err(|error| store_error("failed to update service node", error))?;

    ensure_affected(result.rows_affected(), "service node not found")?;
    load_service_node(
        pool,
        command.subject.tenant_id,
        command.subject.organization_id,
        &command.node_id,
    )
    .await
}

async fn update_service_node_status(
    pool: &SqlitePool,
    command: UpdateAdminServiceNodeStatusCommand,
) -> DomainResult<AdminServiceNodeItem> {
    let status = status_int(&command.status)?;
    let result = sqlx::query(
        r#"
        UPDATE ops_gateway_instance
        SET status = ?,
            health_status = CASE WHEN ? = 0 THEN 0 ELSE health_status END,
            updated_at = CURRENT_TIMESTAMP,
            version = COALESCE(version, 0) + 1
        WHERE (tenant_id = ? OR tenant_id = 0 OR tenant_id IS NULL)
          AND (organization_id = ? OR organization_id = 0 OR organization_id IS NULL)
          AND deleted_at IS NULL
          AND (instance_code = ? OR CAST(id AS TEXT) = ?)
        "#,
    )
    .bind(status)
    .bind(status)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.node_id)
    .bind(&command.node_id)
    .execute(pool)
    .await
    .map_err(|error| store_error("failed to update service node status", error))?;

    ensure_affected(result.rows_affected(), "service node not found")?;
    load_service_node(
        pool,
        command.subject.tenant_id,
        command.subject.organization_id,
        &command.node_id,
    )
    .await
}

async fn delete_service_node(
    pool: &SqlitePool,
    command: DeleteAdminServiceNodeCommand,
) -> DomainResult<AdminServiceNodeDeleteOutcome> {
    let result = sqlx::query(
        r#"
        UPDATE ops_gateway_instance
        SET status = 0,
            deleted_at = CURRENT_TIMESTAMP,
            deleted_by = ?,
            updated_at = CURRENT_TIMESTAMP,
            version = COALESCE(version, 0) + 1
        WHERE (tenant_id = ? OR tenant_id = 0 OR tenant_id IS NULL)
          AND (organization_id = ? OR organization_id = 0 OR organization_id IS NULL)
          AND deleted_at IS NULL
          AND (instance_code = ? OR CAST(id AS TEXT) = ?)
        "#,
    )
    .bind(command.subject.operator_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.node_id)
    .bind(&command.node_id)
    .execute(pool)
    .await
    .map_err(|error| store_error("failed to delete service node", error))?;

    ensure_affected(result.rows_affected(), "service node not found")?;
    Ok(AdminServiceNodeDeleteOutcome { deleted: true })
}

async fn load_service_node(
    pool: &SqlitePool,
    tenant_id: i64,
    organization_id: i64,
    node_id: &str,
) -> DomainResult<AdminServiceNodeItem> {
    let row = sqlx::query(
        r#"
        SELECT
            COALESCE(NULLIF(instance_code, ''), CAST(id AS TEXT)) AS service_node_id,
            COALESCE(NULLIF(node_name, ''), NULLIF(host_name, ''), NULLIF(instance_code, ''), uuid) AS service_node_name,
            COALESCE(metadata, '{}') AS metadata,
            COALESCE(ip_address_masked, '') AS ip,
            status,
            health_status,
            COALESCE(updated_at, created_at, '') AS updated_at
        FROM ops_gateway_instance
        WHERE (tenant_id = ? OR tenant_id = 0 OR tenant_id IS NULL)
          AND (organization_id = ? OR organization_id = 0 OR organization_id IS NULL)
          AND deleted_at IS NULL
          AND (instance_code = ? OR CAST(id AS TEXT) = ?)
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .bind(node_id)
    .bind(node_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("failed to load service node", error))?
    .ok_or_else(|| DomainError::new("service node not found"))?;

    item_from_row(row)
}

async fn load_metadata(
    pool: &SqlitePool,
    tenant_id: i64,
    organization_id: i64,
    node_id: &str,
) -> DomainResult<Map<String, Value>> {
    let metadata = sqlx::query(
        r#"
        SELECT COALESCE(metadata, '{}') AS metadata
        FROM ops_gateway_instance
        WHERE (tenant_id = ? OR tenant_id = 0 OR tenant_id IS NULL)
          AND (organization_id = ? OR organization_id = 0 OR organization_id IS NULL)
          AND deleted_at IS NULL
          AND (instance_code = ? OR CAST(id AS TEXT) = ?)
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .bind(node_id)
    .bind(node_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("failed to load service node metadata", error))?
    .ok_or_else(|| DomainError::new("service node not found"))?
    .try_get::<String, _>("metadata")
    .map_err(row_error)?;

    parse_metadata(&metadata)
}

fn item_from_row(row: sqlx::sqlite::SqliteRow) -> DomainResult<AdminServiceNodeItem> {
    let metadata = row
        .try_get::<String, _>("metadata")
        .map_err(row_error)
        .and_then(|value| parse_metadata(&value))?;
    Ok(AdminServiceNodeItem {
        id: row.try_get("service_node_id").map_err(row_error)?,
        name: row.try_get("service_node_name").map_err(row_error)?,
        domain: string_from_metadata(&metadata, "domain"),
        ip: row.try_get("ip").map_err(row_error)?,
        remark: string_from_metadata(&metadata, "remark"),
        status: status_label(required_integer_cell(&row, "status")?)?,
        health_status: health_status_label(optional_integer_cell(&row, "health_status"))?,
        updated_at: row.try_get("updated_at").map_err(row_error)?,
    })
}

fn parse_metadata(value: &str) -> DomainResult<Map<String, Value>> {
    match serde_json::from_str::<Value>(value).unwrap_or(Value::Object(Map::new())) {
        Value::Object(map) => Ok(map),
        _ => Ok(Map::new()),
    }
}

fn string_from_metadata(metadata: &Map<String, Value>, key: &str) -> String {
    metadata
        .get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_owned()
}

fn metadata_json(domain: &str, remark: &str) -> DomainResult<String> {
    let mut metadata = Map::new();
    metadata.insert("domain".to_owned(), Value::String(domain.to_owned()));
    metadata.insert("remark".to_owned(), Value::String(remark.to_owned()));
    serde_json::to_string(&Value::Object(metadata)).map_err(|error| {
        DomainError::new(format!(
            "failed to serialize service node metadata: {error}"
        ))
    })
}

fn generated_instance_code(name: &str, tenant_id: i64) -> String {
    let suffix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    let slug = name
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() {
                ch.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches('-')
        .chars()
        .take(48)
        .collect::<String>();
    format!(
        "service-node-{tenant_id}-{}-{suffix}",
        if slug.is_empty() {
            "node"
        } else {
            slug.as_str()
        }
    )
}

fn optional_status_int(status: Option<&str>) -> DomainResult<Option<i64>> {
    status.map(status_int).transpose()
}

fn status_int(status: &str) -> DomainResult<i64> {
    match status {
        "enabled" => Ok(1),
        "disabled" => Ok(0),
        value => Err(DomainError::new(format!(
            "unsupported service node status: {value}"
        ))),
    }
}

fn status_label(status: i64) -> DomainResult<String> {
    match status {
        1 => Ok("enabled"),
        0 => Ok("disabled"),
        value => Err(DomainError::new(format!(
            "invalid service node status from database row: {value}"
        ))),
    }
    .map(str::to_owned)
}

fn health_status_label(status: Option<i64>) -> DomainResult<String> {
    match status {
        Some(1) => Ok("online"),
        Some(2) => Ok("warning"),
        Some(0) => Ok("offline"),
        None => Ok("unknown"),
        Some(value) => Err(DomainError::new(format!(
            "invalid service node health_status from database row: {value}"
        ))),
    }
    .map(str::to_owned)
}

fn required_integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<i64> {
    optional_integer_cell(row, column)
        .ok_or_else(|| DomainError::new(format!("missing service node {column} from database row")))
}

fn optional_integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> Option<i64> {
    row.try_get::<Option<i64>, _>(column)
        .ok()
        .flatten()
        .or_else(|| {
            row.try_get::<Option<i32>, _>(column)
                .ok()
                .flatten()
                .map(i64::from)
        })
}

fn ensure_affected(rows_affected: u64, message: &str) -> DomainResult<()> {
    if rows_affected == 0 {
        Err(DomainError::new(message))
    } else {
        Ok(())
    }
}

fn row_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
