//! 缓存计量（`llm_cache_read_token` / `llm_cache_write_token`）**没有目录报价**时的回归。
//!
//! 这两立方米特意被排除在计价预检的 fail-closed 之外（`requires_complete_pricing`）：
//! 供应商会在这两个 SKU 上报告用量，而目录不保证每个模型都配了缓存价；如果因此
//! 拒绝整条请求，正常流量会被打掉。但"不拒绝"不等于"可以收 0"：
//!
//! * OpenAI 的缓存读约 0.25–0.5× 输入价、Anthropic 约 0.1×，**上游仍然收费**；
//! * 长上下文场景缓存命中常占 prompt 的 50%–95%；
//! * 0 元事实不会触发任何告警，等于永久免单。
//!
//! 所以规则是：**没有缓存价 ⇒ 缓存 token 并入输入行、按输入价结算**。上限 1× 输入价
//! （目录补上真实缓存价后自动回到正确费率），下限不能是 0（不可恢复）。
//!
//! 目录**有**缓存价时必须保持各自独立成行——两条用例互为对照，缺一条就测不出
//! "改动是不是把正常路径也一起改掉了"。

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

/// 目录：input `0.15` / output `0.60` 每百万 token（美元）。`with_cache_prices` 决定
/// 是否额外给缓存读 `0.075`、缓存写 `0.1875`（Anthropic 的 1.25× 惯例）。
fn catalog(with_cache_prices: bool) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));
    catalog.add_model(
        AiModel::new("gpt-4o-mini", "GPT-4o mini", "openai", vec!["chat"])
            .with_catalog_key("openai/gpt-4o-mini"),
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
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "openrouter",
            3001,
            "gpt-4o-mini-upstream",
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
        (BillingMeter::LlmInputToken, "0.150000", "0.110000"),
        (BillingMeter::LlmOutputToken, "0.600000", "0.480000"),
    ];
    if with_cache_prices {
        priced.push((BillingMeter::LlmCacheReadToken, "0.075000", "0.055000"));
        priced.push((BillingMeter::LlmCacheWriteToken, "0.187500", "0.140000"));
    }
    for (meter, official, upstream) in priced {
        catalog.add_price(ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::OfficialReference,
            meter.clone(),
            Money::usd(official).unwrap(),
        ));
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                "openai/gpt-4o-mini",
                "gpt-4o-mini",
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
    resource.requested_model = Some("gpt-4o-mini".to_owned());
    resource.requested_model_catalog_key = Some("openai/gpt-4o-mini".to_owned());
    resource.provider_native_model = Some("gpt-4o-mini-upstream".to_owned());
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/chat/completions")
            .with_request_id("req-cache")
            .with_body(InvocationBody::json(json!({
                "model": "gpt-4o-mini",
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
        provider_model: Some("gpt-4o-mini-upstream".to_owned()),
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
    with_cache_prices: bool,
    usage: Value,
) -> (Vec<(String, String)>, Vec<(String, String, String)>) {
    let catalog = Arc::new(catalog(with_cache_prices));
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

/// OpenAI 形态：`prompt_tokens = 100` 里含 `cached_tokens = 20`，目录**没有**缓存读价。
/// 20 个命中 token 必须并入输入按输入价收：100 × 0.15 / 1e6 = 0.000015。
#[tokio::test]
async fn unpriced_cache_reads_are_billed_at_the_input_rate() {
    let (lines, commands) = settle(
        false,
        json!({
            "prompt_tokens": 100,
            "completion_tokens": 50,
            "total_tokens": 150,
            "prompt_tokens_details": {"cached_tokens": 20}
        }),
    )
    .await;
    assert_eq!(
        owned(&[("llm_input_token", "100"), ("llm_output_token", "50")]),
        lines,
        "cached prompt tokens must not vanish into a zero-amount cache fact"
    );
    let input = commands
        .iter()
        .find(|(meter, _, _)| meter == "llm_input_token")
        .expect("input command");
    assert_eq!("100", input.1);
    assert_eq!(
        "0.000015000000", input.2,
        "the cached share must be charged at the input rate"
    );
    assert!(
        commands
            .iter()
            .all(|(meter, _, amount)| meter != "llm_cache_read_token" || amount != "0.000000000000"),
        "no zero-amount cache fact may be produced: {commands:?}"
    );
}

/// 对照：目录**有**缓存读价时，命中部分独立成行、按缓存价收。
/// 20 × 0.075 / 1e6 = 0.0000015，输入只收未命中的 80。
#[tokio::test]
async fn priced_cache_reads_keep_their_own_meter_and_rate() {
    let (lines, commands) = settle(
        true,
        json!({
            "prompt_tokens": 100,
            "completion_tokens": 50,
            "total_tokens": 150,
            "prompt_tokens_details": {"cached_tokens": 20}
        }),
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
    let cache = commands
        .iter()
        .find(|(meter, _, _)| meter == "llm_cache_read_token")
        .expect("cache command");
    assert_eq!(
        "0.000001500000", cache.2,
        "a priced cache read must use the cache rate, not the input rate"
    );
}

/// Anthropic 形态（三段互斥上报）：input 100 + cache_read 20 + cache_write 10，
/// 目录两个缓存价都缺 ⇒ 130 全部并入输入按输入价收。
#[tokio::test]
async fn unpriced_cache_writes_and_reads_fold_into_the_input() {
    let (lines, commands) = settle(
        false,
        json!({
            "input_tokens": 100,
            "cache_read_input_tokens": 20,
            "cache_creation_input_tokens": 10,
            "output_tokens": 50
        }),
    )
    .await;
    assert_eq!(
        owned(&[("llm_input_token", "130"), ("llm_output_token", "50")]),
        lines
    );
    let input = commands
        .iter()
        .find(|(meter, _, _)| meter == "llm_input_token")
        .expect("input command");
    assert_eq!(
        "0.000019500000", input.2,
        "130 x 0.15 / 1e6 — both cache portions must be charged"
    );
}
