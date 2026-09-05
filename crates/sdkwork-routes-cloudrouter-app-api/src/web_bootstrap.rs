use std::sync::Arc;

use axum::Router;
use sdkwork_cloudrouter_config::DatabaseConfig;
use sdkwork_cloudrouter_http::{
    cloud_service_security_policy, ensure_workspace_database_env_from_config,
    inject_legacy_handler_context_from_web_context, resolve_cloud_web_environment_from_process_env,
    shared_http_metrics_registry,
};
use sdkwork_iam_web_adapter::{
    iam_app_context_from_web_request, iam_web_request_context_resolver_from_env,
    IamAuthorizationPolicy, IamWebRequestContextResolver,
};
use sdkwork_web_axum::{with_web_request_context, WebFrameworkLayer};
use sdkwork_web_core::{
    DomainContextInjector, HttpRouteManifest, WebRequestContext, WebRequestContextProfile,
};
use sqlx::PgPool;

use crate::manifest_composition::cloud_router_app_prepared_route_manifest;

pub fn cloud_router_app_public_path_prefixes() -> Vec<String> {
    vec![
        "/healthz".to_owned(),
        "/readyz".to_owned(),
        "/metrics".to_owned(),
        "/app/v3/api/openapi.json".to_owned(),
    ]
}

/// Projects IAM `AppContext` from the canonical `WebRequestContext` injected by
/// sdkwork-web-framework. SQL-scoped app read handlers resolve `TenantAppContext`
/// directly and do not require legacy `TrustedRequestSubject` projection.
///
/// When `owned_routes` is set (all production registrations), legacy header and
/// extension projection applies **only** to paths matched by this surface's own
/// route manifest. Composite hosts (the all-in-one platform cloud gateway)
/// register this injector on the outer pipeline where every dependency surface
/// flows through it: without the guard, the internal
/// `x-sdkwork-tenant-id`/`x-sdkwork-organization-id`/`x-sdkwork-user-id`
/// projection headers leak into foreign nested Web Framework pipelines (for
/// example the IM `/im/v3/api/*` routers), whose surface classification rejects
/// them as client-supplied identity projection (40001).
#[derive(Clone, Default)]
struct CloudRouterAppDomainInjector {
    owned_routes: Option<Arc<HttpRouteManifest>>,
}

impl CloudRouterAppDomainInjector {
    fn path_is_owned(&self, method: &str, path: &str) -> bool {
        match &self.owned_routes {
            Some(manifest) => manifest.match_route(method, path).is_some(),
            // Unguarded construction keeps the pre-guard behaviour for direct
            // unit tests; production registrations always pass a manifest.
            None => true,
        }
    }
}

impl DomainContextInjector for CloudRouterAppDomainInjector {
    fn inject(&self, request: &mut axum::extract::Request, context: &WebRequestContext) {
        if !self.path_is_owned(&context.transport.method, &context.transport.path) {
            return;
        }
        if let Some(iam_context) = iam_app_context_from_web_request(context) {
            request.extensions_mut().insert(iam_context);
        }
        inject_legacy_handler_context_from_web_context(request, context);
    }
}

/// Host-level registration guarded by this surface's prepared route manifest:
/// only app-api routes owned by this surface receive the legacy subject
/// projection, so composite hosts never poison foreign nested pipelines.
pub fn cloud_router_app_domain_context_injector() -> Arc<dyn DomainContextInjector> {
    let manifest =
        cloud_router_app_prepared_route_manifest(&cloud_router_app_public_path_prefixes(), true);
    Arc::new(CloudRouterAppDomainInjector {
        owned_routes: Some(Arc::new(manifest)),
    })
}

fn build_cloud_router_app_web_framework_layer(
    resolver: IamWebRequestContextResolver,
) -> WebFrameworkLayer<IamWebRequestContextResolver> {
    let prefixes = cloud_router_app_public_path_prefixes();
    let route_manifest = cloud_router_app_prepared_route_manifest(&prefixes, true);
    let environment = resolve_cloud_web_environment_from_process_env();
    let security_policy = cloud_service_security_policy(&environment);

    WebFrameworkLayer::new(resolver)
        .with_profile(WebRequestContextProfile {
            public_path_prefixes: prefixes,
            environment,
            ..WebRequestContextProfile::default()
        })
        .with_security_policy(security_policy)
        .with_route_manifest(route_manifest.clone())
        .with_metrics(shared_http_metrics_registry())
        .with_authorization_policy(Arc::new(IamAuthorizationPolicy::new(
            route_manifest.clone(),
        )))
        .with_domain_injector(Arc::new(CloudRouterAppDomainInjector {
            owned_routes: Some(Arc::new(route_manifest)),
        }))
}

