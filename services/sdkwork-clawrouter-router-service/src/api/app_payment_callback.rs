use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Bytes;
use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{Json, Router};
use hmac::{Hmac, Mac};
use sdkwork_claw_config::PaymentWebhookConfig;
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::api::response::PlusApiResult;
use crate::application::{default_payment_provider_registry, EntityUuidGenerator};
use crate::domain::{DecimalValue, DomainError};
use crate::infrastructure::OsApiKeySecretGenerator;
use crate::ports::{
    PaymentCallbackCommand, PaymentCallbackFuture, PaymentCallbackOutcome, PaymentCallbackStatus,
    PaymentCallbackStore,
};

type HmacSha256 = Hmac<Sha256>;

const DEFAULT_CALLBACK_BODY_MAX_BYTES: usize =
    sdkwork_claw_config::RequestLimitsConfig::DEFAULT_PAYMENT_CALLBACK_BODY_MAX_BYTES;
const MAX_HEADER_VALUE_LEN: usize = 256;
const MAX_TRADE_NO_LEN: usize = 128;

struct AppPaymentCallbackState {
    store: Arc<dyn PaymentCallbackStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    payment_webhook_config: Option<PaymentWebhookConfig>,
    store_available: bool,
    body_max_bytes: usize,
}

impl Clone for AppPaymentCallbackState {
    fn clone(&self) -> Self {
        Self {
            store: Arc::clone(&self.store),
            entity_uuid_generator: Arc::clone(&self.entity_uuid_generator),
            payment_webhook_config: self.payment_webhook_config.clone(),
            store_available: self.store_available,
            body_max_bytes: self.body_max_bytes,
        }
    }
}

struct EmptyPaymentCallbackStore;

impl PaymentCallbackStore for EmptyPaymentCallbackStore {
    fn process_payment_callback<'a>(
        &'a self,
        _command: PaymentCallbackCommand,
    ) -> PaymentCallbackFuture<'a> {
        Box::pin(async {
            Err(DomainError::new(
                "payment callback command store is unavailable without database configuration",
            ))
        })
    }
}

pub fn app_payment_callback_router() -> Router {
    app_payment_callback_router_with_state(
        Arc::new(EmptyPaymentCallbackStore),
        Arc::new(OsApiKeySecretGenerator),
        None,
        false,
        DEFAULT_CALLBACK_BODY_MAX_BYTES,
    )
}

pub fn app_payment_callback_router_with_store(
    store: Arc<dyn PaymentCallbackStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    payment_webhook_config: PaymentWebhookConfig,
) -> Router {
    app_payment_callback_router_with_store_and_body_limit(
        store,
        entity_uuid_generator,
        payment_webhook_config,
        DEFAULT_CALLBACK_BODY_MAX_BYTES,
    )
}

pub fn app_payment_callback_router_with_store_and_body_limit(
    store: Arc<dyn PaymentCallbackStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    payment_webhook_config: PaymentWebhookConfig,
    body_max_bytes: usize,
) -> Router {
    app_payment_callback_router_with_state(
        store,
        entity_uuid_generator,
        Some(payment_webhook_config),
        true,
        body_max_bytes,
    )
}

fn app_payment_callback_router_with_state(
    store: Arc<dyn PaymentCallbackStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
    payment_webhook_config: Option<PaymentWebhookConfig>,
    store_available: bool,
    body_max_bytes: usize,
) -> Router {
    Router::new()
        .route(
            "/app/v3/api/payments/callback/wechat",
            post(wechat_payment_callback),
        )
        .route(
            "/app/v3/api/payments/callback/alipay",
            post(alipay_payment_callback),
        )
        .route(
            "/app/v3/api/payments/callback/{provider}",
            post(generic_payment_callback),
        )
        .with_state(AppPaymentCallbackState {
            store,
            entity_uuid_generator,
            payment_webhook_config,
            store_available,
            body_max_bytes: body_max_bytes.max(1),
        })
}

async fn wechat_payment_callback(
    State(state): State<AppPaymentCallbackState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    process_payment_callback(
        state,
        headers,
        Some("wechat".to_owned()),
        body,
        AckMode::Wechat,
    )
    .await
}

async fn alipay_payment_callback(
    State(state): State<AppPaymentCallbackState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    process_payment_callback(
        state,
        headers,
        Some("alipay".to_owned()),
        body,
        AckMode::Alipay,
    )
    .await
}

