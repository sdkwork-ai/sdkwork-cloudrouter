use std::sync::Arc;

use axum::Router;
use sdkwork_routes_payment_app_api::{
    app_payment_router_with_postgres_pool as payment_app_router_with_postgres_pool,
    app_payment_router_with_sqlite_pool as payment_app_router_with_sqlite_pool,
    build_app_payment_router,
};
use sqlx::{PgPool, SqlitePool};

pub use sdkwork_routes_payment_app_api::{CommercePaymentFuture, CommercePaymentStore};

use crate::with_request_identity;

pub fn app_payment_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    with_request_identity(payment_app_router_with_sqlite_pool(pool))
}

pub fn app_payment_router_with_postgres_pool(pool: PgPool) -> Router {
    with_request_identity(payment_app_router_with_postgres_pool(pool))
}

pub fn app_payment_router_with_store(store: Arc<dyn CommercePaymentStore>) -> Router {
    with_request_identity(build_app_payment_router(store))
}
