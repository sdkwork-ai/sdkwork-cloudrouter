use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::{delete, get, patch, post, put};
use axum::{Json, Router};
use serde_json::json;

use crate::{app_routes, backend_routes, CommerceHttpRoute, HttpMethod};

pub fn app_manifest_stub_router() -> Router {
    manifest_stub_router_for(app_routes())
}

pub fn backend_manifest_stub_router() -> Router {
    manifest_stub_router_for(backend_routes())
}

fn manifest_stub_router_for(routes: Vec<CommerceHttpRoute>) -> Router {
    let mut router = Router::new();

    for route in routes {
        if is_owned_by_materialized_router(route.path) {
            continue;
        }

        let path = route.path.to_string();
        let operation_id = route.operation_id;
        router = match route.method {
            HttpMethod::Delete => router.route(
                &path,
                delete(move || async move { manifest_stub_response(operation_id).await }),
            ),
            HttpMethod::Get => router.route(
                &path,
                get(move || async move { manifest_stub_response(operation_id).await }),
            ),
            HttpMethod::Patch => router.route(
                &path,
                patch(move || async move { manifest_stub_response(operation_id).await }),
            ),
            HttpMethod::Post => router.route(
                &path,
                post(move || async move { manifest_stub_response(operation_id).await }),
            ),
            HttpMethod::Put => router.route(
                &path,
                put(move || async move { manifest_stub_response(operation_id).await }),
            ),
        };
    }

    router
}

async fn manifest_stub_response(operation_id: &'static str) -> Response {
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "code": "5010",
            "msg": format!("operation {operation_id} is not materialized yet"),
            "data": null
        })),
    )
        .into_response()
}

fn is_owned_by_materialized_router(path: &str) -> bool {
    const MATERIALIZED_PREFIXES: &[&str] = &[
        "/app/v3/api/accounts",
        "/app/v3/api/addresses",
        "/app/v3/api/after_sales",
        "/app/v3/api/billing",
        "/app/v3/api/cart",
        "/app/v3/api/catalog",
        "/app/v3/api/checkout",
        "/app/v3/api/fulfillments",
        "/app/v3/api/invoices",
        "/app/v3/api/memberships",
        "/app/v3/api/orders",
        "/app/v3/api/payments",
        "/app/v3/api/promotions",
        "/app/v3/api/recharges",
        "/app/v3/api/refunds",
        "/app/v3/api/shipments",
        "/app/v3/api/shops",
        "/app/v3/api/wallet",
        "/backend/v3/api/catalog",
        "/backend/v3/api/inventory",
        "/backend/v3/api/memberships",
        "/backend/v3/api/orders",
        "/backend/v3/api/payments",
        "/backend/v3/api/shops",
    ];

    MATERIALIZED_PREFIXES
        .iter()
        .any(|prefix| path == *prefix || path.starts_with(&format!("{prefix}/")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn manifest_stub_router_registers_unmaterialized_manifest_paths() {
        assert!(!app_routes().is_empty());
        let stub_count = app_routes()
            .iter()
            .filter(|route| !is_owned_by_materialized_router(route.path))
            .count();
        assert_eq!(0, stub_count);
    }
}
