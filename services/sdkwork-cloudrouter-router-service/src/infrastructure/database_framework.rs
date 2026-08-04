//! SDKWork database framework bootstrap exports for Cloud Router.

pub use sdkwork_cloudrouter_database_host::{
    bootstrap_cloud_router_database, bootstrap_cloud_router_database_from_env, CloudRouterDatabaseHost,
};

use sdkwork_database_config::DatabaseConfig;
use sdkwork_database_sqlx::{create_pool_from_config, DatabasePool, PoolError};

pub type CloudRouterDatabasePool = DatabasePool;

pub async fn connect_cloud_router_database_pool_from_env(
) -> Result<CloudRouterDatabasePool, PoolError> {
    let config = DatabaseConfig::from_env("CLOUD_ROUTER")?;
    create_pool_from_config(config).await
}

pub async fn connect_and_bootstrap_cloud_router_database_from_env(
) -> Result<CloudRouterDatabaseHost, String> {
    let pool = connect_cloud_router_database_pool_from_env()
        .await
        .map_err(|error| error.to_string())?;
    bootstrap_cloud_router_database(pool).await
}
