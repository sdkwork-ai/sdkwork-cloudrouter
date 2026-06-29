use axum::{
    http::{HeaderName, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use sdkwork_utils_rust::{SdkWorkApiResponse, SdkWorkProblemDetail, SdkWorkResultCode};
use sdkwork_web_core::WebRequestContext;
use serde::Serialize;

use crate::api::request_id::generate_server_request_id;

/// Legacy name retained for incremental handler migration; wire format is `SdkWorkApiResponse`.
pub struct PlusApiResult;

pub fn new_trace_id() -> String {
    generate_server_request_id().unwrap_or_else(|_| {
        "00000000-0000-4000-8000-000000000000".to_string()
    })
}

pub fn trace_id_from_context(context: Option<&WebRequestContext>) -> String {
    context
        .map(|ctx| ctx.resolved_trace_id())
        .unwrap_or_else(new_trace_id)
}

impl PlusApiResult {
    pub fn success<T: Serialize>(data: T) -> SdkWorkApiResponse<T> {
        SdkWorkApiResponse::success(data, new_trace_id())
    }

    pub fn success_with_trace<T: Serialize>(
        trace_id: impl Into<String>,
        data: T,
    ) -> SdkWorkApiResponse<T> {
        SdkWorkApiResponse::success(data, trace_id)
    }

    pub fn error(code: impl AsRef<str>, message: impl Into<String>) -> ProblemResponse {
        ProblemResponse::from_legacy(code.as_ref(), message.into(), new_trace_id())
    }

    pub fn error_with_trace(
        code: impl AsRef<str>,
        message: impl Into<String>,
        trace_id: impl Into<String>,
    ) -> ProblemResponse {
        ProblemResponse::from_legacy(code.as_ref(), message.into(), trace_id.into())
    }
}

#[derive(Debug, Clone)]
pub struct ProblemResponse {
    pub problem: SdkWorkProblemDetail,
}

impl ProblemResponse {
    pub fn from_legacy(legacy_code: &str, message: String, trace_id: String) -> Self {
        let result_code = map_legacy_wire_code(legacy_code);
        Self {
            problem: SdkWorkProblemDetail::platform(result_code, message, trace_id),
        }
    }
}

impl IntoResponse for ProblemResponse {
    fn into_response(self) -> Response {
        let status = StatusCode::from_u16(self.problem.status)
            .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        let mut response = (status, Json(self.problem)).into_response();
        attach_trace_header(&mut response, &self.problem.trace_id);
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

fn map_legacy_wire_code(legacy_code: &str) -> SdkWorkResultCode {
    match legacy_code.trim() {
        "4001" | "4004" => SdkWorkResultCode::ValidationError,
        "4010" => SdkWorkResultCode::AuthenticationRequired,
        "4040" => SdkWorkResultCode::NotFound,
        "4090" => SdkWorkResultCode::Conflict,
        "4220" => SdkWorkResultCode::UnprocessableEntity,
        "5000" => SdkWorkResultCode::InternalError,
        "not_found" => SdkWorkResultCode::NotFound,
        "invalid_input" | "validation_error" => SdkWorkResultCode::ValidationError,
        "forbidden" => SdkWorkResultCode::PermissionRequired,
        "conflict" => SdkWorkResultCode::Conflict,
        "rate_limited" => SdkWorkResultCode::RateLimitExceeded,
        "provider_error" => SdkWorkResultCode::BadGateway,
        _ => SdkWorkResultCode::InternalError,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn success_envelope_uses_sdkwork_v3_shape() {
        let body = PlusApiResult::success(serde_json::json!({"items": []}));
        assert_eq!(0, body.code);
        assert!(!body.trace_id.is_empty());
    }

    #[test]
    fn legacy_error_maps_to_problem_detail() {
        let response = PlusApiResult::error("4040", "missing resource");
        assert_eq!(404, response.problem.status);
        assert_eq!(40401, response.problem.code);
    }
}
