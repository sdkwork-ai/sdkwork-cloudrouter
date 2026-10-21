use std::sync::Arc;

use axum::extract::rejection::QueryRejection;
use axum::extract::{Query, State};
use axum::http::HeaderMap;
use axum::response::Response;
use axum::routing::get;
use axum::Router;
use sdkwork_utils_rust::http_api::cursor_window_page_info;
use sdkwork_utils_rust::{base64url_decode, base64url_encode};
use serde::{Deserialize, Serialize};

use crate::api::admin_sql_subject::{
    map_required_admin_sql_subject, RequiredAdminSqlScopedSubject,
};
use crate::api::command_error::system_error_response;
use crate::api::response::{bad_request, json_success_list_response};
use crate::ports::{AdminRecordCursor, AdminRecordStore, ListAdminRecordLogsQuery};

const MAX_FILTER_LEN: usize = 128;
const DEFAULT_RECORD_PAGE_SIZE: i64 = 20;
const MAX_RECORD_PAGE_SIZE: i64 = 200;
const MAX_RECORD_CURSOR_LEN: usize = 512;
const MAX_RECORD_CURSOR_EPOCH_MICROS: i64 = 4_102_444_800_000_000; // 2100-01-01

#[derive(Clone)]
struct AdminRecordState {
    store: Arc<dyn AdminRecordStore + Send + Sync>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
struct AdminRecordListQuery {
    cursor: Option<String>,
    page_size: Option<i64>,
    user: Option<String>,
    token: Option<String>,
    model: Option<String>,
}

/// Opaque base64url cursor payload (PAGINATION_SPEC §3: clients never parse or
/// construct cursor values).
#[derive(Debug, Deserialize, Serialize)]
struct AdminRecordCursorPayload {
    started_at_micros: i64,
    id: i64,
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
    query: Result<Query<AdminRecordListQuery>, QueryRejection>,
) -> Response {
    let Ok(Query(request)) = query else {
        return bad_request("query parameters are invalid");
    };
    let subject = map_required_admin_sql_subject(subject, |scoped| scoped.into());
    let query = match build_query(subject, request) {
        Ok(query) => query,
        Err(message) => return bad_request(message),
    };
    let page_size = query.page_size;

    match state.store.list_logs(query).await {
        Ok(page) => {
            let next_cursor = page
                .next_cursor
                .map(encode_cursor)
                .transpose()
                .unwrap_or_else(|error| {
                    tracing::error!(error = %error, "failed to encode admin record cursor");
                    None
                });
            json_success_list_response(
                None,
                page.items,
                cursor_window_page_info(
                    Some(usize::try_from(page_size).unwrap_or(usize::MAX)),
                    next_cursor,
                    page.has_more,
                ),
            )
        }
        Err(error) => system_error_response("admin record read model is unavailable", error),
    }
}

fn build_query(
    subject: crate::ports::AdminRecordSubject,
    request: AdminRecordListQuery,
) -> Result<ListAdminRecordLogsQuery, String> {
    Ok(ListAdminRecordLogsQuery {
        subject,
        page_size: parse_page_size(request.page_size)?,
        cursor: request.cursor.as_deref().map(decode_cursor).transpose()?,
        user: normalize_filter(request.user, "user")?,
        token: normalize_filter(request.token, "token")?,
        model: normalize_filter(request.model, "model")?,
    })
}

fn parse_page_size(value: Option<i64>) -> Result<i64, String> {
    let page_size = value.unwrap_or(DEFAULT_RECORD_PAGE_SIZE);
    if !(1..=MAX_RECORD_PAGE_SIZE).contains(&page_size) {
        return Err(format!(
            "page_size must be between 1 and {MAX_RECORD_PAGE_SIZE}"
        ));
    }
    Ok(page_size)
}

fn decode_cursor(value: &str) -> Result<AdminRecordCursor, String> {
    let value = value.trim();
    if value.is_empty() || value.len() > MAX_RECORD_CURSOR_LEN {
        return Err("cursor is invalid".to_owned());
    }
    let bytes = base64url_decode(value).ok_or_else(|| "cursor is invalid".to_owned())?;
    let payload: AdminRecordCursorPayload =
        serde_json::from_slice(&bytes).map_err(|_| "cursor is invalid".to_owned())?;
    if !(0..=MAX_RECORD_CURSOR_EPOCH_MICROS).contains(&payload.started_at_micros) || payload.id <= 0
    {
        return Err("cursor is invalid".to_owned());
    }
    Ok(AdminRecordCursor {
        started_at_micros: payload.started_at_micros,
        id: payload.id,
    })
}

fn encode_cursor(cursor: AdminRecordCursor) -> Result<String, String> {
    let payload = AdminRecordCursorPayload {
        started_at_micros: cursor.started_at_micros,
        id: cursor.id,
    };
    let bytes = serde_json::to_vec(&payload).map_err(|_| "failed to encode cursor".to_owned())?;
    Ok(base64url_encode(&bytes))
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cursor_roundtrips_through_the_opaque_encoding() {
        let cursor = AdminRecordCursor {
            started_at_micros: 1_762_000_000_000_000,
            id: 42,
        };
        let encoded = encode_cursor(cursor).expect("encode cursor");
        assert_eq!(cursor, decode_cursor(&encoded).expect("decode cursor"));
    }

    #[test]
    fn malformed_cursor_is_rejected() {
        assert!(decode_cursor("").is_err());
        assert!(decode_cursor("not-base64!").is_err());
        assert!(decode_cursor(&"a".repeat(MAX_RECORD_CURSOR_LEN + 1)).is_err());
    }

    #[test]
    fn page_size_is_bounded() {
        assert_eq!(DEFAULT_RECORD_PAGE_SIZE, parse_page_size(None).unwrap());
        assert!(parse_page_size(Some(0)).is_err());
        assert!(parse_page_size(Some(MAX_RECORD_PAGE_SIZE + 1)).is_err());
    }
}
