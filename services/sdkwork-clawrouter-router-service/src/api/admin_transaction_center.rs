use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, patch};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::api::request_id::{generate_server_request_id, RequestIdError};
use crate::api::response::{
    json_created_response, json_success_list_response, no_content_response, offset_page_info,
    parse_offset_list_query, problem_from_wire_code, success_envelope, ApiResponseError,
};
use crate::application::{validate_payment_secret_ref, PaymentProviderRegistryError};
use crate::domain::DomainError;
use crate::ports::{
    AdminTransactionCenterStore, AdminTransactionCenterSubject, AdminTransactionCollection,
    AdminTransactionJsonRecord, CreateAdminPaymentProviderAccountCommand,
    DeleteAdminPaymentProviderAccountCommand, ListAdminTransactionChildRecordsQuery,
    ListAdminTransactionRecordsQuery, LoadAdminTransactionRecordQuery,
    UpdateAdminPaymentProviderAccountCommand, UpdateAdminPaymentProviderAccountStatusCommand,
};

const MAX_QUERY_STATUS_LEN: usize = 32;
const MAX_MUTATION_STATUS_LEN: usize = 64;
const MAX_ID_LEN: usize = 128;
const MAX_CODE_LEN: usize = 64;
const MAX_CURRENCY_LEN: usize = 16;
const MAX_BUSINESS_DATE_LEN: usize = 32;
const MAX_TEXT_LEN: usize = 512;
const MAX_MERCHANT_ID_LEN: usize = 128;
const MAX_SECRET_REF_LEN: usize = 256;
const MAX_REQUEST_ID_LEN: usize = 128;
const IDEMPOTENCY_KEY_HEADER: &str = "Idempotency-Key";
const PAYMENT_PROVIDER_CODES: &[&str] = &[
    "wechat_pay",
    "alipay",
    "stripe",
    "paypal",
    "apple_pay",
    "google_pay",
];
const PAYMENT_METHOD_CODES: &[&str] = &[
    "wechat_pay",
    "alipay",
    "paypal",
    "card",
    "apple_pay",
    "google_pay",
    "wallet_balance",
];
const PAYMENT_PROVIDER_ENVIRONMENTS: &[&str] = &["sandbox", "production"];
const PAYMENT_CONFIG_STATUSES: &[&str] = &["active", "inactive", "disabled"];
const PAYMENT_PROVIDER_ACCOUNT_ROLES: &[&str] = &["merchant", "service_provider"];

