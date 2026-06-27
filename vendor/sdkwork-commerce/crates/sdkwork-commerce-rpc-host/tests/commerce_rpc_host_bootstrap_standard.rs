use sdkwork_commerce_service_host::{
    build_commerce_rpc_host_from_pool, commerce_rpc_server_config_from_env, CommerceSqlxRuntimePool,
};
use sdkwork_commerce_storage_repository_sqlx::{
    commerce_initial_migration_sql, commerce_sqlite_memory_pool,
};

#[tokio::test(flavor = "multi_thread")]
async fn build_commerce_rpc_host_from_pool_wires_sqlx_runtime_stores() {
    let pool = commerce_sqlite_memory_pool().await;
    sqlx::query(commerce_initial_migration_sql())
        .execute(&pool)
        .await
        .expect("commerce migration");

    let host = build_commerce_rpc_host_from_pool(
        CommerceSqlxRuntimePool::Sqlite(pool),
        None,
        commerce_rpc_server_config_from_env(),
    )
    .await
    .expect("rpc host");

    assert_eq!(host.server_config().bind_addr, "127.0.0.1:50051");
    assert!(host.server_config().enable_health);
}

#[tokio::test]
async fn commerce_rpc_server_config_from_env_defaults_to_local_private_bind() {
    let config = commerce_rpc_server_config_from_env();
    assert_eq!(config.bind_addr, "127.0.0.1:50051");
    assert!(config.enforce_auth_metadata);
}
