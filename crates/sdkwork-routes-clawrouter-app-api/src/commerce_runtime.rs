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
    let order_module = sdkwork_api_order_assembly::ApiAssembly::database_module()
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
    let order_assembly = sdkwork_api_order_assembly::ApiAssembly::from_database_pool(
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
    use std::fs;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    use axum::body::{to_bytes, Body};
    use axum::http::{header, Method, Request, StatusCode};
    use axum::Router;
    use sdkwork_claw_http::{attach_trusted_request_subject, TrustedRequestSubject};
    use sdkwork_database_config::{DatabaseConfig, DatabaseEngine};
    use sdkwork_database_sqlx::create_pool_from_config;
    use sdkwork_web_core::{
        ServerRequestId, WebApiSurface, WebAuthLevel, WebAuthMode, WebDeploymentMode,
        WebEnvironment, WebLoginScope, WebRequestContext, WebRequestPrincipal, WebTransportFacts,
    };
    use serde_json::{json, Value};
    use tower::ServiceExt;

    use super::{bootstrap_federated_databases, build_membership_router_from_pool};

    static DATABASE_COUNTER: AtomicU64 = AtomicU64::new(0);

    #[test]
    fn federated_commerce_consumes_complete_order_gateway_assembly() {
        let source = include_str!("commerce_runtime.rs");

        let payment = source
            .find("sdkwork_payment_database_host::database_module()")
            .expect("payment database module registration");
        let order = source
            .find("sdkwork_api_order_assembly::ApiAssembly::database_module()")
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
        assert!(source.contains("sdkwork_api_order_assembly::ApiAssembly::from_database_pool("));
        let forbidden_direct_route_crate = ["sdkwork_routes_order", "_app_api::"].concat();
        assert!(!source.contains(&forbidden_direct_route_crate));
    }

    #[tokio::test]
    async fn federated_membership_catalog_and_purchase_intent_are_bootstrapped_together() {
        let database_path = unique_database_path();
        let database_url = format!(
            "sqlite://{}",
            database_path.to_string_lossy().replace('\\', "/")
        );
        let pool = create_pool_from_config(DatabaseConfig {
            engine: DatabaseEngine::Sqlite,
            url: database_url,
            max_connections: 1,
            ..Default::default()
        })
        .await
        .expect("commerce sqlite pool");

        bootstrap_federated_databases(&pool)
            .await
            .expect("federated commerce database lifecycle");
        let order_assembly =
            sdkwork_api_order_assembly::ApiAssembly::from_database_pool(pool.clone())
                .await
                .expect("order API assembly");
        let router = order_assembly
            .router
            .merge(build_membership_router_from_pool(&pool));

        let packages = request_json(
            router.clone(),
            Method::GET,
            "/app/v3/api/memberships/packages?page=1&page_size=200",
            None,
            None,
        )
        .await;
        assert_eq!(StatusCode::OK, packages.0, "{}", packages.1);
        let package_id = packages.1["data"]["items"]
            .as_array()
            .and_then(|items| items.first())
            .and_then(|item| item["id"].as_i64())
            .unwrap_or_else(|| panic!("membership catalog was not seeded: {}", packages.1));
        let body = json!({
            "action": "purchase",
            "packageId": package_id.to_string(),
            "paymentMethod": "wechat_pay",
            "paymentProduct": "mobile_cashier_h5",
            "source": "clawrouter-commerce-regression",
        });

        let created = request_json(
            router.clone(),
            Method::POST,
            "/app/v3/api/memberships/orders",
            Some(body.clone()),
            Some("membership-purchase-first"),
        )
        .await;
        assert_eq!(StatusCode::CREATED, created.0, "{}", created.1);
        assert_eq!(false, created.1["data"]["item"]["reused"]);

        let reused = request_json(
            router,
            Method::POST,
            "/app/v3/api/memberships/orders",
            Some(body),
            Some("membership-purchase-second"),
        )
        .await;
        assert_eq!(StatusCode::CREATED, reused.0, "{}", reused.1);
        assert_eq!(true, reused.1["data"]["item"]["reused"]);
        assert_eq!(
            created.1["data"]["item"]["orderId"],
            reused.1["data"]["item"]["orderId"]
        );

        pool.close().await;
        remove_database_files(&database_path);
    }

    async fn request_json(
        router: Router,
        method: Method,
        uri: &str,
        body: Option<Value>,
        idempotency_key: Option<&str>,
    ) -> (StatusCode, Value) {
        let method_name = method.as_str().to_owned();
        let mut builder = Request::builder().method(method).uri(uri);
        if body.is_some() {
            builder = builder.header(header::CONTENT_TYPE, "application/json");
        }
        if let Some(idempotency_key) = idempotency_key {
            builder = builder.header("Idempotency-Key", idempotency_key);
        }
        let mut request = builder
            .body(body.map_or_else(Body::empty, |value| Body::from(value.to_string())))
            .expect("commerce request");
        request.extensions_mut().insert(WebRequestContext {
            request_id: ServerRequestId(
                idempotency_key
                    .unwrap_or("membership-catalog-request")
                    .to_owned(),
            ),
            api_surface: WebApiSurface::AppApi,
            auth_mode: WebAuthMode::DualToken,
            transport: WebTransportFacts {
                path: uri.to_owned(),
                method: method_name,
                auth_token_present: true,
                access_token_present: true,
                api_key_present: false,
                ingress_token_present: false,
                oauth_bearer_present: false,
                agent_token_present: false,
            },
            principal: Some(
                WebRequestPrincipal::builder()
                    .tenant_id("100001")
                    .organization_id(Some("0".to_owned()))
                    .user_id("30")
                    .login_scope(WebLoginScope::Tenant)
                    .session_id(Some("commerce-regression-session".to_owned()))
                    .app_id("sdkwork-clawrouter")
                    .environment(WebEnvironment::Test)
                    .deployment_mode(WebDeploymentMode::Local)
                    .auth_level(WebAuthLevel::Password)
                    .build(),
            ),
            locale: None,
            client_kind: None,
            operation: None,
            trace_id: None,
            idempotency_key: idempotency_key.map(str::to_owned),
        });
        attach_trusted_request_subject(
            &mut request,
            TrustedRequestSubject {
                tenant_id: 100_001,
                organization_id: 0,
                user_id: 30,
                operator_id: 30,
                operator_type: 1,
            },
        );
        let response = router.oneshot(request).await.expect("commerce response");
        let status = response.status();
        let bytes = to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("commerce response body");
        let json = serde_json::from_slice(&bytes).expect("commerce response json");
        (status, json)
    }

    fn unique_database_path() -> std::path::PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock")
            .as_nanos();
        let counter = DATABASE_COUNTER.fetch_add(1, Ordering::Relaxed);
        std::env::temp_dir().join(format!(
            "sdkwork-clawrouter-commerce-{}-{nonce}-{counter}.sqlite",
            std::process::id()
        ))
    }

    fn remove_database_files(path: &std::path::Path) {
        for suffix in ["", "-wal", "-shm", "-journal"] {
            let candidate = std::path::PathBuf::from(format!("{}{suffix}", path.display()));
            if candidate.exists() {
                fs::remove_file(candidate).expect("remove commerce sqlite file");
            }
        }
    }
}
