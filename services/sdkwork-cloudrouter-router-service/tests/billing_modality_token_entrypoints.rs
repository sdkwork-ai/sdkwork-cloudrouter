//! 多模态令牌（`audio_input_token` / `audio_output_token` / `image_input_token`）
//! 的逐接口回归：**按模态结算，不按文本价结算**。
//!
//! 目录早就为这些码位单独定价，而且差得很远：
//!
//! | 计量单位 | `openai/gpt-realtime-2` 单价 |
//! | --- | --- |
//! | `llm_input_token` | `$4 / 1M` |
//! | `audio_input_token` | `$32 / 1M`（8×） |
//! | `llm_output_token` | `$24 / 1M` |
//! | `audio_output_token` | `$64 / 1M`（2.67×） |
//! | `llm_input_token`（图像） | `$4 / 1M` |
//! | `image_input_token` | `$5 / 1M`（1.25×） |
//!
//! 但抽取层原先从不产出这三个码位 ⇒ 上游报的音频/图像令牌全部并进文本行，
//! 按文本价结算。这不是"稍微少收"：`/v1/realtime/*` 的正常流量**就是**音频，
//! 8× 的价差会把这一整个家族做成亏损业务。
//!
//! 两家契约的上报形状不同，都要认：
//!
//! * chat/completions：`prompt_tokens_details.audio_tokens` /
//!   `completion_tokens_details.audio_tokens`，`prompt_tokens` 是**含**音频的总数；
//! * Realtime `response.done`：`input_token_details.{text,audio,image}_tokens` /
//!   `output_token_details.{text,audio}_tokens`，注意是**单数** `token`，且三段
//!   互斥。
//!
//! 反向约束同样重要：目录**没有**该模态价格时不许造 0 元事实（与缓存缺价同源），
//! 令牌要留在文本行按文本价结算。所以下面的用例成对出现，缺一半就测不出
//! "改动是不是把无价路径也一起打坏了"。

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    AccountBillingMode, AuthenticatedApiKeyContext, Invocation, InvocationAccount, InvocationBody,
    InvocationClassificationRequest, InvocationDispatch, InvocationInterceptor, InvocationRequest,
    InvocationResourceClassifier, InvocationSubject, OpenAiResourceClassifier,
    PricingFinalizationInterceptor, PricingPreflightInterceptor, PricingSettlementInterceptor,
    UsageExtractionInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, GatewayApiKey, ModelPrice, ModelUpstreamRoute,
    ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan, ProviderAuthProfile,
    UpstreamAccountGroup, UpstreamAccountRoute,
};
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use serde_json::{json, Value};
use std::sync::Arc;

