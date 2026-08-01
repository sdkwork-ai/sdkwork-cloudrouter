use std::sync::Arc;

use axum::extract::rejection::QueryRejection;
use axum::extract::{Extension, Query, State};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use sdkwork_utils_rust::http_api::{cursor_window_page_info, SdkWorkResultCode};
use sdkwork_utils_rust::{base64url_decode, base64url_encode};
use sdkwork_web_core::WebRequestContext;
use serde::{Deserialize, Serialize};

use crate::api::app_sql_subject::{map_optional_app_sql_subject, ResolvedAppSqlScopedSubject};
use crate::api::response::{json_success_list_response, platform_problem_for_context};
use crate::domain::DomainError;
use crate::ports::{
    AppGatewayTracesCursor, AppGatewayTracesQuery, AppGatewayTracesReadFuture,
    AppGatewayTracesReadStore, AppGatewayTracesSubject,
};

const DEFAULT_GATEWAY_TRACES_PAGE_SIZE: i64 = 20;
const MAX_GATEWAY_TRACES_PAGE_SIZE: i64 = 200;
const MAX_GATEWAY_TRACES_KEYWORD_LEN: usize = 128;
const MAX_GATEWAY_TRACES_CURSOR_LEN: usize = 1024;
const MAX_GATEWAY_TRACES_CURSOR_EPOCH_MICROS: i64 = 253_402_300_799_999_999;

#[derive(Clone)]
struct AppGatewayTracesState {
    read_store: Arc<dyn AppGatewayTracesReadStore + Send + Sync>,
    require_subject: bool,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct AppGatewayTracesListQuery {
    cursor: Option<String>,
    page_size: Option<i64>,
    q: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct GatewayTracesCursorPayload {
    started_at_micros: i64,
    id: i64,
}

struct UnavailableAppGatewayTracesReadStore;

impl AppGatewayTracesReadStore for UnavailableAppGatewayTracesReadStore {
    fn load_gateway_traces<'a>(
        &'a self,
        _query: AppGatewayTracesQuery,
        _subject: Option<AppGatewayTracesSubject>,
    ) -> AppGatewayTracesReadFuture<'a> {
        Box::pin(async {
            Err(DomainError::new(
                "gateway traces read store is not configured",
            ))
        })
    }
}

pub fn app_gateway_traces_router() -> Router {
    app_gateway_traces_router_with_state(Arc::new(UnavailableAppGatewayTracesReadStore), false)
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
    request_context: Option<Extension<WebRequestContext>>,
    query: Result<Query<AppGatewayTracesListQuery>, QueryRejection>,
) -> Response {
    let ctx = request_context.map(|context| context.0);
    let Query(query) = match query {
        Ok(query) => query,
        Err(_) => {
            return platform_problem_for_context(
                ctx.as_ref(),
                SdkWorkResultCode::InvalidParameter,
                "gateway traces query parameters are invalid",
            )
            .into_response();
        }
    };
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, Into::into) {
        Ok(subject) => subject,
        Err(error) => return error.into_response(),
    };
    let query = match validate_gateway_traces_query(query) {
        Ok(query) => query,
        Err(message) => {
            return platform_problem_for_context(
                ctx.as_ref(),
                SdkWorkResultCode::InvalidParameter,
                message,
            )
            .into_response();
        }
    };

    match state.read_store.load_gateway_traces(query, subject).await {
        Ok(page) => {
            let next_cursor = match page.next_cursor.as_ref().map(encode_gateway_traces_cursor) {
                Some(Ok(cursor)) => Some(cursor),
                Some(Err(_)) => {
                    tracing::error!("gateway traces cursor encoding failed");
                    return platform_problem_for_context(
                        ctx.as_ref(),
                        SdkWorkResultCode::InternalError,
                        "gateway traces read model is unavailable",
                    )
                    .into_response();
                }
                None => None,
            };
            let page_size = usize::try_from(page.page_size).ok();
            json_success_list_response(
                ctx.as_ref(),
                page.items,
                cursor_window_page_info(page_size, next_cursor, page.has_more),
            )
        }
        Err(_) => {
            tracing::error!("gateway traces read model failed");
            platform_problem_for_context(
                ctx.as_ref(),
                SdkWorkResultCode::InternalError,
                "gateway traces read model is unavailable",
            )
            .into_response()
        }
    }
}

