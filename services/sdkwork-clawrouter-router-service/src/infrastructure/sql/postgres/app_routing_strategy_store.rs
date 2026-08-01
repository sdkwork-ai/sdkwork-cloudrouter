use sqlx::{PgPool, Postgres, Row, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    AppRoutingMappingRule, AppRoutingStrategyFuture, AppRoutingStrategySnapshot,
    AppRoutingStrategyStore, AppRoutingStrategySubject, AppRoutingStrategyType,
    UpdateAppRoutingStrategyCommand, UpdateAppRoutingStrategyOutcome,
};

const ROUTING_POLICY_CODE: &str = "console-routing-default";

const LOAD_ROUTING_POLICY: &str = r#"
SELECT
    p.id AS policy_id,
    p.fallback_mode AS strategy_code,
    COALESCE(p.default_profile_id, pr.id) AS profile_id
FROM ai_routing_policy p
LEFT JOIN ai_routing_profile pr
  ON pr.policy_id = p.id
 AND pr.tenant_id = p.tenant_id
 AND pr.organization_id = p.organization_id
 AND pr.deleted_at IS NULL
 AND pr.status = 1
WHERE p.tenant_id = $1
  AND p.organization_id = $2
  AND p.policy_code = $3
  AND p.deleted_at IS NULL
  AND p.status = 1
ORDER BY pr.profile_version DESC NULLS LAST, pr.id DESC
LIMIT 1
"#;

const LOAD_ROUTING_MAPPING_RULES: &str = r#"
SELECT
    CAST(id AS TEXT) AS id,
    COALESCE(NULLIF(rule_code, ''), CAST(id AS TEXT)) AS rule_code,
    CAST(match_expression AS TEXT) AS match_expression,
    target_model AS target_model
FROM ai_routing_rule
WHERE tenant_id = $1
  AND organization_id = $2
  AND profile_id = $3
  AND deleted_at IS NULL
  AND status = 1
ORDER BY priority ASC NULLS LAST, id ASC
"#;

const ENSURE_ROUTING_POLICY: &str = r#"
INSERT INTO ai_routing_policy
    (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, metadata, policy_code, name, policy_scope, subject_id, capability, fallback_mode, currency)
VALUES
    ($1, $2, $3, $4, 1, 1, $5::timestamp AT TIME ZONE 'UTC', $5::timestamp AT TIME ZONE 'UTC', 0, '{}'::jsonb, $6, 'Console Routing Strategy', 1, $7, 1, $8, 'USD')
ON CONFLICT(tenant_id, organization_id, policy_code) DO UPDATE SET
    fallback_mode = excluded.fallback_mode,
    subject_id = excluded.subject_id,
    updated_at = excluded.updated_at,
    version = ai_routing_policy.version + 1,
    status = 1,
    deleted_at = NULL,
    deleted_by = NULL
"#;

const LOAD_POLICY_ID: &str = r#"
SELECT id
FROM ai_routing_policy
WHERE tenant_id = $1
  AND organization_id = $2
  AND policy_code = $3
  AND deleted_at IS NULL
LIMIT 1
"#;

const ENSURE_ROUTING_PROFILE: &str = r#"
INSERT INTO ai_routing_profile
    (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, metadata, policy_id, profile_version, profile_name, release_status, traffic_percent, config_hash, published_at, published_by)
VALUES
    ($1, $2, $3, $4, 1, 1, $5::timestamp AT TIME ZONE 'UTC', $5::timestamp AT TIME ZONE 'UTC', 0, '{}'::jsonb, $6, $7, 'Console Routing Strategy', 2, 100, $8, $5::timestamp AT TIME ZONE 'UTC', $9)
"#;

const LOAD_NEXT_PROFILE_VERSION: &str = r#"
SELECT COALESCE(MAX(profile_version), 0) + 1
FROM ai_routing_profile
WHERE tenant_id = $1
  AND organization_id = $2
  AND policy_id = $3
