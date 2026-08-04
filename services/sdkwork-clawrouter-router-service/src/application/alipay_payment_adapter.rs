use std::fmt;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use bytes::Bytes;
use http_body_util::{BodyExt, Full};
use hyper::header::CONTENT_TYPE;
use hyper::{Method, Request, Uri};
use hyper_rustls::HttpsConnector;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::TokioExecutor;
use sdkwork_claw_http::ensure_rustls_crypto_provider;
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

type AlipayRequestBody = Full<Bytes>;
type AlipayConnector = HttpsConnector<HttpConnector>;
type AlipayHttpClient = Client<AlipayConnector, AlipayRequestBody>;

const ALIPAY_PROVIDER_CODE: &str = "alipay";
const ALIPAY_GATEWAY_URL: &str = "https://openapi.alipay.com/gateway.do";

static ALIPAY_REAL_CAPABILITIES: PaymentProviderCapabilities = PaymentProviderCapabilities {
    supplier_code: ALIPAY_PROVIDER_CODE,
    operations: STANDARD_PAYMENT_ADAPTER_OPERATIONS,
    sandbox_only: false,
};

pub trait AlipayOpenApiClient: Send + Sync {
    fn execute<'a>(
        &'a self,
        method: &'a str,
        biz_content: Value,
    ) -> PaymentAdapterFuture<'a, Value>;

    fn download<'a>(
        &'a self,
        method: &'a str,
        biz_content: Value,
    ) -> PaymentAdapterFuture<'a, Value>;
}

pub trait AlipaySigner: Send + Sync {
    fn sign(&self, payload: &str) -> Result<String, PaymentProviderRegistryError>;
    fn verify(&self, payload: &str, signature: &str) -> Result<bool, PaymentProviderRegistryError>;
}

#[derive(Clone, PartialEq, Eq)]
pub struct AlipayPaymentProviderConfig {
    pub app_id: String,
    pub private_key_pem: String,
    pub alipay_public_key_pem: String,
    pub notify_url: Option<String>,
    pub return_url: Option<String>,
}

impl fmt::Debug for AlipayPaymentProviderConfig {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("AlipayPaymentProviderConfig")
            .field("app_id", &self.app_id)
            .field("private_key_pem", &"<redacted>")
            .field("alipay_public_key_pem", &"<redacted>")
            .field("notify_url", &self.notify_url)
            .field("return_url", &self.return_url)
            .finish()
    }
}

#[derive(Clone)]
pub struct AlipayPaymentProviderAdapter {
    config: AlipayPaymentProviderConfig,
    client: Arc<dyn AlipayOpenApiClient>,
    signer: Arc<dyn AlipaySigner>,
}

impl AlipayPaymentProviderAdapter {
    pub fn new(
        config: AlipayPaymentProviderConfig,
        client: Arc<dyn AlipayOpenApiClient>,
        signer: Arc<dyn AlipaySigner>,
    ) -> Result<Self, PaymentProviderRegistryError> {
        validate_config_secret("app_id", &config.app_id)?;
        validate_config_secret("private_key_pem", &config.private_key_pem)?;
        validate_config_secret("alipay_public_key_pem", &config.alipay_public_key_pem)?;
        Ok(Self {
            config,
            client,
            signer,
        })
    }

    pub fn with_default_http_client(
        config: AlipayPaymentProviderConfig,
        signer: Arc<dyn AlipaySigner>,
    ) -> Result<Self, PaymentProviderRegistryError> {
        let client = Arc::new(AlipayHyperOpenApiClient::new(
            config.clone(),
            signer.clone(),
        )?);
        Self::new(config, client, signer)
    }
}

