use std::sync::Arc;

use axum::Router;
use sdkwork_commerce_order_repository_sqlx::{
    PostgresCommerceOrderStore, SqliteCommerceOrderStore,
};
use sdkwork_commerce_payment_repository_sqlx::{
    PostgresCommerceOwnerOrderPaymentStore, SqliteCommerceOwnerOrderPaymentStore,
};
use sdkwork_routes_order_app_api::build_app_order_router;
use sqlx::{PgPool, SqlitePool};

pub use sdkwork_routes_order_app_api::{
    CommerceOrderFuture, CommerceOrderStore, OwnerOrderPaymentStore,
};

use crate::with_request_identity;

pub fn app_order_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    with_request_identity(build_app_order_router(
        Arc::new(SqliteCommerceOrderStore::new(pool.clone())),
        Arc::new(SqliteCommerceOwnerOrderPaymentStore::new(pool)),
    ))
}

pub fn app_order_router_with_postgres_pool(pool: PgPool) -> Router {
    with_request_identity(build_app_order_router(
        Arc::new(PostgresCommerceOrderStore::new(pool.clone())),
        Arc::new(PostgresCommerceOwnerOrderPaymentStore::new(pool)),
    ))
}

pub fn app_order_router_with_store(
    store: Arc<dyn CommerceOrderStore>,
    payments: Arc<dyn OwnerOrderPaymentStore>,
) -> Router {
    with_request_identity(build_app_order_router(store, payments))
}
