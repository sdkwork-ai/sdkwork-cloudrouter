use std::sync::Arc;
use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;

use axum::extract::{Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use crate::api::response::PlusApiResult;
use crate::domain::DomainError;
use crate::ports::{
    AdminFinanceStore, AdminFinanceSubject, ListAdminBillingRecordsQuery,
    ListAdminTransactionsQuery,
};

const DEFAULT_PAGE_NO: i64 = 1;
const DEFAULT_PAGE_SIZE: i64 = 100;
const MAX_PAGE_SIZE: i64 = 200;
const MAX_KEYWORD_LEN: usize = 128;
const MAX_STATUS_LEN: usize = 32;
const MAX_TIME_LEN: usize = 64;

#[derive(Clone)]
struct AdminFinanceState {
    store: Arc<dyn AdminFinanceStore + Send + Sync>,
}

#[derive(Debug, Deserialize)]
struct AdminFinanceRequestQuery {
    page: Option<i64>,
    page_size: Option<i64>,
    q: Option<String>,
    status: Option<String>,
    start_time: Option<String>,
    end_time: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminFinanceListResponse<T> {
    items: Vec<T>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ValidatedFinanceListQuery {
    subject: AdminFinanceSubject,
    page_no: i64,
    page_size: i64,
    keyword: Option<String>,
    status: Option<String>,
    start_time: Option<String>,
    end_time: Option<String>,
}

pub fn admin_finance_router_with_store(store: Arc<dyn AdminFinanceStore + Send + Sync>) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/billing/finance/ledger",
            get(fetch_transactions),
        )
        .route(
            "/backend/v3/api/billing/finance/usage_statements",
            get(fetch_billing_records),
        )
        .with_state(AdminFinanceState { store })
}

async fn fetch_transactions(
    State(state): State<AdminFinanceState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Query(query): Query<AdminFinanceRequestQuery>,
) -> Response {
    let query = match validated_query(scoped, &headers, query) {
        Ok(query) => query,
        Err(response) => return response,
    };
    match state
        .store
        .list_transactions(ListAdminTransactionsQuery {
            subject: query.subject,
            page_no: query.page_no,
            page_size: query.page_size,
            keyword: query.keyword,
            status: query.status,
            start_time: query.start_time,
            end_time: query.end_time,
        })
        .await
    {
        Ok(items) => list_response(items),
        Err(error) => finance_system_response("finance ledger read model is unavailable", error),
    }
}

async fn fetch_billing_records(
    State(state): State<AdminFinanceState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Query(query): Query<AdminFinanceRequestQuery>,
) -> Response {
    let query = match validated_query(scoped, &headers, query) {
        Ok(query) => query,
        Err(response) => return response,
    };
    match state
        .store
        .list_billing_records(ListAdminBillingRecordsQuery {
            subject: query.subject,
            page_no: query.page_no,
            page_size: query.page_size,
            keyword: query.keyword,
            status: query.status,
            start_time: query.start_time,
            end_time: query.end_time,
        })
        .await
    {
        Ok(items) => list_response(items),
        Err(error) => {
            finance_system_response("finance usage statement read model is unavailable", error)
        }
    }
}

fn validated_query(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    query: AdminFinanceRequestQuery,
) -> Result<ValidatedFinanceListQuery, Response> {
    let subject = scoped.into();
    let page_no = query.page.unwrap_or(DEFAULT_PAGE_NO);
    if page_no < 1 {
        return Err(bad_request("page must be greater than or equal to 1"));
    }
    let page_size = query.page_size.unwrap_or(DEFAULT_PAGE_SIZE);
    if !(1..=MAX_PAGE_SIZE).contains(&page_size) {
        return Err(bad_request(format!(
            "page_size must be between 1 and {MAX_PAGE_SIZE}"
        )));
    }

    Ok(ValidatedFinanceListQuery {
        subject,
        page_no,
        page_size,
        keyword: normalize_optional_text(query.q, "q", MAX_KEYWORD_LEN)?,
        status: normalize_optional_text(query.status, "status", MAX_STATUS_LEN)?
            .map(|value| value.to_ascii_lowercase()),
        start_time: normalize_optional_text(query.start_time, "start_time", MAX_TIME_LEN)?,
        end_time: normalize_optional_text(query.end_time, "end_time", MAX_TIME_LEN)?,
    })
}


fn normalize_optional_text(
    value: Option<String>,
    field_name: &str,
    max_len: usize,
) -> Result<Option<String>, Response> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = value.trim();
    if value.is_empty() {
        return Ok(None);
    }
    if value.chars().count() > max_len || !value.bytes().all(|byte| (0x20..=0x7e).contains(&byte)) {
        return Err(bad_request(format!(
            "{field_name} must be visible ASCII and at most {max_len} characters"
        )));
    }
    Ok(Some(value.to_owned()))
}

fn list_response<T>(items: Vec<T>) -> Response
where
    T: Serialize,
{
    Json(PlusApiResult::success(AdminFinanceListResponse { items })).into_response()
}

fn bad_request(message: impl Into<String>) -> Response {
    (
        StatusCode::BAD_REQUEST,
        Json(PlusApiResult::error("4001", message.into())),
    )
        .into_response()
}

fn finance_system_response(context: &str, error: DomainError) -> Response {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(PlusApiResult::error("5000", format!("{context}: {error}"))),
    )
        .into_response()
}
