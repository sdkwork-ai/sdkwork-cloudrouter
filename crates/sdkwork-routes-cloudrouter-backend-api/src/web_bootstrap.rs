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
use sdkwork_web_core::{DomainContextInjector, WebRequestContext, WebRequestContextProfile};
use sqlx::PgPool;

use crate::http_route_manifest::http_route_manifest;

pub fn cloud_router_backend_public_path_prefixes() -> Vec<String> {
    vec![
        "/healthz".to_owned(),
        "/readyz".to_owned(),
        "/metrics".to_owned(),
        "/backend/v3/api/openapi.json".to_owned(),
    ]
}

#[derive(Clone, Default)]
struct CloudRouterBackendDomainInjector;

impl DomainContextInjector for CloudRouterBackendDomainInjector {
    fn inject(&self, request: &mut axum::extract::Request, context: &WebRequestContext) {
        if let Some(iam_context) = iam_app_context_from_web_request(context) {
            request.extensions_mut().insert(iam_context);
        }
        inject_legacy_handler_context_from_web_context(request, context);
    }
}

pub fn cloud_router_backend_domain_context_injector() -> Arc<dyn DomainContextInjector> {
    Arc::new(CloudRouterBackendDomainInjector)
}

fn build_cloud_router_backend_web_framework_layer(
    resolver: IamWebRequestContextResolver,
    extra_domain_injectors: Vec<Arc<dyn DomainContextInjector>>,
) -> WebFrameworkLayer<IamWebRequestContextResolver> {
    let route_manifest = http_route_manifest();
    let prefixes = cloud_router_backend_public_path_prefixes();
    if let Err(error) = route_manifest.validate_public_path_prefixes(&prefixes) {
        tracing::warn!(%error, "cloud router backend-api public path prefixes overlap protected routes");
    }
    let environment = resolve_cloud_web_environment_from_process_env();
    let security_policy = cloud_service_security_policy(&environment);

    let mut framework = WebFrameworkLayer::new(resolver)
        .with_profile(WebRequestContextProfile {
            public_path_prefixes: prefixes,
            environment,
            ..WebRequestContextProfile::default()
        })
        .with_security_policy(security_policy)
        .with_route_manifest(route_manifest.clone())
        .with_metrics(shared_http_metrics_registry())
        .with_authorization_policy(Arc::new(IamAuthorizationPolicy::new(route_manifest)))
        .with_domain_injector(Arc::new(CloudRouterBackendDomainInjector));
    for injector in extra_domain_injectors {
        framework = framework.with_domain_injector(injector);
    }
    framework
}

pub fn wrap_router_with_web_framework(
    resolver: IamWebRequestContextResolver,
    router: Router,
) -> Router {
    wrap_router_with_web_framework_and_injectors(resolver, router, Vec::new())
}

/// Same-origin dependency composition: registers dependency-owned domain
/// context injectors (e.g. the RTC `AppContext` injector) with the backend
/// Web Framework layer so dependency handlers receive the extensions they
/// extract (API_ASSEMBLY_SPEC §3/§4/§6.1).
pub fn wrap_router_with_web_framework_and_injectors(
    resolver: IamWebRequestContextResolver,
    router: Router,
    extra_domain_injectors: Vec<Arc<dyn DomainContextInjector>>,
) -> Router {
    with_web_request_context(
        router,
        build_cloud_router_backend_web_framework_layer(resolver, extra_domain_injectors),
    )
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

pub async fn wrap_router_with_web_framework_from_env(router: Router) -> Router {
    let resolver = iam_web_resolver_from_env(None, None).await;
    wrap_router_with_web_framework(resolver, router)
}

pub async fn maybe_wrap_router_with_web_framework_and_database_config(
    router: Router,
    database_config: &DatabaseConfig,
) -> Router {
    maybe_wrap_router_with_web_framework_and_iam_pool_with_injectors(
        router,
        database_config,
        None,
        Vec::new(),
    )
    .await
}

pub async fn maybe_wrap_router_with_web_framework_and_iam_pool(
    router: Router,
    database_config: &DatabaseConfig,
    postgres_pool: Option<Arc<PgPool>>,
) -> Router {
    maybe_wrap_router_with_web_framework_and_iam_pool_with_injectors(
        router,
        database_config,
        postgres_pool,
        Vec::new(),
    )
    .await
}

/// Same-origin dependency composition: merges dependency business routers
/// into the backend router BEFORE the Web Framework layer, and registers the
/// dependency contributions' domain context injectors with that layer so
/// dependency handlers receive the extensions they extract
/// (API_ASSEMBLY_SPEC §3/§4/§6.1).
pub async fn maybe_wrap_router_with_web_framework_and_iam_pool_with_injectors(
    router: Router,
    database_config: &DatabaseConfig,
    postgres_pool: Option<Arc<PgPool>>,
    extra_domain_injectors: Vec<Arc<dyn DomainContextInjector>>,
) -> Router {
    let router = if web_framework_enabled_from_env() {
        let resolver = iam_web_resolver_from_env(Some(database_config), postgres_pool).await;
        wrap_router_with_web_framework_and_injectors(resolver, router, extra_domain_injectors)
    } else {
        router
    };
    // Locale negotiation wraps every served backend-api surface (web-framework
    // and legacy paths alike) so problem responses and DB i18n names resolve
    // per request language (`I18N_SPEC.md` §2-§4).
    sdkwork_cloudrouter_http::with_request_locale(router)
}

pub fn web_framework_enabled_from_env() -> bool {
    sdkwork_cloudrouter_http::cloud_web_framework_enabled_from_env()
}

/// Applies the sdkwork-web-framework layer once on any externally served backend-api router.
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
