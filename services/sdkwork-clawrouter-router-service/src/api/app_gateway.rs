use std::sync::Arc;

use axum::extract::State;
use axum::http::{StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use sdkwork_utils_rust::{cursor_window_page_info, SdkWorkResultCode};

use crate::api::app_sql_subject::{map_optional_app_sql_subject, ResolvedAppSqlScopedSubject};
use crate::api::query_string::{parse_i64_query_param, query_pairs};
use crate::api::response::{json_success_list_response, platform_problem, problem_from_wire_code};
use crate::ports::{AppGatewayTracesListQuery, AppGatewayTracesReadStore, AppGatewayTracesSubject};

#[derive(Clone)]
struct AppGatewayTracesState {
    read_store: Arc<dyn AppGatewayTracesReadStore + Send + Sync>,
    require_subject: bool,
}

#[derive(Debug, Default)]
struct AppGatewayTracesListQueryRequest {
    page_size: Option<i64>,
    cursor: Option<String>,
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
                page_size: query.page_size(),
                next_cursor: None,
                has_more: false,
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
    uri: Uri,
) -> Response {
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, |scoped| {
        scoped.into()
    }) {
        Ok(subject) => subject,
        Err(response) => return response,
    };
    let query = match build_gateway_traces_list_query(uri.query()) {
        Ok(query) => query,
        Err(message) => return bad_request(message),
    };

    match state.read_store.load_gateway_traces(subject, query).await {
        Ok(page) => {
            let page_info = cursor_window_page_info(
                Some(page.page_size as usize),
                page.next_cursor,
                page.has_more,
            );
            json_success_list_response(None, page.items, page_info)
        }
        Err(error) => app_gateway_traces_read_model_error(error),
    }
}

fn build_gateway_traces_list_query(
    raw_query: Option<&str>,
) -> Result<AppGatewayTracesListQuery, String> {
    let request = parse_gateway_traces_list_query(raw_query)?;
    AppGatewayTracesListQuery::try_new(request.page_size, request.cursor, request.q)
        .map_err(|error| error.to_string())
}

fn parse_gateway_traces_list_query(
    raw_query: Option<&str>,
) -> Result<AppGatewayTracesListQueryRequest, String> {
    let mut request = AppGatewayTracesListQueryRequest::default();
    for (key, value) in query_pairs(raw_query) {
        match key.as_str() {
            "page_size" => {
                if request.page_size.is_some() {
                    return Err("page_size must be provided once".to_owned());
                }
                request.page_size = Some(parse_i64_query_param("page_size", &value)?);
            }
            "cursor" => {
                if request.cursor.is_some() {
                    return Err("cursor must be provided once".to_owned());
                }
                request.cursor = Some(value);
            }
            "q" => {
                if request.q.is_some() {
                    return Err("q must be provided once".to_owned());
                }
                request.q = Some(value);
            }
            "page" => {
                return Err(
                    "page is not supported for gateway traces; use the opaque cursor".to_owned(),
                );
            }
            "pageSize" | "limit" | "page_no" | "pageNo" | "per_page" | "size" | "offset" => {
                return Err(format!(
                    "{key} is not a supported pagination parameter; use page_size and cursor"
                ));
            }
            "" => {}
            _ => return Err(format!("unsupported gateway traces query parameter: {key}")),
        }
    }
    Ok(request)
}

fn bad_request(message: String) -> Response {
    (
        StatusCode::BAD_REQUEST,
        platform_problem(SdkWorkResultCode::InvalidParameter, message),
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::{to_bytes, Body};
    use axum::http::Request;
    use tower::ServiceExt;

    #[test]
    fn gateway_traces_query_uses_cursor_mode_defaults() {
        let query = build_gateway_traces_list_query(Some("page_size=25&q=%25_%5C"))
            .expect("valid cursor-mode query");
        assert_eq!(25, query.page_size());
    }

    #[test]
    fn gateway_traces_query_rejects_offset_and_compatibility_parameters() {
        for raw_query in [
            "page=1",
            "pageSize=20",
            "limit=20",
            "page_no=1",
            "pageNo=1",
            "per_page=20",
            "size=20",
            "offset=0",
        ] {
            build_gateway_traces_list_query(Some(raw_query))
                .expect_err("non-cursor pagination input must fail");
        }
    }

    #[test]
    fn gateway_traces_query_rejects_duplicates_bounds_and_bad_cursor() {
        for raw_query in [
            "page_size=1&page_size=2",
            "cursor=one&cursor=two",
            "q=one&q=two",
            "page_size=0",
            "page_size=201",
            "cursor=not-an-opaque-cursor",
            "unknown=value",
        ] {
            build_gateway_traces_list_query(Some(raw_query))
                .expect_err("invalid gateway traces input must fail");
        }
    }

    #[tokio::test]
    async fn gateway_traces_route_returns_cursor_page_info() {
        let response = app_gateway_traces_router()
            .oneshot(
                Request::builder()
                    .uri("/app/v3/api/ai/gateway/traces?page_size=25")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(StatusCode::OK, response.status());
        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(0, payload["code"]);
        assert_eq!("cursor", payload["data"]["pageInfo"]["mode"]);
        assert_eq!(25, payload["data"]["pageInfo"]["pageSize"]);
        assert_eq!(false, payload["data"]["pageInfo"]["hasMore"]);
        assert!(payload["data"]["pageInfo"].get("nextCursor").is_none());
    }

    #[tokio::test]
    async fn gateway_traces_route_maps_invalid_pagination_to_problem_detail() {
        let response = app_gateway_traces_router()
            .oneshot(
                Request::builder()
                    .uri("/app/v3/api/ai/gateway/traces?page=1")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(StatusCode::BAD_REQUEST, response.status());
        assert_eq!(
            Some("application/problem+json"),
            response
                .headers()
                .get(axum::http::header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
        );
        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(40003, payload["code"]);
    }
}

fn app_gateway_traces_read_model_error(error: impl std::fmt::Display) -> Response {
    problem_from_wire_code(
        "5000",
        format!("app gateway traces read model is unavailable: {error}"),
    )
    .into_response()
}
