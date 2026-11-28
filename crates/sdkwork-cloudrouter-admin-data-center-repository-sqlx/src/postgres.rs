//! PostgreSQL implementation of the admin data-center governance port.
//!
//! Every statement is scoped by `tenant_id`/`organization_id` from the request
//! subject; the workspace predicate is part of the SQL, never applied in Rust,
//! so a caller cannot widen the scope by changing the handler.
//!
//! `int64` columns that can exceed `Number.MAX_SAFE_INTEGER` (row counts) are
//! cast to text in SQL so the wire value is always an exact decimal string.
//!
//! The select statements are static string literals on purpose: a dynamically
//! formatted SQL string is rejected by the workspace lint, which is the guard
//! that keeps statement shape auditable.

use sdkwork_cloudrouter_router_service::domain::DomainError;
use sdkwork_cloudrouter_router_service::ports::{
    DataCenterAuditAction, DataCenterAuditEntry, DataCenterAuditFuture, DataCenterAuditItem,
    DataCenterAuditResult, DataCenterExportItem, DataCenterExportStatus, DataCenterListFuture,
    DataCenterOverview, DataCenterReadFuture, DataCenterSourceHealth, DataCenterSourceItem,
    DataCenterStore, DataCenterSubject, DataCenterTableItem, DataCenterTableKind,
};
use sdkwork_utils_rust::{format_datetime, uuid};
use sqlx::{PgPool, Row};

use crate::error::{row_decode_error, store_error, RepositoryError, RepositoryResult};

// Every counter is cast to text so the wire value is an exact decimal string
// (`API_SPEC.md` §13.6): these are int64 counts the browser must not round.
const LOAD_OVERVIEW: &str = r#"
SELECT
    CAST((SELECT COUNT(*) FROM dc_data_source
      WHERE status = 1 AND deleted_at IS NULL
        AND tenant_id = $1 AND (organization_id = $2 OR organization_id = 0)) AS TEXT) AS sources,
    CAST((SELECT COUNT(*) FROM dc_table
      WHERE status = 1 AND deleted_at IS NULL
        AND table_kind = 'landed'
        AND tenant_id = $1 AND (organization_id = $2 OR organization_id = 0)) AS TEXT) AS tables,
    CAST((SELECT COUNT(*) FROM dc_audit_log
      WHERE status = 1 AND deleted_at IS NULL
        AND audit_action = 'dml'
        AND created_at >= date_trunc('day', CURRENT_TIMESTAMP)
        AND tenant_id = $1 AND (organization_id = $2 OR organization_id = 0)) AS TEXT) AS today_instances,
    CAST((SELECT COUNT(*) FROM dc_export_job
      WHERE status = 1 AND deleted_at IS NULL
        AND export_status IN ('pending_approval', 'running')
        AND tenant_id = $1 AND (organization_id = $2 OR organization_id = 0)) AS TEXT) AS pending_exports,
    (SELECT COUNT(*) FROM dc_data_source
      WHERE status = 1 AND deleted_at IS NULL
        AND tenant_id = $1 AND (organization_id = $2 OR organization_id = 0)) AS total_sources,
    (SELECT COUNT(*) FROM dc_data_source
      WHERE status = 1 AND deleted_at IS NULL
        AND health IN ('healthy', 'warning')
        AND tenant_id = $1 AND (organization_id = $2 OR organization_id = 0)) AS reachable_sources
"#;

const LIST_SOURCES: &str = r#"
SELECT id, name, source_kind, health, table_count, last_tested_at
FROM dc_data_source
WHERE status = 1 AND deleted_at IS NULL
  AND tenant_id = $1 AND (organization_id = $2 OR organization_id = 0)
ORDER BY updated_at DESC, id DESC
"#;

const LIST_TABLES: &str = r#"
SELECT
    id,
    table_key,
    display_name,
    table_kind,
    CAST(row_count AS TEXT) AS row_count_text,
    column_count,
    owner_name,
    updated_at
FROM dc_table
WHERE status = 1 AND deleted_at IS NULL
  AND tenant_id = $1 AND (organization_id = $2 OR organization_id = 0)
