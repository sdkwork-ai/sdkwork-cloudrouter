use axum::Router;
use sdkwork_iam_web_adapter::{build_web_framework_layer, IamWebRequestContextResolver};
use sdkwork_web_axum::with_web_request_context;
use sdkwork_web_core::HttpRouteManifest;

include!(concat!(env!("OUT_DIR"), "/commerce_http_routes.rs"));

pub fn commerce_public_path_prefixes() -> Vec<String> {
    vec!["/health".to_owned(), "/ready".to_owned()]
}

fn default_resolver() -> IamWebRequestContextResolver {
    IamWebRequestContextResolver::new(None)
}

fn wrap_router_with_manifest(router: Router, route_manifest: HttpRouteManifest) -> Router {
    with_web_request_context(
        router,
        build_web_framework_layer(
            default_resolver(),
            route_manifest,
            commerce_public_path_prefixes(),
        ),
    )
}

pub fn with_commerce_app_request_context(router: Router) -> Router {
    wrap_router_with_manifest(router, HttpRouteManifest::new(COMMERCE_APP_HTTP_ROUTES))
}

pub fn with_commerce_backend_request_context(router: Router) -> Router {
    wrap_router_with_manifest(router, HttpRouteManifest::new(COMMERCE_BACKEND_HTTP_ROUTES))
}

pub async fn wrap_commerce_app_router_from_env(router: Router) -> Router {
    let resolver = sdkwork_iam_web_adapter::iam_web_request_context_resolver_from_env().await;
    with_web_request_context(
        router,
        build_web_framework_layer(
            resolver,
            HttpRouteManifest::new(COMMERCE_APP_HTTP_ROUTES),
            commerce_public_path_prefixes(),
        ),
    )
}

pub async fn wrap_commerce_backend_router_from_env(router: Router) -> Router {
    let resolver = sdkwork_iam_web_adapter::iam_web_request_context_resolver_from_env().await;
    with_web_request_context(
        router,
        build_web_framework_layer(
            resolver,
            HttpRouteManifest::new(COMMERCE_BACKEND_HTTP_ROUTES),
            commerce_public_path_prefixes(),
        ),
    )
}
