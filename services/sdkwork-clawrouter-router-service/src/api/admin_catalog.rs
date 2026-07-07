use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::api::request_id::{generate_server_request_id, RequestIdError};
use crate::api::response::{
    json_success_list_response, normalize_list_search_query, offset_page_info,
    parse_offset_list_query, problem_from_wire_code, success_envelope,
};
use crate::application::{load_admin_category_seed_bundles, DEFAULT_ADMIN_CATEGORY_SEED_DATASETS};
use crate::domain::DomainError;
use crate::ports::{
    AdminAttributeMutationCommand, AdminCatalogCollection, AdminCatalogJsonRecord,
    AdminCatalogStore, AdminCatalogSubject, AdminCategoryAttributeMutationCommand,
    AdminCategoryMutationCommand, AdminCategorySeedInitializeCommand,
    AdminCategorySeedInitializeSummary, AdminPriceListMutationCommand, AdminProductMutationCommand,
    AdminSkuAttributeInput, AdminSkuMutationCommand, DeleteAdminCategoryAttributeCommand,
    DeleteAdminCategoryCommand, DeleteAdminProductCommand, DeleteAdminSkuCommand,
    ListAdminCatalogRecordsQuery,
};

const MAX_ID_LEN: usize = 128;
const MAX_CODE_LEN: usize = 128;
const MAX_SHORT_TEXT_LEN: usize = 512;
const MAX_LONG_TEXT_LEN: usize = 20_000;
const MAX_PRODUCT_CATEGORY_BINDINGS: usize = 3;
const IDEMPOTENCY_KEY_HEADER: &str = "Idempotency-Key";

const PRODUCT_TYPES: &[&str] = &[
    "physical_good",
    "virtual_good",
    "membership",
    "points_recharge",
    "wallet_recharge",
    "subscription",
    "service",
];
const PRODUCT_STATUSES: &[&str] = &["draft", "active", "inactive", "archived"];
const CATEGORY_STATUSES: &[&str] = &["active", "inactive", "archived"];
const ATTRIBUTE_VALUE_TYPES: &[&str] = &["text", "number", "boolean", "enum", "date"];
const ATTRIBUTE_SCOPES: &[&str] = &["spu", "sku", "both"];
const SKU_FULFILLMENT_TYPES: &[&str] = &[
    "physical_shipment",
    "digital_delivery",
    "entitlement_grant",
    "points_credit",
    "wallet_credit",
    "subscription_activation",
    "service_activation",
    "none",
];

#[derive(Clone)]
struct AdminCatalogState {
    store: Arc<dyn AdminCatalogStore + Send + Sync>,
}

