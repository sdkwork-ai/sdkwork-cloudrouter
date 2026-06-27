//! SDKWork Commerce database pool bootstrap via `sdkwork-database`.

use sdkwork_database_config::DatabaseConfig;
use sdkwork_database_sqlx::{create_pool_from_config, DatabasePool, PoolError};

pub use sdkwork_commerce_database_host::{
    bootstrap_commerce_database, bootstrap_commerce_database_from_env, CommerceDatabaseHost,
};

pub type CommerceDatabasePool = DatabasePool;

pub async fn connect_commerce_database_pool_from_env() -> Result<CommerceDatabasePool, PoolError> {
    let config = DatabaseConfig::from_env("COMMERCE")?;
    create_pool_from_config(config).await
}

pub async fn connect_and_bootstrap_commerce_database_from_env(
) -> Result<CommerceDatabaseHost, String> {
    let pool = connect_commerce_database_pool_from_env()
        .await
        .map_err(|error| error.to_string())?;
    bootstrap_commerce_database(pool).await
}
