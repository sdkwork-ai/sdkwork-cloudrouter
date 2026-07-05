use std::sync::Arc;

use axum::extract::{Query, State};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use serde::Deserialize;

use crate::api::app_sql_subject::{map_optional_app_sql_subject, ResolvedAppSqlScopedSubject};
use crate::api::response::{
    json_success_list_response, normalize_list_search_query, offset_page_info,
    parse_offset_list_query, problem_from_wire_code, success_envelope,
};
use crate::ports::{
    AppRoutingListQuery, AppRoutingReadStore, AppRoutingSubject,
};

#[derive(Clone)]
struct AppRoutingState {
    read_store: Arc<dyn AppRoutingReadStore + Send + Sync>,
    require_subject: bool,
}

#[derive(Debug, Deserialize)]
struct AppRoutingListQueryRequest {
    page: Option<i64>,
    page_size: Option<i64>,
    q: Option<String>,
}

struct EmptyAppRoutingReadStore;

impl AppRoutingReadStore for EmptyAppRoutingReadStore {
    fn load_routing_channels<'a>(
        &'a self,
        _subject: Option<AppRoutingSubject>,
        query: AppRoutingListQuery,
    ) -> crate::ports::AppRoutingReadFuture<'a, crate::ports::AppRoutingChannelListPage> {
        Box::pin(async move {
            Ok(crate::ports::AppRoutingChannelListPage {
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
        query: AppRoutingListQuery,
    ) -> crate::ports::AppRoutingReadFuture<'a, crate::ports::AppRoutingRequestTraceListPage> {
        Box::pin(async move {
            Ok(crate::ports::AppRoutingRequestTraceListPage {
                items: Vec::new(),
                total: 0,
                page_no: query.page_no,
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
            "/app/v3/api/ai/routing/channels",
            get(fetch_routing_channels),
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

async fn fetch_routing_channels(
    State(state): State<AppRoutingState>,
    ResolvedAppSqlScopedSubject(subject): ResolvedAppSqlScopedSubject,
    Query(request): Query<AppRoutingListQueryRequest>,
) -> Response {
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, |scoped| {
        scoped.into()
    }) {
        Ok(subject) => subject,
        Err(response) => return response,
    };
    let query = match build_routing_list_query(request) {
        Ok(query) => query,
        Err(message) => return bad_request(message),
    };

    match state.read_store.load_routing_channels(subject, query).await {
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
    Query(request): Query<AppRoutingListQueryRequest>,
) -> Response {
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, |scoped| {
        scoped.into()
    }) {
        Ok(subject) => subject,
        Err(response) => return response,
    };
    let query = match build_routing_list_query(request) {
        Ok(query) => query,
        Err(message) => return bad_request(message),
    };

    match state.read_store.load_routing_api_keys(subject, query).await {
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
    Query(request): Query<AppRoutingListQueryRequest>,
) -> Response {
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, |scoped| {
        scoped.into()
    }) {
        Ok(subject) => subject,
        Err(response) => return response,
    };
    let query = match build_routing_list_query(request) {
        Ok(query) => query,
        Err(message) => return bad_request(message),
    };

    match state
        .read_store
        .load_routing_request_traces(subject, query)
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

async fn fetch_routing_usage(
    State(state): State<AppRoutingState>,
    ResolvedAppSqlScopedSubject(subject): ResolvedAppSqlScopedSubject,
) -> Response {
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, |scoped| {
        scoped.into()
    }) {
        Ok(subject) => subject,
        Err(response) => return response,
    };

    match state.read_store.load_routing_usage(subject).await {
        Ok(snapshot) => axum::Json(success_envelope(snapshot)).into_response(),
        Err(error) => app_routing_read_model_error(error),
    }
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
