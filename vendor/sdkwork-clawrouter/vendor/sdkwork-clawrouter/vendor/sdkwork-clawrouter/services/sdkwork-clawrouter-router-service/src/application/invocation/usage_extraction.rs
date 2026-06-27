use axum::body::{to_bytes, Body};
use serde_json::Value;

use super::{
    BillingMode, BillingQuantitySource, DispatchMode, Invocation, InvocationError,
    InvocationErrorKind, InvocationFuture, InvocationInterceptor, InvocationUsageLine,
};
use crate::domain::BillingMeter;
use crate::ports::GatewayUsageQuantity;

#[derive(Debug, Clone, Default)]
pub struct UsageExtractionInterceptor;

impl InvocationInterceptor for UsageExtractionInterceptor {
    fn name(&self) -> &str {
        "usage_extraction"
    }

    fn after<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            if invocation.billing.mode == BillingMode::Free
                || invocation.billing.quantity_source == BillingQuantitySource::None
                || (!provider_response_is_success(invocation)
                    && !matches!(
                        invocation.billing.quantity_source,
                        BillingQuantitySource::FixedRequest
                    ))
            {
                return Ok(());
            }

            match invocation.billing.quantity_source {
                BillingQuantitySource::FixedRequest => ensure_fixed_request_line(invocation),
                BillingQuantitySource::Composite => extract_composite_usage(invocation),
                BillingQuantitySource::ResponseBody => extract_response_body_usage(invocation),
                BillingQuantitySource::AdapterUsageLines => extract_adapter_usage_lines(invocation),
                BillingQuantitySource::StreamingAccumulator => {
                    extract_streaming_usage_async(invocation).await
                }
                BillingQuantitySource::None
                | BillingQuantitySource::RequestBody
                | BillingQuantitySource::ResponseHeaders => Ok(()),
            }
        })
    }
}

fn provider_response_is_success(invocation: &Invocation) -> bool {
    invocation
        .dispatch
        .response
        .as_ref()
        .map(|response| {
            if invocation.dispatch.mode == DispatchMode::InternalProviderAdapter {
                return response
                    .body
                    .as_ref()
                    .and_then(adapter_response_status_code)
                    .map(|status_code| (200..300).contains(&status_code))
                    .unwrap_or_else(|| response.is_success());
            }
            response.is_success()
        })
        .unwrap_or(false)
}

fn adapter_response_status_code(body: &Value) -> Option<u16> {
    body.get("statusCode")
        .or_else(|| body.get("status_code"))
        .and_then(Value::as_u64)
        .and_then(|value| u16::try_from(value).ok())
}

fn ensure_fixed_request_line(invocation: &mut Invocation) -> Result<(), InvocationError> {
    if invocation
        .usage
        .lines
        .iter()
        .any(|line| line.meter == BillingMeter::ApiRequest)
    {
        return Ok(());
    }
    invocation
        .usage
        .add_line(InvocationUsageLine::fixed_request());
    Ok(())
}

fn extract_composite_usage(invocation: &mut Invocation) -> Result<(), InvocationError> {
    let body = response_body(invocation)?;
    extract_composite_usage_from_body(invocation, &body)
}

fn extract_composite_usage_from_body(
    invocation: &mut Invocation,
    body: &Value,
) -> Result<(), InvocationError> {
    let usage = match body.get("usage").or_else(|| body.get("usageMetadata")) {
        Some(usage) => usage,
        None => return Ok(()),
    };
    let input_tokens = integer_field(
        usage,
        &["prompt_tokens", "input_tokens", "promptTokenCount"],
    )
    .unwrap_or(0);
    let output_tokens = integer_field(
        usage,
        &["completion_tokens", "output_tokens", "candidatesTokenCount"],
    )
    .unwrap_or(0);
    let cached_tokens = cached_tokens(usage).unwrap_or(0);
    let billable_input = input_tokens
        .checked_sub(cached_tokens)
        .ok_or_else(|| usage_error("cached tokens must not exceed input tokens"))?;

    if billable_input > 0 {
        invocation.usage.add_line(InvocationUsageLine::new(
            invocation
                .billing
                .meter
                .clone()
                .unwrap_or(BillingMeter::LlmInputToken),
            GatewayUsageQuantity::tokens(billable_input)
                .map_err(|error| usage_error(error.to_string()))?,
        ));
    }
    if cached_tokens > 0 {
        invocation.usage.add_line(InvocationUsageLine::new(
            BillingMeter::LlmCacheReadToken,
            GatewayUsageQuantity::tokens(cached_tokens)
                .map_err(|error| usage_error(error.to_string()))?,
        ));
    }
    if output_tokens > 0 {
        invocation.usage.add_line(InvocationUsageLine::new(
            BillingMeter::LlmOutputToken,
            GatewayUsageQuantity::tokens(output_tokens)
                .map_err(|error| usage_error(error.to_string()))?,
        ));
    }
    Ok(())
}

