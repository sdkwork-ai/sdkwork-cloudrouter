use std::sync::Arc;

use axum::Router;
use sdkwork_commerce_storage_repository_sqlx::{
    PostgresCommerceCatalogStore, PostgresCommerceShopStore, SqliteCommerceCatalogStore,
    SqliteCommerceShopStore,
};
use sdkwork_routes_merchandise_app_api::CommerceCatalogStore;
use sdkwork_routes_shop_app_api::build_app_shop_router;
use sqlx::{PgPool, SqlitePool};

pub use sdkwork_routes_shop_app_api::{CommerceShopFuture, CommerceShopStore};

use crate::with_request_identity;

pub fn app_shop_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    app_shop_router_with_stores(
        Arc::new(SqliteCommerceShopStore::new(pool.clone())),
        Arc::new(SqliteCommerceCatalogStore::new(pool)),
    )
}

pub fn app_shop_router_with_postgres_pool(pool: PgPool) -> Router {
    app_shop_router_with_stores(
        Arc::new(PostgresCommerceShopStore::new(pool.clone())),
        Arc::new(PostgresCommerceCatalogStore::new(pool)),
    )
}

pub fn app_shop_router_with_stores(
    shop: Arc<dyn CommerceShopStore>,
    catalog: Arc<dyn CommerceCatalogStore>,
) -> Router {
    with_request_identity(build_app_shop_router(shop, catalog))
}
