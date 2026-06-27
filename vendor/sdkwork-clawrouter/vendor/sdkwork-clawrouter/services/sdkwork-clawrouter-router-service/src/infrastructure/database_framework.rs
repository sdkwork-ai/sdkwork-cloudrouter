//! SDKWork database framework bootstrap exports for Claw Router.

pub use sdkwork_clawrouter_database_host::{
    bootstrap_claw_router_database, bootstrap_claw_router_database_from_env, ClawRouterDatabaseHost,
};

use sdkwork_database_config::DatabaseConfig;
use sdkwork_database_sqlx::{create_pool_from_config, DatabasePool, PoolError};

pub type ClawRouterDatabasePool = DatabasePool;

pub async fn connect_claw_router_database_pool_from_env(
) -> Result<ClawRouterDatabasePool, PoolError> {
    let config = DatabaseConfig::from_env("CLAW_ROUTER")?;
    create_pool_from_config(config).await
}

pub async fn connect_and_bootstrap_claw_router_database_from_env(
) -> Result<ClawRouterDatabaseHost, String> {
    let pool = connect_claw_router_database_pool_from_env()
        .await
        .map_err(|error| error.to_string())?;
    bootstrap_claw_router_database(pool).await
}
