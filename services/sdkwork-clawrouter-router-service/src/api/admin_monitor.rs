use std::sync::Arc;
use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::Serialize;

use crate::api::response::PlusApiResult;
use crate::ports::{AdminMonitorQuery, AdminMonitorReadStore};

#[derive(Clone)]
struct AdminMonitorState {
    read_store: Arc<dyn AdminMonitorReadStore + Send + Sync>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminMonitorListResponse<T> {
    items: Vec<T>,
}

pub fn admin_monitor_router_with_read_store(
    read_store: Arc<dyn AdminMonitorReadStore + Send + Sync>,
) -> Router {
    Router::new()
        .route("/backend/v3/api/router/monitor/nodes", get(fetch_nodes))
        .route("/backend/v3/api/router/monitor/alerts", get(fetch_alerts))
        .route(
            "/backend/v3/api/router/monitor/performance",
            get(fetch_performance),
        )
        .route("/backend/v3/api/system/monitor/nodes", get(fetch_nodes))
        .route("/backend/v3/api/system/monitor/alerts", get(fetch_alerts))
        .route(
            "/backend/v3/api/system/monitor/performance",
            get(fetch_performance),
        )
        .with_state(AdminMonitorState { read_store })
}

async fn fetch_nodes(
    State(state): State<AdminMonitorState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
) -> Response {
    let query = monitor_query(scoped);
    match state.read_store.list_monitor_nodes(query).await {
        Ok(items) => monitor_success(items),
        Err(error) => monitor_system_response("monitor nodes read model is unavailable", error),
    }
}

async fn fetch_alerts(
    State(state): State<AdminMonitorState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
) -> Response {
    let query = monitor_query(scoped);
    match state.read_store.list_monitor_alerts(query).await {
        Ok(items) => monitor_success(items),
        Err(error) => monitor_system_response("monitor alerts read model is unavailable", error),
    }
}

async fn fetch_performance(
    State(state): State<AdminMonitorState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
) -> Response {
    let query = monitor_query(scoped);
    match state.read_store.list_monitor_performance(query).await {
        Ok(items) => monitor_success(items),
        Err(error) => {
            monitor_system_response("monitor performance read model is unavailable", error)
        }
    }
}

fn monitor_query(scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject) -> AdminMonitorQuery {
    AdminMonitorQuery {
        subject: scoped.into(),
    }
}

fn monitor_success<T>(items: Vec<T>) -> Response
where
    T: Serialize,
{
    Json(PlusApiResult::success(AdminMonitorListResponse { items })).into_response()
}

fn monitor_system_response(context: &str, error: crate::domain::DomainError) -> Response {
    PlusApiResult::error("5000", format!("{context}: {error}"))).into_response()
}
