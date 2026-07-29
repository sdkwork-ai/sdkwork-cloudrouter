use sha2::{Digest, Sha256};
use sqlx::{PgPool, Postgres, Row, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::routing_config_change::{
    record_postgres_ai_routing_config_change, AiRoutingConfigChange,
};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    AdminModelRateLimitCommandFuture, AdminModelRateLimitItem, AdminModelRateLimitListPage,
    AdminModelRateLimitStore, CreateAdminModelRateLimitCommand, ListAdminModelRateLimitsQuery,
};

const MODEL_RATE_LIMIT_TARGET_TYPE: i32 = 45;
const CONFIG_SCOPE_ROUTER: i32 = 10;
const CONFIG_TYPE_MODEL_RATE_LIMIT: i32 = MODEL_RATE_LIMIT_TARGET_TYPE;
const MODEL_RATE_LIMIT_SUBJECT_TYPE: i32 = 4;
const ACCOUNT_GROUP_SCOPE_TYPE: i32 = 3;
const MINUTE_PERIOD: i32 = 2;
const REQUEST_QUOTA_UNIT: i32 = 1;

#[derive(Debug, Clone)]
pub struct PostgresAdminModelRateLimitStore {
    pool: PgPool,
}

#[derive(Debug, Clone)]
struct GroupIdentity {
    id: i64,
    code: String,
    name: String,
}

impl PostgresAdminModelRateLimitStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminModelRateLimitStore for PostgresAdminModelRateLimitStore {
    fn list_model_rate_limits<'a>(
        &'a self,
        query: ListAdminModelRateLimitsQuery,
    ) -> AdminModelRateLimitCommandFuture<'a, AdminModelRateLimitListPage> {
        Box::pin(async move { list_model_rate_limits(&self.pool, query).await })
    }

    fn create_model_rate_limit<'a>(
        &'a self,
        command: CreateAdminModelRateLimitCommand,
    ) -> AdminModelRateLimitCommandFuture<'a, AdminModelRateLimitItem> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin model rate limit transaction", error)
            })?;
            let group = find_upstream_account_group(&mut tx, &command).await?;
            let policy_id = upsert_quota_policy(&mut tx, &command, &group).await?;
            insert_config_snapshot(
                &mut tx,
                &command.config_snapshot_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.operator_id,
                policy_id,
                serde_json::json!({
                    "action": "create_model_rate_limit",
                    "modelRateLimitId": policy_id,
                    "groupId": group.id,
                    "accountGroup": group_label(&group),
                    "model": &command.model,
                    "rpm": command.rpm,
                    "tpm": command.tpm
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
                    "action": "create_model_rate_limit",
                    "modelRateLimitId": policy_id,
                    "groupId": group.id,
                    "accountGroup": group_label(&group),
                    "model": &command.model,
                    "rpm": command.rpm,
                    "tpm": command.tpm
                }),
            )
            .await?;
            record_postgres_ai_routing_config_change(
                &mut tx,
                model_rate_limit_routing_config_change(
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    command.subject.operator_id,
                    &command.request_id,
                    &command.requested_at,
                    "create_model_rate_limit",
                    policy_id,
                    serde_json::json!({
                        "modelRateLimitId": policy_id,
                        "groupId": group.id,
                        "model": &command.model
                    }),
                ),
            )
            .await?;
            let item = load_model_rate_limit_by_id(
                &mut tx,
                policy_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            .ok_or_else(|| DomainError::new("created model rate limit could not be reloaded"))?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit model rate limit transaction", error)
            })?;
            Ok(item)
        })
    }
}

