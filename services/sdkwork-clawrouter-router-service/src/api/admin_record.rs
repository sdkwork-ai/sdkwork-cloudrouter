use std::sync::Arc;

use axum::extract::{Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::Deserialize;

use crate::api::admin_sql_subject::{
    map_required_admin_sql_subject, RequiredAdminSqlScopedSubject,
};
use crate::api::response::{problem_from_wire_code, success_envelope};
use crate::domain::DomainError;
use crate::ports::{AdminRecordStore, ListAdminRecordLogsQuery};

const DEFAULT_PAGE_NO: i64 = 1;
const DEFAULT_PAGE_SIZE: i64 = 100;
const MAX_PAGE_SIZE: i64 = 200;
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
        Ok(page) => Json(success_envelope(page)).into_response(),
        Err(error) => record_system_response("admin record read model is unavailable", error),
    }
}

fn build_query(
    subject: crate::ports::AdminRecordSubject,
    request: AdminRecordListQuery,
) -> Result<ListAdminRecordLogsQuery, String> {
    let page_no = request.page.unwrap_or(DEFAULT_PAGE_NO);
    if page_no < 1 {
        return Err("page must be greater than or equal to 1".to_owned());
    }
    let page_size = request.page_size.unwrap_or(DEFAULT_PAGE_SIZE);
    if !(1..=MAX_PAGE_SIZE).contains(&page_size) {
        return Err(format!("page_size must be between 1 and {MAX_PAGE_SIZE}"));
    }
    Ok(ListAdminRecordLogsQuery {
        subject,
        page_no,
        page_size,
        offset: (page_no - 1) * page_size,
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
