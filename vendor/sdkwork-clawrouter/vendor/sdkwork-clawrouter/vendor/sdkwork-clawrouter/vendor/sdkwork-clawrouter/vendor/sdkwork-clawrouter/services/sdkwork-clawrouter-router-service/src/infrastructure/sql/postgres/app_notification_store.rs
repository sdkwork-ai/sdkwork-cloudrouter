use sqlx::{PgPool, Row};

use crate::domain::{DomainError, DomainResult};
use crate::ports::{
    AcknowledgeAppNotificationCommand, AppNotificationFuture, AppNotificationItem,
    AppNotificationItems, AppNotificationQuery, AppNotificationStore,
    MarkAppNotificationPopupSeenCommand,
};

const DELIVERY_CHANNEL_IN_APP: i64 = 1;
const DELIVERY_STATUS_DELIVERED: i64 = 2;
const RECIPIENT_ALL: i64 = 1;
const RECIPIENT_USER: i64 = 2;
const RECIPIENT_ROLE: i64 = 3;
const SCOPE_APP: i64 = 1;
const SCOPE_GLOBAL: i64 = 2;

const LIST_NOTIFICATIONS: &str = r#"
SELECT
    id,
    app_id,
    title,
    description,
    content,
    time,
    message_type,
    severity,
    show_as_popup,
    read_at,
    popup_seen_at,
    archived_at,
    action_url
FROM (
    SELECT
        CAST(m.id AS TEXT) AS id,
        COALESCE(NULLIF(m.app_id, ''), $4) AS app_id,
        COALESCE(NULLIF(m.title, ''), 'Untitled notification') AS title,
        COALESCE(NULLIF(m.summary, ''), '') AS description,
        COALESCE(NULLIF(m.content, ''), NULLIF(m.summary, ''), '') AS content,
        CAST(COALESCE(m.published_at, m.created_at) AS TEXT) AS time,
        m.message_type AS message_type,
        m.severity AS severity,
        COALESCE(m.show_as_popup, false) AS show_as_popup,
        CAST(d.read_at AS TEXT) AS read_at,
        CAST(d.popup_seen_at AS TEXT) AS popup_seen_at,
        CAST(d.archived_at AS TEXT) AS archived_at,
        m.action_url AS action_url,
        CASE WHEN d.read_at IS NULL THEN 0 ELSE 1 END AS read_sort,
        COALESCE(m.priority, 0) AS priority,
        COALESCE(m.published_at, m.created_at) AS sort_time,
        m.id AS sort_id
    FROM ops_notification_message m
    LEFT JOIN ops_notification_delivery d
        ON d.message_id = m.id
       AND d.tenant_id = m.tenant_id
       AND d.organization_id = m.organization_id
       AND d.user_id = $3
       AND d.app_id = $4
       AND d.delivery_channel = $5
       AND d.deleted_at IS NULL
       AND d.status = 1
    WHERE m.status = 1
      AND m.deleted_at IS NULL
      AND m.tenant_id = $1
      AND m.organization_id = $2
      AND (m.published_at IS NULL OR m.published_at <= CURRENT_TIMESTAMP)
      AND (m.expire_at IS NULL OR m.expire_at > CURRENT_TIMESTAMP)
      AND (
          (COALESCE(m.scope_type, $9) = $9 AND m.app_id = $4)
          OR COALESCE(m.scope_type, $10) = $10
      )
      AND ($8 = true OR d.archived_at IS NULL)
      AND EXISTS (
          SELECT 1
          FROM ops_notification_recipient r
          WHERE r.message_id = m.id
            AND r.tenant_id = m.tenant_id
            AND r.organization_id = m.organization_id
            AND r.status = 1
            AND r.deleted_at IS NULL
            AND (
                r.app_id = $4
                OR r.app_id IS NULL
                OR r.app_id = ''
            )
            AND (
                r.recipient_type = $6
                OR (r.recipient_type = $7 AND r.recipient_user_id = $3)
                OR (
                    r.recipient_type = $11
                    AND EXISTS (
                        SELECT 1
                        FROM iam_organization_membership member
                        WHERE member.tenant_id = CAST($1 AS TEXT)
                          AND member.organization_id = CAST($2 AS TEXT)
                          AND member.user_id = CAST($3 AS TEXT)
                          AND member.status = 'active'
                          AND member.membership_kind = r.recipient_role_code
                    )
                )
            )
      )
) notifications
ORDER BY
    read_sort ASC,
    priority DESC,
    sort_time DESC NULLS LAST,
    sort_id DESC
