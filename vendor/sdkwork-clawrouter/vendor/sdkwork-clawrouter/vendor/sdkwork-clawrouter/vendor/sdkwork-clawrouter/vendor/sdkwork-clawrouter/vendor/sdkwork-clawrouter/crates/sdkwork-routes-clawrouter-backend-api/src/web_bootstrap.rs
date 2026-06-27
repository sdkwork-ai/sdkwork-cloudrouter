use std::sync::Arc;

use axum::Router;
use sdkwork_claw_config::DatabaseConfig;
use sdkwork_claw_http::{
    iam_web_resolver_for_claw_database, inject_legacy_handler_context_from_web_context,
};
use sdkwork_iam_web_adapter::{iam_app_context_from_web_request, IamAuthorizationPolicy, IamWebRequestContextResolver};
use sdkwork_web_axum::{with_web_request_context, WebFrameworkLayer};
use sdkwork_web_core::{DomainContextInjector, WebRequestContext, WebRequestContextProfile};
use sqlx::PgPool;

use crate::http_route_manifest::http_route_manifest;

pub fn claw_router_backend_public_path_prefixes() -> Vec<String> {
    vec![
        "/healthz".to_owned(),
        "/readyz".to_owned(),
        "/metrics".to_owned(),
        "/backend/v3/api/openapi.json".to_owned(),
    ]
}

#[derive(Clone, Default)]
struct ClawRouterBackendDomainInjector;

impl DomainContextInjector for ClawRouterBackendDomainInjector {
    fn inject(&self, request: &mut axum::extract::Request, context: &WebRequestContext) {
        if let Some(iam_context) = iam_app_context_from_web_request(context) {
            request.extensions_mut().insert(iam_context);
        }
        inject_legacy_handler_context_from_web_context(request, context);
    }
}

fn build_claw_router_backend_web_framework_layer(
    resolver: IamWebRequestContextResolver,
) -> WebFrameworkLayer<IamWebRequestContextResolver> {
    let route_manifest = http_route_manifest();
    let prefixes = claw_router_backend_public_path_prefixes();
    if let Err(error) = route_manifest.validate_public_path_prefixes(&prefixes) {
        tracing::warn!(%error, "claw router backend-api public path prefixes overlap protected routes");
    }

    WebFrameworkLayer::new(resolver)
        .with_profile(WebRequestContextProfile {
            public_path_prefixes: prefixes,
            ..WebRequestContextProfile::default()
        })
        .with_route_manifest(route_manifest.clone())
        .with_authorization_policy(Arc::new(IamAuthorizationPolicy::new(route_manifest)))
        .with_domain_injector(Arc::new(ClawRouterBackendDomainInjector))
}

pub fn wrap_router_with_web_framework(
    resolver: IamWebRequestContextResolver,
    router: Router,
) -> Router {
    with_web_request_context(router, build_claw_router_backend_web_framework_layer(resolver))
}

pub async fn iam_web_resolver_from_env(
    database_config: Option<&DatabaseConfig>,
    postgres_pool: Option<Arc<PgPool>>,
) -> IamWebRequestContextResolver {
    iam_web_resolver_for_claw_database(database_config, postgres_pool).await
}

pub async fn wrap_router_with_web_framework_from_env(router: Router) -> Router {
    let resolver = iam_web_resolver_from_env(None, None).await;
    wrap_router_with_web_framework(resolver, router)
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

/// Applies the sdkwork-web-framework layer once on any externally served backend-api router.
pub async fn finalize_served_router(router: Router) -> Router {
    maybe_wrap_router_with_web_framework(router).await
}

pub async fn maybe_wrap_router_with_web_framework(router: Router) -> Router {
    if web_framework_enabled_from_env() {
        wrap_router_with_web_framework_from_env(router).await
    } else {
        router
    }
}
