//! T0 platform composition: merges commerce capability HTTP routers with membership routes.
//!
//! Capability repos export individual routers; this crate belongs in `sdkwork-commerce` only.

use axum::Router;
use sdkwork_commerce_api_server::{
    app_account_wallet_router_with_postgres_pool, app_account_wallet_router_with_sqlite_pool,
    app_after_sales_router_with_postgres_pool, app_after_sales_router_with_sqlite_pool,
    app_billing_history_router_with_postgres_pool, app_billing_history_router_with_sqlite_pool,
    app_catalog_router_with_postgres_pool, app_catalog_router_with_sqlite_pool,
    app_checkout_router_with_postgres_pool, app_checkout_router_with_sqlite_pool,
    app_fulfillment_router_with_postgres_pool, app_fulfillment_router_with_sqlite_pool,
    app_invoice_router_with_postgres_pool, app_invoice_router_with_sqlite_pool,
    app_merchant_inventory_router_with_postgres_pool,
    app_merchant_inventory_router_with_sqlite_pool, app_order_router_with_postgres_pool,
    app_order_router_with_sqlite_pool, app_payment_intent_router_with_postgres_pool,
    app_payment_intent_router_with_sqlite_pool, app_payment_router_with_postgres_pool,
    app_payment_router_with_sqlite_pool, app_promotion_router_with_postgres_pool,
    app_promotion_router_with_sqlite_pool, app_recharge_checkout_router_with_postgres_pool,
    app_recharge_checkout_router_with_sqlite_pool, app_refund_router_with_postgres_pool,
    app_refund_router_with_sqlite_pool, app_shipment_router_with_postgres_pool,
    app_shipment_router_with_sqlite_pool, app_shop_router_with_postgres_pool,
    app_shop_router_with_sqlite_pool, backend_catalog_router_with_postgres_pool,
    backend_catalog_router_with_sqlite_pool, backend_inventory_router_with_postgres_pool,
    backend_inventory_router_with_sqlite_pool, backend_order_admin_router_with_postgres_pool,
    backend_order_admin_router_with_sqlite_pool, backend_payment_admin_router_with_postgres_pool,
    backend_payment_admin_router_with_sqlite_pool,
    backend_payment_intent_router_with_postgres_pool,
    backend_payment_intent_router_with_sqlite_pool, backend_shop_admin_router_with_postgres_pool,
    backend_shop_admin_router_with_sqlite_pool, commerce_health_router_with_postgres_pool,
    commerce_health_router_with_sqlite_pool, commerce_public_path_prefixes, manifest_stub_router,
    COMMERCE_APP_HTTP_ROUTES,
};
use sdkwork_commerce_membership_repository_sqlx::{
    admin_membership_router_with_postgres_pool, admin_membership_router_with_sqlite_pool,
    app_membership_router_with_postgres_pool, app_membership_router_with_sqlite_pool,
};
use sdkwork_iam_web_adapter::{build_web_framework_layer, IamWebRequestContextResolver};
use sdkwork_web_axum::with_web_request_context;
use sdkwork_web_core::HttpRouteManifest;
use sqlx::{PgPool, SqlitePool};

pub fn commerce_app_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    commerce_app_router_with_sqlite_pool_inner(pool.clone())
        .merge(app_membership_router_with_sqlite_pool(pool))
}

pub fn commerce_app_router_with_postgres_pool(pool: PgPool) -> Router {
    commerce_app_router_with_postgres_pool_inner(pool.clone())
        .merge(app_membership_router_with_postgres_pool(pool))
}

pub fn commerce_backend_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    manifest_stub_router::backend_manifest_stub_router()
        .merge(backend_catalog_router_with_sqlite_pool(pool.clone()))
        .merge(backend_inventory_router_with_sqlite_pool(pool.clone()))
        .merge(backend_order_admin_router_with_sqlite_pool(pool.clone()))
        .merge(backend_payment_admin_router_with_sqlite_pool(pool.clone()))
        .merge(backend_payment_intent_router_with_sqlite_pool(pool.clone()))
        .merge(backend_shop_admin_router_with_sqlite_pool(pool.clone()))
        .merge(admin_membership_router_with_sqlite_pool(pool))
}

pub fn commerce_backend_router_with_postgres_pool(pool: PgPool) -> Router {
    manifest_stub_router::backend_manifest_stub_router()
        .merge(backend_catalog_router_with_postgres_pool(pool.clone()))
        .merge(backend_inventory_router_with_postgres_pool(pool.clone()))
        .merge(backend_order_admin_router_with_postgres_pool(pool.clone()))
        .merge(backend_payment_admin_router_with_postgres_pool(
            pool.clone(),
        ))
        .merge(backend_payment_intent_router_with_postgres_pool(
            pool.clone(),
        ))
        .merge(backend_shop_admin_router_with_postgres_pool(pool.clone()))
        .merge(admin_membership_router_with_postgres_pool(pool))
}

