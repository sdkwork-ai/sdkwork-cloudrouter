//! Composed backend-surface route manifest for the Cloud Router host.
//!
//! Same-origin dependency backend routers are merged at runtime in
//! `sdkwork-cloudrouter-edge-runtime` and in `routes.rs`. The Web Framework
//! auth pipeline must see the union manifest or dependency routes fall through
//! to dual-token defaults on unmatched backend-api paths.
//!
//! Keep [`MOUNTED_BACKEND_CAPABILITIES`] aligned with backend router merges in
//! `runtime.rs` (`all_in_one_in_process_upstreams_from_env`) and
//! `router_with_postgres_shared_runtime` (log + drive storage).

use sdkwork_web_core::{HttpRouteManifest, RouteManifestMount, WebRequestContextProfile};

use crate::http_route_manifest::http_route_manifest;

struct MountedBackendCapability {
    /// Same-origin workspace id; kept for registry alignment tests against `runtime.rs`.
    #[cfg_attr(not(test), allow(dead_code))]
    workspace: &'static str,
    owner: &'static str,
    manifest: fn() -> HttpRouteManifest,
}

/// Canonical registry of dependency backend-api manifests mounted by Cloud Router.
const MOUNTED_BACKEND_CAPABILITIES: &[MountedBackendCapability] = &[
    MountedBackendCapability {
        workspace: "sdkwork-membership",
        owner: "sdkwork-membership",
        manifest: sdkwork_routes_membership_backend_api::backend_route_manifest,
    },
    MountedBackendCapability {
        workspace: "sdkwork-payment",
        owner: "sdkwork-payment",
        manifest: sdkwork_routes_payment_backend_api::gateway_route_manifest,
    },
    MountedBackendCapability {
        workspace: "sdkwork-order",
        owner: "sdkwork-order",
        manifest: sdkwork_routes_order_backend_api::gateway_route_manifest,
    },
    MountedBackendCapability {
        workspace: "sdkwork-inventory",
        owner: "sdkwork-inventory",
        manifest: sdkwork_routes_inventory_backend_api::gateway_route_manifest,
    },
    MountedBackendCapability {
        workspace: "sdkwork-appbase-base-data",
        owner: "sdkwork-base-data",
        manifest: sdkwork_routes_base_data_backend_api::backend_route_manifest,
    },
    MountedBackendCapability {
        workspace: "sdkwork-appbase-edu-data",
        owner: "sdkwork-edu-data",
        manifest: sdkwork_routes_edu_data_backend_api::backend_route_manifest,
    },
    MountedBackendCapability {
        workspace: "sdkwork-appbase-med-data",
        owner: "sdkwork-med-data",
        manifest: sdkwork_routes_med_data_backend_api::backend_route_manifest,
    },
    MountedBackendCapability {
        workspace: "sdkwork-iam",
        owner: "sdkwork-iam",
        manifest: sdkwork_api_iam_assembly::backend_api_route_manifest,
    },
    MountedBackendCapability {
        workspace: "sdkwork-messaging",
        owner: "sdkwork-messaging",
        manifest: sdkwork_routes_messaging_backend_api::backend_route_manifest,
    },
    MountedBackendCapability {
        workspace: "sdkwork-partner",
        owner: "sdkwork-partner",
        manifest: sdkwork_routes_partner_backend_api::gateway_route_manifest,
    },
    MountedBackendCapability {
        workspace: "sdkwork-promotion",
        owner: "sdkwork-promotion",
        manifest: sdkwork_routes_promotion_backend_api::gateway_route_manifest,
    },
    MountedBackendCapability {
        workspace: "sdkwork-community",
        owner: "sdkwork-community",
        manifest: sdkwork_routes_community_backend_api::gateway_route_manifest,
    },
    MountedBackendCapability {
        workspace: "sdkwork-rtc",
        owner: "sdkwork-rtc",
        manifest: sdkwork_routes_rtc_backend_api::gateway_route_manifest,
    },
    MountedBackendCapability {
        workspace: "sdkwork-log",
        owner: "sdkwork-log",
        manifest: sdkwork_api_log_assembly::log_route_manifest,
    },
    MountedBackendCapability {
        workspace: "sdkwork-drive",
        owner: "sdkwork-drive",
        manifest: sdkwork_api_drive_assembly::backend_admin_storage_route_manifest,
    },
];

fn dependency_mounts() -> Vec<RouteManifestMount> {
    MOUNTED_BACKEND_CAPABILITIES
        .iter()
        .map(|capability| RouteManifestMount {
            owner: capability.owner,
            manifest: (capability.manifest)(),
        })
        .collect()
}

