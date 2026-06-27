#![forbid(unsafe_code)]

pub mod manifest;
pub mod paths;
pub mod routes;

pub use manifest::{route_manifest, RouterApiRouteManifest};
