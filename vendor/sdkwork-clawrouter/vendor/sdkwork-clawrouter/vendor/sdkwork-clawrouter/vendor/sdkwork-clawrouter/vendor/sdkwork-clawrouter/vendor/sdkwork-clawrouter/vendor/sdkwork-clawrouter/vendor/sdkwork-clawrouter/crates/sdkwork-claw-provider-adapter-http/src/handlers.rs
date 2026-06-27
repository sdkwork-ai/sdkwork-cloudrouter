use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::{HeaderMap, Method, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use sdkwork_claw_provider_adapter_contract::AdapterInvocationRequest;
use sdkwork_claw_provider_adapter_core::{
    provider_adapter_manifest, AdapterInvocationContext, ProviderAdapter,
};
use serde_json::{json, Value};

use crate::gateway_auth::authorized;
use crate::router::AdapterHttpState;

pub(crate) async fn healthz() -> impl IntoResponse {
    Json(json!({"status": "ok"}))
}

pub(crate) async fn manifest(
    State(state): State<AdapterHttpState>,
    headers: HeaderMap,
) -> Response {
    if !authorized(&headers, state.gateway_token.as_ref()) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(error_body("adapter_auth_failed")),
        )
            .into_response();
    }
    Json(provider_adapter_manifest(&state.adapters)).into_response()
}

pub(crate) async fn invoke_provider(
    State(state): State<AdapterHttpState>,
    method: Method,
    Path((provider_code, path)): Path<(String, String)>,
    headers: HeaderMap,
    Json(request): Json<AdapterInvocationRequest>,
) -> Response {
    if !authorized(&headers, state.gateway_token.as_ref()) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(error_body("adapter_auth_failed")),
        )
            .into_response();
    }
    if !request
        .provider
        .provider_code
        .trim()
        .eq_ignore_ascii_case(provider_code.as_str())
    {
        return (
            StatusCode::BAD_REQUEST,
            Json(error_body("adapter_invocation_provider_mismatch")),
        )
            .into_response();
    }
    if !request
        .invocation
        .method
        .trim()
        .eq_ignore_ascii_case(method.as_str())
    {
        return (
            StatusCode::BAD_REQUEST,
            Json(error_body("adapter_invocation_method_mismatch")),
        )
            .into_response();
    }
    if normalize_path(path.as_str()) != normalize_path(request.invocation.standard_path.as_str()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(error_body("adapter_invocation_path_mismatch")),
        )
            .into_response();
    }
    let Some(adapter) = find_adapter(&state.adapters, provider_code.as_str()) else {
        return (
            StatusCode::NOT_FOUND,
            Json(error_body("adapter_endpoint_not_supported")),
        )
            .into_response();
    };
    let Some(endpoint) = adapter.resolve_endpoint(&request) else {
        return (
            StatusCode::NOT_FOUND,
            Json(error_body("adapter_endpoint_not_supported")),
        )
            .into_response();
    };

    let context = AdapterInvocationContext {
        provider_code,
        request_id: request.invocation.request_id.clone(),
        trace_id: request.invocation.trace_id.clone(),
    };
    match endpoint.invoke(context, request).await {
        Ok(response) => (StatusCode::OK, Json(response)).into_response(),
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({
                "error": error
            })),
        )
            .into_response(),
    }
}

fn find_adapter(
    adapters: &[Arc<dyn ProviderAdapter>],
    provider_code: &str,
) -> Option<Arc<dyn ProviderAdapter>> {
    adapters
        .iter()
        .find(|adapter| {
            adapter
                .provider_codes()
                .iter()
                .any(|code| code.eq_ignore_ascii_case(provider_code))
        })
        .cloned()
}

fn error_body(code: &str) -> Value {
    json!({
        "error": {
            "code": code
        }
    })
}

fn normalize_path(value: &str) -> String {
    let value = value.trim();
    if value.starts_with('/') {
        value.to_owned()
    } else {
        format!("/{value}")
    }
}
