use std::sync::Arc;

use axum::extract::{Query, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use serde::Deserialize;

use crate::api::admin_sql_subject::{
    map_required_admin_sql_subject, RequiredAdminSqlScopedSubject,
};
use crate::api::response::{
    json_success_list_response, offset_page_info, parse_offset_list_query, problem_from_wire_code,
};
use crate::domain::DomainError;
use crate::ports::{AdminRecordStore, ListAdminRecordLogsQuery};

const MAX_FILTER_LEN: usize = 128;

#[derive(Clone)]
struct AdminRecordState {
    store: Arc<dyn AdminRecordStore + Send + Sync>,
}

#[derive(Debug, Default, Deserialize)]
struct AdminRecordListQuery {
    page: Option<i64>,
    page_size: Option<i64>,
    user: Option<String>,
    token: Option<String>,
    model: Option<String>,
}

pub fn admin_record_router_with_store(store: Arc<dyn AdminRecordStore + Send + Sync>) -> Router {
    Router::new()
        .route("/backend/v3/api/system/records", get(fetch_logs))
        .with_state(AdminRecordState { store })
}

async fn fetch_logs(
    State(state): State<AdminRecordState>,
    RequiredAdminSqlScopedSubject(subject): RequiredAdminSqlScopedSubject,
    _headers: HeaderMap,
    Query(request): Query<AdminRecordListQuery>,
) -> Response {
    let subject = map_required_admin_sql_subject(subject, |scoped| scoped.into());
    let query = match build_query(subject, request) {
        Ok(query) => query,
        Err(message) => return bad_request(message),
    };

    match state.store.list_logs(query).await {
        Ok(page) => json_success_list_response(
            None,
            page.items,
            offset_page_info(page.page_no, page.page_size, page.total),
        ),
        Err(error) => record_system_response("admin record read model is unavailable", error),
    }
}

fn build_query(
    subject: crate::ports::AdminRecordSubject,
    request: AdminRecordListQuery,
) -> Result<ListAdminRecordLogsQuery, String> {
    let pagination = parse_offset_list_query(request.page, request.page_size)?;
    Ok(ListAdminRecordLogsQuery {
        subject,
        page_no: pagination.page_no,
        page_size: pagination.page_size,
        offset: pagination.offset,
        user: normalize_filter(request.user, "user")?,
        token: normalize_filter(request.token, "token")?,
        model: normalize_filter(request.model, "model")?,
    })
}

fn normalize_filter(value: Option<String>, field: &str) -> Result<Option<String>, String> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = value.trim();
    if value.is_empty() {
        return Ok(None);
    }
    if value.chars().count() > MAX_FILTER_LEN
        || !value.bytes().all(|byte| (0x20..=0x7e).contains(&byte))
    {
        return Err(format!(
            "{field} must be visible ASCII and at most {MAX_FILTER_LEN} characters"
        ));
    }
    Ok(Some(value.to_owned()))
}

fn bad_request(message: impl Into<String>) -> Response {
    problem_from_wire_code("4001", message.into()).into_response()
}

fn record_system_response(context: &str, error: DomainError) -> Response {
    problem_from_wire_code("5000", format!("{context}: {error}")).into_response()
}