#[derive(Clone)]
struct AdminTransactionCenterState {
    store: Arc<dyn AdminTransactionCenterStore + Send + Sync>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct TransactionCenterListQueryRequest {
    page: Option<i64>,
    page_size: Option<i64>,
    status: Option<String>,
    provider_code: Option<String>,
    provider_account_id: Option<String>,
    method_code: Option<String>,
    country_code: Option<String>,
    currency_code: Option<String>,
    order_id: Option<String>,
    intent_id: Option<String>,
    business_date: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PaymentProviderAccountMutationRequest {
    #[serde(rename = "providerCode")]
    supplier_code: String,
    account_role: Option<String>,
    merchant_id: String,
    environment: String,
    country_code: String,
    settlement_currency: String,
    secret_ref: String,
    webhook_secret_ref: Option<String>,
    certificate_ref: Option<String>,
    rotated_at: Option<String>,
    client_request_no: Option<String>,
    note: Option<String>,
    status: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PaymentProviderAccountStatusUpdateRequest {
    status: String,
    client_request_no: Option<String>,
    note: Option<String>,
}

struct NormalizedPaymentProviderAccountMutation {
    supplier_code: String,
    account_role: Option<String>,
    merchant_id: String,
    environment: String,
    country_code: String,
    settlement_currency: String,
    secret_ref: String,
    webhook_secret_ref: Option<String>,
    certificate_ref: Option<String>,
    rotated_at: Option<String>,
    client_request_no: Option<String>,
    note: Option<String>,
    status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TransactionCenterResourceResponse {
    item: AdminTransactionJsonRecord,
}

pub fn admin_transaction_center_router_with_store(
    store: Arc<dyn AdminTransactionCenterStore + Send + Sync>,
) -> Router {
    Router::new()
        .route("/backend/v3/api/orders", get(list_orders))
        .route("/backend/v3/api/orders/{order_id}", get(load_order))
        .route(
            "/backend/v3/api/orders/{order_id}/events",
            get(list_order_events),
        )
        .route("/backend/v3/api/refunds", get(list_refunds))
        .route("/backend/v3/api/refunds/{refund_id}", get(load_refund))
        .route("/backend/v3/api/fulfillments", get(list_fulfillments))
        .route("/backend/v3/api/shipments", get(list_shipments))
        .route(
            "/backend/v3/api/shipments/{shipment_id}/tracking_events",
            get(list_shipment_tracking_events),
        )
        .route(
            "/backend/v3/api/payments/providers",
            get(list_payment_providers),
        )
        .route(
            "/backend/v3/api/payments/provider_accounts",
            get(list_payment_provider_accounts).post(create_payment_provider_account),
        )
        .route(
            "/backend/v3/api/payments/provider_accounts/{provider_account_id}",
            patch(update_payment_provider_account).delete(delete_payment_provider_account),
        )
        .route(
            "/backend/v3/api/payments/provider_accounts/{provider_account_id}/status",
            patch(update_payment_provider_account_status),
        )
        .route(
            "/backend/v3/api/payments/methods",
            get(list_payment_methods),
        )
        .route(
            "/backend/v3/api/payments/channels",
            get(list_payment_channels),
        )
        .route(
            "/backend/v3/api/payments/route_rules",
            get(list_payment_route_rules),
        )
        .route(
            "/backend/v3/api/payments/intents",
            get(list_payment_intents),
        )
        .route(
            "/backend/v3/api/payments/attempts",
            get(list_payment_attempts),
        )
        .route(
            "/backend/v3/api/payments/webhook_events",
            get(list_payment_webhook_events),
        )
        .route(
            "/backend/v3/api/payments/reconciliation_runs",
            get(list_payment_reconciliation_runs),
        )
        .with_state(AdminTransactionCenterState { store })
}

async fn list_orders(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<TransactionCenterListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_orders(query)).await
}

async fn load_order(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(order_id): Path<String>,
) -> Response {
    resource_response(scoped, headers, order_id, "order id", |query| {
        state.store.load_order(query)
    })
    .await
}

async fn list_order_events(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(order_id): Path<String>,
    Query(query): Query<TransactionCenterListQueryRequest>,
) -> Response {
    child_list_response(scoped, headers, order_id, "order id", query, |query| {
        state.store.list_order_events(query)
    })
    .await
}

async fn list_refunds(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<TransactionCenterListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_refunds(query)).await
}

async fn load_refund(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(refund_id): Path<String>,
) -> Response {
    resource_response(scoped, headers, refund_id, "refund id", |query| {
        state.store.load_refund(query)
    })
    .await
}

async fn list_fulfillments(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<TransactionCenterListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_fulfillments(query)).await
}

async fn list_shipments(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<TransactionCenterListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_shipments(query)).await
}

async fn list_shipment_tracking_events(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(shipment_id): Path<String>,
    Query(query): Query<TransactionCenterListQueryRequest>,
) -> Response {
    child_list_response(
        scoped,
        headers,
        shipment_id,
        "shipment id",
        query,
        |query| state.store.list_shipment_tracking_events(query),
    )
    .await
}

async fn list_payment_providers(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<TransactionCenterListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| {
        state.store.list_payment_providers(query)
    })
    .await
}

async fn list_payment_provider_accounts(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<TransactionCenterListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| {
        state.store.list_payment_provider_accounts(query)
    })
    .await
}

async fn create_payment_provider_account(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let request = match parse_json_body::<PaymentProviderAccountMutationRequest>(
        &body,
        "payment provider account",
    ) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match build_create_payment_provider_account_command(scoped, &headers, request) {
        Ok(command) => command,
        Err(error) => return error.into_response(),
    };
    match state.store.create_payment_provider_account(command).await {
        Ok(item) => json_created_response(None, TransactionCenterResourceResponse { item }),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => transaction_center_system_response(
            "payment provider account command store is unavailable",
            error,
        ),
    }
}

