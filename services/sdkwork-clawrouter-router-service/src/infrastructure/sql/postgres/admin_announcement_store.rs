use sqlx::{PgPool, Postgres, Row, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    AdminAnnouncementCommandFuture, AdminAnnouncementItem, AdminAnnouncementListPage,
    AdminAnnouncementStore, CreateAdminAnnouncementCommand, DeleteAdminAnnouncementCommand,
    ListAdminAnnouncementsQuery, UpdateAdminAnnouncementCommand,
};

const ANNOUNCEMENT_TARGET_TYPE: i32 = 21;
const RECIPIENT_ALL: i32 = 1;
const RECIPIENT_ROLE: i32 = 3;
const SCOPE_GLOBAL: i32 = 2;
const MESSAGE_TYPE_INFO: i32 = 1;
const SEVERITY_INFO: i32 = 1;
const ANNOUNCEMENT_PRIORITY: i32 = 100;

#[derive(Debug, Clone)]
pub struct PostgresAdminAnnouncementStore {
    pool: PgPool,
}

impl PostgresAdminAnnouncementStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminAnnouncementStore for PostgresAdminAnnouncementStore {
    fn list_announcements<'a>(
        &'a self,
        query: ListAdminAnnouncementsQuery,
    ) -> AdminAnnouncementCommandFuture<'a, AdminAnnouncementListPage> {
        Box::pin(async move { list_announcements(&self.pool, query).await })
    }

    fn create_announcement<'a>(
        &'a self,
        command: CreateAdminAnnouncementCommand,
    ) -> AdminAnnouncementCommandFuture<'a, AdminAnnouncementItem> {
        Box::pin(async move {
            let mut tx =
                self.pool.begin().await.map_err(|error| {
                    store_error("failed to begin announcement transaction", error)
                })?;
            let id = insert_notification_message(&mut tx, &command).await?;
            insert_announcement_recipient(&mut tx, id, &command).await?;
            insert_audit_log(
                &mut tx,
                &command.audit_log_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.operator_id,
                command.subject.operator_type,
                "create_announcement",
                id,
                serde_json::json!({
                    "action": "create_announcement",
                    "notificationId": id,
                    "title": &command.title,
                    "target": &command.target,
                    "status": &command.status,
                    "showAsPopup": command.show_as_popup
                }),
            )
            .await?;
            let item = load_announcement_by_id(
                &mut tx,
                id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            .ok_or_else(|| DomainError::new("created announcement could not be reloaded"))?;
            tx.commit()
                .await
                .map_err(|error| store_error("failed to commit announcement transaction", error))?;
            Ok(item)
        })
    }

    fn update_announcement<'a>(
        &'a self,
        command: UpdateAdminAnnouncementCommand,
    ) -> AdminAnnouncementCommandFuture<'a, Option<AdminAnnouncementItem>> {
        Box::pin(async move {
            let mut tx =
                self.pool.begin().await.map_err(|error| {
                    store_error("failed to begin announcement transaction", error)
                })?;
            let updated = update_notification_message(&mut tx, &command).await?;
            if !updated {
                tx.commit().await.map_err(|error| {
                    store_error("failed to commit announcement transaction", error)
                })?;
                return Ok(None);
            }
            if let Some(target) = command.target.as_ref() {
                replace_announcement_recipient(&mut tx, target, &command).await?;
            }
            insert_audit_log(
                &mut tx,
                &command.audit_log_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.operator_id,
                command.subject.operator_type,
                "update_announcement",
                command.announcement_id,
                serde_json::json!({
                    "action": "update_announcement",
                    "notificationId": command.announcement_id,
                    "titleChanged": command.title.is_some(),
                    "contentChanged": command.content.is_some(),
                    "target": command.target,
                    "status": command.status,
                    "showAsPopup": command.show_as_popup
                }),
            )
            .await?;
            let item = load_announcement_by_id(
                &mut tx,
                command.announcement_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?;
            tx.commit()
                .await
                .map_err(|error| store_error("failed to commit announcement transaction", error))?;
            Ok(item)
        })
    }

    fn delete_announcement<'a>(
        &'a self,
        command: DeleteAdminAnnouncementCommand,
    ) -> AdminAnnouncementCommandFuture<'a, bool> {
        Box::pin(async move {
            let mut tx =
                self.pool.begin().await.map_err(|error| {
                    store_error("failed to begin announcement transaction", error)
                })?;
            let deleted = soft_delete_notification(&mut tx, &command).await?;
            if deleted {
                insert_audit_log(
                    &mut tx,
                    &command.audit_log_uuid,
                    &command.request_id,
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    command.subject.operator_id,
                    command.subject.operator_type,
                    "delete_announcement",
                    command.announcement_id,
                    serde_json::json!({
                        "action": "delete_announcement",
                        "notificationId": command.announcement_id
                    }),
                )
                .await?;
            }
            tx.commit()
                .await
                .map_err(|error| store_error("failed to commit announcement transaction", error))?;
            Ok(deleted)
        })
    }
}

