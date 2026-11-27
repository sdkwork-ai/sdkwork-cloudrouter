//! Administrative relay recharge surface.
//!
//! `/admin/upstream/suppliers` shows each relay supplier's cached balance and a
//! recharge action. This module owns that action end to end:
//!
//! - the supplier's relay API key is resolved from its upstream account
//!   credential by the store (never from the browser);
//! - balance and the recharge catalog are read live from the relay Open API;
//! - orders are created on the relay and only their snapshot is returned here.
//!
//! All relay traffic goes through [`UpstreamRechargeClient`], so the console
//! never talks to a relay directly and no second credential copy exists.

use axum::extract::rejection::JsonRejection;
use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use sdkwork_cloudrouter_router_service::api::admin_sql_subject::RequiredAdminSqlScopedSubject;
use sdkwork_cloudrouter_router_service::ports::AdminUpstreamSupplierItem;
use sdkwork_cloudrouter_upstream_recharge::{
    normalize_origin, RechargeBalance, RechargeClientError, RechargeConnection, RechargeOptions,
    RechargeOrder, RechargeOrderRequest, UpstreamRechargeClient,
};
use sdkwork_utils_rust::SdkWorkResultCode;
use serde::{Deserialize, Serialize};

use super::shared::{
    decode_json, domain_error, item_response, not_found, parse_id, problem_keyed, required_text,
    subject, RequestResult, UpstreamState,
};

const MAX_ORDER_ID_LENGTH: usize = 128;
const MAX_PACKAGE_ID_LENGTH: usize = 128;
const MAX_AMOUNT_LENGTH: usize = 32;
const MAX_PAYMENT_METHOD_LENGTH: usize = 64;
const MAX_IDEMPOTENCY_KEY_LENGTH: usize = 128;

