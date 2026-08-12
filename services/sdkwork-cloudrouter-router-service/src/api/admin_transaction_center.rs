use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, patch};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use crate::api::request_id::{generate_server_request_id, RequestIdError};
use crate::api::response::{
    json_success_list_response, offset_page_info, parse_offset_list_query, problem_from_wire_code,
    success_envelope, ApiResponseError,
};
use crate::domain::DomainError;
use crate::ports::{
    AdminTransactionCenterStore, AdminTransactionCollection, AdminTransactionJsonRecord,
    ListAdminTransactionRecordsQuery, UpdatePaymentProviderCommand,
};

const MAX_QUERY_STATUS_LEN: usize = 32;
const MAX_ID_LEN: usize = 128;
const MAX_CODE_LEN: usize = 64;
const MAX_CURRENCY_LEN: usize = 16;
const MAX_BUSINESS_DATE_LEN: usize = 32;
const MAX_PROVIDER_DISPLAY_NAME_LEN: usize = 120;
const MAX_REASON_LEN: usize = 512;
const MAX_I18N_LOCALE_KEY_LEN: usize = 32;
const MAX_I18N_VALUE_LEN: usize = 64;
const MAX_I18N_LOCALES: usize = 8;
const PAYMENT_PROVIDER_STATUSES: &[&str] = &["active", "inactive", "disabled"];
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct UpdatePaymentProviderRequest {
    display_name: Option<String>,
    display_name_i18n: Option<serde_json::Value>,
    sort_order: Option<i64>,
    status: Option<String>,
    reason: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PaymentProviderMutationResponse {
    provider: AdminTransactionJsonRecord,
    request_id: String,
}

pub fn admin_transaction_center_router_with_store(
    store: Arc<dyn AdminTransactionCenterStore + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/payments/providers",
            get(list_payment_providers),
        )
        .route(
            "/backend/v3/api/payments/providers/{provider_id}",
            patch(update_payment_provider),
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

async fn update_payment_provider(
    State(state): State<AdminTransactionCenterState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path(provider_id): Path<String>,
    Json(request): Json<UpdatePaymentProviderRequest>,
) -> Response {
    let command = match validated_provider_update_command(scoped, provider_id, request) {
        Ok(command) => command,
        Err(error) => return error.into_response(),
    };
    let request_id = response_request_id(command.request_id.as_deref());
    match state.store.update_payment_provider(command).await {
        Ok(provider) => Json(success_envelope(PaymentProviderMutationResponse {
            provider,
            request_id,
        }))
        .into_response(),
        Err(error) => {
            transaction_center_write_response("payment provider update is unavailable", error)
        }
    }
}

fn validated_provider_update_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    provider_id: String,
    request: UpdatePaymentProviderRequest,
) -> Result<UpdatePaymentProviderCommand, ApiResponseError> {
    let subject = scoped.into();
    let display_name = match request.display_name {
        Some(value) => {
            normalize_optional_text(Some(value), "displayName", MAX_PROVIDER_DISPLAY_NAME_LEN)?
        }
        None => None,
    };
    let display_name_i18n = normalize_display_name_i18n(request.display_name_i18n)?;
    let sort_order = match request.sort_order {
        Some(value) => match i32::try_from(value) {
            Ok(value) => Some(value),
            Err(_) => return Err(bad_request("sortOrder must be an integer").into()),
        },
        None => None,
    };
    let status = match request.status {
        Some(value) => {
            if let Some(value) =
                normalize_optional_text(Some(value), "status", MAX_QUERY_STATUS_LEN)?
            {
                let value = value.to_ascii_lowercase();
                if !PAYMENT_PROVIDER_STATUSES.contains(&value.as_str()) {
                    return Err(bad_request(format!(
                        "status must be one of {}",
                        PAYMENT_PROVIDER_STATUSES.join(", ")
                    ))
                    .into());
                }
                Some(value)
            } else {
                None
            }
        }
        None => None,
    };
    let reason = normalize_required_text(request.reason, "reason", MAX_REASON_LEN)?;
    if display_name.is_none()
        && display_name_i18n.is_none()
        && sort_order.is_none()
        && status.is_none()
    {
        return Err(bad_request(
            "at least one of displayName, displayNameI18n, sortOrder, or status is required",
        )
        .into());
    }
    Ok(UpdatePaymentProviderCommand {
        subject,
        provider_id: normalize_required_text(provider_id, "providerId", MAX_ID_LEN)?,
        display_name,
        display_name_i18n,
        sort_order,
        status,
        reason,
        request_id: Some(server_request_id()?),
    })
}

/// Localized display names map (locale key -> name). Keys are visible ASCII
/// (e.g. `zh-CN`, `en-US`); values are non-empty and length-bounded so the
/// audit trail and list projections stay readable.
fn normalize_display_name_i18n(
    value: Option<serde_json::Value>,
) -> Result<Option<serde_json::Value>, ApiResponseError> {
    let Some(value) = value else {
        return Ok(None);
    };
    let Some(object) = value.as_object() else {
        return Err(bad_request("displayNameI18n must be an object").into());
    };
    if object.is_empty() {
        return Err(bad_request("displayNameI18n must not be empty").into());
    }
    if object.len() > MAX_I18N_LOCALES {
        return Err(bad_request(format!(
            "displayNameI18n supports at most {MAX_I18N_LOCALES} locales"
        ))
        .into());
    }
    for (key, item) in object {
        if key.chars().count() > MAX_I18N_LOCALE_KEY_LEN
            || !key.bytes().all(|byte| (0x20..=0x7e).contains(&byte))
        {
            return Err(bad_request(format!(
                "displayNameI18n locale keys must be visible ASCII and at most {MAX_I18N_LOCALE_KEY_LEN} characters"
            ))
            .into());
        }
        let Some(text) = item.as_str() else {
            return Err(bad_request("displayNameI18n values must be strings").into());
        };
        if text.trim().is_empty() || text.chars().count() > MAX_I18N_VALUE_LEN {
            return Err(bad_request(format!(
                "displayNameI18n values must be non-empty and at most {MAX_I18N_VALUE_LEN} characters"
            ))
            .into());
        }
    }
    Ok(Some(value))
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

fn transaction_center_write_response(context: &str, error: DomainError) -> Response {
    if error.is_not_found() {
        return problem_from_wire_code("4040", error.to_string()).into_response();
    }
    transaction_center_system_response(context, error)
}

fn server_request_id() -> Result<String, ApiResponseError> {
    generate_server_request_id().map_err(|error| {
        let response = match error {
            RequestIdError::Invalid(message) => bad_request(message),
            RequestIdError::System(message) => transaction_center_system_response(
                "request id generation failed",
                DomainError::new(message),
            ),
        };
        response.into()
    })
}

fn response_request_id(value: Option<&str>) -> String {
    value
        .filter(|item| !item.trim().is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| "transaction-center-request".to_owned())
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
