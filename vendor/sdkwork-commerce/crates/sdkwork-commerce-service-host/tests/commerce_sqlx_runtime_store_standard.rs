use sdkwork_commerce_contract_service::{
    CapabilityFlag, CommerceRuntimeContext, CommerceRuntimeContextInput, CommerceSurfaceProfile,
    DeploymentMode, Environment,
};
use sdkwork_commerce_service_host::{
    build_commerce_sqlx_runtime_stores, prepare_operation_execution, CommerceAccountRuntimeStore,
    CommerceRuntimeServiceRequest, CommerceSqlxRuntimePool, SqlxCommerceAccountRuntimeStore,
};
use sdkwork_commerce_storage_repository_sqlx::commerce_migrated_sqlite_memory_pool;
use sqlx::SqlitePool;

async fn migrated_pool() -> SqlitePool {
    commerce_migrated_sqlite_memory_pool().await
}

async fn seed_wallet_account(pool: &SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO commerce_account
            (id, tenant_id, organization_id, owner_user_id, asset_type, currency_code,
             available_amount, frozen_amount, version, status, created_at, updated_at)
        VALUES
            ('acct-cash-30', '100001', '300001', '30', 'cash', 'CNY',
             '1200', '0', 0, 'active', '2026-05-17 00:00:00', '2026-05-17 00:00:00')
        "#,
    )
    .execute(pool)
    .await
    .expect("seed wallet account");
}

#[tokio::test(flavor = "multi_thread")]
async fn build_commerce_sqlx_runtime_stores_registers_all_rpc_services() {
    let pool = migrated_pool().await;
    let stores = build_commerce_sqlx_runtime_stores(CommerceSqlxRuntimePool::Sqlite(pool));
    sdkwork_commerce_service_host::validate_commerce_rpc_runtime_stores(&stores).expect("stores");
    let registry =
        sdkwork_commerce_service_host::build_commerce_rpc_runtime_service_registry(&stores)
            .expect("registry");
    assert_eq!(
        registry.registered_service_names(),
        vec!["commerce.account", "commerce.order", "commerce.payment"]
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn sqlx_account_runtime_store_reads_wallet_overview_from_commerce_tables() {
    let pool = migrated_pool().await;
    seed_wallet_account(&pool).await;
    let store = SqlxCommerceAccountRuntimeStore::new(CommerceSqlxRuntimePool::Sqlite(pool));
    let request = wallet_request("wallet.overview.retrieve", "{}");
    let body = store
        .handle_account_operation(&request)
        .expect("wallet overview");
    let response = sdkwork_commerce_rpc::response_mapper::map_wallet_overview_response(&body)
        .expect("map overview");
    assert_eq!(response.accounts.len(), 1);
    assert_eq!(response.accounts[0].account_id, "acct-cash-30");
    assert_eq!(
        response.accounts[0]
            .balance
            .as_ref()
            .map(|money| money.amount.as_str()),
        Some("1200")
    );
}

fn wallet_request(operation_id: &str, body_json: &str) -> CommerceRuntimeServiceRequest {
    let context = CommerceRuntimeContext::new(CommerceRuntimeContextInput {
        tenant_id: "100001".to_string(),
        organization_id: Some("300001".to_string()),
        user_id: "30".to_string(),
        session_id: "session-1".to_string(),
        app_id: "sdkwork-commerce".to_string(),
        deployment_mode: DeploymentMode::Private,
        environment: Environment::Production,
        surface_profile: CommerceSurfaceProfile::App,
    });
    let execution_plan = prepare_operation_execution(
        context,
        operation_id,
        None,
        None,
        &[CapabilityFlag::new("commerce.account.wallet", true).expect("capability")],
    )
    .expect("execution plan");
    CommerceRuntimeServiceRequest::new(execution_plan, body_json)
}
