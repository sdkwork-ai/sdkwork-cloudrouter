//! API assembly for sdkwork-cloudrouter.
//! Application bootstrap lives in `bootstrap.rs`; route inventory is in `assembly-manifest.json`.
// SDKWORK-ASSEMBLY-LIB-CUSTOM

mod bootstrap;
mod feeds_open_runtime;
mod generated;
mod generated_open_http_route_manifest;

pub use bootstrap::{
    assemble_api_router, web_module, web_module_with_context, ApiAssembly, ApiAssemblyContext,
};

pub fn assembly_route_count() -> usize {
    generated::ROUTE_CRATE_COUNT
}

/// Database-free application-plane router used by thin distributed-profile
/// gateway hosts (health checks, smoke tests). Production serving uses
/// `assemble_api_router`, which composes the complete in-process upstreams.
pub fn lightweight_app_router() -> axum::Router {
    sdkwork_routes_cloudrouter_app_api::router()
}

/// Database-free backend-plane router used by thin distributed-profile
/// gateway hosts (health checks, smoke tests). Production serving uses
/// `assemble_api_router`, which composes the complete in-process upstreams.
pub fn lightweight_backend_router() -> axum::Router {
    sdkwork_routes_cloudrouter_backend_api::router()
}
