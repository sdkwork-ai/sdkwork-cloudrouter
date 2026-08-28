//! Composed app-surface route manifest for the Cloud Router host.
//!
//! The web-framework auth pipeline decides public vs. protected from the
//! surface route manifest. Capability routers are merged into the host app
//! surface, so the surface manifest must be the union of the host-owned
//! routes and every capability's own manifest — otherwise a capability's
//! `RouteAuth::Public` declaration is silently ignored and the route 401s for
//! anonymous callers.
//!
//! Each capability enters through its dependency assembly `app_api_route_manifest`
//! entrypoint. [`MOUNTED_APP_CAPABILITIES`] is the single registry that must stay
//! aligned with federated router merges in `routes.rs`.

use sdkwork_web_core::{HttpRouteManifest, RouteManifestMount, WebRequestContextProfile};

use crate::http_route_manifest::http_route_manifest;

/// One same-origin app capability whose router is merged into the Cloud Router app surface.
struct MountedAppCapability {
    /// Same-origin workspace id; kept for registry alignment tests against `routes.rs`.
    #[cfg_attr(not(test), allow(dead_code))]
    workspace: &'static str,
    owner: &'static str,
    manifest: fn() -> HttpRouteManifest,
    /// When true, the platform cloud gateway mounts this workspace as its own
    /// contribution and the standalone composed manifest for that profile omits it.
    platform_gateway_mounts_separately: bool,
    /// When true, the Cloud Router cloud assembly contribution includes this
    /// capability in its dispatcher manifest. External same-origin dependencies
    /// such as IAM stay false so cloud mode does not advertise in-process routes.
    included_in_cloud_assembly_manifest: bool,
}

/// Canonical registry of dependency app-api manifests mounted by Cloud Router.
///
/// Keep this list aligned with `finalize_product_router_with_federated_capabilities`
/// in `routes.rs` and IAM wiring in `sdkwork-api-cloudrouter-assembly`.
const MOUNTED_APP_CAPABILITIES: &[MountedAppCapability] = &[
    MountedAppCapability {
        workspace: "sdkwork-models",
        owner: "sdkwork-models",
        manifest: sdkwork_api_models_assembly::app_api_route_manifest,
        platform_gateway_mounts_separately: false,
        included_in_cloud_assembly_manifest: true,
    },
    MountedAppCapability {
        workspace: "sdkwork-membership",
        owner: "sdkwork-membership",
        manifest: sdkwork_api_membership_assembly::app_api_route_manifest,
        platform_gateway_mounts_separately: true,
        included_in_cloud_assembly_manifest: false,
    },
    MountedAppCapability {
        workspace: "sdkwork-order",
        owner: "sdkwork-order",
        manifest: sdkwork_api_order_assembly::app_api_route_manifest,
        platform_gateway_mounts_separately: true,
        included_in_cloud_assembly_manifest: false,
    },
    MountedAppCapability {
        workspace: "sdkwork-payment",
        owner: "sdkwork-payment",
        manifest: sdkwork_api_payment_assembly::federated_app_route_manifest,
        platform_gateway_mounts_separately: true,
        included_in_cloud_assembly_manifest: false,
    },
    MountedAppCapability {
        workspace: "sdkwork-promotion",
        owner: "sdkwork-promotion",
        manifest: sdkwork_api_promotion_assembly::app_api_route_manifest,
        platform_gateway_mounts_separately: true,
        included_in_cloud_assembly_manifest: false,
    },
    MountedAppCapability {
        workspace: "sdkwork-invoice",
        owner: "sdkwork-invoice",
        manifest: sdkwork_api_invoice_assembly::app_api_route_manifest,
        platform_gateway_mounts_separately: true,
        included_in_cloud_assembly_manifest: false,
    },
    MountedAppCapability {
        workspace: "sdkwork-partner",
        owner: "sdkwork-partner",
        manifest: sdkwork_api_partner_assembly::app_api_route_manifest,
        platform_gateway_mounts_separately: false,
        included_in_cloud_assembly_manifest: true,
    },
    MountedAppCapability {
        workspace: "sdkwork-account",
        owner: "sdkwork-account",
        manifest: sdkwork_api_account_assembly::app_api_route_manifest,
        platform_gateway_mounts_separately: true,
        included_in_cloud_assembly_manifest: false,
    },
    MountedAppCapability {
        workspace: "sdkwork-community",
        owner: "sdkwork-community",
        manifest: sdkwork_api_community_assembly::app_api_route_manifest,
        platform_gateway_mounts_separately: true,
        included_in_cloud_assembly_manifest: false,
    },
    MountedAppCapability {
        workspace: "sdkwork-iam",
        owner: "sdkwork-iam",
        manifest: sdkwork_api_iam_assembly::app_api_route_manifest,
        platform_gateway_mounts_separately: false,
        included_in_cloud_assembly_manifest: false,
    },
    MountedAppCapability {
        workspace: "sdkwork-agents",
        owner: "sdkwork-agents",
        manifest: sdkwork_api_agents_assembly::app_api_route_manifest,
        platform_gateway_mounts_separately: false,
        included_in_cloud_assembly_manifest: false,
    },
    MountedAppCapability {
        workspace: "sdkwork-drive",
        owner: "sdkwork-drive",
        manifest: sdkwork_api_drive_assembly::app_api_route_manifest,
        platform_gateway_mounts_separately: false,
        included_in_cloud_assembly_manifest: false,
    },
    MountedAppCapability {
        workspace: "sdkwork-assets",
        owner: "sdkwork-assets",
        manifest: sdkwork_api_assets_assembly::app_api_route_manifest,
        platform_gateway_mounts_separately: false,
        included_in_cloud_assembly_manifest: false,
    },
];

