const ADMIN_API_LIB: &str = include_str!("../src/lib.rs");

#[test]
fn admin_api_database_runtime_mounts_service_provider_center() {
    assert!(
        ADMIN_API_LIB.contains("AdminServiceProviderRuntimeStore"),
        "admin api runtime must own a service-provider store"
    );
    assert!(
        ADMIN_API_LIB.contains("SqliteAdminServiceProviderStore::new(pool.clone())"),
        "sqlite runtime must create service-provider store"
    );
    assert!(
        ADMIN_API_LIB.contains("PostgresAdminServiceProviderStore::new(pool.clone())"),
        "postgres runtime must create service-provider store"
    );
    assert!(
        ADMIN_API_LIB.contains("admin_service_provider_router_with_store"),
        "admin api must mount service-provider router"
    );
    assert!(
        ADMIN_API_LIB.contains("service_provider_store: Some(service_provider_store)"),
        "database runtime must pass service-provider store into router assembly"
    );
}