async fn generic_payment_callback(
    State(state): State<AppPaymentCallbackState>,
    headers: HeaderMap,
    Path(provider): Path<String>,
    body: Bytes,
) -> Response {
    process_payment_callback(state, headers, Some(provider), body, AckMode::Json).await
}

#[derive(Debug, Clone, Copy)]
enum AckMode {
    Json,
    Wechat,
    Alipay,
}

async fn process_payment_callback(
    state: AppPaymentCallbackState,
    headers: HeaderMap,
    provider: Option<String>,
    body: Bytes,
    ack_mode: AckMode,
) -> Response {
    if !state.store_available {
        return callback_system_response(
            ack_mode,
            "payment callback command store is unavailable without database configuration",
        );
    }
    let command = match build_payment_callback_command(state.clone(), &headers, provider, &body) {
        Ok(command) => command,
        Err(message) => return callback_bad_request_response(ack_mode, message),
    };

    match state.store.process_payment_callback(command).await {
        Ok(outcome) => callback_success_response(ack_mode, outcome),
        Err(error) if error.is_conflict() => {
            callback_conflict_response(ack_mode, error.to_string())
        }
        Err(error) => callback_system_response(ack_mode, &error.to_string()),
    }
}

fn build_payment_callback_command(
    state: AppPaymentCallbackState,
    headers: &HeaderMap,
    provider: Option<String>,
    body: &[u8],
) -> Result<PaymentCallbackCommand, String> {
    let provider_raw = provider.unwrap_or_default();
    let provider_code = resolve_payment_provider_code(&provider_raw)?;
    let parsed = validate_payment_callback(&provider_code, body, state.body_max_bytes)?;
    let payload_digest = sha256_hex(body);
    let payment_webhook_config = state.payment_webhook_config.as_ref().ok_or_else(|| {
        format!(
            "payment callback signature secret is required: {}",
            PaymentWebhookConfig::ENV_PAYMENT_WEBHOOK_SECRET
        )
    })?;
    let request_timestamp = parse_callback_timestamp(
        headers,
        payment_webhook_config.max_clock_skew_seconds() as i64,
    )?;
    let signature = callback_header(
        headers,
        &[
            "x-sdkwork-signature",
            "Wechatpay-Signature",
            "wechatpay-signature",
            "alipay-signature",
        ],
    );
    validate_payment_callback_signature(
        payment_webhook_config,
        headers,
        body,
        signature.as_deref(),
        request_timestamp,
    )?;
    let nonce = callback_header(headers, &["x-sdkwork-nonce"])
        .unwrap_or_else(|| take_prefix(&payload_digest, 32));
    let event_id =
        callback_header(headers, &["x-sdkwork-event-id", "x-event-id"]).unwrap_or_else(|| {
            sha256_text(&format!(
                "{provider_code}|{nonce}|{}|{payload_digest}",
                request_timestamp.unwrap_or_default()
            ))
        });
    let received_at = format_unix_timestamp(current_unix_timestamp());

    Ok(PaymentCallbackCommand {
        provider_code,
        event_uuid: generate_entity_uuid(&state)?,
        delivery_uuid: generate_entity_uuid(&state)?,
        account_uuid: generate_entity_uuid(&state)?,
        account_history_uuid: generate_entity_uuid(&state)?,
        event_id,
        nonce,
        signature,
        request_timestamp,
        payload_digest,
        out_trade_no: parsed.out_trade_no,
        transaction_id: parsed.transaction_id,
        amount: parsed.amount,
        status: parsed.status,
        received_at,
    })
}

fn generate_entity_uuid(state: &AppPaymentCallbackState) -> Result<String, String> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(|error| error.to_string())
}

