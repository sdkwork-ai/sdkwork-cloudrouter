use std::fmt;
use std::sync::Arc;

use bytes::Bytes;
use hmac::{Hmac, Mac};
use http_body_util::{BodyExt, Full};
use hyper::header::{HeaderName, HeaderValue};
use hyper::header::{AUTHORIZATION, CONTENT_TYPE};
use hyper::{Method, Request, Uri};
use hyper_rustls::HttpsConnector;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::TokioExecutor;
use serde_json::{json, Value};
use sha2::Sha256;

use super::{
    PaymentAdapterFuture, PaymentAdapterOperation, PaymentCancelPaymentIntentRequest,
    PaymentCancelRefundRequest, PaymentCapturePaymentIntentRequest,
    PaymentConfirmPaymentIntentRequest, PaymentCreateIntentRequest, PaymentCreateRefundRequest,
    PaymentDownloadStatementRequest, PaymentNativeOperationOutcome, PaymentNativeOperationRequest,
    PaymentNormalizeWebhookRequest, PaymentNormalizedWebhookEvent, PaymentParseStatementRequest,
    PaymentProviderAdapter, PaymentProviderCapabilities, PaymentProviderOperationOutcome,
    PaymentProviderRegistryError, PaymentQueryRefundRequest, PaymentStatementDownloadOutcome,
    PaymentStatementParseOutcome, PaymentVerifyWebhookRequest, PaymentWebhookVerificationOutcome,
};
use crate::application::payment_adapter::STANDARD_PAYMENT_ADAPTER_OPERATIONS;

type HmacSha256 = Hmac<Sha256>;
type StripeRequestBody = Full<Bytes>;
type StripeConnector = HttpsConnector<HttpConnector>;
type StripeHttpClient = Client<StripeConnector, StripeRequestBody>;

const STRIPE_PROVIDER_CODE: &str = "stripe";
const STRIPE_API_BASE_URL: &str = "https://api.stripe.com";

static STRIPE_REAL_CAPABILITIES: PaymentProviderCapabilities = PaymentProviderCapabilities {
    provider_code: STRIPE_PROVIDER_CODE,
    operations: STANDARD_PAYMENT_ADAPTER_OPERATIONS,
    sandbox_only: false,
};

pub trait StripePaymentHttpClient: Send + Sync {
    fn post_form<'a>(
        &'a self,
        path: &'a str,
        idempotency_key: Option<&'a str>,
        form: Vec<(String, String)>,
    ) -> PaymentAdapterFuture<'a, Value>;

    fn get<'a>(&'a self, path: &'a str) -> PaymentAdapterFuture<'a, Value>;
}

#[derive(Clone, PartialEq, Eq)]
pub struct StripePaymentProviderConfig {
    pub secret_key: String,
    pub webhook_secret: Option<String>,
}

impl fmt::Debug for StripePaymentProviderConfig {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("StripePaymentProviderConfig")
            .field("secret_key", &"<redacted>")
            .field(
                "webhook_secret",
                &self.webhook_secret.as_ref().map(|_| "<redacted>"),
            )
            .finish()
    }
}

#[derive(Clone)]
pub struct StripePaymentProviderAdapter {
    config: StripePaymentProviderConfig,
    http_client: Arc<dyn StripePaymentHttpClient>,
}

impl StripePaymentProviderAdapter {
    pub fn new(
        config: StripePaymentProviderConfig,
        http_client: Arc<dyn StripePaymentHttpClient>,
    ) -> Result<Self, PaymentProviderRegistryError> {
        validate_secret_key(&config.secret_key)?;
        if let Some(webhook_secret) = &config.webhook_secret {
            if webhook_secret.trim().is_empty() {
                return Err(invalid_request(
                    PaymentAdapterOperation::VerifyWebhook,
                    "Stripe webhook secret must not be empty when configured",
                ));
            }
        }
        Ok(Self {
            config,
            http_client,
        })
    }

    pub fn with_default_http_client(
        config: StripePaymentProviderConfig,
    ) -> Result<Self, PaymentProviderRegistryError> {
        let http_client = Arc::new(StripeHyperPaymentHttpClient::new(
            config.secret_key.clone(),
        )?);
        Self::new(config, http_client)
    }
}