"#;

const LOAD_PROFILE_ID_BY_UUID: &str = r#"
SELECT id
FROM ai_routing_profile
WHERE tenant_id = $1
  AND organization_id = $2
  AND policy_id = $3
  AND uuid = $4
  AND deleted_at IS NULL
LIMIT 1
"#;

const UPDATE_POLICY_DEFAULT_PROFILE: &str = r#"
UPDATE ai_routing_policy
SET default_profile_id = $1,
    updated_at = $2::timestamp AT TIME ZONE 'UTC',
    version = version + 1
WHERE id = $3
"#;

const INSERT_ROUTING_RULE: &str = r#"
INSERT INTO ai_routing_rule
    (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, metadata, profile_id, rule_code, priority, match_expression, target_model)
VALUES
    ($1, $2, $3, $4, 1, 1, $5::timestamp AT TIME ZONE 'UTC', $5::timestamp AT TIME ZONE 'UTC', 0, '{}'::jsonb, $6, $7, $8, $9::jsonb, $10)
"#;

#[derive(Debug, Clone)]
pub struct PostgresAppRoutingStrategyStore {
    pool: PgPool,
}

impl PostgresAppRoutingStrategyStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AppRoutingStrategyStore for PostgresAppRoutingStrategyStore {
    fn load_routing_strategy<'a>(
        &'a self,
        subject: Option<AppRoutingStrategySubject>,
    ) -> AppRoutingStrategyFuture<'a, AppRoutingStrategySnapshot> {
        Box::pin(async move {
            let subject = require_subject(subject)?;
            load_routing_strategy(&self.pool, subject).await
        })
    }

    fn update_routing_strategy<'a>(
        &'a self,
        command: UpdateAppRoutingStrategyCommand,
    ) -> AppRoutingStrategyFuture<'a, UpdateAppRoutingStrategyOutcome> {
        Box::pin(async move { update_routing_strategy(&self.pool, command).await })
    }
}

async fn load_routing_strategy(
    pool: &PgPool,
    subject: AppRoutingStrategySubject,
) -> DomainResult<AppRoutingStrategySnapshot> {
    let Some(policy) = sqlx::query(LOAD_ROUTING_POLICY)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(ROUTING_POLICY_CODE)
        .fetch_optional(pool)
        .await
        .map_err(sql_error)?
    else {
        return Ok(AppRoutingStrategySnapshot::default());
    };
    let profile_id = integer_cell(&policy, "profile_id");
    let strategy = routing_strategy_type(required_integer_cell(&policy, "strategy_code")?)?;
    if profile_id <= 0 {
        return Ok(AppRoutingStrategySnapshot {
            strategy,
            mapping_rules: Vec::new(),
        });
    }
    let rows = sqlx::query(LOAD_ROUTING_MAPPING_RULES)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(profile_id)
        .fetch_all(pool)
        .await
        .map_err(sql_error)?;

    Ok(AppRoutingStrategySnapshot {
        strategy,
        mapping_rules: rows
            .into_iter()
            .map(row_to_mapping_rule)
            .collect::<DomainResult<Vec<_>>>()?,
    })
}

async fn update_routing_strategy(
    pool: &PgPool,
    command: UpdateAppRoutingStrategyCommand,
) -> DomainResult<UpdateAppRoutingStrategyOutcome> {
    if command.rule_uuids.len() != command.snapshot.mapping_rules.len() {
        return Err(DomainError::new(
            "routing strategy rule UUID count does not match mapping rule count",
        ));
    }

    let mut tx = pool
        .begin()
        .await
        .map_err(|error| store_error("failed to begin routing strategy transaction", error))?;
    let policy_id = ensure_policy(&mut tx, &command).await?;
    let profile_id = ensure_profile(&mut tx, policy_id, &command).await?;
    sqlx::query(UPDATE_POLICY_DEFAULT_PROFILE)
        .bind(profile_id)
        .bind(&command.requested_at)
        .bind(policy_id)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("failed to update routing policy default profile", error))?;
    replace_rules(&mut tx, profile_id, &command).await?;
    tx.commit()
        .await
        .map_err(|error| store_error("failed to commit routing strategy transaction", error))?;

    Ok(UpdateAppRoutingStrategyOutcome { success: true })
}