async fn update_payment_provider_account(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(provider_account_id): Path<String>,
    body: Bytes,
) -> Response {
    let request = match parse_json_body::<PaymentProviderAccountMutationRequest>(
        &body,
        "payment provider account",
    ) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match build_update_payment_provider_account_command(
        scoped,
        &headers,
        provider_account_id,
        request,
    ) {
        Ok(command) => command,
        Err(error) => return error.into_response(),
    };
    match state.store.update_payment_provider_account(command).await {
        Ok(item) => {
            Json(success_envelope(TransactionCenterResourceResponse { item })).into_response()
        }
        Err(error) if error.is_not_found() => not_found_response(error.to_string()),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => transaction_center_system_response(
            "payment provider account command store is unavailable",
            error,
        ),
    }
}

async fn update_payment_provider_account_status(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(provider_account_id): Path<String>,
    body: Bytes,
) -> Response {
    let request = match parse_json_body::<PaymentProviderAccountStatusUpdateRequest>(
        &body,
        "payment provider account status",
    ) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match build_update_payment_provider_account_status_command(
        scoped,
        &headers,
        provider_account_id,
        request,
    ) {
        Ok(command) => command,
        Err(error) => return error.into_response(),
    };
    match state
        .store
        .update_payment_provider_account_status(command)
        .await
    {
        Ok(item) => {
            Json(success_envelope(TransactionCenterResourceResponse { item })).into_response()
        }
        Err(error) if error.is_not_found() => not_found_response(error.to_string()),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => transaction_center_system_response(
            "payment provider account command store is unavailable",
            error,
        ),
    }
}

async fn delete_payment_provider_account(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(provider_account_id): Path<String>,
) -> Response {
    let command = match build_delete_payment_provider_account_command(
        scoped,
        &headers,
        provider_account_id,
    ) {
        Ok(command) => command,
        Err(error) => return error.into_response(),
    };
    match state.store.delete_payment_provider_account(command).await {
        Ok(true) => no_content_response(None),
        Ok(false) => not_found_response("payment provider account was not found"),
        Err(error) if error.is_not_found() => not_found_response(error.to_string()),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => transaction_center_system_response(
            "payment provider account command store is unavailable",
            error,
        ),
    }
}

async fn list_payment_methods(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<TransactionCenterListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| {
        state.store.list_payment_methods(query)
    })
    .await
}

async fn list_payment_channels(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<TransactionCenterListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| {
        state.store.list_payment_channels(query)
    })
    .await
}

async fn list_payment_route_rules(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<TransactionCenterListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| {
        state.store.list_payment_route_rules(query)
    })
    .await
}

async fn list_payment_intents(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<TransactionCenterListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| {
        state.store.list_payment_intents(query)
    })
    .await
}

async fn list_payment_attempts(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<TransactionCenterListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| {
        state.store.list_payment_attempts(query)
    })
    .await
}

async fn list_payment_webhook_events(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<TransactionCenterListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| {
        state.store.list_payment_webhook_events(query)
    })
    .await
}

async fn list_payment_reconciliation_runs(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<TransactionCenterListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| {
        state.store.list_payment_reconciliation_runs(query)
    })
    .await
}

async fn list_response<'a, F>(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    query: TransactionCenterListQueryRequest,
    load: F,
) -> Response
where
    F: FnOnce(
        ListAdminTransactionRecordsQuery,
    ) -> crate::ports::AdminTransactionCenterFuture<'a, AdminTransactionCollection>,
{
    let query = match validated_list_query(scoped, query) {
        Ok(query) => query,
        Err(error) => return error.into_response(),
    };
    match load(query).await {
        Ok(collection) => collection_response(collection),
        Err(error) => transaction_center_system_response(
            "transaction center collection is unavailable",
            error,
        ),
    }
}

