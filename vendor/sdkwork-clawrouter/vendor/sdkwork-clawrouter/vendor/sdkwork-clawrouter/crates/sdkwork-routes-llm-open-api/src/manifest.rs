use crate::paths;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RouterApiRouteManifest {
    pub package_name: &'static str,
    pub capability: &'static str,
    pub surface: &'static str,
    pub schema_tab_id: &'static str,
    pub api_authority: &'static str,
    pub sdk_family: &'static str,
    pub route_prefix: &'static str,
}

pub const PACKAGE_NAME: &str = "sdkwork-routes-llm-open-api";
pub const CAPABILITY: &str = "llm";
pub const SURFACE: &str = "open-api";
pub const API_AUTHORITY: &str = "sdkwork-clawrouter.llm-open-api";
pub const SDK_FAMILY: &str = "clawrouter-open-sdk";

pub fn route_manifest() -> RouterApiRouteManifest {
    RouterApiRouteManifest {
        package_name: PACKAGE_NAME,
        capability: CAPABILITY,
        surface: SURFACE,
        schema_tab_id: paths::SCHEMA_TAB_ID,
        api_authority: API_AUTHORITY,
        sdk_family: SDK_FAMILY,
        route_prefix: paths::ROUTE_PREFIX,
    }
}
