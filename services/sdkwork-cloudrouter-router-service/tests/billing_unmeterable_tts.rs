//! "token 计价但数量不可测"的语音合成路由：**必须在派发前拒单**。
//!
//! `openai/gpt-4o-mini-tts` 在目录里只有 `llm_input_token` + `audio_output_token`，
//! 没有 `tts_input_character`。`pricing_identity` 会把 `/v1/audio/speech` 从
//! "按字符"改写成 Token 档；但这个端点的 2xx 响应是**二进制音频**，OpenAI 不在
//! 响应体/响应头里回 `usage`。于是：
//!
//! ```text
//! 派发前：预检通过（有 token 价）
//! 派发后：音频已经流给客户
//! 抽取：  响应不是 JSON ⇒ token 数量读不到 ⇒ 抽取失败
//! 结算：  不执行 ⇒ 账上 0 元
//! ```
//!
//! 这不是"少收"，是**免费**，而且失败发生在响应之后，客户端完全无感。修法不是
//! 猜一个数量，而是在预检（最后一个能拒单的关口）显式失败：
//!
//! * 拒单错误是 `Pricing` 类，消息说明"二进制音频 + 无 usage ⇒ 不可计量"，
//!   让运维在目录/契约层修，而不是在账上产生 0 元事实；
//! * 只挡**合成**面：识别端点（`/v1/audio/transcriptions`）回 JSON，按 token
//!   计费是可量的；聊天等 JSON 面同样不受影响；
//! * 目录仍按字符报价的 TTS（`tts-1-hd` 等）保持原样，预检继续通过。
//!
//! 这正是"可结算性"那一面锁：声明了数量来源，就一定要能被抽取；抽不出来时，
//! 宁可拒绝，也不能放行成免费调用。

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    apply_pricing_identity, resolve_pricing_identity, AccountBillingMode,
    AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor, Invocation,
    InvocationAccount, InvocationBody, InvocationClassificationRequest, InvocationError,
    InvocationErrorKind, InvocationInterceptor, InvocationRequest, InvocationResourceClassifier,
    InvocationSubject, OpenAiResourceClassifier, PricingPreflightInterceptor,
    ProviderNativeResourceClassifier,
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