fn mounts_for_standalone_host(include_platform_gateway_mounted: bool) -> Vec<RouteManifestMount> {
    MOUNTED_APP_CAPABILITIES
        .iter()
        .filter(|capability| {
            include_platform_gateway_mounted || !capability.platform_gateway_mounts_separately
        })
        .map(|capability| RouteManifestMount {
            owner: capability.owner,
            manifest: (capability.manifest)(),
        })
        .collect()
}

fn mounts_for_cloud_assembly() -> Vec<RouteManifestMount> {
    MOUNTED_APP_CAPABILITIES
        .iter()
        .filter(|capability| capability.included_in_cloud_assembly_manifest)
        .map(|capability| RouteManifestMount {
            owner: capability.owner,
            manifest: (capability.manifest)(),
        })
        .collect()
}

fn compose_app_route_manifest(include_platform_gateway_mounted: bool) -> HttpRouteManifest {
    let mounts = mounts_for_standalone_host(include_platform_gateway_mounted);
    let composed =
        HttpRouteManifest::try_merge_mounts("sdkwork-cloudrouter", http_route_manifest(), &mounts)
            .unwrap_or_else(|error| {
                panic!("cloud router app-api manifest composition failed: {error}");
            });
    composed
        .validate_includes_dependency_manifests(&mounts)
        .unwrap_or_else(|error| {
            panic!("cloud router app-api manifest missing dependency auth profiles: {error}");
        });
    composed
}

/// Composed app-surface route manifest: host-owned routes plus every mounted
/// capability manifest. Fails fast when a capability declares a method+path
/// that the host or another capability already owns.
pub fn cloud_router_app_composed_route_manifest() -> HttpRouteManifest {
    compose_app_route_manifest(true)
}

/// Composed app-surface route manifest for the platform cloud gateway
/// (`ApiAssemblyContext::cloud_gateway`): host-owned routes plus only the
/// capabilities the Cloud Router cloud assembly contribution dispatches itself.
pub fn cloud_router_app_composed_route_manifest_for_platform_gateway() -> HttpRouteManifest {
    let mounts = mounts_for_cloud_assembly();
    let composed =
        HttpRouteManifest::try_merge_mounts("sdkwork-cloudrouter", http_route_manifest(), &mounts)
            .unwrap_or_else(|error| {
                panic!("cloud router cloud assembly app-api manifest composition failed: {error}");
            });
    composed
        .validate_includes_dependency_manifests(&mounts)
        .unwrap_or_else(|error| {
            panic!("cloud router cloud assembly app-api manifest missing dependency auth profiles: {error}");
        });
    composed
}

