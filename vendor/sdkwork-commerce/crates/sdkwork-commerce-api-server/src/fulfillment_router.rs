use std::sync::Arc;

use axum::Router;
use sdkwork_commerce_order_repository_sqlx::{
    PostgresCommerceOrderStore, SqliteCommerceOrderStore,
};
use sdkwork_routes_order_app_api::build_app_fulfillment_router;
use sqlx::{PgPool, SqlitePool};

pub use sdkwork_routes_order_app_api::{CommerceFulfillmentFuture, CommerceFulfillmentStore};

use crate::with_request_identity;

pub fn app_fulfillment_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    app_fulfillment_router_with_store(Arc::new(SqliteCommerceOrderStore::new(pool)))
}

pub fn app_fulfillment_router_with_postgres_pool(pool: PgPool) -> Router {
    app_fulfillment_router_with_store(Arc::new(PostgresCommerceOrderStore::new(pool)))
}

pub fn app_fulfillment_router_with_store(store: Arc<dyn CommerceFulfillmentStore>) -> Router {
    with_request_identity(build_app_fulfillment_router(store))
}
