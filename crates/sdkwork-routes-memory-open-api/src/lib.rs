#![forbid(unsafe_code)]

pub mod manifest;
pub mod paths;
pub mod routes;

pub use manifest::{route_manifest, RouterApiRouteManifest};

pub fn gateway_route_manifest() -> RouterApiRouteManifest {
    route_manifest()
}

pub fn gateway_mount(upstream: axum::Router) -> axum::Router {
    sdkwork_claw_http::open_api_capability_router(
        upstream,
        sdkwork_claw_http::OpenApiCapability::Memory,
    )
}
