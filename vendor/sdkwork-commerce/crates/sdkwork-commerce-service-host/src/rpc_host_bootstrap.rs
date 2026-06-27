use std::sync::Arc;

use sdkwork_commerce_contract_service::CommerceServiceError;
use sdkwork_commerce_rpc::CommerceRpcServerConfig;
use sdkwork_commerce_storage_repository_sqlx::{
    bootstrap_commerce_database, commerce_initial_migration_sql, commerce_pool_from_env,
    commerce_postgres_pool_from_env, commerce_sqlite_pool_from_env,
};
use sdkwork_database_sqlx::create_pool_from_env;
use sqlx::{PgPool, SqlitePool};

use crate::rpc_context::CommerceIamRpcContextResolver;
use crate::sqlx_runtime::CommerceSqlxRuntimePool;
use crate::{
    build_commerce_service_host_rpc_host, build_commerce_sqlx_runtime_infrastructure,
    build_commerce_sqlx_runtime_stores, initialize_commerce_rpc_framework_from_env,
    CommerceServiceHostRpcHost, CommerceServiceHostRpcHostInput,
    CommerceServiceHostRpcServerConfig,
};

pub const COMMERCE_RPC_BIND_ADDR_ENV: &str = "SDKWORK_COMMERCE_RPC_BIND_ADDR";
pub const COMMERCE_RPC_ENABLE_REFLECTION_ENV: &str = "SDKWORK_COMMERCE_RPC_ENABLE_REFLECTION";
pub const COMMERCE_RPC_ENFORCE_AUTH_METADATA_ENV: &str =
    "SDKWORK_COMMERCE_RPC_ENFORCE_AUTH_METADATA";

pub fn commerce_rpc_server_config_from_env() -> CommerceRpcServerConfig {
    CommerceRpcServerConfig {
        bind_addr: std::env::var(COMMERCE_RPC_BIND_ADDR_ENV)
            .unwrap_or_else(|_| "127.0.0.1:50051".to_string()),
        enable_health: true,
        enable_reflection: env_flag(COMMERCE_RPC_ENABLE_REFLECTION_ENV, false),
        require_tls: false,
        enforce_auth_metadata: env_flag(COMMERCE_RPC_ENFORCE_AUTH_METADATA_ENV, true),
    }
}

pub async fn resolve_commerce_sqlx_runtime_pool_from_env(
) -> Result<CommerceSqlxRuntimePool, CommerceServiceError> {
    if let Some(pool) = commerce_postgres_pool_from_env()
        .await
        .map_err(map_pool_error)?
    {
        return Ok(CommerceSqlxRuntimePool::Postgres(pool));
    }

    if let Some(pool) = commerce_sqlite_pool_from_env()
        .await
        .map_err(map_pool_error)?
    {
        return Ok(CommerceSqlxRuntimePool::Sqlite(pool));
    }

    Err(CommerceServiceError::validation(
        "SDKWORK_COMMERCE_DATABASE_* environment is required for commerce rpc host",
    ))
}

pub async fn resolve_iam_postgres_pool_from_env() -> Option<Arc<PgPool>> {
    create_pool_from_env("IAM")
        .await
        .ok()
        .flatten()
        .and_then(|pool| pool.as_postgres().cloned())
        .map(Arc::new)
}

pub async fn ensure_commerce_schema(
    pool: &CommerceSqlxRuntimePool,
) -> Result<(), CommerceServiceError> {
    match pool {
        CommerceSqlxRuntimePool::Sqlite(pool) => {
            ensure_schema_sqlite(pool, commerce_initial_migration_sql()).await
        }
        CommerceSqlxRuntimePool::Postgres(_) => {
            let database_pool = commerce_pool_from_env()
                .await
                .map_err(map_pool_error)?
                .ok_or_else(|| {
                    CommerceServiceError::validation(
                        "SDKWORK_COMMERCE_DATABASE_* environment is required for commerce postgres bootstrap",
                    )
                })?;
            bootstrap_commerce_database(database_pool)
                .await
                .map(|_| ())
                .map_err(CommerceServiceError::storage)?;
            Ok(())
        }
    }
}

pub async fn build_commerce_rpc_host_from_pool(
    pool: CommerceSqlxRuntimePool,
    iam_pool: Option<Arc<PgPool>>,
    server_config: CommerceServiceHostRpcServerConfig,
) -> Result<CommerceServiceHostRpcHost, CommerceServiceError> {
    ensure_commerce_schema(&pool).await?;

    let stores = build_commerce_sqlx_runtime_stores(pool.clone());
    let (idempotency_store, transaction_manager) = build_commerce_sqlx_runtime_infrastructure(pool);
    let context_resolver = Box::new(CommerceIamRpcContextResolver::new(iam_pool));

    build_commerce_service_host_rpc_host(CommerceServiceHostRpcHostInput::new(
        stores,
        context_resolver,
        idempotency_store,
        transaction_manager,
        server_config,
    ))
}

pub async fn build_commerce_rpc_host_from_env(
) -> Result<CommerceServiceHostRpcHost, CommerceServiceError> {
    let pool = resolve_commerce_sqlx_runtime_pool_from_env().await?;
    let iam_pool = resolve_iam_postgres_pool_from_env().await;
    let server_config = commerce_rpc_server_config_from_env();
    build_commerce_rpc_host_from_pool(pool, iam_pool, server_config).await
}

pub async fn run_commerce_rpc_host_from_env() -> Result<(), Box<dyn std::error::Error + Send + Sync>>
{
    let rpc_framework = initialize_commerce_rpc_framework_from_env().map_err(
        |error| -> Box<dyn std::error::Error + Send + Sync> {
            Box::new(std::io::Error::other(error.to_string()))
        },
    )?;
    rpc_framework.verify_client_resolution().await.map_err(
        |error| -> Box<dyn std::error::Error + Send + Sync> {
            Box::new(std::io::Error::other(format!(
                "commerce rpc client resolver verification failed: {error}"
            )))
        },
    )?;

    let host = build_commerce_rpc_host_from_env().await.map_err(
        |error| -> Box<dyn std::error::Error + Send + Sync> {
            Box::new(std::io::Error::other(error.message().to_string()))
        },
    )?;
    eprintln!(
        "sdkwork-commerce-rpc-host listening on {}",
        host.server_config().bind_addr
    );
    host.serve().await
}

fn env_flag(name: &str, default: bool) -> bool {
    match std::env::var(name) {
        Ok(value) => matches!(
            value.trim().to_ascii_lowercase().as_str(),
            "1" | "true" | "yes"
        ),
        Err(_) => default,
    }
}

fn map_pool_error(error: sdkwork_database_sqlx::PoolError) -> CommerceServiceError {
    CommerceServiceError::storage(format!("failed to resolve commerce database pool: {error}"))
}

async fn ensure_schema_sqlite(pool: &SqlitePool, sql: &str) -> Result<(), CommerceServiceError> {
    sqlx::query(sql).execute(pool).await.map_err(|error| {
        CommerceServiceError::storage(format!("commerce schema migration failed: {error}"))
    })?;
    Ok(())
}
