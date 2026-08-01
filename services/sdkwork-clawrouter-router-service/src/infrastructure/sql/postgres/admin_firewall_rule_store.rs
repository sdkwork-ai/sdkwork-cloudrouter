use sha2::{Digest, Sha256};
use sqlx::{PgPool, Postgres, Row, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::routing_config_change::{
    record_postgres_ai_routing_config_change, AiRoutingConfigChange,
};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    AdminFirewallRuleCommandFuture, AdminFirewallRuleItem, AdminFirewallRuleListPage,
    AdminFirewallRuleStore, CreateAdminFirewallRuleCommand, DeleteAdminFirewallRuleCommand,
    ListAdminFirewallRulesQuery,
};

const FIREWALL_AUDIT_TARGET_TYPE: i32 = 43;
const CONFIG_SCOPE_ROUTER: i32 = 10;
const CONFIG_TYPE_FIREWALL_RULE: i32 = FIREWALL_AUDIT_TARGET_TYPE;
const FIREWALL_RULE_CATEGORY: i32 = 20;
const GLOBAL_SCOPE_TYPE: i32 = 1;
const RULE_TYPE_DENY: i32 = 21;
const RULE_TYPE_ALLOW: i32 = 22;
const TARGET_TYPE_IP: i32 = 1;
const TARGET_TYPE_EMAIL: i32 = 2;
const TARGET_TYPE_DOMAIN: i32 = 3;
const ACTION_DENY: i32 = 20;
const ACTION_ALLOW: i32 = 21;
const ALLOW_PRIORITY: i32 = 10;
const DENY_PRIORITY: i32 = 100;

struct FirewallRuleMutationLog<'a> {
    config_snapshot_uuid: &'a str,
    audit_log_uuid: &'a str,
    request_id: &'a str,
    tenant_id: i64,
    organization_id: i64,
    operator_id: i64,
    operator_type: i32,
    action: &'a str,
    target_id: i64,
    requested_at: &'a str,
}

#[derive(Debug, Clone)]
pub struct PostgresAdminFirewallRuleStore {
    pool: PgPool,
}

impl PostgresAdminFirewallRuleStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminFirewallRuleStore for PostgresAdminFirewallRuleStore {
    fn list_firewall_rules<'a>(
        &'a self,
        query: ListAdminFirewallRulesQuery,
    ) -> AdminFirewallRuleCommandFuture<'a, AdminFirewallRuleListPage> {
        Box::pin(async move { list_firewall_rules(&self.pool, query).await })
    }

    fn create_firewall_rule<'a>(
        &'a self,
        command: CreateAdminFirewallRuleCommand,
    ) -> AdminFirewallRuleCommandFuture<'a, AdminFirewallRuleItem> {
        Box::pin(async move {
            let mut tx =
                self.pool.begin().await.map_err(|error| {
                    store_error("failed to begin firewall rule transaction", error)
                })?;
            let id = upsert_firewall_rule(&mut tx, &command).await?;
            let mutation_log = FirewallRuleMutationLog {
                config_snapshot_uuid: &command.config_snapshot_uuid,
                audit_log_uuid: &command.audit_log_uuid,
                request_id: &command.request_id,
                tenant_id: command.subject.tenant_id,
                organization_id: command.subject.organization_id,
                operator_id: command.subject.operator_id,
                operator_type: command.subject.operator_type,
                action: "create_firewall_rule",
                target_id: id,
                requested_at: &command.requested_at,
            };
            insert_config_snapshot(
                &mut tx,
                &mutation_log,
                serde_json::json!({
                    "action": "create_firewall_rule",
                    "firewallRuleId": id,
                    "type": &command.firewall_type,
                    "targetType": command.target_type_code,
                    "matchMode": command.match_mode_code,
                    "ruleAction": command.action_code,
                    "value": &command.value,
                    "reason": &command.reason
                }),
            )
            .await?;
            insert_audit_log(
                &mut tx,
                &mutation_log,
                serde_json::json!({
                    "action": "create_firewall_rule",
                    "firewallRuleId": id,
                    "type": &command.firewall_type,
                    "value": &command.value,
                    "reason": &command.reason
                }),
            )
            .await?;
            record_postgres_ai_routing_config_change(
                &mut tx,
                AiRoutingConfigChange {
                    tenant_id: mutation_log.tenant_id,
                    organization_id: mutation_log.organization_id,
                    operator_id: mutation_log.operator_id,
                    request_id: mutation_log.request_id,
                    requested_at: mutation_log.requested_at,
                    changed_object_type: "firewall_rule",
                    changed_object_id: mutation_log.target_id,
                    action: mutation_log.action,
                    event_payload: serde_json::json!({
                        "firewallRuleId": id,
                        "type": &command.firewall_type,
                        "value": &command.value
                    }),
                },
            )
            .await?;
            let item = load_firewall_rule_by_id(
                &mut tx,
                id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            .ok_or_else(|| DomainError::new("created firewall rule could not be reloaded"))?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit firewall rule transaction", error)
            })?;
            Ok(item)
        })
    }

    fn delete_firewall_rule<'a>(
        &'a self,
        command: DeleteAdminFirewallRuleCommand,
    ) -> AdminFirewallRuleCommandFuture<'a, bool> {
        Box::pin(async move {
            let mut tx =
                self.pool.begin().await.map_err(|error| {
                    store_error("failed to begin firewall rule transaction", error)
                })?;
            let deleted = soft_delete_firewall_rule(&mut tx, &command).await?;
            if deleted {
                let mutation_log = FirewallRuleMutationLog {
                    config_snapshot_uuid: &command.config_snapshot_uuid,
                    audit_log_uuid: &command.audit_log_uuid,
                    request_id: &command.request_id,
                    tenant_id: command.subject.tenant_id,
                    organization_id: command.subject.organization_id,
                    operator_id: command.subject.operator_id,
                    operator_type: command.subject.operator_type,
                    action: "delete_firewall_rule",
                    target_id: command.rule_id,
                    requested_at: &command.requested_at,
                };
                insert_config_snapshot(
                    &mut tx,
                    &mutation_log,
                    serde_json::json!({
                        "action": "delete_firewall_rule",
                        "firewallRuleId": command.rule_id,
                        "deleted": true
                    }),
                )
                .await?;
                insert_audit_log(
                    &mut tx,
                    &mutation_log,
                    serde_json::json!({
                        "action": "delete_firewall_rule",
                        "firewallRuleId": command.rule_id
                    }),
                )
                .await?;
                record_postgres_ai_routing_config_change(
                    &mut tx,
                    AiRoutingConfigChange {
                        tenant_id: mutation_log.tenant_id,
                        organization_id: mutation_log.organization_id,
                        operator_id: mutation_log.operator_id,
                        request_id: mutation_log.request_id,
                        requested_at: mutation_log.requested_at,
                        changed_object_type: "firewall_rule",
                        changed_object_id: mutation_log.target_id,
                        action: mutation_log.action,
                        event_payload: serde_json::json!({
                            "firewallRuleId": command.rule_id,
                            "deleted": true
                        }),
                    },
                )
                .await?;
            }
            tx.commit().await.map_err(|error| {
                store_error("failed to commit firewall rule transaction", error)
            })?;
            Ok(deleted)
        })
    }
}

