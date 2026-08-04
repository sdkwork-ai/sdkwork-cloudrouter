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
                BillingQuantitySource::StreamingAccumulator => extract_streaming_usage(invocation),
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

/// Bounded protocol shape used by the stream transport when extracting usage
/// without retaining a full provider response in memory.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StreamingUsageFormat {
    ServerSentEvents,
    Ndjson,
}

/// Incrementally extracts the latest provider usage event from a live SSE or
/// NDJSON response. Memory is bounded by one line and one event, never by the
/// total stream length.
#[derive(Debug)]
pub struct StreamingUsageAccumulator {
    format: StreamingUsageFormat,
    pending_line: Vec<u8>,
    event_data: Vec<u8>,
    latest_usage_body: Option<Value>,
}

const MAX_STREAM_USAGE_LINE_BYTES: usize = 64 * 1024;
const MAX_STREAM_USAGE_EVENT_BYTES: usize = 256 * 1024;

impl StreamingUsageAccumulator {
    pub fn new(format: StreamingUsageFormat) -> Self {
        Self {
            format,
            pending_line: Vec::new(),
            event_data: Vec::new(),
            latest_usage_body: None,
        }
    }

    /// Observes one transport frame. The caller forwards the frame unchanged;
    /// this method only retains the bounded protocol state required for usage.
    pub fn observe(&mut self, bytes: &[u8]) -> Result<(), InvocationError> {
        for byte in bytes {
            if *byte == b'\n' {
                let mut line = std::mem::take(&mut self.pending_line);
                if line.last() == Some(&b'\r') {
                    line.pop();
                }
                self.observe_line(&line)?;
                continue;
            }
            if self.pending_line.len() >= MAX_STREAM_USAGE_LINE_BYTES {
                return Err(usage_error(
                    "stream usage line exceeds the configured limit",
                ));
            }
            self.pending_line.push(*byte);
        }
        Ok(())
    }

    /// Flushes a final unterminated line and returns the last valid usage event.
    pub fn finish(&mut self) -> Result<Option<Value>, InvocationError> {
        if !self.pending_line.is_empty() {
            let mut line = std::mem::take(&mut self.pending_line);
            if line.last() == Some(&b'\r') {
                line.pop();
            }
            self.observe_line(&line)?;
        }
        if self.format == StreamingUsageFormat::ServerSentEvents {
            self.finish_sse_event();
        }
        Ok(self.latest_usage_body.clone())
    }

    fn observe_line(&mut self, line: &[u8]) -> Result<(), InvocationError> {
        match self.format {
            StreamingUsageFormat::ServerSentEvents => self.observe_sse_line(line),
            StreamingUsageFormat::Ndjson => {
                if !line.iter().all(u8::is_ascii_whitespace) {
                    self.record_usage_candidate(line);
                }
                Ok(())
            }
        }
    }

    fn observe_sse_line(&mut self, line: &[u8]) -> Result<(), InvocationError> {
        if line.iter().all(u8::is_ascii_whitespace) {
            self.finish_sse_event();
            return Ok(());
        }
        let trimmed = trim_ascii_start(line);
        let Some(data) = trimmed.strip_prefix(b"data:") else {
            return Ok(());
        };
        let data = trim_ascii_start(data);
        let required = self
            .event_data
            .len()
            .saturating_add(data.len())
            .saturating_add(1);
        if required > MAX_STREAM_USAGE_EVENT_BYTES {
            return Err(usage_error(
                "stream usage event exceeds the configured limit",
            ));
        }
        self.event_data.extend_from_slice(data);
        self.event_data.push(b'\n');
        Ok(())
    }

    fn finish_sse_event(&mut self) {
        if self.event_data.is_empty() {
            return;
        }
        let event = std::mem::take(&mut self.event_data);
        self.record_usage_candidate(&event);
    }

    fn record_usage_candidate(&mut self, candidate: &[u8]) {
        let Ok(text) = std::str::from_utf8(candidate) else {
            return;
        };
        let text = text.trim();
        if text.is_empty() || text == "[DONE]" {
            return;
        }
        let Ok(value) = serde_json::from_str::<Value>(text) else {
            return;
        };
        if let Some(usage_body) = streaming_usage_body_from_event(value) {
            self.latest_usage_body = Some(usage_body);
        }
    }
}