pub(super) fn routes() -> Router<UpstreamState> {
    Router::new()
        .route(
            "/backend/v3/api/ai/upstream_suppliers/{supplierId}/recharge",
            get(retrieve_recharge),
        )
        .route(
            "/backend/v3/api/ai/upstream_suppliers/{supplierId}/recharge/orders",
            post(create_recharge_order),
        )
        .route(
            "/backend/v3/api/ai/upstream_suppliers/{supplierId}/recharge/orders/{orderId}",
            get(retrieve_recharge_order),
        )
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CreateRechargeOrderRequest {
    package_id: Option<String>,
    amount: Option<String>,
    payment_method: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RechargeOverviewResponse {
    id: String,
    supplier_id: String,
    supplier_name: String,
    supplier_type: String,
    account_id: Option<String>,
    account_code: Option<String>,
    balance: BalanceResponse,
    options: Vec<OptionResponse>,
    currency_code: String,
    points_unit: String,
    custom_amount_supported: bool,
    min_amount: Option<String>,
    max_amount: Option<String>,
    agreement: String,
    refreshed_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BalanceResponse {
    amount: String,
    frozen: String,
    unit: String,
    currency_code: Option<String>,
    checked_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OptionResponse {
    package_id: String,
    label: String,
    points: i64,
    bonus_points: i64,
    grant_amount: i64,
    price_amount: String,
    currency_code: String,
    recommended: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RechargeOrderResponse {
    id: String,
    order_id: String,
    order_no: String,
    out_trade_no: String,
    amount: String,
    currency_code: String,
    points: i64,
    status: String,
    next_action: String,
    cashier_url: String,
    qr_code_payload: String,
    expires_at: String,
    paid_at: Option<String>,
    created_at: String,
}

async fn retrieve_recharge(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(supplier_id): Path<String>,
) -> Response {
    let scoped = subject(scoped);
    let supplier_id = match parse_id(supplier_id, "supplierId") {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let supplier = match state.store.get_supplier(scoped.clone(), supplier_id).await {
        Ok(Some(item)) => item,
        Ok(None) => return not_found("upstream supplier"),
        Err(error) => return domain_error(error),
    };
    let binding = match state
        .store
        .load_supplier_recharge_binding(scoped.clone(), supplier_id)
        .await
    {
        Ok(Some(binding)) => binding,
        Ok(None) => return recharge_binding_missing(&supplier),
        Err(error) => return domain_error(error),
    };
    let connection = match recharge_connection(&binding.base_url, &binding.api_key) {
        Ok(connection) => connection,
        Err(error) => return recharge_client_error(error),
    };
    let (balance, options) = tokio::join!(
        state.recharge.retrieve_balance(&connection),
        state.recharge.list_options(&connection),
    );
    let balance = match balance {
        Ok(balance) => balance,
        Err(error) => return recharge_client_error(error),
    };
    let options = match options {
        Ok(options) => options,
        Err(error) => return recharge_client_error(error),
    };
    // Best-effort cache: the live value is already in the response, and a
    // failed cache write must not fail the operator's recharge dialog.
    if is_decimal_amount(&balance.amount) && !balance.checked_at.trim().is_empty() {
        if let Err(error) = state
            .store
            .record_supplier_account_balance(
                scoped,
                binding.account_id,
                balance.amount.clone(),
                balance
                    .currency_code
                    .clone()
                    .or_else(|| binding.currency_code.clone()),
                balance.checked_at.clone(),
            )
            .await
        {
            tracing::warn!(
                supplier_id,
                account_id = binding.account_id,
                error = %error,
                "failed to cache the relay balance; the live value is still returned"
            );
        }
    }
    item_response(
        StatusCode::OK,
        recharge_overview(supplier, binding, balance, options),
    )
}

async fn create_recharge_order(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path(supplier_id): Path<String>,
    headers: HeaderMap,
    payload: Result<Json<CreateRechargeOrderRequest>, JsonRejection>,
) -> Response {
    let scoped = subject(scoped);
    let supplier_id = match parse_id(supplier_id, "supplierId") {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let payload = match decode_json(payload) {
        Ok(payload) => payload,
        Err(response) => return response.into_response(),
    };
    let request = match normalized_order_request(payload) {
        Ok(request) => request,
        Err(response) => return response.into_response(),
    };
    let binding = match state
        .store
        .load_supplier_recharge_binding(scoped.clone(), supplier_id)
        .await
    {
        Ok(Some(binding)) => binding,
        Ok(None) => {
            let supplier = match state.store.get_supplier(scoped.clone(), supplier_id).await {
                Ok(Some(item)) => item,
                Ok(None) => return not_found("upstream supplier"),
                Err(error) => return domain_error(error),
            };
            return recharge_binding_missing(&supplier);
        }
        Err(error) => return domain_error(error),
    };
    let connection = match recharge_connection(&binding.base_url, &binding.api_key) {
        Ok(connection) => connection,
        Err(error) => return recharge_client_error(error),
    };
    let idempotency_key = idempotency_key(&headers).or(request.idempotency_key.clone());
    let request = RechargeOrderRequest {
        package_id: request.package_id,
        amount: request.amount,
        payment_method: request.payment_method,
        idempotency_key,
    };
    match state.recharge.create_order(&connection, request).await {
        Ok(order) => item_response(StatusCode::CREATED, recharge_order(order)),
        Err(error) => recharge_client_error(error),
    }
}

async fn retrieve_recharge_order(
    State(state): State<UpstreamState>,
    RequiredAdminSqlScopedSubject(scoped): RequiredAdminSqlScopedSubject,
    Path((supplier_id, order_id)): Path<(String, String)>,
) -> Response {
    let scoped = subject(scoped);
    let supplier_id = match parse_id(supplier_id, "supplierId") {
        Ok(value) => value,
        Err(response) => return response.into_response(),
    };
    let order_id = match required_text(order_id, "orderId", MAX_ORDER_ID_LENGTH) {
        Ok(value) => value,
        Err(problem) => return problem.into_response(),
    };
    let binding = match state
        .store
        .load_supplier_recharge_binding(scoped.clone(), supplier_id)
        .await
    {
        Ok(Some(binding)) => binding,
        Ok(None) => {
            let supplier = match state.store.get_supplier(scoped, supplier_id).await {
                Ok(Some(item)) => item,
                Ok(None) => return not_found("upstream supplier"),
                Err(error) => return domain_error(error),
            };
            return recharge_binding_missing(&supplier);
        }
        Err(error) => return domain_error(error),
    };
    let connection = match recharge_connection(&binding.base_url, &binding.api_key) {
        Ok(connection) => connection,
        Err(error) => return recharge_client_error(error),
    };
    match state.recharge.retrieve_order(&connection, &order_id).await {
        Ok(order) => item_response(StatusCode::OK, recharge_order(order)),
        Err(error) => recharge_client_error(error),
    }
}

fn normalized_order_request(
    payload: CreateRechargeOrderRequest,
) -> RequestResult<RechargeOrderRequest> {
    let package_id = optional_trimmed(payload.package_id, "packageId", MAX_PACKAGE_ID_LENGTH)?;
    let amount = optional_trimmed(payload.amount, "amount", MAX_AMOUNT_LENGTH)?;
    let payment_method = optional_trimmed(
        payload.payment_method,
        "paymentMethod",
        MAX_PAYMENT_METHOD_LENGTH,
    )?;
    if package_id.is_none() && amount.is_none() {
        return Err(problem_keyed(
            SdkWorkResultCode::MissingRequiredField,
            "validation.admin.upstream.recharge.packageOrAmount.required",
            serde_json::Value::Null,
            "one of packageId or amount is required",
        ));
    }
    if package_id.is_some() && amount.is_some() {
        return Err(problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.recharge.packageOrAmount.exclusive",
            serde_json::Value::Null,
            "packageId and amount are mutually exclusive",
        ));
    }
    if let Some(amount) = amount.as_deref() {
        sdkwork_cloudrouter_upstream_recharge::validate_custom_amount(amount).map_err(|error| {
            problem_keyed(
                SdkWorkResultCode::InvalidParameter,
                "validation.admin.upstream.recharge.amount.invalid",
                serde_json::json!({ "maxAmount": sdkwork_cloudrouter_upstream_recharge::MAX_RECHARGE_AMOUNT }),
                error.to_string(),
            )
        })?;
    }
    Ok(RechargeOrderRequest {
        package_id,
        amount,
        payment_method,
        idempotency_key: None,
    })
}

fn optional_trimmed(
    value: Option<String>,
    field: &str,
    max_length: usize,
) -> RequestResult<Option<String>> {
    match value {
        Some(value) => required_text(value, field, max_length).map(Some),
        None => Ok(None),
    }
}

fn idempotency_key(headers: &HeaderMap) -> Option<String> {
    headers
        .get("idempotency-key")
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty() && value.len() <= MAX_IDEMPOTENCY_KEY_LENGTH)
        .map(str::to_owned)
}

fn recharge_connection(
    base_url: &str,
    api_key: &str,
) -> Result<RechargeConnection, RechargeClientError> {
    let origin = normalize_origin(base_url)?;
    RechargeConnection::new(origin, api_key)
}

fn recharge_overview(
    supplier: AdminUpstreamSupplierItem,
    binding: sdkwork_cloudrouter_router_service::ports::AdminUpstreamRechargeBinding,
    balance: RechargeBalance,
    options: RechargeOptions,
) -> RechargeOverviewResponse {
    // An empty relay agreement is rendered with the console's translated copy
    // by the recharge dialog; the backend never invents English policy text.
    let agreement = options.agreement;
    RechargeOverviewResponse {
        id: supplier.id.to_string(),
        supplier_id: supplier.id.to_string(),
        supplier_name: supplier.display_name,
        supplier_type: supplier.supplier_type,
        account_id: Some(binding.account_id.to_string()),
        account_code: Some(binding.account_code),
        balance: BalanceResponse {
            amount: balance.amount,
            frozen: balance.frozen,
            unit: balance.unit,
            currency_code: balance.currency_code,
            checked_at: balance.checked_at.clone(),
        },
        options: options
            .items
            .into_iter()
            .map(|option| OptionResponse {
                package_id: option.package_id,
                label: option.label,
                points: option.points,
                bonus_points: option.bonus_points,
                grant_amount: option.grant_amount,
                price_amount: option.price_amount,
                currency_code: option.currency_code,
                recommended: option.recommended,
            })
            .collect(),
        currency_code: options.currency_code,
        points_unit: options.points_unit,
        custom_amount_supported: options.custom_amount_supported,
        min_amount: options.min_amount,
        max_amount: options.max_amount,
        agreement,
        refreshed_at: balance.checked_at,
    }
}

fn recharge_order(order: RechargeOrder) -> RechargeOrderResponse {
    RechargeOrderResponse {
        id: order.order_id.clone(),
        order_id: order.order_id,
        order_no: order.order_no,
        out_trade_no: order.out_trade_no,
        amount: order.amount,
        currency_code: order.currency_code,
        points: order.points,
        status: order.status,
        next_action: order.next_action,
        cashier_url: order.cashier_url,
        qr_code_payload: order.qr_code_payload,
        expires_at: order.expires_at,
        paid_at: order.paid_at.filter(|value| !value.trim().is_empty()),
        created_at: order.created_at,
    }
}

fn recharge_binding_missing(supplier: &AdminUpstreamSupplierItem) -> Response {
    problem_keyed(
        SdkWorkResultCode::UnprocessableEntity,
        "business.admin.upstream.recharge.apiKeyRequired",
        serde_json::json!({ "supplier": supplier.display_name }),
        "the relay recharge API key is not configured: add an upstream account credential for this supplier first",
    )
    .into_response()
}

fn recharge_client_error(error: RechargeClientError) -> Response {
    match &error {
        RechargeClientError::InvalidConnection(_) => problem_keyed(
            SdkWorkResultCode::UnprocessableEntity,
            "validation.admin.upstream.recharge.connection",
            serde_json::Value::Null,
            error.to_string(),
        )
        .into_response(),
        RechargeClientError::Unauthorized(_) => problem_keyed(
            SdkWorkResultCode::BadGateway,
            "business.admin.upstream.recharge.apiKeyRejected",
            serde_json::Value::Null,
            "the relay rejected the configured recharge API key",
        )
        .into_response(),
        RechargeClientError::Transport(_) => problem_keyed(
            SdkWorkResultCode::BadGateway,
            "business.admin.upstream.recharge.unreachable",
            serde_json::Value::Null,
            "the relay recharge endpoint is unreachable",
        )
        .into_response(),
        RechargeClientError::Relay { status, detail, .. } => problem_keyed(
            SdkWorkResultCode::BadGateway,
            "business.admin.upstream.recharge.relayRejected",
            serde_json::json!({ "relayStatus": status }),
            detail.clone(),
        )
        .into_response(),
        RechargeClientError::InvalidResponse(_) => problem_keyed(
            SdkWorkResultCode::BadGateway,
            "business.admin.upstream.recharge.invalidResponse",
            serde_json::Value::Null,
            "the relay returned an invalid recharge response",
        )
        .into_response(),
    }
}

/// Balance strings are persisted through a `numeric` cast; reject anything that
/// is not a plain decimal before it reaches SQL.
fn is_decimal_amount(value: &str) -> bool {
    let value = value.trim();
    if value.is_empty() || value.len() > 64 {
        return false;
    }
    let mut digits = 0usize;
    let mut dots = 0usize;
    for (index, character) in value.chars().enumerate() {
        match character {
            '0'..='9' => digits += 1,
            '.' if dots == 0 => dots += 1,
            '-' if index == 0 => {}
            _ => return false,
        }
    }
    digits > 0
}