fn validate_payment_callback(
    provider_code: &str,
    body: &[u8],
    max_body_bytes: usize,
) -> Result<ParsedPaymentCallback, String> {
    if body.is_empty() {
        return Err("payment callback payload must not be empty".to_owned());
    }
    if body.len() > max_body_bytes {
        return Err(format!(
            "payment callback payload length must not exceed {max_body_bytes} bytes"
        ));
    }
    let raw = std::str::from_utf8(body)
        .map_err(|_| "payment callback payload must be valid UTF-8".to_owned())?;
    let parsed = parse_payment_callback_payload(provider_code, raw)?;
    if parsed.out_trade_no.is_empty() {
        return Err("payment callback outTradeNo must not be empty".to_owned());
    }
    if parsed.out_trade_no.chars().count() > MAX_TRADE_NO_LEN {
        return Err(format!(
            "payment callback out_trade_no length must not exceed {MAX_TRADE_NO_LEN} characters"
        ));
    }
    if !parsed
        .out_trade_no
        .bytes()
        .all(|byte| (0x21..=0x7e).contains(&byte))
    {
        return Err(
            "payment callback out_trade_no must contain only visible ASCII characters".to_owned(),
        );
    }
    if parsed.status == PaymentCallbackStatus::Success {
        if parsed.transaction_id.is_empty() {
            return Err("payment callback transactionId must not be empty".to_owned());
        }
        let amount = parsed
            .amount
            .as_deref()
            .ok_or_else(|| "payment callback amount is required for success".to_owned())?;
        let amount = DecimalValue::parse(amount)
            .map_err(|_| "payment callback amount must be a decimal amount".to_owned())?;
        if amount <= DecimalValue::ZERO {
            return Err("payment callback amount must be greater than zero".to_owned());
        }
    }
    Ok(parsed)
}

#[derive(Debug, Clone)]
struct ParsedPaymentCallback {
    out_trade_no: String,
    transaction_id: String,
    amount: Option<String>,
    status: PaymentCallbackStatus,
}

fn parse_payment_callback_payload(
    provider_code: &str,
    raw: &str,
) -> Result<ParsedPaymentCallback, String> {
    let trimmed = raw.trim();
    if trimmed.starts_with('{') {
        let value: Value = serde_json::from_str(trimmed)
            .map_err(|error| format!("invalid payment callback json payload: {error}"))?;
        return parse_json_payment_callback(&value);
    }
    if trimmed.starts_with('<') {
        return parse_xml_payment_callback(provider_code, trimmed);
    }
    parse_form_payment_callback(trimmed)
}

fn parse_json_payment_callback(value: &Value) -> Result<ParsedPaymentCallback, String> {
    let out_trade_no = json_string(
        value,
        &["outTradeNo", "out_trade_no", "orderNo", "order_no"],
    )
    .unwrap_or_default();
    let transaction_id = json_string(
        value,
        &[
            "transactionId",
            "transaction_id",
            "tradeNo",
            "trade_no",
            "transactionNo",
        ],
    )
    .unwrap_or_else(|| out_trade_no.clone());
    let status_raw = json_string(value, &["status", "tradeStatus", "trade_status", "event"])
        .unwrap_or_else(|| "success".to_owned());
    let amount = match json_money_amount(
        value,
        &[
            "amount",
            "totalAmount",
            "total_amount",
            "paymentAmount",
            "payment_amount",
        ],
    )? {
        Some(amount) => Some(amount),
        None => json_total_fee_cents(value, &["total_fee"])?,
    };
    Ok(ParsedPaymentCallback {
        out_trade_no: out_trade_no.trim().to_owned(),
        transaction_id: transaction_id.trim().to_owned(),
        amount,
        status: normalize_callback_status(&status_raw)?,
    })
}

fn parse_form_payment_callback(raw: &str) -> Result<ParsedPaymentCallback, String> {
    let pairs = parse_form_pairs(raw);
    let out_trade_no = form_value(
        &pairs,
        &["outTradeNo", "out_trade_no", "orderNo", "order_no"],
    )
    .unwrap_or_default();
    let transaction_id = form_value(
        &pairs,
        &[
            "transactionId",
            "transaction_id",
            "tradeNo",
            "trade_no",
            "transactionNo",
        ],
    )
    .unwrap_or_else(|| out_trade_no.clone());
    let status_raw = form_value(&pairs, &["status", "tradeStatus", "trade_status", "event"])
        .unwrap_or_else(|| "success".to_owned());
    let amount = match form_money_amount(
        &pairs,
        &[
            "amount",
            "totalAmount",
            "total_amount",
            "paymentAmount",
            "payment_amount",
        ],
    )? {
        Some(amount) => Some(amount),
        None => form_total_fee_cents(&pairs, &["total_fee"])?,
    };
    Ok(ParsedPaymentCallback {
        out_trade_no: out_trade_no.trim().to_owned(),
        transaction_id: transaction_id.trim().to_owned(),
        amount,
        status: normalize_callback_status(&status_raw)?,
    })
}