async fn list_model_rate_limits(
    pool: &PgPool,
    query: ListAdminModelRateLimitsQuery,
) -> DomainResult<AdminModelRateLimitListPage> {
    let search = query
        .q
        .as_ref()
        .map(|value| format!("%{}%", value.to_lowercase()));
    let sql = model_rate_limit_select_sql(
        r#"
        WHERE q.tenant_id = $1
          AND q.organization_id = $2
          AND q.subject_type = $3
          AND q.policy_code LIKE 'mrl-%'
          AND q.deleted_at IS NULL
          AND (
              $4 IS NULL
              OR LOWER(COALESCE(q.model, '')) LIKE $4
              OR LOWER(COALESCE(NULLIF(g.group_code, ''), NULLIF(g.group_name, ''), q.subject_ref_masked, '')) LIKE $4
          )
        ORDER BY q.updated_at DESC NULLS LAST, q.id DESC
        LIMIT $5 OFFSET $6
        "#,
    );
    let rows = sqlx::query(&sql)
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id)
        .bind(MODEL_RATE_LIMIT_SUBJECT_TYPE)
        .bind(search.as_deref())
        .bind(query.page_size)
        .bind(query.offset)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to list model rate limits", error))?;

    let total = rows
        .first()
        .and_then(|row| row.try_get::<i64, _>("total").ok())
        .unwrap_or(0);
    let items = rows
        .into_iter()
        .map(item_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminModelRateLimitListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn find_upstream_account_group(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminModelRateLimitCommand,
) -> DomainResult<GroupIdentity> {
    let row = sqlx::query(
        r#"
        SELECT id, COALESCE(group_code, '') AS code, COALESCE(group_name, '') AS name
        FROM ai_upstream_account_group
        WHERE (tenant_id = $1 OR tenant_id = 0 OR tenant_id IS NULL)
          AND (organization_id = $2 OR organization_id = 0 OR organization_id IS NULL)
          AND (group_code = $3 OR group_name = $4)
          AND status = 1
          AND deleted_at IS NULL
        ORDER BY
          CASE
            WHEN tenant_id = $5 AND organization_id = $6 THEN 0
            WHEN tenant_id = $5 AND organization_id = 0 THEN 1
            WHEN tenant_id = 0 AND organization_id = 0 THEN 2
            ELSE 3
          END,
          CASE WHEN group_code = $7 THEN 0 ELSE 1 END,
          updated_at DESC NULLS LAST,
          id DESC
        LIMIT 1
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.account_group)
    .bind(&command.account_group)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.account_group)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to find channel group for model rate limit", error))?;

    let Some(row) = row else {
        return Err(DomainError::new("channel group was not found"));
    };
    Ok(GroupIdentity {
        id: row.try_get("id").map_err(row_error)?,
        code: row.try_get("code").map_err(row_error)?,
        name: row.try_get("name").map_err(row_error)?,
    })
}

async fn upsert_quota_policy(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminModelRateLimitCommand,
    group: &GroupIdentity,
) -> DomainResult<i64> {
    let subject_id = model_rate_limit_subject_id(group.id, &command.model);
    if let Some(id) = find_existing_policy(tx, command, group.id, subject_id).await? {
        update_quota_policy(tx, id, command, group, subject_id).await?;
        return Ok(id);
    }
    insert_quota_policy(tx, command, group, subject_id).await
}

async fn find_existing_policy(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminModelRateLimitCommand,
    group_id: i64,
    subject_id: i64,
) -> DomainResult<Option<i64>> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM ai_quota_policy
        WHERE tenant_id = $1
          AND organization_id = $2
          AND subject_type = $3
          AND subject_id = $4
          AND group_id = $5
          AND model = $6
          AND quota_period = $7
          AND quota_unit = $8
        LIMIT 1
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(MODEL_RATE_LIMIT_SUBJECT_TYPE)
    .bind(subject_id)
    .bind(group_id)
    .bind(&command.model)
    .bind(MINUTE_PERIOD)
    .bind(REQUEST_QUOTA_UNIT)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to find model quota policy", error))
}

