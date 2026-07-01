use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use crate::api::app_sql_subject::{map_optional_app_sql_subject, ResolvedAppSqlScopedSubject};
use crate::api::response::{problem_from_wire_code, success_envelope};
use crate::ports::{
    AppGatewayTraceItem, AppGatewayTraceItems, AppGatewayTracesReadFuture,
    AppGatewayTracesReadStore, AppGatewayTracesSubject,
};

#[derive(Clone)]
struct AppGatewayTracesState {
    read_store: Arc<dyn AppGatewayTracesReadStore + Send + Sync>,
    require_subject: bool,
}

struct EmptyAppGatewayTracesReadStore;

impl AppGatewayTracesReadStore for EmptyAppGatewayTracesReadStore {
    fn load_gateway_traces<'a>(
        &'a self,
        _subject: Option<AppGatewayTracesSubject>,
    ) -> AppGatewayTracesReadFuture<'a, Vec<AppGatewayTraceItem>> {
        Box::pin(async { Ok(Vec::new()) })
    }
}

pub fn app_gateway_traces_router() -> Router {
    app_gateway_traces_router_with_state(Arc::new(EmptyAppGatewayTracesReadStore), false)
}

pub fn app_gateway_traces_router_with_read_store(
    read_store: Arc<dyn AppGatewayTracesReadStore + Send + Sync>,
) -> Router {
    app_gateway_traces_router_with_state(read_store, true)
}

fn app_gateway_traces_router_with_state(
    read_store: Arc<dyn AppGatewayTracesReadStore + Send + Sync>,
    require_subject: bool,
) -> Router {
    Router::new()
        .route("/app/v3/api/ai/gateway/traces", get(fetch_gateway_traces))
        .with_state(AppGatewayTracesState {
            read_store,
            require_subject,
        })
}

async fn fetch_gateway_traces(
    State(state): State<AppGatewayTracesState>,
    ResolvedAppSqlScopedSubject(subject): ResolvedAppSqlScopedSubject,
) -> Response {
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, |scoped| {
        scoped.into()
    }) {
        Ok(subject) => subject,
        Err(response) => return response,
    };

    match state.read_store.load_gateway_traces(subject).await {
        Ok(items) => Json(success_envelope(AppGatewayTraceItems::new(items))).into_response(),
        Err(error) => app_gateway_traces_read_model_error(error),
    }
}

fn app_gateway_traces_read_model_error(error: impl std::fmt::Display) -> Response {
    problem_from_wire_code(
            "5000",
            format!("app gateway traces read model is unavailable: {error}"),
        ).into_response()
}
