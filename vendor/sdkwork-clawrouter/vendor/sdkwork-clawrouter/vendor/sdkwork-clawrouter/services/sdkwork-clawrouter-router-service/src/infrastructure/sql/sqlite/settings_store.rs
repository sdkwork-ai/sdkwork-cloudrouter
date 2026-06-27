use sqlx::{Row, Sqlite, SqlitePool, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    SettingsCommandFuture, SettingsData, SettingsNotifications, SettingsReadFuture, SettingsStore,
    SettingsSubject, UpdateSettingsCommand, UpdateSettingsOutcome,
};

const LOAD_SETTINGS: &str = r#"
SELECT
    COALESCE(NULLIF(p.language, ''), 'en-US') AS language,
    COALESCE(NULLIF(p.timezone, ''), 'UTC') AS timezone,
    COALESCE(w.target_url, '') AS webhook_url,
    COALESCE(p.notification_preferences, '{}') AS notifications_json
FROM (
    SELECT ?1 AS tenant_id, ?2 AS organization_id, ?3 AS user_id, ?4 AS endpoint_code
) subject
LEFT JOIN iam_user_preference p
    ON p.tenant_id = subject.tenant_id
   AND p.organization_id = subject.organization_id
   AND p.user_id = subject.user_id
   AND p.deleted_at IS NULL
LEFT JOIN integration_webhook_endpoint w
    ON w.tenant_id = subject.tenant_id
   AND w.organization_id = subject.organization_id
   AND w.endpoint_code = subject.endpoint_code
   AND w.deleted_at IS NULL
LIMIT 1
"#;

const UPSERT_USER_PREFERENCE: &str = r#"
INSERT INTO iam_user_preference
    (uuid, tenant_id, organization_id, user_id, owner_type, owner_id, data_scope, status, created_at, updated_at, version, metadata, language, timezone, notification_preferences)
VALUES
    (?1, ?2, ?3, ?4, 1, ?4, 1, 1, ?5, ?5, 0, '{}', ?6, ?7, ?8)
ON CONFLICT(tenant_id, organization_id, user_id) DO UPDATE SET
    language = excluded.language,
    timezone = excluded.timezone,
    notification_preferences = excluded.notification_preferences,
    updated_at = excluded.updated_at,
    version = iam_user_preference.version + 1,
    status = 1,
    deleted_at = NULL,
    deleted_by = NULL
"#;

const UPSERT_WEBHOOK_ENDPOINT: &str = r#"
INSERT INTO integration_webhook_endpoint
    (uuid, tenant_id, organization_id, user_id, owner_type, owner_id, data_scope, status, created_at, updated_at, version, metadata, endpoint_code, name, target_url, event_types, signing_alg, retry_policy, failure_count)
VALUES
    (?1, ?2, ?3, ?4, 1, ?4, 1, 1, ?5, ?5, 0, ?6, ?7, 'Console Settings Webhook', ?8, ?9, 'hmac-sha256', ?10, 0)
ON CONFLICT(tenant_id, organization_id, endpoint_code) DO UPDATE SET
    user_id = excluded.user_id,
    owner_id = excluded.owner_id,
    target_url = excluded.target_url,
    event_types = excluded.event_types,
    retry_policy = excluded.retry_policy,
    metadata = excluded.metadata,
    updated_at = excluded.updated_at,
    version = integration_webhook_endpoint.version + 1,
    status = 1,
    deleted_at = NULL,
    deleted_by = NULL
"#;

#[derive(Debug, Clone)]
pub struct SqliteSettingsStore {
    pool: SqlitePool,
}

impl SqliteSettingsStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl SettingsStore for SqliteSettingsStore {
    fn load_settings<'a>(&'a self, subject: Option<SettingsSubject>) -> SettingsReadFuture<'a> {
        Box::pin(async move {
            let subject = subject.ok_or_else(|| {
                DomainError::new("trusted request subject is required for settings")
            })?;
            load_settings(&self.pool, subject).await
        })
    }

    fn update_settings<'a>(&'a self, command: UpdateSettingsCommand) -> SettingsCommandFuture<'a> {
        Box::pin(async move { update_settings(&self.pool, command).await })
    }
}