ORDER BY updated_at DESC, id DESC
"#;

const LIST_EXPORTS: &str = r#"
SELECT
    id,
    dataset_name,
    export_status,
    CAST(row_count AS TEXT) AS row_count_text,
    requested_by,
    expires_at
FROM dc_export_job
WHERE status = 1 AND deleted_at IS NULL
  AND tenant_id = $1 AND (organization_id = $2 OR organization_id = 0)
ORDER BY created_at DESC, id DESC
"#;

const LIST_AUDITS: &str = r#"
SELECT
    id,
    actor,
    audit_action,
    object_type,
    object_key,
    CAST(row_count AS TEXT) AS row_count_text,
    audit_result,
    created_at
FROM dc_audit_log
WHERE status = 1 AND deleted_at IS NULL
  AND tenant_id = $1 AND (organization_id = $2 OR organization_id = 0)
ORDER BY created_at DESC, id DESC
"#;

/// Audit rows use the shared event-log identity: the row id comes from the
/// table default, the uuid is a server-owned correlation value, and retention
/// follows the table/workspace retention default.
const INSERT_AUDIT: &str = r#"
INSERT INTO dc_audit_log (
    uuid,
    tenant_id,
    organization_id,
    request_id,
    status,
    actor,
    audit_action,
    object_type,
    object_key,
    row_count,
    audit_result,
    detail
) VALUES ($1, $2, $3, $4, 1, $5, $6, $7, $8, $9, $10, $11)
"#;

#[derive(Debug, Clone)]
pub struct PostgresAdminDataCenterStore {
    pool: PgPool,
}

impl PostgresAdminDataCenterStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

fn domain_error(error: RepositoryError) -> DomainError {
    DomainError::new(error.to_string())
}

impl DataCenterStore for PostgresAdminDataCenterStore {
    fn load_overview(&self, subject: DataCenterSubject) -> DataCenterReadFuture<'_> {
        Box::pin(async move { load_overview(&self.pool, subject).await.map_err(domain_error) })
    }

    fn list_sources(
        &self,
        subject: DataCenterSubject,
    ) -> DataCenterListFuture<'_, DataCenterSourceItem> {
        Box::pin(async move { list_sources(&self.pool, subject).await.map_err(domain_error) })
    }

    fn list_tables(
        &self,
        subject: DataCenterSubject,
    ) -> DataCenterListFuture<'_, DataCenterTableItem> {
        Box::pin(async move { list_tables(&self.pool, subject).await.map_err(domain_error) })
    }

    fn list_exports(
        &self,
        subject: DataCenterSubject,
    ) -> DataCenterListFuture<'_, DataCenterExportItem> {
        Box::pin(async move { list_exports(&self.pool, subject).await.map_err(domain_error) })
    }

    fn list_audits(
        &self,
        subject: DataCenterSubject,
    ) -> DataCenterListFuture<'_, DataCenterAuditItem> {
        Box::pin(async move { list_audits(&self.pool, subject).await.map_err(domain_error) })
    }

    fn record_audit(&self, entry: DataCenterAuditEntry) -> DataCenterAuditFuture<'_> {
        Box::pin(async move { record_audit(&self.pool, entry).await.map_err(domain_error) })
    }
}

async fn load_overview(
    pool: &PgPool,
    subject: DataCenterSubject,
) -> RepositoryResult<DataCenterOverview> {
    let row = sqlx::query(LOAD_OVERVIEW)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_one(pool)
        .await
        .map_err(|error| store_error("load data center overview", error))?;

    let total_sources: i64 = row
        .try_get("total_sources")
        .map_err(|error| row_decode_error("overview.totalSources", error))?;
    let reachable_sources: i64 = row
        .try_get("reachable_sources")
        .map_err(|error| row_decode_error("overview.reachableSources", error))?;

    Ok(DataCenterOverview {
        sources: row
            .try_get("sources")
            .map_err(|error| row_decode_error("overview.sources", error))?,
        tables: row
            .try_get("tables")
            .map_err(|error| row_decode_error("overview.tables", error))?,
        today_instances: row
            .try_get("today_instances")
            .map_err(|error| row_decode_error("overview.todayInstances", error))?,
        pending_exports: row
            .try_get("pending_exports")
            .map_err(|error| row_decode_error("overview.pendingExports", error))?,
        success_rate: success_rate(reachable_sources, total_sources),
    })
}