fn extract_streaming_usage(invocation: &mut Invocation) -> Result<(), InvocationError> {
    let Some(body) = streaming_usage_body(invocation)? else {
        return Ok(());
    };
    extract_composite_usage_from_body(invocation, &body)
}

const SSE_USAGE_BODY_LIMIT_BYTES: usize = 16 * 1024 * 1024;

async fn extract_streaming_usage_async(invocation: &mut Invocation) -> Result<(), InvocationError> {
    // Take the stream body from the dispatch response (via Mutex)
    let stream_body = invocation
        .dispatch
        .response
        .as_ref()
        .and_then(|r| r.stream_body.lock().ok())
        .and_then(|mut guard| guard.take());

    let Some(body) = stream_body else {
        // No stream body — try the buffered path
        return extract_streaming_usage(invocation);
    };

    // Buffer the stream body to extract SSE usage
    let bytes = to_bytes(body, SSE_USAGE_BODY_LIMIT_BYTES)
        .await
        .map_err(|error| usage_error(format!("failed to read SSE stream body: {error}")))?;

    // Always put the buffered bytes back for the HTTP response BEFORE any parsing errors
    if let Some(response) = invocation.dispatch.response.as_ref() {
        if let Ok(mut guard) = response.stream_body.lock() {
            *guard = Some(Body::from(bytes.clone()));
        }
    }

    // Parse SSE usage from the buffered text (lossy UTF-8 to avoid losing data)
    let text = String::from_utf8_lossy(&bytes);
    let usage_body = openai_sse_usage_body(&text);

    // Extract composite usage from parsed body (non-fatal for streaming)
    if let Some(ref body) = usage_body {
        if let Err(error) = extract_composite_usage_from_body(invocation, body) {
            tracing::warn!(
                error = %error,
                "failed to extract streaming SSE usage; client response is unaffected"
            );
        }
    }
    Ok(())
}

fn extract_response_body_usage(invocation: &mut Invocation) -> Result<(), InvocationError> {
    let meter = invocation
        .billing
        .meter
        .clone()
        .ok_or_else(|| usage_error("response body usage extraction requires billing meter"))?;
    let body = response_body(invocation)?;
    let line = match invocation.billing.mode {
        BillingMode::Token => token_line(&meter, &body)?,
        BillingMode::ResultCount => result_line(&meter, &body)?,
        BillingMode::ItemCount => item_line(&meter, &body)?,
        BillingMode::Character => character_line(&meter, &body)?,
        BillingMode::AudioSecond => audio_line(&meter, &body)?,
        BillingMode::VideoSecond => video_line(&meter, &body)?,
        _ => generic_line(&meter, &body)?,
    };
    invocation.usage.add_line(line);
    Ok(())
}

fn extract_adapter_usage_lines(invocation: &mut Invocation) -> Result<(), InvocationError> {
    let body = response_body(invocation)?;
    let Some(lines) = body
        .pointer("/usage/usageLines")
        .or_else(|| body.pointer("/usage/usage_lines"))
        .or_else(|| body.pointer("/body/_gateway_usage/lines"))
        .or_else(|| body.pointer("/body/usage/lines"))
        .or_else(|| body.pointer("/_gateway_usage/lines"))
        .or_else(|| body.pointer("/usage/lines"))
        .and_then(Value::as_array)
    else {
        return Ok(());
    };
    if lines.is_empty() {
        return Ok(());
    }
    let mut extracted = Vec::new();
    for line in lines {
        let meter = text_field(
            line,
            &[
                "meter",
                "meterCode",
                "meter_code",
                "billing_meter",
                "billingMeter",
                "billing_meter_code",
            ],
        )
        .map(|code| BillingMeter::from_code(&code))
        .ok_or_else(|| usage_error("adapter usage line is missing meter"))?;
        let quantity = text_field(
            line,
            &[
                "quantity",
                "billable_quantity",
                "billableQuantity",
                "billable_quantity",
            ],
        )
        .or_else(|| {
            number_field_as_string(
                line,
                &[
                    "quantity",
                    "billable_quantity",
                    "billableQuantity",
                    "billable_quantity",
                ],
            )
        })
        .ok_or_else(|| usage_error("adapter usage line is missing quantity"))?;
        let quantity = GatewayUsageQuantity::for_meter(meter.clone(), quantity)
            .map_err(|error| usage_error(error.to_string()))?;
        let mut usage_line = InvocationUsageLine::new(meter, quantity);
        usage_line.requested_model_catalog_key = text_field(
            line,
            &[
                "requestedModelCatalogKey",
                "requested_model_catalog_key",
                "catalogKey",
                "catalog_key",
            ],
        );
        extracted.push(usage_line);
    }
    invocation.usage.lines.extend(extracted);
    Ok(())
}

