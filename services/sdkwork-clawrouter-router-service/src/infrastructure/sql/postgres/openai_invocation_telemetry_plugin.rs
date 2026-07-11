use std::time::{SystemTime, UNIX_EPOCH};

use sqlx::PgPool;

use crate::api::{
    OpenAiInvocationContext, OpenAiInvocationFault, OpenAiInvocationFaultKind,
    OpenAiInvocationPlugin, OpenAiInvocationPluginFuture, OpenAiInvocationRelayOutcome,
    OpenAiProviderRoute,
};
use crate::domain::{DomainError, DomainResult, ProviderCircuitBreakerPolicy};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;

const HEALTHY: i64 = 1;
const UNHEALTHY: i64 = 2;
const CHECK_TYPE_RUNTIME_INVOCATION: i64 = 2;

#[derive(Debug, Clone)]
pub struct PostgresOpenAiInvocationTelemetryPlugin {
    pool: PgPool,
}

impl PostgresOpenAiInvocationTelemetryPlugin {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl OpenAiInvocationPlugin for PostgresOpenAiInvocationTelemetryPlugin {
    fn on_route_fault<'a>(
        &'a self,
        context: &'a OpenAiInvocationContext,
        route: &'a OpenAiProviderRoute,
        fault: &'a OpenAiInvocationFault,
    ) -> OpenAiInvocationPluginFuture<'a> {
        Box::pin(async move {
            if let Err(error) = record_fault(&self.pool, context, route, fault).await {
                tracing::warn!(
                    error = %error,
                    provider_code = route.provider_code,
                    channel_id = route.channel_id,
                    "failed to record postgres OpenAI invocation fault telemetry"
                );
            }
            Ok(())
        })
    }

    fn on_route_success<'a>(
        &'a self,
        context: &'a OpenAiInvocationContext,
        route: &'a OpenAiProviderRoute,
        outcome: &'a OpenAiInvocationRelayOutcome,
    ) -> OpenAiInvocationPluginFuture<'a> {
        Box::pin(async move {
            if let Err(error) = record_success(&self.pool, context, route, outcome).await {
                tracing::warn!(
                    error = %error,
                    provider_code = route.provider_code,
                    channel_id = route.channel_id,
                    status_code = outcome.status_code,
                    "failed to record postgres OpenAI invocation success telemetry"
                );
            }
            Ok(())
        })
    }
}

async fn record_fault(
    pool: &PgPool,
    context: &OpenAiInvocationContext,
    route: &OpenAiProviderRoute,
    fault: &OpenAiInvocationFault,
) -> DomainResult<()> {
    let health_status = match fault.kind {
        OpenAiInvocationFaultKind::UsageRecording => HEALTHY,
        OpenAiInvocationFaultKind::RelayHttpStatus if !fault.is_retryable() => HEALTHY,
        _ => {
            let outcome = record_channel_fault(pool, context, route, fault.latency_ms).await?;
            outcome.health_status
        }
    };
    insert_snapshot(
        pool,
        context,
        route,
        health_status,
        fault.latency_ms,
        fault.health_http_status(),
        Some(fault.error_code.as_str()),
        Some(masked_message(fault.message.as_str()).as_str()),
    )
    .await
}

async fn record_success(
    pool: &PgPool,
    context: &OpenAiInvocationContext,
    route: &OpenAiProviderRoute,
    outcome: &OpenAiInvocationRelayOutcome,
) -> DomainResult<()> {
    record_channel_success(pool, context, route, outcome.latency_ms).await?;
    insert_snapshot(
        pool,
        context,
        route,
        HEALTHY,
        outcome.latency_ms,
        Some(i32::from(outcome.status_code)),
        None,
        None,
    )
    .await
}

struct ChannelFaultOutcome {
    health_status: i64,
}

async fn record_channel_fault(
    pool: &PgPool,
    context: &OpenAiInvocationContext,
    route: &OpenAiProviderRoute,
    latency_ms: Option<i64>,
) -> DomainResult<ChannelFaultOutcome> {
    let state = load_channel_fault_state(pool, context, route).await?;
    let row = sqlx::query(
        r#"
        UPDATE ai_channel
        SET updated_at = CURRENT_TIMESTAMP,
            last_latency_ms = COALESCE($1, last_latency_ms),
            consecutive_error_count = COALESCE(consecutive_error_count, 0) + 1,
            health_status = CASE
                WHEN COALESCE(consecutive_error_count, 0) + 1 >= $2 THEN $3
                ELSE $4
            END,
            version = COALESCE(version, 0) + 1
        WHERE id = $5
          AND tenant_id = $6
          AND organization_id = $7
          AND deleted_at IS NULL
        RETURNING health_status
        "#,
    )
    .bind(latency_ms)
    .bind(i64::try_from(state.failure_threshold).map_err(|_| {
        DomainError::new("invalid OpenAI invocation circuit breaker failure threshold")
    })?)
    .bind(UNHEALTHY)
    .bind(HEALTHY)
    .bind(route.channel_id)
    .bind(context.api_key_context.tenant_id)
    .bind(context.api_key_context.organization_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| {
        store_error(
            "failed to update OpenAI invocation channel telemetry",
            error,
        )
    })?
    .ok_or_else(|| DomainError::new("OpenAI invocation channel was not found"))?;
    let health_status = sqlx::Row::try_get::<i64, _>(&row, "health_status")
        .map_err(|error| DomainError::new(format!("invalid channel health status: {error}")))?;
    Ok(ChannelFaultOutcome { health_status })
}