async fn ensure_policy(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdateAppRoutingStrategyCommand,
) -> DomainResult<i64> {
    sqlx::query(ENSURE_ROUTING_POLICY)
        .bind(next_claw_runtime_id("ai_routing_policy")?)
        .bind(&command.policy_uuid)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(&command.requested_at)
        .bind(ROUTING_POLICY_CODE)
        .bind(command.subject.user_id)
        .bind(command.snapshot.strategy.code())
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to upsert routing policy", error))?;

    sqlx::query_scalar::<_, i64>(LOAD_POLICY_ID)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(ROUTING_POLICY_CODE)
        .fetch_one(&mut **tx)
        .await
        .map_err(|error| store_error("failed to load routing policy id", error))
}

async fn ensure_profile(
    tx: &mut Transaction<'_, Postgres>,
    policy_id: i64,
    command: &UpdateAppRoutingStrategyCommand,
) -> DomainResult<i64> {
    let profile_version = next_profile_version(tx, policy_id, command).await?;
    let config_hash = routing_strategy_config_hash(&command.snapshot)?;
    sqlx::query(ENSURE_ROUTING_PROFILE)
        .bind(next_claw_runtime_id("ai_routing_profile")?)
        .bind(&command.profile_uuid)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(&command.requested_at)
        .bind(policy_id)
        .bind(profile_version)
        .bind(config_hash)
        .bind(command.subject.user_id)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to insert routing profile", error))?;

    sqlx::query_scalar::<_, i64>(LOAD_PROFILE_ID_BY_UUID)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(policy_id)
        .bind(&command.profile_uuid)
        .fetch_one(&mut **tx)
        .await
        .map_err(|error| store_error("failed to load routing profile id", error))
}

async fn next_profile_version(
    tx: &mut Transaction<'_, Postgres>,
    policy_id: i64,
    command: &UpdateAppRoutingStrategyCommand,
) -> DomainResult<i64> {
    sqlx::query_scalar::<_, i64>(LOAD_NEXT_PROFILE_VERSION)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(policy_id)
        .fetch_one(&mut **tx)
        .await
        .map_err(|error| store_error("failed to load next routing profile version", error))
}

async fn replace_rules(
    tx: &mut Transaction<'_, Postgres>,
    profile_id: i64,
    command: &UpdateAppRoutingStrategyCommand,
) -> DomainResult<()> {
    for (index, rule) in command.snapshot.mapping_rules.iter().enumerate() {
        sqlx::query(INSERT_ROUTING_RULE)
            .bind(next_claw_runtime_id("ai_routing_rule")?)
            .bind(&command.rule_uuids[index])
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(&command.requested_at)
            .bind(profile_id)
            .bind(rule_code(index, &rule.source_model))
            .bind((index as i64) + 1)
            .bind(match_expression_json(&rule.source_model)?)
            .bind(&rule.target_model)
            .execute(&mut **tx)
            .await
            .map_err(|error| store_error("failed to insert routing rule", error))?;
    }
    Ok(())
}

fn row_to_mapping_rule(row: sqlx::postgres::PgRow) -> DomainResult<AppRoutingMappingRule> {
    let source_model =
        source_model_from_match_expression(&required_string_cell(&row, "match_expression")?)?;
    Ok(AppRoutingMappingRule {
        id: string_cell(&row, "id"),
        source_model,
        target_model: required_non_empty_string_cell(&row, "target_model")?,
    })
}

fn require_subject(
    subject: Option<AppRoutingStrategySubject>,
) -> DomainResult<AppRoutingStrategySubject> {
    subject
        .ok_or_else(|| DomainError::new("trusted request subject is required for routing strategy"))
}