fn token_line(meter: &BillingMeter, body: &Value) -> Result<InvocationUsageLine, InvocationError> {
    let usage = body.get("usage").unwrap_or(body);
    let tokens = integer_field(usage, &["prompt_tokens", "input_tokens", "total_tokens"])
        .ok_or_else(|| usage_error("token response usage is missing token count"))?;
    Ok(InvocationUsageLine::new(
        meter.clone(),
        GatewayUsageQuantity::tokens(tokens).map_err(|error| usage_error(error.to_string()))?,
    ))
}

fn result_line(meter: &BillingMeter, body: &Value) -> Result<InvocationUsageLine, InvocationError> {
    let count = integer_field(body, &["result_count", "count"])
        .or_else(|| {
            body.get("data")
                .and_then(Value::as_array)
                .map(|items| items.len() as i64)
        })
        .unwrap_or(1);
    Ok(InvocationUsageLine::new(
        meter.clone(),
        GatewayUsageQuantity::for_meter(meter.clone(), count.to_string())
            .map_err(|error| usage_error(error.to_string()))?,
    ))
}

fn item_line(meter: &BillingMeter, body: &Value) -> Result<InvocationUsageLine, InvocationError> {
    let count = integer_field(body, &["item_count", "count"])
        .or_else(|| {
            body.get("data")
                .and_then(Value::as_array)
                .map(|items| items.len() as i64)
        })
        .unwrap_or(1);
    Ok(InvocationUsageLine::new(
        meter.clone(),
        GatewayUsageQuantity::for_meter(meter.clone(), count.to_string())
            .map_err(|error| usage_error(error.to_string()))?,
    ))
}

fn character_line(
    meter: &BillingMeter,
    body: &Value,
) -> Result<InvocationUsageLine, InvocationError> {
    let usage = body.get("usage").unwrap_or(body);
    let count = integer_field(
        usage,
        &["character_count", "characters", "input_characters"],
    )
    .ok_or_else(|| usage_error("character response usage is missing character count"))?;
    Ok(InvocationUsageLine::new(
        meter.clone(),
        GatewayUsageQuantity::for_meter(meter.clone(), count.to_string())
            .map_err(|error| usage_error(error.to_string()))?,
    ))
}

fn audio_line(meter: &BillingMeter, body: &Value) -> Result<InvocationUsageLine, InvocationError> {
    let usage = body.get("usage").unwrap_or(body);
    let quantity = text_field(usage, &["audio_seconds", "seconds", "duration_seconds"])
        .or_else(|| {
            number_field_as_string(usage, &["audio_seconds", "seconds", "duration_seconds"])
        })
        .ok_or_else(|| usage_error("audio response usage is missing seconds"))?;
    Ok(InvocationUsageLine::new(
        meter.clone(),
        GatewayUsageQuantity::for_meter(meter.clone(), quantity)
            .map_err(|error| usage_error(error.to_string()))?,
    ))
}

fn video_line(meter: &BillingMeter, body: &Value) -> Result<InvocationUsageLine, InvocationError> {
    let usage = body.get("usage").unwrap_or(body);
    let quantity = text_field(usage, &["video_seconds", "seconds", "duration_seconds"])
        .or_else(|| {
            number_field_as_string(usage, &["video_seconds", "seconds", "duration_seconds"])
        })
        .ok_or_else(|| usage_error("video response usage is missing seconds"))?;
    Ok(InvocationUsageLine::new(
        meter.clone(),
        GatewayUsageQuantity::for_meter(meter.clone(), quantity)
            .map_err(|error| usage_error(error.to_string()))?,
    ))
}

fn generic_line(
    meter: &BillingMeter,
    body: &Value,
) -> Result<InvocationUsageLine, InvocationError> {
    let usage = body.get("usage").unwrap_or(body);
    let quantity = text_field(usage, &["quantity", "billable_quantity", "count"])
        .or_else(|| number_field_as_string(usage, &["quantity", "billable_quantity", "count"]))
        .unwrap_or_else(|| "1".to_owned());
    Ok(InvocationUsageLine::new(
        meter.clone(),
        GatewayUsageQuantity::for_meter(meter.clone(), quantity)
            .map_err(|error| usage_error(error.to_string()))?,
    ))
}