fn catalog(
    vendor: &str,
    catalog_key: &str,
    model: &str,
    meters: &[BillingMeter],
) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        vendor,
        ModelVendor::OpenAi,
        vendor,
    ));
    catalog
        .add_model(AiModel::new(model, model, vendor, vec!["audio"]).with_catalog_key(catalog_key));
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
        vendor,
        ACCOUNT_ID,
        &upstream_model,
    ));
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new(vendor, ACCOUNT_ID).with_account_group_binding(
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
    vendor: &str,
    catalog_key: &str,
    model: &str,
    body: Value,
) -> Invocation {
    let classification = if path.starts_with("/v1/") {
        OpenAiResourceClassifier.classify(&InvocationClassificationRequest::new(Method::POST, path))
    } else {
        let rest = path
            .trim_start_matches('/')
            .split_once('/')
            .map(|(_, tail)| format!("/{tail}"))
            .expect("vendor-prefixed path");
        ProviderNativeResourceClassifier.classify(
            &InvocationClassificationRequest::new(Method::POST, rest).with_supplier_code(vendor),
        )
    }
    .expect("classification");
    let (mut resource, billing, routing) = classification.into_parts();
    resource.requested_model = Some(model.to_owned());
    resource.requested_model_catalog_key = Some(catalog_key.to_owned());
    resource.provider_native_model = Some(format!("{model}-upstream"));
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, path)
            .with_request_id("req-unmeterable-tts")
            .with_body(InvocationBody::json(body)),
        subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation.account = Some(InvocationAccount {
        supplier_code: vendor.to_owned(),
        account_id: ACCOUNT_ID,
        region_code: "global".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some("https://vendor.example".to_owned()),
        secret_ref: Some("vault://vendor/credential".to_owned()),
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

/// 目录改写 → 预检；返回预检后的调用或预检错误。
async fn preflight(
    path: &str,
    vendor: &str,
    catalog_key: &str,
    model: &str,
    request: Value,
    meters: &[BillingMeter],
) -> Result<Invocation, InvocationError> {
    let catalog = Arc::new(catalog(vendor, catalog_key, model, meters));
    let mut invocation = declared_invocation(path, vendor, catalog_key, model, request).await;
    let identity = resolve_pricing_identity(catalog.as_ref(), &invocation);
    apply_pricing_identity(&mut invocation, &identity);
    PricingPreflightInterceptor::new(Arc::clone(&catalog))
        .before(&mut invocation)
        .await
        .map(|()| invocation)
}

fn refusal(error: InvocationError) -> InvocationError {
    assert_eq!(
        InvocationErrorKind::Pricing,
        error.kind,
        "a metering refusal must be a pricing failure, got {error:?}"
    );
    assert!(
        error.message.contains("cannot be metered"),
        "the refusal must say the quantity is unmeasurable, got: {}",
        error.message
    );
    error
}

/// `gpt-4o-mini-tts`：目录只有 token 价，端点是二进制音频 ⇒ 预览必须拒单。
#[tokio::test]
async fn token_priced_openai_speech_is_refused_before_dispatch() {
    let error = preflight(
        "/v1/audio/speech",
        "openai",
        "openai/gpt-4o-mini-tts",
        "gpt-4o-mini-tts",
        json!({"model": "gpt-4o-mini-tts", "input": "hello", "voice": "alloy"}),
        &[BillingMeter::LlmInputToken, BillingMeter::AudioOutputToken],
    )
    .await
    .expect_err("a token-priced binary TTS route must be refused, not served unmetered");
    let error = refusal(error);
    assert!(
        error.message.contains("openai.audio.speech"),
        "the refusal must name the route: {}",
        error.message
    );
}

/// 对照：目录按字符报价时（`tts-1-hd`），预检照常通过——守卫不能误伤可计量路由。
#[tokio::test]
async fn character_priced_openai_speech_still_passes_preflight() {
    let invocation = preflight(
        "/v1/audio/speech",
        "openai",
        "openai/tts-1-hd",
        "tts-1-hd",
        json!({"model": "tts-1-hd", "input": "hello", "voice": "alloy"}),
        &[BillingMeter::TtsInputCharacter],
    )
    .await
    .expect("a character-priced TTS route is measurable and must pass");
    assert_eq!(BillingMode::Character, invocation.billing.mode);
}

/// 对照：token 计价的聊天面回 JSON + usage，必须继续放行。
#[tokio::test]
async fn token_priced_chat_still_passes_preflight() {
    let invocation = preflight(
        "/v1/chat/completions",
        "openai",
        "openai/gpt-5",
        "gpt-5",
        json!({"model": "gpt-5", "messages": [{"role": "user", "content": "hi"}]}),
        &[BillingMeter::LlmInputToken, BillingMeter::LlmOutputToken],
    )
    .await
    .expect("chat answers with JSON usage and must stay dispatchable");
    assert_eq!(BillingMode::Composite, invocation.billing.mode);
}

/// 对照：识别端点回 JSON，即使目录只给 token 价也不能被"合成守卫"误拦。
#[tokio::test]
async fn token_priced_transcription_still_passes_preflight() {
    let invocation = preflight(
        "/v1/audio/transcriptions",
        "openai",
        "openai/gpt-4o-transcribe",
        "gpt-4o-transcribe",
        json!({"model": "gpt-4o-transcribe", "file": "audio.mp3"}),
        &[BillingMeter::LlmInputToken, BillingMeter::LlmOutputToken],
    )
    .await
    .expect("transcription answers with JSON and must stay dispatchable");
    assert_eq!(BillingMode::Token, invocation.billing.mode);
}

/// ElevenLabs 的合成面同样是二进制音频；目录若改成 token 价，也必须拒单。
#[tokio::test]
async fn token_priced_elevenlabs_speech_is_refused_before_dispatch() {
    let error = preflight(
        "/elevenlabs/v1/text-to-speech/voice-1",
        "elevenlabs",
        "elevenlabs/eleven_multilingual_v2",
        "eleven_multilingual_v2",
        json!({"text": "hello", "model_id": "eleven_multilingual_v2"}),
        &[BillingMeter::LlmInputToken, BillingMeter::AudioOutputToken],
    )
    .await
    .expect_err("a token-priced binary synthesis route must be refused");
    let error = refusal(error);
    assert!(
        error.message.contains("elevenlabs.text_to_speech"),
        "the refusal must name the route: {}",
        error.message
    );
}
