//! Google / Gemini **逐模态 token** 计费回归。
//!
//! 目录（sdkwork-models）对 Gemini 的模态是**分开报价**的：
//!
//! | 模型 | 目录费率计量单位 |
//! | --- | --- |
//! | `gemini-2.5-flash-preview-tts` | `llm_input_token` + `audio_output_token`（**没有** `llm_output_token`） |
//! | `gemini-3.1-flash-image` | `llm_input_token` + `image_output_token`（**没有** `llm_output_token`） |
//! | `gemini-3.8-live` | `llm_input_token`/`llm_output_token` + `audio_*_token` + `video_input_token` |
//! | `gemini-embedding-2` | `llm_input_token` + `audio/image/video_input_token` |
//!
//! 而 Gemini 报告的用量明细是**数组**：
//! `usageMetadata.promptTokensDetails[] / candidatesTokensDetails[] /
//! cacheTokensDetails[]`，每项 `{modality, tokenCount}`。抽取层原先只认 OpenAI
//! 的扁平 `*_tokens_details`，于是：
//!
//! * TTS 的 180 个音频产出 token 被记到目录没有报价的 `llm_output_token` 上
//!   ⇒ 结算失败 ⇒ 整条语音合成免单；
//! * 图像生成的 1290 个图像产出 token 同样落到 `llm_output_token`；
//! * 实时语音的音频输入/视频输入全部按文本价，8× 的价差被抹平；
//! * embedding 的模态输入（目录四个不同费率）按单一主档收。
//!
//! 这一层与 `billing_modality_token_entrypoints`（OpenAI 形状）互补：两家
//! 形状互斥，只测一边会让另一边的模态令牌整段落错档。用例同样成对出现——
//! 有价拆行、无价留在文本行（绝不造 0 元事实）。

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    apply_pricing_identity, resolve_pricing_identity, AccountBillingMode,
    AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor, Invocation,
    InvocationAccount, InvocationBody, InvocationClassificationRequest, InvocationDispatch,
    InvocationInterceptor, InvocationRequest, InvocationResourceClassifier, InvocationSubject,
    PricingFinalizationInterceptor, PricingPreflightInterceptor, PricingSettlementInterceptor,
    ProviderNativeResourceClassifier, UsageExtractionInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, GatewayApiKey, ModelPrice, ModelUpstreamRoute,
    ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan, ProviderAuthProfile,
    UpstreamAccountGroup, UpstreamAccountRoute,
};
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use serde_json::{json, Value};
use std::sync::Arc;

const TENANT_ID: i64 = 10;
const ORGANIZATION_ID: i64 = 20;
const API_KEY_ID: i64 = 100;
const ACCOUNT_GROUP_ID: i64 = 10;
const ACCOUNT_ID: i64 = 3001;
const VENDOR: &str = "google";

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

/// 以该模型的目录键注册费率；单价 `1.0`/单位 ⇒ **金额 == 数量**（token 的
/// `unitSize` 是 1,000,000，因此金额是数量的百万分之一）。
fn catalog(catalog_key: &str, model: &str, meters: &[BillingMeter]) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        VENDOR,
        ModelVendor::OpenAi,
        VENDOR,
    ));
    catalog
        .add_model(AiModel::new(model, model, VENDOR, vec!["chat"]).with_catalog_key(catalog_key));
    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::parse("1.000000").unwrap(),
        Money::usd("0.000000").unwrap(),
    ));
    catalog.add_upstream_account_group(UpstreamAccountGroup::new_scoped(
        ACCOUNT_GROUP_ID,
        TENANT_ID,
        ORGANIZATION_ID,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.000000").unwrap(),
    ));
    catalog.add_api_key(
        GatewayApiKey::new(API_KEY_ID, ACCOUNT_GROUP_ID, "sk-test", "hash:sk-test").with_owner(
            TENANT_ID,
            ORGANIZATION_ID,
            30,
        ),
    );
    let upstream_model = format!("{model}-upstream");
    catalog.add_model_upstream_route(ModelUpstreamRoute::new_for_catalog_key(
        catalog_key,
        model,
        VENDOR,
        ACCOUNT_ID,
        &upstream_model,
    ));
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new(VENDOR, ACCOUNT_ID).with_account_group_binding(
            ACCOUNT_GROUP_ID,
            100,
            100,
        ),
    );
    for meter in meters {
        catalog.add_price(ModelPrice::new_for_catalog_key(
            catalog_key,
            model,
            PriceSide::OfficialReference,
            meter.clone(),
            Money::usd("1.000000").unwrap(),
        ));
    }
    catalog
}