fn parse_xml_payment_callback(
    provider_code: &str,
    raw: &str,
) -> Result<ParsedPaymentCallback, String> {
    let out_trade_no = xml_value(raw, "out_trade_no")
        .or_else(|| xml_value(raw, "outTradeNo"))
        .unwrap_or_default();
    let transaction_id = xml_value(raw, "transaction_id")
        .or_else(|| xml_value(raw, "transactionId"))
        .or_else(|| xml_value(raw, "trade_no"))
        .unwrap_or_else(|| out_trade_no.clone());
    let status_raw = xml_value(raw, "trade_state")
        .or_else(|| xml_value(raw, "trade_status"))
        .or_else(|| xml_value(raw, "result_code"))
        .or_else(|| xml_value(raw, "return_code"))
        .unwrap_or_else(|| {
            if provider_code == "wechat_pay" {
                "SUCCESS".to_owned()
            } else {
                "success".to_owned()
            }
        });
    let amount = match xml_money_amount(raw, &["amount", "total_amount"])? {
        Some(amount) => Some(amount),
        None => xml_total_fee_cents(raw, &["total_fee"])?,
    };
    Ok(ParsedPaymentCallback {
        out_trade_no: out_trade_no.trim().to_owned(),
        transaction_id: transaction_id.trim().to_owned(),
        amount,
        status: normalize_callback_status(&status_raw)?,
    })
}

fn resolve_payment_provider_code(raw_provider: &str) -> Result<String, String> {
    let registry = default_payment_provider_registry();
    let adapter = registry
        .resolve(raw_provider)
        .map_err(|_| format!("unsupported payment provider: {raw_provider}"))?;
    Ok(adapter.capabilities().provider_code.to_owned())
}

fn normalize_callback_status(raw: &str) -> Result<PaymentCallbackStatus, String> {
    match raw.trim().to_ascii_lowercase().as_str() {
        "success" | "paid" | "succeeded" | "trade_success" | "trade_finished" | "finished"
        | "payment.succeeded" => Ok(PaymentCallbackStatus::Success),
        "failed" | "fail" | "payment.failed" | "trade_failed" => Ok(PaymentCallbackStatus::Failed),
        "closed" | "close" | "cancelled" | "canceled" | "timeout" | "expired" => {
            Ok(PaymentCallbackStatus::Closed)
        }
        value => Err(format!("unsupported payment callback status: {value}")),
    }
}

fn parse_callback_timestamp(
    headers: &HeaderMap,
    max_clock_skew_seconds: i64,
) -> Result<Option<i64>, String> {
    let Some(raw) = callback_header(headers, &["x-sdkwork-timestamp", "x-timestamp"]) else {
        return Ok(None);
    };
    let timestamp = raw
        .parse::<i64>()
        .map_err(|_| "payment callback timestamp must be a unix timestamp".to_owned())?;
    let skew = (current_unix_timestamp() - timestamp).abs();
    if skew > max_clock_skew_seconds {
        return Err("payment callback timestamp is outside allowed skew".to_owned());
    }
    Ok(Some(timestamp))
}

fn validate_payment_callback_signature(
    config: &PaymentWebhookConfig,
    headers: &HeaderMap,
    body: &[u8],
    signature: Option<&str>,
    request_timestamp: Option<i64>,
) -> Result<(), String> {
    let signature = signature.ok_or_else(|| "payment callback signature is required".to_owned())?;
    let timestamp = request_timestamp.ok_or_else(|| {
        "payment callback timestamp is required when signature is enabled".to_owned()
    })?;
    let mut mac = HmacSha256::new_from_slice(config.signing_secret().as_bytes())
        .map_err(|_| "payment callback signature secret is invalid".to_owned())?;
    mac.update(timestamp.to_string().as_bytes());
    mac.update(b".");
    mac.update(body);
    let expected = hex::encode(mac.finalize().into_bytes());
    let provided = normalize_signature(signature);
    if expected.eq_ignore_ascii_case(&provided) {
        Ok(())
    } else {
        let provider_hint = callback_header(headers, &["Wechatpay-Signature"])
            .map(|_| "Wechatpay-Signature")
            .unwrap_or("x-sdkwork-signature");
        Err(format!(
            "payment callback signature verification failed for {provider_hint}"
        ))
    }
}

