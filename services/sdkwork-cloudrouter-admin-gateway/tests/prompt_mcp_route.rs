// Ownership guard: the prompt and MCP surfaces are owned by the sibling
// `sdkwork-prompts` and `sdkwork-mcp` repositories. Cloud Router must never
// grow a second local store for either: `ai_mcp_server` and `ai_mcp_tool` are
// owned by `sdkwork-mcp` and reach the shared working database through that
// repository's migrations, so a local MCP store would silently fight over the
// same table names.
//
// These are negative assertions on purpose: they fail if the retired local
// MCP/prompt runtime store is ever reintroduced.

const ADMIN_API_LIB: &str = include_str!("../src/lib.rs");
const ADMIN_API_ROUTES: &str =
    include_str!("../../../crates/sdkwork-routes-cloudrouter-backend-api/src/routes.rs");

#[test]
fn admin_api_database_runtime_does_not_mount_local_mcp_store() {
    for forbidden in [
        "AdminMcpRuntimeStore",
        "PostgresAdminMcpStore",
        "admin_mcp_router_with_store",
        "mcp_store: Some(mcp_store)",
    ] {
        assert!(
            !ADMIN_API_LIB.contains(forbidden) && !ADMIN_API_ROUTES.contains(forbidden),
            "admin api runtime must not contain local MCP `{forbidden}`; use sdkwork-mcp"
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
