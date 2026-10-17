use axum::http::StatusCode;
use axum::{extract::State, Json};
use sdkwork_cloudrouter_config::DeploymentMode;
use sdkwork_cloudrouter_health::HealthResponse;

use crate::metrics::record_readiness_check;
use crate::router::ServiceState;

// The Err variant is an axum `(StatusCode, Json<HealthResponse>)` responder
// pair, 144 bytes, just over clippy's 128-byte result_large_err threshold.
// Boxing it would add a heap allocation to a probe that returns on every
// request and would force every caller to unbox, for a fixed-size response
// whose size is the response itself. This is the response, not a large error.
#[allow(clippy::result_large_err)]
pub async fn healthz(
    State(state): State<ServiceState>,
) -> Result<Json<HealthResponse>, (StatusCode, Json<HealthResponse>)> {
    let deployment_mode = state.deployment_mode.clone().map_err(|_| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(not_ready_config_response(&state)),
        )
    })?;
    Ok(Json(
        HealthResponse::new(state.service_name, deployment_mode).with_database(state.database),
    ))
}

// Same responder pair as healthz; see the note above.
#[allow(clippy::result_large_err)]
pub async fn readyz(
    State(state): State<ServiceState>,
) -> Result<(StatusCode, Json<HealthResponse>), (StatusCode, Json<HealthResponse>)> {
    let deployment_mode = state.deployment_mode.clone().map_err(|_| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(not_ready_config_response(&state)),
        )
    })?;
    let mut response =
        HealthResponse::new(state.service_name, deployment_mode).with_database(state.database);
    if let Some(check) = &state.readiness_check {
        let ready = (check)().await;
        record_readiness_check(ready);
        if !ready {
            response.status = "not_ready".to_owned();
            return Err((StatusCode::SERVICE_UNAVAILABLE, Json(response)));
        }
    }
    Ok((StatusCode::OK, Json(response)))
}

fn not_ready_config_response(state: &ServiceState) -> HealthResponse {
    let mut response = HealthResponse::new(state.service_name, DeploymentMode::Server)
        .with_database(state.database.clone());
    response.status = "not_ready".to_owned();
    response
}
