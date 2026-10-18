#![forbid(unsafe_code)]
// Waived crate-wide, with the reason recorded so the next audit re-checks this
// decision rather than rediscovering it.
//
// `result_large_err`: every handler and closure in `upstream/` returns
// `Result<Response, ProductCatalogRouterError>`, and the error type carries the
// API problem payload inline, which puts it over the lint's size threshold. The
// error value is only constructed on the failure path. Boxing it would change the
// error type across every route signature in this crate for no runtime gain.
#![allow(clippy::result_large_err)]

mod http_route_manifest;
pub mod manifest;
mod manifest_composition;
pub mod paths;
pub mod routes;
mod upstream;
mod web_bootstrap;

pub use http_route_manifest::http_route_manifest;
pub use manifest::{route_manifest, RouterApiRouteManifest};
pub use manifest_composition::{
    cloud_router_backend_composed_route_manifest, cloud_router_backend_prepared_route_manifest,
};
pub use routes::*;
pub use web_bootstrap::{
    cloud_router_backend_domain_context_injector, finalize_served_router,
    maybe_wrap_router_with_web_framework, maybe_wrap_router_with_web_framework_and_database_config,
    maybe_wrap_router_with_web_framework_and_iam_pool,
    maybe_wrap_router_with_web_framework_and_iam_pool_with_injectors,
    wrap_router_with_web_framework_and_injectors,
};

use axum::Router;

pub fn gateway_route_manifest() -> RouterApiRouteManifest {
    route_manifest()
}

pub fn gateway_mount() -> Router {
    build_sdkwork_cloudrouter_router_backend_api_router()
}
