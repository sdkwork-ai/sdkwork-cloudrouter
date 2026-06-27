use sdkwork_commerce_contract_service::{
    CommerceIdempotencyRecord, CommerceRequestHash, IdempotencyStatus,
};
use sdkwork_commerce_service_host::{
    CommerceRuntimeIdempotencyStore, CommerceSqlxRuntimePool, SqlxCommerceRuntimeIdempotencyStore,
};
use sdkwork_commerce_storage_repository_sqlx::commerce_migrated_sqlite_memory_pool;

async fn migrated_pool() -> sqlx::SqlitePool {
    commerce_migrated_sqlite_memory_pool().await
}

#[tokio::test(flavor = "multi_thread")]
async fn sqlx_runtime_idempotency_store_locks_and_completes_records() {
    let pool = migrated_pool().await;
    let mut store = SqlxCommerceRuntimeIdempotencyStore::new(CommerceSqlxRuntimePool::Sqlite(pool));
    let request_hash = CommerceRequestHash::new("hash-1").expect("hash");
    let locked = store
        .lock(CommerceIdempotencyRecord::locked(
            "100001",
            "checkout.sessions.create",
            "idem-1",
            request_hash.clone(),
        ))
        .expect("lock");

    assert_eq!(locked.status, IdempotencyStatus::Locked);

    store
        .complete(
            "100001",
            "checkout.sessions.create",
            "idem-1",
            r#"{"checkoutSessionId":"cs-1"}"#,
        )
        .expect("complete");

    let replay = store
        .find("100001", "checkout.sessions.create", "idem-1")
        .expect("find")
        .expect("record");

    assert_eq!(replay.status, IdempotencyStatus::Completed);
    assert_eq!(
        replay.response_json.as_deref(),
        Some(r#"{"checkoutSessionId":"cs-1"}"#)
    );
}
