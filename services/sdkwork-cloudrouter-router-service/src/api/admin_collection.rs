//! Admin AI capability collection surface (`/backend/v3/api/ai/collections*`).
//!
//! A collection groups AI capabilities for one workspace. It is either a
//! `mixed` set (skills, MCP servers, agents, and plugins together) or a
//! single-kind set. This module is the HTTP boundary: it validates the wire
//! contract, maps it onto [`AdminCollectionStore`] commands, and renders the
//! standard SDKWork envelope.
//!
//! Wire contract (`API_SPEC.md` §14/§15):
//! - lists answer `data.items` + `data.pageInfo`;
//! - every `int64` field crosses the wire as a decimal string;
//! - failures use `application/problem+json` through the shared response mapper.

use std::collections::HashSet;
use std::sync::Arc;

use axum::extract::rejection::QueryRejection;
use axum::extract::{Path, Query, State};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, patch, post, put};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;
use crate::api::command_error::system_error_response;
use crate::api::response::{
    json_created_response, json_success_list_response, json_success_response, no_content_response,
    normalize_list_search_query, offset_page_info, parse_offset_list_query, problem_from_wire_code,
    success_envelope, validation_problem, ApiResponseError,
};
use crate::domain::{DomainError, DomainResult};
use crate::ports::{
    AdminCollectionCategoryItem, AdminCollectionCategoryListPage, AdminCollectionItemInput,
    AdminCollectionItemRecord, AdminCollectionRecord, AdminCollectionReleaseListPage,
    AdminCollectionReleaseRecord, AdminCollectionStore, AdminCollectionSubject,
    CreateAdminCollectionCategoryCommand, CreateAdminCollectionCommand,
    DeleteAdminCollectionCategoryCommand, DeleteAdminCollectionCommand,
    ListAdminCollectionCategoriesQuery, ListAdminCollectionReleasesQuery,
    ListAdminCollectionsQuery, ReplaceAdminCollectionItemsCommand,
    UpdateAdminCollectionCategoryCommand, UpdateAdminCollectionCommand,
    UpdateAdminCollectionStatusCommand,
};

const MAX_LIST_PAGE_SIZE: i64 = 200;
const MAX_ITEMS: usize = 200;
const MAX_NAME_LEN: usize = 255;
const MAX_SUMMARY_LEN: usize = 1024;
const MAX_DESCRIPTION_LEN: usize = 8000;
const MAX_ICON_REF_LEN: usize = 512;
const MAX_KEY_LEN: usize = 191;
const MAX_CODE_LEN: usize = 128;
const MAX_VERSION_LEN: usize = 64;
const MAX_NOTES_LEN: usize = 1024;
const MAX_TAGS: usize = 20;
const MAX_TAG_LEN: usize = 64;
const MAX_ITEM_CONFIG_BYTES: usize = 16 * 1024;
const VALID_COLLECTION_KINDS: &[&str] = &["mixed", "skill", "mcp", "agent", "plugin"];
const VALID_CAPABILITY_TYPES: &[&str] = &["skill", "mcp", "agent", "plugin"];
const VALID_VISIBILITIES: &[&str] = &["private", "organization", "public"];
const VALID_PUBLISH_STATUSES: &[&str] = &["draft", "published", "archived"];
const VALID_STATUSES: &[&str] = &["enabled", "disabled"];