impl PaymentProviderAdapter for StripePaymentProviderAdapter {
    fn capabilities(&self) -> &'static PaymentProviderCapabilities {
        &STRIPE_REAL_CAPABILITIES
    }

    fn create_payment_intent<'a>(
        &'a self,
        request: PaymentCreateIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        Box::pin(async move {
            let amount_minor = require_positive_amount(
                request.amount_minor,
                PaymentAdapterOperation::CreatePaymentIntent,
                "amount_minor",
            )?;
            let currency = require_currency(
                request.currency.as_deref(),
                PaymentAdapterOperation::CreatePaymentIntent,
            )?;
            let idempotency_key =
                metadata_string(&request.metadata, "idempotency_key").map(str::to_owned);
            let mut form = vec![
                ("amount".to_owned(), amount_minor.to_string()),
                ("currency".to_owned(), currency.to_ascii_lowercase()),
                (
                    "automatic_payment_methods[enabled]".to_owned(),
                    "true".to_owned(),
                ),
            ];
            if let Some(tenant_id) = request.tenant_id {
                form.push(("metadata[tenant_id]".to_owned(), tenant_id.to_string()));
            }
            if let Some(merchant_order_no) = normalized_optional(request.merchant_order_no) {
                form.push(("metadata[merchant_order_no]".to_owned(), merchant_order_no));
            }
            append_flat_metadata(&mut form, &request.metadata);

            let response = self
                .http_client
                .post_form("/v1/payment_intents", idempotency_key.as_deref(), form)
                .await?;
            stripe_operation_outcome(PaymentAdapterOperation::CreatePaymentIntent, response)
        })
    }

    fn confirm_payment_intent<'a>(
        &'a self,
        request: PaymentConfirmPaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        Box::pin(async move {
            let payment_intent_id = require_stripe_resource_id(
                request.payment_intent_id.as_deref(),
                PaymentAdapterOperation::ConfirmPaymentIntent,
                "payment_intent_id",
            )?;
            let idempotency_key =
                metadata_string(&request.metadata, "idempotency_key").map(str::to_owned);
            let response = self
                .http_client
                .post_form(
                    &format!("/v1/payment_intents/{payment_intent_id}/confirm"),
                    idempotency_key.as_deref(),
                    Vec::new(),
                )
                .await?;
            stripe_operation_outcome(PaymentAdapterOperation::ConfirmPaymentIntent, response)
        })
    }

    fn capture_payment_intent<'a>(
        &'a self,
        request: PaymentCapturePaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        Box::pin(async move {
            let payment_intent_id = require_stripe_resource_id(
                request.payment_intent_id.as_deref(),
                PaymentAdapterOperation::CapturePaymentIntent,
                "payment_intent_id",
            )?;
            let idempotency_key =
                metadata_string(&request.metadata, "idempotency_key").map(str::to_owned);
            let mut form = Vec::new();
            if let Some(amount_minor) = request.amount_minor {
                if amount_minor <= 0 {
                    return Err(invalid_request(
                        PaymentAdapterOperation::CapturePaymentIntent,
                        "Stripe amount_minor must be positive when capturing a partial amount",
                    ));
                }
                form.push(("amount_to_capture".to_owned(), amount_minor.to_string()));
            }
            let response = self
                .http_client
                .post_form(
                    &format!("/v1/payment_intents/{payment_intent_id}/capture"),
                    idempotency_key.as_deref(),
                    form,
                )
                .await?;
            stripe_operation_outcome(PaymentAdapterOperation::CapturePaymentIntent, response)
        })
    }

    fn cancel_payment_intent<'a>(
        &'a self,
        request: PaymentCancelPaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        Box::pin(async move {
            let payment_intent_id = require_stripe_resource_id(
                request.payment_intent_id.as_deref(),
                PaymentAdapterOperation::CancelPaymentIntent,
                "payment_intent_id",
            )?;
            let idempotency_key =
                metadata_string(&request.metadata, "idempotency_key").map(str::to_owned);
            let mut form = Vec::new();
            if let Some(reason) = stripe_cancellation_reason(request.reason.as_deref()) {
                form.push(("cancellation_reason".to_owned(), reason.to_owned()));
            }
            let response = self
                .http_client
                .post_form(
                    &format!("/v1/payment_intents/{payment_intent_id}/cancel"),
                    idempotency_key.as_deref(),
                    form,
                )
                .await?;
            stripe_operation_outcome(PaymentAdapterOperation::CancelPaymentIntent, response)
        })
    }

    fn create_refund<'a>(
        &'a self,
        request: PaymentCreateRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        Box::pin(async move {
            let payment_intent_id = require_non_empty(
                request.payment_intent_id.as_deref(),
                PaymentAdapterOperation::CreateRefund,
                "payment_intent_id",
            )?;
            let amount_minor = require_positive_amount(
                request.amount_minor,
                PaymentAdapterOperation::CreateRefund,
                "amount_minor",
            )?;
            let idempotency_key =
                metadata_string(&request.metadata, "idempotency_key").map(str::to_owned);
            let mut form = vec![
                ("payment_intent".to_owned(), payment_intent_id),
                ("amount".to_owned(), amount_minor.to_string()),
            ];
            if let Some(reason) = stripe_refund_reason(request.reason.as_deref()) {
                form.push(("reason".to_owned(), reason.to_owned()));
            }
            if let Some(refund_no) = normalized_optional(request.refund_no) {
                form.push(("metadata[refund_no]".to_owned(), refund_no));
            }
            append_flat_metadata(&mut form, &request.metadata);

            let response = self
                .http_client
                .post_form("/v1/refunds", idempotency_key.as_deref(), form)
                .await?;
            stripe_operation_outcome(PaymentAdapterOperation::CreateRefund, response)
        })
    }

    fn query_refund<'a>(
        &'a self,
        request: PaymentQueryRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        Box::pin(async move {
            let refund_id = require_stripe_resource_id(
                request.refund_id.as_deref(),
                PaymentAdapterOperation::QueryRefund,
                "refund_id",
            )?;
            let response = self
                .http_client
                .get(&format!("/v1/refunds/{refund_id}"))
                .await?;
            stripe_operation_outcome(PaymentAdapterOperation::QueryRefund, response)
        })
    }

    fn cancel_refund<'a>(
        &'a self,
        request: PaymentCancelRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        Box::pin(async move {
            let refund_id = require_stripe_resource_id(
                request.refund_id.as_deref(),
                PaymentAdapterOperation::CancelRefund,
                "refund_id",
            )?;
            let idempotency_key =
                metadata_string(&request.metadata, "idempotency_key").map(str::to_owned);
            let mut form = Vec::new();
            if let Some(reason) = normalized_optional(request.reason) {
                form.push(("metadata[cancel_reason]".to_owned(), reason));
            }
            let response = self
                .http_client
                .post_form(
                    &format!("/v1/refunds/{refund_id}/cancel"),
                    idempotency_key.as_deref(),
                    form,
                )
                .await?;
            stripe_operation_outcome(PaymentAdapterOperation::CancelRefund, response)
        })
    }

    fn verify_webhook<'a>(
        &'a self,
        request: PaymentVerifyWebhookRequest,
    ) -> PaymentAdapterFuture<'a, PaymentWebhookVerificationOutcome> {
        Box::pin(async move {
            let Some(webhook_secret) = self.config.webhook_secret.as_deref() else {
                return Err(invalid_request(
                    PaymentAdapterOperation::VerifyWebhook,
                    "Stripe webhook secret is required to verify webhook deliveries",
                ));
            };
            let Some(signature_header) = find_header(&request.headers, "stripe-signature") else {
                return Ok(PaymentWebhookVerificationOutcome {
                    verified: false,
                    provider_event_id: None,
                });
            };
            let verified = verify_stripe_signature(webhook_secret, signature_header, &request.body);
            let provider_event_id = if verified {
                parse_webhook_event_id(&request.body)?
            } else {
                None
            };
            Ok(PaymentWebhookVerificationOutcome {
                verified,
                provider_event_id,
            })
        })
    }

    fn normalize_webhook<'a>(
        &'a self,
        request: PaymentNormalizeWebhookRequest,
    ) -> PaymentAdapterFuture<'a, PaymentNormalizedWebhookEvent> {
        Box::pin(async move {
            let payload = serde_json::from_slice::<Value>(&request.body).map_err(|error| {
                invalid_response(
                    PaymentAdapterOperation::NormalizeWebhook,
                    format!("Stripe webhook JSON is invalid: {error}"),
                )
            })?;
            Ok(PaymentNormalizedWebhookEvent {
                provider_code: STRIPE_PROVIDER_CODE.to_owned(),
                event_type: payload
                    .get("type")
                    .and_then(Value::as_str)
                    .map(str::to_owned),
                provider_event_id: payload.get("id").and_then(Value::as_str).map(str::to_owned),
                payload,
            })
        })
    }

    fn download_statement<'a>(
        &'a self,
        request: PaymentDownloadStatementRequest,
    ) -> PaymentAdapterFuture<'a, PaymentStatementDownloadOutcome> {
        Box::pin(async move {
            let statement_date = require_non_empty(
                request.statement_date.as_deref(),
                PaymentAdapterOperation::DownloadStatement,
                "statement_date",
            )?;
            let statement_type = request
                .statement_type
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .unwrap_or("balance_transactions");
            if statement_type != "balance_transactions" {
                return Err(invalid_request(
                    PaymentAdapterOperation::DownloadStatement,
                    "Stripe statement_type currently supports balance_transactions",
                ));
            }
            let (created_gte, created_lt) = statement_day_bounds(&statement_date)?;
            let path = format!(
                "/v1/balance_transactions?limit=100&created%5Bgte%5D={created_gte}&created%5Blt%5D={created_lt}"
            );
            let response = self.http_client.get(&path).await?;
            let content = serde_json::to_vec(&response).map_err(|error| {
                invalid_response(
                    PaymentAdapterOperation::DownloadStatement,
                    format!("Stripe statement response could not be serialized: {error}"),
                )
            })?;
            Ok(PaymentStatementDownloadOutcome {
                statement_id: Some(format!("stripe_balance_transactions_{statement_date}")),
                content,
                metadata: json!({
                    "provider_code": STRIPE_PROVIDER_CODE,
                    "source_type": "stripe_balance_transactions",
                    "statement_date": statement_date,
                    "created_gte": created_gte,
                    "created_lt": created_lt,
                }),
            })
        })
    }

    fn parse_statement<'a>(
        &'a self,
        request: PaymentParseStatementRequest,
    ) -> PaymentAdapterFuture<'a, PaymentStatementParseOutcome> {
        Box::pin(async move {
            let payload = serde_json::from_slice::<Value>(&request.content).map_err(|error| {
                invalid_response(
                    PaymentAdapterOperation::ParseStatement,
                    format!("Stripe statement JSON is invalid: {error}"),
                )
            })?;
            let items = payload
                .get("data")
                .and_then(Value::as_array)
                .ok_or_else(|| {
                    invalid_response(
                        PaymentAdapterOperation::ParseStatement,
                        "Stripe balance transaction statement must contain a data array",
                    )
                })?;
            let mut gross_amount_minor = 0_i64;
            let mut fee_amount_minor = 0_i64;
            let mut net_amount_minor = 0_i64;
            let mut currencies = Vec::<String>::new();

            for item in items {
                let amount = item.get("amount").and_then(Value::as_i64).unwrap_or(0);
                if amount > 0 {
                    gross_amount_minor += amount;
                }
                fee_amount_minor += item.get("fee").and_then(Value::as_i64).unwrap_or(0);
                net_amount_minor += item.get("net").and_then(Value::as_i64).unwrap_or(amount);
                if let Some(currency) = item.get("currency").and_then(Value::as_str) {
                    let currency = currency.to_ascii_lowercase();
                    if !currencies.iter().any(|known| known == &currency) {
                        currencies.push(currency);
                    }
                }
            }

            Ok(PaymentStatementParseOutcome {
                statement_id: request.statement_id,
                item_count: items.len(),
                metadata: json!({
                    "provider_code": STRIPE_PROVIDER_CODE,
                    "source_type": "stripe_balance_transactions",
                    "gross_amount_minor": gross_amount_minor,
                    "fee_amount_minor": fee_amount_minor,
                    "net_amount_minor": net_amount_minor,
                    "currencies": currencies,
                }),
            })
        })
    }

    fn invoke_native_operation<'a>(
        &'a self,
        _request: PaymentNativeOperationRequest,
    ) -> PaymentAdapterFuture<'a, PaymentNativeOperationOutcome> {
        unsupported(PaymentAdapterOperation::InvokeNativeOperation)
    }
}

