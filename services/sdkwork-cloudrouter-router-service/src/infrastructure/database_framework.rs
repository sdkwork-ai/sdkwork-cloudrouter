//! SDKWork database framework bootstrap exports for Cloud Router.

pub use sdkwork_cloudrouter_database_host::{
    bootstrap_cloud_router_database, bootstrap_cloud_router_database_from_env,
    CloudRouterDatabaseHost,
};

use sdkwork_database_sqlx::DatabasePool;

pub type CloudRouterDatabasePool = DatabasePool;