#[derive(Debug, Deserialize)]
struct CatalogListQueryRequest {
    page: Option<i64>,
    page_size: Option<i64>,
    status: Option<String>,
    parent_id: Option<String>,
    q: Option<String>,
    category_id: Option<String>,
    attribute_id: Option<String>,
    product_type: Option<String>,
    product_id: Option<String>,
    fulfillment_type: Option<String>,
    scope: Option<String>,
    currency_code: Option<String>,
    market_code: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CategoryMutationRequest {
    category_no: String,
    parent_id: Option<String>,
    name: String,
    status: String,
    sort_order: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CategorySeedInitializeRequest {
    datasets: Option<Vec<String>>,
    mode: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProductMutationRequest {
    spu_no: String,
    product_type: String,
    title: String,
    subtitle: Option<String>,
    description: Option<String>,
    category_ids: Option<Vec<String>>,
    brand: Option<String>,
    status: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SkuMutationRequest {
    sku_no: String,
    product_id: String,
    title: String,
    barcode: Option<String>,
    image: Option<Value>,
    fulfillment_type: String,
    tax_category: Option<String>,
    sales_unit: Option<String>,
    default_price_amount: Option<String>,
    default_currency_code: Option<String>,
    status: String,
    attributes: Option<Vec<SkuAttributeRequest>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SkuAttributeRequest {
    attribute_id: String,
    attribute_name: String,
    attribute_value_id: Option<String>,
    value_code: Option<String>,
    display_value: Option<String>,
    custom_value: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AttributeMutationRequest {
    attribute_no: String,
    name: String,
    value_type: String,
    scope: String,
    required: bool,
    searchable: bool,
    filterable: bool,
    status: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CategoryAttributeMutationRequest {
    category_id: String,
    attribute_id: String,
    required: bool,
    searchable: bool,
    filterable: bool,
    sort_order: Option<i64>,
    status: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PriceListMutationRequest {
    price_list_no: String,
    currency_code: String,
    market_code: Option<String>,
    customer_segment: Option<String>,
    starts_at: Option<String>,
    ends_at: Option<String>,
    status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CatalogResourceResponse {
    item: AdminCatalogJsonRecord,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CatalogDeleteResponse {
    deleted: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CategorySeedInitializeResponse {
    items: Vec<AdminCategorySeedInitializeSummary>,
}

pub fn admin_catalog_router_with_store(store: Arc<dyn AdminCatalogStore + Send + Sync>) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/catalog/categories",
            get(list_categories).post(create_category),
        )
        .route(
            "/backend/v3/api/catalog/categories/{category_id}",
            axum::routing::patch(update_category).delete(delete_category),
        )
        .route(
            "/backend/v3/api/catalog/category_seeds/initialize",
            axum::routing::post(initialize_category_seeds),
        )
        .route(
            "/backend/v3/api/catalog/products",
            get(list_products).post(create_product),
        )
        .route(
            "/backend/v3/api/catalog/products/{product_id}",
            axum::routing::patch(update_product).delete(delete_product),
        )
        .route(
            "/backend/v3/api/catalog/skus",
            get(list_skus).post(create_sku),
        )
        .route(
            "/backend/v3/api/catalog/skus/{sku_id}",
            axum::routing::patch(update_sku).delete(delete_sku),
        )
        .route(
            "/backend/v3/api/catalog/attributes",
            get(list_attributes).post(create_attribute),
        )
        .route(
            "/backend/v3/api/catalog/category_attributes",
            get(list_category_attributes).post(create_category_attribute),
        )
        .route(
            "/backend/v3/api/catalog/category_attributes/{binding_id}",
            axum::routing::patch(update_category_attribute).delete(delete_category_attribute),
        )
        .route(
            "/backend/v3/api/catalog/price_lists",
            get(list_price_lists).post(create_price_list),
        )
        .with_state(AdminCatalogState { store })
}

async fn list_categories(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<CatalogListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_categories(query)).await
}

async fn list_products(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<CatalogListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_products(query)).await
}

async fn list_skus(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<CatalogListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_skus(query)).await
}

async fn list_attributes(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<CatalogListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_attributes(query)).await
}

async fn list_category_attributes(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<CatalogListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| {
        state.store.list_category_attributes(query)
    })
    .await
}

async fn list_price_lists(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<CatalogListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_price_lists(query)).await
}

async fn create_category(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let request = match parse_json_body::<CategoryMutationRequest>(&body, "category") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match category_command(scoped, &headers, None, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    resource_result(
        state.store.create_category(command).await,
        "catalog category command failed",
    )
}

async fn update_category(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(category_id): Path<String>,
    body: Bytes,
) -> Response {
    let request = match parse_json_body::<CategoryMutationRequest>(&body, "category") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let category_id = match normalize_required_text(category_id, "categoryId", MAX_ID_LEN) {
        Ok(value) => value,
        Err(response) => return response,
    };
    let command = match category_command(scoped, &headers, Some(category_id), request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    resource_result(
        state.store.update_category(command).await,
        "catalog category command failed",
    )
}

async fn delete_category(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path(category_id): Path<String>,
) -> Response {
    let subject = scoped.into();
    let category_id = match normalize_required_text(category_id, "categoryId", MAX_ID_LEN) {
        Ok(value) => value,
        Err(response) => return response,
    };
    let command = DeleteAdminCategoryCommand {
        subject,
        category_id,
        request_id: match server_request_id() {
            Ok(value) => value,
            Err(response) => return response,
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.delete_category(command).await {
        Ok(deleted) => Json(success_envelope(CatalogDeleteResponse { deleted })).into_response(),
        Err(error) => domain_error_response("catalog category delete failed", error),
    }
}

async fn initialize_category_seeds(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let request = match parse_json_body::<CategorySeedInitializeRequest>(&body, "category seeds") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let datasets = match normalize_category_seed_datasets(request.datasets) {
        Ok(value) => value,
        Err(response) => return response,
    };
    let bundles = match load_admin_category_seed_bundles(&datasets) {
        Ok(value) => value,
        Err(error) => {
            return domain_error_response("category seed data is unavailable", error);
        }
    };
    let mode = match normalize_optional_text(request.mode, "mode", MAX_CODE_LEN) {
        Ok(value) => value.unwrap_or_else(|| "admin_button".to_owned()),
        Err(response) => return response,
    };
    let command = AdminCategorySeedInitializeCommand {
        subject: scoped.into(),
        datasets,
        bundles,
        mode,
        idempotency_key: match required_header(&headers, IDEMPOTENCY_KEY_HEADER) {
            Ok(value) => value,
            Err(response) => return response,
        },
        request_id: match server_request_id() {
            Ok(value) => value,
            Err(response) => return response,
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.initialize_category_seeds(command).await {
        Ok(items) => {
            Json(success_envelope(CategorySeedInitializeResponse { items })).into_response()
        }
        Err(error) => domain_error_response("category seed initialization failed", error),
    }
}

async fn create_product(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let request = match parse_json_body::<ProductMutationRequest>(&body, "product") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match product_command(scoped, &headers, None, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    resource_result(
        state.store.create_product(command).await,
        "catalog product command failed",
    )
}

async fn update_product(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(product_id): Path<String>,
    body: Bytes,
) -> Response {
    let request = match parse_json_body::<ProductMutationRequest>(&body, "product") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let product_id = match normalize_required_text(product_id, "productId", MAX_ID_LEN) {
        Ok(value) => value,
        Err(response) => return response,
    };
    let command = match product_command(scoped, &headers, Some(product_id), request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    resource_result(
        state.store.update_product(command).await,
        "catalog product command failed",
    )
}

async fn delete_product(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path(product_id): Path<String>,
) -> Response {
    let subject = scoped.into();
    let product_id = match normalize_required_text(product_id, "productId", MAX_ID_LEN) {
        Ok(value) => value,
        Err(response) => return response,
    };
    let command = DeleteAdminProductCommand {
        subject,
        product_id,
        request_id: match server_request_id() {
            Ok(value) => value,
            Err(response) => return response,
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.delete_product(command).await {
        Ok(deleted) => Json(success_envelope(CatalogDeleteResponse { deleted })).into_response(),
        Err(error) => domain_error_response("catalog product delete failed", error),
    }
}

async fn create_sku(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let request = match parse_json_body::<SkuMutationRequest>(&body, "sku") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match sku_command(scoped, &headers, None, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    resource_result(
        state.store.create_sku(command).await,
        "catalog sku command failed",
    )
}

async fn update_sku(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(sku_id): Path<String>,
    body: Bytes,
) -> Response {
    let request = match parse_json_body::<SkuMutationRequest>(&body, "sku") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let sku_id = match normalize_required_text(sku_id, "skuId", MAX_ID_LEN) {
        Ok(value) => value,
        Err(response) => return response,
    };
    let command = match sku_command(scoped, &headers, Some(sku_id), request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    resource_result(
        state.store.update_sku(command).await,
        "catalog sku command failed",
    )
}

async fn delete_sku(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path(sku_id): Path<String>,
) -> Response {
    let subject = scoped.into();
    let sku_id = match normalize_required_text(sku_id, "skuId", MAX_ID_LEN) {
        Ok(value) => value,
        Err(response) => return response,
    };
    let command = DeleteAdminSkuCommand {
        subject,
        sku_id,
        request_id: match server_request_id() {
            Ok(value) => value,
            Err(response) => return response,
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.delete_sku(command).await {
        Ok(deleted) => Json(success_envelope(CatalogDeleteResponse { deleted })).into_response(),
        Err(error) => domain_error_response("catalog sku delete failed", error),
    }
}

async fn create_attribute(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let request = match parse_json_body::<AttributeMutationRequest>(&body, "attribute") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match attribute_command(scoped, &headers, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    resource_result(
        state.store.create_attribute(command).await,
        "catalog attribute command failed",
    )
}

async fn create_category_attribute(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let request =
        match parse_json_body::<CategoryAttributeMutationRequest>(&body, "category attribute") {
            Ok(request) => request,
            Err(message) => return bad_request(message),
        };
    let command = match category_attribute_command(scoped, &headers, None, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    resource_result(
        state.store.create_category_attribute(command).await,
        "catalog category attribute command failed",
    )
}

async fn update_category_attribute(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(binding_id): Path<String>,
    body: Bytes,
) -> Response {
    let request =
        match parse_json_body::<CategoryAttributeMutationRequest>(&body, "category attribute") {
            Ok(request) => request,
            Err(message) => return bad_request(message),
        };
    let binding_id = match normalize_required_text(binding_id, "bindingId", MAX_ID_LEN) {
        Ok(value) => value,
        Err(response) => return response,
    };
    let command = match category_attribute_command(scoped, &headers, Some(binding_id), request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    resource_result(
        state.store.update_category_attribute(command).await,
        "catalog category attribute command failed",
    )
}

async fn delete_category_attribute(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path(binding_id): Path<String>,
) -> Response {
    let subject = scoped.into();
    let binding_id = match normalize_required_text(binding_id, "bindingId", MAX_ID_LEN) {
        Ok(value) => value,
        Err(response) => return response,
    };
    let command = DeleteAdminCategoryAttributeCommand {
        subject,
        binding_id,
        request_id: match server_request_id() {
            Ok(value) => value,
            Err(response) => return response,
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.delete_category_attribute(command).await {
        Ok(deleted) => Json(success_envelope(CatalogDeleteResponse { deleted })).into_response(),
        Err(error) => domain_error_response("catalog category attribute delete failed", error),
    }
}

async fn create_price_list(
    State(state): State<AdminCatalogState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let request = match parse_json_body::<PriceListMutationRequest>(&body, "price list") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match price_list_command(scoped, &headers, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    resource_result(
        state.store.create_price_list(command).await,
        "catalog price list command failed",
    )
}

async fn list_response<'a, F>(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    query: CatalogListQueryRequest,
    load: F,
) -> Response
where
    F: FnOnce(
        ListAdminCatalogRecordsQuery,
    ) -> crate::ports::AdminCatalogFuture<'a, AdminCatalogCollection>,
{
    let query = match validated_list_query(scoped, query) {
        Ok(query) => query,
        Err(response) => return response,
    };
    match load(query).await {
        Ok(collection) => json_success_list_response(
            None,
            collection.items,
            offset_page_info(collection.page_no, collection.page_size, collection.total),
        ),
        Err(error) => domain_error_response("catalog collection is unavailable", error),
    }
}

fn resource_result(result: Result<AdminCatalogJsonRecord, DomainError>, context: &str) -> Response {
    match result {
        Ok(item) => Json(success_envelope(CatalogResourceResponse { item })).into_response(),
        Err(error) => domain_error_response(context, error),
    }
}

fn validated_list_query(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    request: CatalogListQueryRequest,
) -> Result<ListAdminCatalogRecordsQuery, Response> {
    let subject = scoped.into();
    let pagination =
        parse_offset_list_query(request.page, request.page_size).map_err(bad_request)?;
    Ok(ListAdminCatalogRecordsQuery {
        subject,
        page_no: pagination.page_no,
        page_size: pagination.page_size,
        offset: pagination.offset,
        status: normalize_optional_text(request.status, "status", MAX_CODE_LEN)?
            .map(|value| value.to_ascii_lowercase()),
        parent_id: normalize_optional_text(request.parent_id, "parentId", MAX_ID_LEN)?,
        query_text: normalize_list_search_query(request.q, "q").map_err(bad_request)?,
        category_id: normalize_optional_text(request.category_id, "categoryId", MAX_ID_LEN)?,
        attribute_id: normalize_optional_text(request.attribute_id, "attributeId", MAX_ID_LEN)?,
        product_type: normalize_optional_text(request.product_type, "productType", MAX_CODE_LEN)?
            .map(|value| value.to_ascii_lowercase()),
        product_id: normalize_optional_text(request.product_id, "productId", MAX_ID_LEN)?,
        fulfillment_type: normalize_optional_text(
            request.fulfillment_type,
            "fulfillmentType",
            MAX_CODE_LEN,
        )?
        .map(|value| value.to_ascii_lowercase()),
        scope: normalize_optional_text(request.scope, "scope", MAX_CODE_LEN)?
            .map(|value| value.to_ascii_lowercase()),
        currency_code: normalize_optional_text(request.currency_code, "currencyCode", 16)?
            .map(|value| value.to_ascii_uppercase()),
        market_code: normalize_optional_text(request.market_code, "marketCode", MAX_CODE_LEN)?,
    })
}

fn category_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    category_id: Option<String>,
    request: CategoryMutationRequest,
) -> Result<AdminCategoryMutationCommand, Response> {
    Ok(AdminCategoryMutationCommand {
        subject: scoped.into(),
        category_id,
        category_no: normalize_required_text(request.category_no, "categoryNo", MAX_ID_LEN)?,
        parent_id: normalize_optional_text(request.parent_id, "parentId", MAX_ID_LEN)?,
        name: normalize_required_display_text(request.name, "name", 256)?,
        status: normalize_enum(request.status, "status", CATEGORY_STATUSES)?,
        sort_order: request.sort_order.unwrap_or(0),
        idempotency_key: required_header(headers, IDEMPOTENCY_KEY_HEADER)?,
        request_id: server_request_id()?,
        requested_at: current_timestamp_string(),
    })
}

fn normalize_category_seed_datasets(
    datasets: Option<Vec<String>>,
) -> Result<Vec<String>, Response> {
    let requested = datasets.unwrap_or_else(|| {
        DEFAULT_ADMIN_CATEGORY_SEED_DATASETS
            .iter()
            .map(|value| (*value).to_owned())
            .collect()
    });
    if requested.is_empty() {
        return Err(bad_request("datasets must not be empty"));
    }
    let mut normalized = Vec::with_capacity(requested.len());
    for dataset in requested {
        let dataset =
            normalize_required_text(dataset, "dataset", MAX_CODE_LEN)?.to_ascii_lowercase();
        if !DEFAULT_ADMIN_CATEGORY_SEED_DATASETS.contains(&dataset.as_str()) {
            return Err(bad_request(format!(
                "dataset must be one of {}",
                DEFAULT_ADMIN_CATEGORY_SEED_DATASETS.join(", ")
            )));
        }
        if !normalized.contains(&dataset) {
            normalized.push(dataset);
        }
    }
    Ok(normalized)
}

fn product_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    product_id: Option<String>,
    request: ProductMutationRequest,
) -> Result<AdminProductMutationCommand, Response> {
    Ok(AdminProductMutationCommand {
        subject: scoped.into(),
        product_id,
        spu_no: normalize_required_text(request.spu_no, "spuNo", MAX_ID_LEN)?,
        product_type: normalize_enum(request.product_type, "productType", PRODUCT_TYPES)?,
        title: normalize_required_text(request.title, "title", MAX_SHORT_TEXT_LEN)?,
        subtitle: normalize_optional_text(request.subtitle, "subtitle", MAX_SHORT_TEXT_LEN)?,
        description: normalize_optional_text(
            request.description,
            "description",
            MAX_LONG_TEXT_LEN,
        )?,
        category_ids: normalize_product_category_ids(request.category_ids)?,
        brand: normalize_optional_text(request.brand, "brand", MAX_ID_LEN)?,
        status: normalize_enum(request.status, "status", PRODUCT_STATUSES)?,
        idempotency_key: required_header(headers, IDEMPOTENCY_KEY_HEADER)?,
        request_id: server_request_id()?,
        requested_at: current_timestamp_string(),
    })
}

fn normalize_product_category_ids(
    category_ids: Option<Vec<String>>,
) -> Result<Vec<String>, Response> {
    let Some(category_ids) = category_ids else {
        return Ok(Vec::new());
    };
    let mut normalized = Vec::with_capacity(category_ids.len().min(MAX_PRODUCT_CATEGORY_BINDINGS));
    for category_id in category_ids {
        let category_id = normalize_required_text(category_id, "categoryIds", MAX_ID_LEN)?;
        if normalized.contains(&category_id) {
            continue;
        }
        normalized.push(category_id);
        if normalized.len() > MAX_PRODUCT_CATEGORY_BINDINGS {
            return Err(bad_request(format!(
                "categoryIds must contain at most {MAX_PRODUCT_CATEGORY_BINDINGS} items"
            )));
        }
    }
    Ok(normalized)
}

fn sku_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    sku_id: Option<String>,
    request: SkuMutationRequest,
) -> Result<AdminSkuMutationCommand, Response> {
    let mut attributes = Vec::new();
    for attribute in request.attributes.unwrap_or_default() {
        let _ = normalize_required_text(attribute.attribute_name, "attributeName", 256)?;
        let _ = normalize_optional_text(attribute.value_code, "valueCode", MAX_ID_LEN)?;
        let _ =
            normalize_optional_text(attribute.display_value, "displayValue", MAX_SHORT_TEXT_LEN)?;
        attributes.push(AdminSkuAttributeInput {
            attribute_id: normalize_required_text(
                attribute.attribute_id,
                "attributeId",
                MAX_ID_LEN,
            )?,
            attribute_value_id: normalize_optional_text(
                attribute.attribute_value_id,
                "attributeValueId",
                MAX_ID_LEN,
            )?,
            custom_value: normalize_optional_text(
                attribute.custom_value,
                "customValue",
                MAX_SHORT_TEXT_LEN,
            )?,
        });
    }
    Ok(AdminSkuMutationCommand {
        subject: scoped.into(),
        sku_id,
        sku_no: normalize_required_text(request.sku_no, "skuNo", MAX_ID_LEN)?,
        product_id: normalize_required_text(request.product_id, "productId", MAX_ID_LEN)?,
        title: normalize_required_text(request.title, "title", MAX_SHORT_TEXT_LEN)?,
        barcode: normalize_optional_text(request.barcode, "barcode", MAX_ID_LEN)?,
        image: normalize_optional_media_resource(request.image, "image")?,
        fulfillment_type: normalize_enum(
            request.fulfillment_type,
            "fulfillmentType",
            SKU_FULFILLMENT_TYPES,
        )?,
        tax_category: normalize_optional_text(request.tax_category, "taxCategory", MAX_ID_LEN)?,
        sales_unit: normalize_optional_text(request.sales_unit, "salesUnit", MAX_CODE_LEN)?,
        default_price_amount: normalize_optional_text(
            request.default_price_amount,
            "defaultPriceAmount",
            MAX_CODE_LEN,
        )?,
        default_currency_code: normalize_optional_text(
            request.default_currency_code,
            "defaultCurrencyCode",
            16,
        )?
        .map(|value| value.to_ascii_uppercase()),
        status: normalize_enum(request.status, "status", PRODUCT_STATUSES)?,
        attributes,
        idempotency_key: required_header(headers, IDEMPOTENCY_KEY_HEADER)?,
        request_id: server_request_id()?,
        requested_at: current_timestamp_string(),
    })
}

fn attribute_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    request: AttributeMutationRequest,
) -> Result<AdminAttributeMutationCommand, Response> {
    Ok(AdminAttributeMutationCommand {
        subject: scoped.into(),
        attribute_no: normalize_required_text(request.attribute_no, "attributeNo", MAX_ID_LEN)?,
        name: normalize_required_text(request.name, "name", 256)?,
        value_type: normalize_enum(request.value_type, "valueType", ATTRIBUTE_VALUE_TYPES)?,
        scope: normalize_enum(request.scope, "scope", ATTRIBUTE_SCOPES)?,
        required: request.required,
        searchable: request.searchable,
        filterable: request.filterable,
        status: normalize_enum(request.status, "status", CATEGORY_STATUSES)?,
        idempotency_key: required_header(headers, IDEMPOTENCY_KEY_HEADER)?,
        request_id: server_request_id()?,
        requested_at: current_timestamp_string(),
    })
}

fn category_attribute_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    binding_id: Option<String>,
    request: CategoryAttributeMutationRequest,
) -> Result<AdminCategoryAttributeMutationCommand, Response> {
    Ok(AdminCategoryAttributeMutationCommand {
        subject: scoped.into(),
        binding_id,
        category_id: normalize_required_text(request.category_id, "categoryId", MAX_ID_LEN)?,
        attribute_id: normalize_required_text(request.attribute_id, "attributeId", MAX_ID_LEN)?,
        required: request.required,
        searchable: request.searchable,
        filterable: request.filterable,
        sort_order: request.sort_order.unwrap_or(0),
        status: normalize_enum(request.status, "status", CATEGORY_STATUSES)?,
        idempotency_key: required_header(headers, IDEMPOTENCY_KEY_HEADER)?,
        request_id: server_request_id()?,
        requested_at: current_timestamp_string(),
    })
}

fn price_list_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    request: PriceListMutationRequest,
) -> Result<AdminPriceListMutationCommand, Response> {
    Ok(AdminPriceListMutationCommand {
        subject: scoped.into(),
        price_list_no: normalize_required_text(request.price_list_no, "priceListNo", MAX_ID_LEN)?,
        currency_code: normalize_required_text(request.currency_code, "currencyCode", 16)?
            .to_ascii_uppercase(),
        market_code: normalize_optional_text(request.market_code, "marketCode", MAX_CODE_LEN)?,
        customer_segment: normalize_optional_text(
            request.customer_segment,
            "customerSegment",
            MAX_ID_LEN,
        )?,
        starts_at: normalize_optional_text(request.starts_at, "startsAt", 64)?,
        ends_at: normalize_optional_text(request.ends_at, "endsAt", 64)?,
        status: normalize_enum(request.status, "status", CATEGORY_STATUSES)?,
        idempotency_key: required_header(headers, IDEMPOTENCY_KEY_HEADER)?,
        request_id: server_request_id()?,
        requested_at: current_timestamp_string(),
    })
}

fn parse_json_body<T>(body: &Bytes, resource: &str) -> Result<T, String>
where
    T: for<'de> Deserialize<'de>,
{
    serde_json::from_slice(body).map_err(|error| format!("invalid {resource} payload: {error}"))
}

fn server_request_id() -> Result<String, Response> {
    generate_server_request_id().map_err(request_id_error_response)
}

fn request_id_error_response(error: RequestIdError) -> Response {
    match error {
        RequestIdError::Invalid(message) => bad_request(message),
        RequestIdError::System(message) => {
            domain_error_response("request id generation failed", DomainError::new(message))
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
    normalize_optional_text(Some(value.to_owned()), name, MAX_ID_LEN)
}

fn normalize_enum(
    value: String,
    field_name: &str,
    allowed_values: &[&str],
) -> Result<String, Response> {
    let value = normalize_required_text(value, field_name, MAX_CODE_LEN)?.to_ascii_lowercase();
    if !allowed_values.contains(&value.as_str()) {
        return Err(bad_request(format!(
            "{field_name} must be one of {}",
            allowed_values.join(", ")
        )));
    }
    Ok(value)
}

fn normalize_required_text(
    value: String,
    field_name: &str,
    max_len: usize,
) -> Result<String, Response> {
    normalize_optional_text(Some(value), field_name, max_len)?
        .ok_or_else(|| bad_request(format!("{field_name} is required")))
}

fn normalize_required_display_text(
    value: String,
    field_name: &str,
    max_len: usize,
) -> Result<String, Response> {
    normalize_optional_display_text(Some(value), field_name, max_len)?
        .ok_or_else(|| bad_request(format!("{field_name} is required")))
}

fn normalize_optional_display_text(
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
    if value.chars().count() > max_len || value.chars().any(char::is_control) {
        return Err(bad_request(format!(
            "{field_name} must be visible text and at most {max_len} characters"
        )));
    }
    Ok(Some(value.to_owned()))
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

fn normalize_optional_media_resource(
    value: Option<Value>,
    field_name: &str,
) -> Result<Option<Value>, Response> {
    let Some(value) = value else {
        return Ok(None);
    };
    let Some(record) = value.as_object() else {
        return Err(bad_request(format!(
            "{field_name} must be a MediaResource object"
        )));
    };
    let kind = record
        .get("kind")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or_default();
    let source = record
        .get("source")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or_default();
    if kind.is_empty() || source.is_empty() {
        return Err(bad_request(format!(
            "{field_name} must include MediaResource kind and source"
        )));
    }
    let has_locator = ["id", "publicUrl", "url", "uri", "objectKey", "objectBlobId"]
        .iter()
        .any(|key| {
            record
                .get(*key)
                .and_then(Value::as_str)
                .map(str::trim)
                .is_some_and(|value| !value.is_empty())
        });
    if !has_locator {
        return Err(bad_request(format!(
            "{field_name} must include a media resource locator"
        )));
    }
    Ok(Some(Value::Object(record.clone())))
}

fn bad_request(message: impl Into<String>) -> Response {
    problem_from_wire_code("4001", message.into()).into_response()
}

fn domain_error_response(context: &str, error: DomainError) -> Response {
    if error.is_conflict() {
        return problem_from_wire_code("4090", error.to_string()).into_response();
    }
    if error.is_not_found() {
        return problem_from_wire_code("4040", error.to_string()).into_response();
    }
    problem_from_wire_code("5000", format!("{context}: {error}")).into_response()
}

fn current_timestamp_string() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0);
    format_unix_timestamp(seconds)
}

fn format_unix_timestamp(seconds: i64) -> String {
    let days = seconds.div_euclid(86_400);
    let seconds_of_day = seconds.rem_euclid(86_400);
    let (year, month, day) = civil_from_days(days);
    let hour = seconds_of_day / 3_600;
    let minute = (seconds_of_day % 3_600) / 60;
    let second = seconds_of_day % 60;
    format!("{year:04}-{month:02}-{day:02} {hour:02}:{minute:02}:{second:02}")
}

fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let days = days + 719_468;
    let era = if days >= 0 { days } else { days - 146_096 } / 146_097;
    let day_of_era = days - era * 146_097;
    let year_of_era =
        (day_of_era - day_of_era / 1_460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let year = year_of_era + era * 400;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_prime = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_prime + 2) / 5 + 1;
    let month = month_prime + if month_prime < 10 { 3 } else { -9 };
    let year = year + if month <= 2 { 1 } else { 0 };
    (year, month, day)
}
