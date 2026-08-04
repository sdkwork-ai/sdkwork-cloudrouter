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
        _ => record_account_fault(pool, context, route, fault.latency_ms).await,
    }
}

async fn record_success(
    pool: &PgPool,
    context: &OpenAiInvocationContext,
    route: &OpenAiUpstreamRoute,
    outcome: &OpenAiInvocationRelayOutcome,
) -> DomainResult<()> {
    record_account_success(pool, context, route, outcome.latency_ms).await
}

async fn record_account_fault(
    pool: &PgPool,
    context: &OpenAiInvocationContext,
    route: &OpenAiUpstreamRoute,
    latency_ms: Option<i64>,
) -> DomainResult<()> {
    let state = load_account_fault_state(pool, context, route).await?;
    let result = sqlx::query(
        r#"
        INSERT INTO ai_upstream_account_health_state (
            id, tenant_id, organization_id, created_at, updated_at,
            account_id, health_status, last_latency_ms, consecutive_error_count,
            last_used_at, last_failure_at
        )
        SELECT
            account.id, account.tenant_id, account.organization_id,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
            account.id,
            CASE WHEN 1 >= $2 THEN $3 ELSE $4 END,
            $1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM ai_upstream_account account
        WHERE account.id = $5
          AND account.tenant_id = $6
          AND account.organization_id = $7
          AND account.deleted_at IS NULL
        ON CONFLICT (tenant_id, organization_id, account_id)
        DO UPDATE SET
            health_status = CASE
                WHEN ai_upstream_account_health_state.consecutive_error_count + 1 >= $2 THEN $3
                ELSE $4
            END,
            last_latency_ms = COALESCE(EXCLUDED.last_latency_ms, ai_upstream_account_health_state.last_latency_ms),
            consecutive_error_count = ai_upstream_account_health_state.consecutive_error_count + 1,
            last_used_at = EXCLUDED.last_used_at,
            last_failure_at = EXCLUDED.last_failure_at,
            updated_at = EXCLUDED.updated_at
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
            "failed to update OpenAI invocation upstream account telemetry",
            error,
        )
    })?;
    if result.rows_affected() == 0 {
        return Err(DomainError::new(
            "OpenAI invocation upstream account was not found",
        ));
    }
    record_endpoint_fault(pool, context, route, latency_ms, state.failure_threshold).await?;
    Ok(())
}

async fn record_account_success(
    pool: &PgPool,
    context: &OpenAiInvocationContext,
    route: &OpenAiUpstreamRoute,
    latency_ms: Option<i64>,
) -> DomainResult<()> {
    let result = sqlx::query(
        r#"
        INSERT INTO ai_upstream_account_health_state (
            id, tenant_id, organization_id, created_at, updated_at,
            account_id, health_status, last_latency_ms, consecutive_error_count,
            last_used_at, last_success_at
        )
        SELECT
            account.id, account.tenant_id, account.organization_id,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
            account.id, $1, $2, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM ai_upstream_account account
        WHERE account.id = $3
          AND account.tenant_id = $4
          AND account.organization_id = $5
          AND account.deleted_at IS NULL
        ON CONFLICT (tenant_id, organization_id, account_id)
        DO UPDATE SET
            health_status = EXCLUDED.health_status,
            last_latency_ms = COALESCE(EXCLUDED.last_latency_ms, ai_upstream_account_health_state.last_latency_ms),
            consecutive_error_count = 0,
            last_used_at = EXCLUDED.last_used_at,
            last_success_at = EXCLUDED.last_success_at,
            updated_at = EXCLUDED.updated_at
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
            "failed to update OpenAI invocation upstream account telemetry",
            error,
        )
    })?;
    if result.rows_affected() == 0 {
        return Err(DomainError::new(
            "OpenAI invocation upstream account was not found",
        ));
    }
    record_endpoint_success(pool, context, route, latency_ms).await?;
    Ok(())
}

