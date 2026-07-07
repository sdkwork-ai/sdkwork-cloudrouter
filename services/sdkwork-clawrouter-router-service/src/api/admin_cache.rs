use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;
use crate::api::query_string::{parse_usize_query_param, query_pairs};
use axum::extract::{Path, State};
use axum::http::{StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::{delete, get, post};
use axum::{Json, Router};
use sdkwork_utils_rust::{PageInfo, PageMode, SdkWorkResultCode};
use serde::Serialize;

use crate::api::response::{platform_problem, problem_from_wire_code, success_envelope};
use crate::application::{
    CacheKeyMetadata, CacheNamespaceKeyList, CacheOperationOutcome, CacheRuntimeSnapshot,
    RuntimeCacheManager,
};

#[derive(Clone)]
struct AdminCacheState {
    manager: RuntimeCacheManager,
}

#[derive(Debug, Default)]
struct CacheKeyListQuery {
    page_size: Option<usize>,
    cursor: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CacheNamespaceKeyPage {
    namespace: String,
    instance_name: String,
    scanned_items: usize,
    returned_items: usize,
    scan_complete: bool,
    items: Vec<CacheKeyMetadata>,
    page_info: PageInfo,
}

pub fn admin_cache_router_with_manager(manager: RuntimeCacheManager) -> Router {
    Router::new()
        .route("/backend/v3/api/system/cache/overview", get(fetch_overview))
        .route("/backend/v3/api/system/cache/refresh", post(refresh_all))
        .route(
            "/backend/v3/api/system/cache/instances/{instance_name}/refresh",
            post(refresh_instance),
        )
        .route(
            "/backend/v3/api/system/cache/instances/{instance_name}",
            delete(delete_instance),
        )
        .route(
            "/backend/v3/api/system/cache/namespaces/{namespace}",
            delete(delete_namespace),
        )
        .route(
            "/backend/v3/api/system/cache/namespaces/{namespace}/refresh",
            post(refresh_namespace),
        )
        .route(
            "/backend/v3/api/system/cache/namespaces/{namespace}/keys",
            get(list_namespace_keys),
        )
        .route(
            "/backend/v3/api/system/cache/namespaces/{namespace}/keys/{key}",
            delete(delete_key),
        )
        .with_state(AdminCacheState { manager })
}

async fn fetch_overview(
    State(state): State<AdminCacheState>,
    RequiredAdminSqlScopedSubject(_scoped): RequiredAdminSqlScopedSubject,
) -> Response {
    match state.manager.snapshot().await {
        Ok(snapshot) => cache_success(snapshot),
        Err(error) => cache_system_response("cache runtime snapshot is unavailable", error),
    }
}

async fn refresh_all(
    State(state): State<AdminCacheState>,
    RequiredAdminSqlScopedSubject(_scoped): RequiredAdminSqlScopedSubject,
) -> Response {
    match state.manager.refresh_all().await {
        Ok(outcome) => cache_success(outcome),
        Err(error) => cache_system_response("cache refresh failed", error),
    }
}

async fn refresh_instance(
    State(state): State<AdminCacheState>,
    RequiredAdminSqlScopedSubject(_scoped): RequiredAdminSqlScopedSubject,
    Path(instance_name): Path<String>,
) -> Response {
    match state.manager.refresh_instance(&instance_name).await {
        Ok(outcome) => cache_success(outcome),
        Err(error) => cache_system_response("cache instance refresh failed", error),
    }
}

async fn delete_instance(
    State(state): State<AdminCacheState>,
    RequiredAdminSqlScopedSubject(_scoped): RequiredAdminSqlScopedSubject,
    Path(instance_name): Path<String>,
) -> Response {
    match state.manager.delete_instance(&instance_name).await {
        Ok(outcome) => cache_success(outcome),
        Err(error) => cache_system_response("cache instance delete failed", error),
    }
}

async fn refresh_namespace(
    State(state): State<AdminCacheState>,
    RequiredAdminSqlScopedSubject(_scoped): RequiredAdminSqlScopedSubject,
    Path(namespace): Path<String>,
) -> Response {
    match state.manager.refresh_namespace(&namespace).await {
        Ok(outcome) => cache_success(outcome),
        Err(error) => cache_system_response("cache namespace refresh failed", error),
    }
}

async fn delete_namespace(
    State(state): State<AdminCacheState>,
    RequiredAdminSqlScopedSubject(_scoped): RequiredAdminSqlScopedSubject,
    Path(namespace): Path<String>,
) -> Response {
    match state.manager.delete_namespace(&namespace).await {
        Ok(outcome) => cache_success(outcome),
        Err(error) => cache_system_response("cache namespace delete failed", error),
    }
}

async fn list_namespace_keys(
    State(state): State<AdminCacheState>,
    RequiredAdminSqlScopedSubject(_scoped): RequiredAdminSqlScopedSubject,
    Path(namespace): Path<String>,
    uri: Uri,
) -> Response {
    let query = match parse_cache_key_list_query(uri.query()) {
        Ok(query) => query,
        Err(error) => return cache_invalid_parameter_response(error),
    };
    let page_size = match normalize_key_list_page_size(query.page_size) {
        Ok(page_size) => page_size,
        Err(error) => return cache_invalid_parameter_response(error),
    };
    let cursor = match normalize_key_list_cursor(query.cursor) {
        Ok(cursor) => cursor,
        Err(error) => return cache_invalid_parameter_response(error),
    };
    match state
        .manager
        .list_namespace_keys(&namespace, Some(page_size), cursor.as_deref())
        .await
    {
        Ok(keys) => cache_success(cache_key_page(keys, page_size)),
        Err(error) => cache_system_response("cache namespace keys list failed", error),
    }
}

async fn delete_key(
    State(state): State<AdminCacheState>,
    RequiredAdminSqlScopedSubject(_scoped): RequiredAdminSqlScopedSubject,
    Path((namespace, key)): Path<(String, String)>,
) -> Response {
    match state.manager.delete_key(&namespace, &key).await {
        Ok(outcome) => cache_success(outcome),
        Err(error) => cache_system_response("cache key delete failed", error),
    }
}

fn cache_success<T>(data: T) -> Response
where
    T: serde::Serialize,
{
    Json(success_envelope(data)).into_response()
}

const DEFAULT_CACHE_KEY_LIST_LIMIT: usize = 200;
const MAX_CACHE_KEY_LIST_PAGE_SIZE: usize = 200;

fn parse_cache_key_list_query(query: Option<&str>) -> Result<CacheKeyListQuery, String> {
    let mut parsed = CacheKeyListQuery::default();
    for (key, value) in query_pairs(query) {
        match key.as_str() {
            "page_size" => {
                if parsed.page_size.is_some() {
                    return Err("page_size must be provided once".to_owned());
                }
                parsed.page_size = Some(parse_usize_query_param("page_size", &value)?);
            }
            "cursor" => {
                if parsed.cursor.is_some() {
                    return Err("cursor must be provided once".to_owned());
                }
                parsed.cursor = Some(value);
            }
            "limit" | "pageSize" | "page_no" | "pageNo" | "per_page" | "size" | "offset" => {
                return Err(format!(
                    "{key} is not a supported pagination parameter; use page_size"
                ));
            }
            "" => {}
            _ => return Err(format!("unsupported cache key list query parameter: {key}")),
        }
    }
    Ok(parsed)
}

fn normalize_key_list_page_size(page_size: Option<usize>) -> Result<usize, String> {
    let page_size = page_size.unwrap_or(DEFAULT_CACHE_KEY_LIST_LIMIT);
    if !(1..=MAX_CACHE_KEY_LIST_PAGE_SIZE).contains(&page_size) {
        return Err(format!(
            "page_size must be between 1 and {MAX_CACHE_KEY_LIST_PAGE_SIZE}"
        ));
    }
    Ok(page_size)
}

fn normalize_key_list_cursor(cursor: Option<String>) -> Result<Option<String>, String> {
    let Some(cursor) = cursor else {
        return Ok(None);
    };
    if cursor.trim().is_empty() {
        return Ok(None);
    }
    if cursor.len() > 2_048 {
        return Err("cache key list cursor must not exceed 2048 characters".to_owned());
    }
    Ok(Some(cursor))
}

fn cache_key_page(keys: CacheNamespaceKeyList, page_size: usize) -> CacheNamespaceKeyPage {
    CacheNamespaceKeyPage {
        namespace: keys.namespace,
        instance_name: keys.instance_name,
        scanned_items: keys.scanned_items,
        returned_items: keys.returned_items,
        scan_complete: keys.scan_complete,
        items: keys.items,
        page_info: PageInfo {
            mode: PageMode::Cursor,
            page: None,
            page_size: Some(page_size as i32),
            total_items: None,
            total_pages: None,
            next_cursor: keys.next_cursor,
            has_more: Some(keys.has_more),
        },
    }
}

fn cache_invalid_parameter_response(detail: impl Into<String>) -> Response {
    (
        StatusCode::BAD_REQUEST,
        platform_problem(SdkWorkResultCode::InvalidParameter, detail),
    )
        .into_response()
}

fn cache_system_response(context: &str, error: crate::domain::DomainError) -> Response {
    let status = if error.is_not_found() {
        StatusCode::NOT_FOUND
    } else if error.is_conflict() {
        StatusCode::CONFLICT
    } else {
        StatusCode::INTERNAL_SERVER_ERROR
    };
    let code = match status {
        StatusCode::NOT_FOUND => "4040",
        StatusCode::CONFLICT => "4090",
        _ => "5000",
    };
    (
        status,
        problem_from_wire_code(code, format!("{context}: {error}")),
    )
        .into_response()
}

#[allow(dead_code)]
fn _assert_cache_response_types(
    _snapshot: CacheRuntimeSnapshot,
    _outcome: CacheOperationOutcome,
    _keys: CacheNamespaceKeyList,
) {
}