fn callback_header(headers: &HeaderMap, names: &[&str]) -> Option<String> {
    names.iter().find_map(|name| {
        headers
            .get(*name)
            .and_then(|value| value.to_str().ok())
            .map(str::trim)
            .filter(|value| !value.is_empty() && value.chars().count() <= MAX_HEADER_VALUE_LEN)
            .map(ToOwned::to_owned)
    })
}

fn json_string(value: &Value, aliases: &[&str]) -> Option<String> {
    aliases.iter().find_map(|alias| match value.get(*alias) {
        Some(Value::String(value)) => Some(value.clone()),
        Some(Value::Number(value)) => Some(value.to_string()),
        _ => None,
    })
}

fn json_money_amount(value: &Value, aliases: &[&str]) -> Result<Option<String>, String> {
    let Some(raw) = json_scalar(value, aliases) else {
        return Ok(None);
    };
    parse_callback_money_amount(&raw).map(Some)
}

fn json_total_fee_cents(value: &Value, aliases: &[&str]) -> Result<Option<String>, String> {
    let Some(raw) = json_scalar(value, aliases) else {
        return Ok(None);
    };
    parse_total_fee_cents(&raw).map(Some)
}

fn json_scalar(value: &Value, aliases: &[&str]) -> Option<String> {
    aliases.iter().find_map(|alias| match value.get(*alias) {
        Some(Value::String(value)) => Some(value.clone()),
        Some(Value::Number(value)) => Some(value.to_string()),
        _ => None,
    })
}

fn parse_form_pairs(raw: &str) -> Vec<(String, String)> {
    raw.split('&')
        .filter_map(|pair| {
            let (key, value) = pair.split_once('=')?;
            Some((decode_form_component(key), decode_form_component(value)))
        })
        .collect()
}

fn form_value(pairs: &[(String, String)], aliases: &[&str]) -> Option<String> {
    aliases.iter().find_map(|alias| {
        pairs
            .iter()
            .find(|(key, _)| key.eq_ignore_ascii_case(alias))
            .map(|(_, value)| value.clone())
    })
}

fn form_money_amount(
    pairs: &[(String, String)],
    aliases: &[&str],
) -> Result<Option<String>, String> {
    let Some(raw) = form_value(pairs, aliases) else {
        return Ok(None);
    };
    parse_callback_money_amount(&raw).map(Some)
}

fn form_total_fee_cents(
    pairs: &[(String, String)],
    aliases: &[&str],
) -> Result<Option<String>, String> {
    let Some(raw) = form_value(pairs, aliases) else {
        return Ok(None);
    };
    parse_total_fee_cents(&raw).map(Some)
}

fn decode_form_component(raw: &str) -> String {
    let mut bytes = Vec::with_capacity(raw.len());
    let raw = raw.as_bytes();
    let mut index = 0;
    while index < raw.len() {
        if raw[index] == b'+' {
            bytes.push(b' ');
            index += 1;
        } else if raw[index] == b'%' && index + 2 < raw.len() {
            let hi = hex_nibble(raw[index + 1]);
            let lo = hex_nibble(raw[index + 2]);
            if let (Some(hi), Some(lo)) = (hi, lo) {
                bytes.push((hi << 4) | lo);
                index += 3;
            } else {
                bytes.push(raw[index]);
                index += 1;
            }
        } else {
            bytes.push(raw[index]);
            index += 1;
        }
    }
    String::from_utf8_lossy(&bytes).into_owned()
}

fn hex_nibble(value: u8) -> Option<u8> {
    match value {
        b'0'..=b'9' => Some(value - b'0'),
        b'a'..=b'f' => Some(value - b'a' + 10),
        b'A'..=b'F' => Some(value - b'A' + 10),
        _ => None,
    }
}

fn xml_value(raw: &str, tag: &str) -> Option<String> {
    let start = format!("<{tag}>");
    let end = format!("</{tag}>");
    let start_index = raw.find(&start)? + start.len();
    let end_index = raw[start_index..].find(&end)? + start_index;
    let value = raw[start_index..end_index].trim();
    Some(
        value
            .strip_prefix("<![CDATA[")
            .and_then(|value| value.strip_suffix("]]>"))
            .unwrap_or(value)
            .trim()
            .to_owned(),
    )
}

