//! 目录改写回归：装上 sdkwork-models 的费率定义后，计费口径必须跟着目录走。
//!
//! 黄金矩阵（`openapi_billing_matrix.rs`）钉的是**路由声明**的计量单位。生产上
//! 还有第二层权威：`pricing_identity::resolve_pricing_identity` 会用目录为该资源
//! 定义的**官方费率计量单位**对账，声明与目录无交集时**以目录为准**，并把
//! `meter + mode + quantity_source` 一起改写回调用（`apply_pricing_identity`）。
//!
//! 只锁第一层是不够的：路由声明"按条"，目录按"输出秒"报价，最终就是按秒——
//! 如果改写方向错了（或改写后数量来源没跟上），账上会按秒单价收到"1 条"的量。
//! 所以这里对每个"目录与声明不一致"的真实组合，断言**改写后的完整形态 + 数量**。
//!
//! 覆盖的目录改写（与 `pricing_identity` 模块文档记录的一致）：
//!
//! | 路由 | 路由声明 | 目录定义 | 改写后 |
//! | --- | --- | --- | --- |
//! | `kling.text_to_video` | `video_result` | `video_output_second` | 按输出秒 |
//! | `openai.images`（gpt-image-2） | `image_result` | `image_input_token`+`image_output_token` | 按 image token |
//! | `elevenlabs.sound_generation` | `api_request` | `audio_output_minute` | 按音频分钟 |
//!
//! 另有两类对照，保证改写不会乱跑：目录与声明**有交集**时取交集（不改写），
//! 目录**没有**该资源的费率时保留声明。

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    apply_pricing_identity, resolve_pricing_identity, AccountBillingMode,
    AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor, BillingQuantitySource,
    Invocation, InvocationAccount, InvocationBody, InvocationClassificationRequest,
    InvocationDispatch, InvocationInterceptor, InvocationRequest, InvocationResourceClassifier,
    InvocationSubject, OpenAiResourceClassifier, ProviderNativeResourceClassifier,
    UsageExtractionInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, GatewayApiKey, ModelPrice, ModelVendor,
    ModelVendorDefinition, Money, PriceSide, PricingPlan, ProviderAuthProfile,
    UpstreamAccountGroup,
};
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
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

/// 分类 + 计费策略，得到**改写前**的调用。
async fn declared_invocation(method: Method, path: &str, body: Value) -> Invocation {
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
        .unwrap_or_else(|| "catalog-vendor".to_owned());
    let mut invocation = Invocation::new(
        InvocationRequest::new(method, path)
            .with_request_id("catalog-resolution")
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
        secret_ref: Some("vault://vendor/credential".to_owned()),
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

/// 以**该路由自己的目录键**注册一个模型，并为给定计量单位各挂一条官方费率。
fn catalog_with_rates(catalog_key: &str, meters: &[BillingMeter]) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    let vendor = "catalog-vendor";
    catalog.add_vendor(ModelVendorDefinition::new(
        vendor,
        ModelVendor::OpenAi,
        vendor,
    ));
    catalog.add_model(
        AiModel::new(catalog_key, catalog_key, vendor, vec!["chat"]).with_catalog_key(catalog_key),
    );
    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::ONE,
        Money::usd("0.000000").unwrap(),
    ));
    // 单价 1 USD/单位：结算金额 == 数量，数量口径与金额口径一次对齐。
    for meter in meters {
        catalog.add_price(ModelPrice::new_for_catalog_key(
            catalog_key,
            catalog_key,
            PriceSide::OfficialReference,
            meter.clone(),
            Money::usd("1.000000").unwrap(),
        ));
    }
    catalog.add_upstream_account_group(UpstreamAccountGroup::new_scoped(
        ACCOUNT_GROUP_ID,
        TENANT_ID,
        ORGANIZATION_ID,
        "standard-group",
        "standard",
        DecimalValue::ONE,
        DecimalValue::ONE,
    ));
    catalog.add_api_key(
        GatewayApiKey::new(API_KEY_ID, ACCOUNT_GROUP_ID, "sk-test", "hash:sk-test").with_owner(
            TENANT_ID,
            ORGANIZATION_ID,
            30,
        ),
    );
    catalog
}

/// 按目录解析定价身份并回写（就是 `RoutingPipeline::plan_route` 在派发前做的
/// 那一步），返回改写后的 `(mode, meter, 数量来源)`。
///
/// 这里不跑 `PricingPreflightInterceptor`：预检只负责"有没有价"，而计量单位的
/// 改写发生在路由流水线，早于预检。两者读的是同一份 `invocation.billing`。
async fn resolve_with_catalog(
    invocation: &mut Invocation,
    meters: &[BillingMeter],
) -> (BillingMode, Option<BillingMeter>, BillingQuantitySource) {
    let catalog_key = invocation.resource.route_key.clone();
    let catalog = catalog_with_rates(&catalog_key, meters);
    let identity = resolve_pricing_identity(&catalog, invocation);
    apply_pricing_identity(invocation, &identity);
    (
        invocation.billing.mode.clone(),
        invocation.billing.meter.clone(),
        invocation.billing.quantity_source.clone(),
    )
}

/// 预检后继续跑用量抽取，返回 `billable_quantity`。
async fn extract_quantity(invocation: &mut Invocation, status: u16, body: Value) -> String {
    invocation.dispatch = InvocationDispatch::json_response(status, body);
    UsageExtractionInterceptor
        .after(invocation)
        .await
        .expect("usage extraction");
    assert_eq!(
        1,
        invocation.usage.lines.len(),
        "expected exactly one settled line for {}, got {:?}",
        invocation.resource.api_code,
        invocation
            .usage
            .lines
            .iter()
            .map(|line| line.meter.code())
            .collect::<Vec<_>>()
    );
    invocation.usage.lines[0].quantity.billable_quantity.clone()
}

