use std::sync::Arc;

use axum::Router;
use sdkwork_routes_payment_backend_api::{
    backend_payment_admin_router_with_postgres_pool as payment_backend_admin_router_with_postgres_pool,
    backend_payment_admin_router_with_sqlite_pool as payment_backend_admin_router_with_sqlite_pool,
    build_backend_payment_admin_router,
};
use sqlx::{PgPool, SqlitePool};

pub use sdkwork_routes_payment_backend_api::{
    BackendPaymentMethodListQuery, CommerceBackendPaymentAdminStore,
};

use crate::with_backend_request_identity;

pub fn backend_payment_admin_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    with_backend_request_identity(payment_backend_admin_router_with_sqlite_pool(pool))
}

pub fn backend_payment_admin_router_with_postgres_pool(pool: PgPool) -> Router {
    with_backend_request_identity(payment_backend_admin_router_with_postgres_pool(pool))
}

pub fn backend_payment_admin_router_with_store(
    store: Arc<dyn CommerceBackendPaymentAdminStore>,
) -> Router {
    with_backend_request_identity(build_backend_payment_admin_router(store))
}
