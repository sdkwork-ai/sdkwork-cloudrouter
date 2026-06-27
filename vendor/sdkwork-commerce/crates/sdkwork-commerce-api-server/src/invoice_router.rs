use std::sync::Arc;

use axum::Router;
use sdkwork_commerce_invoice_repository_sqlx::{
    PostgresCommerceInvoiceStore, SqliteCommerceInvoiceStore,
};
use sdkwork_routes_invoice_app_api::build_app_invoice_router;
use sqlx::{PgPool, SqlitePool};

pub use sdkwork_routes_invoice_app_api::{CommerceInvoiceFuture, CommerceInvoiceStore};

use crate::with_request_identity;

pub fn app_invoice_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    app_invoice_router_with_store(Arc::new(SqliteCommerceInvoiceStore::new(pool)))
}

pub fn app_invoice_router_with_postgres_pool(pool: PgPool) -> Router {
    app_invoice_router_with_store(Arc::new(PostgresCommerceInvoiceStore::new(pool)))
}

pub fn app_invoice_router_with_store(store: Arc<dyn CommerceInvoiceStore>) -> Router {
    with_request_identity(build_app_invoice_router(store))
}
