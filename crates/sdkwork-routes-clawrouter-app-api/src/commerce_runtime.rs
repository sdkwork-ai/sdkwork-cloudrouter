//! Federated commerce T1 capability route wiring for Claw Router database-backed runtime.
//!
//! Claw Router's unified database still carries legacy `appbase` commerce tables for recharge,
//! exchange, order, and catalog flows. Account L3 migrations and membership manifest bootstrap
//! stay disabled here until the platform cutover completes.

use std::sync::Arc;

use axum::Router;
use sdkwork_claw_config::DatabaseConfig;
use sdkwork_claw_http::{
    materialize_federated_database_env_from_claw_config,
    merge_federated_app_capability_router, merge_federated_app_capability_router_with_optional_auth,
    AppSubjectBoundaryConfig,
};
use sdkwork_database_sqlx::DatabasePool;
use sdkwork_membership_repository_sqlx::{
    app_membership_router_with_postgres_pool, app_membership_router_with_sqlite_pool,
};
use sdkwork_payment_service_host::PaymentServiceHost;
use sdkwork_routes_membership_app_api::wrap_router_with_web_framework_from_env;
use sdkwork_routes_payment_app_api::routes::build_payment_app_router;
use sdkwork_routes_account_app_api::{
    app_account_wallet_router_with_postgres_pool, app_account_wallet_router_with_sqlite_pool,
};
use sdkwork_routes_order_app_api::{
    app_order_router_with_postgres_pool, app_order_router_with_sqlite_pool,
};
use sdkwork_routes_promotion_app_api::{
    app_promotion_router_with_postgres_pool, app_promotion_router_with_sqlite_pool,
};

pub async fn merge_federated_commerce_app_routers(
    router: Router,
    database_config: &DatabaseConfig,
    subject_boundary_config: AppSubjectBoundaryConfig,
) -> Result<Router, String> {
    materialize_federated_database_env_from_claw_config(database_config);
    let payment = Arc::new(PaymentServiceHost::from_env().await?);
    let commerce_router = wire_commerce_app_router(payment.clone()).await?;
    let router = merge_federated_app_capability_router_with_optional_auth(
        router,
        commerce_router,
        subject_boundary_config.clone(),
    );
    let membership_router =
        build_membership_app_router_with_framework(payment.database_pool()).await;
    Ok(merge_federated_app_capability_router(
        router,
        membership_router,
        subject_boundary_config,
    ))
}

async fn wire_commerce_app_router(payment: Arc<PaymentServiceHost>) -> Result<Router, String> {
    let promotion_router = build_promotion_router_from_payment_pool(payment.database_pool())?;
    let account_wallet_router = build_account_wallet_router_from_payment_pool(payment.database_pool())?;
    let order_router = build_order_router_from_payment_pool(payment.database_pool())?;

    Ok(Router::new()
        .merge(build_payment_app_router(payment))
        .merge(promotion_router)
        .merge(account_wallet_router)
        .merge(order_router))
}

fn build_membership_router_from_pool(pool: &DatabasePool) -> Router {
    match pool {
        DatabasePool::Postgres(pool, _) => app_membership_router_with_postgres_pool(pool.clone()),
        DatabasePool::Sqlite(pool, _) => app_membership_router_with_sqlite_pool(pool.clone()),
    }
}

async fn build_membership_app_router_with_framework(pool: &DatabasePool) -> Router {
    let membership_router = build_membership_router_from_pool(pool);
    wrap_router_with_web_framework_from_env(membership_router).await
}

fn build_promotion_router_from_payment_pool(pool: &DatabasePool) -> Result<Router, String> {
    Ok(match pool {
        DatabasePool::Postgres(pool, _) => app_promotion_router_with_postgres_pool(pool.clone()),
        DatabasePool::Sqlite(pool, _) => app_promotion_router_with_sqlite_pool(pool.clone()),
    })
}

fn build_account_wallet_router_from_payment_pool(pool: &DatabasePool) -> Result<Router, String> {
    Ok(match pool {
        DatabasePool::Postgres(pool, _) => app_account_wallet_router_with_postgres_pool(pool.clone()),
        DatabasePool::Sqlite(pool, _) => app_account_wallet_router_with_sqlite_pool(pool.clone()),
    })
}

fn build_order_router_from_payment_pool(pool: &DatabasePool) -> Result<Router, String> {
    Ok(match pool {
        DatabasePool::Postgres(pool, _) => app_order_router_with_postgres_pool(pool.clone()),
        DatabasePool::Sqlite(pool, _) => app_order_router_with_sqlite_pool(pool.clone()),
    })
}