async fn list_firewall_rules(
    pool: &PgPool,
    query: ListAdminFirewallRulesQuery,
) -> DomainResult<AdminFirewallRuleListPage> {
    let search = query
        .q
        .as_ref()
        .map(|value| format!("%{}%", value.to_lowercase()));
    let sql = firewall_rule_select_sql(
        r#"
        WHERE tenant_id = $1
          AND organization_id = $2
          AND rule_category = $3
          AND deleted_at IS NULL
          AND (
              $4 IS NULL
              OR LOWER(COALESCE(target_value, '')) LIKE $4
              OR LOWER(COALESCE(reason, '')) LIKE $4
          )
        ORDER BY priority ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT $5 OFFSET $6
        "#,
    );
    let rows = sqlx::query(&sql)
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id)
        .bind(FIREWALL_RULE_CATEGORY)
        .bind(search.as_deref())
        .bind(query.page_size)
        .bind(query.offset)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to list firewall rules", error))?;

    let total = rows
        .first()
        .and_then(|row| row.try_get::<i64, _>("total").ok())
        .unwrap_or(0);
    let items = rows
        .into_iter()
        .map(item_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminFirewallRuleListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn upsert_firewall_rule(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminFirewallRuleCommand,
) -> DomainResult<i64> {
    if let Some(id) = find_existing_firewall_rule(tx, command).await? {
        update_firewall_rule(tx, id, command).await?;
        return Ok(id);
    }
    insert_firewall_rule(tx, command).await
}

async fn find_existing_firewall_rule(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminFirewallRuleCommand,
) -> DomainResult<Option<i64>> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM iam_gateway_risk_rule
        WHERE tenant_id = $1
          AND organization_id = $2
          AND rule_category = $3
          AND rule_type = $4
          AND target_type = $5
          AND target_value_hash = $6
          AND target_value = $7
        ORDER BY (deleted_at IS NULL) DESC, updated_at DESC NULLS LAST, id DESC
        LIMIT 1
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(FIREWALL_RULE_CATEGORY)
    .bind(command.rule_type_code)
    .bind(command.target_type_code)
    .bind(&command.value_hash)
    .bind(&command.value)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to find firewall rule", error))
}

