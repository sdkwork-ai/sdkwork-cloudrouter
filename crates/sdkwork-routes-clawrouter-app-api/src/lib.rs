#![forbid(unsafe_code)]

mod http_route_manifest;
mod iam_runtime;
mod invoice_runtime;
pub mod manifest;
pub mod paths;
pub mod routes;
mod web_bootstrap;

pub use manifest::{route_manifest, RouterApiRouteManifest};
pub use routes::*;
pub use web_bootstrap::{
    finalize_served_router, maybe_wrap_router_with_web_framework,
    maybe_wrap_router_with_web_framework_and_database_config,
    maybe_wrap_router_with_web_framework_and_iam_pool,
};

use axum::Router;

pub fn gateway_route_manifest() -> RouterApiRouteManifest {
    route_manifest()
}

pub fn gateway_mount() -> Router {
    build_sdkwork_claw_router_app_api_router()
}
