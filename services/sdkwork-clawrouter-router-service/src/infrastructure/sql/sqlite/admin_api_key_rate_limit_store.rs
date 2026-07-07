use sha2::{Digest, Sha256};
use sqlx::{Row, Sqlite, SqlitePool, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::routing_config_change::{
    record_sqlite_ai_routing_config_change, AiRoutingConfigChange,
};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    AdminApiKeyRateLimitCommandFuture, AdminApiKeyRateLimitItem, AdminApiKeyRateLimitListPage,
    AdminApiKeyRateLimitStore, CreateAdminApiKeyRateLimitCommand, ListAdminApiKeyRateLimitsQuery,
};

const API_KEY_RATE_LIMIT_TARGET_TYPE: i32 = 44;
const CONFIG_SCOPE_ROUTER: i32 = 10;
const CONFIG_TYPE_API_KEY_RATE_LIMIT: i32 = API_KEY_RATE_LIMIT_TARGET_TYPE;
const API_KEY_SUBJECT_TYPE: i32 = 2;
const DAILY_REQUEST_PERIOD: i32 = 3;
const REQUEST_QUOTA_UNIT: i32 = 1;

#[derive(Debug, Clone)]
pub struct SqliteAdminApiKeyRateLimitStore {
    pool: SqlitePool,
}

#[derive(Debug, Clone)]
struct ApiKeyIdentity {
    id: i64,
    user_id: i64,
    key_prefix: String,
    name: String,
}

impl SqliteAdminApiKeyRateLimitStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl AdminApiKeyRateLimitStore for SqliteAdminApiKeyRateLimitStore {
    fn list_api_key_rate_limits<'a>(
        &'a self,
        query: ListAdminApiKeyRateLimitsQuery,
    ) -> AdminApiKeyRateLimitCommandFuture<'a, AdminApiKeyRateLimitListPage> {
        Box::pin(async move { list_api_key_rate_limits(&self.pool, query).await })
    }

    fn create_api_key_rate_limit<'a>(
        &'a self,
        command: CreateAdminApiKeyRateLimitCommand,
    ) -> AdminApiKeyRateLimitCommandFuture<'a, AdminApiKeyRateLimitItem> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin api key rate limit transaction", error)
            })?;
            let api_key = find_api_key(&mut tx, &command).await?;
            let policy_id = upsert_quota_policy(&mut tx, &command, &api_key).await?;
            bind_api_key_quota_policy(&mut tx, policy_id, &command, &api_key).await?;
            insert_config_snapshot(
                &mut tx,
                &command.config_snapshot_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.operator_id,
                policy_id,
                serde_json::json!({
                    "action": "create_api_key_rate_limit",
                    "apiKeyRateLimitId": policy_id,
                    "apiKeyId": api_key.id,
                    "keyPrefix": &api_key.key_prefix,
                    "userId": api_key.user_id,
                    "rps": command.rps,
                    "rpd": command.rpd,
                    "burst": command.burst
                }),
                &command.requested_at,
            )
            .await?;
            insert_audit_log(
                &mut tx,
                &command.audit_log_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.operator_id,
                command.subject.operator_type,
                policy_id,
                serde_json::json!({
                    "action": "create_api_key_rate_limit",
                    "apiKeyRateLimitId": policy_id,
                    "apiKeyId": api_key.id,
                    "keyPrefix": &api_key.key_prefix,
                    "rps": command.rps,
                    "rpd": command.rpd,
                    "burst": command.burst
                }),
            )
            .await?;
            record_sqlite_ai_routing_config_change(
                &mut tx,
                api_key_rate_limit_routing_config_change(
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    command.subject.operator_id,
                    &command.request_id,
                    &command.requested_at,
                    "create_api_key_rate_limit",
                    policy_id,
                    serde_json::json!({
                        "apiKeyRateLimitId": policy_id,
                        "apiKeyId": api_key.id
                    }),
                ),
            )
            .await?;
            let item = load_api_key_rate_limit_by_id(
                &mut tx,
                policy_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            .ok_or_else(|| DomainError::new("created api key rate limit could not be reloaded"))?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit api key rate limit transaction", error)
            })?;
            Ok(item)
        })
    }
}

