use std::fmt;
use std::sync::Arc;

use base64::{engine::general_purpose, Engine as _};
use bytes::Bytes;
use http_body_util::{BodyExt, Full};
use hyper::header::{HeaderName, HeaderValue};
use hyper::header::{AUTHORIZATION, CONTENT_TYPE};
use hyper::{Method, Request, Uri};
use hyper_rustls::HttpsConnector;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::TokioExecutor;
use serde_json::{json, Value};

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

type PayPalRequestBody = Full<Bytes>;
type PayPalConnector = HttpsConnector<HttpConnector>;
type PayPalHttpClient = Client<PayPalConnector, PayPalRequestBody>;

const PAYPAL_PROVIDER_CODE: &str = "paypal";
const PAYPAL_API_BASE_URL: &str = "https://api-m.paypal.com";

static PAYPAL_REAL_CAPABILITIES: PaymentProviderCapabilities = PaymentProviderCapabilities {
    provider_code: PAYPAL_PROVIDER_CODE,
    operations: STANDARD_PAYMENT_ADAPTER_OPERATIONS,
    sandbox_only: false,
};

pub trait PayPalPaymentHttpClient: Send + Sync {
    fn post_json<'a>(
        &'a self,
        path: &'a str,
        request_id: Option<&'a str>,
        payload: Value,
    ) -> PaymentAdapterFuture<'a, Value>;

    fn get<'a>(&'a self, path: &'a str) -> PaymentAdapterFuture<'a, Value>;
}

#[derive(Clone, PartialEq, Eq)]
pub struct PayPalPaymentProviderConfig {
    pub client_id: String,
    pub client_secret: String,
    pub webhook_id: Option<String>,
}

impl fmt::Debug for PayPalPaymentProviderConfig {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("PayPalPaymentProviderConfig")
            .field("client_id", &"<redacted>")
            .field("client_secret", &"<redacted>")
            .field(
                "webhook_id",
                &self.webhook_id.as_ref().map(|_| "<redacted>"),
            )
            .finish()
    }
}

#[derive(Clone)]
pub struct PayPalPaymentProviderAdapter {
    config: PayPalPaymentProviderConfig,
    http_client: Arc<dyn PayPalPaymentHttpClient>,
}

impl PayPalPaymentProviderAdapter {
    pub fn new(
        config: PayPalPaymentProviderConfig,
        http_client: Arc<dyn PayPalPaymentHttpClient>,
    ) -> Result<Self, PaymentProviderRegistryError> {
        validate_config_secret("client_id", &config.client_id)?;
        validate_config_secret("client_secret", &config.client_secret)?;
        if let Some(webhook_id) = &config.webhook_id {
            if webhook_id.trim().is_empty() {
                return Err(invalid_request(
                    PaymentAdapterOperation::VerifyWebhook,
                    "PayPal webhook_id must not be empty when configured",
                ));
            }
        }
        Ok(Self {
            config,
            http_client,
        })
    }

    pub fn with_default_http_client(
        config: PayPalPaymentProviderConfig,
    ) -> Result<Self, PaymentProviderRegistryError> {
        let http_client = Arc::new(PayPalHyperPaymentHttpClient::new(
            config.client_id.clone(),
            config.client_secret.clone(),
        )?);
        Self::new(config, http_client)
    }
}

