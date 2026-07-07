use std::sync::Arc;

use axum::extract::{Query, State};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use serde::Deserialize;

use crate::api::app_sql_subject::{map_optional_app_sql_subject, ResolvedAppSqlScopedSubject};
use crate::api::response::{
    json_success_list_response, normalize_list_search_query, offset_page_info,
    parse_offset_list_query, problem_from_wire_code,
};
use crate::ports::{
    AppGenerationHistoryListPage, AppGenerationHistoryListQuery, AppGenerationHistoryReadFuture,
    AppGenerationHistoryReadStore, AppGenerationHistorySubject,
};

#[derive(Clone)]
struct AppGenerationHistoryState {
    read_store: Arc<dyn AppGenerationHistoryReadStore + Send + Sync>,
    require_subject: bool,
}

#[derive(Debug, Deserialize)]
struct AppGenerationHistoryListQueryRequest {
    page: Option<i64>,
    page_size: Option<i64>,
    q: Option<String>,
}

struct EmptyAppGenerationHistoryReadStore;

impl AppGenerationHistoryReadStore for EmptyAppGenerationHistoryReadStore {
    fn load_generation_history<'a>(
        &'a self,
        _subject: Option<AppGenerationHistorySubject>,
        query: AppGenerationHistoryListQuery,
    ) -> AppGenerationHistoryReadFuture<'a, AppGenerationHistoryListPage> {
        Box::pin(async move {
            Ok(AppGenerationHistoryListPage {
                items: Vec::new(),
                total: 0,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }
}

pub fn app_generation_history_router() -> Router {
    app_generation_history_router_with_state(Arc::new(EmptyAppGenerationHistoryReadStore), false)
}

pub fn app_generation_history_router_with_read_store(
    read_store: Arc<dyn AppGenerationHistoryReadStore + Send + Sync>,
) -> Router {
    app_generation_history_router_with_state(read_store, true)
}

fn app_generation_history_router_with_state(
    read_store: Arc<dyn AppGenerationHistoryReadStore + Send + Sync>,
    require_subject: bool,
) -> Router {
    Router::new()
        .route("/app/v3/api/ai/generations", get(fetch_history))
        .with_state(AppGenerationHistoryState {
            read_store,
            require_subject,
        })
}

async fn fetch_history(
    State(state): State<AppGenerationHistoryState>,
    ResolvedAppSqlScopedSubject(subject): ResolvedAppSqlScopedSubject,
    Query(request): Query<AppGenerationHistoryListQueryRequest>,
) -> Response {
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, |scoped| {
        scoped.into()
    }) {
        Ok(subject) => subject,
        Err(response) => return response,
    };
    let query = match build_generation_history_list_query(request) {
        Ok(query) => query,
        Err(message) => return bad_request(message),
    };

    match state
        .read_store
        .load_generation_history(subject, query)
        .await
    {
        Ok(page) => json_success_list_response(
            None,
            page.items,
            offset_page_info(page.page_no, page.page_size, page.total),
        ),
        Err(error) => app_generation_history_read_model_error(error),
    }
}

fn build_generation_history_list_query(
    request: AppGenerationHistoryListQueryRequest,
) -> Result<AppGenerationHistoryListQuery, String> {
    let parsed = parse_offset_list_query(request.page, request.page_size)?;
    let q = normalize_list_search_query(request.q, "q")?;
    Ok(AppGenerationHistoryListQuery {
        page_no: parsed.page_no,
        page_size: parsed.page_size,
        offset: parsed.offset,
        q,
    })
}

fn bad_request(message: String) -> Response {
    problem_from_wire_code("4001", message).into_response()
}

fn app_generation_history_read_model_error(error: impl std::fmt::Display) -> Response {
    problem_from_wire_code(
        "5000",
        format!("app generation history read model is unavailable: {error}"),
    )
    .into_response()
}
