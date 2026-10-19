//! 图片生成家族（`/v1/images/*`）的 **token 双向计费**回归。
//!
//! `openai/gpt-image-*` 在目录里按 token 双向报价：
//!
//! | 计量单位 | 参考单价 |
//! | --- | --- |
//! | `llm_input_token`（提示词文本） | `$5 / 1M` |
//! | `image_input_token`（输入图） | `$10 / 1M` |
//! | `image_output_token`（产出图） | `$40 / 1M` |
//!
//! 目录改写把路由从"按张"改成 `Token` + `image_output_token`（主档取产出侧），
//! 但 `BillingMode::Token` 原先**只产出一行**——主档那一行。于是输入侧完全不进账：
//! 一次 1024×1024 的 `/v1/images/edits`，输入图 1024 token、提示词 20 token 全部免单，
//! 上游按双向计费，我们只收输出侧。
//!
//! 补齐后必须同时满足四条：
//!
//! * 目录**给了输入侧报价**才补行（无价行 = 0 元事实，与缓存/模态缺价同源）；
//! * 上游没报输入量就不补，**不许拿 `total_tokens` 顶替**（那是两侧相加）；
//! * 上游把输入拆成 `input_tokens_details.{text,image}_tokens` 且文本档有报价时
//!   按模态拆行（文本 $5 与图像 $10 不同价）；
//! * 非图片家族（embedding）**不能**因为这条通道多出一行。
//!
//! 所以用例里成对出现：双向计费、模态拆分、无输入价对照、embedding 对照。

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    apply_pricing_identity, resolve_pricing_identity, AccountBillingMode,
    AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor, Invocation,
    InvocationAccount, InvocationBody, InvocationClassificationRequest, InvocationDispatch,
    InvocationInterceptor, InvocationRequest, InvocationResourceClassifier, InvocationSubject,
    OpenAiResourceClassifier, PricingFinalizationInterceptor, PricingPreflightInterceptor,
    PricingSettlementInterceptor, UsageExtractionInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, GatewayApiKey, ModelPrice, ModelUpstreamRoute,
    ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan, ProviderAuthProfile,
    UpstreamAccountGroup, UpstreamAccountRoute,
};
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use serde_json::{json, Value};
use std::sync::Arc;

const CATALOG_KEY: &str = "openai/gpt-image-2";

/// 目录：只为给定计量单位挂官方价（单价 `1.0`/单位 ⇒ **金额 == 数量**，数量口径
/// 与金额口径一次对齐）。输入/输出两侧都挂时才是"双向计费"。
fn catalog(meters: &[BillingMeter]) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));
    catalog.add_model(
        AiModel::new("gpt-image-2", "GPT Image 2", "openai", vec!["image"])
            .with_catalog_key(CATALOG_KEY),
    );
    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::parse("1.000000").unwrap(),
        Money::usd("0.000000").unwrap(),
    ));
    catalog.add_upstream_account_group(UpstreamAccountGroup::new_scoped(
        10,
        10,
        20,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.000000").unwrap(),
    ));
    catalog
        .add_api_key(GatewayApiKey::new(100, 10, "sk-test", "hash:sk-test").with_owner(10, 20, 30));
    catalog.add_model_upstream_route(
        ModelUpstreamRoute::new_for_catalog_key(
            CATALOG_KEY,
            "gpt-image-2",
            "openrouter",
            3001,
            "gpt-image-2-upstream",
        )
        .with_upstream_endpoint(
            Some("https://provider.example/openrouter"),
            Some("vault://provider/openrouter"),
        ),
    );
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openrouter", 3001)
            .with_upstream_endpoint(
                Some("https://provider.example/openrouter"),
                Some("vault://provider/openrouter"),
            )
            .with_account_group_binding(10, 100, 100),
    );
    for meter in meters {
        catalog.add_price(ModelPrice::new_for_catalog_key(
            CATALOG_KEY,
            "gpt-image-2",
            PriceSide::OfficialReference,
            meter.clone(),
            Money::usd("1.000000").unwrap(),
        ));
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                CATALOG_KEY,
                "gpt-image-2",
                PriceSide::UpstreamCost,
                meter.clone(),
                Money::usd("0.800000").unwrap(),
            )
            .for_upstream_account("openrouter", 3001),
        );
    }
    catalog
}

fn subject() -> InvocationSubject {
    InvocationSubject::from_api_key_context(AuthenticatedApiKeyContext {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        api_key_id: 100,
        api_key_name_snapshot: "Test key".to_owned(),
        group_id: 10,
        group_code: "standard-group".to_owned(),
        pricing_plan_code: "standard".to_owned(),
    })
}

/// 分类 + 计费策略，得到**目录改写前**的调用（图片路由此时仍是按张）。
async fn declared_invocation(path: &str, body: Value) -> Invocation {
    let classification = OpenAiResourceClassifier
        .classify(&InvocationClassificationRequest::new(Method::POST, path))
        .expect("classification");
    let (mut resource, billing, routing) = classification.into_parts();
    resource.requested_model = Some("gpt-image-2".to_owned());
    resource.requested_model_catalog_key = Some(CATALOG_KEY.to_owned());
    resource.provider_native_model = Some("gpt-image-2-upstream".to_owned());
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, path)
            .with_request_id("req-image-token")
            .with_body(InvocationBody::json(body)),
        subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation.account = Some(InvocationAccount {
        supplier_code: "openrouter".to_owned(),
        account_id: 3001,
        region_code: "global".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some("https://provider.example/openrouter".to_owned()),
        secret_ref: Some("vault://provider/openrouter".to_owned()),
        auth_profile: ProviderAuthProfile::default(),
        timeout_ms: None,
        retry_policy: None,
        provider_model: Some("gpt-image-2-upstream".to_owned()),
        billing_mode: AccountBillingMode::Prepay,
        account_group_id: None,
        account_group_code: None,
        pricing_plan_code: None,
    });
    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");
    invocation
}

