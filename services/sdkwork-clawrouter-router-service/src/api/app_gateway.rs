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
    AppGatewayTracesListQuery, AppGatewayTracesReadStore, AppGatewayTracesSubject,
};

#[derive(Clone)]
struct AppGatewayTracesState {
    read_store: Arc<dyn AppGatewayTracesReadStore + Send + Sync>,
    require_subject: bool,
}

#[derive(Debug, Deserialize)]
struct AppGatewayTracesListQueryRequest {
    page: Option<i64>,
    page_size: Option<i64>,
    q: Option<String>,
}

struct EmptyAppGatewayTracesReadStore;

impl AppGatewayTracesReadStore for EmptyAppGatewayTracesReadStore {
    fn load_gateway_traces<'a>(
        &'a self,
        _subject: Option<AppGatewayTracesSubject>,
        query: AppGatewayTracesListQuery,
    ) -> crate::ports::AppGatewayTracesReadFuture<'a, crate::ports::AppGatewayTracesListPage> {
        Box::pin(async move {
            Ok(crate::ports::AppGatewayTracesListPage {
                items: Vec::new(),
                total: 0,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }
}

pub fn app_gateway_traces_router() -> Router {
    app_gateway_traces_router_with_state(Arc::new(EmptyAppGatewayTracesReadStore), false)
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
    Query(request): Query<AppGatewayTracesListQueryRequest>,
) -> Response {
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, |scoped| {
        scoped.into()
    }) {
        Ok(subject) => subject,
        Err(response) => return response,
    };
    let query = match build_gateway_traces_list_query(request) {
        Ok(query) => query,
        Err(message) => return bad_request(message),
    };

    match state.read_store.load_gateway_traces(subject, query).await {
        Ok(page) => json_success_list_response(
            None,
            page.items,
            offset_page_info(page.page_no, page.page_size, page.total),
        ),
        Err(error) => app_gateway_traces_read_model_error(error),
    }
}

fn build_gateway_traces_list_query(
    request: AppGatewayTracesListQueryRequest,
) -> Result<AppGatewayTracesListQuery, String> {
    let parsed = parse_offset_list_query(request.page, request.page_size)?;
    let q = normalize_list_search_query(request.q, "q")?;
    Ok(AppGatewayTracesListQuery {
        page_no: parsed.page_no,
        page_size: parsed.page_size,
        offset: parsed.offset,
        q,
    })
}

fn bad_request(message: String) -> Response {
    problem_from_wire_code("4001", message).into_response()
}

fn app_gateway_traces_read_model_error(error: impl std::fmt::Display) -> Response {
    problem_from_wire_code(
        "5000",
        format!("app gateway traces read model is unavailable: {error}"),
    )
    .into_response()
}