impl PaymentProviderAdapter for PayPalPaymentProviderAdapter {
    fn capabilities(&self) -> &'static PaymentProviderCapabilities {
        &PAYPAL_REAL_CAPABILITIES
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
            let request_id =
                metadata_string(&request.metadata, "idempotency_key").map(str::to_owned);
            let merchant_order_no = request
                .merchant_order_no
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_owned);
            let mut purchase_unit = json!({
                "amount": {
                    "currency_code": currency,
                    "value": minor_to_decimal_string(amount_minor),
                },
            });
            if let Some(merchant_order_no) = merchant_order_no {
                purchase_unit["reference_id"] = json!(merchant_order_no);
                purchase_unit["custom_id"] = json!(merchant_order_no);
            }
            if let Some(tenant_id) = request.tenant_id {
                purchase_unit["soft_descriptor"] = json!(format!("SDKWORK{tenant_id}"));
            }
            let payload = json!({
                "intent": "CAPTURE",
                "purchase_units": [purchase_unit],
            });
            let response = self
                .http_client
                .post_json("/v2/checkout/orders", request_id.as_deref(), payload)
                .await?;
            paypal_operation_outcome(PaymentAdapterOperation::CreatePaymentIntent, response)
        })
    }

    fn confirm_payment_intent<'a>(
        &'a self,
        _request: PaymentConfirmPaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        unsupported(PaymentAdapterOperation::ConfirmPaymentIntent)
    }

    fn capture_payment_intent<'a>(
        &'a self,
        request: PaymentCapturePaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        Box::pin(async move {
            let order_id = require_paypal_resource_id(
                request.payment_intent_id.as_deref(),
                PaymentAdapterOperation::CapturePaymentIntent,
                "payment_intent_id",
            )?;
            let request_id =
                metadata_string(&request.metadata, "idempotency_key").map(str::to_owned);
            let response = self
                .http_client
                .post_json(
                    &format!("/v2/checkout/orders/{order_id}/capture"),
                    request_id.as_deref(),
                    json!({}),
                )
                .await?;
            let mut outcome =
                paypal_operation_outcome(PaymentAdapterOperation::CapturePaymentIntent, response)?;
            if let Some(capture_id) = first_capture_id(&outcome.payload) {
                outcome.payload["sdkwork_capture_id"] = json!(capture_id);
            }
            Ok(outcome)
        })
    }

    fn cancel_payment_intent<'a>(
        &'a self,
        _request: PaymentCancelPaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        unsupported(PaymentAdapterOperation::CancelPaymentIntent)
    }

    fn create_refund<'a>(
        &'a self,
        request: PaymentCreateRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        Box::pin(async move {
            let capture_id = metadata_string(&request.metadata, "capture_id")
                .map(str::to_owned)
                .or_else(|| request.payment_intent_id.clone())
                .ok_or_else(|| {
                    invalid_request(
                        PaymentAdapterOperation::CreateRefund,
                        "PayPal capture id is required for refund creation",
                    )
                })?;
            let capture_id = require_paypal_resource_id(
                Some(&capture_id),
                PaymentAdapterOperation::CreateRefund,
                "capture_id",
            )?;
            let amount_minor = require_positive_amount(
                request.amount_minor,
                PaymentAdapterOperation::CreateRefund,
                "amount_minor",
            )?;
            let currency = require_currency(
                metadata_string(&request.metadata, "currency"),
                PaymentAdapterOperation::CreateRefund,
            )?;
            let request_id =
                metadata_string(&request.metadata, "idempotency_key").map(str::to_owned);
            let mut payload = json!({
                "amount": {
                    "currency_code": currency,
                    "value": minor_to_decimal_string(amount_minor),
                },
            });
            if let Some(refund_no) = normalized_optional(request.refund_no) {
                payload["invoice_id"] = json!(refund_no);
            }
            if let Some(reason) = normalized_optional(request.reason) {
                payload["note_to_payer"] = json!(reason);
            }
            let response = self
                .http_client
                .post_json(
                    &format!("/v2/payments/captures/{capture_id}/refund"),
                    request_id.as_deref(),
                    payload,
                )
                .await?;
            paypal_operation_outcome(PaymentAdapterOperation::CreateRefund, response)
        })
    }

    fn query_refund<'a>(
        &'a self,
        request: PaymentQueryRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        Box::pin(async move {
            let refund_id = require_paypal_resource_id(
                request.refund_id.as_deref(),
                PaymentAdapterOperation::QueryRefund,
                "refund_id",
            )?;
            let response = self
                .http_client
                .get(&format!("/v2/payments/refunds/{refund_id}"))
                .await?;
            paypal_operation_outcome(PaymentAdapterOperation::QueryRefund, response)
        })
    }

    fn cancel_refund<'a>(
        &'a self,
        _request: PaymentCancelRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        unsupported(PaymentAdapterOperation::CancelRefund)
    }

    fn verify_webhook<'a>(
        &'a self,
        request: PaymentVerifyWebhookRequest,
    ) -> PaymentAdapterFuture<'a, PaymentWebhookVerificationOutcome> {
        Box::pin(async move {
            let Some(webhook_id) = self.config.webhook_id.as_deref() else {
                return Err(invalid_request(
                    PaymentAdapterOperation::VerifyWebhook,
                    "PayPal webhook_id is required to verify webhook deliveries",
                ));
            };
            let webhook_event =
                parse_body_json(&request.body, PaymentAdapterOperation::VerifyWebhook)?;
            let payload = json!({
                "auth_algo": require_header(&request.headers, "paypal-auth-algo")?,
                "cert_url": require_header(&request.headers, "paypal-cert-url")?,
                "transmission_id": require_header(&request.headers, "paypal-transmission-id")?,
                "transmission_sig": require_header(&request.headers, "paypal-transmission-sig")?,
                "transmission_time": require_header(&request.headers, "paypal-transmission-time")?,
                "webhook_id": webhook_id,
                "webhook_event": webhook_event,
            });
            let response = self
                .http_client
                .post_json("/v1/notifications/verify-webhook-signature", None, payload)
                .await?;
            let verified = response
                .get("verification_status")
                .and_then(Value::as_str)
                .is_some_and(|status| status.eq_ignore_ascii_case("SUCCESS"));
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
            let payload =
                parse_body_json(&request.body, PaymentAdapterOperation::NormalizeWebhook)?;
            Ok(PaymentNormalizedWebhookEvent {
                provider_code: PAYPAL_PROVIDER_CODE.to_owned(),
                event_type: payload
                    .get("event_type")
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
                .unwrap_or("transaction_search");
            if statement_type != "transaction_search" {
                return Err(invalid_request(
                    PaymentAdapterOperation::DownloadStatement,
                    "PayPal statement_type currently supports transaction_search",
                ));
            }
            let (start_date, end_date) = statement_day_range(&statement_date)?;
            let path = format!(
                "/v1/reporting/transactions?start_date={}&end_date={}&fields=all&page_size=500",
                encode_query_value(&start_date),
                encode_query_value(&end_date)
            );
            let response = self.http_client.get(&path).await?;
            let content = serde_json::to_vec(&response).map_err(|error| {
                invalid_response(
                    PaymentAdapterOperation::DownloadStatement,
                    format!("PayPal statement response could not be serialized: {error}"),
                )
            })?;
            Ok(PaymentStatementDownloadOutcome {
                statement_id: Some(format!("paypal_transaction_search_{statement_date}")),
                content,
                metadata: json!({
                    "provider_code": PAYPAL_PROVIDER_CODE,
                    "source_type": "paypal_transaction_search",
                    "statement_date": statement_date,
                    "start_date": start_date,
                    "end_date": end_date,
                }),
            })
        })
    }

    fn parse_statement<'a>(
        &'a self,
        request: PaymentParseStatementRequest,
    ) -> PaymentAdapterFuture<'a, PaymentStatementParseOutcome> {
        Box::pin(async move {
            let payload =
                parse_body_json(&request.content, PaymentAdapterOperation::ParseStatement)?;
            let items = payload
                .get("transaction_details")
                .and_then(Value::as_array)
                .ok_or_else(|| {
                    invalid_response(
                        PaymentAdapterOperation::ParseStatement,
                        "PayPal transaction statement must contain transaction_details array",
                    )
                })?;
            let mut gross_amount_minor = 0_i64;
            let mut fee_amount_minor = 0_i64;
            let mut net_amount_minor = 0_i64;
            let mut currencies = Vec::<String>::new();

            for item in items {
                let transaction_info = item.get("transaction_info").unwrap_or(&Value::Null);
                let amount = transaction_info
                    .get("transaction_amount")
                    .and_then(|amount| amount.get("value"))
                    .and_then(Value::as_str)
                    .and_then(decimal_string_to_minor)
                    .unwrap_or(0);
                let fee = transaction_info
                    .get("fee_amount")
                    .and_then(|amount| amount.get("value"))
                    .and_then(Value::as_str)
                    .and_then(decimal_string_to_minor)
                    .unwrap_or(0);
                if amount > 0 {
                    gross_amount_minor += amount;
                }
                fee_amount_minor += fee;
                net_amount_minor += amount + fee;
                if let Some(currency) = transaction_info
                    .get("transaction_amount")
                    .and_then(|amount| amount.get("currency_code"))
                    .and_then(Value::as_str)
                {
                    let currency = currency.to_ascii_uppercase();
                    if !currencies.iter().any(|known| known == &currency) {
                        currencies.push(currency);
                    }
                }
            }

            Ok(PaymentStatementParseOutcome {
                statement_id: request.statement_id,
                item_count: items.len(),
                metadata: json!({
                    "provider_code": PAYPAL_PROVIDER_CODE,
                    "source_type": "paypal_transaction_search",
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
pub struct PayPalHyperPaymentHttpClient {
    api_base_url: String,
    client_id: String,
    client_secret: String,
    client: PayPalHttpClient,
}

impl PayPalHyperPaymentHttpClient {
    pub fn new(
        client_id: impl Into<String>,
        client_secret: impl Into<String>,
    ) -> Result<Self, PaymentProviderRegistryError> {
        Self::with_api_base_url(client_id, client_secret, PAYPAL_API_BASE_URL)
    }

    pub fn with_api_base_url(
        client_id: impl Into<String>,
        client_secret: impl Into<String>,
        api_base_url: impl Into<String>,
    ) -> Result<Self, PaymentProviderRegistryError> {
        let client_id = client_id.into();
        let client_secret = client_secret.into();
        validate_config_secret("client_id", &client_id)?;
        validate_config_secret("client_secret", &client_secret)?;
        Ok(Self {
            api_base_url: normalize_api_base_url(api_base_url.into())?,
            client_id,
            client_secret,
            client: build_paypal_http_client(),
        })
    }

    async fn access_token(&self) -> Result<String, PaymentProviderRegistryError> {
        let credentials =
            general_purpose::STANDARD.encode(format!("{}:{}", self.client_id, self.client_secret));
        let request = Request::builder()
            .method(Method::POST)
            .uri(paypal_uri(&self.api_base_url, "/v1/oauth2/token")?)
            .header(AUTHORIZATION, format!("Basic {credentials}"))
            .header(CONTENT_TYPE, "application/x-www-form-urlencoded")
            .body(Full::new(Bytes::from("grant_type=client_credentials")))
            .map_err(|error| {
                invalid_request(
                    PaymentAdapterOperation::InvokeNativeOperation,
                    format!("PayPal OAuth request could not be built: {error}"),
                )
            })?;
        let response = self.client.request(request).await.map_err(|error| {
            provider_failed(
                PaymentAdapterOperation::InvokeNativeOperation,
                format!("PayPal OAuth request failed: {error}"),
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
                    format!("PayPal OAuth response body failed: {error}"),
                    true,
                )
            })?
            .to_bytes();
        if !(200..300).contains(&status_code) {
            return Err(provider_failed(
                PaymentAdapterOperation::InvokeNativeOperation,
                paypal_error_message(status_code, &bytes),
                status_code == 429 || status_code >= 500,
            ));
        }
        let payload = serde_json::from_slice::<Value>(&bytes).map_err(|error| {
            invalid_response(
                PaymentAdapterOperation::InvokeNativeOperation,
                format!("PayPal OAuth returned invalid JSON: {error}"),
            )
        })?;
        payload
            .get("access_token")
            .and_then(Value::as_str)
            .map(str::to_owned)
            .ok_or_else(|| {
                invalid_response(
                    PaymentAdapterOperation::InvokeNativeOperation,
                    "PayPal OAuth response is missing access_token",
                )
            })
    }

    async fn send_json(
        &self,
        method: Method,
        path: &str,
        request_id: Option<&str>,
        payload: Option<Value>,
    ) -> Result<Value, PaymentProviderRegistryError> {
        let access_token = self.access_token().await?;
        let mut builder = Request::builder()
            .method(method)
            .uri(paypal_uri(&self.api_base_url, path)?)
            .header(AUTHORIZATION, format!("Bearer {access_token}"));
        if payload.is_some() {
            builder = builder.header(CONTENT_TYPE, "application/json");
        }
        if let Some(request_id) = normalized_optional(request_id.map(str::to_owned)) {
            builder = builder.header(
                HeaderName::from_static("paypal-request-id"),
                HeaderValue::from_str(&request_id).map_err(|error| {
                    invalid_request(
                        PaymentAdapterOperation::InvokeNativeOperation,
                        format!("PayPal request id is invalid: {error}"),
                    )
                })?,
            );
        }
        let body = match payload {
            Some(payload) => Bytes::from(serde_json::to_vec(&payload).map_err(|error| {
                invalid_request(
                    PaymentAdapterOperation::InvokeNativeOperation,
                    format!("PayPal request payload could not be serialized: {error}"),
                )
            })?),
            None => Bytes::new(),
        };
        let request = builder.body(Full::new(body)).map_err(|error| {
            invalid_request(
                PaymentAdapterOperation::InvokeNativeOperation,
                format!("PayPal request could not be built: {error}"),
            )
        })?;
        let response = self.client.request(request).await.map_err(|error| {
            provider_failed(
                PaymentAdapterOperation::InvokeNativeOperation,
                format!("PayPal request failed: {error}"),
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
                    format!("PayPal response body failed: {error}"),
                    true,
                )
            })?
            .to_bytes();
        if !(200..300).contains(&status_code) {
            return Err(provider_failed(
                PaymentAdapterOperation::InvokeNativeOperation,
                paypal_error_message(status_code, &bytes),
                status_code == 429 || status_code >= 500,
            ));
        }
        serde_json::from_slice::<Value>(&bytes).map_err(|error| {
            invalid_response(
                PaymentAdapterOperation::InvokeNativeOperation,
                format!("PayPal returned invalid JSON: {error}"),
            )
        })
    }
}

impl fmt::Debug for PayPalHyperPaymentHttpClient {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("PayPalHyperPaymentHttpClient")
            .field("api_base_url", &self.api_base_url)
            .field("client_id", &"<redacted>")
            .field("client_secret", &"<redacted>")
            .finish_non_exhaustive()
    }
}

impl PayPalPaymentHttpClient for PayPalHyperPaymentHttpClient {
    fn post_json<'a>(
        &'a self,
        path: &'a str,
        request_id: Option<&'a str>,
        payload: Value,
    ) -> PaymentAdapterFuture<'a, Value> {
        Box::pin(async move {
            self.send_json(Method::POST, path, request_id, Some(payload))
                .await
        })
    }

    fn get<'a>(&'a self, path: &'a str) -> PaymentAdapterFuture<'a, Value> {
        Box::pin(async move { self.send_json(Method::GET, path, None, None).await })
    }
}

fn paypal_operation_outcome(
    operation: PaymentAdapterOperation,
    response: Value,
) -> Result<PaymentProviderOperationOutcome, PaymentProviderRegistryError> {
    let native_id = response
        .get("id")
        .and_then(Value::as_str)
        .map(str::to_owned)
        .ok_or_else(|| invalid_response(operation, "PayPal response is missing id"))?;
    Ok(PaymentProviderOperationOutcome {
        provider_code: PAYPAL_PROVIDER_CODE.to_owned(),
        native_id: Some(native_id),
        raw_status: response
            .get("status")
            .and_then(Value::as_str)
            .map(str::to_owned),
        payload: response,
    })
}

fn first_capture_id(payload: &Value) -> Option<&str> {
    payload
        .get("purchase_units")
        .and_then(Value::as_array)
        .and_then(|units| units.first())
        .and_then(|unit| unit.get("payments"))
        .and_then(|payments| payments.get("captures"))
        .and_then(Value::as_array)
        .and_then(|captures| captures.first())
        .and_then(|capture| capture.get("id"))
        .and_then(Value::as_str)
}

fn parse_body_json(
    body: &[u8],
    operation: PaymentAdapterOperation,
) -> Result<Value, PaymentProviderRegistryError> {
    serde_json::from_slice::<Value>(body).map_err(|error| {
        invalid_response(
            operation,
            format!("PayPal JSON payload is invalid: {error}"),
        )
    })
}

fn parse_webhook_event_id(body: &[u8]) -> Result<Option<String>, PaymentProviderRegistryError> {
    Ok(
        parse_body_json(body, PaymentAdapterOperation::VerifyWebhook)?
            .get("id")
            .and_then(Value::as_str)
            .map(str::to_owned),
    )
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
            format!("PayPal {field} must be a positive minor-unit amount"),
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
            "PayPal currency must be an ISO 4217 three-letter code",
        ));
    }
    Ok(currency.to_ascii_uppercase())
}

