use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::Deserialize;
use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;

use crate::api::response::PlusApiResult;
use crate::application::{
    InMemoryPaymentProviderRuntimeSnapshotStore, PaymentProviderRuntimeSnapshotService,
    PaymentProviderRuntimeSnapshotStore,
};

const PAYMENT_RUNTIME_ENVIRONMENTS: &[&str] = &["sandbox", "production"];

#[derive(Clone)]
struct AdminPaymentRuntimeState<S>
where
    S: PaymentProviderRuntimeSnapshotStore + Clone,
{
    snapshot_service: PaymentProviderRuntimeSnapshotService<S>,
}

#[derive(Debug, Deserialize)]
struct PaymentRuntimeSnapshotQuery {
    environment: Option<String>,
}

pub fn admin_payment_runtime_router() -> Router {
    admin_payment_runtime_router_with_snapshot_store(
        InMemoryPaymentProviderRuntimeSnapshotStore::default(),
    )
}

pub fn admin_payment_runtime_router_with_snapshot_store<S>(store: S) -> Router
where
    S: PaymentProviderRuntimeSnapshotStore + Clone + Send + Sync + 'static,
{
    Router::new()
        .route(
            "/backend/v3/api/payments/runtime/snapshot",
            get(fetch_payment_runtime_snapshot::<S>),
        )
        .with_state(AdminPaymentRuntimeState {
            snapshot_service: PaymentProviderRuntimeSnapshotService::new(store),
        })
}

async fn fetch_payment_runtime_snapshot<S>(
    State(state): State<AdminPaymentRuntimeState<S>>,
    RequiredAdminSqlScopedSubject(_scoped): RequiredAdminSqlScopedSubject,
    Query(query): Query<PaymentRuntimeSnapshotQuery>,
) -> Response
where
    S: PaymentProviderRuntimeSnapshotStore + Clone + Send + Sync + 'static,
{
    let environment = match normalize_environment(query.environment) {
        Ok(environment) => environment,
        Err(response) => return response,
    };
    match state.snapshot_service.load_latest(&environment).await {
        Some(snapshot) => Json(PlusApiResult::success(snapshot)).into_response(),
        None => not_found_response(format!(
            "payment provider runtime snapshot was not found for environment {environment}"
        )),
    }
}

fn normalize_environment(environment: Option<String>) -> Result<String, Response> {
    let environment = environment.unwrap_or_else(|| "sandbox".to_owned());
    let environment = environment.trim();
    if environment.is_empty() {
        return Ok("sandbox".to_owned());
    }
    let environment = match environment.to_ascii_lowercase().as_str() {
        "test" | "sandbox" => "sandbox",
        "prod" | "production" | "live" => "production",
        _ => {
            return Err(bad_request(format!(
                "environment must be one of {}",
                PAYMENT_RUNTIME_ENVIRONMENTS.join(", ")
            )))
        }
    };
    Ok(environment.to_owned())
}

fn bad_request(message: impl Into<String>) -> Response {
    PlusApiResult::error("4001", message.into())).into_response()
}

fn not_found_response(message: impl Into<String>) -> Response {
    PlusApiResult::error("4040", message.into())).into_response()
}
