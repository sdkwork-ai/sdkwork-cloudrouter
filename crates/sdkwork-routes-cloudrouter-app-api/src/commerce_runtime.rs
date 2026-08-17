//! Federated commerce T1 capability route wiring for Cloud Router database-backed runtime.
//!
//! The unified runtime mounts commerce routes and registers each capability-owned database module
//! against the shared pool so schema, migration, and seed lifecycle remain aligned with routing.

use std::sync::Arc;

use axum::Router;
use sdkwork_cloudrouter_config::DatabaseConfig;
use sdkwork_cloudrouter_http::{
    materialize_federated_database_env_from_config,
    merge_federated_app_capability_router_with_optional_auth, AppSubjectBoundaryConfig,
};
use sdkwork_database_lifecycle::RegistryLifecycleOrchestrator;
use sdkwork_database_spi::DatabaseModuleRegistry;
use sdkwork_database_sqlx::DatabasePool;
use sdkwork_payment_service_host::PaymentServiceHost;

pub async fn merge_federated_commerce_app_routers(
    router: Router,
    database_config: &DatabaseConfig,
    subject_boundary_config: AppSubjectBoundaryConfig,
) -> Result<Router, String> {
    materialize_federated_database_env_from_config(database_config);
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
    // init + migrate + seed once per module while respecting each module's own
    // manifest/env lifecycle options. No per-capability manual wiring needed.
    bootstrap_federated_databases(payment.database_pool()).await?;
    let membership_router = build_membership_router_from_pool(payment.database_pool()).await?;
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
    let order_module = sdkwork_api_order_assembly::OrderAssemblyContract::database_module()
        .map_err(|e| format!("load order database module failed: {e}"))?;
    let membership_module = sdkwork_membership_database_host::database_module()
        .map_err(|e| format!("load membership database module failed: {e}"))?;
    let promotion_module = sdkwork_promotion_database_host::database_module()
        .map_err(|e| format!("load promotion database module failed: {e}"))?;
    let partner_module = sdkwork_partner_database_host::database_module()
        .map_err(|e| format!("load partner database module failed: {e}"))?;
    let merchandise_module = sdkwork_merchandise_database_host::database_module()
        .map_err(|e| format!("load merchandise database module failed: {e}"))?;
    let shop_module = sdkwork_shop_database_host::database_module()
        .map_err(|e| format!("load shop database module failed: {e}"))?;
    let catalog_module = sdkwork_catalog_database_host::database_module()
        .map_err(|e| format!("load catalog database module failed: {e}"))?;
    let inventory_module = sdkwork_inventory_database_host::database_module()
        .map_err(|e| format!("load inventory database module failed: {e}"))?;
    let registry = DatabaseModuleRegistry::builder()
        .register(payment_module)
        .map_err(|e| format!("register payment database module failed: {e}"))?
        .register(order_module)
        .map_err(|e| format!("register order database module failed: {e}"))?
        .register(membership_module)
        .map_err(|e| format!("register membership database module failed: {e}"))?
        .register(promotion_module)
        .map_err(|e| format!("register promotion database module failed: {e}"))?
        .register(partner_module)
        .map_err(|e| format!("register partner database module failed: {e}"))?
        .register(merchandise_module)
        .map_err(|e| format!("register merchandise database module failed: {e}"))?
        .register(shop_module)
        .map_err(|e| format!("register shop database module failed: {e}"))?
        .register(catalog_module)
        .map_err(|e| format!("register catalog database module failed: {e}"))?
        .register(inventory_module)
        .map_err(|e| format!("register inventory database module failed: {e}"))?
        .build();
    let orchestrator = RegistryLifecycleOrchestrator::new(pool.clone(), registry)
        .with_applied_by("sdkwork-cloudrouter-commerce");
    let results = orchestrator
        .bootstrap_all_from_env()
        .await
        .map_err(|e| format!("bootstrap federated databases failed: {e}"))?;
    for (module_id, migrations, seeds) in &results {
        tracing::info!(
            target: "sdkwork.cloudrouter.commerce.database",
            module_id = %module_id,
            migrations = migrations,
            seeds = seeds,
            "federated database module bootstrapped",
        );
    }
    Ok(())
}