impl PaymentProviderAdapter for AlipayPaymentProviderAdapter {
    fn capabilities(&self) -> &'static PaymentProviderCapabilities {
        &ALIPAY_REAL_CAPABILITIES
    }

    fn create_payment_intent<'a>(
        &'a self,
        request: PaymentCreateIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        Box::pin(async move {
            let out_trade_no = require_non_empty(
                request.merchant_order_no.as_deref(),
                PaymentAdapterOperation::CreatePaymentIntent,
                "merchant_order_no",
            )?;
            let amount_minor = require_positive_amount(
                request.amount_minor,
                PaymentAdapterOperation::CreatePaymentIntent,
                "amount_minor",
            )?;
            require_cny(
                request.currency.as_deref(),
                PaymentAdapterOperation::CreatePaymentIntent,
            )?;
            let subject = metadata_string(&request.metadata, "subject")
                .map(str::to_owned)
                .unwrap_or_else(|| out_trade_no.clone());
            let mut biz_content = json!({
                "out_trade_no": out_trade_no,
                "total_amount": minor_to_decimal_string(amount_minor),
                "subject": subject,
                "product_code": "FAST_INSTANT_TRADE_PAY",
            });
            if let Some(tenant_id) = request.tenant_id {
                biz_content["passback_params"] = json!(format!("tenant_id={tenant_id}"));
            }
            if let Some(notify_url) = normalized_optional(self.config.notify_url.clone()) {
                biz_content["notify_url"] = json!(notify_url);
            }
            if let Some(return_url) = normalized_optional(self.config.return_url.clone()) {
                biz_content["return_url"] = json!(return_url);
            }
            let response = self
                .client
                .execute("alipay.trade.page.pay", biz_content)
                .await?;
            alipay_operation_outcome(PaymentAdapterOperation::CreatePaymentIntent, response)
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
        _request: PaymentCapturePaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        unsupported(PaymentAdapterOperation::CapturePaymentIntent)
    }

    fn cancel_payment_intent<'a>(
        &'a self,
        request: PaymentCancelPaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        Box::pin(async move {
            let out_trade_no = require_non_empty(
                request.payment_intent_id.as_deref(),
                PaymentAdapterOperation::CancelPaymentIntent,
                "payment_intent_id",
            )?;
            let response = self
                .client
                .execute(
                    "alipay.trade.close",
                    json!({
                        "out_trade_no": out_trade_no,
                    }),
                )
                .await?;
            alipay_operation_outcome(PaymentAdapterOperation::CancelPaymentIntent, response)
        })
    }

    fn create_refund<'a>(
        &'a self,
        request: PaymentCreateRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        Box::pin(async move {
            let out_trade_no = require_non_empty(
                request.payment_intent_id.as_deref(),
                PaymentAdapterOperation::CreateRefund,
                "payment_intent_id",
            )?;
            let amount_minor = require_positive_amount(
                request.amount_minor,
                PaymentAdapterOperation::CreateRefund,
                "amount_minor",
            )?;
            let out_request_no = require_non_empty(
                request.refund_no.as_deref(),
                PaymentAdapterOperation::CreateRefund,
                "refund_no",
            )?;
            let mut biz_content = json!({
                "out_trade_no": out_trade_no,
                "refund_amount": minor_to_decimal_string(amount_minor),
                "out_request_no": out_request_no,
            });
            if let Some(reason) = normalized_optional(request.reason) {
                biz_content["refund_reason"] = json!(reason);
            }
            let response = self
                .client
                .execute("alipay.trade.refund", biz_content)
                .await?;
            alipay_operation_outcome(PaymentAdapterOperation::CreateRefund, response)
        })
    }

    fn query_refund<'a>(
        &'a self,
        request: PaymentQueryRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        Box::pin(async move {
            let out_trade_no = require_non_empty(
                metadata_string(&request.metadata, "out_trade_no"),
                PaymentAdapterOperation::QueryRefund,
                "metadata.out_trade_no",
            )?;
            let out_request_no = require_non_empty(
                request.refund_no.as_deref(),
                PaymentAdapterOperation::QueryRefund,
                "refund_no",
            )?;
            let response = self
                .client
                .execute(
                    "alipay.trade.fastpay.refund.query",
                    json!({
                        "out_trade_no": out_trade_no,
                        "out_request_no": out_request_no,
                    }),
                )
                .await?;
            alipay_operation_outcome(PaymentAdapterOperation::QueryRefund, response)
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
            let fields = parse_form_body(&request.body, PaymentAdapterOperation::VerifyWebhook)?;
            let signature = form_value(&fields, "sign").ok_or_else(|| {
                invalid_request(
                    PaymentAdapterOperation::VerifyWebhook,
                    "Alipay webhook sign is required",
                )
            })?;
            let canonical = canonical_form_payload(&fields);
            let verified = self.signer.verify(&canonical, &signature)?;
            Ok(PaymentWebhookVerificationOutcome {
                verified,
                provider_event_id: if verified {
                    form_value(&fields, "notify_id")
                } else {
                    None
                },
            })
        })
    }

    fn normalize_webhook<'a>(
        &'a self,
        request: PaymentNormalizeWebhookRequest,
    ) -> PaymentAdapterFuture<'a, PaymentNormalizedWebhookEvent> {
        Box::pin(async move {
            let fields = parse_form_body(&request.body, PaymentAdapterOperation::NormalizeWebhook)?;
            let payload = form_fields_to_json(&fields);
            Ok(PaymentNormalizedWebhookEvent {
                supplier_code: ALIPAY_PROVIDER_CODE.to_owned(),
                event_type: payload
                    .get("trade_status")
                    .and_then(Value::as_str)
                    .map(str::to_owned),
                provider_event_id: payload
                    .get("notify_id")
                    .and_then(Value::as_str)
                    .map(str::to_owned),
                payload,
            })
        })
    }

    fn download_statement<'a>(
        &'a self,
        request: PaymentDownloadStatementRequest,
    ) -> PaymentAdapterFuture<'a, PaymentStatementDownloadOutcome> {
        Box::pin(async move {
            let bill_date = require_non_empty(
                request.statement_date.as_deref(),
                PaymentAdapterOperation::DownloadStatement,
                "statement_date",
            )?;
            validate_yyyy_mm_dd(&bill_date)?;
            let bill_type = request
                .statement_type
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .unwrap_or("trade");
            let response = self
                .client
                .download(
                    "alipay.data.dataservice.bill.downloadurl.query",
                    json!({
                        "bill_type": bill_type,
                        "bill_date": bill_date,
                    }),
                )
                .await?;
            let bill_download_url = response
                .get("bill_download_url")
                .and_then(Value::as_str)
                .map(str::to_owned);
            let content = serde_json::to_vec(&response).map_err(|error| {
                invalid_response(
                    PaymentAdapterOperation::DownloadStatement,
                    format!("Alipay bill response could not be serialized: {error}"),
                )
            })?;
            Ok(PaymentStatementDownloadOutcome {
                statement_id: Some(format!("alipay_{bill_type}_{bill_date}")),
                content,
                metadata: json!({
                    "supplier_code": ALIPAY_PROVIDER_CODE,
                    "source_type": format!("alipay_{bill_type}_bill"),
                    "bill_type": bill_type,
                    "bill_date": bill_date,
                    "bill_download_url": bill_download_url,
                }),
            })
        })
    }

    fn parse_statement<'a>(
        &'a self,
        request: PaymentParseStatementRequest,
    ) -> PaymentAdapterFuture<'a, PaymentStatementParseOutcome> {
        Box::pin(async move {
            let content = String::from_utf8(request.content).map_err(|error| {
                invalid_response(
                    PaymentAdapterOperation::ParseStatement,
                    format!("Alipay bill content must be UTF-8 CSV: {error}"),
                )
            })?;
            let parsed = parse_alipay_csv_bill(&content)?;
            Ok(PaymentStatementParseOutcome {
                statement_id: request.statement_id,
                item_count: parsed.item_count,
                metadata: json!({
                    "supplier_code": ALIPAY_PROVIDER_CODE,
                    "source_type": "alipay_trade_bill",
                    "gross_amount_minor": parsed.gross_amount_minor,
                    "fee_amount_minor": parsed.fee_amount_minor,
                    "net_amount_minor": parsed.net_amount_minor,
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
pub struct AlipayHyperOpenApiClient {
    gateway_url: String,
    config: AlipayPaymentProviderConfig,
    signer: Arc<dyn AlipaySigner>,
    client: AlipayHttpClient,
}

impl AlipayHyperOpenApiClient {
    pub fn new(
        config: AlipayPaymentProviderConfig,
        signer: Arc<dyn AlipaySigner>,
    ) -> Result<Self, PaymentProviderRegistryError> {
        Self::with_gateway_url(config, signer, ALIPAY_GATEWAY_URL)
    }

    pub fn with_gateway_url(
        config: AlipayPaymentProviderConfig,
        signer: Arc<dyn AlipaySigner>,
        gateway_url: impl Into<String>,
    ) -> Result<Self, PaymentProviderRegistryError> {
        validate_config_secret("app_id", &config.app_id)?;
        validate_config_secret("private_key_pem", &config.private_key_pem)?;
        validate_config_secret("alipay_public_key_pem", &config.alipay_public_key_pem)?;
        let gateway_url = normalize_gateway_url(gateway_url.into())?;
        Ok(Self {
            gateway_url,
            config,
            signer,
            client: build_alipay_http_client(),
        })
    }
}

impl fmt::Debug for AlipayHyperOpenApiClient {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("AlipayHyperOpenApiClient")
            .field("gateway_url", &self.gateway_url)
            .field("app_id", &self.config.app_id)
            .finish_non_exhaustive()
    }
}

impl AlipayOpenApiClient for AlipayHyperOpenApiClient {
    fn execute<'a>(
        &'a self,
        method: &'a str,
        biz_content: Value,
    ) -> PaymentAdapterFuture<'a, Value> {
        Box::pin(async move { self.invoke_gateway(method, biz_content).await })
    }

    fn download<'a>(
        &'a self,
        method: &'a str,
        biz_content: Value,
    ) -> PaymentAdapterFuture<'a, Value> {
        Box::pin(async move { self.invoke_gateway(method, biz_content).await })
    }
}

impl AlipayHyperOpenApiClient {
    async fn invoke_gateway(
        &self,
        method: &str,
        biz_content: Value,
    ) -> Result<Value, PaymentProviderRegistryError> {
        let mut params = vec![
            ("app_id".to_owned(), self.config.app_id.clone()),
            ("method".to_owned(), method.to_owned()),
            ("format".to_owned(), "JSON".to_owned()),
            ("charset".to_owned(), "utf-8".to_owned()),
            ("sign_type".to_owned(), "RSA2".to_owned()),
            ("timestamp".to_owned(), current_alipay_timestamp()),
            ("version".to_owned(), "1.0".to_owned()),
            (
                "biz_content".to_owned(),
                serde_json::to_string(&biz_content).map_err(|error| {
                    invalid_request(
                        PaymentAdapterOperation::InvokeNativeOperation,
                        format!("Alipay biz_content could not be serialized: {error}"),
                    )
                })?,
            ),
        ];
        let canonical = canonical_gateway_payload(&params);
        let signature = self.signer.sign(&canonical)?;
        params.push(("sign".to_owned(), signature));
        let body = encode_form(&params);
        let request = Request::builder()
            .method(Method::POST)
            .uri(self.gateway_url.parse::<Uri>().map_err(|error| {
                invalid_request(
                    PaymentAdapterOperation::InvokeNativeOperation,
                    format!("Alipay gateway URL is invalid: {error}"),
                )
            })?)
            .header(CONTENT_TYPE, "application/x-www-form-urlencoded")
            .body(Full::new(Bytes::from(body)))
            .map_err(|error| {
                invalid_request(
                    PaymentAdapterOperation::InvokeNativeOperation,
                    format!("Alipay request could not be built: {error}"),
                )
            })?;
        let response = self.client.request(request).await.map_err(|error| {
            provider_failed(
                PaymentAdapterOperation::InvokeNativeOperation,
                format!("Alipay request failed: {error}"),
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
                    format!("Alipay response body failed: {error}"),
                    true,
                )
            })?
            .to_bytes();
        if !(200..300).contains(&status_code) {
            return Err(provider_failed(
                PaymentAdapterOperation::InvokeNativeOperation,
                format!("Alipay returned HTTP {status_code}"),
                status_code == 429 || status_code >= 500,
            ));
        }
        let payload = serde_json::from_slice::<Value>(&bytes).map_err(|error| {
            invalid_response(
                PaymentAdapterOperation::InvokeNativeOperation,
                format!("Alipay returned invalid JSON: {error}"),
            )
        })?;
        Ok(alipay_response_payload(method, payload))
    }
}

fn alipay_operation_outcome(
    operation: PaymentAdapterOperation,
    response: Value,
) -> Result<PaymentProviderOperationOutcome, PaymentProviderRegistryError> {
    let native_id = response
        .get("trade_no")
        .and_then(Value::as_str)
        .or_else(|| response.get("out_trade_no").and_then(Value::as_str))
        .or_else(|| response.get("notify_id").and_then(Value::as_str))
        .map(str::to_owned)
        .ok_or_else(|| invalid_response(operation, "Alipay response is missing trade id"))?;
    Ok(PaymentProviderOperationOutcome {
        supplier_code: ALIPAY_PROVIDER_CODE.to_owned(),
        native_id: Some(native_id),
        raw_status: response
            .get("status")
            .and_then(Value::as_str)
            .or_else(|| response.get("trade_status").and_then(Value::as_str))
            .or_else(|| response.get("msg").and_then(Value::as_str))
            .map(str::to_owned),
        payload: response,
    })
}

fn alipay_response_payload(method: &str, payload: Value) -> Value {
    let response_key = format!("{}_response", method.replace('.', "_"));
    payload
        .get(&response_key)
        .cloned()
        .or_else(|| payload.get("alipay_trade_page_pay_response").cloned())
        .unwrap_or(payload)
}

fn parse_form_body(
    body: &[u8],
    operation: PaymentAdapterOperation,
) -> Result<Vec<(String, String)>, PaymentProviderRegistryError> {
    let body = std::str::from_utf8(body).map_err(|error| {
        invalid_response(
            operation,
            format!("Alipay form body must be UTF-8: {error}"),
        )
    })?;
    body.split('&')
        .filter(|part| !part.is_empty())
        .map(|part| {
            let (key, value) = part.split_once('=').unwrap_or((part, ""));
            Ok((percent_decode(key)?, percent_decode(value)?))
        })
        .collect()
}

fn form_value(fields: &[(String, String)], key: &str) -> Option<String> {
    fields
        .iter()
        .find(|(field_key, _)| field_key == key)
        .map(|(_, value)| value.to_owned())
}

fn canonical_form_payload(fields: &[(String, String)]) -> String {
    let mut pairs = fields
        .iter()
        .filter(|(key, value)| key != "sign" && key != "sign_type" && !value.is_empty())
        .map(|(key, value)| (key.as_str(), value.as_str()))
        .collect::<Vec<_>>();
    pairs.sort_unstable_by(|left, right| left.0.cmp(right.0));
    pairs
        .into_iter()
        .map(|(key, value)| format!("{key}={value}"))
        .collect::<Vec<_>>()
        .join("&")
}

fn form_fields_to_json(fields: &[(String, String)]) -> Value {
    let mut object = serde_json::Map::new();
    for (key, value) in fields {
        object.insert(key.clone(), Value::String(value.clone()));
    }
    Value::Object(object)
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
            format!("Alipay {field} must be a positive minor-unit amount"),
        )),
    }
}