/// 目录：文本 `1.0 / 1.0`（输入/输出，每百万 token），
/// 模态档 `10.0`（音频输入/输出）、`2.0`（图像输入）——倍数故意拉开，
/// 数量断言之外还能用金额直接看出"走的是哪一档"。
/// `with_modality_prices` 决定目录里有没有这三个码位。
fn catalog(with_modality_prices: bool) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));
    catalog.add_model(
        AiModel::new("gpt-realtime-2", "GPT Realtime 2", "openai", vec!["chat"])
            .with_catalog_key("openai/gpt-realtime-2"),
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
            "openai/gpt-realtime-2",
            "gpt-realtime-2",
            "openrouter",
            3001,
            "gpt-realtime-2-upstream",
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

    let mut priced = vec![
        (BillingMeter::LlmInputToken, "1.000000", "0.800000"),
        (BillingMeter::LlmOutputToken, "1.000000", "0.800000"),
        // 缓存读价必须给：没有它缓存命中会被按"缺价回退"并入输入行，
        // 那样就测不出"缓存里的音频不被重复收音频价"。
        (BillingMeter::LlmCacheReadToken, "0.500000", "0.400000"),
    ];
    if with_modality_prices {
        priced.push((BillingMeter::AudioInputToken, "10.000000", "8.000000"));
        priced.push((BillingMeter::AudioOutputToken, "10.000000", "8.000000"));
        priced.push((BillingMeter::ImageInputToken, "2.000000", "1.600000"));
    }
    for (meter, official, upstream) in priced {
        catalog.add_price(ModelPrice::new_for_catalog_key(
            "openai/gpt-realtime-2",
            "gpt-realtime-2",
            PriceSide::OfficialReference,
            meter.clone(),
            Money::usd(official).unwrap(),
        ));
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                "openai/gpt-realtime-2",
                "gpt-realtime-2",
                PriceSide::UpstreamCost,
                meter,
                Money::usd(upstream).unwrap(),
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

fn chat_invocation() -> Invocation {
    let classification = OpenAiResourceClassifier
        .classify(&InvocationClassificationRequest::new(
            Method::POST,
            "/v1/chat/completions",
        ))
        .expect("classification");
    let (mut resource, billing, routing) = classification.into_parts();
    resource.requested_model = Some("gpt-realtime-2".to_owned());
    resource.requested_model_catalog_key = Some("openai/gpt-realtime-2".to_owned());
    resource.provider_native_model = Some("gpt-realtime-2-upstream".to_owned());
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/chat/completions")
            .with_request_id("req-modality")
            .with_body(InvocationBody::json(json!({
                "model": "gpt-realtime-2",
                "modalities": ["audio", "text"],
                "messages": [{"role": "user", "content": "ping"}]
            }))),
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
        provider_model: Some("gpt-realtime-2-upstream".to_owned()),
        billing_mode: AccountBillingMode::Prepay,
        account_group_id: None,
        account_group_code: None,
        pricing_plan_code: None,
    });
    invocation
}