async fn wire_commerce_app_router(payment: Arc<PaymentServiceHost>) -> Result<Router, String> {
    // Federated commerce app surfaces are dependency-owned. Each enters
    // through its dependency API assembly entrypoint on the shared commerce
    // pool — not through direct `sdkwork-routes-*` imports — per
    // API_ASSEMBLY_SPEC §3/§6.1.
    let payment_assembly =
        sdkwork_api_payment_assembly::assemble_federated_app_api_contribution(payment.clone())
            .await?;
    let promotion_assembly =
        sdkwork_api_promotion_assembly::assemble_app_api_contribution_with_pool(
            payment.database_pool(),
        )
        .await?;
    let account_assembly = sdkwork_api_account_assembly::assemble_app_api_contribution_with_pool(
        payment.database_pool(),
    )
    .await?;
    let order_assembly = sdkwork_api_order_assembly::assemble_app_api_contribution_with_pool(
        payment.database_pool().clone(),
    )
    .await?;

    Ok(Router::new()
        .merge(payment_assembly.router)
        .merge(promotion_assembly.router)
        .merge(account_assembly.router)
        .merge(order_assembly.router))
}

async fn build_membership_router_from_pool(pool: &DatabasePool) -> Result<Router, String> {
    let contribution =
        sdkwork_api_membership_assembly::assemble_app_api_contribution_with_pool(pool)
            .await
            .map_err(|error| format!("compose membership app-api contribution failed: {error}"))?;
    Ok(contribution.router)
}

#[cfg(test)]
mod tests {
    #[test]
    fn federated_commerce_consumes_order_app_api_contribution() {
        let source = include_str!("commerce_runtime.rs");

        let payment = source
            .find("sdkwork_payment_database_host::database_module()")
            .expect("payment database module registration");
        let order = source
            .find("sdkwork_api_order_assembly::OrderAssemblyContract::database_module()")
            .expect("order assembly database module registration");
        let membership = source
            .find("sdkwork_membership_database_host::database_module()")
            .expect("membership database module registration");
        let promotion = source
            .find("sdkwork_promotion_database_host::database_module()")
            .expect("promotion database module registration");
        let partner = source
            .find("sdkwork_partner_database_host::database_module()")
            .expect("partner database module registration");
        let merchandise = source
            .find("sdkwork_merchandise_database_host::database_module()")
            .expect("merchandise database module registration");
        let shop = source
            .find("sdkwork_shop_database_host::database_module()")
            .expect("shop database module registration");
        let catalog = source
            .find("sdkwork_catalog_database_host::database_module()")
            .expect("catalog database module registration");
        let inventory = source
            .find("sdkwork_inventory_database_host::database_module()")
            .expect("inventory database module registration");
        assert!(
            payment < order,
            "payment database must bootstrap before order"
        );
        assert!(
            order < membership,
            "order database must bootstrap before membership"
        );
        assert!(
            membership < promotion,
            "membership database must bootstrap before promotion"
        );
        assert!(
            promotion < partner,
            "promotion database must bootstrap before partner"
        );
        assert!(
            partner < merchandise,
            "partner database must bootstrap before merchandise"
        );
        assert!(
            merchandise < shop,
            "merchandise database must bootstrap before shop"
        );
        assert!(
            shop < catalog,
            "shop database must bootstrap before catalog"
        );
        assert!(
            catalog < inventory,
            "catalog database must bootstrap before inventory"
        );
        assert!(source.contains(".register(payment_module)"));
        assert!(source.contains(".register(order_module)"));
        assert!(source.contains(".register(membership_module)"));
        assert!(source.contains(".register(merchandise_module)"));
        assert!(source.contains(".register(shop_module)"));
        assert!(source.contains(".register(catalog_module)"));
        assert!(source.contains(".register(inventory_module)"));
        assert!(
            source.contains("sdkwork_api_order_assembly::assemble_app_api_contribution_with_pool(")
        );
        assert!(source
            .contains("sdkwork_api_payment_assembly::assemble_federated_app_api_contribution("));
        assert!(source
            .contains("sdkwork_api_promotion_assembly::assemble_app_api_contribution_with_pool("));
        assert!(source
            .contains("sdkwork_api_account_assembly::assemble_app_api_contribution_with_pool("));
        assert!(source
            .contains("sdkwork_api_membership_assembly::assemble_app_api_contribution_with_pool("));
        let forbidden_direct_route_crates = [
            "sdkwork_routes_order",
            "sdkwork_routes_payment",
            "sdkwork_routes_promotion",
            "sdkwork_routes_account",
            "sdkwork_routes_membership",
            "_app_api::",
        ]
        .concat();
        assert!(!source.contains(&forbidden_direct_route_crates));
    }
}
