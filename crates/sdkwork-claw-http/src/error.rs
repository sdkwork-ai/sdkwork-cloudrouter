use axum::http::header;
use axum::response::{IntoResponse, Response};
use axum::Json;
use sdkwork_claw_contract::{ApiSurface, ContractOperation};
use sdkwork_utils_rust::{SdkWorkProblemDetail, SdkWorkProblemRouting, SdkWorkResultCode};
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotImplementedData {
    pub operation: String,
    pub api_surface: &'static str,
    pub api_method: String,
    pub api_path: String,
    pub contract_path: String,
}

pub fn not_implemented_response(
    operation: &ContractOperation,
    surface: ApiSurface,
    request_path: &str,
) -> Response {
    let data = NotImplementedData {
        operation: operation.operation.clone(),
        api_surface: surface.sdk_family(),
        api_method: operation.method.clone(),
        api_path: request_path.to_owned(),
        contract_path: operation.path.clone(),
    };
    let detail = serde_json::to_string(&data).unwrap_or_else(|_| {
        format!(
            "Not implemented: {} {} {}",
            data.api_method, data.api_path, data.operation
        )
    });
    let trace_id = sdkwork_utils_rust::uuid();
    let routing = SdkWorkProblemRouting::from_parts(
        Some(operation.method.as_str()),
        Some(operation.path.as_str()),
        Some(request_path),
        Some(operation.operation.as_str()),
    );
    let mut problem = SdkWorkProblemDetail::platform_enriched(
        SdkWorkResultCode::InternalError,
        detail,
        trace_id,
        routing,
    );
    problem.status = 501;
    problem.title = "Not implemented".to_owned();
    (
        axum::http::StatusCode::NOT_IMPLEMENTED,
        [(header::CONTENT_TYPE, "application/problem+json")],
        Json(problem),
    )
        .into_response()
}
