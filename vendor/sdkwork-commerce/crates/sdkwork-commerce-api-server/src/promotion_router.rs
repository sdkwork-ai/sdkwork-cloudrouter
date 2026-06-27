use std::sync::Arc;

use axum::Router;
use sdkwork_commerce_promotion_repository_sqlx::{
    PostgresCommercePromotionStore, SqliteCommercePromotionStore,
};
use sdkwork_routes_promotion_app_api::build_app_promotion_router;
use sqlx::{PgPool, SqlitePool};

pub use sdkwork_routes_promotion_app_api::{CommercePromotionFuture, CommercePromotionStore};

use crate::with_request_identity;

pub fn app_promotion_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    app_promotion_router_with_store(Arc::new(SqliteCommercePromotionStore::new(pool)))
}

pub fn app_promotion_router_with_postgres_pool(pool: PgPool) -> Router {
    app_promotion_router_with_store(Arc::new(PostgresCommercePromotionStore::new(pool)))
}

pub fn app_promotion_router_with_store(store: Arc<dyn CommercePromotionStore>) -> Router {
    with_request_identity(build_app_promotion_router(store))
}