fn require_non_empty(
    value: Option<&str>,
    operation: PaymentAdapterOperation,
    field: &str,
) -> Result<String, PaymentProviderRegistryError> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Err(invalid_request(
            operation,
            format!("PayPal {field} is required"),
        ));
    };
    Ok(value.to_owned())
}

fn require_paypal_resource_id(
    value: Option<&str>,
    operation: PaymentAdapterOperation,
    field: &str,
) -> Result<String, PaymentProviderRegistryError> {
    let value = require_non_empty(value, operation, field)?;
    if value.contains('/') || value.contains('?') || value.contains('#') {
        return Err(invalid_request(
            operation,
            format!("PayPal {field} must be a resource id, not a path or URL"),
        ));
    }
    Ok(value)
}

fn require_header(
    headers: &[(String, String)],
    name: &str,
) -> Result<String, PaymentProviderRegistryError> {
    headers
        .iter()
        .find(|(header_name, _)| header_name.eq_ignore_ascii_case(name))
        .map(|(_, value)| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            invalid_request(
                PaymentAdapterOperation::VerifyWebhook,
                format!("PayPal webhook header {name} is required"),
            )
        })
}

fn metadata_string<'a>(metadata: &'a Value, key: &str) -> Option<&'a str> {
    metadata
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn minor_to_decimal_string(amount_minor: i64) -> String {
    let sign = if amount_minor < 0 { "-" } else { "" };
    let absolute = amount_minor.abs();
    format!("{sign}{}.{:02}", absolute / 100, absolute % 100)
}

