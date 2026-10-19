//! 逐入口 token 家族回归：**流式（SSE）**这一半。
//!
//! 非流式的 token 家族已由 `billing_quantity_families` / `openapi_billing_matrix`
//! 锁住形态与数量；流式是另一条完全不同的取数路径：
//!
//! ```text
//! 请求体 stream:true ──► PayloadExtraction ⇒ InvocationShape::SseStream
//!                                │
//!                                ▼
//!                     BillingPolicy ⇒ Composite + StreamingAccumulator
//!                                │
//! 传输层逐帧 observe ────────────►│ StreamingUsageAccumulator
//! EOF finish() ─────────────────►│ merged usage body
//!                                ▼
//!                   record_streaming_usage_body ⇒ 用量行
//! ```
//!
//! 这条链路上每个厂商的"usage 在哪一帧、长什么样"都不同，家族级用例证明不了
//! 接口级正确。这里逐入口喂**契约里的真实帧序列**：
//!
//! * OpenAI：usage 只在最后一帧（且需要 `stream_options.include_usage`），中间帧
//!   的 `usage` 是 `null`；
//! * Anthropic：input 在 `message_start` 的 `message.usage` 里，output 在
//!   `message_delta.usage` 里——**分两帧**，任何"最后一帧覆盖"的实现都会丢掉 input；
//! * Gemini：`usageMetadata` 每帧**累计**，`thoughtsTokenCount` 要计入输出。
//!
//! 另有一条商业底线：流到 EOF 却没见到 usage 帧时**不得整条免单**——客户端已经
//! 完整收到响应，累加器手里有按观测文本估出的下界，用它结算才是可修正的选择。

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    AccountBillingMode, AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor,
    BillingQuantitySource, Invocation, InvocationAccount, InvocationBody,
    InvocationClassificationRequest, InvocationDispatch, InvocationDispatchResponse,
    InvocationInterceptor, InvocationRequest, InvocationResourceClassifier, InvocationShape,
    InvocationSubject, OpenAiResourceClassifier, PayloadExtractionInterceptor,
    ProviderNativeResourceClassifier, StreamingUsageAccumulator, StreamingUsageFormat,
    UsageExtractionInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::ProviderAuthProfile;
use serde_json::{json, Value};

const ACCOUNT_GROUP_ID: i64 = 10;

fn subject() -> InvocationSubject {
    InvocationSubject::from_api_key_context(AuthenticatedApiKeyContext {
        tenant_id: 10,
        organization_id: 20,
        user_id: 30,
        api_key_id: 100,
        api_key_name_snapshot: "Test key".to_owned(),
        group_id: ACCOUNT_GROUP_ID,
        group_code: "standard-group".to_owned(),
        pricing_plan_code: "standard".to_owned(),
    })
}

fn vendor_prefix(path: &str) -> Option<(&str, String)> {
    let (head, tail) = path.trim_start_matches('/').split_once('/')?;
    if head == "v1" || head.starts_with("v1beta") {
        return None;
    }
    Some((head, format!("/{tail}")))
}

