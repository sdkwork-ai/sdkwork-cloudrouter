//! API assembly for sdkwork-clawrouter.
//! Application bootstrap lives in `bootstrap.rs`; route inventory is in `assembly-manifest.json`.

mod bootstrap;
mod generated;
mod generated_open_http_route_manifest;

pub use bootstrap::{assemble_api_router, ApiAssembly, ApiAssemblyContext};

pub fn assembly_route_count() -> usize {
    generated::ROUTE_CRATE_COUNT
}