LIMIT $12 OFFSET $13
"#;

const FIND_VISIBLE_NOTIFICATION: &str = r#"
SELECT
    id,
    effective_app_id
FROM (
    SELECT
        m.id AS id,
        COALESCE(NULLIF(m.app_id, ''), $4) AS effective_app_id
    FROM ops_notification_message m
    WHERE m.status = 1
      AND m.deleted_at IS NULL
      AND m.tenant_id = $1
      AND m.organization_id = $2
      AND CAST(m.id AS TEXT) = $5
      AND (m.published_at IS NULL OR m.published_at <= CURRENT_TIMESTAMP)
      AND (m.expire_at IS NULL OR m.expire_at > CURRENT_TIMESTAMP)
      AND (
          (COALESCE(m.scope_type, $8) = $8 AND m.app_id = $4)
          OR COALESCE(m.scope_type, $9) = $9
      )
      AND EXISTS (
          SELECT 1
          FROM ops_notification_recipient r
          WHERE r.message_id = m.id
            AND r.tenant_id = m.tenant_id
            AND r.organization_id = m.organization_id
            AND r.status = 1
            AND r.deleted_at IS NULL
            AND (
                r.app_id = $4
                OR r.app_id IS NULL
                OR r.app_id = ''
            )
            AND (
                r.recipient_type = $6
                OR (r.recipient_type = $7 AND r.recipient_user_id = $3)
                OR (
                    r.recipient_type = $10
                    AND EXISTS (
                        SELECT 1
                        FROM iam_organization_membership member
                        WHERE member.tenant_id = CAST($1 AS TEXT)
                          AND member.organization_id = CAST($2 AS TEXT)
                          AND member.user_id = CAST($3 AS TEXT)
                          AND member.status = 'active'
                          AND member.membership_kind = r.recipient_role_code
                    )
                )
            )
      )
) visible_notifications
LIMIT 1
"#;

const MARK_POPUP_SEEN: &str = r#"
INSERT INTO ops_notification_delivery
    (uuid, tenant_id, organization_id, user_id, status, app_id, message_id, delivery_channel, delivery_status, popup_seen_at, delivered_at, created_at, updated_at)
