use std::sync::Arc;

use axum::Router;
use sdkwork_claw_config::DatabaseConfig;
use sdkwork_claw_http::{
    claw_service_security_policy, iam_web_resolver_for_claw_database,
    inject_legacy_handler_context_from_web_context, resolve_claw_web_environment_from_process_env,
};
use sdkwork_iam_web_adapter::{
    iam_app_context_from_web_request, IamAuthorizationPolicy, IamWebRequestContextResolver,
};
use sdkwork_web_axum::{with_web_request_context, WebFrameworkLayer};
use sdkwork_web_core::{DomainContextInjector, WebRequestContext, WebRequestContextProfile};
use sqlx::PgPool;

use crate::http_route_manifest::claw_router_app_http_route_manifest;

pub fn claw_router_app_public_path_prefixes() -> Vec<String> {
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
#[derive(Clone, Default)]
struct ClawRouterAppDomainInjector;

impl DomainContextInjector for ClawRouterAppDomainInjector {
    fn inject(&self, request: &mut axum::extract::Request, context: &WebRequestContext) {
        if let Some(iam_context) = iam_app_context_from_web_request(context) {
            request.extensions_mut().insert(iam_context);
        }
        inject_legacy_handler_context_from_web_context(request, context);
    }
}

fn build_claw_router_app_web_framework_layer(
    resolver: IamWebRequestContextResolver,
) -> WebFrameworkLayer<IamWebRequestContextResolver> {
    let route_manifest = claw_router_app_http_route_manifest();
    let prefixes = claw_router_app_public_path_prefixes();
    if let Err(error) = route_manifest.validate_public_path_prefixes(&prefixes) {
        tracing::warn!(%error, "claw router app-api public path prefixes overlap protected routes");
    }
    let environment = resolve_claw_web_environment_from_process_env();
    let security_policy = claw_service_security_policy(&environment);

    WebFrameworkLayer::new(resolver)
        .with_profile(WebRequestContextProfile {
            public_path_prefixes: prefixes,
            environment,
            ..WebRequestContextProfile::default()
        })
        .with_security_policy(security_policy)
        .with_route_manifest(route_manifest.clone())
        .with_authorization_policy(Arc::new(IamAuthorizationPolicy::new(route_manifest)))
        .with_domain_injector(Arc::new(ClawRouterAppDomainInjector))
}

pub fn wrap_router_with_web_framework(
    resolver: IamWebRequestContextResolver,
    router: Router,
) -> Router {
    with_web_request_context(router, build_claw_router_app_web_framework_layer(resolver))
}

pub async fn wrap_router_with_web_framework_from_env(router: Router) -> Router {
    let resolver = iam_web_resolver_from_env(None, None).await;
    wrap_router_with_web_framework(resolver, router)
}

pub async fn iam_web_resolver_from_env(
    database_config: Option<&DatabaseConfig>,
    postgres_pool: Option<Arc<PgPool>>,
) -> IamWebRequestContextResolver {
    iam_web_resolver_for_claw_database(database_config, postgres_pool).await
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
    if web_framework_enabled_from_env() {
        let resolver = iam_web_resolver_from_env(Some(database_config), postgres_pool).await;
        wrap_router_with_web_framework(resolver, router)
    } else {
        router
    }
}

pub fn web_framework_enabled_from_env() -> bool {
    sdkwork_claw_http::claw_web_framework_enabled_from_env()
}

/// Applies the sdkwork-web-framework layer once on any externally served app-api router.
pub async fn finalize_served_router(router: Router) -> Router {
    sdkwork_claw_http::ensure_production_web_framework_security_policy();
    maybe_wrap_router_with_web_framework(router).await
}

pub async fn maybe_wrap_router_with_web_framework(router: Router) -> Router {
    if web_framework_enabled_from_env() {
        wrap_router_with_web_framework_from_env(router).await
    } else {
        router
    }
}

#[cfg(test)]
mod tests {
    use axum::body::Body;
    use axum::extract::Request;
    use sdkwork_web_core::{
        ServerRequestId, WebApiSurface, WebAuthLevel, WebAuthMode, WebDeploymentMode,
        WebEnvironment, WebLoginScope, WebRequestContext, WebRequestPrincipal, WebTransportFacts,
    };

    use super::ClawRouterAppDomainInjector;
    use sdkwork_claw_http::{trusted_request_subject_from_web_context, TrustedRequestSubject};
    use sdkwork_web_core::DomainContextInjector;

    #[test]
    fn claw_router_app_domain_injector_projects_trusted_subject_from_web_context() {
        let principal = WebRequestPrincipal::builder()
            .tenant_id("100001")
            .organization_id(Some("0".to_owned()))
            .user_id("30")
            .login_scope(WebLoginScope::Organization)
            .session_id(Some("session-1".to_owned()))
            .app_id("sdkwork-clawrouter")
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
                oauth_bearer_present: false,
                agent_token_present: false,
            },
            principal: Some(principal),
            locale: None,
            client_kind: None,
            operation: None,
        };
        let injector = ClawRouterAppDomainInjector;
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
}
