//! 逐入口媒体数量回归：**每个媒体接口**喂一条它**契约里的真实响应形状**，
//! 断言结算出多少。
//!
//! 前三层按"家族"锁（`billing_quantity_families` 一个家族一条），这一层按
//! **接口**锁：同一个家族里不同厂商的响应形状完全不同，家族级用例只能证明
//! "某一种形状能读对"。真实事故恰恰是"契约里的那种形状读不到"：
//!
//! * MiniMax 音乐的契约形状是 `data.extra_info.music_duration`（**两层**嵌套），
//!   只扫一层的实现读不到 ⇒ 30 秒的曲子收 1 秒；
//! * Google Imagen 的结果数组叫 `predictions`、Vidu 叫 `creations`，名字不在
//!   结果数组表里 ⇒ 要 4 张只收 1 张；
//! * OpenAI STT 的 `response_format: "text"` 让响应不是 JSON ⇒ 读不到时长。
//!
//! 所以这里的夹具**必须照抄 OpenAPI 契约里的 schema 形状**，不能图省事用扁平
//! 字段——用扁平字段会让测试绿着，生产却收错（本轮真的踩到过：MiniMax 用例
//! 原先写的是顶层 `extra_info`，跑绿了，生产是 `data.extra_info`）。

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    AccountBillingMode, AuthenticatedApiKeyContext, BillingPolicyInterceptor, Invocation,
    InvocationAccount, InvocationBody, InvocationClassificationRequest, InvocationDispatch,
    InvocationInterceptor, InvocationRequest, InvocationResourceClassifier, InvocationSubject,
    OpenAiResourceClassifier, ProviderNativeResourceClassifier, UsageExtractionInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::ProviderAuthProfile;
use serde_json::{json, Value};

const TENANT_ID: i64 = 10;
const ORGANIZATION_ID: i64 = 20;
const API_KEY_ID: i64 = 100;
const ACCOUNT_GROUP_ID: i64 = 10;