VALUES
    ($1, $2, $3, $4, 1, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(tenant_id, organization_id, message_id, user_id, app_id, delivery_channel) DO UPDATE SET
    popup_seen_at = COALESCE(ops_notification_delivery.popup_seen_at, CURRENT_TIMESTAMP),
    delivered_at = COALESCE(ops_notification_delivery.delivered_at, CURRENT_TIMESTAMP),
    delivery_status = $8,
    status = 1,
    deleted_at = NULL,
    updated_at = CURRENT_TIMESTAMP
"#;

const ACKNOWLEDGE: &str = r#"
INSERT INTO ops_notification_delivery
    (uuid, tenant_id, organization_id, user_id, status, app_id, message_id, delivery_channel, delivery_status, read_at, popup_seen_at, delivered_at, created_at, updated_at)
VALUES
    ($1, $2, $3, $4, 1, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(tenant_id, organization_id, message_id, user_id, app_id, delivery_channel) DO UPDATE SET
    read_at = COALESCE(ops_notification_delivery.read_at, CURRENT_TIMESTAMP),
    popup_seen_at = COALESCE(ops_notification_delivery.popup_seen_at, CURRENT_TIMESTAMP),
    delivered_at = COALESCE(ops_notification_delivery.delivered_at, CURRENT_TIMESTAMP),
    delivery_status = $8,
    status = 1,
    deleted_at = NULL,
    updated_at = CURRENT_TIMESTAMP
"#;

#[derive(Debug, Clone)]
pub struct PostgresAppNotificationStore {
    pool: PgPool,
}

impl PostgresAppNotificationStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AppNotificationStore for PostgresAppNotificationStore {
    fn list_notifications<'a>(
        &'a self,
        query: AppNotificationQuery,
    ) -> AppNotificationFuture<'a, AppNotificationItems> {
        Box::pin(async move {
            let page = query.page.max(1);
            let page_size = query.page_size.clamp(1, 100);
            let offset = (page - 1) * page_size;
            let rows = sqlx::query(LIST_NOTIFICATIONS)
                .bind(query.subject.tenant_id)
                .bind(query.subject.organization_id)
                .bind(query.subject.user_id)
                .bind(query.app_id.as_str())
                .bind(DELIVERY_CHANNEL_IN_APP)
                .bind(RECIPIENT_ALL)
                .bind(RECIPIENT_USER)
                .bind(query.include_archived)
                .bind(SCOPE_APP)
                .bind(SCOPE_GLOBAL)
                .bind(RECIPIENT_ROLE)
                .bind(page_size)
                .bind(offset)
                .fetch_all(&self.pool)
                .await
                .map_err(sql_error)?;
            let items = rows
                .into_iter()
                .map(row_to_notification)
                .collect::<DomainResult<Vec<_>>>()?;
            Ok(AppNotificationItems::new(items))
        })
    }

    fn mark_popup_seen<'a>(
        &'a self,
        command: MarkAppNotificationPopupSeenCommand,
    ) -> AppNotificationFuture<'a, ()> {
        Box::pin(async move {
            let (message_id, effective_app_id) = self
                .find_visible_message_id(
                    command.subject,
                    command.app_id.as_str(),
                    command.notification_id.as_str(),
                )
                .await?;
            sqlx::query(MARK_POPUP_SEEN)
                .bind(delivery_uuid(
                    "popup",
                    command.subject.user_id,
                    message_id,
                    &effective_app_id,
                ))
                .bind(command.subject.tenant_id)
                .bind(command.subject.organization_id)
                .bind(command.subject.user_id)
                .bind(effective_app_id)
                .bind(message_id)
                .bind(DELIVERY_CHANNEL_IN_APP)
                .bind(DELIVERY_STATUS_DELIVERED)
                .execute(&self.pool)
                .await
                .map_err(sql_error)?;
            Ok(())
        })
    }

    fn acknowledge<'a>(
        &'a self,
        command: AcknowledgeAppNotificationCommand,
    ) -> AppNotificationFuture<'a, ()> {
        Box::pin(async move {
            let (message_id, effective_app_id) = self
                .find_visible_message_id(
                    command.subject,
                    command.app_id.as_str(),
                    command.notification_id.as_str(),
                )
                .await?;
            sqlx::query(ACKNOWLEDGE)
                .bind(delivery_uuid(
                    "ack",
                    command.subject.user_id,
                    message_id,
                    &effective_app_id,
                ))
                .bind(command.subject.tenant_id)
                .bind(command.subject.organization_id)
                .bind(command.subject.user_id)
                .bind(effective_app_id)
                .bind(message_id)
                .bind(DELIVERY_CHANNEL_IN_APP)
                .bind(DELIVERY_STATUS_DELIVERED)
                .execute(&self.pool)
                .await
                .map_err(sql_error)?;
            Ok(())
        })
    }
}

impl PostgresAppNotificationStore {
    async fn find_visible_message_id(
        &self,
        subject: crate::ports::AppNotificationSubject,
        app_id: &str,
        notification_id: &str,
    ) -> DomainResult<(i64, String)> {
        let row = sqlx::query(FIND_VISIBLE_NOTIFICATION)
            .bind(subject.tenant_id)
            .bind(subject.organization_id)
            .bind(subject.user_id)
            .bind(app_id)
            .bind(notification_id)
            .bind(RECIPIENT_ALL)
            .bind(RECIPIENT_USER)
            .bind(SCOPE_APP)
            .bind(SCOPE_GLOBAL)
            .bind(RECIPIENT_ROLE)
            .fetch_optional(&self.pool)
            .await
            .map_err(sql_error)?
            .ok_or_else(|| DomainError::not_found("notification was not found"))?;
        let message_id = row
            .try_get::<i64, _>("id")
            .or_else(|_| row.try_get::<i32, _>("id").map(i64::from))
            .map_err(|_| DomainError::new("missing notification id from database row"))?;
        let effective_app_id = string_cell(&row, "effective_app_id");
        Ok((message_id, effective_app_id))
    }
}