async fn insert_quota_policy(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminModelRateLimitCommand,
    group: &GroupIdentity,
    subject_id: i64,
) -> DomainResult<i64> {
    let subject_ref_hash = model_rate_limit_subject_hash(group.id, &command.model);
    let id = next_claw_runtime_id("ai_quota_policy")?;
    sqlx::query(
        r#"
        INSERT INTO ai_quota_policy
            (uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, metadata, policy_code, name, subject_type, subject_id, subject_ref_hash, subject_ref_masked, scope_type, scope_id, group_id, model, quota_period, quota_unit, quota_limit, requests_per_minute, tokens_per_minute, effective_from, id)
        VALUES
            ($1, $2, $3, 1, 1, $4::timestamptz, $5::timestamptz, 0, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::numeric, $20, $21, $22::timestamptz, $23)
        "#,
    )
    .bind(&command.policy_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .bind(policy_metadata(command, group))
    .bind(&command.policy_code)
    .bind(policy_name(command, group))
    .bind(MODEL_RATE_LIMIT_SUBJECT_TYPE)
    .bind(subject_id)
    .bind(subject_ref_hash)
    .bind(subject_ref_masked(command, group))
    .bind(ACCOUNT_GROUP_SCOPE_TYPE)
    .bind(group.id)
    .bind(group.id)
    .bind(&command.model)
    .bind(MINUTE_PERIOD)
    .bind(REQUEST_QUOTA_UNIT)
    .bind(command.rpm.to_string())
    .bind(command.rpm)
    .bind(command.tpm)
    .bind(&command.requested_at)
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create model rate limit", error))?;
    Ok(id)
}

async fn update_quota_policy(
    tx: &mut Transaction<'_, Postgres>,
    policy_id: i64,
    command: &CreateAdminModelRateLimitCommand,
    group: &GroupIdentity,
    subject_id: i64,
) -> DomainResult<()> {
    let subject_ref_hash = model_rate_limit_subject_hash(group.id, &command.model);
    sqlx::query(
        r#"
        UPDATE ai_quota_policy
        SET uuid = $1,
            status = 1,
            updated_at = $2::timestamptz,
            deleted_at = NULL,
            deleted_by = NULL,
            metadata = $3::jsonb,
            policy_code = $4,
            name = $5,
            subject_type = $6,
            subject_id = $7,
            subject_ref_hash = $8,
            subject_ref_masked = $9,
            scope_type = $10,
            scope_id = $11,
            group_id = $12,
            model = $13,
            quota_period = $14,
            quota_unit = $15,
            quota_limit = $16::numeric,
            requests_per_minute = $17,
            tokens_per_minute = $18,
            exhausted_at = NULL,
            effective_from = $19::timestamptz,
            effective_to = NULL
        WHERE id = $20
          AND tenant_id = $21
          AND organization_id = $22
        "#,
    )
    .bind(&command.policy_uuid)
    .bind(&command.requested_at)
    .bind(policy_metadata(command, group))
    .bind(&command.policy_code)
    .bind(policy_name(command, group))
    .bind(MODEL_RATE_LIMIT_SUBJECT_TYPE)
    .bind(subject_id)
    .bind(subject_ref_hash)
    .bind(subject_ref_masked(command, group))
    .bind(ACCOUNT_GROUP_SCOPE_TYPE)
    .bind(group.id)
    .bind(group.id)
    .bind(&command.model)
    .bind(MINUTE_PERIOD)
    .bind(REQUEST_QUOTA_UNIT)
    .bind(command.rpm.to_string())
    .bind(command.rpm)
    .bind(command.tpm)
    .bind(&command.requested_at)
    .bind(policy_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update model rate limit", error))?;
    Ok(())
}

async fn load_model_rate_limit_by_id(
    tx: &mut Transaction<'_, Postgres>,
    id: i64,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<Option<AdminModelRateLimitItem>> {
    let sql = model_rate_limit_select_sql(
        r#"
        WHERE q.id = $1
          AND q.tenant_id = $2
          AND q.organization_id = $3
          AND q.subject_type = $4
          AND q.deleted_at IS NULL
        LIMIT 1
        "#,
    );
    let row = sqlx::query(&sql)
        .bind(id)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(MODEL_RATE_LIMIT_SUBJECT_TYPE)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|error| store_error("failed to load model rate limit", error))?;

    row.map(item_from_row).transpose()
}

async fn insert_config_snapshot(
    tx: &mut Transaction<'_, Postgres>,
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
    let snapshot_no = format!("model-rate-limit-{target_id}-save-{snapshot_uuid}");
    let id = next_claw_runtime_id("ops_config_snapshot")?;
    sqlx::query(
        r#"
        INSERT INTO ops_config_snapshot
            (uuid, tenant_id, organization_id, user_id, request_id, status, snapshot_no, config_scope, config_type, source_table, source_ids, config_payload, config_hash, published_at, published_by, id)
        VALUES
            ($1, $2, $3, $4, $5, 1, $6, $7, $8, 'ai_quota_policy', $9::jsonb, $10::jsonb, $11, $12::timestamptz, $13, $14)
        "#,
    )
    .bind(snapshot_uuid)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(operator_id)
    .bind(request_id)
    .bind(snapshot_no)
    .bind(CONFIG_SCOPE_ROUTER)
    .bind(CONFIG_TYPE_MODEL_RATE_LIMIT)
    .bind(serde_json::json!([target_id]).to_string())
    .bind(&payload)
    .bind(digest_hex(&payload))
    .bind(requested_at)
    .bind(operator_id)
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write model rate limit config snapshot", error))?;
    Ok(())
}

async fn insert_audit_log(
    tx: &mut Transaction<'_, Postgres>,
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
            ($1, $2, $3, 'create_model_rate_limit', $4, $5, $6, $7, $8, $9::jsonb, $10)
        "#,
    )
    .bind(audit_log_uuid)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(MODEL_RATE_LIMIT_TARGET_TYPE)
    .bind(target_id)
    .bind(request_id)
    .bind(operator_id)
    .bind(operator_type)
    .bind(change_summary.to_string())
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write model rate limit audit log", error))?;
    Ok(())
}

fn model_rate_limit_select_sql(predicate: &str) -> String {
    format!(
        r#"
        SELECT
            q.id,
            q.uuid,
            q.tenant_id,
            q.organization_id,
            COALESCE(q.model, '') AS model,
            COALESCE(NULLIF(g.group_code, ''), NULLIF(g.group_name, ''), q.subject_ref_masked, '') AS account_group,
            COALESCE(g.group_name, '') AS account_group_name,
            q.group_id,
            q.requests_per_minute AS rpm,
            q.tokens_per_minute AS tpm,
            q.status,
            q.exhausted_at::text AS exhausted_at,
            q.deleted_at::text AS deleted_at,
            COUNT(*) OVER() AS total
        FROM ai_quota_policy q
        LEFT JOIN ai_upstream_account_group g
          ON q.group_id = g.id
        {predicate}
        "#
    )
}

fn item_from_row(row: sqlx::postgres::PgRow) -> DomainResult<AdminModelRateLimitItem> {
    Ok(AdminModelRateLimitItem {
        id: row.try_get("id").map_err(row_error)?,
        uuid: row.try_get("uuid").map_err(row_error)?,
        tenant_id: row.try_get("tenant_id").map_err(row_error)?,
        organization_id: row.try_get("organization_id").map_err(row_error)?,
        model: row.try_get("model").map_err(row_error)?,
        account_group: row.try_get("account_group").map_err(row_error)?,
        account_group_id: required_integer_cell(&row, "group_id")?,
        account_group_name: row.try_get("account_group_name").map_err(row_error)?,
        rpm: required_integer_cell(&row, "rpm")?,
        tpm: required_integer_cell(&row, "tpm")?,
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
        "inactive"
    } else {
        "active"
    }
    .to_owned()
}

fn policy_metadata(command: &CreateAdminModelRateLimitCommand, group: &GroupIdentity) -> String {
    serde_json::json!({
        "managedBy": "admin_model_rate_limit",
        "policyCode": &command.policy_code,
        "groupId": group.id,
        "accountGroup": group_label(group),
        "model": &command.model,
        "rpm": command.rpm,
        "tpm": command.tpm
    })
    .to_string()
}

fn policy_name(command: &CreateAdminModelRateLimitCommand, group: &GroupIdentity) -> String {
    truncate_chars(
        &format!(
            "Model {} rate limit ({})",
            command.model,
            group_label(group)
        ),
        128,
    )
}

fn group_label(group: &GroupIdentity) -> String {
    if group.code.is_empty() {
        group.name.clone()
    } else {
        group.code.clone()
    }
}

fn subject_ref_masked(command: &CreateAdminModelRateLimitCommand, group: &GroupIdentity) -> String {
    truncate_chars(&format!("{}/{}", group_label(group), command.model), 128)
}

fn model_rate_limit_subject_hash(group_id: i64, model: &str) -> String {
    digest_hex(&format!("{group_id}:{model}"))
}

fn model_rate_limit_subject_id(group_id: i64, model: &str) -> i64 {
    let digest = Sha256::digest(format!("{group_id}:{model}").as_bytes());
    let mut bytes = [0_u8; 8];
    bytes.copy_from_slice(&digest[..8]);
    let value = i64::from_be_bytes(bytes) & i64::MAX;
    if value == 0 {
        1
    } else {
        value
    }
}

fn truncate_chars(value: &str, max_len: usize) -> String {
    value.chars().take(max_len).collect()
}

fn digest_hex(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    hex::encode(hasher.finalize())
}

fn required_integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<i64> {
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
        if database_error
            .code()
            .map(|code| code == "23505")
            .unwrap_or(false)
        {
            return DomainError::conflict(format!("{context}: model rate limit already exists"));
        }
    }
    redacted_store_error(context, error)
}

fn model_rate_limit_routing_config_change<'a>(
    tenant_id: i64,
    organization_id: i64,
    operator_id: i64,
    request_id: &'a str,
    requested_at: &'a str,
    action: &'a str,
    model_rate_limit_id: i64,
    event_payload: serde_json::Value,
) -> AiRoutingConfigChange<'a> {
    AiRoutingConfigChange {
        tenant_id,
        organization_id,
        operator_id,
        request_id,
        requested_at,
        changed_object_type: "model_rate_limit",
        changed_object_id: model_rate_limit_id,
        action,
        event_payload,
    }
}
