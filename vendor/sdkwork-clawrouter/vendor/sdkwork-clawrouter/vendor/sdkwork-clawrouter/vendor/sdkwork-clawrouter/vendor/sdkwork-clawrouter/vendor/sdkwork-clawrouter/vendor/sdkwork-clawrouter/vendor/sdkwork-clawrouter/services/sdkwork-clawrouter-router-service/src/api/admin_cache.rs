use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::{delete, get, post};
use axum::{Json, Router};
use serde::Deserialize;
use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;

use crate::api::response::PlusApiResult;
use crate::application::{
    CacheNamespaceKeyList, CacheOperationOutcome, CacheRuntimeSnapshot, RuntimeCacheManager,
};

#[derive(Clone)]
struct AdminCacheState {
    manager: RuntimeCacheManager,
}

#[derive(Debug, Default, Deserialize)]
struct CacheKeyListQuery {
    limit: Option<usize>,
    cursor: Option<String>,
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
    Query(query): Query<CacheKeyListQuery>,
) -> Response {
    let limit = match normalize_key_list_limit(query.limit) {
        Ok(limit) => limit,
        Err(error) => return cache_system_response("cache namespace keys list failed", error),
    };
    let cursor = match normalize_key_list_cursor(query.cursor) {
        Ok(cursor) => cursor,
        Err(error) => return cache_system_response("cache namespace keys list failed", error),
    };
    match state
        .manager
        .list_namespace_keys(&namespace, limit, cursor.as_deref())
        .await
    {
        Ok(keys) => cache_success(keys),
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
    Json(PlusApiResult::success(data)).into_response()
}

fn normalize_key_list_limit(limit: Option<usize>) -> crate::domain::DomainResult<Option<usize>> {
    match limit {
        Some(0) => Err(crate::domain::DomainError::conflict(
            "cache key list limit must be between 1 and 1000",
        )),
        Some(value) if value > 1_000 => Err(crate::domain::DomainError::conflict(
            "cache key list limit must be between 1 and 1000",
        )),
        value => Ok(value),
    }
}

fn normalize_key_list_cursor(
    cursor: Option<String>,
) -> crate::domain::DomainResult<Option<String>> {
    let Some(cursor) = cursor else {
        return Ok(None);
    };
    if cursor.trim().is_empty() {
        return Ok(None);
    }
    if cursor.len() > 2_048 {
        return Err(crate::domain::DomainError::conflict(
            "cache key list cursor must not exceed 2048 characters",
        ));
    }
    Ok(Some(cursor))
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
        Json(PlusApiResult::error(code, format!("{context}: {error}"))),
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
