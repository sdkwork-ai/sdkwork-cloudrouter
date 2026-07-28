use std::time::Duration;

use sdkwork_claw_config::{RedisConfig, RuntimeTomlConfig};
use sdkwork_database_config::{
    DatabaseConfig as StandardDatabaseConfig, DatabaseEngine as StandardDatabaseEngine,
};
use sdkwork_database_repository::RepositoryError;
use sdkwork_database_sqlx::{DatabasePool, PoolBuilder, PoolError};
use sqlx::PgPool;

use crate::application::UsageSettlementWorkerConfig;

use super::runtime_id::to_standard_database_config;

pub const POSTGRES_POOL_ACQUIRE_TIMEOUT_SECONDS: u64 = 10;

/// Maximum time a single readiness probe may take before it is reported as not ready.
pub const READINESS_CHECK_TIMEOUT: Duration = Duration::from_millis(500);

fn postgres_standard_config(database_url: &str, max_connections: u32) -> StandardDatabaseConfig {
    StandardDatabaseConfig {
        engine: StandardDatabaseEngine::Postgres,
        url: database_url.to_owned(),
        max_connections,
        ..StandardDatabaseConfig::default()
    }
}

fn pool_error_to_sqlx(error: PoolError) -> sqlx::Error {
    sqlx::Error::Configuration(error.to_string().into())
}

pub async fn connect_standard_database_pool(
    config: &sdkwork_claw_config::DatabaseConfig,
) -> Result<DatabasePool, RepositoryError> {
    let standard = to_standard_database_config(config)
        .map_err(|error| RepositoryError::Generic(error.to_string()))?;
    PoolBuilder::new(standard)
        .acquire_timeout(Duration::from_secs(POSTGRES_POOL_ACQUIRE_TIMEOUT_SECONDS))
        .build()
        .await
        .map_err(RepositoryError::from)
}

pub async fn connect_postgres_runtime_pool(
    database_url: &str,
    max_connections: u32,
) -> Result<PgPool, sqlx::Error> {
    let pool = PoolBuilder::new(postgres_standard_config(database_url, max_connections))
        .acquire_timeout(Duration::from_secs(POSTGRES_POOL_ACQUIRE_TIMEOUT_SECONDS))
        .build()
        .await
        .map_err(pool_error_to_sqlx)?;
    pool.as_postgres()
        .cloned()
        .ok_or_else(|| sqlx::Error::Configuration("expected PostgreSQL database pool".into()))
}

pub fn postgres_database_readiness_check(pool: PgPool) -> sdkwork_claw_http::ReadinessCheckFn {
    std::sync::Arc::new(move || {
        let pool = pool.clone();
        Box::pin(async move {
            run_with_readiness_timeout("postgres", sqlx::query("SELECT 1").execute(&pool)).await
        })
    })
}

async fn run_with_readiness_timeout<F, T>(probe: &'static str, future: F) -> bool
where
    F: std::future::Future<Output = Result<T, sqlx::Error>>,
{
    match tokio::time::timeout(READINESS_CHECK_TIMEOUT, future).await {
        Ok(Ok(_)) => true,
        Ok(Err(error)) => {
            tracing::warn!(probe, error = %error, "readiness probe failed");
            false
        }
        Err(_) => {
            tracing::warn!(
                probe,
                timeout_ms = READINESS_CHECK_TIMEOUT.as_millis() as u64,
                "readiness probe timed out; reporting not ready"
            );
            false
        }
    }
}

pub fn redis_readiness_check(redis_url: String) -> sdkwork_claw_http::ReadinessCheckFn {
    std::sync::Arc::new(move || {
        let redis_url = redis_url.clone();
        Box::pin(async move {
            match tokio::time::timeout(READINESS_CHECK_TIMEOUT, async {
                let client = match redis::Client::open(redis_url.as_str()) {
                    Ok(client) => client,
                    Err(_) => return false,
                };
                let mut connection = match client.get_multiplexed_async_connection().await {
                    Ok(connection) => connection,
                    Err(_) => return false,
                };
                match redis::cmd("PING")
                    .query_async::<String>(&mut connection)
                    .await
                {
                    Ok(pong) => pong.eq_ignore_ascii_case("PONG"),
                    Err(_) => false,
                }
            })
            .await
            {
                Ok(ready) => ready,
                Err(_) => {
                    tracing::warn!(
                        timeout_ms = READINESS_CHECK_TIMEOUT.as_millis() as u64,
                        "redis readiness check timed out; reporting not ready"
                    );
                    false
                }
            }
        })
    })
}

pub async fn postgres_usage_settlement_schema_ready(pool: &PgPool) -> Result<bool, sqlx::Error> {
    let table_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name IN ('ai_usage', 'commerce_settlement')
        "#,
    )
    .fetch_one(pool)
    .await?;
    let usage_column_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'ai_usage'
          AND column_name IN ('settlement_status', 'settlement_id', 'pricing_snapshot')
        "#,
    )
    .fetch_one(pool)
    .await?;
    Ok(table_count == 2 && usage_column_count == 3)
}

pub fn postgres_usage_settlement_readiness_check(
    pool: PgPool,
    required: bool,
) -> sdkwork_claw_http::ReadinessCheckFn {
    std::sync::Arc::new(move || {
        let pool = pool.clone();
        Box::pin(async move {
            !required
                || postgres_usage_settlement_schema_ready(&pool)
                    .await
                    .unwrap_or(false)
        })
    })
}

pub fn postgres_runtime_readiness_check(
    pool: PgPool,
    runtime_toml: Option<&RuntimeTomlConfig>,
    settlement_config: UsageSettlementWorkerConfig,
) -> Option<sdkwork_claw_http::ReadinessCheckFn> {
    let settlement_required = settlement_config.normalized().enabled;
    let mut checks = vec![
        postgres_database_readiness_check(pool.clone()),
        postgres_usage_settlement_readiness_check(pool, settlement_required),
    ];
    if let Ok(Some(redis_config)) = RedisConfig::from_env_or_runtime_toml(runtime_toml) {
        checks.push(redis_readiness_check(redis_config.url().to_owned()));
    }
    sdkwork_claw_http::combine_readiness_checks(checks)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn redis_readiness_check_returns_false_for_unreachable_url() {
        let check = redis_readiness_check("redis://127.0.0.1:1".to_owned());
        assert!(!check().await, "unreachable redis must not report ready");
    }

    #[tokio::test]
    async fn redis_readiness_check_times_out_when_server_is_silent() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let server = tokio::spawn(async move { while listener.accept().await.is_ok() {} });

        let check = redis_readiness_check(format!("redis://{address}"));
        let ready = tokio::time::timeout(READINESS_CHECK_TIMEOUT + Duration::from_secs(2), check())
            .await
            .expect("readiness check must not hang beyond its timeout");

        assert!(!ready, "silent redis must time out and report not ready");
        server.abort();
    }
}
