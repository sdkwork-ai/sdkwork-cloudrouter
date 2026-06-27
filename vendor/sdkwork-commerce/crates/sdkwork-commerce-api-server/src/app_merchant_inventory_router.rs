use axum::Router;
use sdkwork_routes_inventory_app_api::{
    app_merchant_inventory_router_with_postgres_pool as merchant_inventory_router_with_postgres_pool,
    app_merchant_inventory_router_with_sqlite_pool as merchant_inventory_router_with_sqlite_pool,
    build_app_merchant_inventory_router,
};
use sqlx::{PgPool, SqlitePool};
use std::sync::Arc;

pub use sdkwork_routes_inventory_app_api::CommerceMerchantInventoryStore;

use crate::with_request_identity;

pub fn app_merchant_inventory_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    with_request_identity(merchant_inventory_router_with_sqlite_pool(pool))
}

pub fn app_merchant_inventory_router_with_postgres_pool(pool: PgPool) -> Router {
    with_request_identity(merchant_inventory_router_with_postgres_pool(pool))
}

pub fn app_merchant_inventory_router_with_store(
    store: Arc<dyn CommerceMerchantInventoryStore>,
) -> Router {
    with_request_identity(build_app_merchant_inventory_router(store))
}
