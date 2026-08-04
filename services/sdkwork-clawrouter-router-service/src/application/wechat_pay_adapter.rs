use std::fmt;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use bytes::Bytes;
use http_body_util::{BodyExt, Full};
use hyper::header::{AUTHORIZATION, CONTENT_TYPE};
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

type WeChatPayRequestBody = Full<Bytes>;
type WeChatPayConnector = HttpsConnector<HttpConnector>;
type WeChatPayHttpClient = Client<WeChatPayConnector, WeChatPayRequestBody>;

const WECHAT_PAY_PROVIDER_CODE: &str = "wechat_pay";
const WECHAT_PAY_API_BASE_URL: &str = "https://api.mch.weixin.qq.com";

static WECHAT_PAY_REAL_CAPABILITIES: PaymentProviderCapabilities = PaymentProviderCapabilities {
    supplier_code: WECHAT_PAY_PROVIDER_CODE,
    operations: STANDARD_PAYMENT_ADAPTER_OPERATIONS,
    sandbox_only: false,
};

pub trait WeChatPayApiClient: Send + Sync {
    fn post_json<'a>(&'a self, path: &'a str, payload: Value) -> PaymentAdapterFuture<'a, Value>;
    fn get<'a>(&'a self, path: &'a str) -> PaymentAdapterFuture<'a, Value>;
}

pub trait WeChatPayCrypto: Send + Sync {
    fn sign(&self, payload: &str) -> Result<String, PaymentProviderRegistryError>;
    fn verify(&self, payload: &str, signature: &str) -> Result<bool, PaymentProviderRegistryError>;
    fn decrypt_resource(
        &self,
        associated_data: &str,
        nonce: &str,
        ciphertext: &str,
    ) -> Result<Vec<u8>, PaymentProviderRegistryError>;
}

#[derive(Clone, PartialEq, Eq)]
pub struct WeChatPayProviderConfig {
    pub app_id: String,
    pub mch_id: String,
    pub merchant_serial_no: String,
    pub merchant_private_key_pem: String,
    pub api_v3_key: String,
    pub notify_url: Option<String>,
}

impl fmt::Debug for WeChatPayProviderConfig {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("WeChatPayProviderConfig")
            .field("app_id", &self.app_id)
            .field("mch_id", &self.mch_id)
            .field("merchant_serial_no", &self.merchant_serial_no)
            .field("merchant_private_key_pem", &"<redacted>")
            .field("api_v3_key", &"<redacted>")
            .field("notify_url", &self.notify_url)
            .finish()
    }
}

#[derive(Clone)]
pub struct WeChatPayProviderAdapter {
    config: WeChatPayProviderConfig,
    client: Arc<dyn WeChatPayApiClient>,
    crypto: Arc<dyn WeChatPayCrypto>,
}

impl WeChatPayProviderAdapter {
    pub fn new(
        config: WeChatPayProviderConfig,
        client: Arc<dyn WeChatPayApiClient>,
        crypto: Arc<dyn WeChatPayCrypto>,
    ) -> Result<Self, PaymentProviderRegistryError> {
        validate_config_secret("app_id", &config.app_id)?;
        validate_config_secret("mch_id", &config.mch_id)?;
        validate_config_secret("merchant_serial_no", &config.merchant_serial_no)?;
        validate_config_secret("merchant_private_key_pem", &config.merchant_private_key_pem)?;
        validate_config_secret("api_v3_key", &config.api_v3_key)?;
        Ok(Self {
            config,
            client,
            crypto,
        })
    }

    pub fn with_default_http_client(
        config: WeChatPayProviderConfig,
        crypto: Arc<dyn WeChatPayCrypto>,
    ) -> Result<Self, PaymentProviderRegistryError> {
        let client = Arc::new(WeChatPayHyperApiClient::new(
            config.clone(),
            crypto.clone(),
        )?);
        Self::new(config, client, crypto)
    }
}

