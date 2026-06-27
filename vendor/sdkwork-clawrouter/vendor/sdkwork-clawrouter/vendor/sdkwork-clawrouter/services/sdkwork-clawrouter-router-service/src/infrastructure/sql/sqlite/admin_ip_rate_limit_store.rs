use sha2::{Digest, Sha256};
use sqlx::{Row, Sqlite, SqlitePool, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::routing_config_change::{
    record_sqlite_ai_routing_config_change, AiRoutingConfigChange,
};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    AdminIpRateLimitCommandFuture, AdminIpRateLimitItem, AdminIpRateLimitStore,
    CreateAdminIpRateLimitCommand, ListAdminIpRateLimitsQuery,
};

const IP_RATE_LIMIT_TARGET_TYPE: i32 = 42;
const CONFIG_SCOPE_ROUTER: i32 = 10;
const CONFIG_TYPE_IP_RATE_LIMIT: i32 = IP_RATE_LIMIT_TARGET_TYPE;
const RATE_LIMIT_RULE_CATEGORY: i32 = 10;
const IP_RATE_LIMIT_RULE_TYPE: i32 = 11;
const GLOBAL_SCOPE_TYPE: i32 = 1;
const IP_TARGET_TYPE: i32 = 1;
const CIDR_MATCH_MODE: i32 = 2;
const THROTTLE_ACTION: i32 = 10;

#[derive(Debug, Clone)]
pub struct SqliteAdminIpRateLimitStore {
    pool: SqlitePool,
}

impl SqliteAdminIpRateLimitStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl AdminIpRateLimitStore for SqliteAdminIpRateLimitStore {
    fn list_ip_rate_limits<'a>(
        &'a self,
        query: ListAdminIpRateLimitsQuery,
    ) -> AdminIpRateLimitCommandFuture<'a, Vec<AdminIpRateLimitItem>> {
        Box::pin(async move { list_ip_rate_limits(&self.pool, query).await })
    }

    fn create_ip_rate_limit<'a>(
        &'a self,
        command: CreateAdminIpRateLimitCommand,
    ) -> AdminIpRateLimitCommandFuture<'a, AdminIpRateLimitItem> {
        Box::pin(async move {
            let mut tx =
                self.pool.begin().await.map_err(|error| {
                    store_error("failed to begin ip rate limit transaction", error)
                })?;
            let id = upsert_ip_rate_limit(&mut tx, &command).await?;
            insert_config_snapshot(
                &mut tx,
                &command.config_snapshot_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.operator_id,
                id,
                serde_json::json!({
                    "action": "create_ip_rate_limit",
                    "ipRateLimitId": id,
                    "ruleName": &command.rule_name,
                    "targetIp": &command.target_ip,
                    "rps": command.rps,
                    "rpm": command.rpm,
                    "blockDurationSeconds": command.block_duration_seconds,
                    "status": &command.status
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
                id,
                serde_json::json!({
                    "action": "create_ip_rate_limit",
                    "ipRateLimitId": id,
                    "ruleName": &command.rule_name,
                    "targetIp": &command.target_ip,
                    "rps": command.rps,
                    "rpm": command.rpm,
                    "blockDurationSeconds": command.block_duration_seconds,
                    "status": &command.status
                }),
            )
            .await?;
            record_sqlite_ai_routing_config_change(
                &mut tx,
                ip_rate_limit_routing_config_change(
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    command.subject.operator_id,
                    &command.request_id,
                    &command.requested_at,
                    "create_ip_rate_limit",
                    id,
                    serde_json::json!({
                        "ipRateLimitId": id,
                        "targetIp": &command.target_ip,
                        "status": &command.status
                    }),
                ),
            )
            .await?;
            let item = load_ip_rate_limit_by_id(
                &mut tx,
                id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            .ok_or_else(|| DomainError::new("created ip rate limit could not be reloaded"))?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit ip rate limit transaction", error)
            })?;
            Ok(item)
        })
    }
}

async fn list_ip_rate_limits(
    pool: &SqlitePool,
    query: ListAdminIpRateLimitsQuery,
) -> DomainResult<Vec<AdminIpRateLimitItem>> {
    let sql = ip_rate_limit_select_sql(
        r#"
        WHERE tenant_id = ?
          AND organization_id = ?
          AND rule_category = ?
          AND rule_type = ?
          AND target_type = ?
          AND deleted_at IS NULL
        ORDER BY priority ASC, updated_at DESC, id DESC
        LIMIT 200
        "#,
    );
    let rows = sqlx::query(&sql)
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id)
        .bind(RATE_LIMIT_RULE_CATEGORY)
        .bind(IP_RATE_LIMIT_RULE_TYPE)
        .bind(IP_TARGET_TYPE)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to list ip rate limits", error))?;

    rows.into_iter().map(item_from_row).collect()
}