fn xml_money_amount(raw: &str, aliases: &[&str]) -> Result<Option<String>, String> {
    let Some(raw) = aliases.iter().find_map(|tag| xml_value(raw, tag)) else {
        return Ok(None);
    };
    parse_callback_money_amount(&raw).map(Some)
}

fn xml_total_fee_cents(raw: &str, aliases: &[&str]) -> Result<Option<String>, String> {
    let Some(raw) = aliases.iter().find_map(|tag| xml_value(raw, tag)) else {
        return Ok(None);
    };
    parse_total_fee_cents(&raw).map(Some)
}

fn parse_callback_money_amount(raw: &str) -> Result<String, String> {
    let value = raw.trim();
    if value.is_empty() {
        return Err("payment callback amount must not be empty".to_owned());
    }
    if has_sub_cent_precision(value) {
        return Err("payment callback amount must not contain sub-cent precision".to_owned());
    }
    DecimalValue::parse(value)
        .map(|amount| amount.to_fixed_string(2))
        .map_err(|_| "payment callback amount must be a decimal amount".to_owned())
}

fn parse_total_fee_cents(raw: &str) -> Result<String, String> {
    let value = raw.trim();
    if value.is_empty() {
        return Err("payment callback total_fee must not be empty".to_owned());
    }
    if !value.chars().all(|ch| ch.is_ascii_digit()) {
        return Err("payment callback total_fee must be integer cents".to_owned());
    }
    let cents = value
        .parse::<i128>()
        .map_err(|_| "payment callback total_fee is too large".to_owned())?;
    Ok(format!("{}.{:02}", cents / 100, cents % 100))
}

fn has_sub_cent_precision(value: &str) -> bool {
    let unsigned = value.trim_start_matches('-');
    let Some((_, fraction)) = unsigned.split_once('.') else {
        return false;
    };
    fraction
        .chars()
        .skip(2)
        .any(|ch| ch.is_ascii_digit() && ch != '0')
}

fn callback_success_response(ack_mode: AckMode, outcome: PaymentCallbackOutcome) -> Response {
    match ack_mode {
        AckMode::Json => Json(PlusApiResult::success(outcome)).into_response(),
        AckMode::Wechat => (
            StatusCode::OK,
            [("content-type", "application/xml; charset=utf-8")],
            "<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>",
        )
            .into_response(),
        AckMode::Alipay => (StatusCode::OK, "success").into_response(),
    }
}

fn callback_bad_request_response(ack_mode: AckMode, message: String) -> Response {
    match ack_mode {
        AckMode::Json => PlusApiResult::error("4001", message)).into_response(),
        AckMode::Wechat => (
            StatusCode::BAD_REQUEST,
            [("content-type", "application/xml; charset=utf-8")],
            "<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[invalid callback]]></return_msg></xml>",
        )
            .into_response(),
        AckMode::Alipay => (StatusCode::BAD_REQUEST, "fail").into_response(),
    }
}

fn callback_conflict_response(ack_mode: AckMode, message: String) -> Response {
    match ack_mode {
        AckMode::Json => PlusApiResult::error("4090", message)).into_response(),
        AckMode::Wechat => (
            StatusCode::CONFLICT,
            [("content-type", "application/xml; charset=utf-8")],
            "<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[callback conflict]]></return_msg></xml>",
        )
            .into_response(),
        AckMode::Alipay => (StatusCode::CONFLICT, "fail").into_response(),
    }
}

fn callback_system_response(ack_mode: AckMode, message: &str) -> Response {
    match ack_mode {
        AckMode::Json => PlusApiResult::error("5000", message.to_owned())).into_response(),
        AckMode::Wechat => (
            StatusCode::INTERNAL_SERVER_ERROR,
            [("content-type", "application/xml; charset=utf-8")],
            "<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[callback handle failed]]></return_msg></xml>",
        )
            .into_response(),
        AckMode::Alipay => (StatusCode::INTERNAL_SERVER_ERROR, "fail").into_response(),
    }
}

fn normalize_signature(signature: &str) -> String {
    signature
        .trim()
        .strip_prefix("sha256=")
        .unwrap_or(signature.trim())
        .to_owned()
}

fn sha256_hex(body: &[u8]) -> String {
    hex::encode(Sha256::digest(body))
}

fn sha256_text(value: &str) -> String {
    sha256_hex(value.as_bytes())
}

fn take_prefix(value: &str, max_len: usize) -> String {
    value.chars().take(max_len).collect()
}

fn current_unix_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
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