/// Validates and returns the composed app manifest for Web Framework binding.
pub fn cloud_router_app_prepared_route_manifest(
    public_path_prefixes: &[String],
    include_platform_gateway_mounted: bool,
) -> HttpRouteManifest {
    let mounts = mounts_for_standalone_host(include_platform_gateway_mounted);
    let profile = WebRequestContextProfile::default();
    sdkwork_web_bootstrap::finalize_host_route_manifest(
        "sdkwork-cloudrouter",
        compose_app_route_manifest(include_platform_gateway_mounted),
        &mounts,
        &profile,
        public_path_prefixes,
    )
    .unwrap_or_else(|error| {
        panic!("cloud router app-api prepared route manifest failed validation: {error}");
    })
}

#[cfg(test)]
mod tests {
    use sdkwork_web_contract::RouteAuth;

    use super::{
        cloud_router_app_composed_route_manifest, cloud_router_app_prepared_route_manifest,
        MOUNTED_APP_CAPABILITIES,
    };

    #[test]
    fn mounted_capability_registry_covers_federated_runtime_modules() {
        let workspaces = MOUNTED_APP_CAPABILITIES
            .iter()
            .map(|capability| capability.workspace)
            .collect::<Vec<_>>();
        let routes_source = include_str!("routes.rs");
        for required in [
            "sdkwork-invoice",
            "sdkwork-account",
            "sdkwork-community",
            "sdkwork-iam",
            "sdkwork-agents",
            "sdkwork-drive",
            "sdkwork-assets",
        ] {
            assert!(
                workspaces.contains(&required),
                "mounted capability registry must include {required}"
            );
        }
        for (workspace, merge_marker) in [
            ("sdkwork-invoice", "merge_federated_invoice_app_router"),
            ("sdkwork-order", "merge_federated_commerce_app_routers"),
            ("sdkwork-account", "merge_federated_commerce_app_routers"),
            ("sdkwork-community", "merge_federated_community_app_router"),
            ("sdkwork-agents", "merge_federated_agents_app_router"),
            ("sdkwork-drive", "merge_federated_drive_app_router"),
            ("sdkwork-assets", "merge_federated_assets_app_router"),
        ] {
            assert!(
                MOUNTED_APP_CAPABILITIES
                    .iter()
                    .any(|capability| capability.workspace == workspace),
                "registry must include {workspace}"
            );
            assert!(
                routes_source.contains(merge_marker),
                "routes.rs must merge {workspace} through {merge_marker}"
            );
        }
        assert!(
            MOUNTED_APP_CAPABILITIES
                .iter()
                .any(|capability| capability.workspace == "sdkwork-iam"),
            "registry must include sdkwork-iam for assembly-wired IAM app surface"
        );
    }

    #[test]
    fn composed_manifest_inherits_capability_public_routes() {
        let manifest = cloud_router_app_composed_route_manifest();
        for (method, path) in [
            ("GET", "/app/v3/api/memberships/package_groups"),
            ("GET", "/app/v3/api/memberships/plans"),
            ("GET", "/app/v3/api/memberships/benefits"),
            ("GET", "/app/v3/api/ai/model_vendors"),
            ("GET", "/app/v3/api/ai/models"),
            ("GET", "/app/v3/api/ai/model_rankings"),
            ("GET", "/app/v3/api/promotions/offers"),
            ("GET", "/app/v3/api/promotions/offers/demo-offer"),
            ("GET", "/app/v3/api/recharges/packages"),
            ("GET", "/app/v3/api/recharges/plans"),
            ("GET", "/app/v3/api/recharges/settings"),
            ("POST", "/app/v3/api/oauth/device_authorizations"),
            ("GET", "/app/v3/api/oauth/device_authorizations/demo-device"),
            (
                "POST",
                "/app/v3/api/oauth/device_authorizations/demo-device/session_exchanges",
            ),
            ("GET", "/app/v3/api/oauth/wechat/payment/callback"),
            ("GET", "/app/v3/api/iam/invite/policy"),
            ("POST", "/app/v3/api/iam/invites/validate"),
            ("GET", "/app/v3/api/system/site/runtime"),
        ] {
            let route = manifest
                .match_route(method, path)
                .unwrap_or_else(|| panic!("{method} {path} must be registered"));
            assert_eq!(
                RouteAuth::Public,
                route.auth,
                "{method} {path} must inherit public auth from its capability or host manifest"
            );
        }
    }