fn streaming_usage_body_from_event(mut event: Value) -> Option<Value> {
    let event = event.as_object_mut()?;
    if let Some(usage_body) = take_usage_body(event) {
        return Some(usage_body);
    }

    event
        .get_mut("response")
        .and_then(Value::as_object_mut)
        .and_then(take_usage_body)
}

fn take_usage_body(object: &mut serde_json::Map<String, Value>) -> Option<Value> {
    for field in ["usage", "usageMetadata"] {
        if let Some(usage) = object.remove(field) {
            return Some(Value::Object(serde_json::Map::from_iter([(
                field.to_owned(),
                usage,
            )])));
        }
    }
    None
}

fn trim_ascii_start(bytes: &[u8]) -> &[u8] {
    let start = bytes
        .iter()
        .position(|byte| !byte.is_ascii_whitespace())
        .unwrap_or(bytes.len());
    &bytes[start..]
}

/// Applies an incrementally observed terminal usage body to a streaming
/// invocation before pricing and settlement completion run.
pub fn record_streaming_usage_body(
    invocation: &mut Invocation,
    body: &Value,
) -> Result<(), InvocationError> {
    extract_composite_usage_from_body(invocation, body)
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
    let mut accumulator = StreamingUsageAccumulator::new(StreamingUsageFormat::ServerSentEvents);
    accumulator.observe(text.as_bytes()).ok()?;
    accumulator.finish().ok().flatten()
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

#[cfg(test)]
mod tests {
    use super::{StreamingUsageAccumulator, StreamingUsageFormat};

    #[test]
    fn streaming_usage_accumulator_handles_fragmented_multiline_sse() {
        let mut accumulator =
            StreamingUsageAccumulator::new(StreamingUsageFormat::ServerSentEvents);
        accumulator
            .observe(b"event: response.completed\n data: ignored\n\n")
            .unwrap();
        accumulator
            .observe(b"data: {\"usage\": {\"prompt_tokens\": 4,\n")
            .unwrap();
        accumulator
            .observe(b"data: \"completion_tokens\": 3}}\n\n")
            .unwrap();
        accumulator.observe(b"data: [DONE]\n\n").unwrap();

        let usage = accumulator.finish().unwrap().unwrap();
        assert_eq!(
            Some(4),
            usage
                .pointer("/usage/prompt_tokens")
                .and_then(|v| v.as_i64())
        );
        assert_eq!(
            Some(3),
            usage
                .pointer("/usage/completion_tokens")
                .and_then(|v| v.as_i64())
        );
    }

    #[test]
    fn streaming_usage_accumulator_handles_fragmented_ndjson_and_eof_without_newline() {
        let mut accumulator = StreamingUsageAccumulator::new(StreamingUsageFormat::Ndjson);
        accumulator.observe(b"{\"id\":\"chunk\"}\n").unwrap();
        accumulator
            .observe(b"{\"usage\":{\"input_tokens\":7,\"output_tokens\":2}}")
            .unwrap();

        let usage = accumulator.finish().unwrap().unwrap();
        assert_eq!(
            Some(7),
            usage
                .pointer("/usage/input_tokens")
                .and_then(|v| v.as_i64())
        );
        assert_eq!(
            Some(2),
            usage
                .pointer("/usage/output_tokens")
                .and_then(|v| v.as_i64())
        );
    }

    #[test]
    fn streaming_usage_accumulator_rejects_oversized_line() {
        let mut accumulator = StreamingUsageAccumulator::new(StreamingUsageFormat::Ndjson);
        let oversized_line = vec![b'x'; 64 * 1024 + 1];

        assert!(accumulator.observe(&oversized_line).is_err());
    }

    #[test]
    fn streaming_usage_accumulator_rejects_oversized_sse_event() {
        let mut accumulator =
            StreamingUsageAccumulator::new(StreamingUsageFormat::ServerSentEvents);
        let line = format!("data: {}\n", "x".repeat(63 * 1024));

        for _ in 0..5 {
            if accumulator.observe(line.as_bytes()).is_err() {
                return;
            }
        }
        panic!("oversized SSE event should be rejected");
    }
}
