#![forbid(unsafe_code)]

pub mod manifest;
pub mod paths;
pub mod routes;

pub use manifest::{route_manifest, RouterApiRouteManifest};

pub fn gateway_route_manifest() -> RouterApiRouteManifest {
    route_manifest()
}

pub fn gateway_mount() -> RouterApiRouteManifest {
    gateway_route_manifest()
}
