//! 计费家族的**数量**回归：每个计费方式各喂一条真实上游响应，断言结算出多少量。
//!
//! `openapi_billing_matrix.rs` 钉的是"这条路由按什么单位计费"（形态），这个
//! 文件钉的是"这个单位量出多少"（数量）。两者缺一不可：形态对、数量恒等于 1
//! 的计费，在账面上看起来完全正常，实际却少收几十倍——音乐按秒却只收到 1 秒、
//! TTS 按字符却只收到 1 个字符，都是这么发生的。
//!
//! 覆盖的家族与真实响应形状：
//!
//! | 家族 | 上游形状 | 计量 |
//! | --- | --- | --- |
//! | 音乐（秒） | Suno `data[].duration` 一次多 clip | 各 clip 时长**求和** |
//! | 音乐（秒） | MiniMax `extra_info.music_duration`（毫秒） | 毫秒 → 秒 |
//! | TTS（字符） | ElevenLabs 响应是二进制音频 | 回落到请求 `text` 长度 |
//! | TTS（字符） | 火山 Ark `input.text`（对象包裹） | 取包裹里的文本 |
//! | 视频（秒） | OpenAI `POST /v1/videos` 返回任务对象 | 回落请求 `seconds` |
//! | 视频（条） | 可灵创建任务只给 task_id | 1 条 |
//! | 图片（张） | 火山 `data[]` 多张 | 数组长度 |
//! | 按次 | 任务查询 | 1 次 |

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    BillingMode, BillingPolicyInterceptor, BillingQuantitySource, Invocation, InvocationAuthType,
    InvocationBody, InvocationClassificationRequest, InvocationDispatch, InvocationInterceptor,
    InvocationRequest, InvocationResourceClassifier, InvocationSubject, OpenAiResourceClassifier,
    ProviderNativeResourceClassifier, UsageExtractionInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::BillingMeter;
use serde_json::{json, Value};

fn subject() -> InvocationSubject {
    InvocationSubject {
        auth_type: InvocationAuthType::GatewayApiKey,
        api_key_id: Some(1),
        api_key_name_snapshot: None,
        tenant_id: 10,
        organization_id: 20,
        user_id: 30,
        billing_organization_id: 0,
        billing_owner: Default::default(),
        account_group_id: Some(1),
        account_group_code: Some("official.deepseek.full".to_owned()),
        pricing_plan_code: None,
        roles: Vec::new(),
        scopes: Vec::new(),
    }
}

/// `/vendor/rest` → `(vendor, "/rest")`；`/v1/**` 属于 OpenAI 面。
fn vendor_prefix(path: &str) -> Option<(&str, String)> {
    let (head, tail) = path.trim_start_matches('/').split_once('/')?;
    if head == "v1" || head.starts_with("v1beta") {
        return None;
    }
    Some((head, format!("/{tail}")))
}

/// 按生产口径分类（与 `edge-runtime/src/invocation_http.rs` 的前缀分发一致），
/// 再跑计费策略。
async fn invocation_for(method: Method, path: &str, body: Option<Value>) -> Invocation {
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
    let mut request = InvocationRequest::new(method, path).with_request_id("quantity");
    if let Some(body) = body {
        request = request.with_body(InvocationBody::json(body));
    }
    let mut invocation = Invocation::new(request, subject(), resource, billing);
    invocation.routing = routing;
    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");
    invocation
}

/// 抽取用量行，返回 `(meter, billable_quantity)`。
async fn billed(invocation: &mut Invocation, status: u16, body: Value) -> (BillingMeter, String) {
    invocation.dispatch = InvocationDispatch::json_response(status, body);
    UsageExtractionInterceptor
        .after(invocation)
        .await
        .expect("usage extraction");
    assert_eq!(
        1,
        invocation.usage.lines.len(),
        "each metered call settles exactly one usage line, got {:?}",
        invocation
            .usage
            .lines
            .iter()
            .map(|line| line.meter.code())
            .collect::<Vec<_>>()
    );
    let line = &invocation.usage.lines[0];
    (line.meter.clone(), line.quantity.billable_quantity.clone())
}

