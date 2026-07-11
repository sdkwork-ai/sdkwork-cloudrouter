use sqlx::SqlitePool;

use crate::api::{
    OpenAiInvocationContext, OpenAiInvocationFault, OpenAiInvocationFaultKind,
    OpenAiInvocationPlugin, OpenAiInvocationPluginFuture, OpenAiInvocationRelayOutcome,
    OpenAiProviderRoute,
};
use crate::domain::{DomainError, DomainResult, ProviderCircuitBreakerPolicy};
use crate::infrastructure::sql::store_error::redacted_store_error;

const HEALTHY: i64 = 1;
const UNHEALTHY: i64 = 2;

#[derive(Debug, Clone)]
pub struct SqliteOpenAiInvocationTelemetryPlugin {
    pool: SqlitePool,
}

impl SqliteOpenAiInvocationTelemetryPlugin {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl OpenAiInvocationPlugin for SqliteOpenAiInvocationTelemetryPlugin {
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
                    "failed to record sqlite OpenAI invocation fault telemetry"
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
                    "failed to record sqlite OpenAI invocation success telemetry"
                );
            }
            Ok(())
        })
    }
}

async fn record_fault(
    pool: &SqlitePool,
    context: &OpenAiInvocationContext,
    route: &OpenAiProviderRoute,
    fault: &OpenAiInvocationFault,
) -> DomainResult<()> {
    match fault.kind {
        OpenAiInvocationFaultKind::UsageRecording => Ok(()),
        OpenAiInvocationFaultKind::RelayHttpStatus if !fault.is_retryable() => Ok(()),
        _ => record_channel_fault(pool, context, route, fault.latency_ms).await,
    }
}

async fn record_success(
    pool: &SqlitePool,
    context: &OpenAiInvocationContext,
    route: &OpenAiProviderRoute,
    outcome: &OpenAiInvocationRelayOutcome,
) -> DomainResult<()> {
    record_channel_success(pool, context, route, outcome.latency_ms).await
}

async fn record_channel_fault(
    pool: &SqlitePool,
    context: &OpenAiInvocationContext,
    route: &OpenAiProviderRoute,
    latency_ms: Option<i64>,
) -> DomainResult<()> {
    let state = load_channel_fault_state(pool, context, route).await?;
    let result = sqlx::query(
        r#"
        UPDATE ai_channel
        SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
            last_latency_ms = COALESCE(?, last_latency_ms),
            consecutive_error_count = COALESCE(consecutive_error_count, 0) + 1,
            health_status = CASE
                WHEN COALESCE(consecutive_error_count, 0) + 1 >= ? THEN ?
                ELSE ?
            END,
            version = COALESCE(version, 0) + 1
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND deleted_at IS NULL
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
    .execute(pool)
    .await
    .map_err(|error| {
        store_error(
            "failed to update OpenAI invocation channel telemetry",
            error,
        )
    })?;
    if result.rows_affected() == 0 {
        return Err(DomainError::new("OpenAI invocation channel was not found"));
    }
    Ok(())
}

async fn record_channel_success(
    pool: &SqlitePool,
    context: &OpenAiInvocationContext,
    route: &OpenAiProviderRoute,
    latency_ms: Option<i64>,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE ai_channel
        SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
            health_status = ?,
            last_latency_ms = COALESCE(?, last_latency_ms),
            consecutive_error_count = 0,
            version = COALESCE(version, 0) + 1
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
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
    pool: &SqlitePool,
    context: &OpenAiInvocationContext,
    route: &OpenAiProviderRoute,
) -> DomainResult<ChannelFaultState> {
    let row = sqlx::query(
        r#"
        SELECT
            circuit_breaker_policy AS circuit_breaker_policy_json
        FROM ai_channel
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
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
                "invalid sqlite OpenAI invocation circuit breaker policy; using default failure threshold"
            );
            ProviderCircuitBreakerPolicy::default().failure_threshold
        }
    }
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