/// 走"目录改写 → 预检 → 抽取 → 终审 → 结算"，返回
/// `(改写后的 mode, 用量行, 结算命令的 (meter, 数量, 金额))`。
async fn settle(
    path: &str,
    request: Value,
    meters: &[BillingMeter],
    response: Value,
) -> (
    BillingMode,
    Vec<(String, String)>,
    Vec<(String, String, String)>,
) {
    let catalog = Arc::new(catalog(meters));
    let mut invocation = declared_invocation(path, request).await;
    // 目录改写发生在路由流水线（`RoutingPipeline::plan_route`），早于计价预检。
    let identity = resolve_pricing_identity(catalog.as_ref(), &invocation);
    apply_pricing_identity(&mut invocation, &identity);
    let mode = invocation.billing.mode.clone();
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
    (mode, lines, commands)
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

/// gpt-image 的 `/v1/images/generations`：产出 4160 token、输入 50 token。
/// 改造前只收 4160（输入侧 50 完全免单）。
#[tokio::test]
async fn an_image_generation_bills_both_sides_of_the_token_usage() {
    let (mode, lines, commands) = settle(
        "/v1/images/generations",
        json!({"model": "gpt-image-2", "prompt": "a red apple", "n": 1}),
        &[
            BillingMeter::ImageInputToken,
            BillingMeter::ImageOutputToken,
        ],
        json!({"created": 1, "data": [{"b64_json": "..."}],
               "usage": {"input_tokens": 50, "output_tokens": 4160, "total_tokens": 4210}}),
    )
    .await;
    assert_eq!(BillingMode::Token, mode);
    assert_eq!(
        owned(&[("image_output_token", "4160"), ("image_input_token", "50"),]),
        lines,
        "an image route priced by tokens must bill the input side too"
    );
    assert_eq!("0.000050000000", amount(&commands, "image_input_token"));
    assert_eq!("0.004160000000", amount(&commands, "image_output_token"));
}

/// `/v1/images/edits`：输入 1044 token，其中文本 20、输入图 1024。
/// 文本按 `llm_input_token`、输入图按 `image_input_token` 分开收。
#[tokio::test]
async fn an_image_edit_splits_the_text_prompt_from_the_input_image() {
    let (_, lines, commands) = settle(
        "/v1/images/edits",
        json!({"model": "gpt-image-2", "prompt": "make it blue"}),
        &[
            BillingMeter::ImageInputToken,
            BillingMeter::ImageOutputToken,
            BillingMeter::LlmInputToken,
        ],
        json!({"created": 1, "data": [{"b64_json": "..."}],
               "usage": {"input_tokens": 1044, "output_tokens": 4160, "total_tokens": 5204,
                         "input_tokens_details": {"text_tokens": 20, "image_tokens": 1024}}}),
    )
    .await;
    assert_eq!(
        owned(&[
            ("image_output_token", "4160"),
            ("image_input_token", "1024"),
            ("llm_input_token", "20"),
        ]),
        lines,
        "the text share of the input must not be billed at the image-input rate"
    );
    assert_eq!("0.000020000000", amount(&commands, "llm_input_token"));
    assert_eq!("0.001024000000", amount(&commands, "image_input_token"));
}

/// 对照：目录只给产出侧报价时，输入侧不许补行（无价行会落成 0 元事实）。
#[tokio::test]
async fn an_image_route_without_an_input_price_bills_only_the_output_side() {
    let (_, lines, commands) = settle(
        "/v1/images/generations",
        json!({"model": "gpt-image-2", "prompt": "a red apple", "n": 1}),
        &[BillingMeter::ImageOutputToken],
        json!({"created": 1, "data": [{"b64_json": "..."}],
               "usage": {"input_tokens": 50, "output_tokens": 4160}}),
    )
    .await;
    assert_eq!(
        owned(&[("image_output_token", "4160")]),
        lines,
        "no input rate => no input line, never a zero-amount fact"
    );
    assert!(
        commands
            .iter()
            .all(|(meter, _, _)| meter != "image_input_token"),
        "unpriced input must not reach the ledger: {commands:?}"
    );
}

/// 对照：embedding 只有输入侧，不许因为补输入通道而多出一行。
#[tokio::test]
async fn an_embeddings_route_never_gains_a_second_line() {
    let (mode, lines, _commands) = settle(
        "/v1/embeddings",
        json!({"model": "gpt-image-2", "input": "hello"}),
        &[BillingMeter::EmbeddingInputToken],
        json!({"data": [{"embedding": [0.1]}],
               "usage": {"prompt_tokens": 100, "total_tokens": 100}}),
    )
    .await;
    assert_eq!(BillingMode::Token, mode);
    assert_eq!(owned(&[("embedding_input_token", "100")]), lines);
}