fn decimal_string_to_minor(value: &str) -> Option<i64> {
    let value = value.trim();
    let negative = value.starts_with('-');
    let value = value.trim_start_matches('-');
    let (units, fraction) = value.split_once('.').unwrap_or((value, "0"));
    let units = units.parse::<i64>().ok()?;
    let cents = format!("{fraction:0<2}");
    let cents = cents.get(..2)?.parse::<i64>().ok()?;
    let amount = units.checked_mul(100)?.checked_add(cents)?;
    Some(if negative { -amount } else { amount })
}

fn statement_day_range(
    statement_date: &str,
) -> Result<(String, String), PaymentProviderRegistryError> {
    let (year, month, day) = parse_yyyy_mm_dd(statement_date)?;
    let (next_year, next_month, next_day) = next_date(year, month, day);
    Ok((
        format!("{year:04}-{month:02}-{day:02}T00:00:00Z"),
        format!("{next_year:04}-{next_month:02}-{next_day:02}T00:00:00Z"),
    ))
}

fn parse_yyyy_mm_dd(statement_date: &str) -> Result<(i64, i64, i64), PaymentProviderRegistryError> {
    let parts = statement_date.split('-').collect::<Vec<_>>();
    if parts.len() != 3 {
        return Err(invalid_request(
            PaymentAdapterOperation::DownloadStatement,
            "PayPal statement_date must use YYYY-MM-DD",
        ));
    }
    let year = parts[0].parse::<i64>().map_err(|_| {
        invalid_request(
            PaymentAdapterOperation::DownloadStatement,
            "PayPal statement_date year is invalid",
        )
    })?;
    let month = parts[1].parse::<i64>().map_err(|_| {
        invalid_request(
            PaymentAdapterOperation::DownloadStatement,
            "PayPal statement_date month is invalid",
        )
    })?;
    let day = parts[2].parse::<i64>().map_err(|_| {
        invalid_request(
            PaymentAdapterOperation::DownloadStatement,
            "PayPal statement_date day is invalid",
        )
    })?;
    if !(1..=12).contains(&month) || day < 1 || day > days_in_month(year, month) {
        return Err(invalid_request(
            PaymentAdapterOperation::DownloadStatement,
            "PayPal statement_date is not a valid calendar date",
        ));
    }
    Ok((year, month, day))
}