pub fn wrap_router_with_web_framework(
    resolver: IamWebRequestContextResolver,
    router: Router,
) -> Router {
    with_web_request_context(router, build_cloud_router_app_web_framework_layer(resolver))
}

pub async fn wrap_router_with_web_framework_from_env(router: Router) -> Router {
    let resolver = iam_web_resolver_from_env(None, None).await;
    wrap_router_with_web_framework(resolver, router)
}

pub async fn iam_web_resolver_from_env(
    database_config: Option<&DatabaseConfig>,
    postgres_pool: Option<Arc<PgPool>>,
) -> IamWebRequestContextResolver {
    if let Some(config) = database_config {
        ensure_workspace_database_env_from_config(config);
    }
    match postgres_pool {
        Some(pool) => IamWebRequestContextResolver::new(Some(pool)),
        None => iam_web_request_context_resolver_from_env().await,
    }
}

pub async fn maybe_wrap_router_with_web_framework_and_database_config(
    router: Router,
    database_config: &DatabaseConfig,
) -> Router {
    maybe_wrap_router_with_web_framework_and_iam_pool(router, database_config, None).await
}

pub async fn maybe_wrap_router_with_web_framework_and_iam_pool(
    router: Router,
    database_config: &DatabaseConfig,
    postgres_pool: Option<Arc<PgPool>>,
) -> Router {
    let router = if web_framework_enabled_from_env() {
        let resolver = iam_web_resolver_from_env(Some(database_config), postgres_pool).await;
        wrap_router_with_web_framework(resolver, router)
    } else {
        router
    };
    // Locale negotiation wraps every served app-api surface (web-framework and
    // legacy paths alike) so problem responses and DB i18n names resolve per
    // request language (`I18N_SPEC.md` §2-§4).
    sdkwork_cloudrouter_http::with_request_locale(router)
}

pub fn web_framework_enabled_from_env() -> bool {
    sdkwork_cloudrouter_http::cloud_web_framework_enabled_from_env()
}

/// Applies the sdkwork-web-framework layer once on any externally served app-api router.
pub async fn finalize_served_router(router: Router) -> Router {
    sdkwork_cloudrouter_http::ensure_production_web_framework_security_policy();
    maybe_wrap_router_with_web_framework(router).await
}

pub async fn maybe_wrap_router_with_web_framework(router: Router) -> Router {
    let router = if web_framework_enabled_from_env() {
        wrap_router_with_web_framework_from_env(router).await
    } else {
        router
    };
    sdkwork_cloudrouter_http::with_request_locale(router)
}

#[cfg(test)]
mod tests {
    use axum::body::Body;
    use axum::extract::Request;
    use sdkwork_web_core::{
        ServerRequestId, WebApiSurface, WebAuthLevel, WebAuthMode, WebDeploymentMode,
        WebEnvironment, WebLoginScope, WebRequestContext, WebRequestPrincipal, WebTransportFacts,
    };

    use super::CloudRouterAppDomainInjector;
    use sdkwork_cloudrouter_http::{
        trusted_request_subject_from_web_context, TrustedRequestSubject,
    };
    use sdkwork_web_core::DomainContextInjector;

