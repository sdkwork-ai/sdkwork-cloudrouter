//! Route tables materialized from `sdks/_route-manifests` via `build.rs`.

use sdkwork_web_contract::HttpRoute;

use crate::{
    CommerceHttpRoute, HttpMethod, COMMERCE_APP_HTTP_ROUTES, COMMERCE_BACKEND_HTTP_ROUTES,
};

fn map_method(method: sdkwork_web_contract::HttpMethod) -> HttpMethod {
    use sdkwork_web_contract::HttpMethod as FrameworkMethod;
    match method {
        FrameworkMethod::Delete => HttpMethod::Delete,
        FrameworkMethod::Get => HttpMethod::Get,
        FrameworkMethod::Patch => HttpMethod::Patch,
        FrameworkMethod::Post => HttpMethod::Post,
        FrameworkMethod::Put => HttpMethod::Put,
    }
}

fn commerce_route_from_http_route(route: &HttpRoute) -> CommerceHttpRoute {
    CommerceHttpRoute::new(
        map_method(route.method),
        route.path,
        route.tag,
        route.operation_id,
    )
}

pub fn app_routes() -> Vec<CommerceHttpRoute> {
    COMMERCE_APP_HTTP_ROUTES
        .iter()
        .map(commerce_route_from_http_route)
        .collect()
}

pub fn backend_routes() -> Vec<CommerceHttpRoute> {
    COMMERCE_BACKEND_HTTP_ROUTES
        .iter()
        .map(commerce_route_from_http_route)
        .collect()
}