#[derive(Clone)]
pub struct StripeHyperPaymentHttpClient {
    api_base_url: String,
    secret_key: String,
    client: StripeHttpClient,
}

impl StripeHyperPaymentHttpClient {
    pub fn new(secret_key: impl Into<String>) -> Result<Self, PaymentProviderRegistryError> {
        Self::with_api_base_url(secret_key, STRIPE_API_BASE_URL)
    }

    pub fn with_api_base_url(
        secret_key: impl Into<String>,
        api_base_url: impl Into<String>,
    ) -> Result<Self, PaymentProviderRegistryError> {
        let secret_key = secret_key.into();
        validate_secret_key(&secret_key)?;
        let api_base_url = normalize_api_base_url(api_base_url.into())?;
        Ok(Self {
            api_base_url,
            secret_key,
            client: build_stripe_http_client(),
        })
    }
}

impl fmt::Debug for StripeHyperPaymentHttpClient {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("StripeHyperPaymentHttpClient")
            .field("api_base_url", &self.api_base_url)
            .field("secret_key", &"<redacted>")
            .finish_non_exhaustive()
    }
}

impl StripePaymentHttpClient for StripeHyperPaymentHttpClient {
    fn post_form<'a>(
        &'a self,
        path: &'a str,
        idempotency_key: Option<&'a str>,
        form: Vec<(String, String)>,
    ) -> PaymentAdapterFuture<'a, Value> {
        Box::pin(async move {
            let uri = stripe_uri(&self.api_base_url, path)?;
            let encoded_body = encode_form(&form);
            let mut builder = Request::builder()
                .method(Method::POST)
                .uri(uri)
                .header(CONTENT_TYPE, "application/x-www-form-urlencoded")
                .header(AUTHORIZATION, format!("Bearer {}", self.secret_key));
            if let Some(idempotency_key) = normalized_optional(idempotency_key.map(str::to_owned)) {
                builder = builder.header(
                    HeaderName::from_static("idempotency-key"),
                    HeaderValue::from_str(&idempotency_key).map_err(|error| {
                        invalid_request(
                            PaymentAdapterOperation::InvokeNativeOperation,
                            format!("Stripe idempotency key is invalid: {error}"),
                        )
                    })?,
                );
            }
            let request = builder
                .body(Full::new(Bytes::from(encoded_body)))
                .map_err(|error| {
                    invalid_request(
                        PaymentAdapterOperation::InvokeNativeOperation,
                        format!("Stripe request could not be built: {error}"),
                    )
                })?;
            let response = self.client.request(request).await.map_err(|error| {
                provider_failed(
                    PaymentAdapterOperation::InvokeNativeOperation,
                    format!("Stripe request failed: {error}"),
                    true,
                )
            })?;
            let status_code = response.status().as_u16();
            let bytes = response
                .into_body()
                .collect()
                .await
                .map_err(|error| {
                    provider_failed(
                        PaymentAdapterOperation::InvokeNativeOperation,
                        format!("Stripe response body failed: {error}"),
                        true,
                    )
                })?
                .to_bytes();

            if !(200..300).contains(&status_code) {
                return Err(provider_failed(
                    PaymentAdapterOperation::InvokeNativeOperation,
                    stripe_error_message(status_code, &bytes),
                    status_code == 429 || status_code >= 500,
                ));
            }

            serde_json::from_slice::<Value>(&bytes).map_err(|error| {
                invalid_response(
                    PaymentAdapterOperation::InvokeNativeOperation,
                    format!("Stripe returned invalid JSON: {error}"),
                )
            })
        })
    }

    fn get<'a>(&'a self, path: &'a str) -> PaymentAdapterFuture<'a, Value> {
        Box::pin(async move {
            let uri = stripe_uri(&self.api_base_url, path)?;
            let request = Request::builder()
                .method(Method::GET)
                .uri(uri)
                .header(AUTHORIZATION, format!("Bearer {}", self.secret_key))
                .body(Full::new(Bytes::new()))
                .map_err(|error| {
                    invalid_request(
                        PaymentAdapterOperation::InvokeNativeOperation,
                        format!("Stripe request could not be built: {error}"),
                    )
                })?;
            let response = self.client.request(request).await.map_err(|error| {
                provider_failed(
                    PaymentAdapterOperation::InvokeNativeOperation,
                    format!("Stripe request failed: {error}"),
                    true,
                )
            })?;
            let status_code = response.status().as_u16();
            let bytes = response
                .into_body()
                .collect()
                .await
                .map_err(|error| {
                    provider_failed(
                        PaymentAdapterOperation::InvokeNativeOperation,
                        format!("Stripe response body failed: {error}"),
                        true,
                    )
                })?
                .to_bytes();

            if !(200..300).contains(&status_code) {
                return Err(provider_failed(
                    PaymentAdapterOperation::InvokeNativeOperation,
                    stripe_error_message(status_code, &bytes),
                    status_code == 429 || status_code >= 500,
                ));
            }

            serde_json::from_slice::<Value>(&bytes).map_err(|error| {
                invalid_response(
                    PaymentAdapterOperation::InvokeNativeOperation,
                    format!("Stripe returned invalid JSON: {error}"),
                )
            })
        })
    }
}