    #[test]
    fn cloud_router_app_domain_injector_projects_trusted_subject_from_web_context() {
        let principal = WebRequestPrincipal::builder()
            .tenant_id("100001")
            .organization_id(Some("0".to_owned()))
            .user_id("30")
            .login_scope(WebLoginScope::Organization)
            .session_id(Some("session-1".to_owned()))
            .app_id("sdkwork-cloudrouter")
            .environment(WebEnvironment::Dev)
            .deployment_mode(WebDeploymentMode::Private)
            .auth_level(WebAuthLevel::Password)
            .build();
        let context = WebRequestContext {
            request_id: ServerRequestId("test-request".to_owned()),
            trace_id: None,
            api_surface: WebApiSurface::AppApi,
            auth_mode: WebAuthMode::DualToken,
            transport: WebTransportFacts {
                path: "/app/v3/api/ai/dashboard/overview".to_owned(),
                method: "GET".to_owned(),
                auth_token_present: true,
                access_token_present: true,
                api_key_present: false,
                ingress_token_present: false,
                oauth_bearer_present: false,
                agent_token_present: false,
            },
            principal: Some(principal),
            locale: None,
            client_kind: None,
            operation: None,
            idempotency_key: None,
        };
        let injector = CloudRouterAppDomainInjector::default();
        let mut request = Request::new(Body::empty());
        injector.inject(&mut request, &context);

        let subject = request
            .extensions()
            .get::<TrustedRequestSubject>()
            .copied()
            .expect("trusted subject");
        assert_eq!(100_001, subject.tenant_id);
        assert_eq!(30, subject.user_id);
        assert_eq!(
            subject,
            trusted_request_subject_from_web_context(&context).expect("mapped subject")
        );
    }

    fn dual_token_context(path: &str) -> WebRequestContext {
        let principal = WebRequestPrincipal::builder()
            .tenant_id("100001")
            .organization_id(Some("0".to_owned()))
            .user_id("30")
            .login_scope(WebLoginScope::Organization)
            .session_id(Some("session-1".to_owned()))
            .app_id("sdkwork-im-pc")
            .environment(WebEnvironment::Dev)
            .deployment_mode(WebDeploymentMode::Private)
            .auth_level(WebAuthLevel::Password)
            .build();
        WebRequestContext {
            request_id: ServerRequestId("test-request".to_owned()),
            trace_id: None,
            api_surface: WebApiSurface::AppApi,
            auth_mode: WebAuthMode::DualToken,
            transport: WebTransportFacts {
                path: path.to_owned(),
                method: "GET".to_owned(),
                auth_token_present: true,
                access_token_present: true,
                api_key_present: false,
                ingress_token_present: false,
                oauth_bearer_present: false,
                agent_token_present: false,
            },
            principal: Some(principal),
            locale: None,
            client_kind: None,
            operation: None,
            idempotency_key: None,
        }
    }

    /// Regression: composite hosts register this injector on the outer
    /// pipeline, so a foreign nested Web Framework surface (IM
    /// `/im/v3/api/*`) must never receive the internal trusted-subject
    /// projection headers — its surface classification rejects them as
    /// client-supplied identity projection (40001).
    #[test]
    fn host_level_injector_skips_foreign_nested_pipeline_paths() {
        let injector = super::cloud_router_app_domain_context_injector();
        let mut request = Request::new(Body::empty());
        injector.inject(&mut request, &dual_token_context("/im/v3/api/social/users"));

        assert!(
            request.headers().get("x-sdkwork-tenant-id").is_none(),
            "host injector must not project x-sdkwork-tenant-id into foreign surfaces"
        );
        assert!(request.headers().get("x-sdkwork-user-id").is_none());
        assert!(
            request
                .extensions()
                .get::<TrustedRequestSubject>()
                .is_none(),
            "host injector must not project TrustedRequestSubject into foreign surfaces"
        );
    }

    /// Owned app-api manifest routes keep the legacy projection so standalone
    /// SQL handlers continue to resolve `TrustedRequestSubject::from_headers`.
    #[test]
    fn host_level_injector_projects_owned_manifest_routes() {
        let manifest = crate::manifest_composition::cloud_router_app_prepared_route_manifest(
            &super::cloud_router_app_public_path_prefixes(),
            true,
        );
        let route = manifest
            .routes()
            .iter()
            .find(|route| {
                route.method == sdkwork_web_contract::HttpMethod::Get && !route.path.contains('{')
            })
            .expect("prepared app manifest exposes at least one literal GET route");
        let injector = super::cloud_router_app_domain_context_injector();
        let mut request = Request::new(Body::empty());
        injector.inject(&mut request, &dual_token_context(route.path));

        assert_eq!(
            "100001",
            request
                .headers()
                .get("x-sdkwork-tenant-id")
                .expect("tenant header projected for owned route")
                .to_str()
                .expect("tenant header utf8"),
        );
        assert!(
            request
                .extensions()
                .get::<TrustedRequestSubject>()
                .is_some(),
            "trusted subject extension projected for owned route"
        );
    }
}