fn validate_gateway_traces_query(
    query: AppGatewayTracesListQuery,
) -> Result<AppGatewayTracesQuery, String> {
    let page_size = query.page_size.unwrap_or(DEFAULT_GATEWAY_TRACES_PAGE_SIZE);
    if !(1..=MAX_GATEWAY_TRACES_PAGE_SIZE).contains(&page_size) {
        return Err(format!(
            "gateway traces page_size must be between 1 and {MAX_GATEWAY_TRACES_PAGE_SIZE}"
        ));
    }
    let keyword = query
        .q
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty());
    if keyword
        .as_ref()
        .is_some_and(|value| value.chars().count() > MAX_GATEWAY_TRACES_KEYWORD_LEN)
    {
        return Err(format!(
            "gateway traces q must not exceed {MAX_GATEWAY_TRACES_KEYWORD_LEN} characters"
        ));
    }
    let cursor = query
        .cursor
        .as_deref()
        .map(decode_gateway_traces_cursor)
        .transpose()?;

    Ok(AppGatewayTracesQuery {
        cursor,
        page_size,
        keyword,
    })
}

fn encode_gateway_traces_cursor(cursor: &AppGatewayTracesCursor) -> Result<String, DomainError> {
    let payload = GatewayTracesCursorPayload {
        started_at_micros: cursor.started_at_micros,
        id: cursor.id,
    };
    serde_json::to_vec(&payload)
        .map(|value| base64url_encode(&value))
        .map_err(|_| DomainError::new("gateway traces cursor serialization failed"))
}

fn decode_gateway_traces_cursor(value: &str) -> Result<AppGatewayTracesCursor, String> {
    if value.is_empty() || value.len() > MAX_GATEWAY_TRACES_CURSOR_LEN || value.trim() != value {
        return Err("gateway traces cursor is invalid".to_owned());
    }
    let decoded =
        base64url_decode(value).ok_or_else(|| "gateway traces cursor is invalid".to_owned())?;
    let payload = serde_json::from_slice::<GatewayTracesCursorPayload>(&decoded)
        .map_err(|_| "gateway traces cursor is invalid".to_owned())?;
    if payload.id <= 0
        || !(0..=MAX_GATEWAY_TRACES_CURSOR_EPOCH_MICROS).contains(&payload.started_at_micros)
    {
        return Err("gateway traces cursor is invalid".to_owned());
    }
    Ok(AppGatewayTracesCursor {
        started_at_micros: payload.started_at_micros,
        id: payload.id,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        decode_gateway_traces_cursor, encode_gateway_traces_cursor, validate_gateway_traces_query,
        AppGatewayTracesListQuery,
    };
    use crate::ports::AppGatewayTracesCursor;

    #[test]
    fn gateway_trace_cursor_round_trips_as_opaque_base64url() {
        let cursor = AppGatewayTracesCursor {
            started_at_micros: 1_782_531_200_123_456,
            id: 42,
        };

        let encoded = encode_gateway_traces_cursor(&cursor).unwrap();

        assert!(!encoded.contains('{'));
        assert_eq!(cursor, decode_gateway_traces_cursor(&encoded).unwrap());
    }

    #[test]
    fn gateway_trace_cursor_rejects_invalid_or_out_of_range_values() {
        for value in ["", "not-base64url", "IA"] {
            assert!(decode_gateway_traces_cursor(value).is_err());
        }
        let invalid_id = sdkwork_utils_rust::base64url_encode(
            br#"{"started_at_micros":1782531200123456,"id":0}"#,
        );
        assert!(decode_gateway_traces_cursor(&invalid_id).is_err());
    }

    #[test]
    fn gateway_trace_query_enforces_bounded_page_and_search_values() {
        let validated = validate_gateway_traces_query(AppGatewayTracesListQuery {
            cursor: None,
            page_size: None,
            q: Some("  trace-42  ".to_owned()),
        })
        .unwrap();
        assert_eq!(20, validated.page_size);
        assert_eq!(Some("trace-42"), validated.keyword.as_deref());

        assert!(validate_gateway_traces_query(AppGatewayTracesListQuery {
            cursor: None,
            page_size: Some(201),
            q: None,
        })
        .is_err());
        assert!(validate_gateway_traces_query(AppGatewayTracesListQuery {
            cursor: None,
            page_size: Some(20),
            q: Some("x".repeat(129)),
        })
        .is_err());
    }
}
