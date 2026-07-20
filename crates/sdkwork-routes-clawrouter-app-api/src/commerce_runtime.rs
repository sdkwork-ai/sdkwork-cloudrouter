//! Federated commerce T1 capability route wiring for Claw Router database-backed runtime.
//!
//! The unified runtime mounts commerce routes and registers each capability-owned database module
//! against the shared pool so schema, migration, and seed lifecycle remain aligned with routing.

use std::sync::Arc;

use axum::Router;
use sdkwork_claw_config::DatabaseConfig;
use sdkwork_claw_http::{
    materialize_federated_database_env_from_claw_config,
    merge_federated_app_capability_router_with_optional_auth, AppSubjectBoundaryConfig,
};
use sdkwork_database_lifecycle::RegistryLifecycleOrchestrator;
use sdkwork_database_spi::DatabaseModuleRegistry;
use sdkwork_database_sqlx::DatabasePool;
use sdkwork_payment_service_host::PaymentServiceHost;
use sdkwork_routes_account_app_api::{
    app_account_wallet_router_with_postgres_pool, app_account_wallet_router_with_sqlite_pool,
};
use sdkwork_routes_membership_app_api::{
    app_membership_router_with_postgres_pool, app_membership_router_with_sqlite_pool,
};
use sdkwork_routes_payment_app_api::routes::build_payment_app_router;
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
    // Bootstrap all federated capability databases on the shared pool using
    // convention-over-configuration: each `*-database-host` crate exports a
    // `database_module()` function, the host registers them all into a single
    // `DatabaseModuleRegistry`, and `RegistryLifecycleOrchestrator` runs
    // init + migrate + seed once per module — respecting each module's own
    // manifest/env lifecycle options. No per-capability manual wiring needed.
    bootstrap_federated_databases(payment.database_pool()).await?;
    let membership_router = build_membership_router_from_pool(payment.database_pool());
    Ok(merge_federated_app_capability_router_with_optional_auth(
        router,
        membership_router,
        subject_boundary_config,
    ))
}

/// Register all federated `*-database-host` modules and bootstrap them on the
/// shared pool.
///
/// To add a new capability database, add the `*-database-host` crate as a
/// Cargo dependency and add one `.register(...)` line below. The framework
/// handles init, migration, and seeding automatically based on each module's
/// own `database.manifest.json` and env overrides.
async fn bootstrap_federated_databases(pool: &DatabasePool) -> Result<(), String> {
    let payment_module = sdkwork_payment_database_host::database_module()
        .map_err(|e| format!("load payment database module failed: {e}"))?;
    let order_module = sdkwork_order_gateway_assembly::ApiAssembly::database_module()
        .map_err(|e| format!("load order database module failed: {e}"))?;
    let membership_module = sdkwork_membership_database_host::database_module()
        .map_err(|e| format!("load membership database module failed: {e}"))?;
    let registry = DatabaseModuleRegistry::builder()
        .register(payment_module)
        .map_err(|e| format!("register payment database module failed: {e}"))?
        .register(order_module)
        .map_err(|e| format!("register order database module failed: {e}"))?
        .register(membership_module)
        .map_err(|e| format!("register membership database module failed: {e}"))?
        .build();
    let orchestrator = RegistryLifecycleOrchestrator::new(pool.clone(), registry)
        .with_applied_by("sdkwork-clawrouter-commerce");
    let results = orchestrator
        .bootstrap_all_from_env()
        .await
        .map_err(|e| format!("bootstrap federated databases failed: {e}"))?;
    for (module_id, migrations, seeds) in &results {
        tracing::info!(
            target: "sdkwork.clawrouter.commerce.database",
            module_id = %module_id,
            migrations = migrations,
            seeds = seeds,
            "federated database module bootstrapped",
        );
    }
    Ok(())
}

async fn wire_commerce_app_router(payment: Arc<PaymentServiceHost>) -> Result<Router, String> {
    let promotion_router = build_promotion_router_from_payment_pool(payment.database_pool())?;
    let account_wallet_router =
        build_account_wallet_router_from_payment_pool(payment.database_pool())?;
    let order_assembly = sdkwork_order_gateway_assembly::ApiAssembly::from_database_pool(
        payment.database_pool().clone(),
    )
    .await?;

    Ok(Router::new()
        .merge(build_payment_app_router(payment))
        .merge(promotion_router)
        .merge(account_wallet_router)
        .merge(order_assembly.router))
}

fn build_membership_router_from_pool(pool: &DatabasePool) -> Router {
    match pool {
        DatabasePool::Postgres(pool, _) => app_membership_router_with_postgres_pool(pool.clone()),
        DatabasePool::Sqlite(pool, _) => app_membership_router_with_sqlite_pool(pool.clone()),
    }
}

fn build_promotion_router_from_payment_pool(pool: &DatabasePool) -> Result<Router, String> {
    Ok(match pool {
        DatabasePool::Postgres(pool, _) => app_promotion_router_with_postgres_pool(pool.clone()),
        DatabasePool::Sqlite(pool, _) => app_promotion_router_with_sqlite_pool(pool.clone()),
    })
}

fn build_account_wallet_router_from_payment_pool(pool: &DatabasePool) -> Result<Router, String> {
    Ok(match pool {
        DatabasePool::Postgres(pool, _) => {
            app_account_wallet_router_with_postgres_pool(pool.clone())
        }
        DatabasePool::Sqlite(pool, _) => app_account_wallet_router_with_sqlite_pool(pool.clone()),
    })
}

#[cfg(test)]
mod tests {
    #[test]
    fn federated_commerce_consumes_complete_order_gateway_assembly() {
        let source = include_str!("commerce_runtime.rs");

        let payment = source
            .find("sdkwork_payment_database_host::database_module()")
            .expect("payment database module registration");
        let order = source
            .find("sdkwork_order_gateway_assembly::ApiAssembly::database_module()")
            .expect("order assembly database module registration");
        let membership = source
            .find("sdkwork_membership_database_host::database_module()")
            .expect("membership database module registration");
        assert!(
            payment < order,
            "payment database must bootstrap before order"
        );
        assert!(
            order < membership,
            "order database must bootstrap before membership"
        );
        assert!(source.contains(".register(payment_module)"));
        assert!(source.contains(".register(order_module)"));
        assert!(source.contains(".register(membership_module)"));
        assert!(source
            .contains("sdkwork_order_gateway_assembly::ApiAssembly::from_database_pool("));
        let forbidden_direct_route_crate = ["sdkwork_routes_order", "_app_api::"].concat();
        assert!(!source.contains(&forbidden_direct_route_crate));
    }
}