fn stripe_operation_outcome(
    operation: PaymentAdapterOperation,
    response: Value,
) -> Result<PaymentProviderOperationOutcome, PaymentProviderRegistryError> {
    let native_id = response
        .get("id")
        .and_then(Value::as_str)
        .map(str::to_owned)
        .ok_or_else(|| invalid_response(operation, "Stripe response is missing id"))?;
    Ok(PaymentProviderOperationOutcome {
        provider_code: STRIPE_PROVIDER_CODE.to_owned(),
        native_id: Some(native_id),
        raw_status: response
            .get("status")
            .and_then(Value::as_str)
            .map(str::to_owned),
        payload: response,
    })
}

fn require_positive_amount(
    amount: Option<i64>,
    operation: PaymentAdapterOperation,
    field: &str,
) -> Result<i64, PaymentProviderRegistryError> {
    match amount {
        Some(amount) if amount > 0 => Ok(amount),
        _ => Err(invalid_request(
            operation,
            format!("Stripe {field} must be a positive minor-unit amount"),
        )),
    }
}

fn require_currency(
    currency: Option<&str>,
    operation: PaymentAdapterOperation,
) -> Result<String, PaymentProviderRegistryError> {
    let currency = require_non_empty(currency, operation, "currency")?;
    if currency.len() != 3
        || !currency
            .chars()
            .all(|character| character.is_ascii_alphabetic())
    {
        return Err(invalid_request(
            operation,
            "Stripe currency must be an ISO 4217 three-letter code",
        ));
    }
    Ok(currency)
}

