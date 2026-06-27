use std::sync::Arc;

use axum::Router;
use sdkwork_commerce_payment_repository_sqlx::{
    PostgresCommerceRechargeStore, SqliteCommerceRechargeStore,
};
use sdkwork_routes_payment_app_api::build_app_recharge_checkout_router;
use sqlx::{PgPool, SqlitePool};

pub use sdkwork_routes_payment_app_api::{
    CommerceRechargeCheckoutFuture, CommerceRechargeCheckoutStore,
};

use crate::with_request_identity;

pub fn app_recharge_checkout_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    app_recharge_checkout_router_with_store(Arc::new(SqliteCommerceRechargeStore::new(pool)))
}

pub fn app_recharge_checkout_router_with_postgres_pool(pool: PgPool) -> Router {
    app_recharge_checkout_router_with_store(Arc::new(PostgresCommerceRechargeStore::new(pool)))
}

pub fn app_recharge_checkout_router_with_store(
    store: Arc<dyn CommerceRechargeCheckoutStore>,
) -> Router {
    with_request_identity(build_app_recharge_checkout_router(store))
}