async fn upsert_ip_rate_limit(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CreateAdminIpRateLimitCommand,
) -> DomainResult<i64> {
    if let Some(id) = find_existing_ip_rate_limit(tx, command).await? {
        update_ip_rate_limit(tx, id, command).await?;
        return Ok(id);
    }
    insert_ip_rate_limit(tx, command).await
}

async fn find_existing_ip_rate_limit(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CreateAdminIpRateLimitCommand,
) -> DomainResult<Option<i64>> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM iam_gateway_risk_rule
        WHERE tenant_id = ?
          AND organization_id = ?
          AND rule_category = ?
          AND rule_type = ?
          AND target_type = ?
          AND target_value_hash = ?
        ORDER BY deleted_at IS NULL DESC, updated_at DESC, id DESC
        LIMIT 1
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(RATE_LIMIT_RULE_CATEGORY)
    .bind(IP_RATE_LIMIT_RULE_TYPE)
    .bind(IP_TARGET_TYPE)
    .bind(&command.target_ip_hash)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to find existing ip rate limit", error))
}

async fn insert_ip_rate_limit(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CreateAdminIpRateLimitCommand,
) -> DomainResult<i64> {
    let metadata = serde_json::json!({
        "ruleCode": &command.rule_code,
        "managedBy": "admin_ip_rate_limit"
    })
    .to_string();
    let id = next_claw_runtime_id("iam_gateway_risk_rule")?;
    sqlx::query(
        r#"
        INSERT INTO iam_gateway_risk_rule
            (uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, metadata, rule_name, rule_category, rule_type, scope_type, scope_id, target_type, target_value, target_value_hash, target_value_masked, match_mode, reason, action, priority, requests_per_second, requests_per_minute, block_duration_seconds, effective_from, hit_count, id)
        VALUES
            (?, ?, ?, 1, ?, ?, ?, 0, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'ip rate limit', ?, 100, ?, ?, ?, ?, 0, ?)
        "#,
    )
    .bind(&command.rule_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(status_code(&command.status))
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .bind(metadata)
    .bind(&command.rule_name)
    .bind(RATE_LIMIT_RULE_CATEGORY)
    .bind(IP_RATE_LIMIT_RULE_TYPE)
    .bind(GLOBAL_SCOPE_TYPE)
    .bind(IP_TARGET_TYPE)
    .bind(&command.target_ip)
    .bind(&command.target_ip_hash)
    .bind(mask_ip_target(&command.target_ip))
    .bind(CIDR_MATCH_MODE)
    .bind(THROTTLE_ACTION)
    .bind(command.rps)
    .bind(command.rpm)
    .bind(command.block_duration_seconds)
    .bind(&command.requested_at)
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create ip rate limit", error))?;

    Ok(id)
}

async fn update_ip_rate_limit(
    tx: &mut Transaction<'_, Sqlite>,
    id: i64,
    command: &CreateAdminIpRateLimitCommand,
) -> DomainResult<()> {
    let metadata = serde_json::json!({
        "ruleCode": &command.rule_code,
        "managedBy": "admin_ip_rate_limit"
    })
    .to_string();
    sqlx::query(
        r#"
        UPDATE iam_gateway_risk_rule
        SET uuid = ?,
            status = ?,
            updated_at = ?,
            deleted_at = NULL,
            deleted_by = NULL,
            metadata = ?,
            rule_name = ?,
            rule_category = ?,
            rule_type = ?,
            scope_type = ?,
            scope_id = 0,
            target_type = ?,
            target_value = ?,
            target_value_hash = ?,
            target_value_masked = ?,
            match_mode = ?,
            reason = 'ip rate limit',
            action = ?,
            priority = 100,
            requests_per_second = ?,
            requests_per_minute = ?,
            block_duration_seconds = ?,
            effective_from = ?,
            effective_to = NULL
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
        "#,
    )
    .bind(&command.rule_uuid)
    .bind(status_code(&command.status))
    .bind(&command.requested_at)
    .bind(metadata)
    .bind(&command.rule_name)
    .bind(RATE_LIMIT_RULE_CATEGORY)
    .bind(IP_RATE_LIMIT_RULE_TYPE)
    .bind(GLOBAL_SCOPE_TYPE)
    .bind(IP_TARGET_TYPE)
    .bind(&command.target_ip)
    .bind(&command.target_ip_hash)
    .bind(mask_ip_target(&command.target_ip))
    .bind(CIDR_MATCH_MODE)
    .bind(THROTTLE_ACTION)
    .bind(command.rps)
    .bind(command.rpm)
    .bind(command.block_duration_seconds)
    .bind(&command.requested_at)
    .bind(id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update ip rate limit", error))?;
    Ok(())
}

async fn load_ip_rate_limit_by_id(
    tx: &mut Transaction<'_, Sqlite>,
    id: i64,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<Option<AdminIpRateLimitItem>> {
    let sql = ip_rate_limit_select_sql(
        r#"
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND rule_category = ?
          AND rule_type = ?
          AND target_type = ?
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    );
    let row = sqlx::query(&sql)
        .bind(id)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(RATE_LIMIT_RULE_CATEGORY)
        .bind(IP_RATE_LIMIT_RULE_TYPE)
        .bind(IP_TARGET_TYPE)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|error| store_error("failed to load ip rate limit", error))?;

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
    let snapshot_no = format!("ip-rate-limit-{target_id}-create-{snapshot_uuid}");
    let id = next_claw_runtime_id("ops_config_snapshot")?;
    sqlx::query(
        r#"
        INSERT INTO ops_config_snapshot
            (uuid, tenant_id, organization_id, user_id, request_id, status, snapshot_no, config_scope, config_type, source_table, source_ids, config_payload, config_hash, published_at, published_by, id)
        VALUES
            (?, ?, ?, ?, ?, 1, ?, ?, ?, 'iam_gateway_risk_rule', ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(snapshot_uuid)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(operator_id)
    .bind(request_id)
    .bind(snapshot_no)
    .bind(CONFIG_SCOPE_ROUTER)
    .bind(CONFIG_TYPE_IP_RATE_LIMIT)
    .bind(serde_json::json!([target_id]).to_string())
    .bind(&payload)
    .bind(digest_hex(&payload))
    .bind(requested_at)
    .bind(operator_id)
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write ip rate limit config snapshot", error))?;
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
            (?, ?, ?, 'create_ip_rate_limit', ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(audit_log_uuid)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(IP_RATE_LIMIT_TARGET_TYPE)
    .bind(target_id)
    .bind(request_id)
    .bind(operator_id)
    .bind(operator_type)
    .bind(change_summary.to_string())
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write ip rate limit audit log", error))?;
    Ok(())
}

fn ip_rate_limit_select_sql(predicate: &str) -> String {
    format!(
        r#"
        SELECT
            id,
            uuid,
            tenant_id,
            organization_id,
            COALESCE(rule_name, '') AS rule_name,
            COALESCE(target_value, '') AS target_ip,
            requests_per_second AS rps,
            requests_per_minute AS rpm,
            block_duration_seconds,
            status,
            CAST(deleted_at AS TEXT) AS deleted_at
        FROM iam_gateway_risk_rule
        {predicate}
        "#
    )
}

fn item_from_row(row: sqlx::sqlite::SqliteRow) -> DomainResult<AdminIpRateLimitItem> {
    Ok(AdminIpRateLimitItem {
        id: row.try_get("id").map_err(row_error)?,
        uuid: row.try_get("uuid").map_err(row_error)?,
        tenant_id: row.try_get("tenant_id").map_err(row_error)?,
        organization_id: row.try_get("organization_id").map_err(row_error)?,
        rule_name: row.try_get("rule_name").map_err(row_error)?,
        target_ip: row.try_get("target_ip").map_err(row_error)?,
        rps: required_integer_cell(&row, "rps")?,
        rpm: required_integer_cell(&row, "rpm")?,
        block_duration_seconds: required_integer_cell(&row, "block_duration_seconds")?,
        status: status_label(required_integer_cell(&row, "status")?),
        deleted_at: row.try_get("deleted_at").ok().flatten(),
    })
}

fn status_code(value: &str) -> i32 {
    if value == "inactive" {
        0
    } else {
        1
    }
}

fn status_label(value: i64) -> String {
    if value == 0 { "inactive" } else { "active" }.to_owned()
}

fn mask_ip_target(value: &str) -> String {
    value.to_owned()
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
            return DomainError::conflict(format!("{context}: ip rate limit already exists"));
        }
    }
    redacted_store_error(context, error)
}

fn ip_rate_limit_routing_config_change<'a>(
    tenant_id: i64,
    organization_id: i64,
    operator_id: i64,
    request_id: &'a str,
    requested_at: &'a str,
    action: &'a str,
    ip_rate_limit_id: i64,
    event_payload: serde_json::Value,
) -> AiRoutingConfigChange<'a> {
    AiRoutingConfigChange {
        tenant_id,
        organization_id,
        operator_id,
        request_id,
        requested_at,
        changed_object_type: "ip_rate_limit",
        changed_object_id: ip_rate_limit_id,
        action,
        event_payload,
    }
}
