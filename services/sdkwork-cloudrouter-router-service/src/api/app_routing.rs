use std::sync::Arc;

use axum::extract::rejection::QueryRejection;
use axum::extract::{Extension, Query, State};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use sdkwork_cloudrouter_http::RequestLocale;
use sdkwork_utils_rust::http_api::{cursor_window_page_info, SdkWorkResultCode};
use sdkwork_utils_rust::{base64url_decode, base64url_encode};
use sdkwork_web_core::WebRequestContext;
use serde::{Deserialize, Serialize};

use crate::api::app_sql_subject::{map_optional_app_sql_subject, ResolvedAppSqlScopedSubject};
use crate::api::response::{
    json_success_list_response, normalize_list_search_query, offset_page_info,
    parse_offset_list_query, platform_problem_for_context, problem_from_wire_code,
    success_envelope,
};
use crate::domain::DomainError;
use crate::ports::{
    AppRoutingListQuery, AppRoutingReadStore, AppRoutingRequestTraceCursor, AppRoutingSubject,
    AppRoutingTraceQuery,
};

#[derive(Clone)]
struct AppRoutingState {
    read_store: Arc<dyn AppRoutingReadStore + Send + Sync>,
    require_subject: bool,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct AppRoutingListQueryRequest {
    page: Option<i64>,
    page_size: Option<i64>,
    q: Option<String>,
}

/// Cursor-mode list query for routing request traces (`API_SPEC.md` §14.1:
/// `cursor` + `page_size`). `page` is rejected to keep the operation
/// cursor-only per `PAGINATION_SPEC.md` §12 pre-launch zero-debt.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct AppRoutingTraceQueryRequest {
    cursor: Option<String>,
    page_size: Option<i64>,
    q: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct RoutingTracesCursorPayload {
    started_at_micros: i64,
    id: i64,
}

const DEFAULT_ROUTING_TRACES_PAGE_SIZE: i64 = 20;
const MAX_ROUTING_TRACES_PAGE_SIZE: i64 = 200;
const MAX_ROUTING_TRACES_KEYWORD_LEN: usize = 128;
const MAX_ROUTING_TRACES_CURSOR_LEN: usize = 1024;
const MAX_ROUTING_TRACES_CURSOR_EPOCH_MICROS: i64 = 253_402_300_799_999_999;

struct EmptyAppRoutingReadStore;

impl AppRoutingReadStore for EmptyAppRoutingReadStore {
    fn load_routing_account_groups<'a>(
        &'a self,
        _subject: Option<AppRoutingSubject>,
        query: AppRoutingListQuery,
        _locale: Option<&str>,
    ) -> crate::ports::AppRoutingReadFuture<'a, crate::ports::AppRoutingAccountGroupListPage> {
        Box::pin(async move {
            Ok(crate::ports::AppRoutingAccountGroupListPage {
                items: Vec::new(),
                total: 0,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn load_routing_api_keys<'a>(
        &'a self,
        _subject: Option<AppRoutingSubject>,
        query: AppRoutingListQuery,
        _locale: Option<&str>,
    ) -> crate::ports::AppRoutingReadFuture<'a, crate::ports::AppRoutingApiKeyListPage> {
        Box::pin(async move {
            Ok(crate::ports::AppRoutingApiKeyListPage {
                items: Vec::new(),
                total: 0,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn load_routing_request_traces<'a>(
        &'a self,
        _subject: Option<AppRoutingSubject>,
        query: AppRoutingTraceQuery,
        _locale: Option<&str>,
    ) -> crate::ports::AppRoutingReadFuture<'a, crate::ports::AppRoutingRequestTraceListPage> {
        Box::pin(async move {
            Ok(crate::ports::AppRoutingRequestTraceListPage {
                items: Vec::new(),
                next_cursor: None,
                has_more: false,
                page_size: query.page_size,
            })
        })
    }

    fn load_routing_usage<'a>(
        &'a self,
        _subject: Option<AppRoutingSubject>,
    ) -> crate::ports::AppRoutingReadFuture<'a, crate::ports::AppRoutingUsageSnapshot> {
        Box::pin(async { Ok(crate::ports::AppRoutingUsageSnapshot::default()) })
    }
}

pub fn app_routing_router() -> Router {
    app_routing_router_with_state(Arc::new(EmptyAppRoutingReadStore), false)
}

pub fn app_routing_router_with_read_store(
    read_store: Arc<dyn AppRoutingReadStore + Send + Sync>,
) -> Router {
    app_routing_router_with_state(read_store, true)
}

fn app_routing_router_with_state(
    read_store: Arc<dyn AppRoutingReadStore + Send + Sync>,
    require_subject: bool,
) -> Router {
    Router::new()
        .route(
            "/app/v3/api/ai/routing/account_groups",
            get(fetch_routing_account_groups),
        )
        .route(
            "/app/v3/api/ai/routing/api_keys",
            get(fetch_routing_api_keys),
        )
        .route(
            "/app/v3/api/ai/routing/request_traces",
            get(fetch_routing_request_traces),
        )
        .route("/app/v3/api/ai/routing/usage", get(fetch_routing_usage))
        .with_state(AppRoutingState {
            read_store,
            require_subject,
        })
}

async fn fetch_routing_account_groups(
    State(state): State<AppRoutingState>,
    ResolvedAppSqlScopedSubject(subject): ResolvedAppSqlScopedSubject,
    request_context: Option<Extension<WebRequestContext>>,
    locale_extension: Option<Extension<RequestLocale>>,
    Query(request): Query<AppRoutingListQueryRequest>,
) -> Response {
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, |scoped| {
        scoped.into()
    }) {
        Ok(subject) => subject,
        Err(error) => return error.into_response(),
    };
    let query = match build_routing_list_query(request) {
        Ok(query) => query,
        Err(message) => return bad_request(message),
    };
    let locale = resolved_request_locale(request_context, locale_extension);

    match state
        .read_store
        .load_routing_account_groups(subject, query, locale.as_deref())
        .await
    {
        Ok(page) => json_success_list_response(
            None,
            page.items,
            offset_page_info(page.page_no, page.page_size, page.total),
        ),
        Err(error) => app_routing_read_model_error(error),
    }
}

async fn fetch_routing_api_keys(
    State(state): State<AppRoutingState>,
    ResolvedAppSqlScopedSubject(subject): ResolvedAppSqlScopedSubject,
    request_context: Option<Extension<WebRequestContext>>,
    locale_extension: Option<Extension<RequestLocale>>,
    Query(request): Query<AppRoutingListQueryRequest>,
) -> Response {
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, |scoped| {
        scoped.into()
    }) {
        Ok(subject) => subject,
        Err(error) => return error.into_response(),
    };
    let query = match build_routing_list_query(request) {
        Ok(query) => query,
        Err(message) => return bad_request(message),
    };
    let locale = resolved_request_locale(request_context, locale_extension);

    match state
        .read_store
        .load_routing_api_keys(subject, query, locale.as_deref())
        .await
    {
        Ok(page) => json_success_list_response(
            None,
            page.items,
            offset_page_info(page.page_no, page.page_size, page.total),
        ),
        Err(error) => app_routing_read_model_error(error),
    }
}

async fn fetch_routing_request_traces(
    State(state): State<AppRoutingState>,
    ResolvedAppSqlScopedSubject(subject): ResolvedAppSqlScopedSubject,
    request_context: Option<Extension<WebRequestContext>>,
    locale_extension: Option<Extension<RequestLocale>>,
    query: Result<Query<AppRoutingTraceQueryRequest>, QueryRejection>,
) -> Response {
    let ctx = request_context.clone().map(|context| context.0);
    let Query(request) = match query {
        Ok(query) => query,
        Err(_) => {
            return platform_problem_for_context(
                ctx.as_ref(),
                SdkWorkResultCode::InvalidParameter,
                "routing request traces query parameters are invalid",
            )
            .into_response();
        }
    };
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, |scoped| {
        scoped.into()
    }) {
        Ok(subject) => subject,
        Err(error) => return error.into_response(),
    };
    let query = match build_routing_trace_query(request) {
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
    let locale = resolved_request_locale(request_context, locale_extension);

    match state
        .read_store
        .load_routing_request_traces(subject, query, locale.as_deref())
        .await
    {
        Ok(page) => {
            let next_cursor = match page.next_cursor.as_ref().map(encode_routing_traces_cursor) {
                Some(Ok(cursor)) => Some(cursor),
                Some(Err(_)) => {
                    tracing::error!("routing request traces cursor encoding failed");
                    return platform_problem_for_context(
                        ctx.as_ref(),
                        SdkWorkResultCode::InternalError,
                        "routing request traces read model is unavailable",
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
        Err(error) => app_routing_read_model_error(error),
    }
}

async fn fetch_routing_usage(
    State(state): State<AppRoutingState>,
    ResolvedAppSqlScopedSubject(subject): ResolvedAppSqlScopedSubject,
) -> Response {
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, |scoped| {
        scoped.into()
    }) {
        Ok(subject) => subject,
        Err(error) => return error.into_response(),
    };

    match state.read_store.load_routing_usage(subject).await {
        Ok(snapshot) => axum::Json(success_envelope(snapshot)).into_response(),
        Err(error) => app_routing_read_model_error(error),
    }
}

/// Resolves the effective request locale from the web-framework context first,
/// falling back to the Cloud Router locale boundary extension (`I18N_SPEC.md`
/// §3). The locale selects DB `*_i18n` jsonb display names (`I18N_SPEC.md` §11).
fn resolved_request_locale(
    request_context: Option<Extension<WebRequestContext>>,
    locale_extension: Option<Extension<RequestLocale>>,
) -> Option<String> {
    request_context
        .and_then(|context| context.0.locale)
        .or_else(|| locale_extension.map(|extension| extension.0.effective().to_owned()))
}

fn build_routing_list_query(
    request: AppRoutingListQueryRequest,
) -> Result<AppRoutingListQuery, String> {
    let parsed = parse_offset_list_query(request.page, request.page_size)?;
    let q = normalize_list_search_query(request.q, "q")?;
    Ok(AppRoutingListQuery {
        page_no: parsed.page_no,
        page_size: parsed.page_size,
        offset: parsed.offset,
        q,
    })
}

fn build_routing_trace_query(
    request: AppRoutingTraceQueryRequest,
) -> Result<AppRoutingTraceQuery, String> {
    let page_size = request
        .page_size
        .unwrap_or(DEFAULT_ROUTING_TRACES_PAGE_SIZE);
    if !(1..=MAX_ROUTING_TRACES_PAGE_SIZE).contains(&page_size) {
        return Err(format!(
            "routing request traces page_size must be between 1 and {MAX_ROUTING_TRACES_PAGE_SIZE}"
        ));
    }
    let q = request
        .q
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty());
    if q.as_ref()
        .is_some_and(|value| value.chars().count() > MAX_ROUTING_TRACES_KEYWORD_LEN)
    {
        return Err(format!(
            "routing request traces q must not exceed {MAX_ROUTING_TRACES_KEYWORD_LEN} characters"
        ));
    }
    let cursor = request
        .cursor
        .as_deref()
        .map(decode_routing_traces_cursor)
        .transpose()?;

    Ok(AppRoutingTraceQuery {
        cursor,
        page_size,
        q,
    })
}

fn encode_routing_traces_cursor(
    cursor: &AppRoutingRequestTraceCursor,
) -> Result<String, DomainError> {
    let payload = RoutingTracesCursorPayload {
        started_at_micros: cursor.started_at_micros,
        id: cursor.id,
    };
    serde_json::to_vec(&payload)
        .map(|value| base64url_encode(&value))
        .map_err(|_| DomainError::new("routing request traces cursor serialization failed"))
}

fn decode_routing_traces_cursor(value: &str) -> Result<AppRoutingRequestTraceCursor, String> {
    if value.is_empty() || value.len() > MAX_ROUTING_TRACES_CURSOR_LEN || value.trim() != value {
        return Err("routing request traces cursor is invalid".to_owned());
    }
    let decoded = base64url_decode(value)
        .ok_or_else(|| "routing request traces cursor is invalid".to_owned())?;
    let payload = serde_json::from_slice::<RoutingTracesCursorPayload>(&decoded)
        .map_err(|_| "routing request traces cursor is invalid".to_owned())?;
    if payload.id <= 0
        || !(0..=MAX_ROUTING_TRACES_CURSOR_EPOCH_MICROS).contains(&payload.started_at_micros)
    {
        return Err("routing request traces cursor is invalid".to_owned());
    }
    Ok(AppRoutingRequestTraceCursor {
        started_at_micros: payload.started_at_micros,
        id: payload.id,
    })
}

fn bad_request(message: String) -> Response {
    problem_from_wire_code("4001", message).into_response()
}

fn app_routing_read_model_error(error: impl std::fmt::Display) -> Response {
    problem_from_wire_code(
        "5000",
        format!("app routing read model is unavailable: {error}"),
    )
    .into_response()
}

#[cfg(test)]
mod tests {
    use super::{
        build_routing_trace_query, decode_routing_traces_cursor, encode_routing_traces_cursor,
        AppRoutingTraceQueryRequest,
    };
    use crate::ports::AppRoutingRequestTraceCursor;

    #[test]
    fn routing_trace_cursor_round_trips_as_opaque_base64url() {
        let cursor = AppRoutingRequestTraceCursor {
            started_at_micros: 1_782_531_200_123_456,
            id: 42,
        };

        let encoded = encode_routing_traces_cursor(&cursor).unwrap();

        assert!(!encoded.contains('{'));
        assert_eq!(cursor, decode_routing_traces_cursor(&encoded).unwrap());
    }

    #[test]
    fn routing_trace_query_rejects_invalid_cursor_page_size_and_keyword() {
        for value in ["", "not-base64url", "IA"] {
            assert!(decode_routing_traces_cursor(value).is_err());
        }
        assert!(build_routing_trace_query(AppRoutingTraceQueryRequest {
            cursor: None,
            page_size: Some(201),
            q: None,
        })
        .is_err());
        assert!(build_routing_trace_query(AppRoutingTraceQueryRequest {
            cursor: None,
            page_size: Some(20),
            q: Some("x".repeat(129)),
        })
        .is_err());
    }
}