fn require_non_empty(
    value: Option<&str>,
    operation: PaymentAdapterOperation,
    field: &str,
) -> Result<String, PaymentProviderRegistryError> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Err(invalid_request(
            operation,
            format!("Stripe {field} is required"),
        ));
    };
    Ok(value.to_owned())
}

fn require_stripe_resource_id(
    value: Option<&str>,
    operation: PaymentAdapterOperation,
    field: &str,
) -> Result<String, PaymentProviderRegistryError> {
    let value = require_non_empty(value, operation, field)?;
    if value.contains('/') || value.contains('?') || value.contains('#') {
        return Err(invalid_request(
            operation,
            format!("Stripe {field} must be a resource id, not a path or URL"),
        ));
    }
    Ok(value)
}

fn metadata_string<'a>(metadata: &'a Value, key: &str) -> Option<&'a str> {
    metadata
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn append_flat_metadata(form: &mut Vec<(String, String)>, metadata: &Value) {
    let Some(object) = metadata.as_object() else {
        return;
    };
    for (key, value) in object {
        if key == "idempotency_key" || key.starts_with("stripe_") {
            continue;
        }
        if let Some(value) = metadata_value_as_string(value) {
            form.push((format!("metadata[{key}]"), value));
        }
    }
}

fn metadata_value_as_string(value: &Value) -> Option<String> {
    match value {
        Value::String(value) => normalized_optional(Some(value.clone())),
        Value::Number(value) => Some(value.to_string()),
        Value::Bool(value) => Some(value.to_string()),
        _ => None,
    }
}