fn row_to_notification(row: sqlx::postgres::PgRow) -> DomainResult<AppNotificationItem> {
    let summary = string_cell(&row, "description");
    let content = string_cell(&row, "content");
    let message_type = notification_type_for_display(
        required_integer_cell(&row, "message_type")?,
        required_integer_cell(&row, "severity")?,
    )?;
    Ok(AppNotificationItem {
        id: string_cell(&row, "id"),
        app_id: string_cell(&row, "app_id"),
        title: string_cell(&row, "title"),
        desc: summary.clone(),
        content: if content.trim().is_empty() {
            summary
        } else {
            content
        },
        time: string_cell(&row, "time"),
        message_type,
        read: !string_cell(&row, "read_at").trim().is_empty(),
        show_as_popup: bool_cell(&row, "show_as_popup"),
        popup_seen: !string_cell(&row, "popup_seen_at").trim().is_empty(),
        archived: !string_cell(&row, "archived_at").trim().is_empty(),
        action_url: optional_non_empty_string_cell(&row, "action_url"),
    })
}

fn notification_type_for_display(message_type: i64, severity: i64) -> DomainResult<String> {
    validate_severity(severity)?;
    if severity == 4 {
        return Ok("alert".to_owned());
    }
    if severity == 3 {
        return Ok("warning".to_owned());
    }
    match message_type {
        1 => Ok("info".to_owned()),
        2 => Ok("billing".to_owned()),
        3 => Ok("warning".to_owned()),
        4 => Ok("alert".to_owned()),
        value => Err(DomainError::new(format!(
            "invalid notification message_type from database row: {value}"
        ))),
    }
}

fn validate_severity(value: i64) -> DomainResult<()> {
    match value {
        1 | 2 | 3 | 4 => Ok(()),
        value => Err(DomainError::new(format!(
            "invalid notification severity from database row: {value}"
        ))),
    }
}

fn required_integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<i64> {
    optional_integer_cell(row, column)
        .ok_or_else(|| DomainError::new(format!("missing notification {column} from database row")))
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
        .unwrap_or(false)
}

fn optional_non_empty_string_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<String> {
    let value = string_cell(row, column);
    if value.trim().is_empty() {
        None
    } else {
        Some(value)
    }
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> String {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .unwrap_or_default()
}

fn delivery_uuid(prefix: &str, user_id: i64, message_id: i64, app_id: &str) -> String {
    format!("notification-delivery-{prefix}-{user_id}-{message_id}-{app_id}")
}

fn sql_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::{FIND_VISIBLE_NOTIFICATION, LIST_NOTIFICATIONS};

    #[test]
    fn list_notifications_keeps_postgres_parameter_slots_aligned() {
        assert!(
            LIST_NOTIFICATIONS.contains("(COALESCE(m.scope_type, $9) = $9 AND m.app_id = $4)"),
            "app-scoped notifications must use the SCOPE_APP parameter slot"
        );
        assert!(
            LIST_NOTIFICATIONS.contains("OR COALESCE(m.scope_type, $10) = $10"),
            "global notifications must use the SCOPE_GLOBAL parameter slot"
        );
        assert!(
            LIST_NOTIFICATIONS.contains("AND ($8 = true OR d.archived_at IS NULL)"),
            "archive filtering must use the include_archived parameter slot"
        );
        assert!(
            LIST_NOTIFICATIONS.contains("r.recipient_type = $11"),
            "role targeting must use the RECIPIENT_ROLE parameter slot"
        );
    }

    #[test]
    fn find_visible_notification_keeps_postgres_parameter_slots_aligned() {
        assert!(
            FIND_VISIBLE_NOTIFICATION
                .contains("(COALESCE(m.scope_type, $8) = $8 AND m.app_id = $4)"),
            "app-scoped visibility checks must use the SCOPE_APP parameter slot"
        );
        assert!(
            FIND_VISIBLE_NOTIFICATION.contains("OR COALESCE(m.scope_type, $9) = $9"),
            "global visibility checks must use the SCOPE_GLOBAL parameter slot"
        );
        assert!(
            FIND_VISIBLE_NOTIFICATION.contains("r.recipient_type = $10"),
            "role visibility checks must use the RECIPIENT_ROLE parameter slot"
        );
        assert!(
            !FIND_VISIBLE_NOTIFICATION.contains("r.recipient_type = $11"),
            "visibility checks must not reference an unbound Postgres parameter"
        );
    }
}