impl PaymentProviderAdapter for WeChatPayProviderAdapter {
    fn capabilities(&self) -> &'static PaymentProviderCapabilities {
        &WECHAT_PAY_REAL_CAPABILITIES
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
            let description = metadata_string(&request.metadata, "description")
                .map(str::to_owned)
                .unwrap_or_else(|| out_trade_no.clone());
            let notify_url = require_non_empty(
                self.config.notify_url.as_deref(),
                PaymentAdapterOperation::CreatePaymentIntent,
                "notify_url",
            )?;
            let response = self
                .client
                .post_json(
                    "/v3/pay/transactions/native",
                    json!({
                        "appid": self.config.app_id,
                        "mchid": self.config.mch_id,
                        "description": description,
                        "out_trade_no": out_trade_no,
                        "notify_url": notify_url,
                        "amount": {
                            "total": amount_minor,
                            "currency": "CNY",
                        },
                    }),
                )
                .await?;
            Ok(PaymentProviderOperationOutcome {
                supplier_code: WECHAT_PAY_PROVIDER_CODE.to_owned(),
                native_id: Some(out_trade_no),
                raw_status: Some("CREATED".to_owned()),
                payload: response,
            })
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
            self.client
                .post_json(
                    &format!("/v3/pay/transactions/out-trade-no/{out_trade_no}/close"),
                    json!({ "mchid": self.config.mch_id }),
                )
                .await?;
            Ok(PaymentProviderOperationOutcome {
                supplier_code: WECHAT_PAY_PROVIDER_CODE.to_owned(),
                native_id: Some(out_trade_no.clone()),
                raw_status: Some("CLOSED".to_owned()),
                payload: json!({ "out_trade_no": out_trade_no, "status": "CLOSED" }),
            })
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
            let out_refund_no = require_non_empty(
                request.refund_no.as_deref(),
                PaymentAdapterOperation::CreateRefund,
                "refund_no",
            )?;
            let refund_amount = require_positive_amount(
                request.amount_minor,
                PaymentAdapterOperation::CreateRefund,
                "amount_minor",
            )?;
            let total_amount = request
                .metadata
                .get("total_amount_minor")
                .and_then(Value::as_i64)
                .filter(|amount| *amount > 0)
                .ok_or_else(|| {
                    invalid_request(
                        PaymentAdapterOperation::CreateRefund,
                        "WeChat Pay metadata.total_amount_minor is required",
                    )
                })?;
            let mut payload = json!({
                "out_trade_no": out_trade_no,
                "out_refund_no": out_refund_no,
                "amount": {
                    "refund": refund_amount,
                    "total": total_amount,
                    "currency": "CNY",
                },
            });
            if let Some(reason) = normalized_optional(request.reason) {
                payload["reason"] = json!(reason);
            }
            let response = self
                .client
                .post_json("/v3/refund/domestic/refunds", payload)
                .await?;
            wechat_pay_operation_outcome(PaymentAdapterOperation::CreateRefund, response)
        })
    }

    fn query_refund<'a>(
        &'a self,
        request: PaymentQueryRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        Box::pin(async move {
            let out_refund_no = require_non_empty(
                request.refund_no.as_deref(),
                PaymentAdapterOperation::QueryRefund,
                "refund_no",
            )?;
            let response = self
                .client
                .get(&format!("/v3/refund/domestic/refunds/{out_refund_no}"))
                .await?;
            wechat_pay_operation_outcome(PaymentAdapterOperation::QueryRefund, response)
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
            let timestamp = require_header(&request.headers, "wechatpay-timestamp")?;
            let nonce = require_header(&request.headers, "wechatpay-nonce")?;
            let signature = require_header(&request.headers, "wechatpay-signature")?;
            let body = std::str::from_utf8(&request.body).map_err(|error| {
                invalid_response(
                    PaymentAdapterOperation::VerifyWebhook,
                    format!("WeChat Pay webhook body must be UTF-8: {error}"),
                )
            })?;
            let payload = format!("{timestamp}\n{nonce}\n{body}\n");
            let verified = self.crypto.verify(&payload, &signature)?;
            Ok(PaymentWebhookVerificationOutcome {
                verified,
                provider_event_id: if verified {
                    parse_webhook_event_id(&request.body)?
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
            let mut payload =
                parse_body_json(&request.body, PaymentAdapterOperation::NormalizeWebhook)?;
            if let Some(resource) = payload.get("resource") {
                if let (Some(associated_data), Some(nonce), Some(ciphertext)) = (
                    resource.get("associated_data").and_then(Value::as_str),
                    resource.get("nonce").and_then(Value::as_str),
                    resource.get("ciphertext").and_then(Value::as_str),
                ) {
                    let plaintext =
                        self.crypto
                            .decrypt_resource(associated_data, nonce, ciphertext)?;
                    let plaintext =
                        serde_json::from_slice::<Value>(&plaintext).map_err(|error| {
                            invalid_response(
                                PaymentAdapterOperation::NormalizeWebhook,
                                format!("WeChat Pay decrypted resource is invalid JSON: {error}"),
                            )
                        })?;
                    payload["resource_plaintext"] = plaintext;
                }
            }
            Ok(PaymentNormalizedWebhookEvent {
                supplier_code: WECHAT_PAY_PROVIDER_CODE.to_owned(),
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
            let bill_date = require_non_empty(
                request.statement_date.as_deref(),
                PaymentAdapterOperation::DownloadStatement,
                "statement_date",
            )?;
            validate_yyyy_mm_dd(&bill_date)?;
            let statement_type = request
                .statement_type
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .unwrap_or("tradebill");
            if statement_type != "tradebill" {
                return Err(invalid_request(
                    PaymentAdapterOperation::DownloadStatement,
                    "WeChat Pay statement_type currently supports tradebill",
                ));
            }
            let response = self
                .client
                .get(&format!(
                    "/v3/bill/tradebill?bill_date={bill_date}&bill_type=ALL"
                ))
                .await?;
            let content = serde_json::to_vec(&response).map_err(|error| {
                invalid_response(
                    PaymentAdapterOperation::DownloadStatement,
                    format!("WeChat Pay bill response could not be serialized: {error}"),
                )
            })?;
            Ok(PaymentStatementDownloadOutcome {
                statement_id: Some(format!("wechat_pay_tradebill_{bill_date}")),
                content,
                metadata: json!({
                    "supplier_code": WECHAT_PAY_PROVIDER_CODE,
                    "source_type": "wechat_pay_tradebill",
                    "bill_date": bill_date,
                    "download_url": response.get("download_url").and_then(Value::as_str),
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
                    format!("WeChat Pay bill content must be UTF-8 CSV: {error}"),
                )
            })?;
            let parsed = parse_wechat_pay_csv_bill(&content)?;
            Ok(PaymentStatementParseOutcome {
                statement_id: request.statement_id,
                item_count: parsed.item_count,
                metadata: json!({
                    "supplier_code": WECHAT_PAY_PROVIDER_CODE,
                    "source_type": "wechat_pay_tradebill",
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
pub struct WeChatPayHyperApiClient {
    api_base_url: String,
    config: WeChatPayProviderConfig,
    crypto: Arc<dyn WeChatPayCrypto>,
    client: WeChatPayHttpClient,
}

impl WeChatPayHyperApiClient {
    pub fn new(
        config: WeChatPayProviderConfig,
        crypto: Arc<dyn WeChatPayCrypto>,
    ) -> Result<Self, PaymentProviderRegistryError> {
        Self::with_api_base_url(config, crypto, WECHAT_PAY_API_BASE_URL)
    }

    pub fn with_api_base_url(
        config: WeChatPayProviderConfig,
        crypto: Arc<dyn WeChatPayCrypto>,
        api_base_url: impl Into<String>,
    ) -> Result<Self, PaymentProviderRegistryError> {
        let api_base_url = normalize_api_base_url(api_base_url.into())?;
        Ok(Self {
            api_base_url,
            config,
            crypto,
            client: build_wechat_pay_http_client(),
        })
    }

    async fn send(
        &self,
        method: Method,
        path: &str,
        payload: Option<Value>,
    ) -> Result<Value, PaymentProviderRegistryError> {
        let body = match payload {
            Some(payload) => serde_json::to_vec(&payload).map_err(|error| {
                invalid_request(
                    PaymentAdapterOperation::InvokeNativeOperation,
                    format!("WeChat Pay request payload could not be serialized: {error}"),
                )
            })?,
            None => Vec::new(),
        };
        let timestamp = unix_timestamp().to_string();
        let nonce = format!("sdkwork-{timestamp}");
        let body_text = String::from_utf8_lossy(&body);
        let sign_payload = format!("{method}\n{path}\n{timestamp}\n{nonce}\n{body_text}\n");
        let signature = self.crypto.sign(&sign_payload)?;
        let authorization = format!(
            "WECHATPAY2-SHA256-RSA2048 mchid=\"{}\",nonce_str=\"{}\",signature=\"{}\",timestamp=\"{}\",serial_no=\"{}\"",
            self.config.mch_id, nonce, signature, timestamp, self.config.merchant_serial_no
        );
        let mut builder = Request::builder()
            .method(method)
            .uri(wechat_pay_uri(&self.api_base_url, path)?)
            .header(AUTHORIZATION, authorization);
        if !body.is_empty() {
            builder = builder.header(CONTENT_TYPE, "application/json");
        }
        let request = builder
            .body(Full::new(Bytes::from(body)))
            .map_err(|error| {
                invalid_request(
                    PaymentAdapterOperation::InvokeNativeOperation,
                    format!("WeChat Pay request could not be built: {error}"),
                )
            })?;
        let response = self.client.request(request).await.map_err(|error| {
            provider_failed(
                PaymentAdapterOperation::InvokeNativeOperation,
                format!("WeChat Pay request failed: {error}"),
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
                    format!("WeChat Pay response body failed: {error}"),
                    true,
                )
            })?
            .to_bytes();
        if !(200..300).contains(&status_code) {
            return Err(provider_failed(
                PaymentAdapterOperation::InvokeNativeOperation,
                format!("WeChat Pay returned HTTP {status_code}"),
                status_code == 429 || status_code >= 500,
            ));
        }
        if bytes.is_empty() {
            return Ok(json!({}));
        }
        serde_json::from_slice::<Value>(&bytes).map_err(|error| {
            invalid_response(
                PaymentAdapterOperation::InvokeNativeOperation,
                format!("WeChat Pay returned invalid JSON: {error}"),
            )
        })
    }
}

impl fmt::Debug for WeChatPayHyperApiClient {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("WeChatPayHyperApiClient")
            .field("api_base_url", &self.api_base_url)
            .field("app_id", &self.config.app_id)
            .field("mch_id", &self.config.mch_id)
            .finish_non_exhaustive()
    }
}

impl WeChatPayApiClient for WeChatPayHyperApiClient {
    fn post_json<'a>(&'a self, path: &'a str, payload: Value) -> PaymentAdapterFuture<'a, Value> {
        Box::pin(async move { self.send(Method::POST, path, Some(payload)).await })
    }

    fn get<'a>(&'a self, path: &'a str) -> PaymentAdapterFuture<'a, Value> {
        Box::pin(async move { self.send(Method::GET, path, None).await })
    }
}

fn wechat_pay_operation_outcome(
    operation: PaymentAdapterOperation,
    response: Value,
) -> Result<PaymentProviderOperationOutcome, PaymentProviderRegistryError> {
    let native_id = response
        .get("refund_id")
        .and_then(Value::as_str)
        .or_else(|| response.get("transaction_id").and_then(Value::as_str))
        .or_else(|| response.get("out_refund_no").and_then(Value::as_str))
        .map(str::to_owned)
        .ok_or_else(|| invalid_response(operation, "WeChat Pay response is missing native id"))?;
    Ok(PaymentProviderOperationOutcome {
        supplier_code: WECHAT_PAY_PROVIDER_CODE.to_owned(),
        native_id: Some(native_id),
        raw_status: response
            .get("status")
            .and_then(Value::as_str)
            .or_else(|| response.get("trade_state").and_then(Value::as_str))
            .map(str::to_owned),
        payload: response,
    })
}

fn parse_body_json(
    body: &[u8],
    operation: PaymentAdapterOperation,
) -> Result<Value, PaymentProviderRegistryError> {
    serde_json::from_slice::<Value>(body).map_err(|error| {
        invalid_response(
            operation,
            format!("WeChat Pay JSON payload is invalid: {error}"),
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
                format!("WeChat Pay webhook header {name} is required"),
            )
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
            format!("WeChat Pay {field} must be a positive minor-unit amount"),
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
            "WeChat Pay domestic baseline currently supports CNY only",
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
            format!("WeChat Pay {field} is required"),
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

fn normalized_optional(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

struct ParsedWeChatPayBill {
    item_count: usize,
    gross_amount_minor: i64,
    fee_amount_minor: i64,
    net_amount_minor: i64,
}

fn parse_wechat_pay_csv_bill(
    content: &str,
) -> Result<ParsedWeChatPayBill, PaymentProviderRegistryError> {
    let mut lines = content.lines().filter(|line| !line.trim().is_empty());
    let header = lines.next().ok_or_else(|| {
        invalid_response(
            PaymentAdapterOperation::ParseStatement,
            "WeChat Pay bill CSV header is required",
        )
    })?;
    let headers = header.split(',').map(str::trim).collect::<Vec<_>>();
    let total_index = csv_header_index(&headers, "total_amount")?;
    let fee_index = csv_header_index(&headers, "poundage")?;
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
    Ok(ParsedWeChatPayBill {
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
                format!("WeChat Pay bill CSV missing {name} column"),
            )
        })
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
            "WeChat Pay statement_date must use YYYY-MM-DD",
        ));
    }
    Ok(())
}

fn normalize_api_base_url(api_base_url: String) -> Result<String, PaymentProviderRegistryError> {
    let api_base_url = api_base_url.trim().trim_end_matches('/').to_owned();
    if api_base_url.is_empty() {
        return Err(invalid_request(
            PaymentAdapterOperation::InvokeNativeOperation,
            "WeChat Pay API base URL is required",
        ));
    }
    let uri = api_base_url.parse::<Uri>().map_err(|error| {
        invalid_request(
            PaymentAdapterOperation::InvokeNativeOperation,
            format!("WeChat Pay API base URL is invalid: {error}"),
        )
    })?;
    if !matches!(uri.scheme_str(), Some("http" | "https")) || uri.authority().is_none() {
        return Err(invalid_request(
            PaymentAdapterOperation::InvokeNativeOperation,
            "WeChat Pay API base URL must be an absolute http or https URL",
        ));
    }
    Ok(api_base_url)
}

fn wechat_pay_uri(api_base_url: &str, path: &str) -> Result<Uri, PaymentProviderRegistryError> {
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
                format!("WeChat Pay request URI is invalid: {error}"),
            )
        })
}

fn unix_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

fn validate_config_secret(field: &str, value: &str) -> Result<(), PaymentProviderRegistryError> {
    if value.trim().is_empty() {
        return Err(invalid_request(
            PaymentAdapterOperation::InvokeNativeOperation,
            format!("WeChat Pay {field} is required"),
        ));
    }
    Ok(())
}

fn unsupported<T>(operation: PaymentAdapterOperation) -> PaymentAdapterFuture<'static, T> {
    Box::pin(async move {
        Err(PaymentProviderRegistryError::UnsupportedCapability {
            supplier_code: WECHAT_PAY_PROVIDER_CODE.to_owned(),
            operation,
        })
    })
}

fn invalid_request(
    operation: PaymentAdapterOperation,
    message: impl Into<String>,
) -> PaymentProviderRegistryError {
    PaymentProviderRegistryError::InvalidProviderRequest {
        supplier_code: WECHAT_PAY_PROVIDER_CODE.to_owned(),
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
        supplier_code: WECHAT_PAY_PROVIDER_CODE.to_owned(),
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
        supplier_code: WECHAT_PAY_PROVIDER_CODE.to_owned(),
        operation,
        message: message.into(),
    }
}

fn build_wechat_pay_http_client() -> WeChatPayHttpClient {
    ensure_rustls_crypto_provider();
    let connector = hyper_rustls::HttpsConnectorBuilder::new()
        .with_webpki_roots()
        .https_or_http()
        .enable_http1()
        .build();
    Client::builder(TokioExecutor::new()).build(connector)
}