async fn load_settings(pool: &SqlitePool, subject: SettingsSubject) -> DomainResult<SettingsData> {
    let endpoint_code = webhook_endpoint_code(subject.user_id);
    let row = sqlx::query(LOAD_SETTINGS)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.user_id)
        .bind(endpoint_code)
        .fetch_one(pool)
        .await
        .map_err(sql_error)?;

    Ok(SettingsData {
        language: string_cell(&row, "language"),
        timezone: string_cell(&row, "timezone"),
        webhook_url: string_cell(&row, "webhook_url"),
        notifications: notifications_from_json(&string_cell(&row, "notifications_json"))?,
    })
}

async fn update_settings(
    pool: &SqlitePool,
    command: UpdateSettingsCommand,
) -> DomainResult<UpdateSettingsOutcome> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin settings transaction", error))?;
    upsert_user_preference(&mut tx, &command).await?;
    upsert_webhook_endpoint(&mut tx, &command).await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit settings transaction", error))?;
    Ok(UpdateSettingsOutcome { success: true })
}

async fn upsert_user_preference(
    tx: &mut Transaction<'_, Sqlite>,
    command: &UpdateSettingsCommand,
) -> DomainResult<()> {
    sqlx::query(UPSERT_USER_PREFERENCE)
        .bind(&command.preference_uuid)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(command.subject.user_id)
        .bind(&command.requested_at)
        .bind(&command.settings.language)
        .bind(&command.settings.timezone)
        .bind(notifications_json(&command.settings.notifications)?)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to upsert user preference", error))?;
    Ok(())
}

async fn upsert_webhook_endpoint(
    tx: &mut Transaction<'_, Sqlite>,
    command: &UpdateSettingsCommand,
) -> DomainResult<()> {
    sqlx::query(UPSERT_WEBHOOK_ENDPOINT)
        .bind(&command.webhook_uuid)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(command.subject.user_id)
        .bind(&command.requested_at)
        .bind(webhook_metadata_json(command)?)
        .bind(webhook_endpoint_code(command.subject.user_id))
        .bind(&command.settings.webhook_url)
        .bind(webhook_event_types_json(&command.settings.notifications)?)
        .bind(webhook_retry_policy_json()?)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to upsert webhook endpoint", error))?;
    Ok(())
}

fn webhook_endpoint_code(user_id: i64) -> String {
    format!("console-settings-user-{user_id}")
}

fn notifications_json(notifications: &SettingsNotifications) -> DomainResult<String> {
    serde_json::to_string(notifications).map_err(|error| DomainError::new(error.to_string()))
}

fn notifications_from_json(raw: &str) -> DomainResult<SettingsNotifications> {
    if raw.trim().is_empty() {
        return Ok(SettingsNotifications::default());
    }
    serde_json::from_str(raw).map_err(|error| DomainError::new(error.to_string()))
}

fn webhook_event_types_json(notifications: &SettingsNotifications) -> DomainResult<String> {
    let mut events = Vec::new();
    if notifications.bill_reminder {
        events.push("billing.reminder");
    }
    if notifications.quota_warning {
        events.push("quota.warning");
    }
    if notifications.api_monitor {
        events.push("api.monitor");
    }
    serde_json::to_string(&events).map_err(|error| DomainError::new(error.to_string()))
}

fn webhook_retry_policy_json() -> DomainResult<String> {
    serde_json::to_string(&serde_json::json!({
        "maxAttempts": 3,
        "backoff": "exponential"
    }))
    .map_err(|error| DomainError::new(error.to_string()))
}

fn webhook_metadata_json(command: &UpdateSettingsCommand) -> DomainResult<String> {
    serde_json::to_string(&serde_json::json!({
        "source": "console_settings",
        "userId": command.subject.user_id
    }))
    .map_err(|error| DomainError::new(error.to_string()))
}

fn string_cell(row: &sqlx::sqlite::SqliteRow, name: &str) -> String {
    row.try_get::<String, _>(name).unwrap_or_default()
}

fn sql_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