#[tokio::test]
async fn music_bills_the_sum_of_every_generated_clip() {
    // Suno 一次生成多个 clip，每个都有自己的时长。只读顶层 `duration`（不存在）
    // 会退化成 1 秒；只读第一个 clip 会少收 clip 数倍的量。
    let mut invocation = invocation_for(
        Method::POST,
        "/suno/v1/music/generations",
        Some(json!({"prompt": "lofi beat"})),
    )
    .await;
    let (meter, quantity) = billed(
        &mut invocation,
        200,
        json!({
            "code": 200,
            "data": [
                {"id": "clip-1", "duration": 118.4, "audio_url": "https://cdn/1.mp3"},
                {"id": "clip-2", "duration": 102.6, "audio_url": "https://cdn/2.mp3"}
            ]
        }),
    )
    .await;
    assert_eq!(BillingMeter::MusicOutputSecond, meter);
    assert_eq!("221.000000000000", quantity);
}

#[tokio::test]
async fn music_bills_millisecond_reporting_as_seconds() {
    // MiniMax 把时长写在 `extra_info.music_duration` 且单位是**毫秒**。
    // 当成秒会为一条 30 秒的曲子收 8 小时。
    let mut invocation = invocation_for(
        Method::POST,
        "/minimax/v1/music_generation",
        Some(json!({"model": "music-1.5", "prompt": "piano"})),
    )
    .await;
    let (meter, quantity) = billed(
        &mut invocation,
        200,
        json!({
            "data": {"audio": "hex", "status": 2},
            "extra_info": {"music_duration": 30000}
        }),
    )
    .await;
    assert_eq!(BillingMeter::MusicOutputSecond, meter);
    assert_eq!("30.000000000000", quantity);
}

#[tokio::test]
async fn music_bills_nested_metadata_duration() {
    // 部分聚合商把时长挂在 `data[].metadata.duration`。
    let mut invocation = invocation_for(
        Method::POST,
        "/suno/v1/music/generations",
        Some(json!({"prompt": "ambient"})),
    )
    .await;
    let (_, quantity) = billed(
        &mut invocation,
        200,
        json!({"data": [{"id": "c1", "metadata": {"duration": 95.5}}]}),
    )
    .await;
    assert_eq!("95.500000000000", quantity);
}

#[tokio::test]
async fn speech_synthesis_bills_ark_nested_input_text() {
    // 火山 Ark 把提示词包在对象里：`{"input":{"text":"..."}}`。只认扁平的
    // `input` 字符串会把一整句合成收成 1 个字符。
    let mut invocation = invocation_for(
        Method::POST,
        "/volcengine/api/v3/audio/speech",
        Some(json!({
            "model": "seed-tts-1.0",
            "input": {"text": "你好世界", "voice": "zh_female"}
        })),
    )
    .await;
    let (meter, quantity) = billed(&mut invocation, 200, json!({"data": "base64-audio"})).await;
    assert_eq!(BillingMeter::TtsInputCharacter, meter);
    assert_eq!("4", quantity);
}

#[tokio::test]
async fn speech_synthesis_bills_request_text_when_the_response_is_binary() {
    // ElevenLabs 的成功响应就是音频字节，没有任何字符数字段，只能按请求文本。
    let mut invocation = invocation_for(
        Method::POST,
        "/elevenlabs/v1/text-to-speech/{voice_id}",
        Some(json!({"text": "Hello world", "model_id": "eleven_multilingual_v2"})),
    )
    .await;
    let (meter, quantity) = billed(&mut invocation, 200, json!({})).await;
    assert_eq!(BillingMeter::TtsInputCharacter, meter);
    assert_eq!("11", quantity);
}

