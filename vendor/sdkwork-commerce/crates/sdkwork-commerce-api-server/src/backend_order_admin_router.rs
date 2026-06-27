use axum::Router;
use sdkwork_routes_order_backend_api::{
    backend_order_admin_router_with_postgres_pool as order_backend_admin_router_with_postgres_pool,
    backend_order_admin_router_with_sqlite_pool as order_backend_admin_router_with_sqlite_pool,
};
use sqlx::{PgPool, SqlitePool};

use crate::with_backend_request_identity;

pub fn backend_order_admin_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    with_backend_request_identity(order_backend_admin_router_with_sqlite_pool(pool))
}

pub fn backend_order_admin_router_with_postgres_pool(pool: PgPool) -> Router {
    with_backend_request_identity(order_backend_admin_router_with_postgres_pool(pool))
}
