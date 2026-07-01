//! SdkWork HTTP API response helpers (`API_SPEC.md` §15).
//!
//! Success bodies use `SdkWorkApiResponse`; failures use RFC 9457 `ProblemDetail`
//! with `application/problem+json`.

use axum::{
    http::{header, HeaderName, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use sdkwork_utils_rust::{
    legacy_wire_result_code, PageInfo, PageMode, SdkWorkApiResponse, SdkWorkPageData,
    SdkWorkProblemDetail, SdkWorkProblemRouting, SdkWorkResourceData, SdkWorkResultCode,
};
use sdkwork_web_core::WebRequestContext;
use serde::Serialize;

use crate::api::request_id::generate_server_request_id;

pub fn new_trace_id() -> String {
    generate_server_request_id().unwrap_or_else(|_| sdkwork_utils_rust::uuid())
}

pub fn resolve_trace_id(context: Option<&WebRequestContext>) -> String {
    context
        .and_then(|ctx| {
            let resolved = ctx.resolved_trace_id();
            if resolved.trim().is_empty() {
                None
            } else {
                Some(resolved)
            }
        })
        .or_else(|| {
            context
                .and_then(|ctx| ctx.trace_id.clone())
                .filter(|value| !value.trim().is_empty())
        })
        .unwrap_or_else(new_trace_id)
}

pub fn trace_id_from_context(context: Option<&WebRequestContext>) -> String {
    resolve_trace_id(context)
}

pub fn success_envelope<T: Serialize>(data: T) -> SdkWorkApiResponse<T> {
    SdkWorkApiResponse::success(data, new_trace_id())
}

pub fn success_envelope_for_context<T: Serialize>(
    context: Option<&WebRequestContext>,
    data: T,
) -> SdkWorkApiResponse<T> {
    SdkWorkApiResponse::success(data, resolve_trace_id(context))
}

pub fn success_envelope_with_trace<T: Serialize>(
    trace_id: impl Into<String>,
    data: T,
) -> SdkWorkApiResponse<T> {
    SdkWorkApiResponse::success(data, trace_id)
}

/// Maps transitional legacy string wire codes to platform `ProblemDetail`.
pub fn problem_from_wire_code(
    wire_code: impl AsRef<str>,
    detail: impl Into<String>,
) -> ProblemResponse {
    ProblemResponse::from_legacy(wire_code.as_ref(), detail.into(), new_trace_id())
}

pub fn problem_from_wire_code_for_context(
    context: Option<&WebRequestContext>,
    wire_code: impl AsRef<str>,
    detail: impl Into<String>,
) -> ProblemResponse {
    ProblemResponse::from_legacy_enriched(
        wire_code.as_ref(),
        detail.into(),
        resolve_trace_id(context),
        problem_routing(context),
    )
}

pub fn platform_problem(
    result_code: SdkWorkResultCode,
    detail: impl Into<String>,
) -> ProblemResponse {
    ProblemResponse::platform(result_code, detail, new_trace_id())
}

fn problem_routing(context: Option<&WebRequestContext>) -> SdkWorkProblemRouting {
    context
        .map(WebRequestContext::problem_routing)
        .unwrap_or_default()
}

pub fn platform_problem_for_context(
    context: Option<&WebRequestContext>,
    result_code: SdkWorkResultCode,
    detail: impl Into<String>,
) -> ProblemResponse {
    ProblemResponse::platform_enriched(
        result_code,
        detail,
        resolve_trace_id(context),
        problem_routing(context),
    )
}

pub fn validation_problem_for_context(
    context: Option<&WebRequestContext>,
    detail: impl Into<String>,
) -> ProblemResponse {
    platform_problem_for_context(context, SdkWorkResultCode::ValidationError, detail)
}

pub fn validation_problem(detail: impl Into<String>) -> ProblemResponse {
    platform_problem(SdkWorkResultCode::ValidationError, detail)
}

pub fn not_found_problem(detail: impl Into<String>) -> ProblemResponse {
    platform_problem(SdkWorkResultCode::NotFound, detail)
}

pub fn conflict_problem(detail: impl Into<String>) -> ProblemResponse {
    platform_problem(SdkWorkResultCode::Conflict, detail)
}

pub fn unauthorized_problem(detail: impl Into<String>) -> ProblemResponse {
    platform_problem(SdkWorkResultCode::AuthenticationRequired, detail)
}

pub fn unprocessable_problem(detail: impl Into<String>) -> ProblemResponse {
    platform_problem(SdkWorkResultCode::UnprocessableEntity, detail)
}

pub fn internal_problem(detail: impl Into<String>) -> ProblemResponse {
    platform_problem(SdkWorkResultCode::InternalError, detail)
}

#[derive(Debug, Clone)]
pub struct ProblemResponse {
    pub problem: SdkWorkProblemDetail,
}

impl ProblemResponse {
    pub fn from_legacy(wire_code: &str, detail: String, trace_id: String) -> Self {
        Self::from_legacy_enriched(wire_code, detail, trace_id, SdkWorkProblemRouting::default())
    }

    pub fn from_legacy_enriched(
        wire_code: &str,
        detail: String,
        trace_id: String,
        routing: SdkWorkProblemRouting,
    ) -> Self {
        let result_code = legacy_wire_result_code(wire_code);
        Self {
            problem: SdkWorkProblemDetail::platform_enriched(result_code, detail, trace_id, routing),
        }
    }

    pub fn platform(
        result_code: SdkWorkResultCode,
        detail: impl Into<String>,
        trace_id: impl Into<String>,
    ) -> Self {
        Self::platform_enriched(result_code, detail, trace_id, SdkWorkProblemRouting::default())
    }

    pub fn platform_enriched(
        result_code: SdkWorkResultCode,
        detail: impl Into<String>,
        trace_id: impl Into<String>,
        routing: SdkWorkProblemRouting,
    ) -> Self {
        Self {
            problem: SdkWorkProblemDetail::platform_enriched(
                result_code,
                detail,
                trace_id,
                routing,
            ),
        }
    }
}

impl IntoResponse for ProblemResponse {
    fn into_response(self) -> Response {
        let trace_id = self.problem.trace_id.clone();
        let status = StatusCode::from_u16(self.problem.status)
            .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        let mut response = (
            status,
            [(header::CONTENT_TYPE, "application/problem+json")],
            Json(self.problem),
        )
            .into_response();
        attach_trace_header(&mut response, &trace_id);
        response
    }
}

pub fn attach_trace_header(response: &mut Response, trace_id: &str) {
    if let Ok(value) = HeaderValue::from_str(trace_id) {
        response.headers_mut().insert(
            HeaderName::from_static("x-sdkwork-trace-id"),
            value,
        );
    }
}

pub fn json_success_response<T: Serialize>(
    context: Option<&WebRequestContext>,
    data: T,
) -> Response {
    let trace_id = resolve_trace_id(context);
    let envelope = SdkWorkApiResponse::success(data, trace_id.clone());
    let mut response = (StatusCode::OK, Json(envelope)).into_response();
    attach_trace_header(&mut response, &trace_id);
    response
}

/// Offset pagination metadata for list responses (`API_SPEC.md` §16).
pub fn offset_page_info(page_no: i64, page_size: i64, total_items: i64) -> PageInfo {
    let total_pages = if page_size > 0 {
        Some(((total_items + page_size - 1) / page_size) as i32)
    } else {
        None
    };
    PageInfo {
        mode: PageMode::Offset,
        page: Some(page_no as i32),
        page_size: Some(page_size as i32),
        total_items: Some(total_items.to_string()),
        total_pages,
        next_cursor: None,
        has_more: None,
    }
}

/// List success body (`API_SPEC.md` §15.4 List → `data.items` + `data.pageInfo`).
pub fn json_success_list_response<T: Serialize>(
    context: Option<&WebRequestContext>,
    items: Vec<T>,
    page_info: PageInfo,
) -> Response {
    let trace_id = resolve_trace_id(context);
    let envelope = SdkWorkApiResponse::success(
        SdkWorkPageData { items, page_info },
        trace_id.clone(),
    );
    let mut response = (StatusCode::OK, Json(envelope)).into_response();
    attach_trace_header(&mut response, &trace_id);
    response
}

/// Single-resource success body (`API_SPEC.md` §15.4 Retrieve → `data.item`).
pub fn json_success_item_response<T: Serialize>(
    context: Option<&WebRequestContext>,
    item: T,
) -> Response {
    let trace_id = resolve_trace_id(context);
    let envelope = SdkWorkApiResponse::success(SdkWorkResourceData { item }, trace_id.clone());
    let mut response = (StatusCode::OK, Json(envelope)).into_response();
    attach_trace_header(&mut response, &trace_id);
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn success_envelope_uses_sdkwork_v3_shape() {
        let body = success_envelope(serde_json::json!({"items": []}));
        assert_eq!(0, body.code);
        assert!(!body.trace_id.is_empty());
    }

    #[test]
    fn wire_code_not_found_maps_to_problem_detail() {
        let response = problem_from_wire_code("4040", "missing resource");
        assert_eq!(404, response.problem.status);
        assert_eq!(40401, response.problem.code);
    }

    #[test]
    fn wire_code_4004_maps_to_not_found() {
        let response = problem_from_wire_code("4004", "missing resource");
        assert_eq!(40401, response.problem.code);
    }

    #[test]
    fn problem_response_sets_problem_json_content_type() {
        let response = problem_from_wire_code("4010", "auth required").into_response();
        assert_eq!(
            Some("application/problem+json"),
            response
                .headers()
                .get(header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
        );
    }

    #[test]
    fn json_success_list_response_uses_sdkwork_page_data_envelope() {
        let response = json_success_list_response(
            None,
            vec![serde_json::json!({"id": "1"})],
            offset_page_info(1, 10, 1),
        );
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("runtime");
        let bytes = rt
            .block_on(async { axum::body::to_bytes(response.into_body(), usize::MAX).await })
            .expect("body");
        let payload: serde_json::Value = serde_json::from_slice(&bytes).expect("json");
        assert_eq!(0, payload["code"].as_i64().unwrap());
        assert_eq!(1, payload["data"]["items"].as_array().unwrap().len());
        assert_eq!("offset", payload["data"]["pageInfo"]["mode"].as_str().unwrap());
        assert_eq!(1, payload["data"]["pageInfo"]["page"].as_i64().unwrap());
    }

    #[test]
    fn json_success_item_response_uses_sdkwork_resource_data_envelope() {
        use sdkwork_web_core::{
            ServerRequestId, WebApiSurface, WebAuthMode, WebOperationBinding, WebTransportFacts,
        };

        let context = WebRequestContext {
            request_id: ServerRequestId("req-item".to_owned()),
            api_surface: WebApiSurface::AppApi,
            auth_mode: WebAuthMode::DualToken,
            principal: None,
            transport: WebTransportFacts {
                path: "/app/v3/api/ai/dashboard/overview".to_owned(),
                method: "GET".to_owned(),
                auth_token_present: true,
                access_token_present: true,
                api_key_present: false,
                oauth_bearer_present: false,
                agent_token_present: false,
            },
            locale: None,
            client_kind: None,
            operation: Some(WebOperationBinding {
                operation_id: "dashboard.overview.retrieve".to_owned(),
                route_template: "/app/v3/api/ai/dashboard/overview".to_owned(),
                rate_limit_tier: None,
                idempotent: false,
            }),
            trace_id: Some("trace-item".to_owned()),
        };
        let response = json_success_item_response(Some(&context), serde_json::json!({"summary": {}}));
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("runtime");
        let bytes = rt
            .block_on(async { axum::body::to_bytes(response.into_body(), usize::MAX).await })
            .expect("body");
        let payload: serde_json::Value = serde_json::from_slice(&bytes).expect("json");
        assert_eq!(0, payload["code"].as_i64().unwrap());
        assert!(payload["data"]["item"]["summary"].is_object());
    }

    #[test]
    fn platform_problem_for_context_includes_routing_fields() {
        use sdkwork_web_core::{
            ServerRequestId, WebApiSurface, WebAuthMode, WebOperationBinding, WebTransportFacts,
        };

        let context = WebRequestContext {
            request_id: ServerRequestId("req-wallet".to_owned()),
            api_surface: WebApiSurface::AppApi,
            auth_mode: WebAuthMode::DualToken,
            principal: None,
            transport: WebTransportFacts {
                path: "/app/v3/api/wallet/transactions".to_owned(),
                method: "GET".to_owned(),
                auth_token_present: true,
                access_token_present: true,
                api_key_present: false,
                oauth_bearer_present: false,
                agent_token_present: false,
            },
            locale: None,
            client_kind: None,
            operation: Some(WebOperationBinding {
                operation_id: "wallet.transactions.list".to_owned(),
                route_template: "/app/v3/api/wallet/transactions".to_owned(),
                rate_limit_tier: None,
                idempotent: false,
            }),
            trace_id: Some("trace-wallet".to_owned()),
        };
        let response =
            platform_problem_for_context(Some(&context), SdkWorkResultCode::InternalError, "db")
                .into_response();
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("runtime");
        let bytes = rt
            .block_on(async { axum::body::to_bytes(response.into_body(), usize::MAX).await })
            .expect("body");
        let payload: serde_json::Value = serde_json::from_slice(&bytes).expect("json");
        assert_eq!(
            "GET /app/v3/api/wallet/transactions",
            payload["instance"].as_str().unwrap()
        );
        assert_eq!(
            "wallet.transactions.list",
            payload["operationId"].as_str().unwrap()
        );
        assert_eq!("An internal error occurred", payload["detail"].as_str().unwrap());
    }
}