/// 按生产口径分类 + 计费策略，得到**目录改写前**的调用。
async fn declared_invocation(
    path: &str,
    catalog_key: &str,
    model: &str,
    body: Value,
) -> Invocation {
    let rest = path
        .trim_start_matches('/')
        .split_once('/')
        .map(|(_, tail)| format!("/{tail}"))
        .expect("vendor-prefixed path");
    let classification = ProviderNativeResourceClassifier
        .classify(
            &InvocationClassificationRequest::new(Method::POST, rest).with_supplier_code(VENDOR),
        )
        .expect("classification");
    let (mut resource, billing, routing) = classification.into_parts();
    resource.requested_model = Some(model.to_owned());
    resource.requested_model_catalog_key = Some(catalog_key.to_owned());
    resource.provider_native_model = Some(format!("{model}-upstream"));
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, path)
            .with_request_id("req-google-modality")
            .with_body(InvocationBody::json(body)),
        subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation.account = Some(InvocationAccount {
        supplier_code: VENDOR.to_owned(),
        account_id: ACCOUNT_ID,
        region_code: "global".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some("https://generativelanguage.googleapis.com".to_owned()),
        secret_ref: Some("vault://google/credential".to_owned()),
        auth_profile: ProviderAuthProfile::default(),
        timeout_ms: None,
        retry_policy: None,
        provider_model: Some(format!("{model}-upstream")),
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

/// 目录改写 → 预检 → 抽取 → 终审 → 结算。
async fn settle(
    path: &str,
    catalog_key: &str,
    model: &str,
    request: Value,
    meters: &[BillingMeter],
    response: Value,
) -> (
    BillingMode,
    Option<BillingMeter>,
    Vec<(String, String)>,
    Vec<(String, String, String)>,
) {
    let catalog = Arc::new(catalog(catalog_key, model, meters));
    let mut invocation = declared_invocation(path, catalog_key, model, request).await;
    let identity = resolve_pricing_identity(catalog.as_ref(), &invocation);
    apply_pricing_identity(&mut invocation, &identity);
    let mode = invocation.billing.mode.clone();
    let meter = invocation.billing.meter.clone();
    invocation.dispatch = InvocationDispatch::json_response(200, response);
    PricingPreflightInterceptor::new(Arc::clone(&catalog))
        .before(&mut invocation)
        .await
        .expect("pricing preflight");
    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");
    PricingFinalizationInterceptor::new(Arc::clone(&catalog))
        .after(&mut invocation)
        .await
        .expect("final pricing");
    PricingSettlementInterceptor
        .after(&mut invocation)
        .await
        .expect("settlement");
    let mut lines: Vec<(String, String)> = invocation
        .usage
        .lines
        .iter()
        .map(|line| {
            (
                line.meter.code().to_owned(),
                line.quantity.billable_quantity.clone(),
            )
        })
        .collect();
    lines.sort();
    let commands = invocation
        .usage
        .settlement_commands
        .iter()
        .map(|command| {
            (
                command.billing_meter_code.clone(),
                command.billable_quantity.clone(),
                command.customer_charge_amount.clone(),
            )
        })
        .collect();
    (mode, meter, lines, commands)
}

fn owned(entries: &[(&str, &str)]) -> Vec<(String, String)> {
    let mut lines: Vec<(String, String)> = entries
        .iter()
        .map(|(meter, quantity)| ((*meter).to_owned(), (*quantity).to_owned()))
        .collect();
    lines.sort();
    lines
}

fn amount(commands: &[(String, String, String)], meter: &str) -> String {
    commands
        .iter()
        .find(|(code, _, _)| code == meter)
        .unwrap_or_else(|| panic!("missing {meter} command: {commands:?}"))
        .2
        .clone()
}

/// Gemini TTS：输出是**音频**，目录只给 `audio_output_token` 报价，没有
/// `llm_output_token`。改造前 180 个音频 token 落在无价档上，整条合成免单。
#[tokio::test]
async fn gemini_tts_bills_audio_output_on_its_own_meter() {
    let (mode, meter, lines, commands) = settle(
        "/google/v1beta/models/gemini-2.5-flash-preview-tts:generateContent",
        "google/gemini-2.5-flash-preview-tts",
        "gemini-2.5-flash-preview-tts",
        json!({
            "contents": [{"parts": [{"text": "hello"}]}],
            "generationConfig": {"responseModalities": ["AUDIO"]}
        }),
        &[BillingMeter::AudioOutputToken, BillingMeter::LlmInputToken],
        json!({
            "candidates": [{
                "content": {"parts": [{"inlineData": {"mimeType": "audio/L16", "data": "..."}}],
                            "role": "model"},
                "finishReason": "STOP"
            }],
            "usageMetadata": {
                "promptTokenCount": 12,
                "candidatesTokenCount": 180,
                "totalTokenCount": 192,
                "promptTokensDetails": [{"modality": "TEXT", "tokenCount": 12}],
                "candidatesTokensDetails": [{"modality": "AUDIO", "tokenCount": 180}]
            }
        }),
    )
    .await;
    assert_eq!(BillingMode::Composite, mode);
    assert_eq!(Some(BillingMeter::LlmInputToken), meter);
    assert_eq!(
        owned(&[("llm_input_token", "12"), ("audio_output_token", "180"),]),
        lines,
        "audio output must land on audio_output_token, not on the unpriced llm_output_token"
    );
    assert_eq!("0.000012000000", amount(&commands, "llm_input_token"));
    assert_eq!("0.000180000000", amount(&commands, "audio_output_token"));
    assert!(
        commands
            .iter()
            .all(|(meter, _, _)| meter != "llm_output_token"),
        "the catalog has no llm_output_token rate; a line there would settle at zero: {commands:?}"
    );
}

/// Gemini 实时/多模态帧：音频输入、视频输入、音频输出各自按模态档结算，
/// 文本份额留在文本档。改造前整段按文本价（音频档单价是文本档的数倍）。
#[tokio::test]
async fn a_gemini_multimodal_frame_splits_audio_and_video_modalities() {
    let (_, _, lines, commands) = settle(
        "/google/v1beta/models/gemini-3.8-live:generateContent",
        "google/gemini-3.8-live",
        "gemini-3.8-live",
        json!({"contents": [{"parts": [{"text": "describe"}]}]}),
        &[
            BillingMeter::AudioInputToken,
            BillingMeter::AudioOutputToken,
            BillingMeter::LlmInputToken,
            BillingMeter::LlmOutputToken,
            BillingMeter::VideoInputToken,
        ],
        json!({
            "candidates": [{"content": {"parts": [{"text": "ok"}], "role": "model"}}],
            "usageMetadata": {
                "promptTokenCount": 1000,
                "candidatesTokenCount": 200,
                "totalTokenCount": 1200,
                "promptTokensDetails": [
                    {"modality": "AUDIO", "tokenCount": 600},
                    {"modality": "VIDEO", "tokenCount": 300},
                    {"modality": "TEXT", "tokenCount": 100}
                ],
                "candidatesTokensDetails": [
                    {"modality": "AUDIO", "tokenCount": 150},
                    {"modality": "TEXT", "tokenCount": 50}
                ]
            }
        }),
    )
    .await;
    assert_eq!(
        owned(&[
            ("llm_input_token", "100"),
            ("audio_input_token", "600"),
            ("video_input_token", "300"),
            ("llm_output_token", "50"),
            ("audio_output_token", "150"),
        ]),
        lines,
        "every modality must be billed on its own meter"
    );
    assert_eq!("0.000100000000", amount(&commands, "llm_input_token"));
    assert_eq!("0.000600000000", amount(&commands, "audio_input_token"));
    assert_eq!("0.000300000000", amount(&commands, "video_input_token"));
    assert_eq!("0.000050000000", amount(&commands, "llm_output_token"));
    assert_eq!("0.000150000000", amount(&commands, "audio_output_token"));
}

/// Gemini 图像生成：`candidatesTokensDetails` 是 IMAGE，目录按
/// `image_output_token` + `llm_input_token` 报价。改造前图像 token 落在
/// `llm_output_token`，文本输入也完全不进账。
#[tokio::test]
async fn gemini_image_generation_bills_image_output_and_text_input() {
    let (_, _, lines, commands) = settle(
        "/google/v1beta/models/gemini-3.1-flash-image:generateContent",
        "google/gemini-3.1-flash-image",
        "gemini-3.1-flash-image",
        json!({
            "contents": [{"parts": [{"text": "a red apple"}]}],
            "generationConfig": {"responseModalities": ["IMAGE"]}
        }),
        &[BillingMeter::ImageOutputToken, BillingMeter::LlmInputToken],
        json!({
            "candidates": [{
                "content": {"parts": [{"inlineData": {"mimeType": "image/png", "data": "..."}}],
                            "role": "model"}
            }],
            "usageMetadata": {
                "promptTokenCount": 20,
                "candidatesTokenCount": 1290,
                "totalTokenCount": 1310,
                "promptTokensDetails": [{"modality": "TEXT", "tokenCount": 20}],
                "candidatesTokensDetails": [{"modality": "IMAGE", "tokenCount": 1290}]
            }
        }),
    )
    .await;
    assert_eq!(
        owned(&[("llm_input_token", "20"), ("image_output_token", "1290"),]),
        lines,
        "image output must use image_output_token and the prompt must not be dropped"
    );
    assert_eq!("0.000020000000", amount(&commands, "llm_input_token"));
    assert_eq!("0.001290000000", amount(&commands, "image_output_token"));
}

/// 对照：目录没有模态费率时，模态令牌**留在文本行**按文本价结算。
/// 拆成无价行会落成 0 元事实，比少收更难修。
#[tokio::test]
async fn modality_tokens_stay_on_text_lines_without_a_modality_rate() {
    let (_, _, lines, commands) = settle(
        "/google/v1beta/models/gemini-2.5-flash-preview-tts:generateContent",
        "google/gemini-2.5-flash-preview-tts",
        "gemini-2.5-flash-preview-tts",
        json!({"contents": [{"parts": [{"text": "hello"}]}]}),
        &[BillingMeter::LlmInputToken, BillingMeter::LlmOutputToken],
        json!({
            "usageMetadata": {
                "promptTokenCount": 12,
                "candidatesTokenCount": 180,
                "totalTokenCount": 192,
                "promptTokensDetails": [{"modality": "TEXT", "tokenCount": 12}],
                "candidatesTokensDetails": [{"modality": "AUDIO", "tokenCount": 180}]
            }
        }),
    )
    .await;
    assert_eq!(
        owned(&[("llm_input_token", "12"), ("llm_output_token", "180"),]),
        lines,
        "no audio-output rate => audio tokens must stay on the text output line"
    );
    assert!(
        commands
            .iter()
            .all(|(meter, _, _)| meter != "audio_output_token"),
        "an unpriced modality line must not reach the ledger: {commands:?}"
    );
}

/// Gemini 的 `promptTokenCount` 已包含缓存命中，`cacheTokensDetails` 给出
/// 缓存部分按模态的拆分。缓存音频已经按缓存价结算，不能再按音频输入价收一遍。
#[tokio::test]
async fn cached_google_audio_tokens_are_not_billed_twice() {
    let (_, _, lines, commands) = settle(
        "/google/v1beta/models/gemini-multimodal-cache:generateContent",
        "google/gemini-multimodal-cache",
        "gemini-multimodal-cache",
        json!({"contents": [{"parts": [{"text": "hello"}]}]}),
        &[
            BillingMeter::LlmInputToken,
            BillingMeter::LlmOutputToken,
            BillingMeter::LlmCacheReadToken,
            BillingMeter::AudioInputToken,
        ],
        json!({
            "usageMetadata": {
                "promptTokenCount": 100,
                "cachedContentTokenCount": 50,
                "candidatesTokenCount": 10,
                "totalTokenCount": 110,
                "promptTokensDetails": [
                    {"modality": "AUDIO", "tokenCount": 60},
                    {"modality": "TEXT", "tokenCount": 40}
                ],
                "cacheTokensDetails": [{"modality": "AUDIO", "tokenCount": 50}],
                "candidatesTokensDetails": [{"modality": "TEXT", "tokenCount": 10}]
            }
        }),
    )
    .await;
    assert_eq!(
        owned(&[
            ("llm_input_token", "40"),
            ("llm_cache_read_token", "50"),
            ("audio_input_token", "10"),
            ("llm_output_token", "10"),
        ]),
        lines,
        "cached audio is billed on the cache line only; the fresh 10 audio tokens keep the audio rate"
    );
    assert_eq!("0.000040000000", amount(&commands, "llm_input_token"));
    assert_eq!("0.000050000000", amount(&commands, "llm_cache_read_token"));
    assert_eq!("0.000010000000", amount(&commands, "audio_input_token"));
}

/// 目录只给输入侧一组模态费率时，主档必须是**文本输入**——否则
/// 主计量单位会按 meter code 字母序落到 `audio_input_token`，整段文本按
/// 音频价收（Gemini embedding 的文本输入是常态）。
#[tokio::test]
async fn a_google_embedding_prefers_the_text_meter() {
    let (mode, meter, lines, commands) = settle(
        "/google/v1beta/models/gemini-embedding-2:embedContent",
        "google/gemini-embedding-2",
        "gemini-embedding-2",
        json!({"content": {"parts": [{"text": "hello"}]}}),
        &[
            BillingMeter::AudioInputToken,
            BillingMeter::ImageInputToken,
            BillingMeter::LlmInputToken,
            BillingMeter::VideoInputToken,
        ],
        json!({
            "embedding": {"values": [0.1, 0.2]},
            "usageMetadata": {"promptTokenCount": 100, "totalTokenCount": 100}
        }),
    )
    .await;
    assert_eq!(BillingMode::Token, mode);
    assert_eq!(
        Some(BillingMeter::LlmInputToken),
        meter,
        "text input is the default input meter when the catalog prices several modalities"
    );
    assert_eq!(owned(&[("llm_input_token", "100")]), lines);
    assert_eq!("0.000100000000", amount(&commands, "llm_input_token"));
}

/// Gemini embedding 的多模态输入：文本与图像各自按自己的费率结算。
#[tokio::test]
async fn a_google_embedding_splits_image_input_modality() {
    let (mode, meter, lines, commands) = settle(
        "/google/v1beta/models/gemini-embedding-2:embedContent",
        "google/gemini-embedding-2",
        "gemini-embedding-2",
        json!({"content": {"parts": [{"inlineData": {"mimeType": "image/png", "data": "..."}},
                                     {"text": "hello"}]}}),
        &[
            BillingMeter::AudioInputToken,
            BillingMeter::ImageInputToken,
            BillingMeter::LlmInputToken,
            BillingMeter::VideoInputToken,
        ],
        json!({
            "embedding": {"values": [0.1, 0.2]},
            "usageMetadata": {
                "promptTokenCount": 100,
                "totalTokenCount": 100,
                "promptTokensDetails": [
                    {"modality": "TEXT", "tokenCount": 20},
                    {"modality": "IMAGE", "tokenCount": 80}
                ]
            }
        }),
    )
    .await;
    assert_eq!(
        owned(&[
            ("llm_input_token", "20"),
            ("image_input_token", "80"),
        ]),
        lines,
        "the image share must not be billed at the text embedding rate (mode={mode:?}, meter={meter:?})"
    );
    assert_eq!("0.000020000000", amount(&commands, "llm_input_token"));
    assert_eq!("0.000080000000", amount(&commands, "image_input_token"));
}