fn require_cny(
    currency: Option<&str>,
    operation: PaymentAdapterOperation,
) -> Result<(), PaymentProviderRegistryError> {
    let currency = require_non_empty(currency, operation, "currency")?;
    if !currency.eq_ignore_ascii_case("CNY") {
        return Err(invalid_request(
            operation,
            "Alipay domestic baseline currently supports CNY only",
        ));
    }
    Ok(())
}

fn require_non_empty(
    value: Option<&str>,
    operation: PaymentAdapterOperation,
    field: &str,
) -> Result<String, PaymentProviderRegistryError> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Err(invalid_request(
            operation,
            format!("Alipay {field} is required"),
        ));
    };
    Ok(value.to_owned())
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

struct ParsedAlipayBill {
    item_count: usize,
    gross_amount_minor: i64,
    fee_amount_minor: i64,
    net_amount_minor: i64,
}

fn parse_alipay_csv_bill(content: &str) -> Result<ParsedAlipayBill, PaymentProviderRegistryError> {
    let mut lines = content.lines().filter(|line| !line.trim().is_empty());
    let header = lines.next().ok_or_else(|| {
        invalid_response(
            PaymentAdapterOperation::ParseStatement,
            "Alipay bill CSV header is required",
        )
    })?;
    let headers = header.split(',').map(str::trim).collect::<Vec<_>>();
    let total_index = csv_header_index(&headers, "total_amount")?;
    let fee_index = csv_header_index(&headers, "service_fee")?;
    let mut item_count = 0_usize;
    let mut gross_amount_minor = 0_i64;
    let mut fee_amount_minor = 0_i64;
    let mut net_amount_minor = 0_i64;
    for line in lines {
        let columns = line.split(',').map(str::trim).collect::<Vec<_>>();
        if columns.len() <= total_index {
            continue;
        }
        item_count += 1;
        let amount = decimal_string_to_minor(columns[total_index]).unwrap_or(0);
        let fee = columns
            .get(fee_index)
            .and_then(|value| decimal_string_to_minor(value))
            .unwrap_or(0);
        if amount > 0 {
            gross_amount_minor += amount;
        }
        fee_amount_minor += fee;
        net_amount_minor += amount - fee;
    }
    Ok(ParsedAlipayBill {
        item_count,
        gross_amount_minor,
        fee_amount_minor,
        net_amount_minor,
    })
}

