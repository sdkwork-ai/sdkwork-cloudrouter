use crate::{manifest, paths};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RouterApiRouteModule {
    pub package_name: &'static str,
    pub schema_tab_id: &'static str,
    pub default_schema_url: &'static str,
    pub route_prefix: &'static str,
}

pub fn route_module() -> RouterApiRouteModule {
    RouterApiRouteModule {
        package_name: manifest::PACKAGE_NAME,
        schema_tab_id: paths::SCHEMA_TAB_ID,
        default_schema_url: paths::DEFAULT_SCHEMA_URL,
        route_prefix: paths::ROUTE_PREFIX,
    }
}