async fn list_api_key_rate_limits(
    pool: &SqlitePool,
    query: ListAdminApiKeyRateLimitsQuery,
) -> DomainResult<AdminApiKeyRateLimitListPage> {
    let search = query
        .q
        .as_ref()
        .map(|value| format!("%{}%", value.to_lowercase()));
    let sql = api_key_rate_limit_select_sql(
        r#"
        WHERE q.tenant_id = ?
          AND q.organization_id = ?
          AND q.subject_type = ?
          AND q.policy_code LIKE 'akrl-%'
          AND q.deleted_at IS NULL
          AND (
              ? IS NULL
              OR LOWER(COALESCE(k.key_prefix, q.subject_ref_masked, '')) LIKE ?
              OR LOWER(COALESCE(CAST(k.user_id AS TEXT), '')) LIKE ?
          )
        ORDER BY q.updated_at DESC, q.id DESC
        LIMIT ? OFFSET ?
        "#,
    );
    let rows = sqlx::query(&sql)
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id)
        .bind(API_KEY_SUBJECT_TYPE)
        .bind(search.as_deref())
        .bind(search.as_deref())
        .bind(search.as_deref())
        .bind(query.page_size)
        .bind(query.offset)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to list api key rate limits", error))?;

    let total = rows
        .first()
        .and_then(|row| row.try_get::<i64, _>("total").ok())
        .unwrap_or(0);
    let items = rows
        .into_iter()
        .map(item_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminApiKeyRateLimitListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn find_api_key(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CreateAdminApiKeyRateLimitCommand,
) -> DomainResult<ApiKeyIdentity> {
    let rows = sqlx::query(
        r#"
        SELECT id, user_id, COALESCE(key_prefix, '') AS key_prefix, COALESCE(name, '') AS name
        FROM iam_gateway_api_key
        WHERE tenant_id = ?
          AND organization_id = ?
          AND key_prefix = ?
          AND status = 1
          AND deleted_at IS NULL
          AND revoked_at IS NULL
          AND (expire_at IS NULL OR datetime(expire_at) > CURRENT_TIMESTAMP)
        ORDER BY updated_at DESC, id DESC
        LIMIT 2
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.key_prefix)
    .fetch_all(&mut **tx)
    .await
    .map_err(|error| store_error("failed to find api key for rate limit", error))?;

    if rows.is_empty() {
        return Err(DomainError::new("api key prefix was not found"));
    }
    if rows.len() > 1 {
        return Err(DomainError::conflict(
            "api key prefix matches multiple API keys",
        ));
    }
    let row = rows
        .into_iter()
        .next()
        .ok_or_else(|| DomainError::new("api key prefix was not found"))?;
    Ok(ApiKeyIdentity {
        id: row.try_get("id").map_err(row_error)?,
        user_id: row.try_get("user_id").map_err(row_error)?,
        key_prefix: row.try_get("key_prefix").map_err(row_error)?,
        name: row.try_get("name").map_err(row_error)?,
    })
}

async fn upsert_quota_policy(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CreateAdminApiKeyRateLimitCommand,
    api_key: &ApiKeyIdentity,
) -> DomainResult<i64> {
    if let Some(id) = find_existing_policy(tx, command, api_key.id).await? {
        update_quota_policy(tx, id, command, api_key).await?;
        return Ok(id);
    }
    insert_quota_policy(tx, command, api_key).await
}

async fn find_existing_policy(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CreateAdminApiKeyRateLimitCommand,
    api_key_id: i64,
) -> DomainResult<Option<i64>> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM ai_quota_policy
        WHERE tenant_id = ?
          AND organization_id = ?
          AND subject_type = ?
          AND subject_id = ?
          AND quota_period = ?
          AND quota_unit = ?
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(API_KEY_SUBJECT_TYPE)
    .bind(api_key_id)
    .bind(DAILY_REQUEST_PERIOD)
    .bind(REQUEST_QUOTA_UNIT)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to find api key quota policy", error))
}