fn csv_header_index(headers: &[&str], name: &str) -> Result<usize, PaymentProviderRegistryError> {
    headers
        .iter()
        .position(|header| *header == name)
        .ok_or_else(|| {
            invalid_response(
                PaymentAdapterOperation::ParseStatement,
                format!("Alipay bill CSV missing {name} column"),
            )
        })
}

fn validate_yyyy_mm_dd(statement_date: &str) -> Result<(), PaymentProviderRegistryError> {
    let parts = statement_date.split('-').collect::<Vec<_>>();
    if parts.len() != 3
        || parts[0].len() != 4
        || parts[1].len() != 2
        || parts[2].len() != 2
        || parts.iter().any(|part| {
            part.is_empty() || !part.chars().all(|character| character.is_ascii_digit())
        })
    {
        return Err(invalid_request(
            PaymentAdapterOperation::DownloadStatement,
            "Alipay statement_date must use YYYY-MM-DD",
        ));
    }
    Ok(())
}

fn canonical_gateway_payload(params: &[(String, String)]) -> String {
    let mut pairs = params
        .iter()
        .filter(|(key, value)| key != "sign" && !value.is_empty())
        .map(|(key, value)| (key.as_str(), value.as_str()))
        .collect::<Vec<_>>();
    pairs.sort_unstable_by(|left, right| left.0.cmp(right.0));
    pairs
        .into_iter()
        .map(|(key, value)| format!("{key}={value}"))
        .collect::<Vec<_>>()
        .join("&")
}

