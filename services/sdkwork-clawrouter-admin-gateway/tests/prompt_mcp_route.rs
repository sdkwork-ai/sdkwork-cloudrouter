const ADMIN_API_LIB: &str = include_str!("../src/lib.rs");
const ADMIN_API_ROUTES: &str = include_str!("../../../crates/sdkwork-routes-clawrouter-backend-api/src/routes.rs");

#[test]
fn admin_api_database_runtime_mounts_mcp_center() {
    for expected in [
        "AdminMcpRuntimeStore",
        "PostgresAdminMcpStore::new(pool.clone())",
        "admin_mcp_router_with_store",
        "mcp_store: Some(mcp_store)",
    ] {
        assert!(
            ADMIN_API_ROUTES.contains(expected),
            "admin api routes must contain `{expected}`"
        );
    }
}

#[test]
fn admin_api_database_runtime_does_not_mount_local_prompt_store() {
    for forbidden in [
        "AdminPromptRuntimeStore",
        "SqliteAdminPromptStore",
        "PostgresAdminPromptStore",
        "admin_prompt_router_with_store",
        "prompt_store: Some(prompt_store)",
    ] {
        assert!(
            !ADMIN_API_LIB.contains(forbidden) && !ADMIN_API_ROUTES.contains(forbidden),
            "admin api runtime must not contain local prompt `{forbidden}`; use sdkwork-prompts"
        );
    }
}
