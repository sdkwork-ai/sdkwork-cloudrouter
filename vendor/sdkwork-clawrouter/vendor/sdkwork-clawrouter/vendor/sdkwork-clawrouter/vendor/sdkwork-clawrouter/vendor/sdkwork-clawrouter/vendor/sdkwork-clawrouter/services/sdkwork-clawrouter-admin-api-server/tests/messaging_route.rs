const ADMIN_API_LIB: &str = include_str!("../src/lib.rs");

#[test]
fn admin_api_database_runtime_does_not_mount_foundation_messaging_center() {
    for marker in [
        "AdminMessagingRuntimeStore",
        "SqliteAdminMessagingStore::new(pool.clone())",
        "PostgresAdminMessagingStore::new(pool.clone())",
        "admin_messaging_router_with_store",
        "messaging_store: Some(messaging_store)",
    ] {
        assert!(
            !ADMIN_API_LIB.contains(marker),
            "admin api runtime must not mount or construct foundation messaging marker {marker}; sdkwork-api-cloud-gateway owns that surface"
        );
    }
}