async fn child_list_response<'a, F>(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    parent_id: String,
    field_name: &'static str,
    query: TransactionCenterListQueryRequest,
    load: F,
) -> Response
where
    F: FnOnce(
        ListAdminTransactionChildRecordsQuery,
    ) -> crate::ports::AdminTransactionCenterFuture<'a, AdminTransactionCollection>,
{
    let subject = scoped.into();
    let parent_id = match normalize_required_text(parent_id, field_name, MAX_ID_LEN) {
        Ok(parent_id) => parent_id,
        Err(error) => return error.into_response(),
    };
    let pagination = match parse_offset_list_query(query.page, query.page_size) {
        Ok(pagination) => pagination,
        Err(message) => return bad_request(message),
    };
    let status = match normalize_optional_text(query.status, "status", MAX_QUERY_STATUS_LEN) {
        Ok(status) => status.map(|value| value.to_ascii_lowercase()),
        Err(error) => return error.into_response(),
    };
    match load(ListAdminTransactionChildRecordsQuery {
        subject,
        parent_id,
        page_no: pagination.page_no,
        page_size: pagination.page_size,
        offset: pagination.offset,
        status,
    })
    .await
    {
        Ok(collection) => collection_response(collection),
        Err(error) => transaction_center_system_response(
            "transaction center collection is unavailable",
            error,
        ),
    }
}

async fn resource_response<'a, F>(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    record_id: String,
    field_name: &'static str,
    load: F,
) -> Response
where
    F: FnOnce(
        LoadAdminTransactionRecordQuery,
    )
        -> crate::ports::AdminTransactionCenterFuture<'a, Option<AdminTransactionJsonRecord>>,
{
    let subject = scoped.into();
    let record_id = match normalize_required_text(record_id, field_name, MAX_ID_LEN) {
        Ok(record_id) => record_id,
        Err(error) => return error.into_response(),
    };
    match load(LoadAdminTransactionRecordQuery { subject, record_id }).await {
        Ok(Some(item)) => {
            Json(success_envelope(TransactionCenterResourceResponse { item })).into_response()
        }
        Ok(None) => not_found_response(format!("{field_name} was not found")),
        Err(error) => {
            transaction_center_system_response("transaction center resource is unavailable", error)
        }
    }
}

fn collection_response(collection: AdminTransactionCollection) -> Response {
    json_success_list_response(
        None,
        collection.items,
        offset_page_info(collection.page_no, collection.page_size, collection.total),
    )
}

fn validated_list_query(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    query: TransactionCenterListQueryRequest,
) -> Result<ListAdminTransactionRecordsQuery, ApiResponseError> {
    let subject = scoped.into();
    let pagination = match parse_offset_list_query(query.page, query.page_size) {
        Ok(pagination) => pagination,
        Err(message) => return Err(bad_request(message).into()),
    };
    Ok(ListAdminTransactionRecordsQuery {
        subject,
        page_no: pagination.page_no,
        page_size: pagination.page_size,
        offset: pagination.offset,
        status: normalize_optional_text(query.status, "status", MAX_QUERY_STATUS_LEN)?
            .map(|value| value.to_ascii_lowercase()),
        supplier_code: normalize_optional_enum(
            query.provider_code,
            "providerCode",
            MAX_CODE_LEN,
            PAYMENT_PROVIDER_CODES,
            AsciiCase::Lower,
        )?,
        provider_account_id: normalize_optional_text(
            query.provider_account_id,
            "providerAccountId",
            MAX_ID_LEN,
        )?,
        method_code: normalize_optional_enum(
            query.method_code,
            "methodCode",
            MAX_CODE_LEN,
            PAYMENT_METHOD_CODES,
            AsciiCase::Lower,
        )?,
        country_code: normalize_optional_ascii_code(
            query.country_code,
            "countryCode",
            2,
            "^[A-Z]{2}$",
        )?,
        currency_code: normalize_optional_ascii_code(
            query.currency_code,
            "currencyCode",
            3,
            "^[A-Z]{3}$",
        )?,
        order_id: normalize_optional_text(query.order_id, "orderId", MAX_ID_LEN)?,
        intent_id: normalize_optional_text(query.intent_id, "intentId", MAX_ID_LEN)?,
        business_date: normalize_optional_text(
            query.business_date,
            "businessDate",
            MAX_BUSINESS_DATE_LEN,
        )?,
    })
}