fn response_body(invocation: &Invocation) -> Result<Value, InvocationError> {
    let response = invocation
        .dispatch
        .response
        .as_ref()
        .ok_or_else(|| usage_error("usage extraction requires provider response body"))?;
    if let Some(body) = response.body.as_ref() {
        return Ok(body.clone());
    }
    if let Some(bytes) = response.body_bytes.as_ref() {
        return parse_json_response_bytes(bytes);
    }
    if let Some(normalized) = invocation.telemetry.normalized_response.as_ref() {
        if let Some(body) = normalized.body.as_ref() {
            return Ok(body.clone());
        }
        if let Some(bytes) = normalized.body_bytes.as_ref() {
            return parse_json_response_bytes(bytes);
        }
    }
    Err(usage_error(
        "usage extraction requires provider response body",
    ))
}

fn parse_json_response_bytes(bytes: &[u8]) -> Result<Value, InvocationError> {
    if bytes.is_empty() {
        return Err(usage_error(
            "usage extraction requires provider response body",
        ));
    }
    serde_json::from_slice(bytes)
        .map_err(|error| usage_error(format!("provider response body is not JSON: {error}")))
}

fn streaming_usage_body(invocation: &Invocation) -> Result<Option<Value>, InvocationError> {
    let response = invocation
        .dispatch
        .response
        .as_ref()
        .ok_or_else(|| usage_error("streaming usage extraction requires provider response"))?;
    if let Some(body) = response.body.as_ref() {
        return Ok(body.get("usage").is_some().then(|| body.clone()));
    }
    // Check for buffered body_bytes (non-streaming path)
    if let Some(bytes) = response.body_bytes.as_ref() {
        let text = std::str::from_utf8(bytes).map_err(|error| {
            usage_error(format!("streaming provider response is not UTF-8: {error}"))
        })?;
        return Ok(openai_sse_usage_body(text));
    }
    // For streaming responses, the body is in stream_body Mutex — consumed elsewhere
    Ok(None)
}

fn openai_sse_usage_body(text: &str) -> Option<Value> {
    let mut last_usage_body = None;
    let mut current_data = Vec::new();
    for line in text.lines() {
        if line.trim().is_empty() {
            if let Some(value) = usage_body_from_event_data(&current_data) {
                last_usage_body = Some(value);
            }
            current_data.clear();
            continue;
        }
        if let Some(data) = line.trim_start().strip_prefix("data:") {
            current_data.push(data.trim_start().to_owned());
        }
    }
    if let Some(value) = usage_body_from_event_data(&current_data) {
        last_usage_body = Some(value);
    }
    last_usage_body
}

fn usage_body_from_event_data(lines: &[String]) -> Option<Value> {
    let data = lines.join("\n");
    let data = data.trim();
    if data.is_empty() || data == "[DONE]" {
        return None;
    }
    serde_json::from_str::<Value>(data)
        .ok()
        .filter(|value| value.get("usage").is_some() || value.get("usageMetadata").is_some())
}

fn cached_tokens(usage: &Value) -> Option<i64> {
    integer_field(usage, &["cached_tokens"]).or_else(|| {
        usage
            .get("prompt_tokens_details")
            .or_else(|| usage.get("input_tokens_details"))
            .and_then(|details| integer_field(details, &["cached_tokens"]))
    })
}

fn integer_field(value: &Value, names: &[&str]) -> Option<i64> {
    names.iter().find_map(|name| {
        value.get(*name).and_then(|field| {
            field.as_i64().or_else(|| {
                field
                    .as_str()
                    .and_then(|text| text.trim().parse::<i64>().ok())
            })
        })
    })
}

fn text_field(value: &Value, names: &[&str]) -> Option<String> {
    names.iter().find_map(|name| {
        value
            .get(*name)
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|text| !text.is_empty())
            .map(str::to_owned)
    })
}

fn number_field_as_string(value: &Value, names: &[&str]) -> Option<String> {
    names.iter().find_map(|name| {
        value.get(*name).and_then(|field| {
            field
                .as_i64()
                .map(|number| number.to_string())
                .or_else(|| field.as_f64().map(|number| number.to_string()))
        })
    })
}

fn usage_error(message: impl Into<String>) -> InvocationError {
    InvocationError::new(InvocationErrorKind::Usage, message)
}