#[tokio::test]
async fn catalog_redefinition_of_video_billing_switches_the_route_to_output_seconds() {
    // 声明按条（`video_result`），目录按输出秒（`video_output_second`）报价：
    // 上游成本本来就是按秒的，最终必须按秒结算，且数量来自响应/请求的时长。
    let mut invocation = declared_invocation(
        Method::POST,
        "/kling/v1/videos/generations",
        json!({"model_name": "kling-v3", "prompt": "sunset", "duration": "5"}),
    )
    .await;
    assert_eq!(
        Some(BillingMeter::VideoResult),
        invocation.billing.meter,
        "the route still declares per-video before the catalog is consulted"
    );

    let (mode, meter, source) =
        resolve_with_catalog(&mut invocation, &[BillingMeter::VideoOutputSecond]).await;
    assert_eq!(BillingMode::VideoSecond, mode);
    assert_eq!(Some(BillingMeter::VideoOutputSecond), meter);
    assert_eq!(BillingQuantitySource::ResponseBody, source);

    let quantity = extract_quantity(
        &mut invocation,
        200,
        json!({"code": 0, "data": {"task_id": "k-1"}}),
    )
    .await;
    // 创建任务的响应没有时长，回落到请求的 `duration`。
    assert_eq!("5.000000000000", quantity);
}

#[tokio::test]
async fn catalog_redefinition_of_image_billing_switches_the_route_to_image_tokens() {
    // `openai/gpt-image-2` 在目录里按 image token 报价（输入/输出两侧），而路由
    // 声明的是按张。目录优先 ⇒ 走 Token 档，主计量单位取"离产出最近"的输出侧。
    let mut invocation = declared_invocation(
        Method::POST,
        "/v1/images/generations",
        json!({"model": "gpt-image-2", "prompt": "a red apple", "n": 2}),
    )
    .await;
    assert_eq!(Some(BillingMeter::ImageResult), invocation.billing.meter);

    let (mode, meter, source) = resolve_with_catalog(
        &mut invocation,
        &[
            BillingMeter::ImageInputToken,
            BillingMeter::ImageOutputToken,
        ],
    )
    .await;
    assert_eq!(BillingMode::Token, mode);
    assert_eq!(
        Some(BillingMeter::ImageOutputToken),
        meter,
        "the output side is the primary meter when the catalog prices both sides"
    );
    assert_eq!(BillingQuantitySource::ResponseBody, source);

    let quantity = extract_quantity(
        &mut invocation,
        200,
        json!({"usage": {"input_tokens": 50, "output_tokens": 4160}}),
    )
    .await;
    assert_eq!("4160", quantity);
}

#[tokio::test]
async fn catalog_redefinition_of_sound_effects_switches_the_route_to_audio_minutes() {
    // ElevenLabs 音效：路由声明按次，目录按音频分钟。改写后数量从请求的
    // `duration_seconds` 来（ElevenLabs 支持该参数），并换算成分钟。
    let mut invocation = declared_invocation(
        Method::POST,
        "/elevenlabs/v1/sound-generation",
        json!({"text": "glass breaking", "duration_seconds": 12}),
    )
    .await;
    assert_eq!(Some(BillingMeter::ApiRequest), invocation.billing.meter);

    let (mode, meter, source) =
        resolve_with_catalog(&mut invocation, &[BillingMeter::AudioOutputMinute]).await;
    assert_eq!(BillingMode::AudioSecond, mode);
    assert_eq!(Some(BillingMeter::AudioOutputMinute), meter);
    assert_eq!(BillingQuantitySource::ResponseBody, source);

    // 响应是二进制音频，没有时长——必须回落到请求的 `duration_seconds`。
    let quantity = extract_quantity(&mut invocation, 200, json!({})).await;
    assert_eq!("0.200000000000", quantity);
}

#[tokio::test]
async fn catalog_and_route_agreement_keeps_the_declared_shape() {
    // 目录与声明都按输出秒：取交集，不改写，数量照旧从响应来。
    let mut invocation = declared_invocation(
        Method::POST,
        "/suno/v1/music/generations",
        json!({"prompt": "lofi beat"}),
    )
    .await;
    let declared = invocation.billing.clone();

    let (mode, meter, source) =
        resolve_with_catalog(&mut invocation, &[BillingMeter::MusicOutputSecond]).await;
    assert_eq!(declared.mode, mode);
    assert_eq!(declared.meter, meter);
    assert_eq!(declared.quantity_source, source);

    let quantity = extract_quantity(
        &mut invocation,
        200,
        json!({"data": [{"duration": 118.4}, {"duration": 102.6}]}),
    )
    .await;
    assert_eq!("221.000000000000", quantity);
}

#[tokio::test]
async fn catalog_without_a_rate_keeps_the_declared_shape() {
    // 目录对该键没有任何费率（尚未上架）：身份解析无交集可对账，保留声明形态。
    let mut invocation = declared_invocation(
        Method::POST,
        "/kling/v1/videos/generations",
        json!({"model_name": "kling-v3", "prompt": "sunset"}),
    )
    .await;
    let declared = invocation.billing.clone();

    let (mode, meter, source) = resolve_with_catalog(&mut invocation, &[]).await;
    assert_eq!(declared.mode, mode);
    assert_eq!(declared.meter, meter);
    assert_eq!(declared.quantity_source, source);
}