/// Renders the reachable-source ratio as a two-decimal percentage string.
///
/// With no configured source the ratio is reported as `100.00`: an empty
/// governance plane is not a failing one, and the overview must not warn about a
/// deployment that has not connected anything yet.
fn success_rate(reachable: i64, total: i64) -> String {
    if total <= 0 {
        return "100.00".to_owned();
    }
    let reachable = reachable.clamp(0, total);
    let basis_points = (i128::from(reachable) * 10_000).div_euclid(i128::from(total));
    let whole = basis_points / 100;
    let fraction = basis_points % 100;
    format!("{whole}.{fraction:02}")
}

async fn list_sources(
    pool: &PgPool,
    subject: DataCenterSubject,
) -> RepositoryResult<Vec<DataCenterSourceItem>> {
    let rows = sqlx::query(LIST_SOURCES)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("list data center sources", error))?;

    let mut items = Vec::with_capacity(rows.len());
    for row in &rows {
        let id: i64 = row
            .try_get("id")
            .map_err(|error| row_decode_error("source.id", error))?;
        let health: String = row
            .try_get("health")
            .map_err(|error| row_decode_error("source.health", error))?;
        let last_tested_at: Option<chrono::DateTime<chrono::Utc>> = row
            .try_get("last_tested_at")
            .map_err(|error| row_decode_error("source.lastTestedAt", error))?;
        items.push(DataCenterSourceItem {
            id: id.to_string(),
            name: row
                .try_get("name")
                .map_err(|error| row_decode_error("source.name", error))?,
            kind: row
                .try_get("source_kind")
                .map_err(|error| row_decode_error("source.kind", error))?,
            health: source_health(&health),
            table_count: row
                .try_get("table_count")
                .map_err(|error| row_decode_error("source.tableCount", error))?,
            last_tested_at: last_tested_at.map(|value| format_datetime(value, None)),
        });
    }
    Ok(items)
}

fn source_health(value: &str) -> DataCenterSourceHealth {
    match value {
        "healthy" => DataCenterSourceHealth::Healthy,
        "warning" => DataCenterSourceHealth::Warning,
        "error" => DataCenterSourceHealth::Error,
        _ => DataCenterSourceHealth::Unknown,
    }
}

async fn list_tables(
    pool: &PgPool,
    subject: DataCenterSubject,
) -> RepositoryResult<Vec<DataCenterTableItem>> {
    let rows = sqlx::query(LIST_TABLES)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("list data center tables", error))?;

    let mut items = Vec::with_capacity(rows.len());
    for row in &rows {
        let id: i64 = row
            .try_get("id")
            .map_err(|error| row_decode_error("table.id", error))?;
        let display_name: String = row
            .try_get("display_name")
            .map_err(|error| row_decode_error("table.displayName", error))?;
        let table_key: String = row
            .try_get("table_key")
            .map_err(|error| row_decode_error("table.tableKey", error))?;
        let kind: String = row
            .try_get("table_kind")
            .map_err(|error| row_decode_error("table.kind", error))?;
        let updated_at: Option<chrono::DateTime<chrono::Utc>> = row
            .try_get("updated_at")
            .map_err(|error| row_decode_error("table.updatedAt", error))?;
        items.push(DataCenterTableItem {
            id: id.to_string(),
            name: display_name_or_key(&display_name, &table_key),
            kind: table_kind(&kind),
            row_count: row
                .try_get("row_count_text")
                .map_err(|error| row_decode_error("table.rowCount", error))?,
            column_count: row
                .try_get("column_count")
                .map_err(|error| row_decode_error("table.columnCount", error))?,
            owner: row
                .try_get("owner_name")
                .map_err(|error| row_decode_error("table.owner", error))?,
            updated_at: updated_at
                .map(|value| format_datetime(value, None))
                .unwrap_or_default(),
        });
    }
    Ok(items)
}