async fn list_announcements(
    pool: &PgPool,
    query: ListAdminAnnouncementsQuery,
) -> DomainResult<AdminAnnouncementListPage> {
    let search = query
        .q
        .as_ref()
        .map(|value| format!("%{}%", value.to_lowercase()));
    let rows = sqlx::query(
        r#"
        SELECT
            m.id,
            m.uuid,
            m.tenant_id,
            m.organization_id,
            COALESCE(m.title, '') AS title,
            COALESCE(m.content, '') AS content,
            m.status,
            COALESCE(m.show_as_popup, false) AS show_as_popup,
            CAST(COALESCE(m.published_at, m.updated_at, m.created_at) AS TEXT) AS display_date,
            CAST(m.deleted_at AS TEXT) AS deleted_at,
            r.recipient_type AS recipient_type,
            r.recipient_value AS recipient_value,
            r.recipient_role_code,
            COUNT(*) OVER() AS total
        FROM ops_notification_message m
        LEFT JOIN ops_notification_recipient r
            ON r.message_id = m.id
           AND r.tenant_id = m.tenant_id
           AND r.organization_id = m.organization_id
           AND r.status = 1
           AND r.deleted_at IS NULL
        WHERE m.tenant_id = $1
          AND m.organization_id = $2
          AND m.scope_type = $3
          AND m.message_code = ('announcement:' || m.id::text)
          AND m.deleted_at IS NULL
          AND (
              $4 IS NULL
              OR LOWER(COALESCE(m.title, '')) LIKE $4
              OR LOWER(COALESCE(m.content, '')) LIKE $4
          )
        ORDER BY COALESCE(m.published_at, m.updated_at, m.created_at) DESC NULLS LAST, m.id DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(SCOPE_GLOBAL)
    .bind(search.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list announcements", error))?;

    let total = rows
        .first()
        .and_then(|row| row.try_get::<i64, _>("total").ok())
        .unwrap_or(0);
    let items = rows.iter().map(item_from_row).collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminAnnouncementListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn insert_notification_message(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminAnnouncementCommand,
) -> DomainResult<i64> {
    let status = status_code(&command.status);
    let published_at = published_at_for_status(&command.status, &command.requested_at);
    let id = next_claw_runtime_id("ops_notification_message")?;
    sqlx::query(
        r#"
        INSERT INTO ops_notification_message
            (uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, app_id, scope_type, message_code, message_type, title, summary, content, severity, priority, show_as_popup, published_at, id)
        VALUES
            ($1, $2, $3, 1, $4, $5::timestamptz, $6::timestamptz, 0, NULL, $7, NULL, $8, $9, $10, $11, $12, $13, $14, $15::timestamptz, $16)
        "#,
    )
    .bind(&command.announcement_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(status)
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .bind(SCOPE_GLOBAL)
    .bind(MESSAGE_TYPE_INFO)
    .bind(&command.title)
    .bind(&command.content)
    .bind(&command.content)
    .bind(SEVERITY_INFO)
    .bind(ANNOUNCEMENT_PRIORITY)
    .bind(command.show_as_popup)
    .bind(published_at)
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create announcement notification", error))?;

    sqlx::query(
        r#"
        UPDATE ops_notification_message
        SET message_code = $1
        WHERE id = $2
        "#,
    )
    .bind(format!("announcement:{id}"))
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to stamp announcement notification code", error))?;

    Ok(id)
}

async fn insert_announcement_recipient(
    tx: &mut Transaction<'_, Postgres>,
    message_id: i64,
    command: &CreateAdminAnnouncementCommand,
) -> DomainResult<()> {
    insert_recipient(
        tx,
        message_id,
        &command.announcement_uuid,
        command.subject.tenant_id,
        command.subject.organization_id,
        &command.target,
        &command.requested_at,
    )
    .await
}

async fn update_notification_message(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdateAdminAnnouncementCommand,
) -> DomainResult<bool> {
    let current = load_announcement_by_id(
        tx,
        command.announcement_id,
        command.subject.tenant_id,
        command.subject.organization_id,
    )
    .await?;
    let Some(current) = current else {
        return Ok(false);
    };
    let next_status = command.status.as_deref().unwrap_or(&current.status);
    let status = command.status.as_ref().map(|status| status_code(status));
    let published_at =
        if command.status.as_deref() == Some("published") && current.date.trim().is_empty() {
            Some(command.requested_at.as_str())
        } else {
            published_at_for_status(next_status, &current.date)
        };
    let result = sqlx::query(
        r#"
        UPDATE ops_notification_message
        SET title = COALESCE($1, title),
            summary = COALESCE($2, summary),
            content = COALESCE($3, content),
            status = COALESCE($4, status),
            show_as_popup = COALESCE($5, show_as_popup),
            published_at = CASE
                WHEN $6::integer = 0 THEN NULL
                WHEN $6::integer = 1 THEN COALESCE(published_at, $7::timestamptz)
                ELSE published_at
            END,
            updated_at = $8::timestamptz,
            version = COALESCE(version, 0) + 1
        WHERE id = $9
          AND tenant_id = $10
          AND organization_id = $11
          AND scope_type = $12
          AND message_code = ('announcement:' || id::text)
          AND deleted_at IS NULL
        "#,
    )
    .bind(command.title.as_deref())
    .bind(command.content.as_deref())
    .bind(command.content.as_deref())
    .bind(status)
    .bind(command.show_as_popup)
    .bind(status)
    .bind(published_at)
    .bind(&command.requested_at)
    .bind(command.announcement_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(SCOPE_GLOBAL)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update announcement notification", error))?;

    Ok(result.rows_affected() > 0)
}

async fn replace_announcement_recipient(
    tx: &mut Transaction<'_, Postgres>,
    target: &str,
    command: &UpdateAdminAnnouncementCommand,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE ops_notification_recipient
        SET status = -1,
            deleted_at = $1::timestamptz,
            deleted_by = $2,
            updated_at = $3::timestamptz
        WHERE message_id = $4
          AND tenant_id = $5
          AND organization_id = $6
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.requested_at)
    .bind(command.subject.operator_id)
    .bind(&command.requested_at)
    .bind(command.announcement_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to archive announcement recipients", error))?;

    insert_recipient(
        tx,
        command.announcement_id,
        &command.audit_log_uuid,
        command.subject.tenant_id,
        command.subject.organization_id,
        target,
        &command.requested_at,
    )
    .await
}

async fn insert_recipient(
    tx: &mut Transaction<'_, Postgres>,
    message_id: i64,
    uuid_seed: &str,
    tenant_id: i64,
    organization_id: i64,
    target: &str,
    requested_at: &str,
) -> DomainResult<()> {
    let (recipient_type, recipient_value, recipient_role_code) = recipient_fields(target);
    let id = next_claw_runtime_id("ops_notification_recipient")?;
    sqlx::query(
        r#"
        INSERT INTO ops_notification_recipient
            (uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, message_id, app_id, recipient_type, recipient_value, recipient_user_id, recipient_role_code, id)
        VALUES
            ($1, $2, $3, 1, 1, $4::timestamptz, $5::timestamptz, 0, $6, NULL, $7, $8, NULL, $9, $10)
        "#,
    )
    .bind(format!("{uuid_seed}:recipient:{message_id}"))
    .bind(tenant_id)
    .bind(organization_id)
    .bind(requested_at)
    .bind(requested_at)
    .bind(message_id)
    .bind(recipient_type)
    .bind(recipient_value)
    .bind(recipient_role_code)
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create announcement recipient", error))?;
    Ok(())
}

async fn soft_delete_notification(
    tx: &mut Transaction<'_, Postgres>,
    command: &DeleteAdminAnnouncementCommand,
) -> DomainResult<bool> {
    let result = sqlx::query(
        r#"
        UPDATE ops_notification_message
        SET status = -1,
            deleted_at = $1::timestamptz,
            deleted_by = $2,
            updated_at = $3::timestamptz,
            version = COALESCE(version, 0) + 1
        WHERE id = $4
          AND tenant_id = $5
          AND organization_id = $6
          AND scope_type = $7
          AND message_code = ('announcement:' || id::text)
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.requested_at)
    .bind(command.subject.operator_id)
    .bind(&command.requested_at)
    .bind(command.announcement_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(SCOPE_GLOBAL)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to delete announcement notification", error))?;

    if result.rows_affected() == 0 {
        return Ok(false);
    }

    sqlx::query(
        r#"
        UPDATE ops_notification_recipient
        SET status = -1,
            deleted_at = $1::timestamptz,
            deleted_by = $2,
            updated_at = $3::timestamptz
        WHERE message_id = $4
          AND tenant_id = $5
          AND organization_id = $6
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.requested_at)
    .bind(command.subject.operator_id)
    .bind(&command.requested_at)
    .bind(command.announcement_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to delete announcement recipients", error))?;

    Ok(true)
}

async fn load_announcement_by_id(
    tx: &mut Transaction<'_, Postgres>,
    id: i64,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<Option<AdminAnnouncementItem>> {
    let row = sqlx::query(
        r#"
        SELECT
            m.id,
            m.uuid,
            m.tenant_id,
            m.organization_id,
            COALESCE(m.title, '') AS title,
            COALESCE(m.content, '') AS content,
            m.status,
            COALESCE(m.show_as_popup, false) AS show_as_popup,
            CAST(COALESCE(m.published_at, m.updated_at, m.created_at) AS TEXT) AS display_date,
            CAST(m.deleted_at AS TEXT) AS deleted_at,
            r.recipient_type AS recipient_type,
            r.recipient_value AS recipient_value,
            r.recipient_role_code
        FROM ops_notification_message m
        LEFT JOIN ops_notification_recipient r
            ON r.message_id = m.id
           AND r.tenant_id = m.tenant_id
           AND r.organization_id = m.organization_id
           AND r.status = 1
           AND r.deleted_at IS NULL
        WHERE m.id = $1
          AND m.tenant_id = $2
          AND m.organization_id = $3
          AND m.scope_type = $4
          AND m.message_code = ('announcement:' || m.id::text)
          AND m.deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(SCOPE_GLOBAL)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load announcement notification", error))?;

    row.as_ref().map(item_from_row).transpose()
}

async fn insert_audit_log(
    tx: &mut Transaction<'_, Postgres>,
    audit_log_uuid: &str,
    request_id: &str,
    tenant_id: i64,
    organization_id: i64,
    operator_id: i64,
    operator_type: i32,
    action: &'static str,
    target_id: i64,
    change_summary: serde_json::Value,
) -> DomainResult<()> {
    let id = next_claw_runtime_id("ops_audit_log")?;
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (uuid, tenant_id, organization_id, action, target_type, target_id, request_id, operator_id, operator_type, change_summary, id)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
        "#,
    )
    .bind(audit_log_uuid)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(action)
    .bind(ANNOUNCEMENT_TARGET_TYPE)
    .bind(target_id)
    .bind(request_id)
    .bind(operator_id)
    .bind(operator_type)
    .bind(change_summary.to_string())
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write announcement audit log", error))?;
    Ok(())
}

fn item_from_row(row: &sqlx::postgres::PgRow) -> DomainResult<AdminAnnouncementItem> {
    Ok(AdminAnnouncementItem {
        id: required_integer_cell(row, "id")?,
        uuid: string_cell(row, "uuid"),
        tenant_id: required_integer_cell(row, "tenant_id")?,
        organization_id: required_integer_cell(row, "organization_id")?,
        title: string_cell(row, "title"),
        content: string_cell(row, "content"),
        target: target_label(
            required_integer_cell(row, "recipient_type")?,
            &string_cell(row, "recipient_value"),
            optional_non_empty_string_cell(row, "recipient_role_code").as_deref(),
        )?,
        status: status_label(required_integer_cell(row, "status")?)?,
        show_as_popup: bool_cell(row, "show_as_popup"),
        date: string_cell(row, "display_date"),
        deleted_at: optional_non_empty_string_cell(row, "deleted_at"),
    })
}

fn recipient_fields(target: &str) -> (i32, &str, Option<&str>) {
    if target == "all" {
        (RECIPIENT_ALL, "all", None)
    } else {
        (RECIPIENT_ROLE, target, Some(target))
    }
}

fn target_label(
    recipient_type: i64,
    recipient_value: &str,
    recipient_role_code: Option<&str>,
) -> DomainResult<String> {
    if recipient_type == RECIPIENT_ALL as i64 {
        return Ok("all".to_owned());
    }
    if recipient_type == RECIPIENT_ROLE as i64 {
        let value = recipient_role_code
            .or_else(|| (!recipient_value.trim().is_empty()).then_some(recipient_value))
            .ok_or_else(|| {
                DomainError::new("missing admin announcement target from database row")
            })?;
        return match value {
            "vip" | "free" | "beta" => Ok(value.to_owned()),
            value => Err(DomainError::new(format!(
                "invalid admin announcement target from database row: {value}"
            ))),
        };
    }
    Err(DomainError::new(format!(
        "invalid admin announcement recipient type from database row: {recipient_type}"
    )))
}

fn status_code(value: &str) -> i32 {
    if value == "draft" {
        0
    } else {
        1
    }
}

fn status_label(value: i64) -> DomainResult<String> {
    match value {
        0 => Ok("draft"),
        1 => Ok("published"),
        value => Err(DomainError::new(format!(
            "invalid admin announcement status from database row: {value}"
        ))),
    }
    .map(str::to_owned)
}

fn published_at_for_status<'a>(status: &str, requested_at: &'a str) -> Option<&'a str> {
    (status == "published").then_some(requested_at)
}

fn required_integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<i64> {
    optional_integer_cell(row, column).ok_or_else(|| {
        DomainError::new(format!(
            "missing admin announcement {column} from database row"
        ))
    })
}

fn optional_integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<i64> {
    row.try_get::<Option<i64>, _>(column)
        .ok()
        .flatten()
        .or_else(|| {
            row.try_get::<Option<i32>, _>(column)
                .ok()
                .flatten()
                .map(i64::from)
        })
        .or_else(|| string_cell(row, column).parse::<i64>().ok())
}

fn bool_cell(row: &sqlx::postgres::PgRow, column: &str) -> bool {
    row.try_get::<Option<bool>, _>(column)
        .ok()
        .flatten()
        .or_else(|| {
            row.try_get::<Option<i64>, _>(column)
                .ok()
                .flatten()
                .map(|value| value != 0)
        })
        .or_else(|| {
            row.try_get::<Option<i32>, _>(column)
                .ok()
                .flatten()
                .map(|value| value != 0)
        })
        .unwrap_or(false)
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> String {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .unwrap_or_default()
}

fn optional_non_empty_string_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<String> {
    let value = string_cell(row, column);
    (!value.trim().is_empty()).then_some(value)
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
