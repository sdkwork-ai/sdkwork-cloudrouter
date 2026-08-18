//! Composed app-surface route manifest for the Cloud Router host.
//!
//! The web-framework auth pipeline decides public vs. protected from the
//! surface route manifest. Capability routers are merged into the host app
//! surface, so the surface manifest must be the union of the host-owned
//! routes and every capability's own manifest — otherwise a capability's
//! `RouteAuth::Public` declaration (its own contract) is silently ignored and
//! the route 401s for anonymous callers.
//!
//! Each capability crate owns its route inventory (`app_route_manifest`).
//! The host only composes; it never re-declares capability routes. Adding a
//! capability below is the single integration point: after the router merge,
//! its auth declarations take effect without any per-route host configuration.

use std::collections::BTreeSet;

use sdkwork_web_contract::HttpMethod;
use sdkwork_web_core::HttpRouteManifest;

use crate::http_route_manifest::http_route_manifest;

/// Capability app-API manifests mounted into the Cloud Router app surface.
///
/// Dependency-owned manifests enter through their dependency assembly
/// entrypoints — not through direct `sdkwork-routes-*` imports — per
/// API_ASSEMBLY_SPEC §3/§6.1.
fn capability_manifests() -> Vec<HttpRouteManifest> {
    vec![
        sdkwork_api_models_assembly::app_api_route_manifest(),
        sdkwork_api_membership_assembly::app_api_route_manifest(),
        sdkwork_api_payment_assembly::federated_app_route_manifest(),
        sdkwork_api_promotion_assembly::app_api_route_manifest(),
        sdkwork_api_invoice_assembly::app_api_route_manifest(),
        // Partner join (伙伴计划) surface (`/app/v3/api/partner_join/*`) is
        // merged by the partner API assembly entrypoint; its route manifest
        // enters through the dependency assembly so the Web Framework enforces
        // the program catalog and invite-code validation as public routes and
        // the application endpoints as session-protected (API_ASSEMBLY_SPEC
        // §3/§6.1).
        sdkwork_api_partner_assembly::app_api_route_manifest(),
        // Account commerce surface (`/app/v3/api/wallet/*`,
        // `/app/v3/api/token_bank/*`, `/app/v3/api/billing/*`) is merged by
        // the account API assembly entrypoint on the shared commerce pool; its
        // route manifest enters through the dependency assembly so the Web
        // Framework enforces the App routes' declared dual-token auth and
        // permissions (API_ASSEMBLY_SPEC §3/§6.1).
        sdkwork_api_account_assembly::app_api_route_manifest(),
        // Federated Community surface (`/app/v3/api/community/*`) is merged by
        // `merge_federated_community_app_router`; its route manifest enters
        // through the dependency assembly entrypoint so the Web Framework
        // enforces the App routes' declared dual-token auth and permissions.
        sdkwork_api_community_assembly::app_api_route_manifest(),
    ]
}

/// Capability workspaces whose app surfaces the platform cloud gateway mounts
/// as separate assembly contributions (API_ASSEMBLY_SPEC §6.1 same-origin
/// composition). Their app routes are excluded from the platform-gateway
/// composed surface below so the platform gateway's exact route registry
/// never sees one method+path owned by two services; the routes still mount
/// through the capability contributions themselves.
const PLATFORM_GATEWAY_MOUNTED_CAPABILITIES: &[&str] = &[
    "sdkwork-account",
    "sdkwork-community",
    "sdkwork-invoice",
    "sdkwork-membership",
    "sdkwork-payment",
    "sdkwork-promotion",
];

/// Capability app-API manifests for the platform cloud gateway surface:
/// the capabilities the platform gateway wires itself are omitted.
fn capability_manifests_for_platform_gateway() -> Vec<HttpRouteManifest> {
    vec![
        sdkwork_api_models_assembly::app_api_route_manifest(),
        sdkwork_api_partner_assembly::app_api_route_manifest(),
    ]
}

/// Capability workspace names in [`capability_manifests`] order.
fn capability_workspaces() -> Vec<&'static str> {
    vec![
        "sdkwork-models",
        "sdkwork-membership",
        "sdkwork-payment",
        "sdkwork-promotion",
        "sdkwork-invoice",
        "sdkwork-partner",
        "sdkwork-account",
        "sdkwork-community",
    ]
}

fn compose_capability_manifests(capabilities: Vec<HttpRouteManifest>) -> HttpRouteManifest {
    let owned = http_route_manifest();
    let mut routes = owned.routes().to_vec();
    let mut seen: BTreeSet<(String, String)> = routes
        .iter()
        .map(|route| {
            (
                method_label(route.method).to_owned(),
                normalized_path(route.path),
            )
        })
        .collect();
    for manifest in capabilities {
        for route in manifest.routes() {
            let identity = (
                method_label(route.method).to_owned(),
                normalized_path(route.path),
            );
            if !seen.insert(identity) {
                panic!(
                    "composed app-surface route collision for {} {}: capability manifest \
                     conflicts with the host app-api manifest",
                    method_label(route.method),
                    route.path
                );
            }
            routes.push(route.clone());
        }
    }
    HttpRouteManifest::from_owned_routes(routes)
}

/// Composed app-surface route manifest: host-owned routes plus every mounted
/// capability manifest. Fails fast when a capability declares a method+path
/// that the host or another capability already owns.
pub fn cloud_router_app_composed_route_manifest() -> HttpRouteManifest {
    compose_capability_manifests(capability_manifests())
}

/// Composed app-surface route manifest for the platform cloud gateway
/// (`ApiAssemblyContext::cloud_gateway`): host-owned routes plus the
/// capability manifests whose workspaces the platform gateway does not mount
/// as separate contributions. Capabilities listed in
/// [`PLATFORM_GATEWAY_MOUNTED_CAPABILITIES`] mount their app routes through
/// their own gateway contributions, so including them here would duplicate
/// every route in the platform gateway's combined manifest and fail its exact
/// route registry.
pub fn cloud_router_app_composed_route_manifest_for_platform_gateway() -> HttpRouteManifest {
    debug_assert!(PLATFORM_GATEWAY_MOUNTED_CAPABILITIES
        .iter()
        .all(|workspace| capability_workspaces().contains(workspace)));
    compose_capability_manifests(capability_manifests_for_platform_gateway())
}

fn method_label(method: HttpMethod) -> &'static str {
    match method {
        HttpMethod::Get => "GET",
        HttpMethod::Post => "POST",
        HttpMethod::Put => "PUT",
        HttpMethod::Patch => "PATCH",
        HttpMethod::Delete => "DELETE",
    }
}

fn normalized_path(path: &str) -> String {
    path.split('/')
        .map(|segment| {
            if segment.starts_with('{') && segment.ends_with('}') {
                "{}".to_owned()
            } else {
                segment.to_owned()
            }
        })
        .collect::<Vec<_>>()
        .join("/")
}

#[cfg(test)]
mod tests {
    use sdkwork_web_contract::RouteAuth;

    use super::cloud_router_app_composed_route_manifest;

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
        ] {
            let route = manifest
                .match_route(method, path)
                .unwrap_or_else(|| panic!("{method} {path} must be registered"));
            assert_eq!(
                RouteAuth::Public,
                route.auth,
                "{method} {path} must inherit public auth from its capability manifest"
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
    fn composed_manifest_keeps_host_protected_routes() {
        let manifest = cloud_router_app_composed_route_manifest();
        let route = manifest
            .match_route("GET", "/app/v3/api/notification/notifications")
            .expect("host route must be registered");
        assert_eq!(RouteAuth::DualToken, route.auth);
    }
}
