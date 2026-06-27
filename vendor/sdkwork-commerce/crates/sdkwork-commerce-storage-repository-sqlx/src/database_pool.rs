//! Commerce database pool helpers backed by `sdkwork-database`.

use sdkwork_database_config::{DatabaseConfig, DatabaseEngine, DeploymentMode};
use sdkwork_database_sqlx::{
    create_pool_from_config, create_pool_from_env, DatabasePool, PoolError,
};
use sqlx::{PgPool, SqlitePool};

pub const COMMERCE_DATABASE_SERVICE_NAME: &str = "COMMERCE";

/// SQLite in-memory configuration for tests and local router harnesses.
pub fn commerce_sqlite_memory_config() -> DatabaseConfig {
    DatabaseConfig {
        engine: DatabaseEngine::Sqlite,
        url: "sqlite::memory:".to_owned(),
        mode: DeploymentMode::Standalone,
        table_prefix: "commerce_".to_owned(),
        max_connections: 5,
        min_connections: 1,
        ..DatabaseConfig::default()
    }
}

/// Creates an in-memory SQLite pool through `sdkwork-database-sqlx`.
pub async fn commerce_sqlite_memory_pool() -> SqlitePool {
    let pool = create_pool_from_config(commerce_sqlite_memory_config())
        .await
        .expect("commerce sqlite memory pool");
    pool.as_sqlite().expect("sqlite engine").clone()
}

/// Creates an in-memory SQLite pool and applies Commerce schema migrations.
pub async fn commerce_migrated_sqlite_memory_pool() -> SqlitePool {
    let pool = commerce_sqlite_memory_pool().await;
    sqlx::query(crate::commerce_initial_migration_sql())
        .execute(&pool)
        .await
        .expect("commerce migration");
    pool
}

/// Loads a Commerce database pool from `SDKWORK_COMMERCE_DATABASE_*` environment variables.
pub async fn commerce_pool_from_env() -> Result<Option<DatabasePool>, PoolError> {
    create_pool_from_env(COMMERCE_DATABASE_SERVICE_NAME).await
}

/// Returns a SQLite pool when Commerce env config points at SQLite.
pub async fn commerce_sqlite_pool_from_env() -> Result<Option<SqlitePool>, PoolError> {
    Ok(commerce_pool_from_env()
        .await?
        .and_then(|pool| pool.as_sqlite().cloned()))
}

/// Returns a PostgreSQL pool when Commerce env config points at PostgreSQL.
pub async fn commerce_postgres_pool_from_env() -> Result<Option<PgPool>, PoolError> {
    Ok(commerce_pool_from_env()
        .await?
        .and_then(|pool| pool.as_postgres().cloned()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn commerce_sqlite_memory_pool_uses_sdkwork_database() {
        let pool = commerce_sqlite_memory_pool().await;
        assert!(pool.size() >= 1);
    }
}
