use std::sync::Arc;

use axum::Router;
use sdkwork_routes_catalog_app_api::{
    app_catalog_router_with_postgres_pool as catalog_app_router_with_postgres_pool,
    app_catalog_router_with_sqlite_pool as catalog_app_router_with_sqlite_pool,
    build_app_catalog_router,
};
use sdkwork_routes_merchandise_app_api::{
    backend_catalog_router_with_postgres_pool as merchandise_backend_catalog_router_with_postgres_pool,
    backend_catalog_router_with_sqlite_pool as merchandise_backend_catalog_router_with_sqlite_pool,
    build_backend_catalog_router,
};
use sqlx::{PgPool, SqlitePool};

pub use sdkwork_commerce_catalog_repository_sqlx::{
    PostgresCommerceCatalogStore, SqliteCommerceCatalogStore,
};
pub use sdkwork_routes_merchandise_app_api::{
    map_spu, CommerceCatalogFuture, CommerceCatalogStore, CreateSpuBody, UpdateSpuBody,
};

use crate::with_backend_request_identity;
use crate::with_request_identity;

pub fn app_catalog_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    with_request_identity(catalog_app_router_with_sqlite_pool(pool))
}

pub fn app_catalog_router_with_postgres_pool(pool: PgPool) -> Router {
    with_request_identity(catalog_app_router_with_postgres_pool(pool))
}

pub fn app_catalog_router_with_store(store: Arc<dyn CommerceCatalogStore>) -> Router {
    with_request_identity(build_app_catalog_router(store))
}

pub fn backend_catalog_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    with_backend_request_identity(merchandise_backend_catalog_router_with_sqlite_pool(pool))
}

pub fn backend_catalog_router_with_postgres_pool(pool: PgPool) -> Router {
    with_backend_request_identity(merchandise_backend_catalog_router_with_postgres_pool(pool))
}

pub fn backend_catalog_router_with_store(store: Arc<dyn CommerceCatalogStore>) -> Router {
    with_backend_request_identity(build_backend_catalog_router(store))
}