#[tokio::test]
async fn speech_synthesis_prefers_the_reported_character_count() {
    // 供应商报了实际计费字符数时以它为准（请求文本可能被规范化/截断）。
    let mut invocation = invocation_for(
        Method::POST,
        "/volcengine/api/v3/audio/speech",
        Some(json!({"input": {"text": "你好世界"}})),
    )
    .await;
    let (_, quantity) = billed(
        &mut invocation,
        200,
        json!({"data": "base64", "usage": {"character_count": 7}}),
    )
    .await;
    assert_eq!("7", quantity);
}

#[tokio::test]
async fn video_generation_bills_the_requested_output_seconds() {
    // OpenAI 视频创建返回的是任务对象，没有时长；请求里的 `seconds` 就是下单量。
    let mut invocation = invocation_for(
        Method::POST,
        "/v1/videos",
        Some(json!({"model": "sora-2", "prompt": "a red apple", "seconds": "8"})),
    )
    .await;
    let (meter, quantity) = billed(
        &mut invocation,
        200,
        json!({"id": "video_1", "object": "video", "status": "queued"}),
    )
    .await;
    assert_eq!(BillingMeter::VideoOutputSecond, meter);
    assert_eq!("8.000000000000", quantity);
}

#[tokio::test]
async fn video_generation_prefers_the_reported_output_seconds() {
    let mut invocation = invocation_for(
        Method::POST,
        "/v1/videos",
        Some(json!({"model": "sora-2", "prompt": "a red apple", "seconds": 4})),
    )
    .await;
    let (_, quantity) = billed(
        &mut invocation,
        200,
        json!({"id": "video_1", "status": "completed", "seconds": 12}),
    )
    .await;
    assert_eq!("12.000000000000", quantity);
}

#[tokio::test]
async fn video_task_creation_bills_one_video() {
    // 可灵创建任务只回 task_id：这次调用下单的是 1 条视频。
    let mut invocation = invocation_for(
        Method::POST,
        "/kling/v1/videos/generations",
        Some(json!({"model_name": "kling-v3", "prompt": "sunset", "duration": "5"})),
    )
    .await;
    let (meter, quantity) = billed(
        &mut invocation,
        200,
        json!({"code": 0, "message": "SUCCEED", "data": {"task_id": "k-1"}}),
    )
    .await;
    assert_eq!(BillingMeter::VideoResult, meter);
    assert_eq!("1", quantity);
}

#[tokio::test]
async fn image_generation_bills_every_returned_image() {
    let mut invocation = invocation_for(
        Method::POST,
        "/volcengine/api/v3/images/generations",
        Some(json!({"model": "doubao-seedream-4", "prompt": "cat"})),
    )
    .await;
    let (meter, quantity) = billed(
        &mut invocation,
        200,
        json!({"data": [{"url": "a"}, {"url": "b"}, {"url": "c"}]}),
    )
    .await;
    assert_eq!(BillingMeter::ImageResult, meter);
    assert_eq!("3", quantity);
}

#[tokio::test]
async fn task_query_is_a_free_status_read() {
    // 异步任务轮询只读状态，不产生新的上游成本，目录也没有 `api_request` 价。
    // 按次报价会让客户永远拿不到已生成的结果（2.38），因此归 Free。
    // "按次数量恒为 1 + 预检种入"的链路仍由
    // `invocation_pricing_settlement::pricing_preflight_creates_fixed_api_request_usage_line`
    // 覆盖。
    let mut invocation = invocation_for(Method::GET, "/kling/v1/tasks/{task_id}", None).await;
    assert_eq!(BillingMode::Free, invocation.billing.mode);
    assert_eq!(
        BillingQuantitySource::None,
        invocation.billing.quantity_source
    );

    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({"code": 0, "data": {"task_status": "succeed"}}),
    );
    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");
    assert!(
        invocation.usage.lines.is_empty(),
        "a free status read must not fabricate a usage line: {:?}",
        invocation
            .usage
            .lines
            .iter()
            .map(|line| line.meter.code())
            .collect::<Vec<_>>()
    );
}
