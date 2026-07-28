use sqlx::PgPool;

use crate::api::{
    OpenAiInvocationContext, OpenAiInvocationFault, OpenAiInvocationFaultKind,
    OpenAiInvocationPlugin, OpenAiInvocationPluginFuture, OpenAiInvocationRelayOutcome,
    OpenAiUpstreamRoute,
};
use crate::domain::{DomainError, DomainResult, ProviderCircuitBreakerPolicy};
use crate::infrastructure::sql::store_error::redacted_store_error;

const HEALTHY: i64 = 1;
const UNHEALTHY: i64 = 2;

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
        route: &'a OpenAiUpstreamRoute,
        fault: &'a OpenAiInvocationFault,
    ) -> OpenAiInvocationPluginFuture<'a> {
        Box::pin(async move {
            if let Err(error) = record_fault(&self.pool, context, route, fault).await {
                tracing::warn!(
                    error = %error,
                    supplier_code = route.supplier_code,
                    account_id = route.account_id,
                    "failed to record postgres OpenAI invocation fault telemetry"
                );
            }
            Ok(())
        })
    }

    fn on_route_success<'a>(
        &'a self,
        context: &'a OpenAiInvocationContext,
        route: &'a OpenAiUpstreamRoute,
        outcome: &'a OpenAiInvocationRelayOutcome,
    ) -> OpenAiInvocationPluginFuture<'a> {
        Box::pin(async move {
            if let Err(error) = record_success(&self.pool, context, route, outcome).await {
                tracing::warn!(
                    error = %error,
                    supplier_code = route.supplier_code,
                    account_id = route.account_id,
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
    route: &OpenAiUpstreamRoute,
    fault: &OpenAiInvocationFault,
) -> DomainResult<()> {
    match fault.kind {
        OpenAiInvocationFaultKind::UsageRecording => Ok(()),
        OpenAiInvocationFaultKind::RelayHttpStatus if !fault.is_retryable() => Ok(()),
        _ => record_channel_fault(pool, context, route, fault.latency_ms).await,
    }
}

async fn record_success(
    pool: &PgPool,
    context: &OpenAiInvocationContext,
    route: &OpenAiUpstreamRoute,
    outcome: &OpenAiInvocationRelayOutcome,
) -> DomainResult<()> {
    record_channel_success(pool, context, route, outcome.latency_ms).await
}

async fn record_channel_fault(
    pool: &PgPool,
    context: &OpenAiInvocationContext,
    route: &OpenAiUpstreamRoute,
    latency_ms: Option<i64>,
) -> DomainResult<()> {
    let state = load_channel_fault_state(pool, context, route).await?;
    let result = sqlx::query(
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
        "#,
    )
    .bind(latency_ms)
    .bind(i64::try_from(state.failure_threshold).map_err(|_| {
        DomainError::new("invalid OpenAI invocation circuit breaker failure threshold")
    })?)
    .bind(UNHEALTHY)
    .bind(HEALTHY)
    .bind(route.account_id)
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
    pool: &PgPool,
    context: &OpenAiInvocationContext,
    route: &OpenAiUpstreamRoute,
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
    .bind(route.account_id)
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
    route: &OpenAiUpstreamRoute,
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
    .bind(route.account_id)
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
        parse_channel_failure_threshold(circuit_breaker_policy_json.as_deref(), route.account_id);
    Ok(ChannelFaultState { failure_threshold })
}

fn parse_channel_failure_threshold(value: Option<&str>, account_id: i64) -> usize {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return ProviderCircuitBreakerPolicy::default().failure_threshold;
    };
    match ProviderCircuitBreakerPolicy::from_json_str(value) {
        Ok(policy) => policy.failure_threshold,
        Err(error) => {
            tracing::warn!(
                error = %error,
                account_id,
                "invalid postgres OpenAI invocation circuit breaker policy; using default failure threshold"
            );
            ProviderCircuitBreakerPolicy::default().failure_threshold
        }
    }
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
