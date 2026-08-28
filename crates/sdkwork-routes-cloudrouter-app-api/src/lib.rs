#![forbid(unsafe_code)]

mod agents_runtime;
mod assets_runtime;
mod commerce_runtime;
mod community_runtime;
mod drive_runtime;
mod http_route_manifest;
mod invoice_runtime;
pub mod manifest;
mod manifest_composition;
pub mod paths;
pub mod routes;
mod web_bootstrap;

pub use http_route_manifest::{cloud_router_app_http_route_manifest, http_route_manifest};
pub use manifest::{route_manifest, RouterApiRouteManifest};
pub use manifest_composition::{
    cloud_router_app_composed_route_manifest,
    cloud_router_app_composed_route_manifest_for_platform_gateway,
    cloud_router_app_prepared_route_manifest,
};
pub use routes::*;
pub use web_bootstrap::{
    cloud_router_app_domain_context_injector, finalize_served_router,
    maybe_wrap_router_with_web_framework, maybe_wrap_router_with_web_framework_and_database_config,
    maybe_wrap_router_with_web_framework_and_iam_pool,
};

use axum::Router;

pub fn gateway_route_manifest() -> RouterApiRouteManifest {
    route_manifest()
}

pub fn gateway_mount() -> Router {
    build_sdkwork_cloudrouter_router_app_api_router()
}
