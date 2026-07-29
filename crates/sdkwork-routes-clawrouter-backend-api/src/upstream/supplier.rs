use axum::extract::rejection::{JsonRejection, QueryRejection};
use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;
use axum::routing::get;
use axum::{Json, Router};
use sdkwork_clawrouter_router_service::api::admin_sql_subject::RequiredAdminSqlScopedSubject;
use sdkwork_clawrouter_router_service::ports::{
    AdminUpstreamResourceInput, AdminUpstreamResourceItem, AdminUpstreamSupplierAuthMethodInput,
    AdminUpstreamSupplierAuthMethodItem, AdminUpstreamSupplierEndpointInput,
    AdminUpstreamSupplierEndpointItem, AdminUpstreamSupplierItem, SaveAdminUpstreamSupplierCommand,
};
use sdkwork_utils_rust::SdkWorkResultCode;
use serde::{Deserialize, Serialize};

use super::shared::{
    bounded_list_response, collection_item_response, decode_json, decode_query, domain_error,
    idempotency_uuid, item_response, list_query, list_response, no_content_response, not_found,
    optional_text, parse_id, parse_if_match, problem, requested_at, required_text, subject,
    ListQuery, UpstreamState, MAX_NESTED_ITEMS,
};

const MAX_CODE_LENGTH: usize = 128;
const MAX_NAME_LENGTH: usize = 200;
const MAX_DESCRIPTION_LENGTH: usize = 4_000;
const MAX_URL_LENGTH: usize = 2_048;
const SUPPLIER_CREATE_IDEMPOTENCY_SCOPE: i64 = 1_000_001;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SupplierCreateRequest {
    supplier_code: String,
    supplier_name: String,
    display_name: Option<String>,
    description: Option<String>,
    supplier_type: String,
    adapter_code: String,
    protocol_code: String,
    website_url: Option<String>,
    docs_url: Option<String>,
    region_code: Option<String>,
    environment: Option<i32>,
    sort_order: Option<i32>,
    status: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SupplierUpdateRequest {
    supplier_name: Option<String>,
    display_name: Option<String>,
    description: Option<String>,
    supplier_type: Option<String>,
    adapter_code: Option<String>,
    protocol_code: Option<String>,
    website_url: Option<String>,
    docs_url: Option<String>,
    region_code: Option<String>,
    environment: Option<i32>,
    sort_order: Option<i32>,
    status: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct EndpointReplaceRequest {
    items: Vec<EndpointRequestItem>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct EndpointRequestItem {
    endpoint_code: String,
    endpoint_name: String,
    base_url: String,
    protocol_code: Option<String>,
    region_code: Option<String>,
    environment: Option<i32>,
    priority: Option<i32>,
    routing_weight: Option<i32>,
    timeout_ms: Option<i32>,
    status: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AuthMethodReplaceRequest {
    items: Vec<AuthMethodRequestItem>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AuthMethodRequestItem {
    auth_method_code: String,
    auth_method_name: String,
    auth_type: String,
    config_schema: serde_json::Value,
    runtime_auth_config: serde_json::Value,
    priority: Option<i32>,
    status: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ResourceReplaceRequest {
    items: Vec<ResourceRequestItem>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ResourceRequestItem {
    resource_code: Option<String>,
    resource_group_code: Option<String>,
    grant_type: Option<String>,
    priority: Option<i32>,
    status: Option<i32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SupplierResponse {
    id: String,
    uuid: String,
    supplier_code: String,
    supplier_name: String,
    display_name: String,
    description: Option<String>,
    supplier_type: String,
    adapter_code: String,
    protocol_code: String,
    website_url: Option<String>,
    docs_url: Option<String>,
    region_code: Option<String>,
    environment: i32,
    health_status: i32,
    sort_order: i32,
    status: i32,
    version: String,
    updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct EndpointResponse {
    id: String,
    endpoint_code: String,
    endpoint_name: String,
    base_url: String,
    protocol_code: Option<String>,
    region_code: Option<String>,
    environment: i32,
    priority: i32,
    routing_weight: i32,
    timeout_ms: Option<i32>,
    health_status: i32,
    status: i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AuthMethodResponse {
    id: String,
    auth_method_code: String,
    auth_method_name: String,
    auth_type: String,
    config_schema: serde_json::Value,
    runtime_auth_config: serde_json::Value,
    priority: i32,
    status: i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct ResourceResponse {
    id: String,
    resource_code: String,
    resource_group_code: String,
    grant_type: String,
    priority: i32,
    status: i32,
}

pub(super) fn routes() -> Router<UpstreamState> {
    Router::new()
        .route(
            "/backend/v3/api/ai/upstream_suppliers",
            get(list_suppliers).post(create_supplier),
        )
        .route(
            "/backend/v3/api/ai/upstream_suppliers/{supplierId}",
            get(get_supplier)
                .patch(update_supplier)
                .delete(delete_supplier),
        )
        .route(
            "/backend/v3/api/ai/upstream_suppliers/{supplierId}/endpoints",
            get(list_endpoints).put(replace_endpoints),
        )
        .route(
            "/backend/v3/api/ai/upstream_suppliers/{supplierId}/auth_methods",
            get(list_auth_methods).put(replace_auth_methods),
        )
        .route(
            "/backend/v3/api/ai/upstream_suppliers/{supplierId}/resources",
            get(list_resources).put(replace_resources),
        )
}

async fn list_suppliers(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    query: Result<Query<ListQuery>, QueryRejection>,
) -> Response {
    let query = match decode_query(query).and_then(|query| list_query(subject(scoped), query)) {
        Ok(query) => query,
        Err(response) => return response,
    };
    match state.store.list_suppliers(query).await {
        Ok(page) => list_response(
            sdkwork_clawrouter_router_service::ports::AdminUpstreamPage {
                items: page.items.into_iter().map(SupplierResponse::from).collect(),
                page: page.page,
                page_size: page.page_size,
                total: page.total,
            },
        ),
        Err(error) => domain_error(error),
    }
}

async fn get_supplier(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(supplier_id): Path<String>,
) -> Response {
    let supplier_id = match parse_id(supplier_id, "supplierId") {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state.store.get_supplier(subject(scoped), supplier_id).await {
        Ok(Some(item)) => item_response(StatusCode::OK, SupplierResponse::from(item)),
        Ok(None) => not_found("upstream supplier"),
        Err(error) => domain_error(error),
    }
}

async fn create_supplier(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    headers: HeaderMap,
    payload: Result<Json<SupplierCreateRequest>, JsonRejection>,
) -> Response {
    let scoped = subject(scoped);
    let uuid = match idempotency_uuid(&headers, &scoped, SUPPLIER_CREATE_IDEMPOTENCY_SCOPE) {
        Ok(value) => value,
        Err(response) => return response,
    };
    let payload = match decode_json(payload) {
        Ok(payload) => payload,
        Err(response) => return response,
    };
    let command = match create_command(scoped, uuid, payload) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.save_supplier(command).await {
        Ok(item) => item_response(StatusCode::CREATED, SupplierResponse::from(item)),
        Err(error) => domain_error(error),
    }
}

async fn update_supplier(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(supplier_id): Path<String>,
    headers: HeaderMap,
    payload: Result<Json<SupplierUpdateRequest>, JsonRejection>,
) -> Response {
    let supplier_id = match parse_id(supplier_id, "supplierId") {
        Ok(value) => value,
        Err(response) => return response,
    };
    let expected_version = match parse_if_match(&headers) {
        Ok(value) => value,
        Err(response) => return response,
    };
    let payload = match decode_json(payload) {
        Ok(payload) => payload,
        Err(response) => return response,
    };
    let scoped = subject(scoped);
    let existing = match state.store.get_supplier(scoped.clone(), supplier_id).await {
        Ok(Some(item)) => item,
        Ok(None) => return not_found("upstream supplier"),
        Err(error) => return domain_error(error),
    };
    let command = match update_command(scoped, existing, expected_version, payload) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.save_supplier(command).await {
        Ok(item) => item_response(StatusCode::OK, SupplierResponse::from(item)),
        Err(error) => domain_error(error),
    }
}

async fn delete_supplier(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(supplier_id): Path<String>,
    headers: HeaderMap,
) -> Response {
    let supplier_id = match parse_id(supplier_id, "supplierId") {
        Ok(value) => value,
        Err(response) => return response,
    };
    let expected_version = match parse_if_match(&headers) {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .store
        .delete_supplier(
            subject(scoped),
            supplier_id,
            expected_version,
            requested_at(),
        )
        .await
    {
        Ok(true) => no_content_response(),
        Ok(false) => not_found("upstream supplier"),
        Err(error) => domain_error(error),
    }
}

async fn list_endpoints(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(supplier_id): Path<String>,
) -> Response {
    let supplier_id = match parse_id(supplier_id, "supplierId") {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .store
        .list_supplier_endpoints(subject(scoped), supplier_id)
        .await
    {
        Ok(items) => bounded_list_response(items.into_iter().map(EndpointResponse::from).collect()),
        Err(error) => domain_error(error),
    }
}

async fn replace_endpoints(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(supplier_id): Path<String>,
    headers: HeaderMap,
    payload: Result<Json<EndpointReplaceRequest>, JsonRejection>,
) -> Response {
    let supplier_id = match parse_id(supplier_id, "supplierId") {
        Ok(value) => value,
        Err(response) => return response,
    };
    let expected_version = match parse_if_match(&headers) {
        Ok(value) => value,
        Err(response) => return response,
    };
    let payload = match decode_json(payload).and_then(endpoint_inputs) {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .store
        .replace_supplier_endpoints(
            subject(scoped),
            supplier_id,
            expected_version,
            payload,
            requested_at(),
        )
        .await
    {
        Ok(items) => {
            collection_item_response(items.into_iter().map(EndpointResponse::from).collect())
        }
        Err(error) => domain_error(error),
    }
}

async fn list_auth_methods(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(supplier_id): Path<String>,
) -> Response {
    let supplier_id = match parse_id(supplier_id, "supplierId") {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .store
        .list_supplier_auth_methods(subject(scoped), supplier_id)
        .await
    {
        Ok(items) => {
            bounded_list_response(items.into_iter().map(AuthMethodResponse::from).collect())
        }
        Err(error) => domain_error(error),
    }
}

async fn replace_auth_methods(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(supplier_id): Path<String>,
    headers: HeaderMap,
    payload: Result<Json<AuthMethodReplaceRequest>, JsonRejection>,
) -> Response {
    let supplier_id = match parse_id(supplier_id, "supplierId") {
        Ok(value) => value,
        Err(response) => return response,
    };
    let expected_version = match parse_if_match(&headers) {
        Ok(value) => value,
        Err(response) => return response,
    };
    let payload = match decode_json(payload).and_then(auth_method_inputs) {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .store
        .replace_supplier_auth_methods(
            subject(scoped),
            supplier_id,
            expected_version,
            payload,
            requested_at(),
        )
        .await
    {
        Ok(items) => {
            collection_item_response(items.into_iter().map(AuthMethodResponse::from).collect())
        }
        Err(error) => domain_error(error),
    }
}

async fn list_resources(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(supplier_id): Path<String>,
) -> Response {
    let supplier_id = match parse_id(supplier_id, "supplierId") {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .store
        .list_supplier_resources(subject(scoped), supplier_id)
        .await
    {
        Ok(items) => bounded_list_response(items.into_iter().map(ResourceResponse::from).collect()),
        Err(error) => domain_error(error),
    }
}

async fn replace_resources(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(supplier_id): Path<String>,
    headers: HeaderMap,
    payload: Result<Json<ResourceReplaceRequest>, JsonRejection>,
) -> Response {
    let supplier_id = match parse_id(supplier_id, "supplierId") {
        Ok(value) => value,
        Err(response) => return response,
    };
    let expected_version = match parse_if_match(&headers) {
        Ok(value) => value,
        Err(response) => return response,
    };
    let payload = match decode_json(payload).and_then(resource_inputs) {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state
        .store
        .replace_supplier_resources(
            subject(scoped),
            supplier_id,
            expected_version,
            payload,
            requested_at(),
        )
        .await
    {
        Ok(items) => {
            collection_item_response(items.into_iter().map(ResourceResponse::from).collect())
        }
        Err(error) => domain_error(error),
    }
}

fn create_command(
    subject: sdkwork_clawrouter_router_service::ports::AdminUpstreamSubject,
    uuid: String,
    request: SupplierCreateRequest,
) -> Result<SaveAdminUpstreamSupplierCommand, Response> {
    let supplier_name = required_text(request.supplier_name, "supplierName", MAX_NAME_LENGTH)?;
    Ok(SaveAdminUpstreamSupplierCommand {
        subject,
        supplier_id: None,
        expected_version: None,
        uuid,
        supplier_code: required_text(request.supplier_code, "supplierCode", MAX_CODE_LENGTH)?,
        display_name: request
            .display_name
            .map(|value| required_text(value, "displayName", MAX_NAME_LENGTH))
            .transpose()?
            .unwrap_or_else(|| supplier_name.clone()),
        supplier_name,
        description: optional_text(request.description, "description", MAX_DESCRIPTION_LENGTH)?,
        supplier_type: supplier_type(request.supplier_type)?,
        adapter_code: required_text(request.adapter_code, "adapterCode", MAX_CODE_LENGTH)?,
        protocol_code: required_text(request.protocol_code, "protocolCode", MAX_CODE_LENGTH)?,
        website_url: optional_text(request.website_url, "websiteUrl", MAX_URL_LENGTH)?,
        docs_url: optional_text(request.docs_url, "docsUrl", MAX_URL_LENGTH)?,
        region_code: optional_text(request.region_code, "regionCode", MAX_CODE_LENGTH)?,
        environment: request.environment.unwrap_or(1),
        sort_order: non_negative(request.sort_order.unwrap_or(0), "sortOrder")?,
        status: status(request.status.unwrap_or(1))?,
        requested_at: requested_at(),
    })
}

fn update_command(
    subject: sdkwork_clawrouter_router_service::ports::AdminUpstreamSubject,
    existing: AdminUpstreamSupplierItem,
    expected_version: i64,
    request: SupplierUpdateRequest,
) -> Result<SaveAdminUpstreamSupplierCommand, Response> {
    Ok(SaveAdminUpstreamSupplierCommand {
        subject,
        supplier_id: Some(existing.id),
        expected_version: Some(expected_version),
        uuid: existing.uuid,
        supplier_code: existing.supplier_code,
        supplier_name: request
            .supplier_name
            .map(|value| required_text(value, "supplierName", MAX_NAME_LENGTH))
            .transpose()?
            .unwrap_or(existing.supplier_name),
        display_name: request
            .display_name
            .map(|value| required_text(value, "displayName", MAX_NAME_LENGTH))
            .transpose()?
            .unwrap_or(existing.display_name),
        description: match request.description {
            Some(value) => optional_text(Some(value), "description", MAX_DESCRIPTION_LENGTH)?,
            None => existing.description,
        },
        supplier_type: request
            .supplier_type
            .map(supplier_type)
            .transpose()?
            .unwrap_or(existing.supplier_type),
        adapter_code: request
            .adapter_code
            .map(|value| required_text(value, "adapterCode", MAX_CODE_LENGTH))
            .transpose()?
            .unwrap_or(existing.adapter_code),
        protocol_code: request
            .protocol_code
            .map(|value| required_text(value, "protocolCode", MAX_CODE_LENGTH))
            .transpose()?
            .unwrap_or(existing.protocol_code),
        website_url: match request.website_url {
            Some(value) => optional_text(Some(value), "websiteUrl", MAX_URL_LENGTH)?,
            None => existing.website_url,
        },
        docs_url: match request.docs_url {
            Some(value) => optional_text(Some(value), "docsUrl", MAX_URL_LENGTH)?,
            None => existing.docs_url,
        },
        region_code: match request.region_code {
            Some(value) => optional_text(Some(value), "regionCode", MAX_CODE_LENGTH)?,
            None => existing.region_code,
        },
        environment: request.environment.unwrap_or(existing.environment),
        sort_order: non_negative(
            request.sort_order.unwrap_or(existing.sort_order),
            "sortOrder",
        )?,
        status: status(request.status.unwrap_or(existing.status))?,
        requested_at: requested_at(),
    })
}

fn endpoint_inputs(
    request: EndpointReplaceRequest,
) -> Result<Vec<AdminUpstreamSupplierEndpointInput>, Response> {
    ensure_count(request.items.len(), "endpoints")?;
    request
        .items
        .into_iter()
        .map(|item| {
            Ok(AdminUpstreamSupplierEndpointInput {
                endpoint_code: required_text(item.endpoint_code, "endpointCode", MAX_CODE_LENGTH)?,
                endpoint_name: required_text(item.endpoint_name, "endpointName", MAX_NAME_LENGTH)?,
                base_url: required_text(item.base_url, "baseUrl", MAX_URL_LENGTH)?,
                protocol_code: optional_text(item.protocol_code, "protocolCode", MAX_CODE_LENGTH)?,
                region_code: optional_text(item.region_code, "regionCode", MAX_CODE_LENGTH)?,
                environment: item.environment.unwrap_or(1),
                priority: non_negative(item.priority.unwrap_or(0), "priority")?,
                routing_weight: non_negative(item.routing_weight.unwrap_or(100), "routingWeight")?,
                timeout_ms: positive_optional(item.timeout_ms, "timeoutMs")?,
                status: status(item.status.unwrap_or(1))?,
            })
        })
        .collect()
}

fn auth_method_inputs(
    request: AuthMethodReplaceRequest,
) -> Result<Vec<AdminUpstreamSupplierAuthMethodInput>, Response> {
    ensure_count(request.items.len(), "authMethods")?;
    request
        .items
        .into_iter()
        .map(|item| {
            if !item.config_schema.is_object() {
                return Err(problem(
                    SdkWorkResultCode::InvalidParameter,
                    "configSchema must be a JSON object",
                ));
            }
            if !item.runtime_auth_config.is_object() {
                return Err(problem(
                    SdkWorkResultCode::InvalidParameter,
                    "runtimeAuthConfig must be a JSON object",
                ));
            }
            Ok(AdminUpstreamSupplierAuthMethodInput {
                auth_method_code: required_text(
                    item.auth_method_code,
                    "authMethodCode",
                    MAX_CODE_LENGTH,
                )?,
                auth_method_name: required_text(
                    item.auth_method_name,
                    "authMethodName",
                    MAX_NAME_LENGTH,
                )?,
                auth_type: auth_type(item.auth_type)?,
                config_schema: item.config_schema,
                runtime_auth_config: item.runtime_auth_config,
                priority: non_negative(item.priority.unwrap_or(0), "priority")?,
                status: status(item.status.unwrap_or(1))?,
            })
        })
        .collect()
}

fn resource_inputs(
    request: ResourceReplaceRequest,
) -> Result<Vec<AdminUpstreamResourceInput>, Response> {
    ensure_count(request.items.len(), "resources")?;
    request
        .items
        .into_iter()
        .map(|item| {
            let resource_code = optional_text(item.resource_code, "resourceCode", MAX_CODE_LENGTH)?
                .unwrap_or_default();
            let resource_group_code = optional_text(
                item.resource_group_code,
                "resourceGroupCode",
                MAX_CODE_LENGTH,
            )?
            .unwrap_or_default();
            if resource_code.is_empty() == resource_group_code.is_empty() {
                return Err(problem(
                    SdkWorkResultCode::InvalidParameter,
                    "exactly one of resourceCode or resourceGroupCode is required",
                ));
            }
            let grant_type = item.grant_type.unwrap_or_else(|| "allow".to_owned());
            if !matches!(grant_type.as_str(), "allow" | "deny") {
                return Err(problem(
                    SdkWorkResultCode::InvalidParameter,
                    "grantType must be allow or deny",
                ));
            }
            Ok(AdminUpstreamResourceInput {
                resource_code,
                resource_group_code,
                grant_type,
                priority: non_negative(item.priority.unwrap_or(0), "priority")?,
                status: status(item.status.unwrap_or(1))?,
            })
        })
        .collect()
}

fn supplier_type(value: String) -> Result<String, Response> {
    let value = required_text(value, "supplierType", 32)?;
    if !matches!(value.as_str(), "official" | "relay") {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            "supplierType must be official or relay",
        ));
    }
    Ok(value)
}

fn auth_type(value: String) -> Result<String, Response> {
    let value = required_text(value, "authType", 64)?;
    if !matches!(value.as_str(), "api_key" | "bearer_token" | "custom") {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            "authType is not supported",
        ));
    }
    Ok(value)
}

fn status(value: i32) -> Result<i32, Response> {
    if !matches!(value, 0 | 1) {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            "status must be 0 or 1",
        ));
    }
    Ok(value)
}

fn non_negative(value: i32, field: &str) -> Result<i32, Response> {
    if value < 0 {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            format!("{field} must be non-negative"),
        ));
    }
    Ok(value)
}

fn positive_optional(value: Option<i32>, field: &str) -> Result<Option<i32>, Response> {
    if value.is_some_and(|value| value <= 0) {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            format!("{field} must be positive"),
        ));
    }
    Ok(value)
}

fn ensure_count(count: usize, field: &str) -> Result<(), Response> {
    if count > MAX_NESTED_ITEMS {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            format!("{field} must contain at most {MAX_NESTED_ITEMS} items"),
        ));
    }
    Ok(())
}

impl From<AdminUpstreamSupplierItem> for SupplierResponse {
    fn from(item: AdminUpstreamSupplierItem) -> Self {
        Self {
            id: item.id.to_string(),
            uuid: item.uuid,
            supplier_code: item.supplier_code,
            supplier_name: item.supplier_name,
            display_name: item.display_name,
            description: item.description,
            supplier_type: item.supplier_type,
            adapter_code: item.adapter_code,
            protocol_code: item.protocol_code,
            website_url: item.website_url,
            docs_url: item.docs_url,
            region_code: item.region_code,
            environment: item.environment,
            health_status: item.health_status,
            sort_order: item.sort_order,
            status: item.status,
            version: item.version.to_string(),
            updated_at: item.updated_at,
        }
    }
}

impl From<AdminUpstreamSupplierEndpointItem> for EndpointResponse {
    fn from(item: AdminUpstreamSupplierEndpointItem) -> Self {
        Self {
            id: item.id.to_string(),
            endpoint_code: item.endpoint_code,
            endpoint_name: item.endpoint_name,
            base_url: item.base_url,
            protocol_code: item.protocol_code,
            region_code: item.region_code,
            environment: item.environment,
            priority: item.priority,
            routing_weight: item.routing_weight,
            timeout_ms: item.timeout_ms,
            health_status: item.health_status,
            status: item.status,
        }
    }
}

impl From<AdminUpstreamSupplierAuthMethodItem> for AuthMethodResponse {
    fn from(item: AdminUpstreamSupplierAuthMethodItem) -> Self {
        Self {
            id: item.id.to_string(),
            auth_method_code: item.auth_method_code,
            auth_method_name: item.auth_method_name,
            auth_type: item.auth_type,
            config_schema: item.config_schema,
            runtime_auth_config: item.runtime_auth_config,
            priority: item.priority,
            status: item.status,
        }
    }
}

impl From<AdminUpstreamResourceItem> for ResourceResponse {
    fn from(item: AdminUpstreamResourceItem) -> Self {
        Self {
            id: item.id.to_string(),
            resource_code: item.resource_code,
            resource_group_code: item.resource_group_code,
            grant_type: item.grant_type,
            priority: item.priority,
            status: item.status,
        }
    }
}
