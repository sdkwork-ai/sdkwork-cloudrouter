use std::sync::Arc;

use crate::api::app_sql_subject::RequiredAppSqlScopedSubject;
use axum::body::Bytes;
use axum::extract::{Path, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use crate::api::response::{json_created_response, problem_from_wire_code, success_envelope};
use crate::application::{
    resolve_payment_provider_registry_for_deployment, EntityUuidGenerator,
    InMemoryPaymentIntentRuntimeStore, PaymentAggregateRuntimeStore, PaymentIntentRuntimeRecord,
    PaymentIntentRuntimeService, PaymentProviderRegistry, PaymentRefundRuntimeRecord,
    PaymentRefundRuntimeService, RuntimeCancelPaymentIntentCommand, RuntimeCancelRefundCommand,
    RuntimeCapturePaymentIntentCommand, RuntimeConfirmPaymentIntentCommand,
    RuntimeCreatePaymentIntentCommand, RuntimeCreateRefundCommand, RuntimeCreateRefundItemCommand,
};
use crate::infrastructure::OsApiKeySecretGenerator;

const IDEMPOTENCY_KEY_HEADER: &str = "Idempotency-Key";

#[derive(Clone)]
struct PaymentAggregateState {
    store: Arc<dyn PaymentAggregateRuntimeStore>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    provider_registry: PaymentProviderRegistry,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PaymentIntentCreateRequest {
    merchant_order_no: String,
    amount: MoneyAmountRequest,
    subject: String,
    supplier_code: String,
    payment_method: Option<String>,
    scene: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PaymentCaptureRequest {
    amount: Option<MoneyAmountRequest>,
    final_capture: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct PaymentCancelRequest {
    reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RefundCancelRequest {
    reason: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PaymentRefundCreateRequest {
    payment_intent_id: String,
    merchant_refund_no: String,
    amount: MoneyAmountRequest,
    reason: String,
    #[serde(default)]
    items: Vec<PaymentRefundItemRequest>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PaymentRefundItemRequest {
    order_item_id: String,
    quantity: i64,
    refund_amount: MoneyAmountRequest,
    tax_refund_amount: Option<MoneyAmountRequest>,
    shipping_refund_amount: Option<MoneyAmountRequest>,
}

#[derive(Debug, Deserialize)]
struct MoneyAmountRequest {
    currency: String,
    value: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PaymentIntentResultData {
    item: PaymentIntentResponse,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PaymentRefundResultData {
    item: PaymentRefundResponse,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PaymentIntentResponse {
    id: String,
    merchant_order_no: String,
    amount: MoneyAmountResponse,
    subject: String,
    supplier_code: String,
    payment_method: String,
    status: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PaymentRefundResponse {
    id: String,
    payment_intent_id: String,
    merchant_refund_no: String,
    amount: MoneyAmountResponse,
    supplier_code: String,
    status: String,
    reason: String,
    items: Vec<PaymentRefundItemResponse>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PaymentRefundItemResponse {
    id: String,
    order_item_id: String,
    quantity: i64,
    refund_amount: MoneyAmountResponse,
    tax_refund_amount: MoneyAmountResponse,
    shipping_refund_amount: MoneyAmountResponse,
    created_at: String,
}

#[derive(Debug, Serialize)]
struct MoneyAmountResponse {
    currency: String,
    value: String,
}

pub fn payment_aggregate_router() -> Router {
    payment_aggregate_router_with_runtime_store_and_registry(
        Arc::new(InMemoryPaymentIntentRuntimeStore::default()),
        Arc::new(OsApiKeySecretGenerator),
        resolve_payment_provider_registry_for_deployment(),
    )
}

pub fn payment_aggregate_router_with_runtime_store(
    store: Arc<dyn PaymentAggregateRuntimeStore>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    payment_aggregate_router_with_runtime_store_and_registry(
        store,
        entity_uuid_generator,
        resolve_payment_provider_registry_for_deployment(),
    )
}

pub fn payment_aggregate_router_with_runtime_store_and_registry(
    store: Arc<dyn PaymentAggregateRuntimeStore>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    provider_registry: PaymentProviderRegistry,
) -> Router {
    Router::new()
        .route("/payments/v3/payment_intents", post(create_payment_intent))
        .route("/payments/v3/refunds", post(create_refund))
        .route(
            "/payments/v3/refunds/{refund_id}/cancel",
            post(cancel_refund),
        )
        .route(
            "/payments/v3/payment_intents/{payment_intent_id}/confirm",
            post(confirm_payment_intent),
        )
        .route(
            "/payments/v3/payment_intents/{payment_intent_id}/capture",
            post(capture_payment_intent),
        )
        .route(
            "/payments/v3/payment_intents/{payment_intent_id}/cancel",
            post(cancel_payment_intent),
        )
        .with_state(PaymentAggregateState {
            store,
            entity_uuid_generator,
            provider_registry,
        })
}

async fn cancel_refund(
    State(state): State<PaymentAggregateState>,
    RequiredAppSqlScopedSubject(scope): RequiredAppSqlScopedSubject,
    headers: HeaderMap,
    Path(refund_id): Path<String>,
    body: Bytes,
) -> Response {
    let subject = scope;
    let idempotency_key = match required_header(&headers, IDEMPOTENCY_KEY_HEADER) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let request: RefundCancelRequest = match serde_json::from_slice(&body) {
        Ok(request) => request,
        Err(error) => {
            return bad_request(format!("refund cancel request body is invalid: {error}"));
        }
    };
    let service = PaymentRefundRuntimeService::new(
        state.store.as_ref(),
        state.provider_registry.clone(),
        state.entity_uuid_generator.as_ref(),
    );

    match service
        .cancel_refund(RuntimeCancelRefundCommand {
            tenant_id: subject.tenant_id.to_string(),
            refund_id,
            reason: request.reason,
            idempotency_key,
            requested_at: "2026-05-29T00:00:00Z".to_owned(),
        })
        .await
    {
        Ok(refund) => Json(success_envelope(refund_response_data(refund))).into_response(),
        Err(error) if error.is_conflict() => conflict(error.to_string()),
        Err(error) if error.is_not_found() => not_found(error.to_string()),
        Err(error) => unprocessable(error.to_string()),
    }
}

async fn create_refund(
    State(state): State<PaymentAggregateState>,
    RequiredAppSqlScopedSubject(scope): RequiredAppSqlScopedSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scope;
    let idempotency_key = match required_header(&headers, IDEMPOTENCY_KEY_HEADER) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let request: PaymentRefundCreateRequest = match serde_json::from_slice(&body) {
        Ok(request) => request,
        Err(error) => {
            return bad_request(format!("payment refund request body is invalid: {error}"));
        }
    };
    let service = PaymentRefundRuntimeService::new(
        state.store.as_ref(),
        state.provider_registry.clone(),
        state.entity_uuid_generator.as_ref(),
    );
    let currency_code = request.amount.currency.clone();
    let items = match refund_item_commands(request.items, &currency_code) {
        Ok(items) => items,
        Err(message) => return bad_request(message),
    };

    match service
        .create_refund(RuntimeCreateRefundCommand {
            tenant_id: subject.tenant_id.to_string(),
            payment_intent_id: request.payment_intent_id,
            merchant_refund_no: request.merchant_refund_no,
            amount: request.amount.value,
            currency_code,
            reason: request.reason,
            items,
            idempotency_key,
            requested_at: "2026-05-29T00:00:00Z".to_owned(),
        })
        .await
    {
        Ok(refund) => json_created_response(None, refund_response_data(refund)),
        Err(error) if error.is_conflict() => conflict(error.to_string()),
        Err(error) if error.is_not_found() => not_found(error.to_string()),
        Err(error) => unprocessable(error.to_string()),
    }
}

async fn create_payment_intent(
    State(state): State<PaymentAggregateState>,
    RequiredAppSqlScopedSubject(scope): RequiredAppSqlScopedSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scope;
    let idempotency_key = match required_header(&headers, IDEMPOTENCY_KEY_HEADER) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let request: PaymentIntentCreateRequest = match serde_json::from_slice(&body) {
        Ok(request) => request,
        Err(error) => {
            return bad_request(format!("payment intent request body is invalid: {error}"));
        }
    };
    let service = PaymentIntentRuntimeService::new(
        state.store.as_ref(),
        state.provider_registry.clone(),
        state.entity_uuid_generator.as_ref(),
    );

    match service
        .create_payment_intent(RuntimeCreatePaymentIntentCommand {
            tenant_id: subject.tenant_id.to_string(),
            organization_id: Some(subject.organization_id.to_string()),
            owner_user_id: subject.user_id.to_string(),
            merchant_order_no: request.merchant_order_no,
            amount: request.amount.value,
            currency_code: request.amount.currency,
            subject: request.subject,
            supplier_code: request.supplier_code,
            payment_method: request.payment_method,
            scene: request.scene,
            idempotency_key,
            requested_at: "2026-05-29T00:00:00Z".to_owned(),
        })
        .await
    {
        Ok(intent) => json_created_response(None, intent_response_data(intent)),
        Err(error) if error.is_conflict() => conflict(error.to_string()),
        Err(error) => unprocessable(error.to_string()),
    }
}

async fn confirm_payment_intent(
    State(state): State<PaymentAggregateState>,
    RequiredAppSqlScopedSubject(scope): RequiredAppSqlScopedSubject,
    headers: HeaderMap,
    Path(payment_intent_id): Path<String>,
    body: Bytes,
) -> Response {
    let subject = scope;
    let idempotency_key = match required_header(&headers, IDEMPOTENCY_KEY_HEADER) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    if let Err(error) = serde_json::from_slice::<serde_json::Value>(&body) {
        return bad_request(format!(
            "payment intent confirm request body is invalid: {error}"
        ));
    }
    let service = PaymentIntentRuntimeService::new(
        state.store.as_ref(),
        state.provider_registry.clone(),
        state.entity_uuid_generator.as_ref(),
    );

    match service
        .confirm_payment_intent(RuntimeConfirmPaymentIntentCommand {
            tenant_id: subject.tenant_id.to_string(),
            payment_intent_id,
            idempotency_key,
            requested_at: "2026-05-29T00:00:00Z".to_owned(),
        })
        .await
    {
        Ok(intent) => Json(success_envelope(intent_response_data(intent))).into_response(),
        Err(error) if error.is_not_found() => not_found(error.to_string()),
        Err(error) => unprocessable(error.to_string()),
    }
}

async fn capture_payment_intent(
    State(state): State<PaymentAggregateState>,
    RequiredAppSqlScopedSubject(scope): RequiredAppSqlScopedSubject,
    headers: HeaderMap,
    Path(payment_intent_id): Path<String>,
    body: Bytes,
) -> Response {
    let subject = scope;
    let idempotency_key = match required_header(&headers, IDEMPOTENCY_KEY_HEADER) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let request: PaymentCaptureRequest = match serde_json::from_slice(&body) {
        Ok(request) => request,
        Err(error) => {
            return bad_request(format!(
                "payment intent capture request body is invalid: {error}"
            ));
        }
    };
    let service = PaymentIntentRuntimeService::new(
        state.store.as_ref(),
        state.provider_registry.clone(),
        state.entity_uuid_generator.as_ref(),
    );

    match service
        .capture_payment_intent(RuntimeCapturePaymentIntentCommand {
            tenant_id: subject.tenant_id.to_string(),
            payment_intent_id,
            amount: request.amount.map(|amount| amount.value),
            final_capture: request.final_capture.unwrap_or(true),
            idempotency_key,
            requested_at: "2026-05-29T00:00:00Z".to_owned(),
        })
        .await
    {
        Ok(intent) => Json(success_envelope(intent_response_data(intent))).into_response(),
        Err(error) if error.is_not_found() => not_found(error.to_string()),
        Err(error) => unprocessable(error.to_string()),
    }
}

async fn cancel_payment_intent(
    State(state): State<PaymentAggregateState>,
    RequiredAppSqlScopedSubject(scope): RequiredAppSqlScopedSubject,
    headers: HeaderMap,
    Path(payment_intent_id): Path<String>,
    body: Bytes,
) -> Response {
    let subject = scope;
    let idempotency_key = match required_header(&headers, IDEMPOTENCY_KEY_HEADER) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let request: PaymentCancelRequest = match serde_json::from_slice(&body) {
        Ok(request) => request,
        Err(error) => {
            return bad_request(format!(
                "payment intent cancel request body is invalid: {error}"
            ));
        }
    };
    let service = PaymentIntentRuntimeService::new(
        state.store.as_ref(),
        state.provider_registry.clone(),
        state.entity_uuid_generator.as_ref(),
    );

    match service
        .cancel_payment_intent(RuntimeCancelPaymentIntentCommand {
            tenant_id: subject.tenant_id.to_string(),
            payment_intent_id,
            reason: request.reason,
            idempotency_key,
            requested_at: "2026-05-29T00:00:00Z".to_owned(),
        })
        .await
    {
        Ok(intent) => Json(success_envelope(intent_response_data(intent))).into_response(),
        Err(error) if error.is_not_found() => not_found(error.to_string()),
        Err(error) => unprocessable(error.to_string()),
    }
}

fn intent_response_data(intent: PaymentIntentRuntimeRecord) -> PaymentIntentResultData {
    PaymentIntentResultData {
        item: PaymentIntentResponse {
            id: intent.id,
            merchant_order_no: intent.merchant_order_no,
            amount: MoneyAmountResponse {
                currency: intent.currency_code,
                value: intent.amount,
            },
            subject: intent.subject,
            supplier_code: intent.supplier_code,
            payment_method: intent.payment_method,
            status: intent.status.as_str().to_owned(),
            created_at: intent.created_at,
            updated_at: intent.updated_at,
        },
    }
}

fn refund_response_data(refund: PaymentRefundRuntimeRecord) -> PaymentRefundResultData {
    let currency_code = refund.currency_code.clone();
    PaymentRefundResultData {
        item: PaymentRefundResponse {
            id: refund.id,
            payment_intent_id: refund.payment_intent_id,
            merchant_refund_no: refund.merchant_refund_no,
            amount: MoneyAmountResponse {
                currency: refund.currency_code,
                value: refund.amount,
            },
            supplier_code: refund.supplier_code,
            status: refund.status.as_str().to_owned(),
            reason: refund.reason,
            items: refund
                .items
                .into_iter()
                .map(|item| PaymentRefundItemResponse {
                    id: item.id,
                    order_item_id: item.order_item_id,
                    quantity: item.quantity,
                    refund_amount: MoneyAmountResponse {
                        currency: currency_code.clone(),
                        value: item.refund_amount,
                    },
                    tax_refund_amount: MoneyAmountResponse {
                        currency: currency_code.clone(),
                        value: item.tax_refund_amount,
                    },
                    shipping_refund_amount: MoneyAmountResponse {
                        currency: currency_code.clone(),
                        value: item.shipping_refund_amount,
                    },
                    created_at: item.created_at,
                })
                .collect(),
            created_at: refund.created_at,
            updated_at: refund.updated_at,
        },
    }
}

fn refund_item_commands(
    items: Vec<PaymentRefundItemRequest>,
    currency_code: &str,
) -> Result<Vec<RuntimeCreateRefundItemCommand>, String> {
    items
        .into_iter()
        .map(|item| {
            let refund_amount = checked_money_value(item.refund_amount, currency_code)?;
            let tax_refund_amount = match item.tax_refund_amount {
                Some(amount) => checked_money_value(amount, currency_code)?,
                None => "0.00".to_owned(),
            };
            let shipping_refund_amount = match item.shipping_refund_amount {
                Some(amount) => checked_money_value(amount, currency_code)?,
                None => "0.00".to_owned(),
            };
            Ok(RuntimeCreateRefundItemCommand {
                order_item_id: item.order_item_id,
                quantity: item.quantity,
                refund_amount,
                tax_refund_amount,
                shipping_refund_amount,
            })
        })
        .collect()
}

fn checked_money_value(amount: MoneyAmountRequest, currency_code: &str) -> Result<String, String> {
    if amount.currency != currency_code {
        return Err("payment refund item currency must match refund currency".to_owned());
    }
    Ok(amount.value)
}

fn required_header(headers: &HeaderMap, name: &'static str) -> Result<String, String> {
    let value = headers
        .get(name)
        .ok_or_else(|| format!("{name} header is required"))?
        .to_str()
        .map(str::trim)
        .map_err(|_| format!("{name} header value is invalid"))?;
    if value.is_empty() {
        Err(format!("{name} header must not be empty"))
    } else {
        Ok(value.to_owned())
    }
}

fn bad_request(message: String) -> Response {
    problem_from_wire_code("4001", message).into_response()
}

fn not_found(message: String) -> Response {
    problem_from_wire_code("4040", message).into_response()
}

fn conflict(message: String) -> Response {
    problem_from_wire_code("4090", message).into_response()
}

fn unprocessable(message: String) -> Response {
    problem_from_wire_code("4220", message).into_response()
}