fn build_create_payment_provider_account_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    request: PaymentProviderAccountMutationRequest,
) -> Result<CreateAdminPaymentProviderAccountCommand, ApiResponseError> {
    let subject = scoped.into();
    let normalized = normalize_payment_provider_account_mutation(request)?;
    let idempotency_key = required_header(headers, IDEMPOTENCY_KEY_HEADER)?;
    let account_no = generate_payment_provider_account_no(&subject, &idempotency_key);
    if !is_ascii_identifier(&account_no) {
        return Err(transaction_center_system_response(
            "payment provider account number generation failed",
            DomainError::new("generated accountNo violates the provider account contract"),
        )
        .into());
    }

    Ok(CreateAdminPaymentProviderAccountCommand {
        subject,
        account_no,
        supplier_code: normalized.supplier_code,
        account_role: normalized.account_role,
        merchant_id: normalized.merchant_id,
        environment: normalized.environment,
        country_code: normalized.country_code,
        settlement_currency: normalized.settlement_currency,
        secret_ref: normalized.secret_ref,
        webhook_secret_ref: normalized.webhook_secret_ref,
        certificate_ref: normalized.certificate_ref,
        rotated_at: normalized.rotated_at,
        client_request_no: normalized.client_request_no,
        note: normalized.note,
        status: normalized.status,
        idempotency_key,
        request_id: Some(server_request_id()?),
        requested_at: current_timestamp_string(),
    })
}

fn build_update_payment_provider_account_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    provider_account_id: String,
    request: PaymentProviderAccountMutationRequest,
) -> Result<UpdateAdminPaymentProviderAccountCommand, ApiResponseError> {
    let subject = scoped.into();
    let provider_account_id =
        normalize_required_text(provider_account_id, "providerAccountId", MAX_ID_LEN)?;
    let normalized = normalize_payment_provider_account_mutation(request)?;

    Ok(UpdateAdminPaymentProviderAccountCommand {
        subject,
        provider_account_id,
        supplier_code: normalized.supplier_code,
        account_role: normalized.account_role,
        merchant_id: normalized.merchant_id,
        environment: normalized.environment,
        country_code: normalized.country_code,
        settlement_currency: normalized.settlement_currency,
        secret_ref: normalized.secret_ref,
        webhook_secret_ref: normalized.webhook_secret_ref,
        certificate_ref: normalized.certificate_ref,
        rotated_at: normalized.rotated_at,
        client_request_no: normalized.client_request_no,
        note: normalized.note,
        status: normalized.status,
        idempotency_key: required_header(headers, IDEMPOTENCY_KEY_HEADER)?,
        request_id: Some(server_request_id()?),
        requested_at: current_timestamp_string(),
    })
}

fn build_update_payment_provider_account_status_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    provider_account_id: String,
    request: PaymentProviderAccountStatusUpdateRequest,
) -> Result<UpdateAdminPaymentProviderAccountStatusCommand, ApiResponseError> {
    let subject = scoped.into();
    let provider_account_id =
        normalize_required_text(provider_account_id, "providerAccountId", MAX_ID_LEN)?;
    let status = normalize_enum(
        request.status,
        "status",
        MAX_MUTATION_STATUS_LEN,
        PAYMENT_CONFIG_STATUSES,
        AsciiCase::Lower,
    )?;
    Ok(UpdateAdminPaymentProviderAccountStatusCommand {
        subject,
        provider_account_id,
        status,
        client_request_no: normalize_optional_text(
            request.client_request_no,
            "clientRequestNo",
            MAX_ID_LEN,
        )?,
        note: normalize_optional_text(request.note, "note", MAX_TEXT_LEN)?,
        idempotency_key: required_header(headers, IDEMPOTENCY_KEY_HEADER)?,
        request_id: Some(server_request_id()?),
        requested_at: current_timestamp_string(),
    })
}

