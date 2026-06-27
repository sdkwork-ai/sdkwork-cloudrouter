use sdkwork_clawrouter_router_service::infrastructure::sql::iam_scope_resolver::{
    resolve_sqlite_iam_scope, IamScopeResolveOptions,
};
use sdkwork_clawrouter_router_service_test_support::repair_sqlite_pool;

#[tokio::test]
async fn sqlite_iam_scope_resolver_defaults_to_bootstrap_subject() {
    let pool = repair_sqlite_pool().await;

    let (tenant_id, organization_id) =
        resolve_sqlite_iam_scope(&pool, None, None, IamScopeResolveOptions::default())
            .await
            .expect("bootstrap IAM subject must resolve from installed sqlite catalog");

    assert_eq!(100_001, tenant_id);
    assert_eq!(0, organization_id);
}

#[tokio::test]
async fn sqlite_iam_scope_resolver_resolves_bootstrap_codes_explicitly() {
    let pool = repair_sqlite_pool().await;

    let (tenant_id, organization_id) = resolve_sqlite_iam_scope(
        &pool,
        Some("SDKWORK"),
        Some("root"),
        IamScopeResolveOptions::default(),
    )
    .await
    .expect("bootstrap IAM codes must resolve from installed sqlite catalog");

    assert_eq!(100_001, tenant_id);
    assert_eq!(0, organization_id);
}