async fn insert_quota_policy(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CreateAdminApiKeyRateLimitCommand,
    api_key: &ApiKeyIdentity,
) -> DomainResult<i64> {
    let id = next_claw_runtime_id("ai_quota_policy")?;
    sqlx::query(
        r#"
        INSERT INTO ai_quota_policy
            (uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, metadata, policy_code, name, subject_type, subject_id, subject_ref_hash, subject_ref_masked, quota_period, quota_unit, quota_limit, requests_per_second, requests_per_day, burst_limit, effective_from, id)
        VALUES
            (?, ?, ?, 1, 1, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&command.policy_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .bind(policy_metadata(command, api_key))
    .bind(&command.policy_code)
    .bind(policy_name(command, api_key))
    .bind(API_KEY_SUBJECT_TYPE)
    .bind(api_key.id)
    .bind(&command.key_prefix_hash)
    .bind(&api_key.key_prefix)
    .bind(DAILY_REQUEST_PERIOD)
    .bind(REQUEST_QUOTA_UNIT)
    .bind(command.rpd.to_string())
    .bind(command.rps)
    .bind(command.rpd)
    .bind(command.burst.to_string())
    .bind(&command.requested_at)
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create api key rate limit", error))?;

    Ok(id)
}

async fn update_quota_policy(
    tx: &mut Transaction<'_, Sqlite>,
    policy_id: i64,
    command: &CreateAdminApiKeyRateLimitCommand,
    api_key: &ApiKeyIdentity,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE ai_quota_policy
        SET uuid = ?,
            status = 1,
            updated_at = ?,
            deleted_at = NULL,
            deleted_by = NULL,
            metadata = ?,
            policy_code = ?,
            name = ?,
            subject_ref_hash = ?,
            subject_ref_masked = ?,
            quota_limit = ?,
            requests_per_second = ?,
            requests_per_day = ?,
            burst_limit = ?,
            exhausted_at = NULL,
            effective_from = ?,
            effective_to = NULL
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
        "#,
    )
    .bind(&command.policy_uuid)
    .bind(&command.requested_at)
    .bind(policy_metadata(command, api_key))
    .bind(&command.policy_code)
    .bind(policy_name(command, api_key))
    .bind(&command.key_prefix_hash)
    .bind(&api_key.key_prefix)
    .bind(command.rpd.to_string())
    .bind(command.rps)
    .bind(command.rpd)
    .bind(command.burst.to_string())
    .bind(&command.requested_at)
    .bind(policy_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update api key rate limit", error))?;
    Ok(())
}

async fn bind_api_key_quota_policy(
    tx: &mut Transaction<'_, Sqlite>,
    policy_id: i64,
    command: &CreateAdminApiKeyRateLimitCommand,
    api_key: &ApiKeyIdentity,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE iam_gateway_api_key
        SET quota_policy_id = ?,
            rate_limit_policy_id = ?,
            updated_at = ?
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
        "#,
    )
    .bind(policy_id)
    .bind(policy_id)
    .bind(&command.requested_at)
    .bind(api_key.id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to bind api key rate limit", error))?;
    Ok(())
}

async fn load_api_key_rate_limit_by_id(
    tx: &mut Transaction<'_, Sqlite>,
    id: i64,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<Option<AdminApiKeyRateLimitItem>> {
    let sql = api_key_rate_limit_select_sql(
        r#"
        WHERE q.id = ?
          AND q.tenant_id = ?
          AND q.organization_id = ?
          AND q.subject_type = ?
          AND q.deleted_at IS NULL
        LIMIT 1
        "#,
    );
    let row = sqlx::query(&sql)
        .bind(id)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(API_KEY_SUBJECT_TYPE)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|error| store_error("failed to load api key rate limit", error))?;

    row.map(item_from_row).transpose()
}

async fn insert_config_snapshot(
    tx: &mut Transaction<'_, Sqlite>,
    snapshot_uuid: &str,
    request_id: &str,
    tenant_id: i64,
    organization_id: i64,
    operator_id: i64,
    target_id: i64,
    payload: serde_json::Value,
    requested_at: &str,
) -> DomainResult<()> {
    let payload = payload.to_string();
    let snapshot_no = format!("api-key-rate-limit-{target_id}-save-{snapshot_uuid}");
    let id = next_claw_runtime_id("ops_config_snapshot")?;
    sqlx::query(
        r#"
        INSERT INTO ops_config_snapshot
            (uuid, tenant_id, organization_id, user_id, request_id, status, snapshot_no, config_scope, config_type, source_table, source_ids, config_payload, config_hash, published_at, published_by, id)
        VALUES
            (?, ?, ?, ?, ?, 1, ?, ?, ?, 'ai_quota_policy', ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(snapshot_uuid)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(operator_id)
    .bind(request_id)
    .bind(snapshot_no)
    .bind(CONFIG_SCOPE_ROUTER)
    .bind(CONFIG_TYPE_API_KEY_RATE_LIMIT)
    .bind(serde_json::json!([target_id]).to_string())
    .bind(&payload)
    .bind(digest_hex(&payload))
    .bind(requested_at)
    .bind(operator_id)
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write api key rate limit config snapshot", error))?;
    Ok(())
}

async fn insert_audit_log(
    tx: &mut Transaction<'_, Sqlite>,
    audit_log_uuid: &str,
    request_id: &str,
    tenant_id: i64,
    organization_id: i64,
    operator_id: i64,
    operator_type: i32,
    target_id: i64,
    change_summary: serde_json::Value,
) -> DomainResult<()> {
    let id = next_claw_runtime_id("ops_audit_log")?;
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (uuid, tenant_id, organization_id, action, target_type, target_id, request_id, operator_id, operator_type, change_summary, id)
        VALUES
            (?, ?, ?, 'create_api_key_rate_limit', ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(audit_log_uuid)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(API_KEY_RATE_LIMIT_TARGET_TYPE)
    .bind(target_id)
    .bind(request_id)
    .bind(operator_id)
    .bind(operator_type)
    .bind(change_summary.to_string())
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write api key rate limit audit log", error))?;
    Ok(())
}

fn api_key_rate_limit_select_sql(predicate: &str) -> String {
    format!(
        r#"
        SELECT
            q.id,
            q.uuid,
            q.tenant_id,
            q.organization_id,
            COALESCE(k.key_prefix, q.subject_ref_masked, '') AS key_prefix,
            COALESCE(CAST(k.user_id AS TEXT), '') AS user,
            q.requests_per_second AS rps,
            q.requests_per_day AS rpd,
            CAST(q.burst_limit AS TEXT) AS burst,
            q.status,
            CAST(q.exhausted_at AS TEXT) AS exhausted_at,
            CAST(q.deleted_at AS TEXT) AS deleted_at,
            COUNT(*) OVER() AS total
        FROM ai_quota_policy q
        LEFT JOIN iam_gateway_api_key k
          ON q.subject_type = {API_KEY_SUBJECT_TYPE}
         AND q.subject_id = k.id
        {predicate}
        "#
    )
}

fn item_from_row(row: sqlx::sqlite::SqliteRow) -> DomainResult<AdminApiKeyRateLimitItem> {
    Ok(AdminApiKeyRateLimitItem {
        id: row.try_get("id").map_err(row_error)?,
        uuid: row.try_get("uuid").map_err(row_error)?,
        tenant_id: row.try_get("tenant_id").map_err(row_error)?,
        organization_id: row.try_get("organization_id").map_err(row_error)?,
        key_prefix: row.try_get("key_prefix").map_err(row_error)?,
        user: row.try_get("user").map_err(row_error)?,
        rps: required_integer_cell(&row, "rps")?,
        rpd: required_integer_cell(&row, "rpd")?,
        burst: required_decimal_integer_cell(&row, "burst")?,
        status: status_label(
            required_integer_cell(&row, "status")?,
            row.try_get::<Option<String>, _>("exhausted_at")
                .ok()
                .flatten(),
        ),
        deleted_at: row.try_get("deleted_at").ok().flatten(),
    })
}

fn status_label(status: i64, exhausted_at: Option<String>) -> String {
    if status == 0 || exhausted_at.is_some() {
        "exhausted"
    } else {
        "active"
    }
    .to_owned()
}

fn policy_metadata(
    command: &CreateAdminApiKeyRateLimitCommand,
    api_key: &ApiKeyIdentity,
) -> String {
    serde_json::json!({
        "managedBy": "admin_api_key_rate_limit",
        "policyCode": &command.policy_code,
        "apiKeyId": api_key.id,
        "keyPrefix": &api_key.key_prefix,
        "apiKeyName": &api_key.name,
        "operatorUser": &command.user
    })
    .to_string()
}

fn policy_name(command: &CreateAdminApiKeyRateLimitCommand, api_key: &ApiKeyIdentity) -> String {
    truncate_chars(
        &format!(
            "API key {} rate limit ({})",
            api_key.key_prefix, command.user
        ),
        128,
    )
}

fn truncate_chars(value: &str, max_len: usize) -> String {
    value.chars().take(max_len).collect()
}

fn digest_hex(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    hex::encode(hasher.finalize())
}

fn required_integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<i64> {
    row.try_get::<Option<i64>, _>(column)
        .ok()
        .flatten()
        .or_else(|| {
            row.try_get::<Option<i32>, _>(column)
                .ok()
                .flatten()
                .map(i64::from)
        })
        .ok_or_else(|| DomainError::new(format!("missing rate limit {column} from database row")))
}

fn required_decimal_integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<i64> {
    row.try_get::<String, _>(column)
        .map_err(row_error)
        .and_then(|value| {
            value
                .split('.')
                .next()
                .and_then(|value| value.parse().ok())
                .ok_or_else(|| {
                    DomainError::new(format!("invalid rate limit {column} from database row"))
                })
        })
}

fn row_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    if let sqlx::Error::Database(database_error) = &error {
        let message = database_error.message();
        if message.contains("UNIQUE")
            || database_error
                .code()
                .map(|code| code == "23505")
                .unwrap_or(false)
        {
            return DomainError::conflict(format!("{context}: api key rate limit already exists"));
        }
    }
    redacted_store_error(context, error)
}

fn api_key_rate_limit_routing_config_change<'a>(
    tenant_id: i64,
    organization_id: i64,
    operator_id: i64,
    request_id: &'a str,
    requested_at: &'a str,
    action: &'a str,
    api_key_rate_limit_id: i64,
    event_payload: serde_json::Value,
) -> AiRoutingConfigChange<'a> {
    AiRoutingConfigChange {
        tenant_id,
        organization_id,
        operator_id,
        request_id,
        requested_at,
        changed_object_type: "api_key_rate_limit",
        changed_object_id: api_key_rate_limit_id,
        action,
        event_payload,
    }
}