fn build_delete_payment_provider_account_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: &HeaderMap,
    provider_account_id: String,
) -> Result<DeleteAdminPaymentProviderAccountCommand, ApiResponseError> {
    Ok(DeleteAdminPaymentProviderAccountCommand {
        subject: scoped.into(),
        provider_account_id: normalize_required_text(
            provider_account_id,
            "providerAccountId",
            MAX_ID_LEN,
        )?,
        request_id: Some(server_request_id()?),
        requested_at: current_timestamp_string(),
    })
}

fn normalize_payment_provider_account_mutation(
    request: PaymentProviderAccountMutationRequest,
) -> Result<NormalizedPaymentProviderAccountMutation, ApiResponseError> {
    let supplier_code = normalize_enum(
        request.supplier_code,
        "providerCode",
        MAX_CODE_LEN,
        PAYMENT_PROVIDER_CODES,
        AsciiCase::Lower,
    )?;
    let account_role = normalize_optional_enum(
        request.account_role,
        "accountRole",
        MAX_CODE_LEN,
        PAYMENT_PROVIDER_ACCOUNT_ROLES,
        AsciiCase::Lower,
    )?;
    let environment = normalize_enum(
        request.environment,
        "environment",
        MAX_CODE_LEN,
        PAYMENT_PROVIDER_ENVIRONMENTS,
        AsciiCase::Lower,
    )?;
    let country_code = normalize_ascii_code(request.country_code, "countryCode", 2, "^[A-Z]{2}$")?;
    let settlement_currency = normalize_ascii_code(
        request.settlement_currency,
        "settlementCurrency",
        3,
        "^[A-Z]{3}$",
    )?;
    let status = normalize_enum(
        request.status,
        "status",
        MAX_MUTATION_STATUS_LEN,
        PAYMENT_CONFIG_STATUSES,
        AsciiCase::Lower,
    )?;
    let secret_ref = normalize_required_text(request.secret_ref, "secretRef", MAX_SECRET_REF_LEN)?;
    validate_secret_ref(&supplier_code, &secret_ref)?;
    let webhook_secret_ref = normalize_optional_text(
        request.webhook_secret_ref,
        "webhookSecretRef",
        MAX_SECRET_REF_LEN,
    )?;
    if let Some(secret_ref) = webhook_secret_ref.as_deref() {
        validate_secret_ref(&supplier_code, secret_ref)?;
    }
    let certificate_ref = normalize_optional_text(
        request.certificate_ref,
        "certificateRef",
        MAX_SECRET_REF_LEN,
    )?;
    if let Some(secret_ref) = certificate_ref.as_deref() {
        validate_secret_ref(&supplier_code, secret_ref)?;
    }
    Ok(NormalizedPaymentProviderAccountMutation {
        supplier_code,
        account_role,
        merchant_id: normalize_required_text(
            request.merchant_id,
            "merchantId",
            MAX_MERCHANT_ID_LEN,
        )?,
        environment,
        country_code,
        settlement_currency,
        secret_ref,
        webhook_secret_ref,
        certificate_ref,
        rotated_at: normalize_optional_text(request.rotated_at, "rotatedAt", MAX_CODE_LEN)?,
        client_request_no: normalize_optional_text(
            request.client_request_no,
            "clientRequestNo",
            MAX_ID_LEN,
        )?,
        note: normalize_optional_text(request.note, "note", MAX_TEXT_LEN)?,
        status,
    })
}

fn generate_payment_provider_account_no(
    subject: &AdminTransactionCenterSubject,
    idempotency_key: &str,
) -> String {
    let mut hasher = Sha256::new();
    hasher.update(b"payment-provider-account-no:v1");
    for part in [
        subject.tenant_id.to_string(),
        subject.organization_id.to_string(),
        idempotency_key.to_owned(),
    ] {
        hasher.update([0]);
        hasher.update(part.as_bytes());
    }
    let digest = hasher.finalize();
    format!("pacc-{}", hex::encode(&digest[..16]))
}

fn is_ascii_identifier(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= MAX_ID_LEN
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-')
}

fn validate_secret_ref(supplier_code: &str, value: &str) -> Result<(), ApiResponseError> {
    validate_payment_secret_ref(supplier_code, value).map_err(|error| match error {
        PaymentProviderRegistryError::InvalidProviderRequest { message, .. } => {
            bad_request(message).into()
        }
        other => bad_request(other.to_string()).into(),
    })
}

