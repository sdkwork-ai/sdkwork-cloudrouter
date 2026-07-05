use std::sync::Arc;
use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;

use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use serde::Deserialize;

use crate::api::response::{
    json_success_list_response, normalize_list_search_query, offset_page_info,
    parse_offset_list_query, problem_from_wire_code,
};
use crate::ports::{AdminMonitorQuery, AdminMonitorReadStore};

#[derive(Clone)]
struct AdminMonitorState {
    read_store: Arc<dyn AdminMonitorReadStore + Send + Sync>,
}

#[derive(Debug, Deserialize)]
struct AdminMonitorListQuery {
    page: Option<i64>,
    page_size: Option<i64>,
    q: Option<String>,
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
    Query(query): Query<AdminMonitorListQuery>,
) -> Response {
    let query = match monitor_query(scoped, query) {
        Ok(query) => query,
        Err(response) => return response,
    };
    match state.read_store.list_monitor_nodes(query).await {
        Ok(collection) => monitor_success(collection),
        Err(error) => monitor_system_response("monitor nodes read model is unavailable", error),
    }
}

async fn fetch_alerts(
    State(state): State<AdminMonitorState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    Query(query): Query<AdminMonitorListQuery>,
) -> Response {
    let query = match monitor_query(scoped, query) {
        Ok(query) => query,
        Err(response) => return response,
    };
    match state.read_store.list_monitor_alerts(query).await {
        Ok(collection) => monitor_success(collection),
        Err(error) => monitor_system_response("monitor alerts read model is unavailable", error),
    }
}

async fn fetch_performance(
    State(state): State<AdminMonitorState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    Query(query): Query<AdminMonitorListQuery>,
) -> Response {
    let query = match monitor_query(scoped, query) {
        Ok(query) => query,
        Err(response) => return response,
    };
    match state.read_store.list_monitor_performance(query).await {
        Ok(collection) => monitor_success(collection),
        Err(error) => {
            monitor_system_response("monitor performance read model is unavailable", error)
        }
    }
}

fn monitor_query(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    query: AdminMonitorListQuery,
) -> Result<AdminMonitorQuery, Response> {
    let pagination = parse_offset_list_query(query.page, query.page_size).map_err(bad_request)?;
    Ok(AdminMonitorQuery {
        subject: scoped.into(),
        page_no: pagination.page_no,
        page_size: pagination.page_size,
        offset: pagination.offset,
        q: normalize_list_search_query(query.q, "q").map_err(bad_request)?,
    })
}

fn monitor_success<T: serde::Serialize>(collection: crate::ports::AdminMonitorCollection<T>) -> Response {
    json_success_list_response(
        None,
        collection.items,
        offset_page_info(collection.page_no, collection.page_size, collection.total),
    )
}

fn bad_request(message: impl Into<String>) -> Response {
    problem_from_wire_code("4001", message.into()).into_response()
}

fn monitor_system_response(context: &str, error: crate::domain::DomainError) -> Response {
    problem_from_wire_code("5000", format!("{context}: {error}")).into_response()
}
