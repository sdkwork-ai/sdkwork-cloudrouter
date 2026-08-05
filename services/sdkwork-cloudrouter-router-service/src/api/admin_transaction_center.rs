use std::sync::Arc;

use axum::extract::{Query, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use serde::Deserialize;

use crate::api::response::{
    json_success_list_response, offset_page_info, parse_offset_list_query, problem_from_wire_code,
    ApiResponseError,
};
use crate::domain::DomainError;
use crate::ports::{
    AdminTransactionCenterStore, AdminTransactionCollection, ListAdminTransactionRecordsQuery,
};

const MAX_QUERY_STATUS_LEN: usize = 32;
const MAX_ID_LEN: usize = 128;
const MAX_CODE_LEN: usize = 64;
const MAX_CURRENCY_LEN: usize = 16;
const MAX_BUSINESS_DATE_LEN: usize = 32;
const PAYMENT_PROVIDER_CODES: &[&str] = &[
    "wechat_pay",
    "alipay",
    "stripe",
    "paypal",
    "apple_pay",
    "google_pay",
    "sandbox",
];
const PAYMENT_METHOD_CODES: &[&str] = &[
    "wechat_pay",
    "alipay",
    "paypal",
    "card",
    "apple_pay",
    "google_pay",
    "wallet_balance",
    "stripe_card",
    "stripe_apple_pay",
    "stripe_google_pay",
    "stripe_alipay",
    "stripe_wechat_pay",
    "alipay_qr",
    "alipay_pc",
    "alipay_wap",
    "alipay_app",
    "alipay_jsapi",
    "wechat_native",
    "wechat_jsapi",
    "wechat_h5",
    "wechat_app",
    "sandbox_test",
];

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

pub fn admin_transaction_center_router_with_store(
    store: Arc<dyn AdminTransactionCenterStore + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/payments/providers",
            get(list_payment_providers),
        )
        .with_state(AdminTransactionCenterState { store })
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

fn collection_response(collection: AdminTransactionCollection) -> Response {
    json_success_list_response(
        None,
        collection.items,
        offset_page_info(collection.page_no, collection.page_size, collection.total),
    )
}

fn transaction_center_system_response(context: &str, error: DomainError) -> Response {
    problem_from_wire_code("5000", format!("{context}: {error}")).into_response()
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