fn parse_json_body<T>(body: &Bytes, resource: &str) -> Result<T, String>
where
    T: for<'de> Deserialize<'de>,
{
    serde_json::from_slice(body).map_err(|error| format!("invalid {resource} payload: {error}"))
}
fn server_request_id() -> Result<String, ApiResponseError> {
    generate_server_request_id().map_err(|error| request_id_error_response(error).into())
}

fn request_id_error_response(error: RequestIdError) -> Response {
    match error {
        RequestIdError::Invalid(message) => bad_request(message),
        RequestIdError::System(message) => transaction_center_system_response(
            "request id generation failed",
            DomainError::new(message),
        ),
    }
}

fn required_header(headers: &HeaderMap, name: &str) -> Result<String, ApiResponseError> {
    optional_header(headers, name)?
        .ok_or_else(|| bad_request(format!("{name} header is required")).into())
}

fn optional_header(headers: &HeaderMap, name: &str) -> Result<Option<String>, ApiResponseError> {
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
) -> Result<String, ApiResponseError> {
    normalize_optional_text(Some(value), field_name, max_len)?
        .ok_or_else(|| bad_request(format!("{field_name} is required")).into())
}

fn normalize_optional_text(
    value: Option<String>,
    field_name: &str,
    max_len: usize,
) -> Result<Option<String>, ApiResponseError> {
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
        ))
        .into());
    }
    Ok(Some(value.to_owned()))
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AsciiCase {
    Lower,
}

fn normalize_enum(
    value: String,
    field_name: &str,
    max_len: usize,
    allowed_values: &[&str],
    ascii_case: AsciiCase,
) -> Result<String, ApiResponseError> {
    let value = normalize_required_text(value, field_name, max_len)?;
    let value = match ascii_case {
        AsciiCase::Lower => value.to_ascii_lowercase(),
    };
    if !allowed_values.contains(&value.as_str()) {
        return Err(bad_request(format!(
            "{field_name} must be one of {}",
            allowed_values.join(", ")
        ))
        .into());
    }
    Ok(value)
}

fn normalize_optional_enum(
    value: Option<String>,
    field_name: &str,
    max_len: usize,
    allowed_values: &[&str],
    ascii_case: AsciiCase,
) -> Result<Option<String>, ApiResponseError> {
    let Some(value) = normalize_optional_text(value, field_name, max_len)? else {
        return Ok(None);
    };
    let value = match ascii_case {
        AsciiCase::Lower => value.to_ascii_lowercase(),
    };
    if !allowed_values.contains(&value.as_str()) {
        return Err(bad_request(format!(
            "{field_name} must be one of {}",
            allowed_values.join(", ")
        ))
        .into());
    }
    Ok(Some(value))
}

fn normalize_ascii_code(
    value: String,
    field_name: &str,
    exact_len: usize,
    pattern: &str,
) -> Result<String, ApiResponseError> {
    let value = normalize_required_text(value, field_name, MAX_CURRENCY_LEN)?.to_ascii_uppercase();
    if value.len() != exact_len || !value.bytes().all(|byte| byte.is_ascii_uppercase()) {
        return Err(bad_request(format!("{field_name} must match {pattern}")).into());
    }
    Ok(value)
}

fn normalize_optional_ascii_code(
    value: Option<String>,
    field_name: &str,
    exact_len: usize,
    pattern: &str,
) -> Result<Option<String>, ApiResponseError> {
    let Some(value) = value else {
        return Ok(None);
    };
    normalize_ascii_code(value, field_name, exact_len, pattern).map(Some)
}

fn bad_request(message: impl Into<String>) -> Response {
    problem_from_wire_code("4001", message.into()).into_response()
}

fn not_found_response(message: impl Into<String>) -> Response {
    problem_from_wire_code("4040", message.into()).into_response()
}

fn conflict_response(error: DomainError) -> Response {
    problem_from_wire_code("4090", error.to_string()).into_response()
}

fn transaction_center_system_response(context: &str, error: DomainError) -> Response {
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