fn stripe_refund_reason(reason: Option<&str>) -> Option<&'static str> {
    match reason.map(str::trim).filter(|value| !value.is_empty()) {
        Some("duplicate") => Some("duplicate"),
        Some("fraudulent") => Some("fraudulent"),
        Some("requested_by_customer" | "customer_requested" | "user_requested") => {
            Some("requested_by_customer")
        }
        Some(_) => Some("requested_by_customer"),
        None => None,
    }
}

fn stripe_cancellation_reason(reason: Option<&str>) -> Option<&'static str> {
    match reason.map(str::trim).filter(|value| !value.is_empty()) {
        Some("duplicate") => Some("duplicate"),
        Some("fraudulent") => Some("fraudulent"),
        Some("requested_by_customer" | "customer_requested" | "user_requested") => {
            Some("requested_by_customer")
        }
        Some("abandoned") => Some("abandoned"),
        Some(_) => Some("requested_by_customer"),
        None => None,
    }
}

fn find_header<'a>(headers: &'a [(String, String)], header_name: &str) -> Option<&'a str> {
    headers
        .iter()
        .find(|(name, _)| name.eq_ignore_ascii_case(header_name))
        .map(|(_, value)| value.as_str())
}

fn verify_stripe_signature(webhook_secret: &str, signature_header: &str, body: &[u8]) -> bool {
    let Some(timestamp) = stripe_signature_value(signature_header, "t") else {
        return false;
    };
    let signatures = stripe_signature_values(signature_header, "v1");
    if signatures.is_empty() {
        return false;
    }
    let signed_payload = format!("{timestamp}.");
    let Ok(mut mac) = HmacSha256::new_from_slice(webhook_secret.as_bytes()) else {
        return false;
    };
    mac.update(signed_payload.as_bytes());
    mac.update(body);
    let expected = hex::encode(mac.finalize().into_bytes());
    signatures
        .iter()
        .any(|signature| constant_time_eq(expected.as_bytes(), signature.as_bytes()))
}

