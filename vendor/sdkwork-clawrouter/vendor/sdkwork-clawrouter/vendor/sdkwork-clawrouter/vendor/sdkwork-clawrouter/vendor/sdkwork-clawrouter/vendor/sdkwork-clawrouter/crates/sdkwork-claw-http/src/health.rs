use axum::http::StatusCode;
use axum::{extract::State, Json};
use sdkwork_claw_config::DeploymentMode;
use sdkwork_claw_core::HealthResponse;

use crate::metrics::record_readiness_check;
use crate::router::ServiceState;

pub async fn healthz(State(state): State<ServiceState>) -> Json<HealthResponse> {
    Json(
        HealthResponse::new(state.service_name, DeploymentMode::from_env())
            .with_database(state.database),
    )
}

pub async fn readyz(
    State(state): State<ServiceState>,
) -> Result<(StatusCode, Json<HealthResponse>), (StatusCode, Json<HealthResponse>)> {
    let mut response = HealthResponse::new(state.service_name, DeploymentMode::from_env())
        .with_database(state.database);
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