fn display_name_or_key(display_name: &str, table_key: &str) -> String {
    if display_name.trim().is_empty() {
        table_key.to_owned()
    } else {
        display_name.to_owned()
    }
}

fn table_kind(value: &str) -> DataCenterTableKind {
    match value {
        "external" => DataCenterTableKind::External,
        "view" => DataCenterTableKind::View,
        _ => DataCenterTableKind::Landed,
    }
}

async fn list_exports(
    pool: &PgPool,
    subject: DataCenterSubject,
) -> RepositoryResult<Vec<DataCenterExportItem>> {
    let rows = sqlx::query(LIST_EXPORTS)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("list data center exports", error))?;

    let mut items = Vec::with_capacity(rows.len());
    for row in &rows {
        let id: i64 = row
            .try_get("id")
            .map_err(|error| row_decode_error("export.id", error))?;
        let status: String = row
            .try_get("export_status")
            .map_err(|error| row_decode_error("export.status", error))?;
        let expires_at: Option<chrono::DateTime<chrono::Utc>> = row
            .try_get("expires_at")
            .map_err(|error| row_decode_error("export.expiresAt", error))?;
        items.push(DataCenterExportItem {
            id: id.to_string(),
            dataset_name: row
                .try_get("dataset_name")
                .map_err(|error| row_decode_error("export.datasetName", error))?,
            status: export_status(&status),
            row_count: row
                .try_get("row_count_text")
                .map_err(|error| row_decode_error("export.rowCount", error))?,
            requested_by: row
                .try_get("requested_by")
                .map_err(|error| row_decode_error("export.requestedBy", error))?,
            expires_at: expires_at.map(|value| format_datetime(value, None)),
        });
    }
    Ok(items)
}

fn export_status(value: &str) -> DataCenterExportStatus {
    match value {
        "running" => DataCenterExportStatus::Running,
        "succeeded" => DataCenterExportStatus::Succeeded,
        "failed" => DataCenterExportStatus::Failed,
        "expired" => DataCenterExportStatus::Expired,
        _ => DataCenterExportStatus::PendingApproval,
    }
}

async fn list_audits(
    pool: &PgPool,
    subject: DataCenterSubject,
) -> RepositoryResult<Vec<DataCenterAuditItem>> {
    let rows = sqlx::query(LIST_AUDITS)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("list data center audits", error))?;

    let mut items = Vec::with_capacity(rows.len());
    for row in &rows {
        let id: i64 = row
            .try_get("id")
            .map_err(|error| row_decode_error("audit.id", error))?;
        let action: String = row
            .try_get("audit_action")
            .map_err(|error| row_decode_error("audit.action", error))?;
        let result: String = row
            .try_get("audit_result")
            .map_err(|error| row_decode_error("audit.result", error))?;
        let object_type: String = row
            .try_get("object_type")
            .map_err(|error| row_decode_error("audit.objectType", error))?;
        let object_key: String = row
            .try_get("object_key")
            .map_err(|error| row_decode_error("audit.objectKey", error))?;
        let created_at: Option<chrono::DateTime<chrono::Utc>> = row
            .try_get("created_at")
            .map_err(|error| row_decode_error("audit.at", error))?;
        items.push(DataCenterAuditItem {
            id: id.to_string(),
            actor: row
                .try_get("actor")
                .map_err(|error| row_decode_error("audit.actor", error))?,
            action: audit_action(&action),
            object: audit_object(&object_type, &object_key),
            row_count: row
                .try_get("row_count_text")
                .map_err(|error| row_decode_error("audit.rowCount", error))?,
            result: if result == "failure" {
                DataCenterAuditResult::Failure
            } else {
                DataCenterAuditResult::Success
            },
            at: created_at
                .map(|value| format_datetime(value, None))
                .unwrap_or_default(),
        });
    }
    Ok(items)
}