/// 按生产顺序走完 `payload` → `billing_policy`：请求体里的 `stream:true` 必须先
/// 把调用形状定成 `SseStream`，计费策略才会选到 `StreamingAccumulator`。
async fn entrypoint(method: Method, path: &str, body: Value) -> Invocation {
    let classification = if path == "/v1" || path.starts_with("/v1/") {
        OpenAiResourceClassifier
            .classify(&InvocationClassificationRequest::new(method.clone(), path))
    } else {
        let (vendor, rest) = vendor_prefix(path).expect("vendor-prefixed path");
        ProviderNativeResourceClassifier.classify(
            &InvocationClassificationRequest::new(method.clone(), rest).with_supplier_code(vendor),
        )
    }
    .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    let supplier_code = resource
        .supplier_code
        .clone()
        .unwrap_or_else(|| "vendor".to_owned());
    let mut invocation = Invocation::new(
        InvocationRequest::new(method, path)
            .with_request_id("token-entrypoint")
            .with_body(InvocationBody::json(body)),
        subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation.account = Some(InvocationAccount {
        supplier_code,
        account_id: 3001,
        region_code: "global".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some("https://vendor.example".to_owned()),
        secret_ref: None,
        auth_profile: ProviderAuthProfile::default(),
        timeout_ms: None,
        retry_policy: None,
        provider_model: None,
        billing_mode: AccountBillingMode::Prepay,
        account_group_id: Some(ACCOUNT_GROUP_ID),
        account_group_code: Some("standard-group".to_owned()),
        pricing_plan_code: Some("standard".to_owned()),
    });
    PayloadExtractionInterceptor
        .before(&mut invocation)
        .await
        .expect("payload extraction");
    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");
    invocation
}

fn accumulate(frames: &str) -> (Option<Value>, Option<Value>) {
    accumulate_as(StreamingUsageFormat::ServerSentEvents, frames)
}

/// `format` 必须与传输层按 content-type 选出来的那个一致：SSE 用
/// `ServerSentEvents`、NDJSON 用 `Ndjson`、Gemini 契约里的分块 JSON 数组
/// （`application/json`）用 `JsonArray`。选错格式一个用量字段都读不到。
fn accumulate_as(format: StreamingUsageFormat, frames: &str) -> (Option<Value>, Option<Value>) {
    // EOF 路径：传输层对每一帧 observe，读到 EOF 时 finish。
    let mut eof = StreamingUsageAccumulator::new(format);
    eof.observe(frames.as_bytes()).expect("observe frames");
    let eof_body = eof.finish().expect("finish stream");

    // 中断路径（超时/取消/上游断开）：观察过的帧已经产生上游成本。
    let mut partial = StreamingUsageAccumulator::new(format);
    partial.observe(frames.as_bytes()).expect("observe frames");
    let partial_body = partial.partial_usage_body();
    (eof_body, partial_body)
}

async fn billed_lines(invocation: &mut Invocation, usage_body: Value) -> Vec<(String, String)> {
    let api_code = invocation.resource.api_code.clone();
    invocation.dispatch.response = Some(InvocationDispatchResponse::json(200, usage_body));
    UsageExtractionInterceptor
        .after(invocation)
        .await
        .unwrap_or_else(|error| panic!("{api_code} streaming usage extraction failed: {error}"));
    invocation
        .usage
        .lines
        .iter()
        .map(|line| {
            (
                line.meter.code().to_owned(),
                line.quantity.billable_quantity.clone(),
            )
        })
        .collect()
}

/// 流式入口结算出的用量行，按 `(meter, quantity)` 排序后返回。
async fn streamed_lines(
    method: Method,
    path: &str,
    request: Value,
    frames: &str,
) -> Vec<(String, String)> {
    streamed_lines_as(
        StreamingUsageFormat::ServerSentEvents,
        method,
        path,
        request,
        frames,
    )
    .await
}

async fn streamed_lines_as(
    format: StreamingUsageFormat,
    method: Method,
    path: &str,
    request: Value,
    frames: &str,
) -> Vec<(String, String)> {
    let mut invocation = entrypoint(method, path, request).await;
    let (usage_body, _) = accumulate_as(format, frames);
    let Some(usage_body) = usage_body else {
        panic!(
            "{} stream ended without a provider usage frame",
            invocation.resource.api_code
        );
    };
    let mut lines = billed_lines(&mut invocation, usage_body).await;
    lines.sort();
    lines
}

fn owned(entries: &[(&str, &str)]) -> Vec<(String, String)> {
    let mut lines: Vec<(String, String)> = entries
        .iter()
        .map(|(meter, quantity)| ((*meter).to_owned(), (*quantity).to_owned()))
        .collect();
    lines.sort();
    lines
}

// ------------------------------------------------------------ 流式策略的接线

/// `stream: true` 必须在**派发之前**就把计费选到 `StreamingAccumulator`。
///
/// 这条不变式看着琐碎，却最容易误判：跳过 `PayloadExtractionInterceptor` 直接
/// 喂一段 SSE 文本，计费策略会留在非流式的 `Composite`，随后把 SSE 文本当 JSON
/// 解析而报 `usage_failed`——看起来像"流式计费坏了"，实际是测试没走真实链路。
#[tokio::test]
async fn a_streaming_request_is_priced_as_a_stream_before_dispatch() {
    for (path, body) in [
        (
            "/v1/chat/completions",
            json!({"model": "gpt-4o", "stream": true, "messages": [{"role": "user", "content": "hi"}]}),
        ),
        (
            "/anthropic/v1/messages",
            json!({"model": "claude-sonnet-4", "stream": true, "max_tokens": 8,
                   "messages": [{"role": "user", "content": "hi"}]}),
        ),
        (
            "/google/v1beta/models/gemini-3-pro:streamGenerateContent",
            json!({"contents": [{"parts": [{"text": "hi"}]}]}),
        ),
        (
            "/v1/responses",
            json!({"model": "gpt-4o", "input": "hi", "stream": true}),
        ),
    ] {
        let invocation = entrypoint(Method::POST, path, body).await;
        assert_eq!(
            InvocationShape::SseStream,
            invocation.dispatch.invocation_shape,
            "{path} must be recognized as a server-sent-event invocation"
        );
        assert_eq!(BillingMode::Composite, invocation.billing.mode, "{path}");
        assert_eq!(
            BillingQuantitySource::StreamingAccumulator,
            invocation.billing.quantity_source,
            "{path} must bill from the stream accumulator, not from a parsed body"
        );
    }
}

// ------------------------------------------------------------- OpenAI chat

/// OpenAI 的 usage 只出现在最后一帧，且 input 是**含缓存**的口径：
/// `prompt_tokens = 100` 里含 `cached_tokens = 20`，全价部分是 80。
#[tokio::test]
async fn an_openai_chat_stream_bills_the_terminal_usage_frame() {
    let lines = streamed_lines(
        Method::POST,
        "/v1/chat/completions",
        json!({"model": "gpt-4o", "stream": true, "stream_options": {"include_usage": true},
               "messages": [{"role": "user", "content": "hi"}]}),
        "data: {\"choices\":[{\"delta\":{\"content\":\"Hello there\"}}]}\n\n\
         data: {\"choices\":[{\"delta\":{}}],\"usage\":{\"prompt_tokens\":100,\"completion_tokens\":50,\"total_tokens\":150,\"prompt_tokens_details\":{\"cached_tokens\":20}}}\n\n\
         data: [DONE]\n\n",
    )
    .await;
    assert_eq!(
        owned(&[
            ("llm_input_token", "80"),
            ("llm_cache_read_token", "20"),
            ("llm_output_token", "50"),
        ]),
        lines
    );
}

/// OpenAI 的中间帧会带 `"usage": null`。若实现把「读到 usage 帧」当成「终态」，
/// 这些空帧会把真实帧挤掉；逐字段合并之后，最终帧仍然生效。
#[tokio::test]
async fn a_null_usage_frame_mid_stream_does_not_erase_the_terminal_frame() {
    let lines = streamed_lines(
        Method::POST,
        "/v1/chat/completions",
        json!({"model": "gpt-4o", "stream": true,
               "messages": [{"role": "user", "content": "hi"}]}),
        "data: {\"choices\":[{\"delta\":{\"content\":\"Hello there\"}}],\"usage\":null}\n\n\
         data: {\"choices\":[{\"delta\":{\"content\":\" and more\"}}],\"usage\":null}\n\n\
         data: {\"choices\":[],\"usage\":{\"prompt_tokens\":100,\"completion_tokens\":50,\"total_tokens\":150}}\n\n\
         data: [DONE]\n\n",
    )
    .await;
    assert_eq!(
        owned(&[("llm_input_token", "100"), ("llm_output_token", "50")]),
        lines
    );
}

// -------------------------------------------------------------- Anthropic
/// Anthropic 把 usage 劈成两帧：`message_start.message.usage` 只有 input，
/// `message_delta.usage` 只有 output。**两半都必须计费**——只取最后一帧的实现
/// 会让每一条 Claude 流式请求的 input token 全部免费。
#[tokio::test]
async fn an_anthropic_stream_bills_both_halves_of_the_split_usage() {
    let lines = streamed_lines(
        Method::POST,
        "/anthropic/v1/messages",
        json!({"model": "claude-sonnet-4", "max_tokens": 64, "stream": true,
               "messages": [{"role": "user", "content": "hi"}]}),
        "event: message_start\n\
         data: {\"type\":\"message_start\",\"message\":{\"id\":\"m1\",\"usage\":{\"input_tokens\":100,\"cache_read_input_tokens\":20,\"cache_creation_input_tokens\":10,\"output_tokens\":1}}}\n\n\
         event: content_block_delta\n\
         data: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"Hello there\"}}\n\n\
         event: message_delta\n\
         data: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"end_turn\"},\"usage\":{\"output_tokens\":50}}\n\n\
         event: message_stop\n\
         data: {\"type\":\"message_stop\"}\n\n",
    )
    .await;
    assert_eq!(
        owned(&[
            ("llm_input_token", "100"),
            ("llm_cache_read_token", "20"),
            ("llm_cache_write_token", "10"),
            ("llm_output_token", "50"),
        ]),
        lines
    );
}

// ----------------------------------------------------------------- Gemini

/// Gemini 每帧都给**累计** `usageMetadata`，最后一帧是权威值；思考 token
/// （`thoughtsTokenCount`）与可见输出同价，必须并入 output。
#[tokio::test]
async fn a_gemini_stream_bills_the_cumulative_usage_metadata() {
    let lines = streamed_lines(
        Method::POST,
        "/google/v1beta/models/gemini-3-pro:streamGenerateContent",
        json!({"contents": [{"parts": [{"text": "hi"}]}]}),
        "data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Hello\"}]}}],\"usageMetadata\":{\"promptTokenCount\":100,\"candidatesTokenCount\":1,\"totalTokenCount\":101}}\n\n\
         data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\" there\"}]}}],\"usageMetadata\":{\"promptTokenCount\":100,\"candidatesTokenCount\":50,\"thoughtsTokenCount\":30,\"cachedContentTokenCount\":20,\"totalTokenCount\":180}}\n\n",
    )
    .await;
    assert_eq!(
        owned(&[
            ("llm_input_token", "80"),
            ("llm_cache_read_token", "20"),
            ("llm_output_token", "80"),
        ]),
        lines
    );
}

// ------------------------------------------------------- 没有 usage 帧的流

/// 上游正常结束却没发 usage 帧（兼容上游忽略 `stream_options.include_usage`）。
/// 此时**不得免单**：累加器按观测到的输出文本给出保守下界，输入侧记 0——
/// 输入无法从流里重建，宁可少收也不虚构。
///
/// 36 个 ASCII 字符 ≈ 9 token（4 字符/token，故意取低）。
#[tokio::test]
async fn a_stream_without_a_usage_frame_estimates_the_output_it_produced() {
    let (eof_body, partial_body) = accumulate(
        "data: {\"choices\":[{\"delta\":{\"content\":\"Hello there, this is a longer answer\"}}]}\n\n\
         data: [DONE]\n\n",
    );
    assert!(
        eof_body.is_none(),
        "no provider usage frame arrived, so EOF must not invent one: {eof_body:?}"
    );
    assert_eq!(
        Some(json!({"usage": {"prompt_tokens": 0, "completion_tokens": 9}})),
        partial_body,
        "a finished stream must still settle the output it produced"
    );
}

/// 同样的兜底对 Gemini 必须成立。Gemini 的输出在
/// `candidates[].content.parts[].text`，不在 `choices[].delta.content`——只认
/// OpenAI 形状时估算恒为 0，整条 Gemini 流照样免单。
#[tokio::test]
async fn a_gemini_stream_without_usage_metadata_still_estimates_its_output() {
    let (eof_body, partial_body) = accumulate(
        "data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Hello there\"}]}}]}\n\n",
    );
    assert!(eof_body.is_none(), "{eof_body:?}");
    // 11 个 ASCII 字符 ≈ 2 token。
    assert_eq!(
        Some(json!({"usage": {"prompt_tokens": 0, "completion_tokens": 2}})),
        partial_body
    );
}

/// CJK 输出的估算必须走宽字符口径（约 0.75 token/字），不能按 ASCII 的
/// 4 字符/token 折算——否则中文流式回答会被低估约 3 倍。
#[tokio::test]
async fn a_cjk_stream_estimates_tokens_per_wide_character() {
    let (_, partial_body) = accumulate(
        "data: {\"choices\":[{\"delta\":{\"content\":\"你好世界\"}}]}\n\n\
         data: [DONE]\n\n",
    );
    // 4 个宽字符 × 3/4 = 3 token。
    assert_eq!(
        Some(json!({"usage": {"prompt_tokens": 0, "completion_tokens": 3}})),
        partial_body
    );
}
// ------------------------------------------------------ OpenAI Responses

/// Responses 的流式 usage 嵌在 `response.completed` 的 `response.usage` 里，
/// 缓存 token 在 `input_tokens_details.cached_tokens`（不在顶层）——两者都要认，
/// 否则一次带缓存的 Responses 调用会把缓存 token 全按全价收。
#[tokio::test]
async fn an_openai_responses_stream_bills_the_nested_terminal_usage() {
    let lines = streamed_lines(
        Method::POST,
        "/v1/responses",
        json!({"model": "gpt-4o", "input": "hi", "stream": true}),
        "event: response.output_text.delta\n\
         data: {\"type\":\"response.output_text.delta\",\"delta\":\"Hello there\"}\n\n\
         event: response.completed\n\
         data: {\"type\":\"response.completed\",\"response\":{\"id\":\"resp_1\",\"usage\":{\"input_tokens\":100,\"input_tokens_details\":{\"cached_tokens\":20},\"output_tokens\":50,\"total_tokens\":150}}}\n\n",
    )
    .await;
    assert_eq!(
        owned(&[
            ("llm_input_token", "80"),
            ("llm_cache_read_token", "20"),
            ("llm_output_token", "50"),
        ]),
        lines
    );
}

/// Responses 的输出文本在事件**顶层** `delta`（不在 `choices[].delta.content`）。
/// 没统计到时，缺 `response.completed` 的流估算恒为 0 ⇒ 整条免单。
#[tokio::test]
async fn a_responses_stream_without_usage_still_estimates_its_output() {
    let (eof_body, partial_body) = accumulate(
        "event: response.output_text.delta\n\
         data: {\"type\":\"response.output_text.delta\",\"delta\":\"Hello there\"}\n\n",
    );
    assert!(eof_body.is_none(), "{eof_body:?}");
    // 11 个 ASCII 字符 ≈ 2 token。
    assert_eq!(
        Some(json!({"usage": {"prompt_tokens": 0, "completion_tokens": 2}})),
        partial_body
    );
}

// --------------------------------------------- Gemini 契约形状：分块 JSON 数组

/// Gemini 的 `:streamGenerateContent` 在 **OpenAPI 契约里声明 200 响应是
/// `application/json`**，默认形态是分块下发的 JSON **数组**（`[{...},\n{...}]`），
/// 不是 SSE。只有 SSE 解析器时每一行都不是 `data:` 前缀 ⇒ 一个用量字段都读不到
/// ⇒ 整条流免单（只有 EOF 兜底时也只能估出 0）。
#[tokio::test]
async fn a_gemini_json_array_stream_bills_its_cumulative_usage_metadata() {
    let lines = streamed_lines_as(
        StreamingUsageFormat::JsonArray,
        Method::POST,
        "/google/v1beta/models/gemini-3-pro:streamGenerateContent",
        json!({"contents": [{"parts": [{"text": "hi"}]}]}),
        "[{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Hello\"}]}}],\
          \"usageMetadata\":{\"promptTokenCount\":100,\"candidatesTokenCount\":1,\"totalTokenCount\":101}},\n\
          {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\" there\"}]}}],\
          \"usageMetadata\":{\"promptTokenCount\":100,\"candidatesTokenCount\":50,\"thoughtsTokenCount\":30,\"cachedContentTokenCount\":20,\"totalTokenCount\":180}}]",
    )
    .await;
    assert_eq!(
        owned(&[
            ("llm_input_token", "80"),
            ("llm_cache_read_token", "20"),
            ("llm_output_token", "80"),
        ]),
        lines
    );
}

/// 同一种数组形态，行被切得很碎（`[` 独占一行、每行以 `,` 结尾、`]` 独占一行）时
/// 也必须逐元素读出来——网关按 chunk 转发，切点不受控。
#[tokio::test]
async fn a_fragmented_json_array_stream_still_bills_every_element() {
    let lines = streamed_lines_as(
        StreamingUsageFormat::JsonArray,
        Method::POST,
        "/google/v1beta/models/gemini-3-pro:streamGenerateContent",
        json!({"contents": [{"parts": [{"text": "hi"}]}]}),
        "[\n\
         {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Hello\"}]}}]},\n\
         {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\" there\"}]}}],\"usageMetadata\":{\"promptTokenCount\":100,\"candidatesTokenCount\":50,\"totalTokenCount\":150}}\n\
         ]",
    )
    .await;
    assert_eq!(
        owned(&[("llm_input_token", "100"), ("llm_output_token", "50")]),
        lines
    );
}

/// 数组形态下没有 `usageMetadata` 时，估算要能数出 Gemini 的输出文本，
/// 不能因为解析器选错而恒为 0。
#[tokio::test]
async fn a_json_array_stream_without_usage_still_estimates_its_output() {
    let (eof_body, partial_body) = accumulate_as(
        StreamingUsageFormat::JsonArray,
        "[{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Hello there\"}]}}]}]",
    );
    assert!(eof_body.is_none(), "{eof_body:?}");
    // 11 个 ASCII 字符 ≈ 2 token。
    assert_eq!(
        Some(json!({"usage": {"prompt_tokens": 0, "completion_tokens": 2}})),
        partial_body
    );
}

// ------------------------------------------- 客户端 stream 标志不得改写媒体计费

/// 计费绕过回归：媒体路由声明的单位（按条 / 按张 / 按秒 / 按字符）只能从
/// 完整响应体量出来，流式下没有完整响应体。改造前 ProviderNative 分支对
/// `SseStream` 无条件套 `streaming_composite_policy` ⇒ 形态塌成 `Composite`、
/// 数量来源变成 `StreamingAccumulator` ⇒ 累加器在媒体响应里找不到 token 字段
/// ⇒ 0 行 ⇒ 结算层跳过。**客户端只要在请求体里加一个 stream 标志，一条视频 /
/// 一首曲子 / 一次合成就能免单。** 现在形状与计费都不因这个字段而改变。
#[tokio::test]
async fn a_client_stream_flag_never_reprices_a_media_route() {
    let cases: [(Method, &str, Value, &str); 3] = [
        (
            Method::POST,
            "/google/v1beta/models/veo-3.0-generate-preview:generateVideos",
            json!({"instances": [{"prompt": "a cat"}]}),
            "video_result",
        ),
        (
            Method::POST,
            "/kling/v1/videos/text2video",
            json!({"model_name": "kling-v2", "prompt": "a cat", "duration": "10"}),
            "video_result",
        ),
        (
            Method::POST,
            "/suno/v1/music/generations",
            json!({"prompt": "a song", "duration": 120}),
            "music_output_second",
        ),
    ];
    for (method, path, body, expected_meter) in cases {
        let mut streamed = body.clone();
        streamed
            .as_object_mut()
            .expect("object body")
            .insert("stream".to_owned(), Value::Bool(true));
        let invocation = entrypoint(method, path, streamed).await;
        assert_eq!(
            InvocationShape::Json,
            invocation.dispatch.invocation_shape,
            "{path}: a client stream flag must not turn a media route into a stream"
        );
        assert_ne!(
            BillingMode::Composite,
            invocation.billing.mode,
            "{path}: media units cannot be measured from a stream"
        );
        assert_eq!(
            BillingQuantitySource::ResponseBody,
            invocation.billing.quantity_source,
            "{path}: quantity must still come from the whole provider body"
        );
        assert_eq!(
            Some(expected_meter),
            invocation
                .billing
                .meter
                .as_ref()
                .map(|meter| meter.code().to_owned())
                .as_deref(),
            "{path}"
        );
    }
}

/// 正向对照：token 路由的 stream 标志**必须**仍然切到流式累加器——
/// 上面那条守卫不能把真正的流式计费一起关掉。
#[tokio::test]
async fn a_client_stream_flag_still_selects_the_streaming_accumulator_for_tokens() {
    let mut body = json!({"model": "gpt-4o", "messages": [{"role": "user", "content": "hi"}]});
    body.as_object_mut()
        .expect("object body")
        .insert("stream".to_owned(), Value::Bool(true));
    let invocation = entrypoint(Method::POST, "/v1/chat/completions", body).await;
    assert_eq!(
        InvocationShape::SseStream,
        invocation.dispatch.invocation_shape
    );
    assert_eq!(
        BillingQuantitySource::StreamingAccumulator,
        invocation.billing.quantity_source
    );
}

/// 第二道防线：即使形状**已经不来自客户端标志**（例如上游适配器目标或后续新增
/// 代码把调用判成 `SseStream`），媒体路由的计费策略也不得塌成 token 复合。
/// 载荷侧的守卫是第一道，这条锁住策略侧的独立判据。
#[tokio::test]
async fn a_media_route_stays_on_its_media_policy_even_when_the_shape_is_a_stream() {
    let mut invocation = entrypoint(
        Method::POST,
        "/kling/v1/videos/text2video",
        json!({"model_name": "kling-v2", "prompt": "a cat", "duration": "10"}),
    )
    .await;
    // 绕过载荷守卫，直接把形状改成流式，模拟"形状来自别处"的场景。
    invocation.dispatch = InvocationDispatch::sse_stream();
    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");
    assert_ne!(
        BillingMode::Composite,
        invocation.billing.mode,
        "a video unit must never be priced as a token composite"
    );
    assert_eq!(
        BillingQuantitySource::ResponseBody,
        invocation.billing.quantity_source,
        "the video quantity still has to come from the provider body"
    );
    assert_eq!(
        Some("video_result"),
        invocation
            .billing
            .meter
            .as_ref()
            .map(|meter| meter.code().to_owned())
            .as_deref()
    );
}