fn next_date(year: i64, month: i64, day: i64) -> (i64, i64, i64) {
    if day < days_in_month(year, month) {
        (year, month, day + 1)
    } else if month < 12 {
        (year, month + 1, 1)
    } else {
        (year + 1, 1, 1)
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

fn encode_query_value(value: &str) -> String {
    value
        .as_bytes()
        .iter()
        .map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                (*byte as char).to_string()
            }
            _ => format!("%{byte:02X}"),
        })
        .collect::<Vec<_>>()
        .join("")
}

fn normalize_api_base_url(api_base_url: String) -> Result<String, PaymentProviderRegistryError> {
    let api_base_url = api_base_url.trim().trim_end_matches('/').to_owned();
    if api_base_url.is_empty() {
        return Err(invalid_request(
            PaymentAdapterOperation::InvokeNativeOperation,
            "PayPal API base URL is required",
        ));
    }
    let uri = api_base_url.parse::<Uri>().map_err(|error| {
        invalid_request(
            PaymentAdapterOperation::InvokeNativeOperation,
            format!("PayPal API base URL is invalid: {error}"),
        )
    })?;
    if !matches!(uri.scheme_str(), Some("http" | "https")) || uri.authority().is_none() {
        return Err(invalid_request(
            PaymentAdapterOperation::InvokeNativeOperation,
            "PayPal API base URL must be an absolute http or https URL",
        ));
    }
    Ok(api_base_url)
}

