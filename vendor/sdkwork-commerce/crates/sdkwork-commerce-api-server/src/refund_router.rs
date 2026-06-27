use axum::Router;
use sdkwork_routes_payment_app_api::{
    app_refund_router_with_postgres_pool as refund_router_with_postgres_pool,
    app_refund_router_with_sqlite_pool as refund_router_with_sqlite_pool, build_app_refund_router,
};
use sqlx::{PgPool, SqlitePool};
use std::sync::Arc;

pub use sdkwork_routes_payment_app_api::{CommerceRefundFuture, CommerceRefundStore};

use crate::with_request_identity;

pub fn app_refund_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    with_request_identity(refund_router_with_sqlite_pool(pool))
}

pub fn app_refund_router_with_postgres_pool(pool: PgPool) -> Router {
    with_request_identity(refund_router_with_postgres_pool(pool))
}

pub fn app_refund_router_with_store(store: Arc<dyn CommerceRefundStore>) -> Router {
    with_request_identity(build_app_refund_router(store))
}
