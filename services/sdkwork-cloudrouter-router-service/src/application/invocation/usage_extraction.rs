use serde_json::Value;

use super::{
    adapter_response_status_code, result_gate_satisfied, waived_reason, BillingMode,
    BillingQuantitySource, BillingResultGate, DispatchMode, Invocation, InvocationBody,
    InvocationError, InvocationErrorKind, InvocationFuture, InvocationInterceptor,
    InvocationUsageLine,
};
use crate::domain::{BillingMeter, DecimalValue};
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
                BillingQuantitySource::FixedRequest => ensure_result_gated_request_line(invocation),
                BillingQuantitySource::Composite => extract_composite_usage(invocation),
                BillingQuantitySource::ResponseBody => extract_response_body_usage(invocation),
                BillingQuantitySource::AdapterUsageLines => extract_adapter_usage_lines(invocation),
                BillingQuantitySource::StreamingAccumulator => extract_streaming_usage(invocation),
                BillingQuantitySource::RequestBody => extract_request_body_usage(invocation),
                BillingQuantitySource::None | BillingQuantitySource::ResponseHeaders => {
                    // ⚠️ 这个来源**没有抽取实现**：这里不产行，结算层见空行
                    // 直接跳过 ⇒ 声明它们的计费路由会永久免单（上线不会报错）。
                    // 由 `openapi_billing_matrix` 的
                    // `billable_operations_never_declare_an_unimplemented_quantity_source`
                    // 挡住：改分类器声明它们前，先实现抽取分支。
                    Ok(())
                }
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

/// Fixed-request usage line that only exists when the vendor would have billed.
///
/// `result_gate == Any` keeps the historical "a 2xx call is a billable call"
/// rule. Gated routes (DeepSeek's Search/Fetch) drop the line — and therefore
/// the charge and any prepaid hold — when the provider answered 2xx without
/// producing a result the vendor itself bills for.
fn ensure_result_gated_request_line(invocation: &mut Invocation) -> Result<(), InvocationError> {
    if invocation.billing.result_gate == BillingResultGate::Any {
        return ensure_fixed_request_line(invocation);
    }
    let gate = invocation.billing.result_gate;
    match response_body(invocation) {
        Ok(body) if result_gate_satisfied(gate, &body) => ensure_fixed_request_line(invocation),
        Ok(_) => {
            waive_request_charge(invocation, gate);
            Ok(())
        }
        Err(error) => {
            // The body could not be read (non-JSON or already consumed). Keep the
            // charge: the upstream answered 2xx, and gifting billable traffic is
            // worse than charging a call the vendor may have billed for.
            tracing::warn!(
                stage = "billing_gate",
                api_code = %invocation.resource.api_code,
                request_id = %invocation.request.request_id,
                %error,
                "web tool result gate could not read the provider body; keeping the request charge"
            );
            ensure_fixed_request_line(invocation)
        }
    }
}