pub fn commerce_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    commerce_health_router_with_sqlite_pool(pool.clone())
        .merge(commerce_app_router_with_sqlite_pool(pool.clone()))
        .merge(commerce_backend_router_with_sqlite_pool(pool))
}

pub fn commerce_router_with_postgres_pool(pool: PgPool) -> Router {
    commerce_health_router_with_postgres_pool(pool.clone())
        .merge(commerce_app_router_with_postgres_pool(pool.clone()))
        .merge(commerce_backend_router_with_postgres_pool(pool))
}

pub async fn commerce_router_with_sqlite_pool_and_web_framework(pool: SqlitePool) -> Router {
    wrap_commerce_router_with_web_framework_from_env(commerce_router_with_sqlite_pool(pool)).await
}

pub async fn commerce_router_with_postgres_pool_and_web_framework(pool: PgPool) -> Router {
    wrap_commerce_router_with_web_framework_from_env(commerce_router_with_postgres_pool(pool)).await
}

fn commerce_app_router_with_sqlite_pool_inner(pool: SqlitePool) -> Router {
    let stub_router = manifest_stub_router::app_manifest_stub_router();
    stub_router
        .merge(app_account_wallet_router_with_sqlite_pool(pool.clone()))
        .merge(app_after_sales_router_with_sqlite_pool(pool.clone()))
        .merge(app_billing_history_router_with_sqlite_pool(pool.clone()))
        .merge(app_catalog_router_with_sqlite_pool(pool.clone()))
        .merge(app_checkout_router_with_sqlite_pool(pool.clone()))
        .merge(app_fulfillment_router_with_sqlite_pool(pool.clone()))
        .merge(app_invoice_router_with_sqlite_pool(pool.clone()))
        .merge(app_merchant_inventory_router_with_sqlite_pool(pool.clone()))
        .merge(app_order_router_with_sqlite_pool(pool.clone()))
        .merge(app_payment_router_with_sqlite_pool(pool.clone()))
        .merge(app_payment_intent_router_with_sqlite_pool(pool.clone()))
        .merge(app_promotion_router_with_sqlite_pool(pool.clone()))
        .merge(app_recharge_checkout_router_with_sqlite_pool(pool.clone()))
        .merge(app_refund_router_with_sqlite_pool(pool.clone()))
        .merge(app_shipment_router_with_sqlite_pool(pool.clone()))
        .merge(app_shop_router_with_sqlite_pool(pool.clone()))
}

fn commerce_app_router_with_postgres_pool_inner(pool: PgPool) -> Router {
    let stub_router = manifest_stub_router::app_manifest_stub_router();
    stub_router
        .merge(app_account_wallet_router_with_postgres_pool(pool.clone()))
        .merge(app_after_sales_router_with_postgres_pool(pool.clone()))
        .merge(app_billing_history_router_with_postgres_pool(pool.clone()))
        .merge(app_catalog_router_with_postgres_pool(pool.clone()))
        .merge(app_checkout_router_with_postgres_pool(pool.clone()))
        .merge(app_fulfillment_router_with_postgres_pool(pool.clone()))
        .merge(app_invoice_router_with_postgres_pool(pool.clone()))
        .merge(app_merchant_inventory_router_with_postgres_pool(
            pool.clone(),
        ))
        .merge(app_order_router_with_postgres_pool(pool.clone()))
        .merge(app_payment_router_with_postgres_pool(pool.clone()))
        .merge(app_payment_intent_router_with_postgres_pool(pool.clone()))
        .merge(app_promotion_router_with_postgres_pool(pool.clone()))
        .merge(app_recharge_checkout_router_with_postgres_pool(
            pool.clone(),
        ))
        .merge(app_refund_router_with_postgres_pool(pool.clone()))
        .merge(app_shipment_router_with_postgres_pool(pool.clone()))
        .merge(app_shop_router_with_postgres_pool(pool.clone()))
}

fn wrap_commerce_router_with_web_framework(
    resolver: IamWebRequestContextResolver,
    router: Router,
) -> Router {
    with_web_request_context(
        router,
        build_web_framework_layer(
            resolver,
            HttpRouteManifest::new(COMMERCE_APP_HTTP_ROUTES),
            commerce_public_path_prefixes(),
        ),
    )
}

async fn wrap_commerce_router_with_web_framework_from_env(router: Router) -> Router {
    let resolver = sdkwork_iam_web_adapter::iam_web_request_context_resolver_from_env().await;
    wrap_commerce_router_with_web_framework(resolver, router)
}