fn paypal_uri(api_base_url: &str, path: &str) -> Result<Uri, PaymentProviderRegistryError> {
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
                format!("PayPal request URI is invalid: {error}"),
            )
        })
}

fn paypal_error_message(status_code: u16, body: &[u8]) -> String {
    let payload = serde_json::from_slice::<Value>(body).unwrap_or_else(|_| json!({}));
    let message = payload
        .get("message")
        .and_then(Value::as_str)
        .or_else(|| payload.get("error_description").and_then(Value::as_str))
        .unwrap_or("PayPal request returned an error");
    format!("PayPal returned HTTP {status_code}: {message}")
}

fn validate_config_secret(field: &str, value: &str) -> Result<(), PaymentProviderRegistryError> {
    if value.trim().is_empty() {
        return Err(invalid_request(
            PaymentAdapterOperation::InvokeNativeOperation,
            format!("PayPal {field} is required"),
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
            provider_code: PAYPAL_PROVIDER_CODE.to_owned(),
            operation,
        })
    })
}

fn invalid_request(
    operation: PaymentAdapterOperation,
    message: impl Into<String>,
) -> PaymentProviderRegistryError {
    PaymentProviderRegistryError::InvalidProviderRequest {
        provider_code: PAYPAL_PROVIDER_CODE.to_owned(),
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
        provider_code: PAYPAL_PROVIDER_CODE.to_owned(),
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
        provider_code: PAYPAL_PROVIDER_CODE.to_owned(),
        operation,
        message: message.into(),
    }
}

fn build_paypal_http_client() -> PayPalHttpClient {
    let connector = hyper_rustls::HttpsConnectorBuilder::new()
        .with_webpki_roots()
        .https_or_http()
        .enable_http1()
        .build();
    Client::builder(TokioExecutor::new()).build(connector)
}
