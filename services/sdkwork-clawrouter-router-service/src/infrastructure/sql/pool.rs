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
pub const SQLITE_POOL_ACQUIRE_TIMEOUT_SECONDS: u64 = 10;
pub const SQLITE_BUSY_TIMEOUT_SECONDS: u64 = 30;
pub const SQLITE_RUNTIME_MIN_POOL_CONNECTIONS: u32 =
    sdkwork_claw_config::DatabaseConfig::DESKTOP_SQLITE_DEFAULT_MAX_CONNECTIONS;

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

pub fn is_sqlite_in_memory_database_url(database_url: &str) -> bool {
    let lower = database_url.to_ascii_lowercase();
    lower == "sqlite::memory:" || lower.contains(":memory:") || lower.contains("mode=memory")
}

pub fn effective_sqlite_runtime_pool_max_connections(database_url: &str, configured: u32) -> u32 {
    if is_sqlite_in_memory_database_url(database_url) {
        return configured;
    }
    configured.max(SQLITE_RUNTIME_MIN_POOL_CONNECTIONS)
}

pub async fn connect_standard_database_pool(
    config: &sdkwork_claw_config::DatabaseConfig,
) -> Result<DatabasePool, RepositoryError> {
    let mut standard = to_standard_database_config(config);
    if matches!(standard.engine, StandardDatabaseEngine::Sqlite) {
        standard.max_connections =
            effective_sqlite_runtime_pool_max_connections(&config.url, config.max_connections);
    }
    PoolBuilder::new(standard)
        .acquire_timeout(Duration::from_secs(
            if matches!(config.engine, sdkwork_claw_config::DatabaseEngine::Sqlite) {
                SQLITE_POOL_ACQUIRE_TIMEOUT_SECONDS
            } else {
                POSTGRES_POOL_ACQUIRE_TIMEOUT_SECONDS
            },
        ))
        .build()
        .await
        .map_err(RepositoryError::from)
}

pub async fn connect_claw_sqlite_runtime_database_pool(
    config: &sdkwork_claw_config::DatabaseConfig,
) -> Result<DatabasePool, RepositoryError> {
    connect_standard_database_pool(config).await
}

pub async fn connect_claw_sqlite_runtime_pool(
    config: &sdkwork_claw_config::DatabaseConfig,
) -> Result<sqlx::SqlitePool, RepositoryError> {
    connect_claw_sqlite_runtime_database_pool(config)
        .await?
        .as_sqlite()
        .cloned()
        .ok_or_else(|| RepositoryError::Generic("expected sqlite database pool".into()))
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
        .ok_or_else(|| sqlx::Error::Configuration("expected postgres database pool".into()))
}

pub fn sqlite_database_readiness_check(
    pool: sqlx::SqlitePool,
) -> sdkwork_claw_http::ReadinessCheckFn {
    std::sync::Arc::new(move || {
        let pool = pool.clone();
        Box::pin(async move { sqlx::query("SELECT 1").execute(&pool).await.is_ok() })
    })
}

pub fn postgres_database_readiness_check(pool: PgPool) -> sdkwork_claw_http::ReadinessCheckFn {
    std::sync::Arc::new(move || {
        let pool = pool.clone();
        Box::pin(async move { sqlx::query("SELECT 1").execute(&pool).await.is_ok() })
    })
}

pub fn standard_database_readiness_check(
    pool: DatabasePool,
) -> sdkwork_claw_http::ReadinessCheckFn {
    match pool {
        DatabasePool::Sqlite(sqlite_pool, _) => sqlite_database_readiness_check(sqlite_pool),
        DatabasePool::Postgres(postgres_pool, _) => {
            postgres_database_readiness_check(postgres_pool)
        }
    }
}

pub fn redis_readiness_check(redis_url: String) -> sdkwork_claw_http::ReadinessCheckFn {
    std::sync::Arc::new(move || {
        let redis_url = redis_url.clone();
        Box::pin(async move {
            let client = match redis::Client::open(redis_url.as_str()) {
                Ok(client) => client,
                Err(_) => return false,
            };
            let mut conn = match client.get_multiplexed_async_connection().await {
                Ok(conn) => conn,
                Err(_) => return false,
            };
            match redis::cmd("PING").query_async::<String>(&mut conn).await {
                Ok(pong) => pong.eq_ignore_ascii_case("PONG"),
                Err(_) => false,
            }
        })
    })
}

