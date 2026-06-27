use std::sync::Arc;

use axum::Router;
use sdkwork_commerce_account_repository_sqlx::{
    PostgresCommerceBillingHistoryStore, SqliteCommerceBillingHistoryStore,
};
use sdkwork_routes_account_app_api::build_app_billing_history_router;
use sqlx::{PgPool, SqlitePool};

pub use sdkwork_routes_account_app_api::{
    CommerceBillingHistoryFuture, CommerceBillingHistoryStore,
};

use crate::with_request_identity;

pub fn app_billing_history_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    app_billing_history_router_with_store(Arc::new(SqliteCommerceBillingHistoryStore::new(pool)))
}

pub fn app_billing_history_router_with_postgres_pool(pool: PgPool) -> Router {
    app_billing_history_router_with_store(Arc::new(PostgresCommerceBillingHistoryStore::new(pool)))
}

pub fn app_billing_history_router_with_store(
    store: Arc<dyn CommerceBillingHistoryStore>,
) -> Router {
    with_request_identity(build_app_billing_history_router(store))
}