#[derive(Clone)]
struct AdminCollectionState {
    store: Arc<dyn AdminCollectionStore + Send + Sync>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
struct AdminCollectionCategoryListQuery {
    page: Option<i64>,
    page_size: Option<i64>,
    q: Option<String>,
    collection_kind: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AdminCollectionCategoryCreateRequest {
    collection_kind: String,
    category_code: String,
    name: String,
    description: Option<String>,
    icon_ref: Option<String>,
    /// `null` keeps the category at the root; a string id selects a parent.
    #[serde(default, deserialize_with = "deserialize_nullable_id")]
    parent_id: Option<Option<String>>,
    sort_order: Option<i32>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AdminCollectionCategoryUpdateRequest {
    name: Option<String>,
    description: Option<String>,
    icon_ref: Option<String>,
    /// Absent leaves the parent unchanged; `null` moves the category to the root.
    #[serde(default, deserialize_with = "deserialize_nullable_id")]
    parent_id: Option<Option<String>>,
    sort_order: Option<i32>,
    status: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
struct AdminCollectionListQuery {
    page: Option<i64>,
    page_size: Option<i64>,
    q: Option<String>,
    collection_kind: Option<String>,
    category_id: Option<String>,
    publish_status: Option<String>,
    status: Option<String>,
    featured: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AdminCollectionCreateRequest {
    collection_key: Option<String>,
    name: String,
    summary: Option<String>,
    description: Option<String>,
    icon_ref: Option<String>,
    collection_kind: String,
    #[serde(default, deserialize_with = "deserialize_nullable_id")]
    category_id: Option<Option<String>>,
    visibility: Option<String>,
    tags: Option<Vec<String>>,
    featured: Option<bool>,
    sort_order: Option<i32>,
    items: Option<Vec<AdminCollectionItemRequest>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AdminCollectionUpdateRequest {
    name: Option<String>,
    summary: Option<String>,
    description: Option<String>,
    icon_ref: Option<String>,
    /// Absent leaves the category unchanged; `null` unfiles the collection.
    #[serde(default, deserialize_with = "deserialize_nullable_id")]
    category_id: Option<Option<String>>,
    visibility: Option<String>,
    tags: Option<Vec<String>>,
    featured: Option<bool>,
    sort_order: Option<i32>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AdminCollectionItemRequest {
    capability_type: String,
    capability_key: String,
    capability_name: Option<String>,
    capability_version: Option<String>,
    capability_icon_ref: Option<String>,
    config: Option<serde_json::Value>,
    enabled: Option<bool>,
    sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AdminCollectionItemsReplaceRequest {
    items: Vec<AdminCollectionItemRequest>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AdminCollectionStatusUpdateRequest {
    publish_status: String,
    notes: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
struct AdminCollectionReleaseListQuery {
    page: Option<i64>,
    page_size: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminCollectionCategoryResponse {
    id: String,
    category_code: String,
    name: String,
    description: String,
    icon_ref: String,
    collection_kind: String,
    parent_id: Option<String>,
    sort_order: i32,
    status: String,
    is_system: bool,
    collection_count: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminCollectionCapabilityCountsResponse {
    skill: String,
    mcp: String,
    agent: String,
    plugin: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminCollectionItemResponse {
    id: String,
    collection_id: String,
    capability_type: String,
    capability_key: String,
    capability_name: String,
    capability_version: String,
    capability_icon_ref: String,
    config: serde_json::Value,
    sort_order: i32,
    enabled: bool,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminCollectionResponse {
    id: String,
    collection_key: String,
    name: String,
    summary: String,
    description: String,
    icon_ref: String,
    collection_kind: String,
    category_id: Option<String>,
    category_name: Option<String>,
    visibility: String,
    publish_status: String,
    published_at: Option<String>,
    item_count: String,
    capability_counts: AdminCollectionCapabilityCountsResponse,
    tags: Vec<String>,
    featured: bool,
    sort_order: i32,
    owner_user_id: String,
    created_by: String,
    updated_by: String,
    status: String,
    latest_release_no: Option<i32>,
    items: Vec<AdminCollectionItemResponse>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminCollectionItemEnvelope<T> {
    item: T,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminCollectionReleaseResponse {
    id: String,
    release_no: i32,
    name: String,
    item_count: String,
    release_status: String,
    notes: String,
    published_by: String,
    published_at: String,
    created_at: String,
}

/// Mounts the AI capability collection surface.
pub fn admin_collection_router_with_store(
    store: Arc<dyn AdminCollectionStore + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/ai/collection_categories",
            get(list_collection_categories).post(create_collection_category),
        )
        .route(
            "/backend/v3/api/ai/collection_categories/defaults",
            post(initialize_collection_categories),
        )
        .route(
            "/backend/v3/api/ai/collection_categories/{category_id}",
            patch(update_collection_category).delete(delete_collection_category),
        )
        .route(
            "/backend/v3/api/ai/collections",
            get(list_collections).post(create_collection),
        )
        .route(
            "/backend/v3/api/ai/collections/{collection_id}",
            get(get_collection)
                .patch(update_collection)
                .delete(delete_collection),
        )
        .route(
            "/backend/v3/api/ai/collections/{collection_id}/items",
            put(replace_collection_items),
        )
        .route(
            "/backend/v3/api/ai/collections/{collection_id}/status",
            put(update_collection_status),
        )
        .route(
            "/backend/v3/api/ai/collections/{collection_id}/releases",
            get(list_collection_releases),
        )
        .with_state(AdminCollectionState { store })
}

async fn list_collection_categories(
    State(state): State<AdminCollectionState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    query: Result<Query<AdminCollectionCategoryListQuery>, QueryRejection>,
) -> Response {
    let Ok(Query(request)) = query else {
        return bad_request("query parameters are invalid");
    };
    let pagination = match parse_pagination(request.page, request.page_size) {
        Ok(pagination) => pagination,
        Err(error) => return error.into_response(),
    };
    let search = match normalize_list_search_query(request.q, "q") {
        Ok(search) => search,
        Err(message) => return bad_request(message),
    };
    let collection_kind = match optional_enum(
        request.collection_kind,
        "collectionKind",
        VALID_COLLECTION_KINDS,
    ) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    let status = match optional_enum(request.status, "status", VALID_STATUSES) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    let result = state
        .store
        .list_categories(ListAdminCollectionCategoriesQuery {
            subject: scoped.into(),
            page_no: pagination.page_no,
            page_size: pagination.page_size,
            offset: pagination.offset,
            search,
            collection_kind,
            status,
        })
        .await;
    render_category_page(result)
}

async fn initialize_collection_categories(
    State(state): State<AdminCollectionState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
) -> Response {
    let result = state.store.initialize_categories(scoped.into()).await;
    render_category_page(result)
}

async fn create_collection_category(
    State(state): State<AdminCollectionState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Json(request): Json<AdminCollectionCategoryCreateRequest>,
) -> Response {
    let command = match build_create_category(scoped.into(), request) {
        Ok(command) => command,
        Err(error) => return error.into_response(),
    };
    match state.store.create_category(command).await {
        Ok(item) => json_created_response(
            None,
            AdminCollectionItemEnvelope {
                item: AdminCollectionCategoryResponse::from(item),
            },
        ),
        Err(error) => collection_error("collection category create failed", error),
    }
}

async fn update_collection_category(
    State(state): State<AdminCollectionState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(category_id): Path<String>,
    Json(request): Json<AdminCollectionCategoryUpdateRequest>,
) -> Response {
    let command = match build_update_category(scoped.into(), category_id, request) {
        Ok(command) => command,
        Err(error) => return error.into_response(),
    };
    match state.store.update_category(command).await {
        Ok(item) => Json(success_envelope(AdminCollectionItemEnvelope {
            item: AdminCollectionCategoryResponse::from(item),
        }))
        .into_response(),
        Err(error) => collection_error("collection category update failed", error),
    }
}

async fn delete_collection_category(
    State(state): State<AdminCollectionState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(category_id): Path<String>,
) -> Response {
    let category_id = match required_identifier(category_id, "categoryId") {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match state
        .store
        .delete_category(DeleteAdminCollectionCategoryCommand {
            subject: scoped.into(),
            category_id,
        })
        .await
    {
        Ok(outcome) if outcome.deleted => no_content_response(None),
        Ok(_) => {
            problem_from_wire_code("4040", "collection category was not found").into_response()
        }
        Err(error) => collection_error("collection category delete failed", error),
    }
}

async fn list_collections(
    State(state): State<AdminCollectionState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    query: Result<Query<AdminCollectionListQuery>, QueryRejection>,
) -> Response {
    let Ok(Query(request)) = query else {
        return bad_request("query parameters are invalid");
    };
    let pagination = match parse_pagination(request.page, request.page_size) {
        Ok(pagination) => pagination,
        Err(error) => return error.into_response(),
    };
    let search = match normalize_list_search_query(request.q, "q") {
        Ok(search) => search,
        Err(message) => return bad_request(message),
    };
    let collection_kind = match optional_enum(
        request.collection_kind,
        "collectionKind",
        VALID_COLLECTION_KINDS,
    ) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    let category_id = match optional_id(request.category_id, "categoryId") {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    let publish_status = match optional_enum(
        request.publish_status,
        "publishStatus",
        VALID_PUBLISH_STATUSES,
    ) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    let status = match optional_enum(request.status, "status", VALID_STATUSES) {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    let result = state
        .store
        .list_collections(ListAdminCollectionsQuery {
            subject: scoped.into(),
            page_no: pagination.page_no,
            page_size: pagination.page_size,
            offset: pagination.offset,
            search,
            collection_kind,
            category_id,
            publish_status,
            status,
            featured: request.featured,
        })
        .await;
    match result {
        Ok(page) => json_success_list_response(
            None,
            page.items
                .into_iter()
                .map(AdminCollectionResponse::from)
                .collect(),
            offset_page_info(page.page_no, page.page_size, page.total),
        ),
        Err(error) => collection_error("collection list is unavailable", error),
    }
}

async fn get_collection(
    State(state): State<AdminCollectionState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(collection_id): Path<String>,
) -> Response {
    let collection_id = match required_identifier(collection_id, "collectionId") {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match state
        .store
        .get_collection(scoped.into(), collection_id)
        .await
    {
        Ok(item) => json_success_response(
            None,
            AdminCollectionItemEnvelope {
                item: AdminCollectionResponse::from(item),
            },
        ),
        Err(error) => collection_error("collection is unavailable", error),
    }
}

async fn create_collection(
    State(state): State<AdminCollectionState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Json(request): Json<AdminCollectionCreateRequest>,
) -> Response {
    let command = match build_create_collection(scoped.into(), request) {
        Ok(command) => command,
        Err(error) => return error.into_response(),
    };
    match state.store.create_collection(command).await {
        Ok(item) => json_created_response(
            None,
            AdminCollectionItemEnvelope {
                item: AdminCollectionResponse::from(item),
            },
        ),
        Err(error) => collection_error("collection create failed", error),
    }
}

async fn update_collection(
    State(state): State<AdminCollectionState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(collection_id): Path<String>,
    Json(request): Json<AdminCollectionUpdateRequest>,
) -> Response {
    let command = match build_update_collection(scoped.into(), collection_id, request) {
        Ok(command) => command,
        Err(error) => return error.into_response(),
    };
    match state.store.update_collection(command).await {
        Ok(item) => Json(success_envelope(AdminCollectionItemEnvelope {
            item: AdminCollectionResponse::from(item),
        }))
        .into_response(),
        Err(error) => collection_error("collection update failed", error),
    }
}

async fn delete_collection(
    State(state): State<AdminCollectionState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(collection_id): Path<String>,
) -> Response {
    let collection_id = match required_identifier(collection_id, "collectionId") {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    match state
        .store
        .delete_collection(DeleteAdminCollectionCommand {
            subject: scoped.into(),
            collection_id,
        })
        .await
    {
        Ok(outcome) if outcome.deleted => no_content_response(None),
        Ok(_) => problem_from_wire_code("4040", "collection was not found").into_response(),
        Err(error) => collection_error("collection delete failed", error),
    }
}

async fn replace_collection_items(
    State(state): State<AdminCollectionState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(collection_id): Path<String>,
    Json(request): Json<AdminCollectionItemsReplaceRequest>,
) -> Response {
    let collection_id = match required_identifier(collection_id, "collectionId") {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    let items = match build_items(request.items) {
        Ok(items) => items,
        Err(error) => return error.into_response(),
    };
    match state
        .store
        .replace_collection_items(ReplaceAdminCollectionItemsCommand {
            subject: scoped.into(),
            collection_id,
            items,
        })
        .await
    {
        Ok(item) => Json(success_envelope(AdminCollectionItemEnvelope {
            item: AdminCollectionResponse::from(item),
        }))
        .into_response(),
        Err(error) => collection_error("collection items update failed", error),
    }
}

async fn update_collection_status(
    State(state): State<AdminCollectionState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(collection_id): Path<String>,
    Json(request): Json<AdminCollectionStatusUpdateRequest>,
) -> Response {
    let collection_id = match required_identifier(collection_id, "collectionId") {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    let publish_status = match optional_enum(
        Some(request.publish_status),
        "publishStatus",
        &["published", "archived"],
    ) {
        Ok(Some(value)) => value,
        Ok(None) => return bad_request("publishStatus is required"),
        Err(error) => return error.into_response(),
    };
    let notes = match optional_text(request.notes, "notes", MAX_NOTES_LEN) {
        Ok(value) => value.unwrap_or_default(),
        Err(error) => return error.into_response(),
    };
    match state
        .store
        .update_collection_status(UpdateAdminCollectionStatusCommand {
            subject: scoped.into(),
            collection_id,
            publish_status,
            notes,
        })
        .await
    {
        Ok(item) => Json(success_envelope(AdminCollectionItemEnvelope {
            item: AdminCollectionResponse::from(item),
        }))
        .into_response(),
        Err(error) => collection_error("collection status update failed", error),
    }
}

async fn list_collection_releases(
    State(state): State<AdminCollectionState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(collection_id): Path<String>,
    query: Result<Query<AdminCollectionReleaseListQuery>, QueryRejection>,
) -> Response {
    let Ok(Query(request)) = query else {
        return bad_request("query parameters are invalid");
    };
    let collection_id = match required_identifier(collection_id, "collectionId") {
        Ok(value) => value,
        Err(error) => return error.into_response(),
    };
    let pagination = match parse_pagination(request.page, request.page_size) {
        Ok(pagination) => pagination,
        Err(error) => return error.into_response(),
    };
    let result = state
        .store
        .list_collection_releases(ListAdminCollectionReleasesQuery {
            subject: scoped.into(),
            collection_id,
            page_no: pagination.page_no,
            page_size: pagination.page_size,
            offset: pagination.offset,
        })
        .await;
    match result {
        Ok(page) => render_release_page(page),
        Err(error) => collection_error("collection releases are unavailable", error),
    }
}
// ---------------------------------------------------------------------------
// Command building
// ---------------------------------------------------------------------------

fn build_create_category(
    subject: AdminCollectionSubject,
    request: AdminCollectionCategoryCreateRequest,
) -> Result<CreateAdminCollectionCategoryCommand, ApiResponseError> {
    Ok(CreateAdminCollectionCategoryCommand {
        subject,
        collection_kind: required_enum(
            request.collection_kind,
            "collectionKind",
            VALID_COLLECTION_KINDS,
        )?,
        category_code: required_category_code(request.category_code, "categoryCode", MAX_CODE_LEN)?,
        name: required_text(request.name, "name", MAX_NAME_LEN)?,
        description: optional_text(request.description, "description", 4000)?.unwrap_or_default(),
        icon_ref: optional_text(request.icon_ref, "iconRef", MAX_ICON_REF_LEN)?.unwrap_or_default(),
        parent_id: validate_nullable_id(request.parent_id, "parentId")?.flatten(),
        sort_order: optional_sort_order(request.sort_order)?,
        status: optional_enum(request.status, "status", VALID_STATUSES)?
            .unwrap_or_else(|| "enabled".to_owned()),
    })
}

fn build_update_category(
    subject: AdminCollectionSubject,
    category_id: String,
    request: AdminCollectionCategoryUpdateRequest,
) -> Result<UpdateAdminCollectionCategoryCommand, ApiResponseError> {
    let category_id = required_identifier(category_id, "categoryId")?;
    let parent_id = validate_nullable_id(request.parent_id, "parentId")?;
    let status = optional_enum(request.status, "status", VALID_STATUSES)?;
    let command = UpdateAdminCollectionCategoryCommand {
        subject,
        category_id,
        name: optional_text(request.name, "name", MAX_NAME_LEN)?,
        description: optional_text(request.description, "description", 4000)?,
        icon_ref: optional_text(request.icon_ref, "iconRef", MAX_ICON_REF_LEN)?,
        parent_id,
        sort_order: request.sort_order.map(required_sort_order).transpose()?,
        status,
    };
    if command.name.is_none()
        && command.description.is_none()
        && command.icon_ref.is_none()
        && command.parent_id.is_none()
        && command.sort_order.is_none()
        && command.status.is_none()
    {
        return Err(bad_request("collection category update fields are required").into());
    }
    Ok(command)
}

fn build_create_collection(
    subject: AdminCollectionSubject,
    request: AdminCollectionCreateRequest,
) -> Result<CreateAdminCollectionCommand, ApiResponseError> {
    let collection_kind = required_enum(
        request.collection_kind,
        "collectionKind",
        VALID_COLLECTION_KINDS,
    )?;
    let items = match request.items {
        Some(items) => build_items(items)?,
        None => Vec::new(),
    };
    ensure_items_match_kind(&collection_kind, &items)?;
    Ok(CreateAdminCollectionCommand {
        subject,
        collection_key: match request.collection_key {
            Some(value) => Some(required_code(value, "collectionKey", MAX_CODE_LEN)?),
            None => None,
        },
        name: required_text(request.name, "name", MAX_NAME_LEN)?,
        summary: optional_text(request.summary, "summary", MAX_SUMMARY_LEN)?.unwrap_or_default(),
        description: optional_text(request.description, "description", MAX_DESCRIPTION_LEN)?
            .unwrap_or_default(),
        icon_ref: optional_text(request.icon_ref, "iconRef", MAX_ICON_REF_LEN)?.unwrap_or_default(),
        collection_kind,
        category_id: validate_nullable_id(request.category_id, "categoryId")?.flatten(),
        visibility: optional_enum(request.visibility, "visibility", VALID_VISIBILITIES)?
            .unwrap_or_else(|| "organization".to_owned()),
        tags: optional_tags(request.tags)?,
        featured: request.featured.unwrap_or(false),
        sort_order: optional_sort_order(request.sort_order)?,
        items,
    })
}

fn build_update_collection(
    subject: AdminCollectionSubject,
    collection_id: String,
    request: AdminCollectionUpdateRequest,
) -> Result<UpdateAdminCollectionCommand, ApiResponseError> {
    let collection_id = required_identifier(collection_id, "collectionId")?;
    let command = UpdateAdminCollectionCommand {
        subject,
        collection_id,
        name: optional_text(request.name, "name", MAX_NAME_LEN)?,
        summary: optional_text(request.summary, "summary", MAX_SUMMARY_LEN)?,
        description: optional_text(request.description, "description", MAX_DESCRIPTION_LEN)?,
        icon_ref: optional_text(request.icon_ref, "iconRef", MAX_ICON_REF_LEN)?,
        category_id: validate_nullable_id(request.category_id, "categoryId")?,
        visibility: optional_enum(request.visibility, "visibility", VALID_VISIBILITIES)?,
        tags: match request.tags {
            Some(tags) => Some(validate_tags(tags)?),
            None => None,
        },
        featured: request.featured,
        sort_order: request.sort_order.map(required_sort_order).transpose()?,
        status: optional_enum(request.status, "status", VALID_STATUSES)?,
    };
    if command.name.is_none()
        && command.summary.is_none()
        && command.description.is_none()
        && command.icon_ref.is_none()
        && command.category_id.is_none()
        && command.visibility.is_none()
        && command.tags.is_none()
        && command.featured.is_none()
        && command.sort_order.is_none()
        && command.status.is_none()
    {
        return Err(bad_request("collection update fields are required").into());
    }
    Ok(command)
}

fn build_items(
    items: Vec<AdminCollectionItemRequest>,
) -> Result<Vec<AdminCollectionItemInput>, ApiResponseError> {
    if items.len() > MAX_ITEMS {
        return Err(bad_request(format!("items must contain at most {MAX_ITEMS} entries")).into());
    }
    let mut normalized: Vec<AdminCollectionItemInput> = Vec::with_capacity(items.len());
    for (index, item) in items.into_iter().enumerate() {
        let capability_type = required_enum(
            item.capability_type,
            "capabilityType",
            VALID_CAPABILITY_TYPES,
        )?;
        let capability_key = required_text(item.capability_key, "capabilityKey", MAX_KEY_LEN)?;
        if normalized.iter().any(|existing| {
            existing.capability_type == capability_type && existing.capability_key == capability_key
        }) {
            return Err(bad_request(format!(
                "items[{index}] duplicates capability {capability_type}:{capability_key}"
            ))
            .into());
        }
        let config = match item.config {
            None | Some(serde_json::Value::Null) => serde_json::json!({}),
            Some(value) if value.is_object() => value,
            Some(_) => {
                return Err(
                    bad_request(format!("items[{index}].config must be a JSON object")).into(),
                )
            }
        };
        if config.to_string().len() > MAX_ITEM_CONFIG_BYTES {
            return Err(bad_request(format!(
                "items[{index}].config must be at most {MAX_ITEM_CONFIG_BYTES} bytes"
            ))
            .into());
        }
        normalized.push(AdminCollectionItemInput {
            capability_type,
            capability_key,
            capability_name: optional_text(item.capability_name, "capabilityName", MAX_NAME_LEN)?
                .unwrap_or_default(),
            capability_version: optional_text(
                item.capability_version,
                "capabilityVersion",
                MAX_VERSION_LEN,
            )?
            .unwrap_or_default(),
            capability_icon_ref: optional_text(
                item.capability_icon_ref,
                "capabilityIconRef",
                MAX_ICON_REF_LEN,
            )?
            .unwrap_or_default(),
            config,
            enabled: item.enabled.unwrap_or(true),
            sort_order: match item.sort_order {
                Some(value) => required_sort_order(value)?,
                None => i32::try_from(index).unwrap_or(i32::MAX),
            },
        });
    }
    Ok(normalized)
}

fn ensure_items_match_kind(
    collection_kind: &str,
    items: &[AdminCollectionItemInput],
) -> Result<(), ApiResponseError> {
    if collection_kind == "mixed" {
        return Ok(());
    }
    if items
        .iter()
        .any(|item| item.capability_type != collection_kind)
    {
        return Err(bad_request(format!(
            "a {collection_kind} collection can only contain {collection_kind} capabilities"
        ))
        .into());
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

fn render_category_page(result: DomainResult<AdminCollectionCategoryListPage>) -> Response {
    match result {
        Ok(page) => json_success_list_response(
            None,
            page.items
                .into_iter()
                .map(AdminCollectionCategoryResponse::from)
                .collect(),
            offset_page_info(page.page_no, page.page_size, page.total),
        ),
        Err(error) => collection_error("collection categories are unavailable", error),
    }
}

fn render_release_page(page: AdminCollectionReleaseListPage) -> Response {
    json_success_list_response(
        None,
        page.items
            .into_iter()
            .map(AdminCollectionReleaseResponse::from)
            .collect(),
        offset_page_info(page.page_no, page.page_size, page.total),
    )
}

impl From<AdminCollectionCategoryItem> for AdminCollectionCategoryResponse {
    fn from(item: AdminCollectionCategoryItem) -> Self {
        Self {
            id: item.id,
            category_code: item.category_code,
            name: item.name,
            description: item.description,
            icon_ref: item.icon_ref,
            collection_kind: item.collection_kind,
            parent_id: item.parent_id,
            sort_order: item.sort_order,
            status: item.status,
            is_system: item.is_system,
            collection_count: item.collection_count,
            created_at: item.created_at,
            updated_at: item.updated_at,
        }
    }
}

impl From<AdminCollectionItemRecord> for AdminCollectionItemResponse {
    fn from(item: AdminCollectionItemRecord) -> Self {
        Self {
            id: item.id,
            collection_id: item.collection_id,
            capability_type: item.capability_type,
            capability_key: item.capability_key,
            capability_name: item.capability_name,
            capability_version: item.capability_version,
            capability_icon_ref: item.capability_icon_ref,
            config: item.config,
            sort_order: item.sort_order,
            enabled: item.enabled,
            created_at: item.created_at,
            updated_at: item.updated_at,
        }
    }
}

impl From<AdminCollectionRecord> for AdminCollectionResponse {
    fn from(item: AdminCollectionRecord) -> Self {
        Self {
            id: item.id,
            collection_key: item.collection_key,
            name: item.name,
            summary: item.summary,
            description: item.description,
            icon_ref: item.icon_ref,
            collection_kind: item.collection_kind,
            category_id: item.category_id,
            category_name: item.category_name,
            visibility: item.visibility,
            publish_status: item.publish_status,
            published_at: item.published_at,
            item_count: item.item_count,
            capability_counts: AdminCollectionCapabilityCountsResponse {
                skill: item.capability_counts.skill,
                mcp: item.capability_counts.mcp,
                agent: item.capability_counts.agent,
                plugin: item.capability_counts.plugin,
            },
            tags: item.tags,
            featured: item.featured,
            sort_order: item.sort_order,
            owner_user_id: item.owner_user_id,
            created_by: item.created_by,
            updated_by: item.updated_by,
            status: item.status,
            latest_release_no: item.latest_release_no,
            items: item
                .items
                .into_iter()
                .map(AdminCollectionItemResponse::from)
                .collect(),
            created_at: item.created_at,
            updated_at: item.updated_at,
        }
    }
}

impl From<AdminCollectionReleaseRecord> for AdminCollectionReleaseResponse {
    fn from(item: AdminCollectionReleaseRecord) -> Self {
        Self {
            id: item.id,
            release_no: item.release_no,
            name: item.name,
            item_count: item.item_count,
            release_status: item.release_status,
            notes: item.notes,
            published_by: item.published_by,
            published_at: item.published_at,
            created_at: item.created_at,
        }
    }
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

struct Pagination {
    page_no: i64,
    page_size: i64,
    offset: i64,
}

fn parse_pagination(
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<Pagination, ApiResponseError> {
    if let Some(page_size) = page_size {
        if !(1..=MAX_LIST_PAGE_SIZE).contains(&page_size) {
            return Err(bad_request(format!(
                "page_size must be between 1 and {MAX_LIST_PAGE_SIZE}"
            ))
            .into());
        }
    }
    let pagination = parse_offset_list_query(page, page_size).map_err(bad_request)?;
    Ok(Pagination {
        page_no: pagination.page_no,
        page_size: pagination.page_size.clamp(1, MAX_LIST_PAGE_SIZE),
        offset: pagination.offset,
    })
}

fn required_text(
    value: String,
    field_name: &str,
    max_len: usize,
) -> Result<String, ApiResponseError> {
    let value = value.trim().to_owned();
    if value.is_empty() {
        return Err(bad_request(format!("{field_name} is required")).into());
    }
    if value.chars().count() > max_len || value.chars().any(char::is_control) {
        return Err(bad_request(format!(
            "{field_name} must be visible text and at most {max_len} characters"
        ))
        .into());
    }
    Ok(value)
}

fn optional_text(
    value: Option<String>,
    field_name: &str,
    max_len: usize,
) -> Result<Option<String>, ApiResponseError> {
    value
        .map(|value| {
            let value = value.trim().to_owned();
            if value.chars().count() > max_len || value.chars().any(char::is_control) {
                return Err(bad_request(format!(
                    "{field_name} must be visible text and at most {max_len} characters"
                ))
                .into());
            }
            Ok(value)
        })
        .transpose()
}

fn required_identifier(value: String, field_name: &str) -> Result<String, ApiResponseError> {
    let value = value.trim().to_owned();
    if value.is_empty() || !value.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(bad_request(format!("{field_name} must be an int64 identifier")).into());
    }
    Ok(value)
}

fn required_code(
    value: String,
    field_name: &str,
    max_len: usize,
) -> Result<String, ApiResponseError> {
    required_code_with_dot(value, field_name, max_len, true)
}

/// Category codes are stricter than collection keys: the registry check and
/// the `ai_collection_category.category_code` constraint do not allow `.`.
fn required_category_code(
    value: String,
    field_name: &str,
    max_len: usize,
) -> Result<String, ApiResponseError> {
    required_code_with_dot(value, field_name, max_len, false)
}

fn required_code_with_dot(
    value: String,
    field_name: &str,
    max_len: usize,
    allow_dot: bool,
) -> Result<String, ApiResponseError> {
    let value = value.trim().to_ascii_lowercase();
    let valid = !value.is_empty()
        && value.chars().count() <= max_len
        && value
            .chars()
            .next()
            .is_some_and(|ch| ch.is_ascii_alphanumeric())
        && value.chars().all(|ch| {
            ch.is_ascii_lowercase()
                || ch.is_ascii_digit()
                || matches!(ch, '_' | '-')
                || (allow_dot && ch == '.')
        });
    if !valid {
        let allowed = if allow_dot {
            "lowercase letters, digits, '_', '-', or '.'"
        } else {
            "lowercase letters, digits, '_', or '-'"
        };
        return Err(bad_request(format!(
            "{field_name} must start with a letter or digit and contain only {allowed}"
        ))
        .into());
    }
    Ok(value)
}

fn required_enum(
    value: String,
    field_name: &str,
    allowed: &[&str],
) -> Result<String, ApiResponseError> {
    let value = value.trim().to_owned();
    if !allowed.contains(&value.as_str()) {
        return Err(bad_request(format!(
            "{field_name} must be one of {}",
            allowed.join(", ")
        ))
        .into());
    }
    Ok(value)
}

fn optional_enum(
    value: Option<String>,
    field_name: &str,
    allowed: &[&str],
) -> Result<Option<String>, ApiResponseError> {
    value
        .map(|value| required_enum(value, field_name, allowed))
        .transpose()
}

fn optional_id(
    value: Option<String>,
    field_name: &str,
) -> Result<Option<String>, ApiResponseError> {
    value
        .map(|value| required_identifier(value, field_name))
        .transpose()
}

/// Deserializes a nullable relationship id so an explicit JSON `null`
/// (`Some(None)`) stays distinguishable from an absent field (`None`, supplied
/// by `#[serde(default)]`).
fn deserialize_nullable_id<'de, D>(deserializer: D) -> Result<Option<Option<String>>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    match Option::<serde_json::Value>::deserialize(deserializer)? {
        None | Some(serde_json::Value::Null) => Ok(Some(None)),
        Some(serde_json::Value::String(value)) => Ok(Some(Some(value))),
        Some(_) => Err(serde::de::Error::custom(
            "nullable id must be an int64 identifier string or null",
        )),
    }
}

fn validate_nullable_id(
    value: Option<Option<String>>,
    field_name: &str,
) -> Result<Option<Option<String>>, ApiResponseError> {
    match value {
        None => Ok(None),
        Some(None) => Ok(Some(None)),
        Some(Some(value)) => Ok(Some(Some(required_identifier(value, field_name)?))),
    }
}

fn optional_sort_order(value: Option<i32>) -> Result<i32, ApiResponseError> {
    match value {
        Some(value) => required_sort_order(value),
        None => Ok(0),
    }
}

fn required_sort_order(value: i32) -> Result<i32, ApiResponseError> {
    if value < 0 {
        return Err(bad_request("sortOrder must be a non-negative integer").into());
    }
    Ok(value)
}

fn optional_tags(value: Option<Vec<String>>) -> Result<Vec<String>, ApiResponseError> {
    match value {
        Some(tags) => validate_tags(tags),
        None => Ok(Vec::new()),
    }
}

fn validate_tags(tags: Vec<String>) -> Result<Vec<String>, ApiResponseError> {
    if tags.len() > MAX_TAGS {
        return Err(bad_request(format!("tags must contain at most {MAX_TAGS} entries")).into());
    }
    let mut seen = HashSet::new();
    let mut normalized = Vec::with_capacity(tags.len());
    for tag in tags {
        let tag = required_text(tag, "tags[]", MAX_TAG_LEN)?;
        // A tag list is a set: repeated input collapses to the first occurrence
        // so the API and the admin console agree on the stored value.
        if seen.insert(tag.clone()) {
            normalized.push(tag);
        }
    }
    Ok(normalized)
}

fn bad_request(message: impl Into<String>) -> Response {
    validation_problem(message).into_response()
}

fn collection_error(context: &str, error: DomainError) -> Response {
    if error.is_not_found() {
        problem_from_wire_code("4040", error.to_string()).into_response()
    } else if error.is_conflict() {
        problem_from_wire_code("4090", error.to_string()).into_response()
    } else if error.is_bad_request() {
        validation_problem(error.to_string()).into_response()
    } else {
        system_error_response(context, error)
    }
}

#[cfg(test)]
mod tests {
    use super::{validate_tags, MAX_TAGS};

    #[test]
    fn tags_are_trimmed_and_deduplicated_in_order() {
        let tags = validate_tags(vec![
            " alpha ".to_owned(),
            "alpha".to_owned(),
            "beta".to_owned(),
            " beta ".to_owned(),
        ])
        .expect("valid tags");
        assert_eq!(vec!["alpha".to_owned(), "beta".to_owned()], tags);
    }

    #[test]
    fn tags_reject_more_than_the_limit() {
        let tags = (0..=MAX_TAGS)
            .map(|index| format!("tag-{index}"))
            .collect::<Vec<_>>();
        assert!(validate_tags(tags).is_err());
    }
}
