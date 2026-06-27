use std::sync::Arc;

use axum::Router;
use sdkwork_commerce_account_repository_sqlx::{
    PostgresCommerceAccountStore, SqliteCommerceAccountStore,
};
use sdkwork_routes_account_app_api::build_app_account_wallet_router;
use sqlx::{PgPool, SqlitePool};

pub use sdkwork_routes_account_app_api::{CommerceAccountWalletStore, CommerceWalletFuture};

use crate::with_request_identity;

pub fn app_account_wallet_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    app_account_wallet_router_with_store(Arc::new(SqliteCommerceAccountStore::new(pool)))
}

pub fn app_account_wallet_router_with_postgres_pool(pool: PgPool) -> Router {
    app_account_wallet_router_with_store(Arc::new(PostgresCommerceAccountStore::new(pool)))
}

pub fn app_account_wallet_router_with_store(store: Arc<dyn CommerceAccountWalletStore>) -> Router {
    with_request_identity(build_app_account_wallet_router(store))
}
