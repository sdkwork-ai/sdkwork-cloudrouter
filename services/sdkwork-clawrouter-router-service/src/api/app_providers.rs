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
use crate::ports::{AppProvidersListQuery, AppProvidersReadStore, AppProvidersSubject};

#[derive(Clone)]
struct AppProvidersState {
    read_store: Arc<dyn AppProvidersReadStore + Send + Sync>,
    require_subject: bool,
}

#[derive(Debug, Deserialize)]
struct AppProvidersListQueryRequest {
    page: Option<i64>,
    page_size: Option<i64>,
    q: Option<String>,
}

struct EmptyAppProvidersReadStore;

impl AppProvidersReadStore for EmptyAppProvidersReadStore {
    fn load_providers<'a>(
        &'a self,
        _subject: Option<AppProvidersSubject>,
        query: AppProvidersListQuery,
    ) -> crate::ports::AppProvidersReadFuture<'a, crate::ports::AppProvidersListPage> {
        Box::pin(async move {
            Ok(crate::ports::AppProvidersListPage {
                items: Vec::new(),
                total: 0,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }
}

pub fn app_providers_router() -> Router {
    app_providers_router_with_state(Arc::new(EmptyAppProvidersReadStore), false)
}

pub fn app_providers_router_with_read_store(
    read_store: Arc<dyn AppProvidersReadStore + Send + Sync>,
) -> Router {
    app_providers_router_with_state(read_store, true)
}

fn app_providers_router_with_state(
    read_store: Arc<dyn AppProvidersReadStore + Send + Sync>,
    require_subject: bool,
) -> Router {
    Router::new()
        .route("/app/v3/api/ai/providers", get(fetch_providers))
        .with_state(AppProvidersState {
            read_store,
            require_subject,
        })
}

async fn fetch_providers(
    State(state): State<AppProvidersState>,
    ResolvedAppSqlScopedSubject(subject): ResolvedAppSqlScopedSubject,
    Query(request): Query<AppProvidersListQueryRequest>,
) -> Response {
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, |scoped| {
        scoped.into()
    }) {
        Ok(subject) => subject,
        Err(response) => return response,
    };
    let query = match build_providers_list_query(request) {
        Ok(query) => query,
        Err(message) => return bad_request(message),
    };

    match state.read_store.load_providers(subject, query).await {
        Ok(page) => json_success_list_response(
            None,
            page.items,
            offset_page_info(page.page_no, page.page_size, page.total),
        ),
        Err(error) => app_providers_read_model_error(error),
    }
}

fn build_providers_list_query(
    request: AppProvidersListQueryRequest,
) -> Result<AppProvidersListQuery, String> {
    let parsed = parse_offset_list_query(request.page, request.page_size)?;
    let q = normalize_list_search_query(request.q, "q")?;
    Ok(AppProvidersListQuery {
        page_no: parsed.page_no,
        page_size: parsed.page_size,
        offset: parsed.offset,
        q,
    })
}

fn bad_request(message: String) -> Response {
    problem_from_wire_code("4001", message).into_response()
}

fn app_providers_read_model_error(error: impl std::fmt::Display) -> Response {
    problem_from_wire_code(
        "5000",
        format!("app providers read model is unavailable: {error}"),
    )
    .into_response()
}
