use std::sync::Arc;

use axum::Router;
use sdkwork_routes_inventory_backend_api::{
    backend_inventory_router_with_postgres_pool as inventory_backend_router_with_postgres_pool,
    backend_inventory_router_with_sqlite_pool as inventory_backend_router_with_sqlite_pool,
    build_backend_inventory_router,
};
use sqlx::{PgPool, SqlitePool};

pub use sdkwork_routes_inventory_backend_api::CommerceBackendInventoryStore;

use crate::with_backend_request_identity;

pub fn backend_inventory_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    with_backend_request_identity(inventory_backend_router_with_sqlite_pool(pool))
}

pub fn backend_inventory_router_with_postgres_pool(pool: PgPool) -> Router {
    with_backend_request_identity(inventory_backend_router_with_postgres_pool(pool))
}

pub fn backend_inventory_router_with_store(
    store: Arc<dyn CommerceBackendInventoryStore>,
) -> Router {
    with_backend_request_identity(build_backend_inventory_router(store))
}
