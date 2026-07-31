use std::sync::Arc;

use axum::extract::rejection::QueryRejection;
use axum::extract::{Path, Query, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, patch, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use crate::api::request_id::{generate_server_request_id, RequestIdError};
use crate::api::response::{
    json_success_list_response, platform_problem, problem_from_wire_code, success_envelope,
};
use crate::domain::DomainError;
use crate::ports::{
    AdminStorageCollection, AdminStorageCursor, AdminStorageJsonRecord, AdminStorageStore,
    CheckStorageProviderHealthCommand, CreateStorageBucketCommand,
    CreateStorageGarbageCollectionJobCommand, CreateStorageProviderCommand,
    CreateStorageQuotaPolicyCommand, CreateStorageReconciliationRunCommand,
    ListAdminStorageRecordsQuery, SetStorageDefaultBucketCommand, UpdateStorageBucketCommand,
    UpdateStorageProviderCommand,
};
use sdkwork_utils_rust::http_api::cursor_window_page_info;
use sdkwork_utils_rust::{base64url_decode, base64url_encode, SdkWorkResultCode};

const DEFAULT_LIMIT: i64 = 20;
const MAX_LIMIT: i64 = 200;
const MAX_ID_LEN: usize = 128;
const MAX_CODE_LEN: usize = 96;
const MAX_TYPE_LEN: usize = 64;
const MAX_URL_LEN: usize = 512;
const MAX_CREDENTIAL_REF_LEN: usize = 256;
const MAX_REASON_LEN: usize = 512;
const MAX_REQUEST_ID_LEN: usize = 128;
const MAX_CURSOR_LEN: usize = 256;
const IDEMPOTENCY_KEY_HEADER: &str = "Idempotency-Key";

const PROVIDER_TYPES: &[&str] = &[
    "aws_s3",
    "cloudflare_r2",
    "cos_s3",
    "local_dev_s3",
    "minio",
    "oss_s3",
    "s3_compatible",
];
const LOGICAL_SCOPES: &[&str] = &[
    "migration_import",
    "system_archive",
    "system_quarantine",
    "system_temp",
    "system_variant",
    "tenant_private",
    "tenant_public_asset",
];
const QUOTA_SCOPE_TYPES: &[&str] = &["app", "organization", "space", "tenant", "user"];
const USAGE_SCOPE_TYPES: &[&str] = &[
    "app",
    "business_domain",
    "organization",
    "space",
    "tenant",
    "user",
];
const RESOURCE_STATUSES: &[&str] = &["active", "archived", "disabled"];
const JOB_STATUSES: &[&str] = &["canceled", "completed", "created", "failed", "running"];
const STORAGE_CLASSES: &[&str] = &[
    "STANDARD",
    "INTELLIGENT_TIERING",
    "STANDARD_IA",
    "ONEZONE_IA",
    "GLACIER_IR",
    "GLACIER",
    "DEEP_ARCHIVE",
];
const ENCRYPTION_MODES: &[&str] = &["none", "sse_kms", "sse_s3"];

#[derive(Clone)]
struct AdminStorageState {
    store: Arc<dyn AdminStorageStore + Send + Sync>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct AdminStorageQuery {
    cursor: Option<String>,
    page_size: Option<i64>,
    status: Option<String>,
    logical_scope: Option<String>,
    scope_type: Option<String>,
    scope_id: Option<String>,
    run_type: Option<String>,
}

type AdminStorageQueryResult = Result<Query<AdminStorageQuery>, QueryRejection>;

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct AdminStorageCursorPayload {
    id: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CreateStorageProviderRequest {
    provider_code: String,
    provider_type: String,
    endpoint_url: Option<String>,
    region: Option<String>,
    credential_ref: String,
    path_style_enabled: Option<bool>,
    supports_multipart: Option<bool>,
    supports_lifecycle: Option<bool>,
    supports_object_lock: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct UpdateStorageStatusRequest {
    status: String,
    reason: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CreateStorageBucketRequest {
    bucket_name: String,
    provider_id: String,
    logical_scope: String,
    bucket_region: Option<String>,
    data_residency_region: Option<String>,
    object_key_prefix: Option<String>,
    default_storage_class: Option<String>,
    default_encryption_mode: Option<String>,
    kms_key_ref: Option<String>,
    versioning_enabled: Option<bool>,
    object_lock_enabled: Option<bool>,
    lifecycle_enabled: Option<bool>,
    public_access_blocked: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SetStorageDefaultBucketRequest {
    bucket_id: String,
    reason: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CreateStorageQuotaPolicyRequest {
    scope_type: String,
    scope_id: String,
    quota_limit_bytes: Option<i64>,
    quota_limit: Option<String>,
    single_file_limit_bytes: Option<i64>,
    enforcement: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CreateStorageReconciliationRunRequest {
    provider_id: Option<String>,
    bucket_id: Option<String>,
    run_type: Option<String>,
    check_mode: Option<String>,
    dry_run: Option<bool>,
    reason: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CreateStorageGarbageCollectionJobRequest {
    job_type: Option<String>,
    target: Option<String>,
    dry_run: Option<bool>,
    retention_window: Option<String>,
    dry_run_sample: Option<String>,
    criteria: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageProviderMutationResponse {
    provider: AdminStorageJsonRecord,
    request_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageBucketMutationResponse {
    bucket: AdminStorageJsonRecord,
    request_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageDefaultBucketMutationResponse {
    default_bucket: AdminStorageJsonRecord,
    request_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageQuotaPolicyMutationResponse {
    quota_policy: AdminStorageJsonRecord,
    request_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageReconciliationRunMutationResponse {
    reconciliation_run: AdminStorageJsonRecord,
    request_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageGarbageCollectionJobMutationResponse {
    job: AdminStorageJsonRecord,
    request_id: String,
}

pub fn admin_storage_router_with_store(store: Arc<dyn AdminStorageStore + Send + Sync>) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/storage/providers",
            get(list_providers).post(create_provider),
        )
        .route(
            "/backend/v3/api/storage/providers/{provider_id}",
            patch(update_provider),
        )
        .route(
            "/backend/v3/api/storage/providers/{provider_id}/health_check",
            post(check_provider_health),
        )
        .route(
            "/backend/v3/api/storage/buckets",
            get(list_buckets).post(create_bucket),
        )
        .route(
            "/backend/v3/api/storage/buckets/{bucket_id}",
            patch(update_bucket),
        )
        .route(
            "/backend/v3/api/storage/default_buckets",
            get(list_default_buckets),
        )
        .route(
            "/backend/v3/api/storage/default_buckets/{logical_scope}",
            patch(set_default_bucket),
        )
        .route(
            "/backend/v3/api/storage/quotas",
            get(list_quota_policies).post(create_quota_policy),
        )
        .route("/backend/v3/api/storage/usage", get(list_usage_counters))
        .route(
            "/backend/v3/api/storage/usage/ledger",
            get(list_usage_ledger),
        )
        .route(
            "/backend/v3/api/storage/usage/snapshots",
            get(list_usage_snapshots),
        )
        .route(
            "/backend/v3/api/storage/reconciliation_runs",
            get(list_reconciliation_runs).post(create_reconciliation_run),
        )
        .route(
            "/backend/v3/api/storage/gc_jobs",
            get(list_gc_jobs).post(create_gc_job),
        )
        .with_state(AdminStorageState { store })
}

async fn list_providers(
    State(state): State<AdminStorageState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    query: AdminStorageQueryResult,
) -> Response {
    list_response(
        scoped,
        query,
        |query| state.store.list_providers(query),
        None,
    )
    .await
}

async fn create_provider(
    State(state): State<AdminStorageState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Json(request): Json<CreateStorageProviderRequest>,
) -> Response {
    let command = match validated_provider_create_command(scoped, &headers, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    let request_id = response_request_id(command.request_id.as_deref());
    match state.store.create_provider(command).await {
        Ok(provider) => Json(success_envelope(StorageProviderMutationResponse {
            provider,
            request_id,
        }))
        .into_response(),
        Err(error) => storage_error_response("storage provider create is unavailable", error),
    }
}

async fn update_provider(
    State(state): State<AdminStorageState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(provider_id): Path<String>,
    Json(request): Json<UpdateStorageStatusRequest>,
) -> Response {
    let command = match validated_provider_update_command(scoped, &headers, provider_id, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    let request_id = response_request_id(command.request_id.as_deref());
    match state.store.update_provider(command).await {
        Ok(provider) => Json(success_envelope(StorageProviderMutationResponse {
            provider,
            request_id,
        }))
        .into_response(),
        Err(error) => storage_error_response("storage provider update is unavailable", error),
    }
}

async fn check_provider_health(
    State(state): State<AdminStorageState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(provider_id): Path<String>,
) -> Response {
    let command = match validated_provider_health_command(scoped, &headers, provider_id) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.check_provider_health(command).await {
        Ok(mut item) => {
            item.entry("requestId".to_owned())
                .or_insert_with(|| serde_json::Value::String(response_request_id(None)));
            Json(success_envelope(item)).into_response()
        }
        Err(error) => storage_error_response("storage provider health check is unavailable", error),
    }
}

async fn list_buckets(
    State(state): State<AdminStorageState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    query: AdminStorageQueryResult,
) -> Response {
    list_response(scoped, query, |query| state.store.list_buckets(query), None).await
}

async fn create_bucket(
    State(state): State<AdminStorageState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Json(request): Json<CreateStorageBucketRequest>,
) -> Response {
    let command = match validated_bucket_create_command(scoped, &headers, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    let request_id = response_request_id(command.request_id.as_deref());
    match state.store.create_bucket(command).await {
        Ok(bucket) => Json(success_envelope(StorageBucketMutationResponse {
            bucket,
            request_id,
        }))
        .into_response(),
        Err(error) => storage_error_response("storage bucket create is unavailable", error),
    }
}

async fn update_bucket(
    State(state): State<AdminStorageState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(bucket_id): Path<String>,
    Json(request): Json<UpdateStorageStatusRequest>,
) -> Response {
    let command = match validated_bucket_update_command(scoped, &headers, bucket_id, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    let request_id = response_request_id(command.request_id.as_deref());
    match state.store.update_bucket(command).await {
        Ok(bucket) => Json(success_envelope(StorageBucketMutationResponse {
            bucket,
            request_id,
        }))
        .into_response(),
        Err(error) => storage_error_response("storage bucket update is unavailable", error),
    }
}

async fn list_default_buckets(
    State(state): State<AdminStorageState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    query: AdminStorageQueryResult,
) -> Response {
    list_response(
        scoped,
        query,
        |query| state.store.list_default_buckets(query),
        None,
    )
    .await
}

async fn set_default_bucket(
    State(state): State<AdminStorageState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(logical_scope): Path<String>,
    Json(request): Json<SetStorageDefaultBucketRequest>,
) -> Response {
    let command = match validated_default_bucket_command(scoped, &headers, logical_scope, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    let request_id = response_request_id(command.request_id.as_deref());
    match state.store.set_default_bucket(command).await {
        Ok(default_bucket) => Json(success_envelope(StorageDefaultBucketMutationResponse {
            default_bucket,
            request_id,
        }))
        .into_response(),
        Err(error) => storage_error_response("storage default bucket update is unavailable", error),
    }
}

async fn list_quota_policies(
    State(state): State<AdminStorageState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    query: AdminStorageQueryResult,
) -> Response {
    list_response(
        scoped,
        query,
        |query| state.store.list_quota_policies(query),
        None,
    )
    .await
}

async fn create_quota_policy(
    State(state): State<AdminStorageState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Json(request): Json<CreateStorageQuotaPolicyRequest>,
) -> Response {
    let command = match validated_quota_create_command(scoped, &headers, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    let request_id = response_request_id(command.request_id.as_deref());
    match state.store.create_quota_policy(command).await {
        Ok(quota_policy) => Json(success_envelope(StorageQuotaPolicyMutationResponse {
            quota_policy,
            request_id,
        }))
        .into_response(),
        Err(error) => storage_error_response("storage quota policy create is unavailable", error),
    }
}

async fn list_usage_counters(
    State(state): State<AdminStorageState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    query: AdminStorageQueryResult,
) -> Response {
    list_response(
        scoped,
        query,
        |query| state.store.list_usage_counters(query),
        Some(USAGE_SCOPE_TYPES),
    )
    .await
}

async fn list_usage_ledger(
    State(state): State<AdminStorageState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    query: AdminStorageQueryResult,
) -> Response {
    list_response(
        scoped,
        query,
        |query| state.store.list_usage_ledger(query),
        Some(USAGE_SCOPE_TYPES),
    )
    .await
}

async fn list_usage_snapshots(
    State(state): State<AdminStorageState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    query: AdminStorageQueryResult,
) -> Response {
    list_response(
        scoped,
        query,
        |query| state.store.list_usage_snapshots(query),
        Some(USAGE_SCOPE_TYPES),
    )
    .await
}

async fn list_reconciliation_runs(
    State(state): State<AdminStorageState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    query: AdminStorageQueryResult,
) -> Response {
    list_response(
        scoped,
        query,
        |query| state.store.list_reconciliation_runs(query),
        Some(USAGE_SCOPE_TYPES),
    )
    .await
}

async fn create_reconciliation_run(
    State(state): State<AdminStorageState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Json(request): Json<CreateStorageReconciliationRunRequest>,
) -> Response {
    let command = match validated_reconciliation_create_command(scoped, &headers, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    let request_id = response_request_id(command.request_id.as_deref());
    match state.store.create_reconciliation_run(command).await {
        Ok(reconciliation_run) => {
            Json(success_envelope(StorageReconciliationRunMutationResponse {
                reconciliation_run,
                request_id,
            }))
            .into_response()
        }
        Err(error) => storage_error_response("storage reconciliation create is unavailable", error),
    }
}

async fn list_gc_jobs(
    State(state): State<AdminStorageState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    query: AdminStorageQueryResult,
) -> Response {
    list_response(scoped, query, |query| state.store.list_gc_jobs(query), None).await
}

async fn create_gc_job(
    State(state): State<AdminStorageState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Json(request): Json<CreateStorageGarbageCollectionJobRequest>,
) -> Response {
    let command = match validated_gc_create_command(scoped, &headers, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    let request_id = response_request_id(command.request_id.as_deref());
    match state.store.create_gc_job(command).await {
        Ok(job) => Json(success_envelope(
            StorageGarbageCollectionJobMutationResponse { job, request_id },
        ))
        .into_response(),
        Err(error) => {
            storage_error_response("storage garbage collection create is unavailable", error)
        }
    }
}

async fn list_response<'a, F>(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    query: AdminStorageQueryResult,
    load: F,
    scope_types: Option<&'static [&'static str]>,
) -> Response
where
    F: FnOnce(
        ListAdminStorageRecordsQuery,
    ) -> crate::ports::AdminStorageCommandFuture<'a, AdminStorageCollection>,
{
    let Query(query) = match query {
        Ok(query) => query,
        Err(_) => return bad_request("storage query parameters are invalid"),
    };
    let query = match validated_list_query(scoped, query, scope_types) {
        Ok(query) => query,
        Err(response) => return response,
    };
    match load(query).await {
        Ok(collection) => collection_response(collection),
        Err(error) => storage_system_response("storage collection is unavailable", error),
    }
}

fn collection_response(collection: AdminStorageCollection) -> Response {
    let page_size = match usize::try_from(collection.page_size) {
        Ok(page_size) if (1..=MAX_LIMIT as usize).contains(&page_size) => page_size,
        _ => {
            return storage_system_response(
                "storage pagination is unavailable",
                DomainError::new("storage collection page size is invalid"),
            )
        }
    };
    let next_cursor = match collection.next_cursor.as_ref().map(encode_storage_cursor) {
        Some(Ok(cursor)) => Some(cursor),
        Some(Err(error)) => {
            tracing::error!(error = %error, "storage cursor encoding failed");
            return storage_system_response("storage pagination is unavailable", error);
        }
        None => None,
    };
    let has_more = next_cursor.is_some();
    json_success_list_response(
        None,
        collection.items,
        cursor_window_page_info(Some(page_size), next_cursor, has_more),
    )
}

fn validated_list_query(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    query: AdminStorageQuery,
    scope_types: Option<&'static [&'static str]>,
) -> Result<ListAdminStorageRecordsQuery, Response> {
    let subject = scoped.into();
    let limit = query.page_size.unwrap_or(DEFAULT_LIMIT);
    if !(1..=MAX_LIMIT).contains(&limit) {
        return Err(bad_request(format!(
            "page_size must be between 1 and {MAX_LIMIT}"
        )));
    }
    let cursor = query
        .cursor
        .as_deref()
        .map(decode_storage_cursor)
        .transpose()
        .map_err(bad_request)?;
    let status = normalize_optional_text(query.status, "status", MAX_TYPE_LEN)?
        .map(|value| value.to_ascii_lowercase());
    if let Some(status) = status.as_deref() {
        let allowed = if JOB_STATUSES.contains(&status) {
            JOB_STATUSES
        } else {
            RESOURCE_STATUSES
        };
        ensure_enum(status, allowed, "status")?;
    }
    let logical_scope = normalize_optional_text(query.logical_scope, "logicalScope", MAX_TYPE_LEN)?;
    if let Some(value) = logical_scope.as_deref() {
        ensure_enum(value, LOGICAL_SCOPES, "logicalScope")?;
    }
    let scope_type = normalize_optional_text(query.scope_type, "scopeType", MAX_TYPE_LEN)?;
    if let Some(value) = scope_type.as_deref() {
        ensure_enum(value, scope_types.unwrap_or(QUOTA_SCOPE_TYPES), "scopeType")?;
    }
    let request_id = server_request_id()?;
    Ok(ListAdminStorageRecordsQuery {
        subject,
        cursor,
        limit,
        status,
        logical_scope,
        scope_type,
        scope_id: normalize_optional_text(query.scope_id, "scopeId", MAX_ID_LEN)?,
        run_type: normalize_optional_text(query.run_type, "runType", MAX_TYPE_LEN)?,
        request_id,
    })
}

fn encode_storage_cursor(cursor: &AdminStorageCursor) -> Result<String, DomainError> {
    serde_json::to_vec(&AdminStorageCursorPayload { id: cursor.id() })
        .map(|payload| base64url_encode(&payload))
        .map_err(|_| DomainError::new("storage cursor serialization failed"))
}

fn decode_storage_cursor(value: &str) -> Result<AdminStorageCursor, String> {
    if value.is_empty() || value.len() > MAX_CURSOR_LEN || value.trim() != value {
        return Err("storage cursor is invalid".to_owned());
    }
    let decoded = base64url_decode(value).ok_or_else(|| "storage cursor is invalid".to_owned())?;
    let payload = serde_json::from_slice::<AdminStorageCursorPayload>(&decoded)
        .map_err(|_| "storage cursor is invalid".to_owned())?;
    AdminStorageCursor::new(payload.id).ok_or_else(|| "storage cursor is invalid".to_owned())
}

fn validated_provider_create_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    request: CreateStorageProviderRequest,
) -> Result<CreateStorageProviderCommand, Response> {
    let subject = scoped.into();
    let idempotency_key = required_header(headers, IDEMPOTENCY_KEY_HEADER)?;
    let provider_type =
        normalize_required_text(request.provider_type, "providerType", MAX_TYPE_LEN)?;
    ensure_enum(&provider_type, PROVIDER_TYPES, "providerType")?;
    Ok(CreateStorageProviderCommand {
        subject,
        supplier_code: normalize_required_text(
            request.provider_code,
            "providerCode",
            MAX_CODE_LEN,
        )?,
        provider_type,
        endpoint_url: normalize_optional_text(request.endpoint_url, "endpointUrl", MAX_URL_LEN)?,
        region: normalize_optional_text(request.region, "region", MAX_TYPE_LEN)?,
        credential_ref: normalize_required_text(
            request.credential_ref,
            "credentialRef",
            MAX_CREDENTIAL_REF_LEN,
        )?,
        path_style_enabled: request.path_style_enabled,
        supports_multipart: request.supports_multipart,
        supports_lifecycle: request.supports_lifecycle,
        supports_object_lock: request.supports_object_lock,
        idempotency_key,
        request_id: Some(server_request_id()?),
    })
}

fn validated_provider_update_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    provider_id: String,
    request: UpdateStorageStatusRequest,
) -> Result<UpdateStorageProviderCommand, Response> {
    let subject = scoped.into();
    let status =
        normalize_required_text(request.status, "status", MAX_TYPE_LEN)?.to_ascii_lowercase();
    ensure_enum(&status, RESOURCE_STATUSES, "status")?;
    Ok(UpdateStorageProviderCommand {
        subject,
        provider_id: normalize_required_text(provider_id, "providerId", MAX_ID_LEN)?,
        status,
        reason: normalize_required_text(request.reason, "reason", MAX_REASON_LEN)?,
        request_id: Some(server_request_id()?),
    })
}

fn validated_provider_health_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    provider_id: String,
) -> Result<CheckStorageProviderHealthCommand, Response> {
    Ok(CheckStorageProviderHealthCommand {
        subject: scoped.into(),
        provider_id: normalize_required_text(provider_id, "providerId", MAX_ID_LEN)?,
        request_id: Some(server_request_id()?),
    })
}

fn validated_bucket_create_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    request: CreateStorageBucketRequest,
) -> Result<CreateStorageBucketCommand, Response> {
    let logical_scope =
        normalize_required_text(request.logical_scope, "logicalScope", MAX_TYPE_LEN)?;
    ensure_enum(&logical_scope, LOGICAL_SCOPES, "logicalScope")?;
    if let Some(value) = request.default_storage_class.as_deref() {
        ensure_enum(value, STORAGE_CLASSES, "defaultStorageClass")?;
    }
    if let Some(value) = request.default_encryption_mode.as_deref() {
        ensure_enum(value, ENCRYPTION_MODES, "defaultEncryptionMode")?;
    }
    Ok(CreateStorageBucketCommand {
        subject: scoped.into(),
        bucket_name: normalize_required_text(request.bucket_name, "bucketName", MAX_ID_LEN)?,
        provider_id: normalize_required_text(request.provider_id, "providerId", MAX_ID_LEN)?,
        logical_scope,
        bucket_region: normalize_optional_text(
            request.bucket_region,
            "bucketRegion",
            MAX_TYPE_LEN,
        )?,
        data_residency_region: normalize_optional_text(
            request.data_residency_region,
            "dataResidencyRegion",
            MAX_TYPE_LEN,
        )?,
        object_key_prefix: normalize_optional_text(
            request.object_key_prefix,
            "objectKeyPrefix",
            MAX_URL_LEN,
        )?,
        default_storage_class: request.default_storage_class,
        default_encryption_mode: request.default_encryption_mode,
        kms_key_ref: normalize_optional_text(
            request.kms_key_ref,
            "kmsKeyRef",
            MAX_CREDENTIAL_REF_LEN,
        )?,
        versioning_enabled: request.versioning_enabled,
        object_lock_enabled: request.object_lock_enabled,
        lifecycle_enabled: request.lifecycle_enabled,
        public_access_blocked: request.public_access_blocked,
        idempotency_key: required_header(headers, IDEMPOTENCY_KEY_HEADER)?,
        request_id: Some(server_request_id()?),
    })
}

fn validated_bucket_update_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    bucket_id: String,
    request: UpdateStorageStatusRequest,
) -> Result<UpdateStorageBucketCommand, Response> {
    let status =
        normalize_required_text(request.status, "status", MAX_TYPE_LEN)?.to_ascii_lowercase();
    ensure_enum(&status, RESOURCE_STATUSES, "status")?;
    Ok(UpdateStorageBucketCommand {
        subject: scoped.into(),
        bucket_id: normalize_required_text(bucket_id, "bucketId", MAX_ID_LEN)?,
        status,
        reason: normalize_required_text(request.reason, "reason", MAX_REASON_LEN)?,
        request_id: Some(server_request_id()?),
    })
}

fn validated_default_bucket_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    logical_scope: String,
    request: SetStorageDefaultBucketRequest,
) -> Result<SetStorageDefaultBucketCommand, Response> {
    let logical_scope = normalize_required_text(logical_scope, "logicalScope", MAX_TYPE_LEN)?;
    ensure_enum(&logical_scope, LOGICAL_SCOPES, "logicalScope")?;
    Ok(SetStorageDefaultBucketCommand {
        subject: scoped.into(),
        logical_scope,
        bucket_id: normalize_required_text(request.bucket_id, "bucketId", MAX_ID_LEN)?,
        reason: normalize_required_text(request.reason, "reason", MAX_REASON_LEN)?,
        request_id: Some(server_request_id()?),
    })
}

fn validated_quota_create_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    request: CreateStorageQuotaPolicyRequest,
) -> Result<CreateStorageQuotaPolicyCommand, Response> {
    let scope_type = normalize_required_text(request.scope_type, "scopeType", MAX_TYPE_LEN)?;
    ensure_enum(&scope_type, QUOTA_SCOPE_TYPES, "scopeType")?;
    let quota_limit_bytes = match request.quota_limit_bytes {
        Some(value) => value,
        None => request
            .quota_limit
            .as_deref()
            .ok_or_else(|| bad_request("quotaLimitBytes is required"))?
            .trim()
            .parse::<i64>()
            .map_err(|_| bad_request("quotaLimitBytes must be a non-negative integer"))?,
    };
    if quota_limit_bytes < 0 {
        return Err(bad_request(
            "quotaLimitBytes must be a non-negative integer",
        ));
    }
    if request
        .single_file_limit_bytes
        .is_some_and(|value| value < 0)
    {
        return Err(bad_request(
            "singleFileLimitBytes must be a non-negative integer",
        ));
    }
    Ok(CreateStorageQuotaPolicyCommand {
        subject: scoped.into(),
        scope_type,
        scope_id: normalize_required_text(request.scope_id, "scopeId", MAX_ID_LEN)?,
        quota_limit_bytes,
        single_file_limit_bytes: request.single_file_limit_bytes,
        enforcement: normalize_optional_text(request.enforcement, "enforcement", MAX_TYPE_LEN)?,
        idempotency_key: required_header(headers, IDEMPOTENCY_KEY_HEADER)?,
        request_id: Some(server_request_id()?),
    })
}

fn validated_reconciliation_create_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    request: CreateStorageReconciliationRunRequest,
) -> Result<CreateStorageReconciliationRunCommand, Response> {
    let run_type = request
        .run_type
        .or(request.check_mode)
        .unwrap_or_else(|| "metadata".to_owned());
    Ok(CreateStorageReconciliationRunCommand {
        subject: scoped.into(),
        provider_id: normalize_optional_text(request.provider_id, "providerId", MAX_ID_LEN)?,
        bucket_id: normalize_optional_text(request.bucket_id, "bucketId", MAX_ID_LEN)?,
        run_type: normalize_required_text(run_type, "runType", MAX_TYPE_LEN)?,
        dry_run: request.dry_run.unwrap_or(true),
        reason: normalize_optional_text(request.reason, "reason", MAX_REASON_LEN)?,
        idempotency_key: required_header(headers, IDEMPOTENCY_KEY_HEADER)?,
        request_id: Some(server_request_id()?),
    })
}

fn validated_gc_create_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    request: CreateStorageGarbageCollectionJobRequest,
) -> Result<CreateStorageGarbageCollectionJobCommand, Response> {
    let job_type = request
        .job_type
        .or_else(|| request.target.clone())
        .unwrap_or_else(|| "expired_uploads".to_owned());
    Ok(CreateStorageGarbageCollectionJobCommand {
        subject: scoped.into(),
        job_type: normalize_required_text(job_type, "jobType", MAX_TYPE_LEN)?,
        target: normalize_optional_text(request.target, "target", MAX_TYPE_LEN)?,
        dry_run: request.dry_run.unwrap_or(true),
        retention_window: normalize_optional_text(
            request.retention_window,
            "retentionWindow",
            MAX_TYPE_LEN,
        )?,
        dry_run_sample: normalize_optional_text(
            request.dry_run_sample,
            "dryRunSample",
            MAX_TYPE_LEN,
        )?,
        criteria: request.criteria,
        idempotency_key: required_header(headers, IDEMPOTENCY_KEY_HEADER)?,
        request_id: Some(server_request_id()?),
    })
}

fn server_request_id() -> Result<String, Response> {
    generate_server_request_id().map_err(request_id_error_response)
}

fn request_id_error_response(error: RequestIdError) -> Response {
    match error {
        RequestIdError::Invalid(message) => bad_request(message),
        RequestIdError::System(message) => {
            storage_system_response("request id generation failed", DomainError::new(message))
        }
    }
}

fn required_header(headers: &HeaderMap, name: &str) -> Result<String, Response> {
    optional_header(headers, name)?.ok_or_else(|| bad_request(format!("{name} header is required")))
}

fn optional_header(headers: &HeaderMap, name: &str) -> Result<Option<String>, Response> {
    let Some(value) = headers.get(name) else {
        return Ok(None);
    };
    let value = value
        .to_str()
        .map_err(|_| bad_request(format!("{name} header must be visible ASCII")))?;
    normalize_optional_text(Some(value.to_owned()), name, MAX_REQUEST_ID_LEN)
}

fn normalize_required_text(
    value: String,
    field_name: &str,
    max_len: usize,
) -> Result<String, Response> {
    normalize_optional_text(Some(value), field_name, max_len)?
        .ok_or_else(|| bad_request(format!("{field_name} is required")))
}

fn normalize_optional_text(
    value: Option<String>,
    field_name: &str,
    max_len: usize,
) -> Result<Option<String>, Response> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = value.trim();
    if value.is_empty() {
        return Ok(None);
    }
    if value.chars().count() > max_len || !value.bytes().all(|byte| (0x20..=0x7e).contains(&byte)) {
        return Err(bad_request(format!(
            "{field_name} must be visible ASCII and at most {max_len} characters"
        )));
    }
    Ok(Some(value.to_owned()))
}

fn ensure_enum(value: &str, allowed: &[&str], field_name: &str) -> Result<(), Response> {
    if allowed.contains(&value) {
        return Ok(());
    }
    Err(bad_request(format!(
        "{field_name} must be one of {}",
        allowed.join(", ")
    )))
}

fn response_request_id(value: Option<&str>) -> String {
    value
        .filter(|item| !item.trim().is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| "storage-request".to_owned())
}

fn bad_request(message: impl Into<String>) -> Response {
    platform_problem(SdkWorkResultCode::InvalidParameter, message).into_response()
}

fn storage_error_response(context: &str, error: DomainError) -> Response {
    if error.is_not_found() {
        return problem_from_wire_code("4040", error.to_string()).into_response();
    }
    if error.is_conflict() {
        return problem_from_wire_code("4090", error.to_string()).into_response();
    }
    storage_system_response(context, error)
}

fn storage_system_response(context: &str, error: DomainError) -> Response {
    problem_from_wire_code("5000", format!("{context}: {error}")).into_response()
}
