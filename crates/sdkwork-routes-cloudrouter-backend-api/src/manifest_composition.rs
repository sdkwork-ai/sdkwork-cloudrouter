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
        workspace: "sdkwork-models-catalog",
        owner: "sdkwork-models-catalog",
        manifest: sdkwork_routes_models_catalog_backend_api::backend_route_manifest,
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
        workspace: "sdkwork-course",
        owner: "sdkwork-course",
        manifest: sdkwork_routes_course_backend_api::course_backend_api_http_route_manifest,
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
    MountedBackendCapability {
        workspace: "sdkwork-skills",
        owner: "sdkwork-skills",
        manifest: sdkwork_routes_skills_backend_api::backend_route_manifest,
    },
    MountedBackendCapability {
        workspace: "sdkwork-mcp",
        owner: "sdkwork-mcp",
        manifest: sdkwork_routes_mcp_backend_api::backend_route_manifest,
    },
    MountedBackendCapability {
        workspace: "sdkwork-agents",
        owner: "sdkwork-agents",
        manifest: sdkwork_api_agents_assembly::backend_api_route_manifest,
    },
    MountedBackendCapability {
        workspace: "sdkwork-plugins",
        owner: "sdkwork-plugins",
        manifest: sdkwork_routes_plugins_backend_api::backend_route_manifest,
    },
    MountedBackendCapability {
        workspace: "sdkwork-memory",
        owner: "sdkwork-memory",
        manifest: sdkwork_routes_memory_backend_api::backend_route_manifest,
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

/// Backend capabilities whose routers are dispatched by the Cloud Router cloud
/// assembly contribution itself (`ApiAssemblyContext::cloud_gateway`).
///
/// Every other mounted backend capability is mounted by the platform cloud
/// gateway as a separate `WebModule` contribution; declaring its routes here as
/// well produces a cross-owner collision when the gateway composes module
/// manifests. `sdkwork-models` is not an embedded gateway surface at all, so
/// its catalog backend routes would otherwise be advertised by nobody and the
/// Web Framework would answer `404 route-not-in-manifest` even though the
/// executable backend router still dispatches them.
///
/// Keep this list aligned with `included_in_cloud_assembly_manifest` on
/// `MOUNTED_APP_CAPABILITIES` in `sdkwork-routes-cloudrouter-app-api`.
const CLOUD_ASSEMBLY_BACKEND_WORKSPACES: &[&str] = &["sdkwork-models-catalog", "sdkwork-partner"];

fn mounts_for_cloud_assembly() -> Vec<RouteManifestMount> {
    MOUNTED_BACKEND_CAPABILITIES
        .iter()
        .filter(|capability| CLOUD_ASSEMBLY_BACKEND_WORKSPACES.contains(&capability.workspace))
        .map(|capability| RouteManifestMount {
            owner: capability.owner,
            manifest: (capability.manifest)(),
        })
        .collect()
}

fn compose_backend_route_manifest() -> HttpRouteManifest {
    compose_backend_route_manifest_from(http_route_manifest())
}

/// Composes on top of an explicit generated base manifest so the host
/// bootstrap names the generated [`http_route_manifest`] entrypoint.
fn compose_backend_route_manifest_from(base: HttpRouteManifest) -> HttpRouteManifest {
    let mounts = dependency_mounts();
    let composed = HttpRouteManifest::try_merge_mounts("sdkwork-cloudrouter", base, &mounts)
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

/// Composed backend manifest for the platform cloud gateway
/// (`ApiAssemblyContext::cloud_gateway`): host-owned routes plus only the
/// capabilities the Cloud Router cloud assembly contribution dispatches itself.
/// The gateway owns the remaining same-origin dependency contributions and
/// contributes their manifests separately.
pub fn cloud_router_backend_composed_route_manifest_for_platform_gateway() -> HttpRouteManifest {
    let mounts = mounts_for_cloud_assembly();
    let composed =
        HttpRouteManifest::try_merge_mounts("sdkwork-cloudrouter", http_route_manifest(), &mounts)
            .unwrap_or_else(|error| {
                panic!(
                    "cloud router cloud assembly backend-api manifest composition failed: {error}"
                );
            });
    composed
        .validate_includes_dependency_manifests(&mounts)
        .unwrap_or_else(|error| {
            panic!("cloud router cloud assembly backend-api manifest missing dependency auth profiles: {error}");
        });
    composed
}

/// Validates and returns the composed backend manifest for Web Framework binding.
pub fn cloud_router_backend_prepared_route_manifest(
    base: HttpRouteManifest,
    public_path_prefixes: &[String],
) -> HttpRouteManifest {
    let mounts = dependency_mounts();
    let profile = WebRequestContextProfile::default();
    sdkwork_web_bootstrap::finalize_host_route_manifest(
        "sdkwork-cloudrouter",
        compose_backend_route_manifest_from(base),
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
        cloud_router_backend_composed_route_manifest,
        cloud_router_backend_composed_route_manifest_for_platform_gateway,
        cloud_router_backend_prepared_route_manifest, mounts_for_cloud_assembly,
        CLOUD_ASSEMBLY_BACKEND_WORKSPACES, MOUNTED_BACKEND_CAPABILITIES,
    };
    use crate::http_route_manifest::http_route_manifest;

    #[test]
    fn platform_gateway_backend_manifest_includes_models_catalog_routes() {
        // Regression: ApiAssemblyContext::cloud_gateway bound the bare host
        // backend manifest while the executable backend router still merged
        // sdkwork-routes-models-catalog-backend-api. The Web Framework then
        // answered 404 route-not-in-manifest for POST
        // /backend/v3/api/ai/models/sync, which also broke the empty-catalog
        // initialization sync on the "model vendors" admin page.
        let manifest = cloud_router_backend_composed_route_manifest_for_platform_gateway();
        for (method, path) in [
            ("GET", "/backend/v3/api/ai/model_vendors"),
            ("POST", "/backend/v3/api/ai/model_vendors"),
            ("GET", "/backend/v3/api/ai/models"),
            ("POST", "/backend/v3/api/ai/models"),
            ("POST", "/backend/v3/api/ai/models/sync"),
            ("GET", "/backend/v3/api/ai/model_mappings"),
            ("POST", "/backend/v3/api/ai/model_mappings/resolve"),
            ("GET", "/backend/v3/api/ai/model_rankings"),
            ("GET", "/backend/v3/api/ai/voices"),
            ("GET", "/backend/v3/api/ai/video_profiles"),
            ("GET", "/backend/v3/api/ai/resources"),
            ("GET", "/backend/v3/api/ai/resource_groups"),
        ] {
            let route = manifest.match_route(method, path).unwrap_or_else(|| {
                panic!("{method} {path} must be registered by the platform-gateway models-catalog mount")
            });
            assert_eq!(
                RouteAuth::DualToken,
                route.auth,
                "{method} {path} must inherit dual-token auth from the models-catalog manifest"
            );
        }
    }

    #[test]
    fn platform_gateway_backend_manifest_is_scoped_to_cloud_assembly_mounts() {
        let scoped = cloud_router_backend_composed_route_manifest_for_platform_gateway();
        let full = cloud_router_backend_composed_route_manifest();
        assert!(
            scoped.routes().len() < full.routes().len(),
            "gateway-owned capabilities must stay out of the cloud assembly manifest"
        );
        let mounts = mounts_for_cloud_assembly();
        let expected = http_route_manifest().routes().len()
            + mounts
                .iter()
                .map(|mount| mount.manifest.routes().len())
                .sum::<usize>();
        assert_eq!(
            scoped.routes().len(),
            expected,
            "scoped manifest must be exactly the host manifest plus cloud-assembly mounts"
        );
        assert_eq!(
            CLOUD_ASSEMBLY_BACKEND_WORKSPACES.len(),
            mounts.len(),
            "every declared cloud-assembly workspace must resolve to a mounted capability"
        );
    }

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
            "sdkwork-course",
            "sdkwork-log",
            "sdkwork-drive",
            "sdkwork-skills",
            "sdkwork-mcp",
            "sdkwork-agents",
            "sdkwork-plugins",
            "sdkwork-memory",
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
            (
                "sdkwork-course",
                "sdkwork_api_course_assembly::assemble_backend_business_router_with_pool",
            ),
            ("sdkwork-rtc", "assemble_backend_api_contribution_with_pool"),
            (
                "sdkwork-skills",
                "sdkwork_api_skills_assembly::assemble_backend_api_contribution",
            ),
            (
                "sdkwork-mcp",
                "sdkwork_api_mcp_assembly::assemble_backend_api_contribution",
            ),
            (
                "sdkwork-agents",
                "sdkwork_api_agents_assembly::assemble_backend_api_contribution",
            ),
            (
                "sdkwork-plugins",
                "sdkwork_api_plugins_assembly::assemble_backend_api_contribution",
            ),
            (
                "sdkwork-memory",
                "sdkwork_api_memory_assembly::assemble_backend_api_contribution_from_env",
            ),
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
    fn composed_manifest_includes_models_catalog_backend_routes() {
        // Regression: the models-catalog capability was absent from
        // MOUNTED_BACKEND_CAPABILITIES while its axum router was still merged in
        // `routes.rs`. Every declared /backend/v3/api/ai/* path therefore fell
        // through the Web Framework route manifest and answered
        // 404 route-not-in-manifest ("route is not registered in the gateway
        // route manifest") even though the handler was live.
        let manifest = cloud_router_backend_composed_route_manifest();
        for (method, path) in [
            ("GET", "/backend/v3/api/ai/model_vendors"),
            ("POST", "/backend/v3/api/ai/model_vendors"),
            ("GET", "/backend/v3/api/ai/models"),
            ("POST", "/backend/v3/api/ai/models"),
            ("POST", "/backend/v3/api/ai/models/sync"),
            ("GET", "/backend/v3/api/ai/model_mappings"),
            ("POST", "/backend/v3/api/ai/model_mappings/resolve"),
            ("GET", "/backend/v3/api/ai/model_rankings"),
            ("GET", "/backend/v3/api/ai/voices"),
            ("GET", "/backend/v3/api/ai/video_profiles"),
            ("GET", "/backend/v3/api/ai/resources"),
            ("GET", "/backend/v3/api/ai/resource_groups"),
        ] {
            let route = manifest.match_route(method, path).unwrap_or_else(|| {
                panic!("{method} {path} must be registered by the models-catalog mount")
            });
            assert_eq!(
                RouteAuth::DualToken,
                route.auth,
                "{method} {path} must inherit dual-token auth from the models-catalog manifest"
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
    fn composed_manifest_includes_course_backend_routes() {
        // Regression: the Course Center admin module reached
        // `/backend/v3/api/course_*` through the same-origin dependency backend
        // base URL and answered 404 because the course capability was merged
        // nowhere. The capability is dependency-owned, so every declared
        // `/backend/v3/api/course_*` path must be registered by the course mount
        // and inherit its dual-token auth and `course.*` permissions.
        let manifest = cloud_router_backend_composed_route_manifest();
        for (method, path, permission) in [
            (
                "GET",
                "/backend/v3/api/course_categories",
                "course.categories.read",
            ),
            (
                "POST",
                "/backend/v3/api/course_categories",
                "course.categories.write",
            ),
            (
                "GET",
                "/backend/v3/api/course_instructors",
                "course.instructors.read",
            ),
            (
                "POST",
                "/backend/v3/api/course_instructors",
                "course.instructors.write",
            ),
            ("GET", "/backend/v3/api/courses", "course.courses.read"),
            (
                "POST",
                "/backend/v3/api/courses/{courseId}/publish",
                "course.courses.publish",
            ),
            (
                "GET",
                "/backend/v3/api/courses/{courseId}/offerings",
                "course.offerings.read",
            ),
            (
                "GET",
                "/backend/v3/api/courses/{courseId}/sections",
                "course.lessons.read",
            ),
            (
                "GET",
                "/backend/v3/api/courses/{courseId}/lessons",
                "course.lessons.read",
            ),
            (
                "GET",
                "/backend/v3/api/course_lessons/{lessonId}/resources",
                "course.resources.read",
            ),
            (
                "GET",
                "/backend/v3/api/course_live_sessions",
                "course.live_sessions.read",
            ),
            (
                "POST",
                "/backend/v3/api/course_live_sessions/{liveSessionId}/start",
                "course.live_sessions.operate",
            ),
            (
                "GET",
                "/backend/v3/api/course_enrollments",
                "course.enrollments.read",
            ),
            (
                "POST",
                "/backend/v3/api/course_enrollments/grants",
                "course.enrollments.write",
            ),
            (
                "GET",
                "/backend/v3/api/course_progress",
                "course.progress.read",
            ),
            (
                "PATCH",
                "/backend/v3/api/course_lesson_progress/{lessonProgressId}",
                "course.progress.repair",
            ),
            (
                "GET",
                "/backend/v3/api/course_reactions",
                "course.reactions.read",
            ),
            (
                "GET",
                "/backend/v3/api/course_reviews",
                "course.reviews.read",
            ),
            (
                "GET",
                "/backend/v3/api/course_reviews/stats",
                "course.reviews.read",
            ),
            (
                "GET",
                "/backend/v3/api/course_reviews/{courseId}",
                "course.reviews.read",
            ),
            (
                "POST",
                "/backend/v3/api/course_reviews/{courseId}/review",
                "course.reviews.review",
            ),
            (
                "GET",
                "/backend/v3/api/course_applications",
                "course.applications.read",
            ),
            (
                "PATCH",
                "/backend/v3/api/course_applications/{applicationId}/review",
                "course.applications.review",
            ),
            (
                "GET",
                "/backend/v3/api/course_reports/overview",
                "course.reports.read",
            ),
            (
                "GET",
                "/backend/v3/api/course_audit_logs",
                "course.audit_logs.read",
            ),
        ] {
            let route = manifest.match_route(method, path).unwrap_or_else(|| {
                panic!("{method} {path} must be registered by the course mount")
            });
            assert_eq!(
                RouteAuth::DualToken,
                route.auth,
                "{method} {path} must inherit dual-token auth from the course manifest"
            );
            assert_eq!(
                Some(permission),
                route.required_permission,
                "{method} {path} must keep its declared course permission"
            );
        }
    }

    #[test]
    fn composed_manifest_includes_skills_backend_routes() {
        // Regression guard: the Skills admin module (技能管理) reaches
        // `/backend/v3/api/skills` and `/backend/v3/api/skill_*` through the
        // same-origin dependency backend base URL. The capability is
        // dependency-owned, so every declared path must be registered by the
        // skills mount and keep its dual-token auth and `skills.*` permission.
        let manifest = cloud_router_backend_composed_route_manifest();
        for (method, path, permission) in [
            ("GET", "/backend/v3/api/skills", "skills.marketplace.read"),
            (
                "GET",
                "/backend/v3/api/skill_packages",
                "skills.packages.manage",
            ),
            (
                "POST",
                "/backend/v3/api/skill_packages",
                "skills.packages.manage",
            ),
            (
                "PATCH",
                "/backend/v3/api/skill_packages/{packageId}",
                "skills.packages.manage",
            ),
            (
                "DELETE",
                "/backend/v3/api/skill_packages/{packageId}",
                "skills.packages.manage",
            ),
            (
                "GET",
                "/backend/v3/api/skill_categories",
                "skills.categories.manage",
            ),
            (
                "POST",
                "/backend/v3/api/skill_categories",
                "skills.categories.manage",
            ),
            (
                "PATCH",
                "/backend/v3/api/skill_categories/{categoryId}",
                "skills.categories.manage",
            ),
            (
                "GET",
                "/backend/v3/api/skill_capabilities",
                "skills.capabilities.manage",
            ),
            (
                "POST",
                "/backend/v3/api/skill_capabilities",
                "skills.capabilities.manage",
            ),
        ] {
            let route = manifest.match_route(method, path).unwrap_or_else(|| {
                panic!("{method} {path} must be registered by the skills mount")
            });
            assert_eq!(
                RouteAuth::DualToken,
                route.auth,
                "{method} {path} must inherit dual-token auth from the skills manifest"
            );
            assert_eq!(
                Some(permission),
                route.required_permission,
                "{method} {path} must keep its declared skills permission"
            );
        }
    }

    #[test]
    fn composed_manifest_includes_mcp_backend_routes() {
        // Regression guard: the Connector admin module (连接器管理) reaches
        // `/backend/v3/api/mcp/*` through the same-origin dependency backend
        // base URL. The capability is dependency-owned, so every declared path
        // must be registered by the mcp mount and keep its dual-token auth and
        // `mcp.admin.*` permission.
        let manifest = cloud_router_backend_composed_route_manifest();
        for (method, path, permission) in [
            (
                "GET",
                "/backend/v3/api/mcp/categories",
                "mcp.admin.marketplace.read",
            ),
            (
                "POST",
                "/backend/v3/api/mcp/categories",
                "mcp.admin.category.manage",
            ),
            (
                "GET",
                "/backend/v3/api/mcp/servers",
                "mcp.admin.marketplace.read",
            ),
            (
                "POST",
                "/backend/v3/api/mcp/servers",
                "mcp.admin.server.manage",
            ),
            (
                "PUT",
                "/backend/v3/api/mcp/servers/{serverKey}",
                "mcp.admin.server.manage",
            ),
            (
                "DELETE",
                "/backend/v3/api/mcp/servers/{serverKey}",
                "mcp.admin.server.manage",
            ),
            (
                "GET",
                "/backend/v3/api/mcp/servers/{serverId}/connectors",
                "mcp.admin.marketplace.read",
            ),
            (
                "POST",
                "/backend/v3/api/mcp/servers/{serverId}/connectors",
                "mcp.admin.server.manage",
            ),
        ] {
            let route = manifest
                .match_route(method, path)
                .unwrap_or_else(|| panic!("{method} {path} must be registered by the mcp mount"));
            assert_eq!(
                RouteAuth::DualToken,
                route.auth,
                "{method} {path} must inherit dual-token auth from the mcp manifest"
            );
            assert_eq!(
                Some(permission),
                route.required_permission,
                "{method} {path} must keep its declared mcp permission"
            );
        }
    }

    #[test]
    fn composed_manifest_includes_agents_backend_routes() {
        // Regression guard: the Agent admin module (Agent管理) reaches
        // `/backend/v3/api/ai/agents` through the same-origin dependency
        // backend base URL. The capability is dependency-owned, so the managed
        // agents CRUD paths must be registered by the agents mount and keep
        // their dual-token auth plus the `x-sdkwork-permission` codes declared
        // by the Agents OpenAPI authority.
        let manifest = cloud_router_backend_composed_route_manifest();
        for (method, path, permission) in [
            ("GET", "/backend/v3/api/ai/agents", "agent.business.list"),
            ("POST", "/backend/v3/api/ai/agents", "agent.business.create"),
            (
                "GET",
                "/backend/v3/api/ai/agents/{agentId}",
                "agent.business.retrieve",
            ),
            (
                "PATCH",
                "/backend/v3/api/ai/agents/{agentId}",
                "agent.business.update",
            ),
            (
                "POST",
                "/backend/v3/api/ai/agents/{agentId}/status",
                "agent.business.status.update",
            ),
            (
                "POST",
                "/backend/v3/api/ai/agents/{agentId}/restore",
                "agent.business.restore",
            ),
            (
                "GET",
                "/backend/v3/api/ai/agents/{agentId}/audit_events",
                "agent.business.audit.read",
            ),
            (
                "GET",
                "/backend/v3/api/ai/agent_categories",
                "agent.business.category.read",
            ),
            (
                "PUT",
                "/backend/v3/api/ai/agent_categories/{categoryCode}",
                "agent.business.category.manage",
            ),
        ] {
            let route = manifest.match_route(method, path).unwrap_or_else(|| {
                panic!("{method} {path} must be registered by the agents mount")
            });
            assert_eq!(
                RouteAuth::DualToken,
                route.auth,
                "{method} {path} must inherit dual-token auth from the agents manifest"
            );
            assert_eq!(
                Some(permission),
                route.required_permission,
                "{method} {path} must keep its declared agents permission"
            );
        }
    }

    #[test]
    fn composed_manifest_includes_plugins_backend_routes() {
        // Regression guard: the Plugin admin module (插件管理) reaches
        // `/backend/v3/api/plugins` and `/backend/v3/api/plugin_categories`
        // through the same-origin dependency backend base URL. The capability
        // is dependency-owned (sdkwork-plugins), so every declared path must
        // be registered by the plugins mount and keep its dual-token auth and
        // `plugins.admin.*` permission.
        let manifest = cloud_router_backend_composed_route_manifest();
        for (method, path, permission) in [
            (
                "GET",
                "/backend/v3/api/plugin_categories",
                "plugins.admin.category.read",
            ),
            (
                "POST",
                "/backend/v3/api/plugin_categories",
                "plugins.admin.category.manage",
            ),
            (
                "GET",
                "/backend/v3/api/plugins",
                "plugins.admin.plugin.read",
            ),
            (
                "POST",
                "/backend/v3/api/plugins",
                "plugins.admin.plugin.manage",
            ),
            (
                "PUT",
                "/backend/v3/api/plugins/{pluginKey}",
                "plugins.admin.plugin.manage",
            ),
            (
                "DELETE",
                "/backend/v3/api/plugins/{pluginKey}",
                "plugins.admin.plugin.manage",
            ),
        ] {
            let route = manifest.match_route(method, path).unwrap_or_else(|| {
                panic!("{method} {path} must be registered by the plugins mount")
            });
            assert_eq!(
                RouteAuth::DualToken,
                route.auth,
                "{method} {path} must inherit dual-token auth from the plugins manifest"
            );
            assert_eq!(
                Some(permission),
                route.required_permission,
                "{method} {path} must keep its declared plugins permission"
            );
        }
    }

    #[test]
    fn composed_manifest_includes_memory_backend_routes() {
        // Regression guard: the Memory admin module (记忆管理/记忆分类管理)
        // reaches `/backend/v3/api/memory/*` through the same-origin dependency
        // backend base URL. The capability is dependency-owned, so the spaces,
        // memories, and usage paths must be registered by the memory mount and
        // keep their dual-token auth and `memory.backend.*` permissions.
        let manifest = cloud_router_backend_composed_route_manifest();
        for (method, path, permission) in [
            (
                "GET",
                "/backend/v3/api/memory/spaces",
                "memory.backend.spaces.read",
            ),
            (
                "PATCH",
                "/backend/v3/api/memory/spaces/{spaceId}",
                "memory.backend.spaces.write",
            ),
            ("GET", "/backend/v3/api/memory/memories", "memory.backend.records.read"),
            (
                "PATCH",
                "/backend/v3/api/memory/memories/{memoryId}",
                "memory.backend.records.write",
            ),
            (
                "POST",
                "/backend/v3/api/memory/memories/{memoryId}/supersede",
                "memory.backend.records.write",
            ),
            ("GET", "/backend/v3/api/memory/usage", "memory.backend.usage.read"),
        ] {
            let route = manifest.match_route(method, path).unwrap_or_else(|| {
                panic!("{method} {path} must be registered by the memory mount")
            });
            assert_eq!(
                RouteAuth::DualToken,
                route.auth,
                "{method} {path} must inherit dual-token auth from the memory manifest"
            );
            assert_eq!(
                Some(permission),
                route.required_permission,
                "{method} {path} must keep its declared memory permission"
            );
        }
    }

    #[test]
    fn prepared_backend_manifest_validates_without_double_merge() {
        let prefixes = vec!["/healthz".to_owned(), "/readyz".to_owned()];
        let manifest =
            cloud_router_backend_prepared_route_manifest(http_route_manifest(), &prefixes);
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