/// 走完整链路（预检 → 抽取 → 终审 → 结算），返回
/// `(用量行, 结算命令的 (meter, 数量, 金额))`。
async fn settle(
    with_modality_prices: bool,
    usage: Value,
) -> (Vec<(String, String)>, Vec<(String, String, String)>) {
    let catalog = Arc::new(catalog(with_modality_prices));
    let mut invocation = chat_invocation();
    invocation.dispatch = InvocationDispatch::json_response(200, json!({ "usage": usage }));
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
    (lines, commands)
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

/// chat/completions 形态：`prompt_tokens = 1000` 里 800 是音频，输出 200 里 150 是音频。
///
/// 拆后：文本输入 200、音频输入 800、文本输出 50、音频输出 150。
/// 金额校验直接暴露费率错配——音频按文本价收时音频行金额会是 `0.0008` 而不是 `0.008`。
#[tokio::test]
async fn an_audio_completion_bills_the_audio_share_on_the_audio_meters() {
    let (lines, commands) = settle(
        true,
        json!({
            "prompt_tokens": 1000,
            "completion_tokens": 200,
            "total_tokens": 1200,
            "prompt_tokens_details": {"audio_tokens": 800},
            "completion_tokens_details": {"audio_tokens": 150}
        }),
    )
    .await;
    assert_eq!(
        owned(&[
            ("llm_input_token", "200"),
            ("audio_input_token", "800"),
            ("llm_output_token", "50"),
            ("audio_output_token", "150"),
        ]),
        lines,
        "audio tokens must leave the text line and land on their own meters"
    );
    assert_eq!(
        "0.008000000000",
        amount(&commands, "audio_input_token"),
        "800 x 10 / 1e6 — billing audio at the text rate would give 0.0008"
    );
    assert_eq!(
        "0.001500000000",
        amount(&commands, "audio_output_token"),
        "150 x 10 / 1e6"
    );
    assert_eq!(
        "0.000200000000",
        amount(&commands, "llm_input_token"),
        "only the 200 text tokens stay on the input meter"
    );
}

/// Realtime `response.done` 形态：单数 `input_token_details` / `output_token_details`，
/// 三段互斥（text + audio + image = 总数）。
#[tokio::test]
async fn a_realtime_session_bills_the_singular_token_details_split() {
    let (lines, commands) = settle(
        true,
        json!({
            "input_tokens": 1000,
            "output_tokens": 300,
            "total_tokens": 1300,
            "input_token_details": {
                "text_tokens": 200,
                "audio_tokens": 700,
                "image_tokens": 100
            },
            "output_token_details": {"text_tokens": 100, "audio_tokens": 200}
        }),
    )
    .await;
    assert_eq!(
        owned(&[
            ("llm_input_token", "200"),
            ("audio_input_token", "700"),
            ("image_input_token", "100"),
            ("llm_output_token", "100"),
            ("audio_output_token", "200"),
        ]),
        lines,
        "a realtime session reports modality tokens under the singular *_token_details keys"
    );
    assert_eq!("0.000200000000", amount(&commands, "image_input_token"));
}

/// 对照：目录**没有**模态价时，模态令牌留在文本行按文本价结算 ——
/// 不许出现 0 元事实，也不许凭空多出无价行。
#[tokio::test]
async fn unpriced_modality_meters_keep_the_tokens_on_the_text_line() {
    let (lines, commands) = settle(
        false,
        json!({
            "prompt_tokens": 1000,
            "completion_tokens": 200,
            "total_tokens": 1200,
            "prompt_tokens_details": {"audio_tokens": 800},
            "completion_tokens_details": {"audio_tokens": 150}
        }),
    )
    .await;
    assert_eq!(
        owned(&[("llm_input_token", "1000"), ("llm_output_token", "200")]),
        lines,
        "without a modality rate the tokens must stay on the priced text line"
    );
    assert_eq!(
        "0.001000000000",
        amount(&commands, "llm_input_token"),
        "the whole prompt is still charged — never a zero-amount fact"
    );
    assert!(
        commands
            .iter()
            .all(|(meter, _, _)| meter != "audio_input_token"),
        "no unpriced modality command may exist: {commands:?}"
    );
}

/// 脏数据：`audio_tokens` 大于 `prompt_tokens`。拆分量以可计费量为上限，
/// 既不能产出负数计费量，也不能把文本行抹成负值。
#[tokio::test]
async fn audio_tokens_above_the_prompt_cannot_produce_a_negative_input() {
    let (lines, _commands) = settle(
        true,
        json!({
            "prompt_tokens": 1000,
            "completion_tokens": 10,
            "total_tokens": 1010,
            "prompt_tokens_details": {"audio_tokens": 5000}
        }),
    )
    .await;
    assert_eq!(
        owned(&[("audio_input_token", "1000"), ("llm_output_token", "10")]),
        lines,
        "the split is capped by the billable prompt, so the text line disappears rather than going negative"
    );
}

/// 缓存里也分了模态：`cached_tokens_details.audio_tokens` 已经由缓存行结算过，
/// 不能再按音频价收一遍。输入 1000、缓存 100（其中音频 60）、音频 700 ⇒
/// 音频行 640、文本行 260、缓存行按模态拆成 audio 60 + text 40（2.29）。
#[tokio::test]
async fn cached_audio_is_not_billed_again_on_the_audio_meter() {
    let (lines, _commands) = settle(
        true,
        json!({
            "input_tokens": 1000,
            "output_tokens": 10,
            "total_tokens": 1010,
            "input_token_details": {
                "text_tokens": 300,
                "audio_tokens": 700,
                "cached_tokens": 100,
                "cached_tokens_details": {"audio_tokens": 60}
            }
        }),
    )
    .await;
    assert_eq!(
        owned(&[
            ("llm_input_token", "260"),
            ("audio_input_token", "640"),
            ("llm_cache_read_token", "40"),
            ("llm_cache_read_token", "60"),
            ("llm_output_token", "10"),
        ]),
        lines,
        "cached audio belongs to the cache line (split by modality), not to a second audio charge"
    );
}