fn routing_strategy_config_hash(snapshot: &AppRoutingStrategySnapshot) -> DomainResult<String> {
    serde_json::to_string(snapshot)
        .map(|payload| format!("{:016x}", seahash(&payload)))
        .map_err(|error| DomainError::new(error.to_string()))
}

fn seahash(value: &str) -> u64 {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in value.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

fn match_expression_json(source_model: &str) -> DomainResult<String> {
    serde_json::to_string(&serde_json::json!({ "sourceModel": source_model }))
        .map_err(|error| DomainError::new(error.to_string()))
}

fn source_model_from_match_expression(raw: &str) -> DomainResult<String> {
    let value = serde_json::from_str::<serde_json::Value>(raw).map_err(|error| {
        DomainError::new(format!(
            "invalid routing strategy match_expression json from database row: {error}"
        ))
    })?;
    value
        .get("sourceModel")
        .or_else(|| value.get("source_model"))
        .and_then(|value| value.as_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .ok_or_else(|| DomainError::new("missing routing strategy sourceModel from database row"))
}

fn rule_code(index: usize, source_model: &str) -> String {
    let sequence = index + 1;
    let normalized = source_model
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
    if normalized.is_empty() {
        format!("model-map-{sequence:04}")
    } else {
        format!("model-map-{sequence:04}-{normalized}")
    }
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> String {
    optional_string_cell(row, column).unwrap_or_default()
}

fn required_string_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<String> {
    optional_string_cell(row, column)
        .ok_or_else(|| missing_routing_strategy_string_cell_error(column))
}

fn required_non_empty_string_cell(
    row: &sqlx::postgres::PgRow,
    column: &str,
) -> DomainResult<String> {
    required_string_cell(row, column).and_then(|value| {
        let value = value.trim().to_owned();
        if value.is_empty() {
            Err(missing_routing_strategy_string_cell_error(column))
        } else {
            Ok(value)
        }
    })
}

fn missing_routing_strategy_string_cell_error(column: &str) -> DomainError {
    match column {
        "match_expression" => {
            DomainError::new("missing routing strategy match_expression from database row")
        }
        "target_model" => {
            DomainError::new("missing routing strategy target_model from database row")
        }
        value => DomainError::new(format!(
            "missing routing strategy {value} from database row"
        )),
    }
}

fn optional_string_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<String> {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .or_else(|| row.try_get::<String, _>(column).ok())
        .or_else(|| {
            row.try_get::<Option<i64>, _>(column)
                .ok()
                .flatten()
                .map(|value| value.to_string())
        })
        .or_else(|| {
            row.try_get::<i64, _>(column)
                .ok()
                .map(|value| value.to_string())
        })
}

fn integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> i64 {
    optional_integer_cell(row, column).unwrap_or(0)
}

fn required_integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<i64> {
    optional_integer_cell(row, column).ok_or_else(|| {
        DomainError::new(format!(
            "missing routing strategy {column} from database row"
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

fn routing_strategy_type(value: i64) -> DomainResult<AppRoutingStrategyType> {
    match value {
        1 => Ok(AppRoutingStrategyType::Latency),
        2 => Ok(AppRoutingStrategyType::Weighted),
        3 => Ok(AppRoutingStrategyType::Cost),
        value => Err(DomainError::new(format!(
            "invalid routing strategy code from database row: {value}"
        ))),
    }
}

fn sql_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strategy_queries_scope_to_tenant_and_organization() {
        for query in [
            LOAD_ROUTING_POLICY,
            LOAD_ROUTING_MAPPING_RULES,
            LOAD_POLICY_ID,
            LOAD_NEXT_PROFILE_VERSION,
            LOAD_PROFILE_ID_BY_UUID,
        ] {
            assert!(query.contains("tenant_id"));
            assert!(query.contains("organization_id"));
        }
    }
}
