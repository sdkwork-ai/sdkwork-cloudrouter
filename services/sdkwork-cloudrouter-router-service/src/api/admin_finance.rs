use std::sync::Arc;

use axum::extract::{Query, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use serde::{Deserialize, Serialize};

use sdkwork_utils_rust::http_api::cursor_window_page_info;
use sdkwork_utils_rust::{base64url_decode, base64url_encode};

use crate::api::response::{
    json_success_list_response, normalize_list_search_query, problem_from_wire_code,
    ApiResponseError, DEFAULT_LIST_PAGE_SIZE, MAX_LIST_PAGE_SIZE,
};
use crate::domain::DomainError;
use crate::ports::{
    AdminFinanceCursor, AdminFinanceStore, AdminFinanceSubject, ListAdminBillingRecordsQuery,
    ListAdminTransactionsQuery,
};

const MAX_STATUS_LEN: usize = 32;
const MAX_TIME_LEN: usize = 64;
const MAX_FINANCE_CURSOR_LEN: usize = 512;
const MAX_FINANCE_CURSOR_EPOCH_MICROS: i64 = 253_402_300_799_999_999;

#[derive(Clone)]
struct AdminFinanceState {
    store: Arc<dyn AdminFinanceStore + Send + Sync>,
}

#[derive(Debug, Deserialize)]
struct AdminFinanceRequestQuery {
    // `page` is accepted only to reject it explicitly: these operations are
    // cursor-only per `PAGINATION_SPEC.md` §12 pre-launch zero-debt, and
    // `page` combined with `cursor` is forbidden by §3.
    page: Option<String>,
    cursor: Option<String>,
    page_size: Option<i64>,
    q: Option<String>,
    status: Option<String>,
    start_time: Option<String>,
    end_time: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AdminFinanceCursorPayload {
    occurred_at_micros: i64,
    id: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ValidatedFinanceListQuery {
    subject: AdminFinanceSubject,
    cursor: Option<AdminFinanceCursor>,
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
        Err(error) => return error.into_response(),
    };
    match state
        .store
        .list_transactions(ListAdminTransactionsQuery {
            subject: query.subject,
            cursor: query.cursor,
            page_size: query.page_size,
            keyword: query.keyword,
            status: query.status,
            start_time: query.start_time,
            end_time: query.end_time,
        })
        .await
    {
        Ok(collection) => {
            let page_info = cursor_page_info(&collection);
            json_success_list_response(None, collection.items, page_info)
        }
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
        Err(error) => return error.into_response(),
    };
    match state
        .store
        .list_billing_records(ListAdminBillingRecordsQuery {
            subject: query.subject,
            cursor: query.cursor,
            page_size: query.page_size,
            keyword: query.keyword,
            status: query.status,
            start_time: query.start_time,
            end_time: query.end_time,
        })
        .await
    {
        Ok(collection) => {
            let page_info = cursor_page_info(&collection);
            json_success_list_response(None, collection.items, page_info)
        }
        Err(error) => {
            finance_system_response("finance usage statement read model is unavailable", error)
        }
    }
}

fn cursor_page_info<T>(
    collection: &crate::ports::AdminFinanceCollection<T>,
) -> sdkwork_utils_rust::http_api::PageInfo {
    let next_cursor = collection
        .has_more
        .then_some(collection.next_cursor)
        .flatten()
        .map(|cursor| encode_finance_cursor(&cursor));
    cursor_window_page_info(
        usize::try_from(collection.page_size).ok(),
        next_cursor,
        collection.has_more,
    )
}

fn encode_finance_cursor(cursor: &AdminFinanceCursor) -> String {
    let payload = AdminFinanceCursorPayload {
        occurred_at_micros: cursor.occurred_at_micros,
        id: cursor.id,
    };
    serde_json::to_vec(&payload)
        .map(|value| base64url_encode(&value))
        .unwrap_or_default()
}

fn decode_finance_cursor(value: &str) -> Result<AdminFinanceCursor, String> {
    if value.is_empty() || value.len() > MAX_FINANCE_CURSOR_LEN || value.trim() != value {
        return Err("cursor is invalid".to_owned());
    }
    let decoded = base64url_decode(value).ok_or_else(|| "cursor is invalid".to_owned())?;
    let payload = serde_json::from_slice::<AdminFinanceCursorPayload>(&decoded)
        .map_err(|_| "cursor is invalid".to_owned())?;
    if payload.id <= 0
        || !(0..=MAX_FINANCE_CURSOR_EPOCH_MICROS).contains(&payload.occurred_at_micros)
    {
        return Err("cursor is invalid".to_owned());
    }
    Ok(AdminFinanceCursor {
        occurred_at_micros: payload.occurred_at_micros,
        id: payload.id,
    })
}

fn validated_query(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    query: AdminFinanceRequestQuery,
) -> Result<ValidatedFinanceListQuery, ApiResponseError> {
    if query.page.is_some() {
        return Err(bad_request(
            "page must not be combined with cursor pagination; use cursor and page_size".to_owned(),
        )
        .into());
    }
    let subject = scoped.into();
    let page_size = query.page_size.unwrap_or(DEFAULT_LIST_PAGE_SIZE);
    if !(1..=MAX_LIST_PAGE_SIZE).contains(&page_size) {
        return Err(bad_request(format!(
            "page_size must be between 1 and {MAX_LIST_PAGE_SIZE}"
        ))
        .into());
    }
    let cursor = match query.cursor.as_deref() {
        None | Some("") => None,
        Some(value) => Some(decode_finance_cursor(value).map_err(bad_request)?),
    };
    Ok(ValidatedFinanceListQuery {
        subject,
        cursor,
        page_size,
        keyword: normalize_list_search_query(query.q, "q").map_err(bad_request)?,
        status: normalize_optional_text(query.status, "status", MAX_STATUS_LEN)?
            .map(|value| value.to_ascii_lowercase()),
        start_time: normalize_optional_timestamp(query.start_time, "start_time", MAX_TIME_LEN)
            .map_err(bad_request)?,
        end_time: normalize_optional_timestamp(query.end_time, "end_time", MAX_TIME_LEN)
            .map_err(bad_request)?,
    })
}

/// Visible-ASCII text that must parse as a timestamp so an invalid window is
/// rejected with `400` instead of surfacing as a store failure.
fn normalize_optional_timestamp(
    value: Option<String>,
    field_name: &str,
    max_len: usize,
) -> Result<Option<String>, String> {
    let value = normalize_optional_text_value(value, field_name, max_len)?;
    if let Some(value) = value.as_deref() {
        if chrono::DateTime::parse_from_rfc3339(value).is_err()
            && chrono::NaiveDateTime::parse_from_str(value, "%Y-%m-%d %H:%M:%S").is_err()
            && chrono::NaiveDate::parse_from_str(value, "%Y-%m-%d").is_err()
        {
            return Err(format!(
                "{field_name} must be an RFC 3339 UTC timestamp, 'YYYY-MM-DD HH:MM:SS', or 'YYYY-MM-DD'"
            ));
        }
    }
    Ok(value)
}

fn normalize_optional_text_value(
    value: Option<String>,
    field_name: &str,
    max_len: usize,
) -> Result<Option<String>, String> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = value.trim();
    if value.is_empty() {
        return Ok(None);
    }
    if value.chars().count() > max_len || !value.bytes().all(|byte| (0x20..=0x7e).contains(&byte)) {
        return Err(format!(
            "{field_name} must be visible ASCII and at most {max_len} characters"
        ));
    }
    Ok(Some(value.to_owned()))
}

fn normalize_optional_text(
    value: Option<String>,
    field_name: &str,
    max_len: usize,
) -> Result<Option<String>, ApiResponseError> {
    normalize_optional_text_value(value, field_name, max_len)
        .map_err(|message| ApiResponseError::from(bad_request(message)))
}

fn bad_request(message: impl Into<String>) -> Response {
    problem_from_wire_code("4001", message.into()).into_response()
}

fn finance_system_response(context: &str, error: DomainError) -> Response {
    problem_from_wire_code("5000", format!("{context}: {error}")).into_response()
}