    #[test]
    fn host_only_manifest_omits_dependency_auth_profiles() {
        let host_only = crate::http_route_manifest::http_route_manifest();
        assert!(
            host_only
                .match_route("GET", "/app/v3/api/system/iam/runtime")
                .is_none(),
            "host-only manifest must not silently inherit IAM dependency routes"
        );
    }

    #[test]
    fn composed_manifest_inherits_iam_credential_entry_routes() {
        let manifest = cloud_router_app_composed_route_manifest();
        for (method, path) in [
            ("GET", "/app/v3/api/system/iam/runtime"),
            ("GET", "/app/v3/api/system/iam/verification_policy"),
            ("GET", "/app/v3/api/system/iam/account_binding_policy"),
            ("POST", "/app/v3/api/auth/sessions"),
            ("POST", "/app/v3/api/auth/registrations"),
            ("POST", "/app/v3/api/oauth/sessions"),
        ] {
            let route = manifest
                .match_route(method, path)
                .unwrap_or_else(|| panic!("{method} {path} must be registered"));
            assert_eq!(
                RouteAuth::CredentialEntryBootstrap,
                route.auth,
                "{method} {path} must inherit credential-entry auth from the IAM assembly manifest"
            );
        }
    }

    #[test]
    fn composed_manifest_includes_account_commerce_routes() {
        let manifest = cloud_router_app_composed_route_manifest();
        for (method, path) in [
            ("GET", "/app/v3/api/wallet/portfolio"),
            ("GET", "/app/v3/api/wallet/ledger_entries"),
            ("GET", "/app/v3/api/token_bank/holds"),
            ("GET", "/app/v3/api/token_bank/account"),
            ("GET", "/app/v3/api/billing/history"),
        ] {
            let route = manifest
                .match_route(method, path)
                .unwrap_or_else(|| panic!("{method} {path} must be registered"));
            assert_eq!(
                RouteAuth::DualToken,
                route.auth,
                "{method} {path} must inherit dual-token auth from the account assembly manifest"
            );
        }
    }

    #[test]
    fn composed_manifest_includes_agents_drive_and_assets_routes() {
        let manifest = cloud_router_app_composed_route_manifest();
        let agents = manifest
            .match_route("GET", "/app/v3/api/ai/agents")
            .expect("agents app-api route must be registered");
        assert_eq!(RouteAuth::DualToken, agents.auth);
        let drive = manifest
            .match_route("GET", "/app/v3/api/drive/spaces")
            .expect("drive app-api route must be registered");
        assert_eq!(RouteAuth::DualToken, drive.auth);
        let assets = manifest
            .match_route("GET", "/app/v3/api/assets")
            .expect("assets app-api route must be registered");
        assert_eq!(RouteAuth::DualToken, assets.auth);
    }

    #[test]
    fn cloud_assembly_manifest_excludes_external_dependencies() {
        let manifest = super::cloud_router_app_composed_route_manifest_for_platform_gateway();
        assert!(
            manifest
                .match_route("GET", "/app/v3/api/system/iam/runtime")
                .is_none(),
            "cloud assembly manifest must not advertise external IAM app routes"
        );
        assert!(
            manifest
                .match_route("GET", "/app/v3/api/memberships/package_groups")
                .is_none(),
            "cloud assembly manifest must not advertise external membership app routes"
        );
        assert!(
            manifest
                .match_route("GET", "/app/v3/api/ai/model_vendors")
                .is_some(),
            "cloud assembly manifest must keep in-process models routes"
        );
    }

    #[test]
    fn prepared_manifest_validates_without_double_merge() {
        let prefixes = vec!["/healthz".to_owned(), "/readyz".to_owned()];
        let manifest = cloud_router_app_prepared_route_manifest(&prefixes, true);
        let route = manifest
            .match_route("GET", "/app/v3/api/system/iam/runtime")
            .expect("IAM runtime must stay registered in prepared manifest");
        assert_eq!(RouteAuth::CredentialEntryBootstrap, route.auth);
    }

    #[test]
    fn composed_manifest_keeps_host_protected_routes() {
        let manifest = cloud_router_app_composed_route_manifest();
        let route = manifest
            .match_route("GET", "/app/v3/api/notification/notifications")
            .expect("host route must be registered");
        assert_eq!(RouteAuth::DualToken, route.auth);
    }
}