fn compose_backend_route_manifest() -> HttpRouteManifest {
    let mounts = dependency_mounts();
    let composed =
        HttpRouteManifest::try_merge_mounts("sdkwork-cloudrouter", http_route_manifest(), &mounts)
            .unwrap_or_else(|error| {
                panic!("cloud router backend-api manifest composition failed: {error}");
            });
    composed
        .validate_includes_dependency_manifests(&mounts)
        .unwrap_or_else(|error| {
            panic!("cloud router backend-api manifest missing dependency auth profiles: {error}");
        });
    composed
}

/// Composed backend-surface route manifest: host-owned routes plus every mounted
/// capability manifest.
pub fn cloud_router_backend_composed_route_manifest() -> HttpRouteManifest {
    compose_backend_route_manifest()
}

/// Validates and returns the composed backend manifest for Web Framework binding.
pub fn cloud_router_backend_prepared_route_manifest(
    public_path_prefixes: &[String],
) -> HttpRouteManifest {
    let mounts = dependency_mounts();
    let profile = WebRequestContextProfile::default();
    sdkwork_web_bootstrap::finalize_host_route_manifest(
        "sdkwork-cloudrouter",
        compose_backend_route_manifest(),
        &mounts,
        &profile,
        public_path_prefixes,
    )
    .unwrap_or_else(|error| {
        panic!("cloud router backend-api prepared route manifest failed validation: {error}");
    })
}

#[cfg(test)]
mod tests {
    use sdkwork_web_contract::RouteAuth;

    use super::{
        cloud_router_backend_composed_route_manifest, cloud_router_backend_prepared_route_manifest,
        MOUNTED_BACKEND_CAPABILITIES,
    };

    #[test]
    fn mounted_backend_capability_registry_covers_runtime_modules() {
        let workspaces = MOUNTED_BACKEND_CAPABILITIES
            .iter()
            .map(|capability| capability.workspace)
            .collect::<Vec<_>>();
        let runtime_source = include_str!("../../sdkwork-cloudrouter-edge-runtime/src/runtime.rs");
        for required in [
            "sdkwork-iam",
            "sdkwork-membership",
            "sdkwork-payment",
            "sdkwork-community",
            "sdkwork-log",
            "sdkwork-drive",
        ] {
            assert!(
                workspaces.contains(&required),
                "mounted backend capability registry must include {required}"
            );
        }
        for (workspace, merge_marker) in [
            ("sdkwork-iam", "assemble_backend_api_contribution"),
            ("sdkwork-messaging", "assemble_backend_api_contribution"),
            (
                "sdkwork-partner",
                "assemble_backend_business_router_with_pool",
            ),
            (
                "sdkwork-promotion",
                "assemble_backend_business_router_with_pool",
            ),
            (
                "sdkwork-community",
                "assemble_backend_business_router_with_pool",
            ),
            ("sdkwork-rtc", "assemble_backend_api_contribution_with_pool"),
        ] {
            assert!(
                MOUNTED_BACKEND_CAPABILITIES
                    .iter()
                    .any(|capability| capability.workspace == workspace),
                "registry must include {workspace}"
            );
            assert!(
                runtime_source.contains(merge_marker),
                "runtime.rs must merge {workspace} backend surface"
            );
        }
    }

    #[test]
    fn composed_manifest_includes_iam_backend_routes() {
        let manifest = cloud_router_backend_composed_route_manifest();
        let route = manifest
            .match_route("POST", "/backend/v3/api/iam/applications/register")
            .expect("IAM applications.register must be registered");
        assert_eq!(
            RouteAuth::BootstrapBody,
            route.auth,
            "IAM backend bootstrap routes must inherit bootstrap-body auth"
        );
    }

    #[test]
    fn prepared_backend_manifest_validates_without_double_merge() {
        let prefixes = vec!["/healthz".to_owned(), "/readyz".to_owned()];
        let manifest = cloud_router_backend_prepared_route_manifest(&prefixes);
        let route = manifest
            .match_route("POST", "/backend/v3/api/iam/applications/register")
            .expect("IAM backend bootstrap route must stay registered");
        assert_eq!(RouteAuth::BootstrapBody, route.auth);
    }

    #[test]
    fn composed_manifest_includes_membership_backend_routes() {
        let manifest = cloud_router_backend_composed_route_manifest();
        let route = manifest
            .match_route("GET", "/backend/v3/api/memberships/plans")
            .expect("membership backend route must be registered");
        assert_eq!(RouteAuth::DualToken, route.auth);
    }
}