pub async fn sqlite_usage_settlement_schema_ready(
    pool: &sqlx::SqlitePool,
) -> Result<bool, sqlx::Error> {
    let table_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM sqlite_master
        WHERE type = 'table'
          AND name IN (
              'ai_usage_fact',
              'commerce_usage_settlement'
          )
        "#,
    )
    .fetch_one(pool)
    .await?;
    let usage_column_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM pragma_table_info('ai_usage_fact')
        WHERE name IN ('settlement_status', 'settlement_id', 'pricing_snapshot')
        "#,
    )
    .fetch_one(pool)
    .await?;
    Ok(table_count == 2 && usage_column_count == 3)
}

pub async fn postgres_usage_settlement_schema_ready(pool: &PgPool) -> Result<bool, sqlx::Error> {
    let table_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name IN (
              'ai_usage_fact',
              'commerce_usage_settlement'
          )
        "#,
    )
    .fetch_one(pool)
    .await?;
    let usage_column_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'ai_usage_fact'
          AND column_name IN ('settlement_status', 'settlement_id', 'pricing_snapshot')
        "#,
    )
    .fetch_one(pool)
    .await?;
    Ok(table_count == 2 && usage_column_count == 3)
}

pub fn sqlite_usage_settlement_readiness_check(
    pool: sqlx::SqlitePool,
    required: bool,
) -> sdkwork_claw_http::ReadinessCheckFn {
    std::sync::Arc::new(move || {
        let pool = pool.clone();
        Box::pin(async move {
            if !required {
                return true;
            }
            sqlite_usage_settlement_schema_ready(&pool)
                .await
                .unwrap_or(false)
        })
    })
}

pub fn postgres_usage_settlement_readiness_check(
    pool: PgPool,
    required: bool,
) -> sdkwork_claw_http::ReadinessCheckFn {
    std::sync::Arc::new(move || {
        let pool = pool.clone();
        Box::pin(async move {
            if !required {
                return true;
            }
            postgres_usage_settlement_schema_ready(&pool)
                .await
                .unwrap_or(false)
        })
    })
}

pub fn runtime_readiness_check(
    pool: DatabasePool,
    runtime_toml: Option<&RuntimeTomlConfig>,
    settlement_config: UsageSettlementWorkerConfig,
) -> Option<sdkwork_claw_http::ReadinessCheckFn> {
    let settlement_required = settlement_config.normalized().enabled;
    let mut checks: Vec<sdkwork_claw_http::ReadinessCheckFn> = Vec::new();
    match pool {
        DatabasePool::Sqlite(sqlite_pool, _) => {
            checks.push(sqlite_database_readiness_check(sqlite_pool.clone()));
            checks.push(sqlite_usage_settlement_readiness_check(
                sqlite_pool,
                settlement_required,
            ));
        }
        DatabasePool::Postgres(postgres_pool, _) => {
            checks.push(postgres_database_readiness_check(postgres_pool.clone()));
            checks.push(postgres_usage_settlement_readiness_check(
                postgres_pool,
                settlement_required,
            ));
        }
    }
    if let Ok(Some(redis_config)) = RedisConfig::from_env_or_runtime_toml(runtime_toml) {
        checks.push(redis_readiness_check(redis_config.url().to_owned()));
    }
    sdkwork_claw_http::combine_readiness_checks(checks)
}

pub fn sqlite_runtime_readiness_check(
    pool: sqlx::SqlitePool,
    runtime_toml: Option<&RuntimeTomlConfig>,
    settlement_config: UsageSettlementWorkerConfig,
) -> Option<sdkwork_claw_http::ReadinessCheckFn> {
    let settlement_required = settlement_config.normalized().enabled;
    let mut checks = vec![
        sqlite_database_readiness_check(pool.clone()),
        sqlite_usage_settlement_readiness_check(pool, settlement_required),
    ];
    if let Ok(Some(redis_config)) = RedisConfig::from_env_or_runtime_toml(runtime_toml) {
        checks.push(redis_readiness_check(redis_config.url().to_owned()));
    }
    sdkwork_claw_http::combine_readiness_checks(checks)
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