fn subject() -> InvocationSubject {
    InvocationSubject::from_api_key_context(AuthenticatedApiKeyContext {
        tenant_id: TENANT_ID,
        organization_id: ORGANIZATION_ID,
        user_id: 30,
        api_key_id: API_KEY_ID,
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

/// 按生产口径分类 + 计费策略，得到**未装目录**的调用（与矩阵快照同一路径）。
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
            .with_request_id("media-entrypoint")
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
    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");
    invocation
}

/// 抽取并返回 `(meter_code, billable_quantity)`；断言恰有一条用量行。
async fn billed(
    method: Method,
    path: &str,
    request: Value,
    status: u16,
    response: Value,
) -> (String, String) {
    let mut invocation = entrypoint(method, path, request).await;
    let api_code = invocation.resource.api_code.clone();
    invocation.dispatch = InvocationDispatch::json_response(status, response);
    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .unwrap_or_else(|error| panic!("{api_code} usage extraction failed: {error}"));
    assert_eq!(
        1,
        invocation.usage.lines.len(),
        "{api_code} must settle exactly one usage line, got {:?}",
        invocation
            .usage
            .lines
            .iter()
            .map(|line| format!("{}={}", line.meter.code(), line.quantity.billable_quantity))
            .collect::<Vec<_>>()
    );
    let line = &invocation.usage.lines[0];
    (
        line.meter.code().to_owned(),
        line.quantity.billable_quantity.clone(),
    )
}

// ---------------------------------------------------------------- 图片（按张）

/// OpenAI 图像：`OpenAiImageList.data[]`。
#[tokio::test]
async fn openai_image_list_bills_every_returned_image() {
    let (meter, quantity) = billed(
        Method::POST,
        "/v1/images/generations",
        json!({"model": "gpt-image-1", "prompt": "a cat", "n": 2}),
        200,
        json!({"created": 1, "data": [{"url": "a"}, {"url": "b"}]}),
    )
    .await;
    assert_eq!("image_result", meter);
    assert_eq!("2", quantity);
}

/// Google Imagen：`GeminiImageGenerationResponse.predictions[]`（契约字段名
/// 就是 `predictions`）。缺这条名字时 4 张只收 1 张。
///
/// 请求里**故意不带** `sampleCount`：这样只有"读出数组长度"这一条路能得到 4，
/// 数组名写错就会掉到 1。带 `sampleCount` 的话两条路都通，用例就失去鉴别力。
#[tokio::test]
async fn gemini_image_prediction_array_bills_every_prediction() {
    let (meter, quantity) = billed(
        Method::POST,
        "/google/v1beta/models/imagen-4:generateImages",
        json!({"instances": [{"prompt": "a cat"}]}),
        200,
        json!({"predictions": [
            {"bytesBase64Encoded": "a"},
            {"bytesBase64Encoded": "b"},
            {"bytesBase64Encoded": "c"},
            {"bytesBase64Encoded": "d"}
        ]}),
    )
    .await;
    assert_eq!("image_result", meter);
    assert_eq!("4", quantity);
}

/// 上游没给结果数组时，回落到 Google 放在 `parameters.sampleCount` 里的张数。
#[tokio::test]
async fn gemini_image_falls_back_to_the_nested_sample_count() {
    let (_, quantity) = billed(
        Method::POST,
        "/google/v1beta/models/imagen-4:generateImages",
        json!({"instances": [{"prompt": "a cat"}], "parameters": {"sampleCount": 3}}),
        200,
        json!({"metadata": {"note": "no inline images"}}),
    )
    .await;
    assert_eq!("3", quantity);
}

/// 上游**明确**回空数组 ⇒ 产出 0 张，按最小 1 单位收，而不是按请求的 4 张收。
#[tokio::test]
async fn an_empty_result_array_waives_the_charge_instead_of_billing_one() {
    // 空数组既不能回落到请求里的 `n`（4），也不该按 1 张收：上游明确没有
    // 产出，记 waive，由结算层释放预扣并成功返回（2.46）。
    let mut invocation = entrypoint(
        Method::POST,
        "/v1/images/generations",
        json!({"model": "gpt-image-1", "prompt": "a cat", "n": 4}),
    )
    .await;
    invocation.dispatch = InvocationDispatch::json_response(200, json!({"created": 1, "data": []}));
    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");
    assert!(
        invocation.usage.lines.is_empty(),
        "an empty result array must not produce a usage line: {:?}",
        invocation.usage.lines
    );
    assert_eq!(
        Some("provider_returned_no_results"),
        invocation.charging.waived.as_deref()
    );
}

/// Kling 图像：`KlingImageGenerationTask.images[]`。
#[tokio::test]
async fn kling_image_task_bills_the_images_array() {
    let (_, quantity) = billed(
        Method::POST,
        "/kling/v1/images/generations",
        json!({"model_name": "kling-v2", "prompt": "a cat"}),
        200,
        json!({"code": 0, "data": [{"url": "a"}]}),
    )
    .await;
    assert_eq!("1", quantity);
}

/// Vidu 图像：`ViduImageGenerationTask.creations[]`（不是 `data[]`）。
#[tokio::test]
async fn vidu_image_task_bills_the_creations_array() {
    let (_, quantity) = billed(
        Method::POST,
        "/vidu/ent/v2/reference2image",
        json!({"model": "vidu2", "prompt": "a cat", "images": ["https://a"]}),
        200,
        json!({"task_id": "t1", "state": "success", "creations": [{"url": "a"}, {"url": "b"}]}),
    )
    .await;
    assert_eq!("2", quantity);
}

/// 火山图像：`VolcengineImageGenerationResponse.data[]`。
#[tokio::test]
async fn volcengine_image_bills_the_data_array() {
    let (_, quantity) = billed(
        Method::POST,
        "/volcengine/api/v3/images/generations",
        json!({"model": "doubao-seedream", "prompt": "a cat"}),
        200,
        json!({"data": [{"url": "a"}, {"url": "b"}]}),
    )
    .await;
    assert_eq!("2", quantity);
}

// ---------------------------------------------------------------- 视频

/// OpenAI 视频：按**输出秒**，数量来自响应或请求的 `seconds`。
#[tokio::test]
async fn openai_video_bills_the_requested_output_seconds() {
    let (meter, quantity) = billed(
        Method::POST,
        "/v1/videos",
        json!({"model": "sora-2", "prompt": "a cat", "seconds": 8}),
        200,
        json!({"id": "video_1", "status": "queued"}),
    )
    .await;
    assert_eq!("video_output_second", meter);
    assert_eq!("8.000000000000", quantity);
}

/// 供应商原生视频创建：任务对象只有 id/state，按**一条**结算。
#[tokio::test]
async fn provider_native_video_creation_bills_one_task() {
    for (path, request, response) in [
        (
            "/kling/v1/videos/generations",
            json!({"model_name": "kling-v2", "prompt": "a cat", "duration": 5}),
            json!({"code": 0, "data": {"task_id": "t1", "task_status": "submitted"}}),
        ),
        (
            "/volcengine/api/v3/contents/generations/tasks",
            json!({"model": "seedance", "content": [{"type": "text", "text": "a cat"}]}),
            json!({"id": "cgt-1"}),
        ),
        (
            "/google/v1beta/models/veo-3.0:generateVideos",
            json!({"instances": [{"prompt": "a cat"}]}),
            json!({"name": "models/veo-3.0/operations/abc"}),
        ),
    ] {
        let (meter, quantity) = billed(Method::POST, path, request, 200, response).await;
        assert_eq!("video_result", meter, "{path} 应按条");
        assert_eq!("1", quantity, "{path} 一次创建 = 一条任务");
    }
}

/// Vidu 视频：`ViduVideoGenerationTask.creations[]`，多 creation = 多条。
#[tokio::test]
async fn vidu_video_task_bills_every_creation() {
    let (_, quantity) = billed(
        Method::POST,
        "/vidu/ent/v2/img2video",
        json!({"model": "vidu2", "images": ["https://a"]}),
        200,
        json!({"task_id": "t1", "creations": [{"url": "a"}, {"url": "b"}]}),
    )
    .await;
    assert_eq!("2", quantity);
}

// ---------------------------------------------------------------- 音乐（按秒）

/// Suno：任务结果里 `data[].metadata.duration`，多 clip **求和**。
#[tokio::test]
async fn suno_bills_the_sum_of_the_generated_clips() {
    let (meter, quantity) = billed(
        Method::POST,
        "/suno/v1/music/generations",
        json!({"prompt": "a song", "model": "chirp-v3"}),
        200,
        json!({"code": "success", "data": [
            {"audio_url": "a", "metadata": {"duration": 118.4}},
            {"audio_url": "b", "metadata": {"duration": 102.6}}
        ]}),
    )
    .await;
    assert_eq!("music_output_second", meter);
    assert_eq!("221.000000000000", quantity);
}

/// MiniMax：**契约形状**是 `data.extra_info.music_duration`（两层嵌套，毫秒）。
/// 只扫一层容器时这里会读不到 ⇒ 收 1 秒。
#[tokio::test]
async fn minimax_bills_the_contract_nested_extra_info_in_seconds() {
    let (_, quantity) = billed(
        Method::POST,
        "/minimax/v1/music_generation",
        json!({"model": "music-3.0", "lyrics": "[Verse]la"}),
        200,
        json!({
            "base_resp": {"status_code": 0},
            "data": {"audio": "hex", "status": 2, "extra_info": {"music_duration": 30000, "music_size": 900000}},
            "trace_id": "t1"
        }),
    )
    .await;
    assert_eq!("30.000000000000", quantity);
}

/// Suno 创建响应（`SunoMusicGenerationResponse`）**契约里没有时长字段**。
/// 请求也没声明 `duration` 时只能按最小单位兜底——这是已知限制，钉住它免得
/// 有人误以为这里能收到真实时长。
#[tokio::test]
async fn suno_creation_without_a_declared_duration_falls_back_to_one_second() {
    let (_, quantity) = billed(
        Method::POST,
        "/suno/v1/music/generations",
        json!({"prompt": "a song", "model": "chirp-v3"}),
        200,
        json!({"id": "t1", "status": "submitted", "task_id": "t1"}),
    )
    .await;
    assert_eq!("1.000000000000", quantity);
}

/// 请求声明了 `duration` 时按声明收（这条路是 Suno 唯一可用的按秒口径）。
#[tokio::test]
async fn suno_bills_the_requested_duration_when_the_response_has_none() {
    let (_, quantity) = billed(
        Method::POST,
        "/suno/v1/music/generations",
        json!({"prompt": "a song", "model": "chirp-v3", "duration": 90}),
        200,
        json!({"id": "t1", "status": "submitted"}),
    )
    .await;
    assert_eq!("90.000000000000", quantity);
}

// ---------------------------------------------------------------- 语音合成（按字符）

/// TTS 三个入口都按**请求文本字符数**：OpenAI 扁平 `input`、ElevenLabs `text`、
/// 火山 Ark 嵌套 `input.text`。
#[tokio::test]
async fn every_tts_entrypoint_bills_the_requested_characters() {
    for (path, request, expected) in [
        (
            "/v1/audio/speech",
            json!({"model": "tts-1", "input": "你好世界", "voice": "alloy"}),
            "4",
        ),
        (
            "/elevenlabs/v1/text-to-speech/voice-1",
            json!({"text": "hello world"}),
            "11",
        ),
        (
            "/volcengine/api/v3/audio/speech",
            json!({"input": {"text": "你好世界", "voice": "x"}}),
            "4",
        ),
    ] {
        let (meter, quantity) = billed(Method::POST, path, request, 200, json!({"ok": true})).await;
        assert_eq!("tts_input_character", meter, "{path} 应按字符");
        assert_eq!(expected, quantity, "{path} 字符数不对");
    }
}

// ---------------------------------------------------------------- 语音识别（按分钟）

/// OpenAI STT 的两种时长户口：`usage.seconds`（duration 型）与顶层 `duration`。
#[tokio::test]
async fn stt_bills_reported_seconds_as_minutes() {
    for (path, response, expected) in [
        (
            "/v1/audio/transcriptions",
            json!({"text": "hi", "usage": {"type": "duration", "seconds": 12.5}}),
            "0.208333333333",
        ),
        (
            "/v1/audio/translations",
            json!({"text": "hi", "duration": 30}),
            "0.500000000000",
        ),
    ] {
        let (meter, quantity) = billed(
            Method::POST,
            path,
            json!({"model": "whisper-1"}),
            200,
            response,
        )
        .await;
        assert_eq!("stt_audio_minute", meter, "{path} 应按分钟");
        assert_eq!(expected, quantity, "{path} 秒→分钟换算不对");
    }
}

/// 🔴 STT 读不到时长时（`response_format: "text"` 让响应不是 JSON、或兼容实现
/// 干脆不回 usage），兜底必须是 **1 分钟**而不是 1 秒：1 秒 = 1/60 分钟，一段
/// 30 分钟的转录会被算成 0.0167 分钟，少收三个数量级。
#[tokio::test]
async fn stt_without_any_reported_duration_floors_at_one_minute() {
    let mut invocation = entrypoint(
        Method::POST,
        "/v1/audio/transcriptions",
        json!({"model": "whisper-1", "response_format": "text"}),
    )
    .await;
    // 纯文本响应：`body` 不是 JSON。
    invocation.dispatch = InvocationDispatch::json_response(200, json!("a plain transcript"));
    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction must still settle");
    assert_eq!(1, invocation.usage.lines.len());
    let line = &invocation.usage.lines[0];
    assert_eq!("stt_audio_minute", line.meter.code());
    assert_eq!(
        "1.000000000000", line.quantity.billable_quantity,
        "分钟档的兜底是 1 分钟"
    );
}