async fn record_endpoint_fault(
    pool: &PgPool,
    context: &OpenAiInvocationContext,
    route: &OpenAiUpstreamRoute,
    latency_ms: Option<i64>,
    failure_threshold: usize,
) -> DomainResult<()> {
    let Some(provider_base_url) = route.provider_base_url.as_deref() else {
        return Ok(());
    };
    sqlx::query(
        r#"
        INSERT INTO ai_upstream_supplier_endpoint_health_state (
            id, tenant_id, organization_id, created_at, updated_at,
            supplier_id, endpoint_id, health_status, last_latency_ms,
            consecutive_error_count, last_checked_at, last_failure_at
        )
        SELECT
            selected.id, selected.tenant_id, selected.organization_id,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
            selected.supplier_id, selected.id,
            CASE WHEN 1 >= $1 THEN $2 ELSE $3 END,
            $4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM LATERAL (
            SELECT endpoint.id, endpoint.tenant_id, endpoint.organization_id, endpoint.supplier_id
            FROM ai_upstream_account account
            JOIN ai_upstream_supplier_endpoint endpoint
              ON endpoint.tenant_id = account.tenant_id
             AND endpoint.organization_id = account.organization_id
             AND endpoint.supplier_id = account.supplier_id
             AND endpoint.base_url = $5
             AND endpoint.status = 1
             AND endpoint.deleted_at IS NULL
            WHERE account.id = $6
              AND account.tenant_id = $7
              AND account.organization_id = $8
              AND account.deleted_at IS NULL
            ORDER BY
                CASE WHEN endpoint.id = account.preferred_endpoint_id THEN 0 ELSE 1 END,
                endpoint.priority ASC,
                endpoint.id ASC
            LIMIT 1
        ) selected
        ON CONFLICT (tenant_id, organization_id, endpoint_id)
        DO UPDATE SET
            health_status = CASE
                WHEN ai_upstream_supplier_endpoint_health_state.consecutive_error_count + 1 >= $1 THEN $2
                ELSE $3
            END,
            last_latency_ms = COALESCE(EXCLUDED.last_latency_ms, ai_upstream_supplier_endpoint_health_state.last_latency_ms),
            consecutive_error_count = ai_upstream_supplier_endpoint_health_state.consecutive_error_count + 1,
            last_checked_at = EXCLUDED.last_checked_at,
            last_failure_at = EXCLUDED.last_failure_at,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(i64::try_from(failure_threshold).map_err(|_| {
        DomainError::new("invalid OpenAI invocation endpoint failure threshold")
    })?)
    .bind(UNHEALTHY)
    .bind(HEALTHY)
    .bind(latency_ms)
    .bind(provider_base_url)
    .bind(route.account_id)
    .bind(context.api_key_context.tenant_id)
    .bind(context.api_key_context.organization_id)
    .execute(pool)
    .await
    .map_err(|error| {
        store_error(
            "failed to update OpenAI invocation upstream endpoint fault telemetry",
            error,
        )
    })?;
    Ok(())
}

async fn record_endpoint_success(
    pool: &PgPool,
    context: &OpenAiInvocationContext,
    route: &OpenAiUpstreamRoute,
    latency_ms: Option<i64>,
) -> DomainResult<()> {
    let Some(provider_base_url) = route.provider_base_url.as_deref() else {
        return Ok(());
    };
    sqlx::query(
        r#"
        INSERT INTO ai_upstream_supplier_endpoint_health_state (
            id, tenant_id, organization_id, created_at, updated_at,
            supplier_id, endpoint_id, health_status, last_latency_ms,
            consecutive_error_count, last_checked_at, last_success_at
        )
        SELECT
            selected.id, selected.tenant_id, selected.organization_id,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
            selected.supplier_id, selected.id, $1, $2, 0,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM LATERAL (
            SELECT endpoint.id, endpoint.tenant_id, endpoint.organization_id, endpoint.supplier_id
            FROM ai_upstream_account account
            JOIN ai_upstream_supplier_endpoint endpoint
              ON endpoint.tenant_id = account.tenant_id
             AND endpoint.organization_id = account.organization_id
             AND endpoint.supplier_id = account.supplier_id
             AND endpoint.base_url = $3
             AND endpoint.status = 1
             AND endpoint.deleted_at IS NULL
            WHERE account.id = $4
              AND account.tenant_id = $5
              AND account.organization_id = $6
              AND account.deleted_at IS NULL
            ORDER BY
                CASE WHEN endpoint.id = account.preferred_endpoint_id THEN 0 ELSE 1 END,
                endpoint.priority ASC,
                endpoint.id ASC
            LIMIT 1
        ) selected
        ON CONFLICT (tenant_id, organization_id, endpoint_id)
        DO UPDATE SET
            health_status = EXCLUDED.health_status,
            last_latency_ms = COALESCE(EXCLUDED.last_latency_ms, ai_upstream_supplier_endpoint_health_state.last_latency_ms),
            consecutive_error_count = 0,
            last_checked_at = EXCLUDED.last_checked_at,
            last_success_at = EXCLUDED.last_success_at,
            updated_at = EXCLUDED.updated_at
        "#,
    )
    .bind(HEALTHY)
    .bind(latency_ms)
    .bind(provider_base_url)
    .bind(route.account_id)
    .bind(context.api_key_context.tenant_id)
    .bind(context.api_key_context.organization_id)
    .execute(pool)
    .await
    .map_err(|error| {
        store_error(
            "failed to update OpenAI invocation upstream endpoint success telemetry",
            error,
        )
    })?;
    Ok(())
}

struct AccountFaultState {
    failure_threshold: usize,
}

async fn load_account_fault_state(
    pool: &PgPool,
    context: &OpenAiInvocationContext,
    route: &OpenAiUpstreamRoute,
) -> DomainResult<AccountFaultState> {
    let row = sqlx::query(
        r#"
        SELECT
            circuit_breaker_policy::text AS circuit_breaker_policy_json
        FROM ai_upstream_account
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
            "failed to load OpenAI invocation upstream account circuit breaker policy",
            error,
        )
    })?
    .ok_or_else(|| DomainError::new("OpenAI invocation upstream account was not found"))?;
    let circuit_breaker_policy_json =
        sqlx::Row::try_get::<Option<String>, _>(&row, "circuit_breaker_policy_json")
            .ok()
            .flatten();
    let failure_threshold =
        parse_account_failure_threshold(circuit_breaker_policy_json.as_deref(), route.account_id);
    Ok(AccountFaultState { failure_threshold })
}

fn parse_account_failure_threshold(value: Option<&str>, account_id: i64) -> usize {
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