async fn insert_firewall_rule(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminFirewallRuleCommand,
) -> DomainResult<i64> {
    let metadata = firewall_rule_metadata(command);
    let id = next_claw_runtime_id("iam_gateway_risk_rule")?;
    sqlx::query(
        r#"
        INSERT INTO iam_gateway_risk_rule
            (uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, metadata, rule_name, rule_category, rule_type, scope_type, scope_id, target_type, target_value, target_value_hash, target_value_masked, match_mode, reason, action, priority, effective_from, hit_count, id)
        VALUES
            ($1, $2, $3, 1, 1, $4::timestamptz, $5::timestamptz, 0, $6::jsonb, $7, $8, $9, $10, 0, $11, $12, $13, $14, $15, $16, $17, $18, $19::timestamptz, 0, $20)
        "#,
    )
    .bind(&command.rule_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .bind(metadata)
    .bind(rule_name(command))
    .bind(FIREWALL_RULE_CATEGORY)
    .bind(command.rule_type_code)
    .bind(GLOBAL_SCOPE_TYPE)
    .bind(command.target_type_code)
    .bind(&command.value)
    .bind(&command.value_hash)
    .bind(&command.value_masked)
    .bind(command.match_mode_code)
    .bind(&command.reason)
    .bind(command.action_code)
    .bind(priority_for_action(command.action_code))
    .bind(&command.requested_at)
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create firewall rule", error))?;
    Ok(id)
}

async fn update_firewall_rule(
    tx: &mut Transaction<'_, Postgres>,
    id: i64,
    command: &CreateAdminFirewallRuleCommand,
) -> DomainResult<i64> {
    let metadata = firewall_rule_metadata(command);
    sqlx::query(
        r#"
        UPDATE iam_gateway_risk_rule
        SET uuid = $1,
            status = 1,
            updated_at = $2::timestamptz,
            deleted_at = NULL,
            deleted_by = NULL,
            metadata = $3::jsonb,
            rule_name = $4,
            rule_category = $5,
            rule_type = $6,
            scope_type = $7,
            scope_id = 0,
            target_type = $8,
            target_value = $9,
            target_value_hash = $10,
            target_value_masked = $11,
            match_mode = $12,
            reason = $13,
            action = $14,
            priority = $15,
            effective_from = $16::timestamptz,
            effective_to = NULL
        WHERE id = $17
          AND tenant_id = $18
          AND organization_id = $19
        "#,
    )
    .bind(&command.rule_uuid)
    .bind(&command.requested_at)
    .bind(metadata)
    .bind(rule_name(command))
    .bind(FIREWALL_RULE_CATEGORY)
    .bind(command.rule_type_code)
    .bind(GLOBAL_SCOPE_TYPE)
    .bind(command.target_type_code)
    .bind(&command.value)
    .bind(&command.value_hash)
    .bind(&command.value_masked)
    .bind(command.match_mode_code)
    .bind(&command.reason)
    .bind(command.action_code)
    .bind(priority_for_action(command.action_code))
    .bind(&command.requested_at)
    .bind(id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update firewall rule", error))?;
    Ok(id)
}

async fn soft_delete_firewall_rule(
    tx: &mut Transaction<'_, Postgres>,
    command: &DeleteAdminFirewallRuleCommand,
) -> DomainResult<bool> {
    let result = sqlx::query(
        r#"
        UPDATE iam_gateway_risk_rule
        SET status = 0,
            deleted_at = $1::timestamptz,
            deleted_by = $2,
            updated_at = $3::timestamptz
        WHERE id = $4
          AND tenant_id = $5
          AND organization_id = $6
          AND rule_category = $7
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.requested_at)
    .bind(command.subject.operator_id)
    .bind(&command.requested_at)
    .bind(command.rule_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(FIREWALL_RULE_CATEGORY)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to delete firewall rule", error))?;
    Ok(result.rows_affected() > 0)
}

async fn load_firewall_rule_by_id(
    tx: &mut Transaction<'_, Postgres>,
    id: i64,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<Option<AdminFirewallRuleItem>> {
    let sql = firewall_rule_select_sql(
        r#"
        WHERE id = $1
          AND tenant_id = $2
          AND organization_id = $3
          AND rule_category = $4
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    );
    let row = sqlx::query(&sql)
        .bind(id)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(FIREWALL_RULE_CATEGORY)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|error| store_error("failed to load firewall rule", error))?;

    row.map(item_from_row).transpose()
}

async fn insert_config_snapshot(
    tx: &mut Transaction<'_, Postgres>,
    mutation: &FirewallRuleMutationLog<'_>,
    payload: serde_json::Value,
) -> DomainResult<()> {
    let payload = payload.to_string();
    let snapshot_no = format!(
        "firewall-rule-{}-{}-{}",
        mutation.target_id, mutation.action, mutation.config_snapshot_uuid
    );
    let id = next_claw_runtime_id("ops_config_snapshot")?;
    sqlx::query(
        r#"
        INSERT INTO ops_config_snapshot
            (uuid, tenant_id, organization_id, user_id, request_id, status, snapshot_no, config_scope, config_type, source_table, source_ids, config_payload, config_hash, published_at, published_by, id)
        VALUES
            ($1, $2, $3, $4, $5, 1, $6, $7, $8, 'iam_gateway_risk_rule', $9::jsonb, $10::jsonb, $11, $12::timestamptz, $13, $14)
        "#,
    )
    .bind(mutation.config_snapshot_uuid)
    .bind(mutation.tenant_id)
    .bind(mutation.organization_id)
    .bind(mutation.operator_id)
    .bind(mutation.request_id)
    .bind(snapshot_no)
    .bind(CONFIG_SCOPE_ROUTER)
    .bind(CONFIG_TYPE_FIREWALL_RULE)
    .bind(serde_json::json!([mutation.target_id]).to_string())
    .bind(&payload)
    .bind(digest_hex(&payload))
    .bind(mutation.requested_at)
    .bind(mutation.operator_id)
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write firewall rule config snapshot", error))?;
    Ok(())
}

async fn insert_audit_log(
    tx: &mut Transaction<'_, Postgres>,
    mutation: &FirewallRuleMutationLog<'_>,
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
    .bind(mutation.audit_log_uuid)
    .bind(mutation.tenant_id)
    .bind(mutation.organization_id)
    .bind(mutation.action)
    .bind(FIREWALL_AUDIT_TARGET_TYPE)
    .bind(mutation.target_id)
    .bind(mutation.request_id)
    .bind(mutation.operator_id)
    .bind(mutation.operator_type)
    .bind(change_summary.to_string())
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write firewall rule audit log", error))?;
    Ok(())
}

fn firewall_rule_select_sql(predicate: &str) -> String {
    format!(
        r#"
        SELECT
            id,
            uuid,
            tenant_id,
            organization_id,
            rule_type,
            target_type,
            action,
            COALESCE(target_value, '') AS value,
            COALESCE(reason, '') AS reason,
            created_at::text AS time,
            deleted_at::text AS deleted_at,
            COUNT(*) OVER() AS total
        FROM iam_gateway_risk_rule
        {predicate}
        "#
    )
}

fn item_from_row(row: sqlx::postgres::PgRow) -> DomainResult<AdminFirewallRuleItem> {
    let rule_type = required_integer_cell(&row, "rule_type")? as i32;
    let target_type = required_integer_cell(&row, "target_type")? as i32;
    let action = required_integer_cell(&row, "action")? as i32;
    Ok(AdminFirewallRuleItem {
        id: row.try_get("id").map_err(row_error)?,
        uuid: row.try_get("uuid").map_err(row_error)?,
        tenant_id: row.try_get("tenant_id").map_err(row_error)?,
        organization_id: row.try_get("organization_id").map_err(row_error)?,
        firewall_type: firewall_type_label(rule_type, target_type, action)?,
        value: row.try_get("value").map_err(row_error)?,
        reason: row.try_get("reason").map_err(row_error)?,
        time: row.try_get("time").map_err(row_error)?,
        deleted_at: row.try_get("deleted_at").ok().flatten(),
    })
}

fn firewall_type_label(rule_type: i32, target_type: i32, action: i32) -> DomainResult<String> {
    let target = match target_type {
        TARGET_TYPE_IP => "IP",
        TARGET_TYPE_EMAIL | TARGET_TYPE_DOMAIN => "Email",
        value => {
            return Err(DomainError::new(format!(
                "invalid firewall target type from database row: {value}"
            )));
        }
    };
    let list_by_rule_type = match rule_type {
        RULE_TYPE_ALLOW => "whitelist",
        RULE_TYPE_DENY => "blacklist",
        value => {
            return Err(DomainError::new(format!(
                "invalid firewall rule type from database row: {value}"
            )));
        }
    };
    let list_by_action = match action {
        ACTION_ALLOW => "whitelist",
        ACTION_DENY => "blacklist",
        value => {
            return Err(DomainError::new(format!(
                "invalid firewall action from database row: {value}"
            )));
        }
    };
    if list_by_rule_type != list_by_action {
        return Err(DomainError::new(format!(
            "inconsistent firewall rule type/action from database row: rule_type={rule_type}, action={action}"
        )));
    }
    Ok(format!("{target} {list_by_action}"))
}

fn firewall_rule_metadata(command: &CreateAdminFirewallRuleCommand) -> String {
    serde_json::json!({
        "ruleCode": &command.rule_code,
        "managedBy": "admin_firewall_rule",
        "type": &command.firewall_type,
        "targetType": command.target_type_code,
        "matchMode": command.match_mode_code,
        "ruleAction": command.action_code
    })
    .to_string()
}

fn rule_name(command: &CreateAdminFirewallRuleCommand) -> String {
    truncate_chars(
        &format!("{} {}", command.firewall_type, command.value_masked),
        128,
    )
}

fn truncate_chars(value: &str, max_len: usize) -> String {
    value.chars().take(max_len).collect()
}

fn priority_for_action(action: i32) -> i32 {
    if action == ACTION_ALLOW {
        ALLOW_PRIORITY
    } else {
        DENY_PRIORITY
    }
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
        .ok_or_else(|| {
            DomainError::new(format!("missing firewall rule {column} from database row"))
        })
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
            return DomainError::conflict(format!("{context}: firewall rule already exists"));
        }
    }
    redacted_store_error(context, error)
}
