use std::sync::Arc;

use axum::extract::{Query, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use serde::Deserialize;

use crate::api::response::{
    json_success_list_response, normalize_list_search_query, offset_page_info,
    parse_offset_list_query, problem_from_wire_code,
};
use crate::domain::DomainError;
use crate::ports::{
    AdminFinanceStore, AdminFinanceSubject, ListAdminBillingRecordsQuery,
    ListAdminTransactionsQuery,
};

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

#[derive(Debug, Clone, PartialEq, Eq)]
struct ValidatedFinanceListQuery {
    subject: AdminFinanceSubject,
    page_no: i64,
    page_size: i64,
    offset: i64,
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
        Ok(collection) => json_success_list_response(
            None,
            collection.items,
            offset_page_info(collection.page_no, collection.page_size, collection.total),
        ),
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
        Ok(collection) => json_success_list_response(
            None,
            collection.items,
            offset_page_info(collection.page_no, collection.page_size, collection.total),
        ),
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
    let pagination = parse_offset_list_query(query.page, query.page_size).map_err(bad_request)?;

    Ok(ValidatedFinanceListQuery {
        subject,
        page_no: pagination.page_no,
        page_size: pagination.page_size,
        offset: pagination.offset,
        keyword: normalize_list_search_query(query.q, "q").map_err(bad_request)?,
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

fn bad_request(message: impl Into<String>) -> Response {
    problem_from_wire_code("4001", message.into()).into_response()
}

fn finance_system_response(context: &str, error: DomainError) -> Response {
    problem_from_wire_code("5000", format!("{context}: {error}")).into_response()
}
