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
                || !provider_response_is_success(invocation)
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
        .quote_for_meter(&BillingMeter::ApiRequest)
        .is_none()
    {
        return Ok(());
    }
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
    let (billable_input, cached_tokens, cache_write_tokens, output_tokens) =
        composite_usage_components(usage);

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
    if cache_write_tokens > 0 {
        // Cache writes settle as an unrated fact when the catalog defines no
        // cache-write price (cache meters are exempt from the fail-closed
        // preflight), so emitting the line is always safe.
        invocation.usage.add_line(InvocationUsageLine::new(
            BillingMeter::LlmCacheWriteToken,
            GatewayUsageQuantity::tokens(cache_write_tokens)
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

/// Splits one provider usage frame into the four billable token components:
/// `(billable_input, cache_read, cache_write, output)`.
///
/// Providers disagree on whether the reported input total already includes
/// cached tokens:
/// - OpenAI (`prompt_tokens`) and Google (`promptTokenCount` +
///   `cachedContentTokenCount`) report an inclusive total, so the full-rate
///   portion is `input - cached`.
/// - Anthropic reports the three input portions exclusively (`input_tokens`,
///   `cache_read_input_tokens`, `cache_creation_input_tokens` never overlap),
///   which is recognized structurally by the presence of the cache fields —
///   a magnitude comparison cannot distinguish the two shapes, and would
///   under-bill whenever the cached share is smaller than the fresh share.
/// - Some providers report miss-only (the prompt total covers only cache
///   misses while the cached count reported in the details exceeds it); the
///   inclusive total is then `input + cached`.
fn composite_usage_components(usage: &Value) -> (i64, i64, i64, i64) {
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
    let cache_write_tokens =
        integer_field(usage, &["cache_creation_input_tokens"]).unwrap_or(0);
    let anthropic_exclusive_reporting = usage.get("cache_read_input_tokens").is_some()
        || usage.get("cache_creation_input_tokens").is_some();
    let total_input = if anthropic_exclusive_reporting {
        input_tokens
            .saturating_add(cached_tokens)
            .saturating_add(cache_write_tokens)
    } else {
        // 部分供应商 miss-only 上报缓存：prompt_tokens 只包含未命中部分，
        // cached_tokens 单独放在 details（因此可能大于 prompt_tokens）。此时
        // prompt 实为 billable 输入而非总输入 —— 归一为 inclusive（prompt +=
        // cached），与 openai relay 路径 usage_from_fields 的语义保持一致；
        // 否则 billable_input 负数会在这里 Err 中断整条 after 拦截器链，价格
        // 结算与 usage 落库全部不再执行（前端只能看到零价格 + 零扣费）。
        normalized_input_tokens(input_tokens, cached_tokens)
    };
    let billable_input = total_input
        .saturating_sub(cached_tokens)
        .saturating_sub(cache_write_tokens);
    (
        billable_input,
        cached_tokens,
        cache_write_tokens,
        output_tokens,
    )
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
    /// Output text observed in streamed deltas, split into ASCII and wide
    /// (non-ASCII, predominantly CJK) character counts. Used only to estimate
    /// completion tokens for streams that terminate without a provider usage
    /// frame; never used when the provider reported usage.
    observed_ascii_chars: u64,
    observed_wide_chars: u64,
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
            observed_ascii_chars: 0,
            observed_wide_chars: 0,
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
        self.observe_streamed_output(&value);
        if let Some(usage_body) = streaming_usage_body_from_event(value) {
            merge_streaming_usage_body(&mut self.latest_usage_body, usage_body);
        }
    }

    /// Accumulates the output text carried by one streamed event so a stream
    /// that ends without a provider usage frame can still be billed for what
    /// it produced. Covers the OpenAI chat-completions delta shape (visible
    /// text, reasoning text, tool-call argument fragments); unknown shapes are
    /// simply not counted.
    fn observe_streamed_output(&mut self, event: &Value) {
        if let Some(choices) = event.get("choices").and_then(Value::as_array) {
            for choice in choices {
                let Some(delta) = choice.get("delta") else {
                    continue;
                };
                for key in ["content", "reasoning_content", "reasoning"] {
                    if let Some(text) = delta.get(key).and_then(Value::as_str) {
                        self.observe_output_text(text);
                    }
                }
                if let Some(tool_calls) = delta.get("tool_calls").and_then(Value::as_array) {
                    for tool_call in tool_calls {
                        if let Some(arguments) = tool_call
                            .get("function")
                            .and_then(|function| function.get("arguments"))
                            .and_then(Value::as_str)
                        {
                            self.observe_output_text(arguments);
                        }
                    }
                }
            }
        }
        // Anthropic streams carry output text in content_block_delta events
        // (`delta.text` for visible text, `delta.thinking` for reasoning);
        // they have no `choices` array, so they are counted here.
        if event.get("type").and_then(Value::as_str) == Some("content_block_delta") {
            if let Some(delta) = event.get("delta") {
                for key in ["text", "thinking"] {
                    if let Some(text) = delta.get(key).and_then(Value::as_str) {
                        self.observe_output_text(text);
                    }
                }
            }
        }
    }

    fn observe_output_text(&mut self, text: &str) {
        for character in text.chars() {
            if character.is_ascii() {
                self.observed_ascii_chars += 1;
            } else {
                self.observed_wide_chars += 1;
            }
        }
    }

    /// Approximates completion tokens from the output text observed so far.
    ///
    /// GPT-family BPE tokenizers encode roughly 4 ASCII characters per token,
    /// while CJK glyphs average about 0.75 tokens per character (~1.33 chars
    /// per token), so the two classes are estimated separately. The estimate
    /// deliberately errs low: under-billing a truncated stream is recoverable,
    /// billing tokens the provider never produced is not.
    fn estimated_completion_tokens(&self) -> u64 {
        self.observed_ascii_chars / 4 + self.observed_wide_chars * 3 / 4
    }

    /// Terminal usage for a stream that reached a non-successful end
    /// (timeout, cancellation, upstream failure) before the provider emitted
    /// its usage frame. Prefers the last real provider usage body when one
    /// arrived; otherwise estimates completion tokens from the observed
    /// output text. Returns `None` when nothing billable was observed.
    ///
    /// Input tokens are not estimated: they cannot be reconstructed from the
    /// response stream, so a truncated request bills only its produced output.
    pub fn partial_usage_body(&mut self) -> Option<Value> {
        // Flush any trailing line/event first so a usage frame that arrived
        // without its terminating newline is still recognized.
        if let Ok(Some(usage_body)) = self.finish() {
            return Some(usage_body);
        }
        let estimated = self.estimated_completion_tokens();
        if estimated == 0 {
            return None;
        }
        Some(serde_json::json!({
            "usage": {
                "prompt_tokens": 0,
                "completion_tokens": estimated,
            }
        }))
    }
}

fn streaming_usage_body_from_event(mut event: Value) -> Option<Value> {
    let event = event.as_object_mut()?;
    if let Some(usage_body) = take_usage_body(event) {
        return Some(usage_body);
    }

    // Anthropic `message_start` nests the input-token usage inside the
    // initial message snapshot: {"type":"message_start","message":{...,
    // "usage":{"input_tokens":N,...}}}.
    if let Some(usage_body) = event
        .get_mut("message")
        .and_then(Value::as_object_mut)
        .and_then(take_usage_body)
    {
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

/// Merges a newly observed usage frame into the retained one instead of
/// replacing it. Providers split usage across several stream events —
/// Anthropic reports input tokens in `message_start` and output tokens in
/// `message_delta`, Gemini streams cumulative `usageMetadata` per chunk — so
/// per-field latest-wins merging is required to bill the complete request.
/// Whole-frame replacement (the previous behavior) dropped the input half of
/// Anthropic streams entirely and billed only the output tokens.
fn merge_streaming_usage_body(existing: &mut Option<Value>, incoming: Value) {
    let Some(current) = existing else {
        *existing = Some(incoming);
        return;
    };
    let (Some(current_object), Some(incoming_object)) =
        (current.as_object_mut(), incoming.as_object())
    else {
        *existing = Some(incoming);
        return;
    };
    let Some(current_field) = current_object.keys().next().cloned() else {
        *existing = Some(incoming);
        return;
    };
    let Some(incoming_field) = incoming_object.keys().next().cloned() else {
        return;
    };
    if current_field != incoming_field {
        // Frames wrapped under different keys ("usage" vs "usageMetadata")
        // cannot be merged field-by-field; the latest frame wins as before.
        *existing = Some(incoming);
        return;
    }
    let Some(current_usage) = current_object
        .get_mut(&current_field)
        .and_then(Value::as_object_mut)
    else {
        *existing = Some(incoming);
        return;
    };
    let Some(incoming_usage) = incoming_object.get(&incoming_field).and_then(Value::as_object)
    else {
        return;
    };
    for (field, value) in incoming_usage {
        current_usage.insert(field.clone(), value.clone());
    }
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
    // Google Gemini embeds its usage in a top-level `usageMetadata` object
    // (with `promptTokenCount`) instead of OpenAI/Anthropic's `usage`.
    let usage = body
        .get("usage")
        .or_else(|| body.get("usageMetadata"))
        .unwrap_or(body);
    let tokens = integer_field(
        usage,
        &["prompt_tokens", "input_tokens", "promptTokenCount", "total_tokens"],
    )
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
    integer_field(usage, &["cached_tokens"])
        // Anthropic reports cache reads as a top-level usage field.
        .or_else(|| integer_field(usage, &["cache_read_input_tokens"]))
        // Google reports the cached share of the prompt as a top-level
        // usageMetadata field.
        .or_else(|| integer_field(usage, &["cachedContentTokenCount"]))
        .or_else(|| {
            usage
                .get("prompt_tokens_details")
                .or_else(|| usage.get("input_tokens_details"))
                .and_then(|details| integer_field(details, &["cached_tokens"]))
        })
}

/// Normalizes miss-only cached reporting: when the provider reports more
/// cached tokens than prompt tokens, `prompt_tokens` only covers the cache
/// misses, so the inclusive prompt total is `prompt + cached`.
fn normalized_input_tokens(input_tokens: i64, cached_tokens: i64) -> i64 {
    if cached_tokens > input_tokens {
        input_tokens + cached_tokens
    } else {
        input_tokens
    }
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
    use serde_json::{json, Value};

    use super::{
        cached_tokens, composite_usage_components, normalized_input_tokens, token_line,
        StreamingUsageAccumulator, StreamingUsageFormat,
    };
    use crate::domain::BillingMeter;

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

    #[test]
    fn cached_tokens_reads_top_level_field() {
        let usage: Value = json!({ "prompt_tokens": 100, "cached_tokens": 30 });
        assert_eq!(Some(30), cached_tokens(&usage));
    }

    #[test]
    fn cached_tokens_reads_cached_tokens_details_nested_field() {
        let usage: Value =
            json!({ "prompt_tokens": 100, "prompt_tokens_details": { "cached_tokens": 25 } });
        assert_eq!(Some(25), cached_tokens(&usage));
    }

    #[test]
    fn cached_tokens_falls_back_to_input_tokens_details() {
        let usage: Value =
            json!({ "input_tokens": 100, "input_tokens_details": { "cached_tokens": 9 } });
        assert_eq!(Some(9), cached_tokens(&usage));
    }

    #[test]
    fn cached_tokens_parses_numeric_string_form() {
        let usage: Value = json!({ "prompt_tokens": 50, "cached_tokens": "14" });
        assert_eq!(Some(14), cached_tokens(&usage));
    }

    #[test]
    fn cached_tokens_absent_yields_none() {
        let usage: Value = json!({ "prompt_tokens": 40 });
        assert_eq!(None, cached_tokens(&usage));
    }

    #[test]
    fn cached_tokens_exceeding_input_is_detected_so_billable_input_stays_non_negative() {
        // usage_extraction 仅在 billable_input > 0 时才添加 Input 行；cached 单独
        // 成行，任何输入拆分都不会产生负值。
        let usage: Value = json!({ "prompt_tokens": 5, "cached_tokens": 20 });
        assert_eq!(Some(20), cached_tokens(&usage));
    }

    #[test]
    fn normalized_input_tokens_treats_miss_only_cached_reporting_as_exclusive_prompt() {
        // 供应商 miss-only 上报（prompt=33 为未命中、cached=128 在 details）：
        // 归一为 inclusive 总输入 = 33 + 128 = 161。
        assert_eq!(161, normalized_input_tokens(33, 128));
        assert_eq!(201, normalized_input_tokens(73, 128));
    }

    #[test]
    fn normalized_input_tokens_keeps_inclusive_and_plain_reporting() {
        // inclusive 上报（prompt 已含 cached）与无缓存上报保持不变。
        assert_eq!(161, normalized_input_tokens(161, 128));
        assert_eq!(40, normalized_input_tokens(40, 0));
    }

    #[test]
    fn partial_usage_prefers_the_last_provider_usage_frame() {
        let mut accumulator =
            StreamingUsageAccumulator::new(StreamingUsageFormat::ServerSentEvents);
        accumulator
            .observe(
                b"data: {\"choices\":[{\"delta\":{\"content\":\"partial answer\"}}]}\n\n\
                 data: {\"usage\":{\"prompt_tokens\":12,\"completion_tokens\":34}}\n",
            )
            .unwrap();

        let usage = accumulator.partial_usage_body().expect("provider usage");
        assert_eq!(Some(34), usage.pointer("/usage/completion_tokens").and_then(|v| v.as_i64()));
        assert_eq!(Some(12), usage.pointer("/usage/prompt_tokens").and_then(|v| v.as_i64()));
    }

    #[test]
    fn partial_usage_estimates_completion_tokens_from_streamed_output_without_usage() {
        let mut accumulator =
            StreamingUsageAccumulator::new(StreamingUsageFormat::ServerSentEvents);
        // 8 ASCII chars -> 2 estimated tokens; CJK chars add 0.75 tokens each.
        accumulator
            .observe(
                b"data: {\"choices\":[{\"delta\":{\"content\":\"AAAAAAAA\"}}]}\n\n\
                 data: {\"choices\":[{\"delta\":{\"reasoning_content\":\"\\u4e2d\\u6587\"}}]}\n\n",
            )
            .unwrap();

        let usage = accumulator.partial_usage_body().expect("estimated usage");
        // 8/4 = 2 ASCII tokens + wide(2) * 3/4 = 1 -> 3 total.
        assert_eq!(Some(3), usage.pointer("/usage/completion_tokens").and_then(|v| v.as_i64()));
        assert_eq!(Some(0), usage.pointer("/usage/prompt_tokens").and_then(|v| v.as_i64()));
    }

    #[test]
    fn partial_usage_is_none_for_a_stream_that_produced_nothing() {
        let mut accumulator =
            StreamingUsageAccumulator::new(StreamingUsageFormat::ServerSentEvents);
        accumulator.observe(b"data: {\"choices\":[{\"delta\":{}}]}\n\n").unwrap();
        assert!(accumulator.partial_usage_body().is_none());
    }

    #[test]
    fn cached_tokens_reads_anthropic_cache_read_field() {
        let usage: Value = json!({ "input_tokens": 2095, "cache_read_input_tokens": 15126 });
        assert_eq!(Some(15126), cached_tokens(&usage));
    }

    #[test]
    fn cached_tokens_reads_google_cached_content_field() {
        let usage: Value = json!({ "promptTokenCount": 210, "cachedContentTokenCount": 180 });
        assert_eq!(Some(180), cached_tokens(&usage));
    }

    #[test]
    fn anthropic_exclusive_input_reporting_is_normalized_to_inclusive_components() {
        // Anthropic 独占上报：input_tokens 不含缓存部分。3000 未命中 + 1000
        // 缓存读 + 500 缓存写 ⇒ 总输入 4500，全价输入 3000。
        let usage: Value = json!({
            "input_tokens": 3000,
            "cache_read_input_tokens": 1000,
            "cache_creation_input_tokens": 500,
        });
        assert_eq!((3000, 1000, 500, 0), composite_usage_components(&usage));
    }

    #[test]
    fn anthropic_fully_cached_input_bills_only_the_cache_read_line() {
        let usage: Value = json!({ "input_tokens": 0, "cache_read_input_tokens": 5000 });
        assert_eq!((0, 5000, 0, 0), composite_usage_components(&usage));
    }

    #[test]
    fn anthropic_exclusive_reporting_beats_the_magnitude_heuristic() {
        // 缓存占比小于未命中时，独占上报不能走 cached > input 启发式，
        // 否则全价输入会被错误扣减（3000 - 1000 = 2000）。
        let usage: Value = json!({
            "input_tokens": 3000,
            "cache_read_input_tokens": 1000,
            "output_tokens": 42,
        });
        assert_eq!((3000, 1000, 0, 42), composite_usage_components(&usage));
    }

    #[test]
    fn google_inclusive_input_reporting_subtracts_the_cached_share() {
        // Google 上报 promptTokenCount 为包含缓存的总量。
        let usage: Value = json!({
            "promptTokenCount": 210,
            "cachedContentTokenCount": 180,
            "candidatesTokenCount": 33,
        });
        assert_eq!((30, 180, 0, 33), composite_usage_components(&usage));
    }

    #[test]
    fn openai_inclusive_input_reporting_is_unchanged() {
        let usage: Value = json!({
            "prompt_tokens": 100,
            "completion_tokens": 7,
            "prompt_tokens_details": { "cached_tokens": 30 },
        });
        assert_eq!((70, 30, 0, 7), composite_usage_components(&usage));
    }

    #[test]
    fn anthropic_streaming_usage_is_merged_across_message_start_and_delta() {
        // Anthropic 流式：message_start 携带 input/cache_read（嵌在 message
        // 内），message_delta 携带累计 output。两帧必须合并，否则输入侧
        // 完全漏计。
        let mut accumulator =
            StreamingUsageAccumulator::new(StreamingUsageFormat::ServerSentEvents);
        accumulator
            .observe(
                b"event: message_start\n\
                  data: {\"type\":\"message_start\",\"message\":{\"id\":\"msg_1\",\
                  \"usage\":{\"input_tokens\":2095,\"cache_read_input_tokens\":15126}}}\n\n\
                  event: content_block_delta\n\
                  data: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"Hello\"}}\n\n\
                  event: message_delta\n\
                  data: {\"type\":\"message_delta\",\"usage\":{\"output_tokens\":42}}\n\n",
            )
            .unwrap();

        let usage = accumulator.finish().unwrap().expect("merged usage");
        assert_eq!(
            Some(2095),
            usage.pointer("/usage/input_tokens").and_then(|v| v.as_i64())
        );
        assert_eq!(
            Some(15126),
            usage
                .pointer("/usage/cache_read_input_tokens")
                .and_then(|v| v.as_i64())
        );
        assert_eq!(
            Some(42),
            usage.pointer("/usage/output_tokens").and_then(|v| v.as_i64())
        );
    }

    #[test]
    fn anthropic_interrupted_stream_bills_input_from_message_start() {
        // 截断流只到达 message_start（未见 message_delta）：partial 仍应
        // 保留输入侧 usage，而不是回退到纯估算。
        let mut accumulator =
            StreamingUsageAccumulator::new(StreamingUsageFormat::ServerSentEvents);
        accumulator
            .observe(
                b"data: {\"type\":\"message_start\",\"message\":\
                  {\"usage\":{\"input_tokens\":800}}}\n\n\
                  data: {\"type\":\"content_block_delta\",\"delta\":{\"text\":\"partial\"}}\n\n",
            )
            .unwrap();

        let usage = accumulator.partial_usage_body().expect("partial usage");
        assert_eq!(
            Some(800),
            usage.pointer("/usage/input_tokens").and_then(|v| v.as_i64())
        );
    }

    #[test]
    fn gemini_cumulative_usage_metadata_frames_merge_to_the_latest_values() {
        let mut accumulator =
            StreamingUsageAccumulator::new(StreamingUsageFormat::ServerSentEvents);
        accumulator
            .observe(
                b"data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"he\"}]}}],\
                          \"usageMetadata\":{\"promptTokenCount\":210,\"candidatesTokenCount\":2}}\n\n\
                  data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"llo\"}]}}],\
                          \"usageMetadata\":{\"promptTokenCount\":210,\"candidatesTokenCount\":33}}\n\n",
            )
            .unwrap();

        let usage = accumulator.finish().unwrap().expect("merged usage");
        assert_eq!(
            Some(210),
            usage.pointer("/usageMetadata/promptTokenCount").and_then(|v| v.as_i64())
        );
        assert_eq!(
            Some(33),
            usage.pointer("/usageMetadata/candidatesTokenCount").and_then(|v| v.as_i64())
        );
    }

    #[test]
    fn openai_final_usage_frame_still_wins_per_field() {
        // OpenAI 兼容流只在尾帧携带 usage；合并逻辑必须保持字段级
        // latest-wins（尾帧为最终值）。
        let mut accumulator =
            StreamingUsageAccumulator::new(StreamingUsageFormat::ServerSentEvents);
        accumulator
            .observe(
                b"data: {\"choices\":[{\"delta\":{\"content\":\"hi\"}}]}\n\n\
                  data: {\"choices\":[{\"delta\":{}}],\"usage\":{\"prompt_tokens\":12,\"completion_tokens\":34}}\n\n\
                  data: [DONE]\n\n",
            )
            .unwrap();

        let usage = accumulator.finish().unwrap().expect("usage frame");
        assert_eq!(Some(12), usage.pointer("/usage/prompt_tokens").and_then(|v| v.as_i64()));
        assert_eq!(Some(34), usage.pointer("/usage/completion_tokens").and_then(|v| v.as_i64()));
    }

    #[test]
    fn token_line_reads_gemini_usage_metadata() {
        // Gemini 非流式响应把 usage 放在顶层 usageMetadata（promptTokenCount），
        // Token/ResponseBody 提取必须识别该形态，否则 gemini.embedContent
        // 的 token 计费会因找不到数量而失败。
        let line = token_line(
            &BillingMeter::EmbeddingInputToken,
            &json!({ "usageMetadata": { "promptTokenCount": 210 } }),
        )
        .expect("gemini usage line");
        assert_eq!(BillingMeter::EmbeddingInputToken, line.meter);
        assert_eq!("210", line.quantity.billable_quantity);
    }

    #[test]
    fn token_line_still_reads_openai_anthropic_and_bare_usage_shapes() {
        let openai = token_line(
            &BillingMeter::EmbeddingInputToken,
            &json!({ "usage": { "prompt_tokens": 100 } }),
        )
        .expect("openai usage line");
        assert_eq!("100", openai.quantity.billable_quantity);

        // 无 usage 包装时回退到 body 本身找 token 数量（anthropic 原始形态）。
        let anthropic = token_line(
            &BillingMeter::EmbeddingInputToken,
            &json!({ "input_tokens": 33 }),
        )
        .expect("bare usage line");
        assert_eq!("33", anthropic.quantity.billable_quantity);
    }

    #[test]
    fn token_line_errors_when_no_token_count_is_present() {
        let error = token_line(&BillingMeter::EmbeddingInputToken, &json!({ "embedding": [] }))
            .expect_err("missing usage must fail");
        assert!(error.to_string().contains("missing token count"));
    }
}