fn encode_form(params: &[(String, String)]) -> String {
    params
        .iter()
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

fn percent_decode(value: &str) -> Result<String, PaymentProviderRegistryError> {
    let mut bytes = Vec::new();
    let value = value.as_bytes();
    let mut index = 0;
    while index < value.len() {
        match value[index] {
            b'+' => {
                bytes.push(b' ');
                index += 1;
            }
            b'%' if index + 2 < value.len() => {
                let hex = std::str::from_utf8(&value[index + 1..index + 3]).map_err(|error| {
                    invalid_response(
                        PaymentAdapterOperation::NormalizeWebhook,
                        format!("Alipay percent escape is invalid: {error}"),
                    )
                })?;
                let byte = u8::from_str_radix(hex, 16).map_err(|error| {
                    invalid_response(
                        PaymentAdapterOperation::NormalizeWebhook,
                        format!("Alipay percent escape is invalid: {error}"),
                    )
                })?;
                bytes.push(byte);
                index += 3;
            }
            byte => {
                bytes.push(byte);
                index += 1;
            }
        }
    }
    String::from_utf8(bytes).map_err(|error| {
        invalid_response(
            PaymentAdapterOperation::NormalizeWebhook,
            format!("Alipay form value is invalid UTF-8: {error}"),
        )
    })
}

fn current_alipay_timestamp() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0);
    let days = seconds.div_euclid(86_400);
    let seconds_of_day = seconds.rem_euclid(86_400);
    let (year, month, day) = civil_from_days(days);
    let hour = seconds_of_day / 3600;
    let minute = (seconds_of_day % 3600) / 60;
    let second = seconds_of_day % 60;
    format!("{year:04}-{month:02}-{day:02} {hour:02}:{minute:02}:{second:02}")
}

fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let days = days + 719_468;
    let era = if days >= 0 { days } else { days - 146_096 } / 146_097;
    let doe = days - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let year = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = mp + if mp < 10 { 3 } else { -9 };
    let year = year + if month <= 2 { 1 } else { 0 };
    (year, month, day)
}

fn normalize_gateway_url(gateway_url: String) -> Result<String, PaymentProviderRegistryError> {
    let gateway_url = gateway_url.trim().to_owned();
    if gateway_url.is_empty() {
        return Err(invalid_request(
            PaymentAdapterOperation::InvokeNativeOperation,
            "Alipay gateway URL is required",
        ));
    }
    let uri = gateway_url.parse::<Uri>().map_err(|error| {
        invalid_request(
            PaymentAdapterOperation::InvokeNativeOperation,
            format!("Alipay gateway URL is invalid: {error}"),
        )
    })?;
    if !matches!(uri.scheme_str(), Some("http" | "https")) || uri.authority().is_none() {
        return Err(invalid_request(
            PaymentAdapterOperation::InvokeNativeOperation,
            "Alipay gateway URL must be an absolute http or https URL",
        ));
    }
    Ok(gateway_url)
}

fn validate_config_secret(field: &str, value: &str) -> Result<(), PaymentProviderRegistryError> {
    if value.trim().is_empty() {
        return Err(invalid_request(
            PaymentAdapterOperation::InvokeNativeOperation,
            format!("Alipay {field} is required"),
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
            supplier_code: ALIPAY_PROVIDER_CODE.to_owned(),
            operation,
        })
    })
}

fn invalid_request(
    operation: PaymentAdapterOperation,
    message: impl Into<String>,
) -> PaymentProviderRegistryError {
    PaymentProviderRegistryError::InvalidProviderRequest {
        supplier_code: ALIPAY_PROVIDER_CODE.to_owned(),
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
        supplier_code: ALIPAY_PROVIDER_CODE.to_owned(),
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
        supplier_code: ALIPAY_PROVIDER_CODE.to_owned(),
        operation,
        message: message.into(),
    }
}

fn build_alipay_http_client() -> AlipayHttpClient {
    ensure_rustls_crypto_provider();
    let connector = hyper_rustls::HttpsConnectorBuilder::new()
        .with_webpki_roots()
        .https_or_http()
        .enable_http1()
        .build();
    Client::builder(TokioExecutor::new()).build(connector)
}