fn stripe_signature_value<'a>(signature_header: &'a str, key: &str) -> Option<&'a str> {
    stripe_signature_values(signature_header, key)
        .into_iter()
        .next()
}

fn stripe_signature_values<'a>(signature_header: &'a str, key: &str) -> Vec<&'a str> {
    signature_header
        .split(',')
        .filter_map(|part| {
            let (name, value) = part.trim().split_once('=')?;
            if name == key && !value.is_empty() {
                Some(value)
            } else {
                None
            }
        })
        .collect()
}

fn constant_time_eq(left: &[u8], right: &[u8]) -> bool {
    if left.len() != right.len() {
        return false;
    }
    left.iter()
        .zip(right.iter())
        .fold(0_u8, |acc, (left, right)| acc | (left ^ right))
        == 0
}

fn parse_webhook_event_id(body: &[u8]) -> Result<Option<String>, PaymentProviderRegistryError> {
    let payload = serde_json::from_slice::<Value>(body).map_err(|error| {
        invalid_response(
            PaymentAdapterOperation::VerifyWebhook,
            format!("Stripe webhook JSON is invalid: {error}"),
        )
    })?;
    Ok(payload.get("id").and_then(Value::as_str).map(str::to_owned))
}

fn statement_day_bounds(statement_date: &str) -> Result<(i64, i64), PaymentProviderRegistryError> {
    let (year, month, day) = parse_yyyy_mm_dd(statement_date)?;
    let start_days = days_from_civil(year, month, day);
    let end = next_date(year, month, day)?;
    let end_days = days_from_civil(end.0, end.1, end.2);
    Ok((start_days * 86_400, end_days * 86_400))
}

fn parse_yyyy_mm_dd(statement_date: &str) -> Result<(i64, i64, i64), PaymentProviderRegistryError> {
    let parts = statement_date.split('-').collect::<Vec<_>>();
    if parts.len() != 3 {
        return Err(invalid_request(
            PaymentAdapterOperation::DownloadStatement,
            "Stripe statement_date must use YYYY-MM-DD",
        ));
    }
    let year = parts[0].parse::<i64>().map_err(|_| {
        invalid_request(
            PaymentAdapterOperation::DownloadStatement,
            "Stripe statement_date year is invalid",
        )
    })?;
    let month = parts[1].parse::<i64>().map_err(|_| {
        invalid_request(
            PaymentAdapterOperation::DownloadStatement,
            "Stripe statement_date month is invalid",
        )
    })?;
    let day = parts[2].parse::<i64>().map_err(|_| {
        invalid_request(
            PaymentAdapterOperation::DownloadStatement,
            "Stripe statement_date day is invalid",
        )
    })?;
    if !(1..=12).contains(&month) || day < 1 || day > days_in_month(year, month) {
        return Err(invalid_request(
            PaymentAdapterOperation::DownloadStatement,
            "Stripe statement_date is not a valid calendar date",
        ));
    }
    Ok((year, month, day))
}

fn next_date(
    year: i64,
    month: i64,
    day: i64,
) -> Result<(i64, i64, i64), PaymentProviderRegistryError> {
    if day < days_in_month(year, month) {
        Ok((year, month, day + 1))
    } else if month < 12 {
        Ok((year, month + 1, 1))
    } else {
        Ok((year + 1, 1, 1))
    }
}

fn days_in_month(year: i64, month: i64) -> i64 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if is_leap_year(year) => 29,
        2 => 28,
        _ => 0,
    }
}