fn audit_action(value: &str) -> DataCenterAuditAction {
    match value {
        "connect" => DataCenterAuditAction::Connect,
        "query" => DataCenterAuditAction::Query,
        "download" => DataCenterAuditAction::Download,
        "ddl" => DataCenterAuditAction::Ddl,
        "dml" => DataCenterAuditAction::Dml,
        "publish" => DataCenterAuditAction::Publish,
        "approve" => DataCenterAuditAction::Approve,
        _ => DataCenterAuditAction::Rollback,
    }
}

fn audit_object(object_type: &str, object_key: &str) -> String {
    match (object_type.trim(), object_key.trim()) {
        ("", "") => String::new(),
        (identity, "") => identity.to_owned(),
        ("", key) => key.to_owned(),
        (identity, key) => format!("{identity}:{key}"),
    }
}

fn audit_actor(entry: &DataCenterAuditEntry) -> String {
    entry
        .subject
        .operator_name
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .unwrap_or_else(|| entry.subject.operator_id.to_string())
}

async fn record_audit(pool: &PgPool, entry: DataCenterAuditEntry) -> RepositoryResult<()> {
    let request_id = format!(
        "operator:{}:{}",
        entry.subject.operator_type, entry.subject.operator_id
    );
    sqlx::query(INSERT_AUDIT)
        .bind(uuid())
        .bind(entry.subject.tenant_id)
        .bind(entry.subject.organization_id)
        .bind(request_id)
        .bind(audit_actor(&entry))
        .bind(entry.action.as_str())
        .bind(&entry.object_type)
        .bind(&entry.object_key)
        .bind(entry.row_count.max(0))
        .bind(entry.result.as_str())
        .bind(&entry.detail)
        .execute(pool)
        .await
        .map_err(|error| store_error("record data center audit", error))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn success_rate_is_a_two_decimal_percentage() {
        assert_eq!("100.00", success_rate(0, 0));
        assert_eq!("100.00", success_rate(2, 2));
        assert_eq!("50.00", success_rate(1, 2));
        assert_eq!("33.33", success_rate(1, 3));
    }

    #[test]
    fn success_rate_is_clamped_to_the_configured_source_count() {
        assert_eq!("100.00", success_rate(9, 2));
        assert_eq!("0.00", success_rate(-1, 4));
    }

    #[test]
    fn unknown_enum_labels_degrade_to_their_safe_default() {
        assert_eq!(DataCenterSourceHealth::Unknown, source_health("stale"));
        assert_eq!(DataCenterTableKind::Landed, table_kind("unexpected"));
        assert_eq!(
            DataCenterExportStatus::PendingApproval,
            export_status("unexpected")
        );
        assert_eq!(DataCenterAuditAction::Rollback, audit_action("unexpected"));
    }

    #[test]
    fn audit_object_joins_type_and_key() {
        assert_eq!("source:42", audit_object("source", "42"));
        assert_eq!("source", audit_object("source", ""));
        assert_eq!("42", audit_object("", "42"));
        assert_eq!("", audit_object("", " "));
    }

    #[test]
    fn display_name_falls_back_to_the_table_key() {
        assert_eq!("dc_orders", display_name_or_key("", "dc_orders"));
        assert_eq!("Orders", display_name_or_key("Orders", "dc_orders"));
    }

    #[test]
    fn audit_actor_prefers_the_resolved_display_name() {
        let mut entry = DataCenterAuditEntry::new(
            DataCenterSubject {
                tenant_id: 1,
                organization_id: 0,
                operator_id: 30,
                operator_type: 1,
                operator_name: Some("  admin  ".to_owned()),
            },
            DataCenterAuditAction::Query,
            "audit_log",
            "audits",
        );
        assert_eq!("admin", audit_actor(&entry));
        entry.subject.operator_name = None;
        assert_eq!("30", audit_actor(&entry));
    }

    #[test]
    fn every_scoped_statement_carries_the_workspace_predicate() {
        for statement in [
            LOAD_OVERVIEW,
            LIST_SOURCES,
            LIST_TABLES,
            LIST_EXPORTS,
            LIST_AUDITS,
        ] {
            assert!(
                statement.contains("tenant_id = $1 AND (organization_id = $2 OR organization_id = 0)"),
                "every data-center read must be scoped by tenant and organization"
            );
        }
    }
}