async fn record_channel_success(
    pool: &PgPool,
    context: &OpenAiInvocationContext,
    route: &OpenAiProviderRoute,
    latency_ms: Option<i64>,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE ai_channel
        SET updated_at = CURRENT_TIMESTAMP,
            health_status = $1,
            last_latency_ms = COALESCE($2, last_latency_ms),
            consecutive_error_count = 0,
            version = COALESCE(version, 0) + 1
        WHERE id = $3
          AND tenant_id = $4
          AND organization_id = $5
          AND deleted_at IS NULL
        "#,
    )
    .bind(HEALTHY)
    .bind(latency_ms)
    .bind(route.channel_id)
    .bind(context.api_key_context.tenant_id)
    .bind(context.api_key_context.organization_id)
    .execute(pool)
    .await
    .map_err(|error| {
        store_error(
            "failed to update OpenAI invocation channel telemetry",
            error,
        )
    })?;
    Ok(())
}

struct ChannelFaultState {
    failure_threshold: usize,
}

async fn load_channel_fault_state(
    pool: &PgPool,
    context: &OpenAiInvocationContext,
    route: &OpenAiProviderRoute,
) -> DomainResult<ChannelFaultState> {
    let row = sqlx::query(
        r#"
        SELECT
            circuit_breaker_policy::text AS circuit_breaker_policy_json
        FROM ai_channel
        WHERE id = $1
          AND tenant_id = $2
          AND organization_id = $3
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(route.channel_id)
    .bind(context.api_key_context.tenant_id)
    .bind(context.api_key_context.organization_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| {
        store_error(
            "failed to load OpenAI invocation channel circuit breaker policy",
            error,
        )
    })?
    .ok_or_else(|| DomainError::new("OpenAI invocation channel was not found"))?;
    let circuit_breaker_policy_json =
        sqlx::Row::try_get::<Option<String>, _>(&row, "circuit_breaker_policy_json")
            .ok()
            .flatten();
    let failure_threshold =
        parse_channel_failure_threshold(circuit_breaker_policy_json.as_deref(), route.channel_id);
    Ok(ChannelFaultState { failure_threshold })
}

fn parse_channel_failure_threshold(value: Option<&str>, channel_id: i64) -> usize {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return ProviderCircuitBreakerPolicy::default().failure_threshold;
    };
    match ProviderCircuitBreakerPolicy::from_json_str(value) {
        Ok(policy) => policy.failure_threshold,
        Err(error) => {
            tracing::warn!(
                error = %error,
                channel_id,
                "invalid postgres OpenAI invocation circuit breaker policy; using default failure threshold"
            );
            ProviderCircuitBreakerPolicy::default().failure_threshold
        }
    }
}

#[allow(clippy::too_many_arguments)]
async fn insert_snapshot(
    pool: &PgPool,
    context: &OpenAiInvocationContext,
    route: &OpenAiProviderRoute,
    health_status: i64,
    latency_ms: Option<i64>,
    http_status: Option<i32>,
    error_code: Option<&str>,
    error_message: Option<&str>,
) -> DomainResult<()> {
    let metadata = serde_json::json!({
        "source": "openai_runtime_invocation",
        "endpoint": format!("{:?}", context.endpoint),
        "providerModel": route.provider_model,
        "catalogKey": route.catalog_key,
        "policyId": route.policy_id,
        "ruleId": route.rule_id,
        "streaming": context.stream
    })
    .to_string();
    sqlx::query(
        r#"
        INSERT INTO integration_provider_health_snapshot
            (id, uuid, tenant_id, organization_id, user_id, request_id, trace_id, status, created_at, metadata, provider_id, channel_id, provider_account_id, check_type, health_status, latency_ms, http_status, error_code, error_message_masked, checked_at)
        SELECT
            $1, $2, c.tenant_id, c.organization_id, $3, $4, $5, 1, CURRENT_TIMESTAMP, $6::jsonb, c.provider_id, c.id, c.id, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP
        FROM ai_channel c
        WHERE c.id = $13
          AND c.tenant_id = $14
          AND c.organization_id = $15
          AND c.deleted_at IS NULL
        "#,
    )
    .bind(next_claw_runtime_id("integration_provider_health_snapshot")?)
    .bind(snapshot_uuid(context, route, health_status))
    .bind(context.api_key_context.user_id)
    .bind(request_id(context))
    .bind(context.trace_id.as_deref())
    .bind(metadata)
    .bind(CHECK_TYPE_RUNTIME_INVOCATION)
    .bind(health_status)
    .bind(latency_ms)
    .bind(http_status)
    .bind(error_code)
    .bind(error_message)
    .bind(route.channel_id)
    .bind(context.api_key_context.tenant_id)
    .bind(context.api_key_context.organization_id)
    .execute(pool)
    .await
    .map_err(|error| store_error("failed to insert OpenAI invocation health snapshot", error))?;
    Ok(())
}

fn request_id(context: &OpenAiInvocationContext) -> String {
    context.request_id.clone()
}

fn snapshot_uuid(
    context: &OpenAiInvocationContext,
    route: &OpenAiProviderRoute,
    health_status: i64,
) -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    format!(
        "openai-runtime-{}-{}-{}-{nanos}",
        request_id(context),
        route.channel_id,
        health_status
    )
}

fn masked_message(message: &str) -> String {
    let trimmed = message.trim();
    if trimmed.chars().count() <= 512 {
        trimmed.to_owned()
    } else {
        trimmed.chars().take(512).collect()
    }
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