fn is_leap_year(year: i64) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let year = year - if month <= 2 { 1 } else { 0 };
    let era = if year >= 0 { year } else { year - 399 } / 400;
    let yoe = year - era * 400;
    let month = month + if month > 2 { -3 } else { 9 };
    let doy = (153 * month + 2) / 5 + day - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

fn encode_form(form: &[(String, String)]) -> String {
    form.iter()
        .map(|(key, value)| format!("{}={}", percent_encode(key), percent_encode(value)))
        .collect::<Vec<_>>()
        .join("&")
}

fn percent_encode(value: &str) -> String {
    let mut encoded = String::new();
    for byte in value.as_bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(*byte as char)
            }
            b' ' => encoded.push('+'),
            _ => encoded.push_str(&format!("%{byte:02X}")),
        }
    }
    encoded
}

fn normalize_api_base_url(api_base_url: String) -> Result<String, PaymentProviderRegistryError> {
    let api_base_url = api_base_url.trim().trim_end_matches('/').to_owned();
    if api_base_url.is_empty() {
        return Err(invalid_request(
            PaymentAdapterOperation::InvokeNativeOperation,
            "Stripe API base URL is required",
        ));
    }
    let uri = api_base_url.parse::<Uri>().map_err(|error| {
        invalid_request(
            PaymentAdapterOperation::InvokeNativeOperation,
            format!("Stripe API base URL is invalid: {error}"),
        )
    })?;
    if !matches!(uri.scheme_str(), Some("http" | "https")) || uri.authority().is_none() {
        return Err(invalid_request(
            PaymentAdapterOperation::InvokeNativeOperation,
            "Stripe API base URL must be an absolute http or https URL",
        ));
    }
    Ok(api_base_url)
}

fn stripe_uri(api_base_url: &str, path: &str) -> Result<Uri, PaymentProviderRegistryError> {
    let path = if path.starts_with('/') {
        path.to_owned()
    } else {
        format!("/{path}")
    };
    format!("{api_base_url}{path}")
        .parse::<Uri>()
        .map_err(|error| {
            invalid_request(
                PaymentAdapterOperation::InvokeNativeOperation,
                format!("Stripe request URI is invalid: {error}"),
            )
        })
}

fn stripe_error_message(status_code: u16, body: &[u8]) -> String {
    let payload = serde_json::from_slice::<Value>(body).unwrap_or_else(|_| json!({}));
    let message = payload
        .get("error")
        .and_then(|error| error.get("message"))
        .and_then(Value::as_str)
        .unwrap_or("Stripe request returned an error");
    format!("Stripe returned HTTP {status_code}: {message}")
}

fn validate_secret_key(secret_key: &str) -> Result<(), PaymentProviderRegistryError> {
    if secret_key.trim().is_empty() {
        return Err(invalid_request(
            PaymentAdapterOperation::InvokeNativeOperation,
            "Stripe secret key is required",
        ));
    }
    Ok(())
}

fn normalized_optional(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

fn unsupported<T>(operation: PaymentAdapterOperation) -> PaymentAdapterFuture<'static, T> {
    Box::pin(async move {
        Err(PaymentProviderRegistryError::UnsupportedCapability {
            provider_code: STRIPE_PROVIDER_CODE.to_owned(),
            operation,
        })
    })
}

fn invalid_request(
    operation: PaymentAdapterOperation,
    message: impl Into<String>,
) -> PaymentProviderRegistryError {
    PaymentProviderRegistryError::InvalidProviderRequest {
        provider_code: STRIPE_PROVIDER_CODE.to_owned(),
        operation,
        message: message.into(),
    }
}

fn provider_failed(
    operation: PaymentAdapterOperation,
    message: impl Into<String>,
    retryable: bool,
) -> PaymentProviderRegistryError {
    PaymentProviderRegistryError::ProviderRequestFailed {
        provider_code: STRIPE_PROVIDER_CODE.to_owned(),
        operation,
        message: message.into(),
        retryable,
    }
}

fn invalid_response(
    operation: PaymentAdapterOperation,
    message: impl Into<String>,
) -> PaymentProviderRegistryError {
    PaymentProviderRegistryError::InvalidProviderResponse {
        provider_code: STRIPE_PROVIDER_CODE.to_owned(),
        operation,
        message: message.into(),
    }
}

fn build_stripe_http_client() -> StripeHttpClient {
    let connector = hyper_rustls::HttpsConnectorBuilder::new()
        .with_webpki_roots()
        .https_or_http()
        .enable_http1()
        .build();
    Client::builder(TokioExecutor::new()).build(connector)
}