/// Removes the per-request usage fact and records why the customer is not charged.
///
/// The reservation itself is released by `BillingSettlementInterceptor`, which
/// runs after this hook; leaving the flag here is what tells it there is no
/// billable amount to demand.
fn waive_request_charge(invocation: &mut Invocation, gate: BillingResultGate) {
    invocation
        .usage
        .lines
        .retain(|line| line.meter != BillingMeter::ApiRequest);
    let reason = waived_reason(gate).unwrap_or("result_gate_unsatisfied");
    invocation.charging.waived = Some(reason.to_owned());
    tracing::info!(
        stage = "billing_waived",
        api_code = %invocation.resource.api_code,
        request_id = %invocation.request.request_id,
        reason,
        "provider answered 2xx without a billable result; the per-request charge is waived"
    );
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
    let (mut billable_input, mut cached_tokens, mut cache_write_tokens, mut output_tokens) =
        composite_usage_components(usage);

    // 模态令牌（audio / image）在目录里是**独立费率**，与文本档差 2.7–8 倍。
    // 上游报了明细就必须在各自的计量单位上结算，否则整段音频按文本价收。
    // 先拆模态、再处理缓存回退：拆分以"当前可计费输入"为上限，缓存并入放在
    // 之后才不会把缓存额度重复借给模态行。
    let modality_split =
        split_priced_modalities(invocation, usage, &mut billable_input, &mut output_tokens);

    // 缓存计量**没有报价**时不能落成 0 元事实。上游对缓存命中仍然收费（OpenAI 约
    // 0.25–0.5× 输入价、Anthropic 缓存读约 0.1×），而 0 元事实不会触发任何告警：
    // 那部分 prompt 就永久免单，长上下文场景（缓存命中常占 prompt 的 50%–95%）
    // 等于按输入价的零头收费。这里把无价的缓存 token **并入输入行**、按输入价
    // 结算——上限是 1× 输入价（可由目录补数据修正），下限不能是 0（不可恢复）。
    //
    // 只在"定价体系真的跑过"（`pricing_quotes` 非空）时回退：纯抽取单测没有定价
    // 上下文，保持"按帧原样拆分"的语义，否则会掩盖提取本身的正确性。
    if !invocation.usage.pricing_quotes.is_empty() {
        if cached_tokens > 0
            && invocation
                .usage
                .quote_for_meter(&BillingMeter::LlmCacheReadToken)
                .is_none()
        {
            tracing::warn!(
                stage = "billing_usage_extraction",
                api_code = %invocation.resource.api_code,
                request_id = %invocation.request.request_id,
                cached_tokens,
                "pricing catalog has no cache-read rate; billing the cached prompt tokens at the input rate"
            );
            billable_input = billable_input.saturating_add(cached_tokens);
            cached_tokens = 0;
        }
        if cache_write_tokens > 0
            && invocation
                .usage
                .quote_for_meter(&BillingMeter::LlmCacheWriteToken)
                .is_none()
        {
            tracing::warn!(
                stage = "billing_usage_extraction",
                api_code = %invocation.resource.api_code,
                request_id = %invocation.request.request_id,
                cache_write_tokens,
                "pricing catalog has no cache-write rate; billing the cache-write tokens at the input rate"
            );
            billable_input = billable_input.saturating_add(cache_write_tokens);
            cache_write_tokens = 0;
        }
    }

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
    for line in cache_read_lines(usage, cached_tokens)? {
        invocation.usage.add_line(line);
    }
    if cache_write_tokens > 0 {
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
    for (meter, tokens) in [
        (BillingMeter::AudioInputToken, modality_split.audio_input),
        (BillingMeter::ImageInputToken, modality_split.image_input),
        (BillingMeter::VideoInputToken, modality_split.video_input),
        (BillingMeter::AudioOutputToken, modality_split.audio_output),
        (BillingMeter::ImageOutputToken, modality_split.image_output),
    ] {
        if tokens > 0 {
            invocation.usage.add_line(InvocationUsageLine::new(
                meter,
                GatewayUsageQuantity::tokens(tokens)
                    .map_err(|error| usage_error(error.to_string()))?,
            ));
        }
    }
    for (meter, calls) in tool_call_counts(body) {
        if calls > 0 {
            let quantity = GatewayUsageQuantity::for_meter(meter.clone(), calls.to_string())
                .map_err(|error| usage_error(error.to_string()))?;
            invocation
                .usage
                .add_line(InvocationUsageLine::new(meter, quantity));
        }
    }
    let anthropic_searches = anthropic_web_search_count(body);
    if anthropic_searches > 0 {
        let quantity = GatewayUsageQuantity::for_meter(
            BillingMeter::WebSearchCall,
            anthropic_searches.to_string(),
        )
        .map_err(|error| usage_error(error.to_string()))?;
        invocation.usage.add_line(InvocationUsageLine::new(
            BillingMeter::WebSearchCall,
            quantity,
        ));
    }
    Ok(())
}

/// Anthropic reports server-tool usage separately from token usage:
/// `usage.server_tool_use.web_search_requests` is the vendor-authoritative
/// count. Content blocks also contain `server_tool_use` items, but using them
/// would double-count retries and is not needed when the usage object exists.
fn anthropic_web_search_count(body: &Value) -> i64 {
    body.pointer("/usage/server_tool_use/web_search_requests")
        .and_then(Value::as_i64)
        .unwrap_or(0)
        .max(0)
}

/// Counts hosted server-tool calls reported in a Responses payload.
///
/// OpenAI reports each call as an item in `output[]` with type
/// `web_search_call` / `file_search_call`; the token usage frame carries no
/// tool count, so the item array is the only authoritative source. Only
/// completed items are counted (`response.output_item.done` in streaming is
/// folded into the same array by the accumulator).
fn tool_call_counts(body: &Value) -> [(BillingMeter, i64); 3] {
    let mut web_search = 0_i64;
    let mut file_search = 0_i64;
    let mut code_interpreter_sessions = 0_i64;
    if let Some(items) = body.get("output").and_then(Value::as_array) {
        for item in items {
            match item.get("type").and_then(Value::as_str) {
                Some("web_search_call") => web_search += 1,
                Some("file_search_call") => file_search += 1,
                // One Responses call can run several code cells in the same
                // container session; OpenAI bills the session, not each cell.
                Some("code_interpreter_call") => code_interpreter_sessions = 1,
                _ => {}
            }
        }
    }
    [
        (BillingMeter::WebSearchCall, web_search),
        (BillingMeter::FileSearchCall, file_search),
        (
            BillingMeter::CodeInterpreterSession,
            code_interpreter_sessions,
        ),
    ]
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
    let candidate_tokens = integer_field(
        usage,
        &["completion_tokens", "output_tokens", "candidatesTokenCount"],
    )
    .unwrap_or(0);
    // Google 的 thinking 令牌与候选令牌**互斥**上报，且按**输出费率**计费：
    // `totalTokenCount = promptTokenCount + candidatesTokenCount + thoughtsTokenCount`。
    // 只取 `candidatesTokenCount` 会把整段思考量漏掉——思考型模型的思考 token
    // 往往与正文同量级，等于白送一半输出。OpenAI 的 `completion_tokens` 本身
    // 已包含 reasoning，没有 `thoughtsTokenCount` 字段，不受影响。
    let thinking_tokens = integer_field(usage, &["thoughtsTokenCount"]).unwrap_or(0);
    let output_tokens = candidate_tokens.saturating_add(thinking_tokens);
    let cached_tokens = cached_tokens(usage).unwrap_or(0);
    let cache_write_tokens = integer_field(usage, &["cache_creation_input_tokens"]).unwrap_or(0);
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
    /// 分块下发的 JSON **数组**（`[{...},\n{...}]`）。Gemini 的
    /// `:streamGenerateContent` 在契约里声明 200 响应就是 `application/json`
    /// （不是 `text/event-stream`），默认形态正是这种数组。只有 SSE 解析器时
    /// 每一行都不是 `data:` 前缀 ⇒ 一个用量字段都读不到 ⇒ 整条流免单。
    JsonArray,
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
    /// Completed hosted-tool items observed as `response.output_item.done`.
    /// The terminal usage frame carries no tool count, so these are folded
    /// into a synthetic `output[]` array before extraction.
    web_search_calls: u64,
    file_search_calls: u64,
    /// A code interpreter response opens a billable container session; the
    /// session is counted once per response, not once per code cell.
    code_interpreter_session: bool,
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
            web_search_calls: 0,
            file_search_calls: 0,
            code_interpreter_session: false,
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
        let mut body = self.latest_usage_body.clone();
        if body.is_none()
            && (self.web_search_calls > 0
                || self.file_search_calls > 0
                || self.code_interpreter_session)
        {
            body = Some(serde_json::json!({ "usage": {} }));
        }
        if let Some(body) = body.as_mut().and_then(Value::as_object_mut) {
            let mut output = Vec::new();
            for _ in 0..self.web_search_calls {
                output.push(serde_json::json!({ "type": "web_search_call" }));
            }
            for _ in 0..self.file_search_calls {
                output.push(serde_json::json!({ "type": "file_search_call" }));
            }
            if self.code_interpreter_session {
                output.push(serde_json::json!({ "type": "code_interpreter_call" }));
            }
            if !output.is_empty() {
                body.insert("output".to_owned(), Value::Array(output));
            }
        }
        Ok(body)
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
            StreamingUsageFormat::JsonArray => {
                self.observe_json_array_line(line);
                Ok(())
            }
        }
    }

    /// 解析分块 JSON 数组下发的流：行可能是 `[`、`{...},`、`{...}`、`]`，
    /// 也可能是整份数组压在一行（`[{...},{...}]`）。两种都按元素走同一条
    /// 记录路径，`merge_streaming_usage_body` 负责累计合并（Gemini 每帧给的是
    /// 累计值，逐字段最新值即为权威）。
    fn observe_json_array_line(&mut self, line: &[u8]) {
        let Ok(text) = std::str::from_utf8(line) else {
            return;
        };
        let text = text.trim();
        if text.is_empty() || text == "[" || text == "]" || text == "]," {
            return;
        }
        // 整份数组压在一行是最常见的形态（网关按 chunk 切开时也可能正好完整）。
        if text.starts_with('[') {
            if let Ok(Value::Array(items)) = serde_json::from_str::<Value>(text) {
                for item in items {
                    self.record_usage_value(item);
                }
                return;
            }
        }
        let element = text
            .trim_start_matches('[')
            .trim_end_matches(',')
            .trim_end_matches(']')
            .trim();
        if element.is_empty() {
            return;
        }
        if let Ok(value) = serde_json::from_str::<Value>(element) {
            self.record_usage_value(value);
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
        self.record_usage_value(value);
    }

    fn record_usage_value(&mut self, value: Value) {
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
        // Gemini streams carry the delta text in
        // `candidates[].content.parts[]` (`text`, plus `thought` parts for
        // reasoning models) and never use `choices`. Missing this branch meant a
        // Gemini stream that ended without `usageMetadata` estimated zero output
        // tokens, so the whole call settled to nothing.
        if let Some(candidates) = event.get("candidates").and_then(Value::as_array) {
            for candidate in candidates {
                let Some(parts) = candidate
                    .get("content")
                    .and_then(|content| content.get("parts"))
                    .and_then(Value::as_array)
                else {
                    continue;
                };
                for part in parts {
                    if let Some(text) = part.get("text").and_then(Value::as_str) {
                        self.observe_output_text(text);
                    }
                }
            }
        }
        // OpenAI Responses streams carry the delta text at the event's top
        // level (`{"type":"response.output_text.delta","delta":"..."}`), not
        // under `choices`. Same consequence as the Gemini gap above: a
        // Responses stream without a terminal `response.completed` usage frame
        // would estimate zero output tokens.
        if event.get("type").and_then(Value::as_str) == Some("response.output_text.delta") {
            if let Some(text) = event.get("delta").and_then(Value::as_str) {
                self.observe_output_text(text);
            }
        }
        // Responses streams report each finished hosted-tool invocation as
        // `response.output_item.done`. Count only the terminal event so a
        // provider that also emits `response.output_item.added` is not
        // double-billed.
        if event.get("type").and_then(Value::as_str) == Some("response.output_item.done") {
            match event
                .get("item")
                .and_then(|item| item.get("type"))
                .and_then(Value::as_str)
            {
                Some("web_search_call") => self.web_search_calls += 1,
                Some("file_search_call") => self.file_search_calls += 1,
                Some("code_interpreter_call") => self.code_interpreter_session = true,
                _ => {}
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

    // Assistants (`thread.run.*`) and the newer event envelopes put the
    // completed object under `data`: {"event":"thread.run.completed",
    // "data":{...,"usage":{"prompt_tokens":N,...}}}. Only the terminal event
    // carries usage, so without this branch a streaming run settles purely from
    // the output-text estimate and drops the prompt half entirely.
    if let Some(usage_body) = event
        .get_mut("data")
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
    let Some(incoming_usage) = incoming_object
        .get(&incoming_field)
        .and_then(Value::as_object)
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
    // 流被中断（客户端断开 / 上游失败 / 超时）或上游忽略 `include_usage` 时，
    // 兜底体只有 `prompt_tokens: 0` + 估算输出。输入 token 此前直接记 0 ⇒
    // 客户端只要在首帧后断开，就能让整段 prompt 免单。输入无法从响应流重建，
    // 只能按请求体估算；真实 usage 到达时绝不覆盖。
    let augmented = augment_missing_prompt_tokens(&invocation.request.body, body);
    match augmented.as_ref() {
        Some(value) => extract_composite_usage_from_body(invocation, value),
        None => extract_composite_usage_from_body(invocation, body),
    }
}

/// 给"缺输入 token"的流式兜底体补一个请求体估算值。
///
/// 只有三类输入字段都为 0/缺失时才补；任何真实正值都原样保留。返回 `None`
/// 表示不需要改（没有 usage 对象，或已有真实输入量）。
fn augment_missing_prompt_tokens(
    request_body: &InvocationBody,
    usage_body: &Value,
) -> Option<Value> {
    let usage = usage_body.get("usage")?.as_object()?;
    let has_real_input = ["prompt_tokens", "input_tokens", "promptTokenCount"]
        .iter()
        .any(|key| {
            usage
                .get(*key)
                .and_then(Value::as_i64)
                .is_some_and(|count| count > 0)
        });
    if has_real_input {
        return None;
    }
    let estimate = estimated_request_input_tokens(request_body);
    let mut augmented = usage_body.clone();
    let usage = augmented.get_mut("usage")?.as_object_mut()?;
    let field = if usage.contains_key("input_tokens") {
        "input_tokens"
    } else if usage.contains_key("promptTokenCount") {
        "promptTokenCount"
    } else {
        "prompt_tokens"
    };
    usage.insert(field.to_owned(), serde_json::json!(estimate));
    tracing::warn!(
        estimated_input_tokens = estimate,
        field,
        "stream usage body carried no input tokens; billing the request-body estimate"
    );
    Some(augmented)
}

/// Request-body token estimate for meters whose provider response has no usage
/// frame (Gemini `:batchEmbedContents`). Counts only the text payload, not JSON
/// keys; a provider tokenizer is not available at this boundary, so the same
/// conservative ASCII/wide-character ratio as the streaming fallback is used.
fn extract_request_body_usage(invocation: &mut Invocation) -> Result<(), InvocationError> {
    let Some(meter) = invocation.billing.meter.clone() else {
        return Ok(());
    };
    let tokens = estimated_request_body_tokens(&invocation.request.body);
    if tokens > 0 {
        invocation.usage.add_line(InvocationUsageLine::new(
            meter,
            GatewayUsageQuantity::tokens(tokens).map_err(|error| usage_error(error.to_string()))?,
        ));
    }
    Ok(())
}

fn estimated_request_body_tokens(request_body: &InvocationBody) -> i64 {
    if let InvocationBody::Json(value) = request_body {
        if let Some(requests) = value.get("requests").and_then(Value::as_array) {
            let mut text = String::new();
            for request in requests {
                if let Some(content) = request.get("content") {
                    if let Some(parts) = content.get("parts").and_then(Value::as_array) {
                        for part in parts {
                            if let Some(part_text) = part.get("text").and_then(Value::as_str) {
                                text.push_str(part_text);
                            }
                        }
                    } else if let Some(content_text) = content.as_str() {
                        text.push_str(content_text);
                    }
                }
            }
            if !text.is_empty() {
                return estimate_text_tokens(&text);
            }
        }
    }
    estimated_request_input_tokens(request_body)
}

fn estimate_text_tokens(text: &str) -> i64 {
    let mut ascii = 0_i64;
    let mut wide = 0_i64;
    for character in text.chars() {
        if character.is_ascii() {
            ascii += 1;
        } else {
            wide += 1;
        }
    }
    (ascii / 4 + wide * 3 / 4).max(1)
}

/// 请求体输入 token 的保守估算：ASCII 约 4 字符/token，宽字符约 1.33 字符/token。
fn estimated_request_input_tokens(request_body: &InvocationBody) -> i64 {
    let text = match request_body {
        InvocationBody::Json(value) => value.to_string(),
        InvocationBody::Bytes(bytes) => String::from_utf8_lossy(bytes).into_owned(),
        _ => return 1,
    };
    estimate_text_tokens(&text)
}

fn extract_response_body_usage(invocation: &mut Invocation) -> Result<(), InvocationError> {
    let meter = invocation
        .billing
        .meter
        .clone()
        .ok_or_else(|| usage_error("response body usage extraction requires billing meter"))?;
    // 内嵌 provider adapter 用 `_gateway_usage.lines` 声明的用量行是权威口径：
    // 它可能携带多个计量单位（`api_result` + `api_item` 等），而按模式合成的
    // 单行（`ResultCount` 只产一条结果行）会吞掉其余行。适配器给了行就按行
    // 结算；没给行则保持原有按模式合成的行为不变。二进制/非 JSON 应答体
    // （TTS 音频等）解析不了就当无适配器行，走各模式自己的容错路径。
    let has_adapter_usage_lines = match response_body(invocation) {
        Ok(body) => adapter_usage_lines_pointer(&body).is_some_and(|lines| !lines.is_empty()),
        Err(_) => false,
    };
    if has_adapter_usage_lines {
        return extract_adapter_usage_lines(invocation);
    }
    // Only token metering is allowed to fail on an unparsable provider body:
    // every token-capable vendor answers with JSON, so a missing or malformed
    // body is a real metering fault worth surfacing. Character and media
    // meters, by contrast, legitimately answer with binary payloads (TTS audio)
    // or with receipts that omit the measured quantity (non-verbose STT,
    // async video/music jobs). Those shapes must fall back instead of
    // aborting the `after` chain — an abort here silently drops settlement and
    // usage recording for a call the client was already served.
    // 媒体/语音路由的 2xx 仍可能是**业务失败**：Kling/Vidu 用 `code != 0`，
    // MiniMax 用 `base_resp.status_code != 0`，其他厂商回 `error` 对象或
    // `status: failed`。此时上游没有产出可计量的东西，按 1 条/1 张收是
    // 多收客户。token 模式不在此列：即使响应带错误，已发生的 token 计算仍要结。
    if matches!(
        invocation.billing.mode,
        BillingMode::ResultCount
            | BillingMode::VideoSecond
            | BillingMode::AudioSecond
            | BillingMode::Character
    ) && provider_reported_business_failure(invocation)
    {
        invocation.charging.waived = Some("provider_business_failure".to_owned());
        tracing::info!(
            stage = "billing_waived",
            api_code = %invocation.resource.api_code,
            request_id = %invocation.request.request_id,
            meter = %meter.code(),
            "provider answered 2xx with a business failure; the media charge is waived"
        );
        return Ok(());
    }

    let lines = match invocation.billing.mode {
        BillingMode::Token => token_lines(invocation, &meter)?,
        BillingMode::ResultCount => {
            // 上游 2xx 但明确回"零产出"（`data: []` / `result_count: 0`）时，
            // 不能按 1 张/条收：内容过滤、空候选、任务未创建都属于这一类。
            // 记 waive，让结算层释放预扣并成功返回。
            if result_count_is_explicitly_zero(invocation) {
                invocation.charging.waived = Some("provider_returned_no_results".to_owned());
                tracing::info!(
                    stage = "billing_waived",
                    api_code = %invocation.resource.api_code,
                    request_id = %invocation.request.request_id,
                    meter = %meter.code(),
                    "provider answered 2xx with zero results; the per-result charge is waived"
                );
                return Ok(());
            }
            vec![result_line(&meter, invocation)?]
        }
        BillingMode::ItemCount => vec![item_line(&meter, invocation)?],
        BillingMode::Character => vec![character_line(&meter, invocation)?],
        BillingMode::AudioSecond => vec![audio_line(&meter, invocation)?],
        BillingMode::VideoSecond => vec![video_line(&meter, invocation)?],
        BillingMode::Storage => match storage_line(&meter, invocation)? {
            Some(line) => vec![line],
            // A present, explicit zero-byte count is a real empty object: there
            // is nothing to charge, but it is not an accounting failure either.
            // Waive it like a zero-result media call so the reservation is
            // released instead of failing settlement.
            None => {
                invocation.charging.waived = Some("provider_reported_zero_storage".to_owned());
                tracing::info!(
                    stage = "billing_waived",
                    api_code = %invocation.resource.api_code,
                    request_id = %invocation.request.request_id,
                    meter = %meter.code(),
                    "provider reported zero stored bytes; the storage charge is waived"
                );
                return Ok(());
            }
        },
        _ => vec![generic_line(&meter, invocation)?],
    };
    for line in lines {
        invocation.usage.add_line(line);
    }
    Ok(())
}

/// 应答体里适配器契约的用量行数组（`_gateway_usage.lines` 及其变体位）。
///
/// 内嵌 provider adapter 的应答若携带该结构，它就是权威计费口径：适配器对
/// 自家厂商 API 的实际计量（可多行、多计量单位），优先于按计费模式合成的
/// 单行（`ResultCount` 等模式只产一条结果行，会吞掉适配器的其余行）。
fn adapter_usage_lines_pointer(body: &Value) -> Option<&Vec<Value>> {
    body.pointer("/usage/usageLines")
        .or_else(|| body.pointer("/usage/usage_lines"))
        .or_else(|| body.pointer("/body/_gateway_usage/lines"))
        .or_else(|| body.pointer("/body/usage/lines"))
        .or_else(|| body.pointer("/_gateway_usage/lines"))
        .or_else(|| body.pointer("/usage/lines"))
        .and_then(Value::as_array)
}

fn extract_adapter_usage_lines(invocation: &mut Invocation) -> Result<(), InvocationError> {
    let body = response_body(invocation)?;
    let Some(lines) = adapter_usage_lines_pointer(&body) else {
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

/// 供应商用量对象：OpenAI/Anthropic 放在 `usage`，Google 放在 `usageMetadata`。
fn usage_object(body: &Value) -> &Value {
    body.get("usage")
        .or_else(|| body.get("usageMetadata"))
        .unwrap_or(body)
}

/// 计量单位决定读哪一侧的令牌计数。
fn token_fields_for_meter(meter: &BillingMeter) -> &'static [&'static str] {
    // 计量单位决定读哪一侧的令牌计数。sdkwork-models 目录把多模态模型的
    // 输入与产出分成两个计量单位（`openai/gpt-image-2` 同时定义
    // `image_input_token` 与 `image_output_token`，`kling-v3` 的音频等）；
    // 若一律读输入侧，产出侧计费就会按输入令牌计量。输入侧字段顺序保持
    // 原样，历史行为不变。
    match meter {
        BillingMeter::LlmOutputToken
        | BillingMeter::ImageOutputToken
        | BillingMeter::AudioOutputToken
        | BillingMeter::VideoOutputToken => &[
            "output_tokens",
            "completion_tokens",
            "candidatesTokenCount",
            "total_tokens",
        ],
        // 🔴 缓存与推理令牌**禁止回落到 `prompt_tokens` / `output_tokens`**。
        //
        // 这两档只在"目录把某模型的唯一费率配成缓存/推理计量单位"时才走到
        // （路由声明走的是 `Composite`，那条路直接在
        // `composite_usage_components` 里分行）。一旦回落：
        // * 缓存读回落 `prompt_tokens` ⇒ 把整段输入按缓存折扣价收；
        // * 推理回落 `output_tokens` ⇒ 把整段输出按推理价**再收一遍**，
        //   与同时存在的输出行重复计费。
        // 上游没报就是读不到，由 `token_line` 显式报错（进对账），
        // 不用一个量级完全不同的数字顶替。
        BillingMeter::LlmCacheReadToken => &["cache_read_input_tokens", "cached_tokens"],
        BillingMeter::LlmCacheWriteToken => &["cache_creation_input_tokens", "cache_write_tokens"],
        BillingMeter::LlmReasoningToken => &["reasoning_tokens", "thoughtsTokenCount"],
        _ => &[
            "prompt_tokens",
            "input_tokens",
            "promptTokenCount",
            "total_tokens",
        ],
    }
}

/// 该计量单位在用量对象里的令牌计数（顶层字段优先，其次明细容器）。
fn token_count(meter: &BillingMeter, usage: &Value) -> Option<i64> {
    let fields = token_fields_for_meter(meter);
    integer_field(usage, fields).or_else(|| nested_token_details(usage, fields))
}

#[cfg(test)]
fn token_line(meter: &BillingMeter, body: &Value) -> Result<InvocationUsageLine, InvocationError> {
    let usage = usage_object(body);
    let tokens = token_count(meter, usage)
        .ok_or_else(|| usage_error("token response usage is missing token count"))?;
    Ok(InvocationUsageLine::new(
        meter.clone(),
        GatewayUsageQuantity::tokens(tokens).map_err(|error| usage_error(error.to_string()))?,
    ))
}

/// `BillingMode::Token` 的用量行（可能多于一行）。
///
/// 目录把多模态模型拆成"输入侧 / 产出侧"两个计量单位，而 Token 模式原先只产出
/// **主档那一行**。主档取产出侧时（`openai.images` 的目录改写就是取
/// `image_output_token`），输入侧——提示词 token + 输入图 token——完全不进账：
/// 上游按双向计费，我们只收输出侧。
///
/// 补齐规则（与缓存/模态回退同源，绝不造 0 元事实）：
/// * 目录**给了输入侧报价**才补行，没价就不记；
/// * 上游没报输入量就不补，不拿 `total_tokens` 顶替（那是两侧相加）；
/// * 上游把输入拆成 `input_tokens_details.{text,image}_tokens` 且文本档也有报价时
///   按模态拆行（文本输入与图像输入的费率不同），否则整段输入记在路由自己的
///   输入档上。
fn token_lines(
    invocation: &mut Invocation,
    meter: &BillingMeter,
) -> Result<Vec<InvocationUsageLine>, InvocationError> {
    let body = response_body(invocation)?;
    let usage = usage_object(&body);

    // 输入侧主档（embedding，以及只给输入侧报价的目录）：按模态拆开再记。
    if is_input_token_meter(meter) {
        return input_token_lines(invocation, meter, usage);
    }

    let primary_tokens = token_count(meter, usage)
        .ok_or_else(|| usage_error("token response usage is missing token count"))?;
    let mut lines = vec![tokens_line(meter.clone(), primary_tokens)?];
    let complement = match meter {
        BillingMeter::ImageOutputToken => Some(BillingMeter::ImageInputToken),
        BillingMeter::AudioOutputToken => Some(BillingMeter::AudioInputToken),
        BillingMeter::VideoOutputToken => Some(BillingMeter::VideoInputToken),
        _ => None,
    };
    let Some(complement) = complement else {
        return Ok(lines);
    };
    let Some(input_tokens) = token_count(&complement, usage) else {
        return Ok(lines);
    };
    let reported = modality_tokens(usage);
    let text_priced = invocation
        .usage
        .quote_for_meter(&BillingMeter::LlmInputToken)
        .is_some();
    if invocation.usage.quote_for_meter(&complement).is_some() {
        // 输入侧有独立报价：模态份额记在 complement 上、文本份额记在文本档。
        // 上游没给模态明细时整段输入留在 complement（历史行为：图片编辑的
        // 输入以图片为主，且目录通常只给该模态报价）。
        let modality_share = match complement {
            BillingMeter::ImageInputToken => reported.image_input,
            BillingMeter::AudioInputToken => reported.audio_input,
            BillingMeter::VideoInputToken => reported.video_input,
            _ => 0,
        }
        .min(input_tokens);
        let (text_tokens, modality_tokens) = if modality_share > 0 {
            (input_tokens - modality_share, modality_share)
        } else {
            (0, input_tokens)
        };
        if text_tokens > 0 && text_priced {
            lines.push(tokens_line(BillingMeter::LlmInputToken, text_tokens)?);
        }
        if modality_tokens > 0 {
            lines.push(tokens_line(complement.clone(), modality_tokens)?);
        }
    } else if text_priced {
        // 输入侧没有独立报价，但文本档有价——Google 图像生成就是这种组合
        // （`image_output_token` + `llm_input_token`）。文本提示词不能因为
        // "输入侧不是图像 token" 而整段免单。
        let modality_share = reported
            .audio_input
            .saturating_add(reported.image_input)
            .saturating_add(reported.video_input)
            .min(input_tokens);
        let text_tokens = input_tokens - modality_share;
        if text_tokens > 0 {
            lines.push(tokens_line(BillingMeter::LlmInputToken, text_tokens)?);
        }
    }
    Ok(lines)
}

fn is_input_token_meter(meter: &BillingMeter) -> bool {
    matches!(
        meter,
        BillingMeter::LlmInputToken
            | BillingMeter::EmbeddingInputToken
            | BillingMeter::ImageInputToken
            | BillingMeter::AudioInputToken
            | BillingMeter::VideoInputToken
    )
}

fn tokens_line(meter: BillingMeter, tokens: i64) -> Result<InvocationUsageLine, InvocationError> {
    Ok(InvocationUsageLine::new(
        meter,
        GatewayUsageQuantity::tokens(tokens).map_err(|error| usage_error(error.to_string()))?,
    ))
}

/// `BillingMode::Token` 且主档是**输入侧**时的用量行。
///
/// 目录给多模态 embedding / 输入侧单独定价（`google/gemini-embedding-2` 的
/// `audio_input_token` / `image_input_token` / `video_input_token` 与
/// `llm_input_token` 是四个不同费率）。主档只产出一行会把整段输入按主档费率
/// 收：文本主档会把图像输入按文本价少收，模态主档会把文本按模态价多收。
///
/// 规则与输出侧同源：
/// * 只拆**有报价**的模态，无价模态留在主档，绝不造 0 元事实；
/// * 上游没给模态明细时整段输入记在主档（不猜）；
/// * 主档是模态档且文本无独立报价时，文本余量并入主档（宁可按主档费率收，
///   也不能让令牌消失）。
fn input_token_lines(
    invocation: &Invocation,
    meter: &BillingMeter,
    usage: &Value,
) -> Result<Vec<InvocationUsageLine>, InvocationError> {
    let total = token_count(meter, usage)
        .ok_or_else(|| usage_error("token response usage is missing token count"))?;
    let reported = modality_tokens(usage);
    if reported.is_empty() {
        return Ok(if total > 0 {
            vec![tokens_line(meter.clone(), total)?]
        } else {
            Vec::new()
        });
    }

    let mut remaining = total;
    let mut audio = 0i64;
    let mut image = 0i64;
    let mut video = 0i64;
    for (modality_meter, reported_tokens) in [
        (BillingMeter::AudioInputToken, reported.audio_input),
        (BillingMeter::ImageInputToken, reported.image_input),
        (BillingMeter::VideoInputToken, reported.video_input),
    ] {
        if reported_tokens <= 0 {
            continue;
        }
        if modality_meter != *meter && invocation.usage.quote_for_meter(&modality_meter).is_none() {
            continue;
        }
        let split = reported_tokens.min(remaining);
        if split == 0 {
            continue;
        }
        remaining -= split;
        match modality_meter {
            BillingMeter::AudioInputToken => audio = split,
            BillingMeter::ImageInputToken => image = split,
            BillingMeter::VideoInputToken => video = split,
            _ => {}
        }
    }

    let primary_is_text = matches!(
        meter,
        BillingMeter::LlmInputToken | BillingMeter::EmbeddingInputToken
    );
    let (mut primary_tokens, text_remainder) = if primary_is_text {
        (remaining, 0)
    } else {
        let share = match meter {
            BillingMeter::AudioInputToken => audio,
            BillingMeter::ImageInputToken => image,
            BillingMeter::VideoInputToken => video,
            _ => 0,
        };
        (share, remaining)
    };

    let mut lines = Vec::new();
    if text_remainder > 0 {
        if invocation
            .usage
            .quote_for_meter(&BillingMeter::LlmInputToken)
            .is_some()
        {
            lines.push(tokens_line(BillingMeter::LlmInputToken, text_remainder)?);
        } else {
            primary_tokens = primary_tokens.saturating_add(text_remainder);
        }
    }
    if primary_tokens > 0 {
        lines.insert(0, tokens_line(meter.clone(), primary_tokens)?);
    }
    for (modality_meter, quantity) in [
        (BillingMeter::AudioInputToken, audio),
        (BillingMeter::ImageInputToken, image),
        (BillingMeter::VideoInputToken, video),
    ] {
        if quantity > 0 && modality_meter != *meter {
            lines.push(tokens_line(modality_meter, quantity)?);
        }
    }
    Ok(lines)
}

/// 输入侧令牌明细的容器名。
///
/// OpenAI chat/completions 与 Responses 用复数 `prompt_tokens_details` /
/// `input_tokens_details`；Realtime 的 `response.done` 用**单数**
/// `input_token_details`。只认复数形态时，整条实时会话的音频/图像令牌明细
/// 一个都读不到，全部退回文本档。
const INPUT_TOKEN_DETAIL_KEYS: &[&str] = &[
    "prompt_tokens_details",
    "input_tokens_details",
    "input_token_details",
    "token_details",
];

/// 输出侧令牌明细的容器名（同上，Realtime 用单数 `output_token_details`）。
const OUTPUT_TOKEN_DETAIL_KEYS: &[&str] = &[
    "completion_tokens_details",
    "output_tokens_details",
    "output_token_details",
    "token_details",
];

/// 按模态拆出来的可计费令牌量。
///
/// 目录为这些模态单独定价：`openai/gpt-realtime-2` 的
/// `audio_input_token` 是 `$32/1M`，而 `llm_input_token` 只有 `$4/1M`
/// （8×）；`audio_output_token` `$64` 对 `llm_output_token` `$24`（2.67×）；
/// `image_input_token` `$5` 对 `$4`。这些码位一直存在，但抽取层从不产出
/// ⇒ 音频/图像令牌全部按文本价结算，属于"上游成本与对客收费脱钩"。
///
/// Google 的形态是**数组**（`promptTokensDetails[].{modality,tokenCount}`），
/// 不是扁平字段；Gemini 的 TTS / 图像 / 实时语音全部靠它拆分。只认 OpenAI
/// 形状时，这些模型的模态令牌会整段落回文本档，或落在目录根本没报价的
/// `llm_output_token` 上（结算失败 = 免单）。
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
struct ModalityTokens {
    audio_input: i64,
    image_input: i64,
    video_input: i64,
    audio_output: i64,
    image_output: i64,
}

impl ModalityTokens {
    fn is_empty(&self) -> bool {
        self.audio_input == 0
            && self.image_input == 0
            && self.video_input == 0
            && self.audio_output == 0
            && self.image_output == 0
    }
}

/// Google 模态明细里的一个模态计数。
///
/// Gemini 把模态明细放在 `promptTokensDetails` / `candidatesTokensDetails` /
/// `cacheTokensDetails` 三个数组里，每项形如 `{"modality": "AUDIO",
/// "tokenCount": 600}`；OpenAI 则放在 `*_tokens_details` 容器里的扁平
/// `audio_tokens` / `image_tokens` 字段。两家形状互斥，只认一边的那一半模态
/// 令牌会按文本价结算（音频输入在目录里常是文本价的 8 倍）。
///
/// 返回 `None` 表示**该容器不存在**（没有这份明细），`Some(0)` 表示容器存在但
/// 没有该模态的条目——两者的区别决定"是否按模态拆行"，不能合并。
fn google_modality_count(usage: &Value, container: &str, modality: &str) -> Option<i64> {
    let entries = usage.get(container)?.as_array()?;
    let mut total: Option<i64> = None;
    for entry in entries {
        let reported = entry
            .get("modality")
            .and_then(Value::as_str)
            .unwrap_or_default();
        if !reported.eq_ignore_ascii_case(modality) {
            continue;
        }
        let tokens = integer_field(entry, &["tokenCount"]).unwrap_or(0);
        total = Some(total.unwrap_or(0).saturating_add(tokens));
    }
    total
}

/// 读 `<detail 容器>.<field>` 的计数，容器名按各家的契约形状逐个尝试。
fn detail_token_count(usage: &Value, containers: &[&str], fields: &[&str]) -> Option<i64> {
    containers
        .iter()
        .filter_map(|key| usage.get(*key))
        .find_map(|details| integer_field(details, fields))
}

/// 上游报告的模态令牌量。
///
/// 两家形状不同，必须都认：
/// * chat/completions：`prompt_tokens_details.audio_tokens` 与
///   `completion_tokens_details.audio_tokens`；`prompt_tokens` 是**含**音频的
///   总数 ⇒ 音频是子集，文本 = 总数 − 音频。
/// * Realtime `response.done`：`input_token_details.{text,audio,image}_tokens`
///   与 `output_token_details.{text,audio}_tokens`，三段**互斥**上报。
///
/// 命中过的缓存里如果也分了模态（`cached_tokens_details.audio_tokens`），
/// 那部分已经由缓存行按缓存价结算，这里扣掉，避免按音频价再收一遍。
fn modality_tokens(usage: &Value) -> ModalityTokens {
    // Google 的明细是数组，且 `promptTokenCount` **已包含**缓存命中；
    // `cacheTokensDetails` 给出缓存部分按模态的拆分，必须从模态输入里扣掉，
    // 否则同一批音频令牌会被"缓存行 + 音频输入行"收两遍。
    let google_reported = usage.get("promptTokensDetails").is_some()
        || usage.get("candidatesTokensDetails").is_some();
    if google_reported {
        let cached_audio = google_modality_count(usage, "cacheTokensDetails", "AUDIO").unwrap_or(0);
        let cached_image = google_modality_count(usage, "cacheTokensDetails", "IMAGE").unwrap_or(0);
        let cached_video = google_modality_count(usage, "cacheTokensDetails", "VIDEO").unwrap_or(0);
        return ModalityTokens {
            audio_input: google_modality_count(usage, "promptTokensDetails", "AUDIO")
                .unwrap_or(0)
                .saturating_sub(cached_audio),
            image_input: google_modality_count(usage, "promptTokensDetails", "IMAGE")
                .unwrap_or(0)
                .saturating_sub(cached_image),
            video_input: google_modality_count(usage, "promptTokensDetails", "VIDEO")
                .unwrap_or(0)
                .saturating_sub(cached_video),
            audio_output: google_modality_count(usage, "candidatesTokensDetails", "AUDIO")
                .unwrap_or(0),
            image_output: google_modality_count(usage, "candidatesTokensDetails", "IMAGE")
                .unwrap_or(0),
        };
    }
    let reported_audio_input =
        detail_token_count(usage, INPUT_TOKEN_DETAIL_KEYS, &["audio_tokens"]).unwrap_or(0);
    let cached_audio = cached_modality_tokens(usage, "audio_tokens");
    let cached_image = cached_modality_tokens(usage, "image_tokens");
    let cached_video = cached_modality_tokens(usage, "video_tokens");
    ModalityTokens {
        audio_input: reported_audio_input.saturating_sub(cached_audio),
        image_input: detail_token_count(usage, INPUT_TOKEN_DETAIL_KEYS, &["image_tokens"])
            .unwrap_or(0)
            .saturating_sub(cached_image),
        video_input: detail_token_count(usage, INPUT_TOKEN_DETAIL_KEYS, &["video_tokens"])
            .unwrap_or(0)
            .saturating_sub(cached_video),
        audio_output: detail_token_count(usage, OUTPUT_TOKEN_DETAIL_KEYS, &["audio_tokens"])
            .unwrap_or(0),
        image_output: detail_token_count(usage, OUTPUT_TOKEN_DETAIL_KEYS, &["image_tokens"])
            .unwrap_or(0),
    }
}

/// 把缓存命中的令牌按模态拆成多条缓存读行。
///
/// `cached_tokens_details` 给出音频/图像/视频份额时，各模态单独成行并带上
/// `pricing_media_type`（目录的 `llm_cache_read_token` 按模态报不同价）；没有
/// 明细时整条记为 `text`。脏数据（模态份额之和大于总命中）按剩余量截断，绝不
/// 产出负数或超量行。
fn cache_read_lines(
    usage: &Value,
    cached_tokens: i64,
) -> Result<Vec<InvocationUsageLine>, InvocationError> {
    if cached_tokens <= 0 {
        return Ok(Vec::new());
    }
    let audio = cached_modality_tokens(usage, "audio_tokens").clamp(0, cached_tokens);
    let image = cached_modality_tokens(usage, "image_tokens").clamp(0, cached_tokens - audio);
    let video =
        cached_modality_tokens(usage, "video_tokens").clamp(0, cached_tokens - audio - image);
    let text = cached_tokens - audio - image - video;
    let mut lines = Vec::new();
    for (media_type, tokens) in [
        ("audio", audio),
        ("image", image),
        ("video", video),
        ("text", text),
    ] {
        if tokens <= 0 {
            continue;
        }
        lines.push(
            InvocationUsageLine::new(
                BillingMeter::LlmCacheReadToken,
                GatewayUsageQuantity::tokens(tokens)
                    .map_err(|error| usage_error(error.to_string()))?,
            )
            .with_pricing_media_type(media_type),
        );
    }
    Ok(lines)
}

/// 缓存命中的模态拆分（`cached_tokens_details.{audio,image,video}_tokens`）。
///
/// 缓存读费率可能按 `media_type` 分档（OpenAI realtime：text/audio/image 三个
/// 不同价格）。缓存读行必须带上自己的模态，否则同一批缓存令牌要么被折进输入
/// 按全价收，要么只能按单一模态价收。
fn cached_modality_tokens(usage: &Value, field: &str) -> i64 {
    INPUT_TOKEN_DETAIL_KEYS
        .iter()
        .filter_map(|key| usage.get(*key))
        .filter_map(|details| details.get("cached_tokens_details"))
        .find_map(|cached| integer_field(cached, &[field]))
        .unwrap_or(0)
}

/// 把**已定价**的模态令牌从文本行里拆出来。
///
/// 拆分必须以"目录为该模态给了报价"为前提：没有报价的模态行会落成 0 元事实
/// （与缓存缺价同源），而 0 元不触发任何告警。目录没价时令牌**留在文本行**按
/// 文本价结算——这是原有行为的下限，宁可少收也不能记 0。
///
/// 拆分量以现有可计费量为上限（`min`）：上游脏数据里 `audio_tokens` 可能大于
/// `prompt_tokens`，直接相减会得到负数计费量，负数量进账本比少收更难修。
fn split_priced_modalities(
    invocation: &Invocation,
    usage: &Value,
    billable_input: &mut i64,
    output_tokens: &mut i64,
) -> ModalityTokens {
    let reported = modality_tokens(usage);
    if reported.is_empty() || invocation.usage.pricing_quotes.is_empty() {
        return ModalityTokens::default();
    }
    let mut split = ModalityTokens::default();
    if reported.audio_input > 0
        && invocation
            .usage
            .quote_for_meter(&BillingMeter::AudioInputToken)
            .is_some()
    {
        split.audio_input = reported.audio_input.min(*billable_input);
        *billable_input -= split.audio_input;
    }
    if reported.image_input > 0
        && invocation
            .usage
            .quote_for_meter(&BillingMeter::ImageInputToken)
            .is_some()
    {
        split.image_input = reported.image_input.min(*billable_input);
        *billable_input -= split.image_input;
    }
    if reported.video_input > 0
        && invocation
            .usage
            .quote_for_meter(&BillingMeter::VideoInputToken)
            .is_some()
    {
        split.video_input = reported.video_input.min(*billable_input);
        *billable_input -= split.video_input;
    }
    if reported.audio_output > 0
        && invocation
            .usage
            .quote_for_meter(&BillingMeter::AudioOutputToken)
            .is_some()
    {
        split.audio_output = reported.audio_output.min(*output_tokens);
        *output_tokens -= split.audio_output;
    }
    if reported.image_output > 0
        && invocation
            .usage
            .quote_for_meter(&BillingMeter::ImageOutputToken)
            .is_some()
    {
        split.image_output = reported.image_output.min(*output_tokens);
        *output_tokens -= split.image_output;
    }
    if !split.is_empty() {
        tracing::info!(
            stage = "billing_usage_extraction",
            api_code = %invocation.resource.api_code,
            request_id = %invocation.request.request_id,
            audio_input = split.audio_input,
            image_input = split.image_input,
            video_input = split.video_input,
            audio_output = split.audio_output,
            image_output = split.image_output,
            "billing multimodal tokens on their own meters"
        );
    }
    split
}

/// 令牌计数在 `<x>_tokens_details` 里的嵌套形态：
/// OpenAI 把推理与缓存明细放在 `completion_tokens_details` /
/// `output_tokens_details` / `prompt_tokens_details` / `input_tokens_details`。
fn nested_token_details(usage: &Value, fields: &[&str]) -> Option<i64> {
    OUTPUT_TOKEN_DETAIL_KEYS
        .iter()
        .chain(INPUT_TOKEN_DETAIL_KEYS.iter())
        .filter_map(|key| usage.get(*key))
        .find_map(|details| integer_field(details, fields))
}

fn result_line(
    meter: &BillingMeter,
    invocation: &Invocation,
) -> Result<InvocationUsageLine, InvocationError> {
    let body = optional_response_body(invocation);
    let count = body
        .as_ref()
        .and_then(|body| {
            integer_field(body, &["result_count", "count"]).or_else(|| {
                body.get("usage")
                    .and_then(|usage| integer_field(usage, &["result_count", "count"]))
            })
        })
        .or_else(|| body.as_ref().and_then(present_result_array_length))
        // Image vendors answer with binary payloads when the caller asks for a
        // raw format; the request's `n` still states how many results were
        // produced.
        .or_else(|| request_result_count(invocation))
        .unwrap_or(1)
        .max(1);
    measured_line(meter, count.to_string())
}

/// 上游是否在 2xx 响应里明确报了业务失败。
///
/// 只认**无歧义**的失败词汇，避免把成功体误判：
///
/// * `error` 是非空对象/字符串（`null` 与 `{}` 不算）；
/// * `status` ∈ `failed/error/cancelled/expired`；
/// * MiniMax `base_resp.status_code != 0`；
/// * Kling / Vidu 的 `code != 0`（两家的官方成功码都是 0）。
///
/// 不按"任意非零 code"判断：部分兼容实现把 HTTP 状态塞进 `code`（如 200）。
fn provider_reported_business_failure(invocation: &Invocation) -> bool {
    let Some(body) = optional_response_body(invocation) else {
        return false;
    };
    if body.get("error").is_some_and(non_empty_error_value) {
        return true;
    }
    if let Some(status) = body.get("status").and_then(Value::as_str) {
        if matches!(
            status.trim().to_ascii_lowercase().as_str(),
            "failed" | "error" | "cancelled" | "canceled" | "expired"
        ) {
            return true;
        }
    }
    if body
        .get("base_resp")
        .and_then(|base| base.get("status_code"))
        .and_then(integer_like)
        .is_some_and(|code| code != 0)
    {
        return true;
    }
    // 部分上游把 code 写成字符串（`"1201"` / `"error"`）。数字串按数字比，
    // 失败词汇按失败处理；`"0"` / `"success"` 不会命中。
    if let Some(code) = body.get("code") {
        if integer_like(code).is_some_and(|code| code != 0)
            && matches!(
                invocation.resource.supplier_code.as_deref(),
                Some("kling") | Some("vidu")
            )
        {
            return true;
        }
        if code.as_str().is_some_and(|value| {
            matches!(
                value.trim().to_ascii_lowercase().as_str(),
                "error" | "failed" | "failure"
            )
        }) {
            return true;
        }
    }
    false
}

/// `error` 值是否真的携带失败信息。
///
/// 成功响应常见 `{"error": null}`，也可能带 schema 默认值
/// `{"error": {"code": "", "message": "", "type": ""}}`——后者对象非空但
/// 语义为空，不能据此 waive 正常产出。只有至少一个非空字段才算失败。
fn non_empty_error_value(error: &Value) -> bool {
    match error {
        Value::Null => false,
        Value::String(message) => !message.trim().is_empty(),
        Value::Object(object) => object.values().any(|value| match value {
            Value::Null => false,
            Value::String(text) => !text.trim().is_empty(),
            Value::Array(items) => !items.is_empty(),
            Value::Object(nested) => !nested.is_empty(),
            _ => true,
        }),
        Value::Array(items) => !items.is_empty(),
        _ => true,
    }
}

/// 数字或数字字符串。厂商对同一字段的类型并不统一。
fn integer_like(value: &Value) -> Option<i64> {
    value
        .as_i64()
        .or_else(|| value.as_str().and_then(|text| text.trim().parse().ok()))
}

/// 上游是否**明确**声明了零产出。
///
/// 只有"数组存在且为空"或"显式 `result_count/count == 0`"才算；字段缺失
/// （异步任务回执只有 task id）仍然回落到 1——那是一次真实的任务创建。
fn result_count_is_explicitly_zero(invocation: &Invocation) -> bool {
    let Some(body) = optional_response_body(invocation) else {
        return false;
    };
    let explicit = integer_field(&body, &["result_count", "count"]).or_else(|| {
        body.get("usage")
            .and_then(|usage| integer_field(usage, &["result_count", "count"]))
    });
    match explicit {
        Some(count) => count == 0,
        None => present_result_array_length(&body) == Some(0),
    }
}

/// 结果数组**存在**即以其长度为准（包含 0）。
///
/// 与 [`array_length_field`] 的差别只在空数组：上游明确回 `{"data": []}` 时产出
/// 是 0，此时再回落到请求里的 `n` 就是按"用户想生成 4 张"去收 4 张的钱。数组
/// **不存在**（上游根本没给这个键）才回落到请求声明。
fn present_result_array_length(body: &Value) -> Option<i64> {
    RESULT_ARRAYS.iter().find_map(|name| {
        body.get(*name)
            .and_then(Value::as_array)
            .map(|items| items.len() as i64)
    })
}

/// 请求声明的产出条数，含 Google 把数量塞进 `parameters` 的形态。
fn request_result_count(invocation: &Invocation) -> Option<i64> {
    let body = request_json(invocation)?;
    integer_field(body, REQUEST_RESULT_COUNT_FIELDS)
        .or_else(|| {
            body.get("parameters")
                .and_then(|parameters| integer_field(parameters, REQUEST_RESULT_COUNT_FIELDS))
        })
        .filter(|count| *count > 0)
}

fn item_line(
    meter: &BillingMeter,
    invocation: &Invocation,
) -> Result<InvocationUsageLine, InvocationError> {
    let body = optional_response_body(invocation);
    let count = body
        .as_ref()
        .and_then(|body| {
            let usage = body.get("usage").unwrap_or(body);
            integer_field(
                usage,
                &[
                    "item_count",
                    "document_count",
                    "documents_count",
                    "num_documents",
                    "searched_documents",
                ],
            )
        })
        // Rerank endpoints meter the documents submitted for ranking. Vendors
        // return a truncated `results`/`data` array whenever `top_n` is set, so
        // the request's document array is the authoritative billable quantity
        // whenever the response does not state one explicitly.
        .or_else(|| request_array_length_field(invocation, RERANK_REQUEST_ARRAYS))
        .or_else(|| {
            body.as_ref()
                .and_then(|body| array_length_field(body, RESULT_ARRAYS))
        })
        .or_else(|| {
            body.as_ref()
                .and_then(|body| integer_field(body, &["count"]))
        })
        .unwrap_or(1)
        .max(1);
    measured_line(meter, count.to_string())
}

/// Character metering (text-to-speech).
///
/// TTS responses are binary audio streams, so the response body can never
/// carry the billed quantity. The industry-standard unit is the number of
/// characters in the text the caller asked to synthesize, which lives in the
/// request body as `input` (OpenAI / Azure / MiniMax) or `text` (ElevenLabs /
/// Fish Audio). Vendors that do report a character count still win.
fn character_line(
    meter: &BillingMeter,
    invocation: &Invocation,
) -> Result<InvocationUsageLine, InvocationError> {
    let reported = optional_response_body(invocation)
        .as_ref()
        .map(|body| body.get("usage").unwrap_or(body))
        .and_then(|usage| {
            integer_field(
                usage,
                &[
                    "character_count",
                    "characters",
                    "input_characters",
                    "input_character_count",
                    "characterCount",
                ],
            )
        });
    let count = match reported {
        Some(count) if count > 0 => count,
        _ => match request_character_count(invocation) {
            Some(count) => count,
            None => {
                tracing::warn!(
                    meter = %meter.code(),
                    "character-metered response reported no character count and the request \
                     carried no synthesizable text; falling back to a single character"
                );
                1
            }
        },
    };
    measured_line(meter, count.to_string())
}

/// Seconds metering (speech-to-text, music).
///
/// OpenAI reports the recognized audio length as `duration` and only on
/// `verbose_json` responses; a default `json` (or `text`/`srt`/`vtt`) response
/// carries no duration at all. Vendor adapters use the longer spellings. When
/// nothing measurable is present the call is billed a single unit rather than
/// aborting settlement — the alternative leaves a served request unmetered.
fn audio_line(
    meter: &BillingMeter,
    invocation: &Invocation,
) -> Result<InvocationUsageLine, InvocationError> {
    // Response first (it states what was actually produced), then the request
    // (music vendors take a `duration`/`seconds` hint), then a single unit so a
    // served call is never left unmetered.
    let quantity = reported_audio_seconds(invocation)
        .or_else(|| request_seconds_field(invocation, AUDIO_SECOND_FIELDS));
    let quantity = match quantity {
        Some(quantity) => duration_in_meter_unit(meter, quantity)?,
        None => {
            // 兜底值必须落在**计量单位自己的量级**上。分钟档若按 1"秒"兜底
            // 会变成 1/60 分钟：一段 30 分钟的转录一旦响应不是 JSON（OpenAI
            // STT 的 `response_format: "text"` 就是纯文本），就只收 0.0167
            // 分钟——比真实用量少收三个数量级。按 1 **分钟**兜底等于用行业
            // 通行的"最小计费单位"兜底，方向安全（宁可少收也不放走整段音频）。
            let fallback = fallback_duration_seconds(meter);
            tracing::warn!(
                meter = %meter.code(),
                fallback_seconds = fallback,
                "audio-metered response reported no duration and requested none; falling back \
                 to the meter's minimum billable unit"
            );
            duration_in_meter_unit(meter, fallback.to_owned())?
        }
    };
    measured_line(meter, quantity)
}

/// 量不到时长时的兜底秒数：分钟档 60 秒（= 1 分钟，最小计费单位），
/// 其余 1 秒。
fn fallback_duration_seconds(meter: &BillingMeter) -> &'static str {
    match meter {
        BillingMeter::AudioInputMinute
        | BillingMeter::AudioOutputMinute
        | BillingMeter::SttAudioMinute => "60",
        _ => "1",
    }
}

/// Billable audio seconds the provider reported, normalised to **seconds**.
///
/// Three shapes are in production and all three are billable output:
///
/// * top level — `{"duration": 12.5}` (OpenAI `verbose_json` transcription);
/// * nested extras — `{"extra_info": {"music_duration": 30000}}` (MiniMax);
/// * one entry per generated clip — `{"data": [{"duration": 118.4}, ...]}`
///   (Suno). The billable quantity there is the **sum**: the customer received
///   every clip, so billing one clip's length under-collects by the clip count.
///
/// Milliseconds are a separate spelling on purpose. MiniMax reports
/// `music_duration` in ms; reading 30000 as seconds would bill eight hours for
/// a 30-second track.
fn reported_audio_seconds(invocation: &Invocation) -> Option<String> {
    let body = optional_response_body(invocation)?;
    nested_media_seconds(&body, AUDIO_SECOND_FIELDS).or_else(|| summed_item_seconds(&body))
}

/// 在响应体里按 **0 / 1 / 2 层**深度找时长。
///
/// 契约里三种真实形状都有：
/// * 0 层 —— `{"duration": 12.5}`；
/// * 1 层 —— `{"extra_info": {"music_duration": 30000}}`、`{"usage": {"duration": 9}}`；
/// * 2 层 —— MiniMax 音乐的**官方**形状是
///   `{"data": {"extra_info": {"music_duration": 30000}}}`（见契约
///   `MiniMaxMusicGenerationResponse.data.extra_info`）。
///
/// 只扫一层的实现在 MiniMax 面读不到时长 ⇒ 一首 30 秒的曲子只收 1 秒。
pub(super) fn nested_media_seconds(value: &Value, names: &[&str]) -> Option<String> {
    if let Some(seconds) = seconds_field(value, names).or_else(|| milliseconds_as_seconds(value)) {
        return Some(seconds);
    }
    MEDIA_CONTAINER_KEYS
        .iter()
        .filter_map(|key| value.get(*key))
        .find_map(|container| {
            // 第二层：`data.extra_info.duration` 这类。
            seconds_field(container, names)
                .or_else(|| milliseconds_as_seconds(container))
                .or_else(|| {
                    MEDIA_CONTAINER_KEYS
                        .iter()
                        .filter_map(|key| container.get(*key))
                        .find_map(|inner| {
                            seconds_field(inner, names).or_else(|| milliseconds_as_seconds(inner))
                        })
                })
        })
}

/// Reads a duration a vendor reported in **milliseconds** and returns seconds.
pub(super) fn milliseconds_as_seconds(value: &Value) -> Option<String> {
    let milliseconds = number_field_as_string(value, MILLISECOND_DURATION_FIELDS)?;
    let milliseconds = DecimalValue::parse(&milliseconds).ok()?;
    if milliseconds <= DecimalValue::ZERO {
        return None;
    }
    milliseconds
        .divide_i64(1000)
        .ok()
        .map(|seconds| seconds.to_fixed_string(12))
}

/// Sums the durations of every generated clip in the first media array that
/// carries them (`data[].duration`, `clips[].duration`, ...).
fn summed_item_seconds(body: &Value) -> Option<String> {
    for key in MEDIA_ITEM_ARRAYS {
        let Some(items) = body.get(*key).and_then(Value::as_array) else {
            continue;
        };
        let mut total = DecimalValue::ZERO;
        let mut found = false;
        for item in items {
            // Suno nests the length under `metadata` on some responses.
            let seconds = seconds_field(item, AUDIO_SECOND_FIELDS)
                .or_else(|| milliseconds_as_seconds(item))
                .or_else(|| {
                    item.get("metadata").and_then(|metadata| {
                        seconds_field(metadata, AUDIO_SECOND_FIELDS)
                            .or_else(|| milliseconds_as_seconds(metadata))
                    })
                });
            let Some(seconds) = seconds else {
                continue;
            };
            let Ok(seconds) = DecimalValue::parse(&seconds) else {
                continue;
            };
            let Ok(sum) = total.checked_add(seconds) else {
                continue;
            };
            total = sum;
            found = true;
        }
        if found && total > DecimalValue::ZERO {
            return Some(total.to_fixed_string(12));
        }
    }
    None
}

/// 把从供应商响应里抽出的**秒**换算成计量单位要求的数量。
///
/// 供应商的时长字段一律是秒，而 sdkwork-models 目录的时长类计量单位分秒与
/// 分钟两档（`audio_output_minute` / `stt_audio_minute` 按分钟计价，
/// `unit_size = 1` 即"每 1 分钟"）。若不换算，分钟档会按秒的数量乘以分钟单
/// 价，实收 60 倍。计费域同样按"数量即计量单位本身的量"处理
/// （`GatewayUsageQuantity::audio_minutes` 把分钟换算成秒另行存档）。
fn duration_in_meter_unit(
    meter: &BillingMeter,
    seconds: String,
) -> Result<String, InvocationError> {
    if !matches!(
        meter,
        BillingMeter::AudioInputMinute
            | BillingMeter::AudioOutputMinute
            | BillingMeter::SttAudioMinute
    ) {
        return Ok(seconds);
    }
    let seconds = DecimalValue::parse(&seconds).map_err(|error| usage_error(error.to_string()))?;
    let minutes = seconds
        .divide_i64(60)
        .map_err(|error| usage_error(error.to_string()))?;
    Ok(minutes.to_fixed_string(12))
}

fn video_line(
    meter: &BillingMeter,
    invocation: &Invocation,
) -> Result<InvocationUsageLine, InvocationError> {
    let reported = optional_response_body(invocation)
        .as_ref()
        .map(|body| body.get("usage").unwrap_or(body))
        .and_then(|usage| seconds_field(usage, VIDEO_SECOND_FIELDS));
    // A generation call answers with a job object *before* any video exists, so
    // the response usually carries no duration. The request states what was
    // ordered (`seconds` on the OpenAI video face, `duration` on vendor bodies);
    // billing one second for a ten-second render undercharges the relay by an
    // order of magnitude, so the requested duration is the fallback, and only a
    // request that states none falls back to a single second.
    let requested = request_seconds_field(invocation, VIDEO_SECOND_FIELDS);
    let quantity = match reported.or(requested) {
        Some(quantity) => quantity,
        None => {
            tracing::warn!(
                meter = %meter.code(),
                "video-metered call reported no duration and requested none; falling back to a single second"
            );
            "1".to_owned()
        }
    };
    measured_line(meter, quantity)
}

/// One storage day for a file/object, using the vendor-reported byte count.
/// `usage_bytes` is the OpenAI vector-store file field; `bytes`/`size_bytes`
/// cover the object-storage shapes. The first day is prepaid at ingestion;
/// a recurring daily worker is a separate follow-up for long-lived files.
///
/// The byte count is **required** on a storage-metered route. Defaulting a
/// missing field to `0` is indistinguishable from a legitimately empty file,
/// so an upstream shape change would silently turn paid storage into a free
/// ingestion. A missing measurement surfaces as an accounting failure instead;
/// an explicit `0` is returned as `None` and waived (nothing to charge).
fn storage_line(
    meter: &BillingMeter,
    invocation: &Invocation,
) -> Result<Option<InvocationUsageLine>, InvocationError> {
    let body = response_body(invocation)?;
    let bytes = integer_field(&body, &["usage_bytes", "bytes", "size_bytes"])
        .ok_or_else(|| {
            usage_error(format!(
                "storage-metered {} response carried no usage_bytes/bytes/size_bytes field",
                invocation.resource.api_code
            ))
        })?
        .max(0);
    if bytes == 0 {
        return Ok(None);
    }
    let gb = DecimalValue::parse(&bytes.to_string())
        .map_err(|error| usage_error(error.to_string()))?
        .checked_divide(
            DecimalValue::parse("1000000000").map_err(|error| usage_error(error.to_string()))?,
        )
        .map_err(|error| usage_error(error.to_string()))?;
    let quantity = GatewayUsageQuantity::for_meter(meter.clone(), gb.to_fixed_string(12))
        .map_err(|error| usage_error(error.to_string()))?;
    Ok(Some(InvocationUsageLine::new(meter.clone(), quantity)))
}

fn generic_line(
    meter: &BillingMeter,
    invocation: &Invocation,
) -> Result<InvocationUsageLine, InvocationError> {
    let quantity = optional_response_body(invocation)
        .as_ref()
        .map(|body| body.get("usage").unwrap_or(body))
        .and_then(|usage| {
            text_field(usage, &["quantity", "billable_quantity", "count"]).or_else(|| {
                number_field_as_string(usage, &["quantity", "billable_quantity", "count"])
            })
        })
        .unwrap_or_else(|| "1".to_owned());
    measured_line(meter, quantity)
}

/// 一次请求产出多个结果时，结果数组可能在哪些字段名下。
///
/// 🔴 `predictions` / `creations` 不是凑数加上去的：它们分别来自**已发布契约**的
/// `GeminiImageGenerationResponse.predictions` 与 `ViduImageGenerationTask.creations`
/// / `ViduVideoGenerationTask.creations`。缺这两项时 Google Imagen 要 4 张、Vidu
/// 要 2 张都只收 1 张——与 2.7 同类的"形态对、数量恒为 1"事故。
///
/// ⚠️ 别把 `content` 加进来：`VolcengineContentGenerationTask.content` 是任务的内容
/// 分段（提示词/参考图），不是产出条数。
const RESULT_ARRAYS: &[&str] = &[
    "data",
    "results",
    "images",
    "items",
    "videos",
    "predictions",
    "creations",
];
/// 请求里"要几张 / 几条"的字段名。
///
/// Google 的 Imagen 把数量放在 `parameters.sampleCount`（
/// `GeminiImageGenerationRequest.parameters` 是自由对象），只查扁平 `n` 的实现
/// 在 Gemini 面恒收 1 张。
const REQUEST_RESULT_COUNT_FIELDS: &[&str] = &[
    "n",
    "count",
    "sampleCount",
    "numberOfImages",
    "number_of_images",
    "num_images",
];
const RERANK_REQUEST_ARRAYS: &[&str] = &["documents", "texts", "passages", "inputs"];
pub(super) const AUDIO_SECOND_FIELDS: &[&str] = &[
    "duration",
    "audio_seconds",
    "duration_seconds",
    "audio_duration",
    "seconds",
];
pub(super) const VIDEO_SECOND_FIELDS: &[&str] = &[
    "duration",
    "video_seconds",
    "duration_seconds",
    "video_duration",
    "seconds",
];
/// Duration spellings a vendor reports in **milliseconds** (MiniMax music,
/// several aggregators). Never mix these into the second-field lists: 30000 ms
/// read as seconds is 8 hours.
const MILLISECOND_DURATION_FIELDS: &[&str] = &[
    "duration_ms",
    "duration_milliseconds",
    "audio_duration_ms",
    "music_duration",
];
/// Response objects that nest the measured quantity one level down instead of
/// exposing it at the top (`{"extra_info":{"music_duration":30000}}`,
/// `{"usage":{"duration":12.5}}`, `{"metadata":{"duration":118}}`).
pub(super) const MEDIA_CONTAINER_KEYS: &[&str] = &[
    "usage",
    "extra_info",
    "extraInfo",
    "metadata",
    "result",
    "audio",
    // `data` 在 OpenAI 图像面是**数组**（`data[]`，由 `MEDIA_ITEM_ARRAYS`
    // 处理），在 MiniMax 音乐面是**对象**（`data.extra_info.music_duration`）。
    // 两处都要能进去：这里只处理对象形态，数组形态查不到键会自然跳过。
    "data",
    "output",
];
/// Arrays where **each element is one produced artifact** carrying its own
/// duration (Suno clips, MiniMax songs, video task lists).
const MEDIA_ITEM_ARRAYS: &[&str] = &[
    "data", "clips", "songs", "audios", "tracks", "videos", "items",
];

fn measured_line(
    meter: &BillingMeter,
    quantity: impl AsRef<str>,
) -> Result<InvocationUsageLine, InvocationError> {
    Ok(InvocationUsageLine::new(
        meter.clone(),
        GatewayUsageQuantity::for_meter(meter.clone(), quantity)
            .map_err(|error| usage_error(error.to_string()))?,
    ))
}

/// Provider body for meters whose payload is not guaranteed to be JSON.
/// Returns `None` instead of failing so callers can fall back to the request
/// body or to a single unit instead of aborting the settlement chain.
fn optional_response_body(invocation: &Invocation) -> Option<Value> {
    response_body(invocation).ok()
}

fn request_json(invocation: &Invocation) -> Option<&Value> {
    match invocation.request.body {
        InvocationBody::Json(ref value) => Some(value),
        _ => None,
    }
}

fn request_array_length_field(invocation: &Invocation, names: &[&str]) -> Option<i64> {
    request_json(invocation).and_then(|body| array_length_field(body, names))
}

/// Number of characters in the request's synthesizable text. Empty text is
/// reported as `None` so callers can distinguish "no text" from "empty text".
///
/// Two request shapes reach a TTS route: the OpenAI/Anthropic spelling
/// (`{"input": "..."}` / `{"text": "..."}`) and the Ark spelling, which wraps
/// the prompt in an object (`{"input": {"text": "..."}}`). Reading only the flat
/// spelling billed an Ark synthesis of a 200-character sentence as **one**
/// character.
fn request_character_count(invocation: &Invocation) -> Option<i64> {
    request_json(invocation).and_then(character_count_in)
}

/// 请求体里可合成文本的字符数（`request_character_count` 的纯函数版本，
/// 供预扣估算复用同一套字段语义）。
pub(super) fn character_count_in(body: &Value) -> Option<i64> {
    ["input", "text"].iter().find_map(|name| {
        let value = body.get(*name)?;
        let text = value
            .as_str()
            .or_else(|| value.get("text").and_then(Value::as_str))?;
        let count = text.chars().count() as i64;
        (count > 0).then_some(count)
    })
}

fn array_length_field(value: &Value, names: &[&str]) -> Option<i64> {
    names.iter().find_map(|name| {
        value
            .get(*name)
            .and_then(Value::as_array)
            .map(|items| items.len() as i64)
            .filter(|count| *count > 0)
    })
}

/// Seconds stated by the *request*. Vendors disagree on the type of the field —
/// the OpenAI video face sends `"seconds": "8"` (a string enum) while vendor
/// bodies send `"duration": 8` — so both spellings and both JSON types are
/// accepted, and the value has to parse as a positive number.
fn request_seconds_field(invocation: &Invocation, names: &[&str]) -> Option<String> {
    request_json(invocation).and_then(|body| seconds_field(body, names))
}

pub(super) fn seconds_field(value: &Value, names: &[&str]) -> Option<String> {
    number_field_as_string(value, names)
        // Some adapters stringify the duration.
        .or_else(|| text_field(value, names))
        .filter(|seconds| seconds.trim().parse::<f64>().is_ok_and(|value| value > 0.0))
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
        // `usage` covers OpenAI/Anthropic, `usageMetadata` covers Gemini. Only
        // checking `usage` meant a Gemini stream that reached this fallback
        // produced no lines at all, and an empty line set reads downstream as
        // "nothing billable" rather than as a metering fault.
        return Ok(
            (body.get("usage").is_some() || body.get("usageMetadata").is_some())
                .then(|| body.clone()),
        );
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
            // Realtime 的 `response.done` 用**单数** `input_token_details`
            // 装缓存命中与模态明细；只认复数形态时，实时会话的缓存读一个都
            // 读不到 ⇒ 命中段按全价输入收（缓存价通常只有 0.1–0.5×）。
            INPUT_TOKEN_DETAIL_KEYS
                .iter()
                .filter_map(|key| usage.get(*key))
                .find_map(|details| integer_field(details, &["cached_tokens"]))
        })
}

/// Normalizes miss-only cached reporting: when the provider reports more
/// cached tokens than prompt tokens, `prompt_tokens` only covers the cache
/// misses, so the inclusive prompt total is `prompt + cached`. Provider
/// frames are untrusted input, so the sum saturates instead of overflowing.
fn normalized_input_tokens(input_tokens: i64, cached_tokens: i64) -> i64 {
    if cached_tokens > input_tokens {
        input_tokens.saturating_add(cached_tokens)
    } else {
        input_tokens
    }
}

pub(super) fn integer_field(value: &Value, names: &[&str]) -> Option<i64> {
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
        anthropic_web_search_count, augment_missing_prompt_tokens, cached_tokens,
        composite_usage_components, normalized_input_tokens, token_line, tool_call_counts,
        InvocationBody, StreamingUsageAccumulator, StreamingUsageFormat,
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
    fn streaming_fallback_estimates_missing_input_tokens() {
        let request = InvocationBody::json(json!({
            "model": "gpt-4o",
            "messages": [{"role": "user", "content": "hello world, this is a long prompt"}]
        }));
        let body = json!({"usage": {"prompt_tokens": 0, "completion_tokens": 5}});
        let augmented =
            augment_missing_prompt_tokens(&request, &body).expect("missing input is augmented");
        let prompt = augmented
            .pointer("/usage/prompt_tokens")
            .and_then(Value::as_i64)
            .expect("prompt tokens");
        assert!(prompt > 0, "estimated input must be positive");
        assert_eq!(
            Some(5),
            augmented
                .pointer("/usage/completion_tokens")
                .and_then(Value::as_i64)
        );
    }

    #[test]
    fn streaming_real_input_tokens_are_preserved() {
        let request = InvocationBody::json(json!({"model": "gpt-4o", "messages": []}));
        let body = json!({"usage": {"prompt_tokens": 42, "completion_tokens": 5}});
        assert!(
            augment_missing_prompt_tokens(&request, &body).is_none(),
            "provider-reported input tokens must never be overwritten"
        );
    }

    #[test]
    fn streaming_anthropic_input_field_is_filled_instead_of_prompt_tokens() {
        let request = InvocationBody::json(json!({"model": "claude", "messages": []}));
        let body = json!({"usage": {"input_tokens": 0, "output_tokens": 5}});
        let augmented = augment_missing_prompt_tokens(&request, &body).expect("augmented");
        assert!(augmented
            .pointer("/usage/input_tokens")
            .and_then(Value::as_i64)
            .is_some_and(|count| count > 0));
        assert!(
            augmented.pointer("/usage/prompt_tokens").is_none(),
            "Anthropic shape keeps its own field"
        );
    }

    #[test]
    fn tool_call_counts_reads_responses_output_items() {
        let body = json!({
            "output": [
                {"type": "web_search_call"},
                {"type": "file_search_call"},
                {"type": "code_interpreter_call"},
                {"type": "code_interpreter_call"},
                {"type": "message"},
                {"type": "web_search_call"}
            ]
        });
        let counts = tool_call_counts(&body);
        assert_eq!((BillingMeter::WebSearchCall, 2), counts[0]);
        assert_eq!((BillingMeter::FileSearchCall, 1), counts[1]);
        assert_eq!((BillingMeter::CodeInterpreterSession, 1), counts[2]);
        assert_eq!(
            2,
            anthropic_web_search_count(&json!({
                "usage": {"server_tool_use": {"web_search_requests": 2}}
            }))
        );
    }

    #[test]
    fn streaming_usage_accumulator_counts_hosted_tool_calls() {
        let mut accumulator =
            StreamingUsageAccumulator::new(StreamingUsageFormat::ServerSentEvents);
        accumulator
            .observe(
                b"data: {\"type\":\"response.output_item.done\",\"item\":{\"type\":\"web_search_call\"}}\n\n",
            )
            .unwrap();
        accumulator
            .observe(
                b"data: {\"type\":\"response.output_item.done\",\"item\":{\"type\":\"file_search_call\"}}\n\n",
            )
            .unwrap();
        accumulator
            .observe(
                b"data: {\"type\":\"response.output_item.done\",\"item\":{\"type\":\"code_interpreter_call\"}}\n\n",
            )
            .unwrap();
        accumulator
            .observe(
                b"data: {\"type\":\"response.output_item.done\",\"item\":{\"type\":\"code_interpreter_call\"}}\n\n",
            )
            .unwrap();
        accumulator
            .observe(
                b"data: {\"type\":\"response.completed\",\"response\":{\"usage\":{\"input_tokens\":10,\"output_tokens\":5}}}\n\n",
            )
            .unwrap();

        let body = accumulator.finish().unwrap().unwrap();
        let output = body
            .get("output")
            .and_then(Value::as_array)
            .expect("synthetic output array");
        assert_eq!(3, output.len(), "two code cells collapse to one session");
        assert_eq!(
            1,
            output
                .iter()
                .filter(|item| item.get("type").and_then(Value::as_str)
                    == Some("code_interpreter_call"))
                .count()
        );
        assert_eq!(
            Some(10),
            body.pointer("/usage/input_tokens").and_then(Value::as_i64)
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
        assert_eq!(
            Some(34),
            usage
                .pointer("/usage/completion_tokens")
                .and_then(|v| v.as_i64())
        );
        assert_eq!(
            Some(12),
            usage
                .pointer("/usage/prompt_tokens")
                .and_then(|v| v.as_i64())
        );
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
        assert_eq!(
            Some(3),
            usage
                .pointer("/usage/completion_tokens")
                .and_then(|v| v.as_i64())
        );
        assert_eq!(
            Some(0),
            usage
                .pointer("/usage/prompt_tokens")
                .and_then(|v| v.as_i64())
        );
    }

    #[test]
    fn partial_usage_is_none_for_a_stream_that_produced_nothing() {
        let mut accumulator =
            StreamingUsageAccumulator::new(StreamingUsageFormat::ServerSentEvents);
        accumulator
            .observe(b"data: {\"choices\":[{\"delta\":{}}]}\n\n")
            .unwrap();
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
            usage
                .pointer("/usage/input_tokens")
                .and_then(|v| v.as_i64())
        );
        assert_eq!(
            Some(15126),
            usage
                .pointer("/usage/cache_read_input_tokens")
                .and_then(|v| v.as_i64())
        );
        assert_eq!(
            Some(42),
            usage
                .pointer("/usage/output_tokens")
                .and_then(|v| v.as_i64())
        );
    }

    #[test]
    fn assistants_streaming_terminal_event_bills_prompt_and_completion_tokens() {
        // Assistants 的流式事件把 Run 对象放在 `data` 里，usage 只在终态
        // `thread.run.completed` 出现。此前抽取器只认顶层 / `message` /
        // `response`，整条流的 prompt token 会被丢掉，只剩文本估算。
        let mut accumulator =
            StreamingUsageAccumulator::new(StreamingUsageFormat::ServerSentEvents);
        accumulator
            .observe(
                b"event: thread.run.created\n\
                  data: {\"id\":\"run_1\",\"object\":\"thread.run\",\"status\":\"queued\"}\n\n\
                  event: thread.message.delta\n\
                  data: {\"id\":\"msg_1\",\"object\":\"thread.message.delta\"}\n\n\
                  event: thread.run.completed\n\
                  data: {\"id\":\"run_1\",\"object\":\"thread.run\",\"status\":\"completed\",\
                  \"usage\":{\"prompt_tokens\":100,\"completion_tokens\":20,\"total_tokens\":120}}\n\n",
            )
            .unwrap();

        let usage = accumulator.finish().unwrap().expect("terminal run usage");
        assert_eq!(
            Some(100),
            usage
                .pointer("/usage/prompt_tokens")
                .and_then(|v| v.as_i64())
        );
        assert_eq!(
            Some(20),
            usage
                .pointer("/usage/completion_tokens")
                .and_then(|v| v.as_i64())
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
            usage
                .pointer("/usage/input_tokens")
                .and_then(|v| v.as_i64())
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
            usage
                .pointer("/usageMetadata/promptTokenCount")
                .and_then(|v| v.as_i64())
        );
        assert_eq!(
            Some(33),
            usage
                .pointer("/usageMetadata/candidatesTokenCount")
                .and_then(|v| v.as_i64())
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
        assert_eq!(
            Some(12),
            usage
                .pointer("/usage/prompt_tokens")
                .and_then(|v| v.as_i64())
        );
        assert_eq!(
            Some(34),
            usage
                .pointer("/usage/completion_tokens")
                .and_then(|v| v.as_i64())
        );
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
        let error = token_line(
            &BillingMeter::EmbeddingInputToken,
            &json!({ "embedding": [] }),
        )
        .expect_err("missing usage must fail");
        assert!(error.to_string().contains("missing token count"));
    }
}
