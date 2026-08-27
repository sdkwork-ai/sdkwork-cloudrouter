//! One-off diagnostic: reproduce the official-reference price resolution
//! failure against the live dev database and print the exact candidates.
use sdkwork_cloudrouter_router_service::application::PriceService;
use sdkwork_cloudrouter_router_service::domain::{BillingMeter, ResourceDefinition};
use sdkwork_cloudrouter_router_service::infrastructure::sql::postgres::PostgresPricingCatalogLoader;
use sdkwork_cloudrouter_router_service::ports::{PricingCatalog, UpstreamAccountRouteCatalog};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;

const URL: &str = "postgresql://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/sdkwork_ai_dev";

#[tokio::test]
async fn diagnose_official_reference_resolution() {
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(URL)
        .await
        .expect("connect");
    let ring: serde_json::Value = serde_json::from_str(
        &std::fs::read_to_string(
            "E:/sdkwork-space/sdkwork-cloudrouter/.sdkwork/secrets/upstream-credential-key-ring.development.json",
        )
        .expect("key ring file"),
    )
    .expect("key ring json");
    let codec = std::sync::Arc::new(
        sdkwork_cloudrouter_router_service::infrastructure::crypto::RingAeadCredentialSecretCodec::with_key_ring(
            ring["activeKeyId"].as_str().expect("activeKeyId"),
            ring["activeKey"].as_str().expect("activeKey"),
            ring["fingerprintKey"].as_str().expect("fingerprintKey"),
            Vec::new(),
        )
        .expect("codec"),
    );
    let loader = PostgresPricingCatalogLoader::with_credential_secret_codec(pool, codec);
    let snapshot = loader.load_snapshot().await.expect("load snapshot");
    let catalog = Arc::new(snapshot);

    // 1) What does list_model_prices_for_scope return for official reference?
    let official = catalog.list_model_prices_for_scope(
        100001,
        0,
        "deepseek/deepseek-v4-flash",
        sdkwork_cloudrouter_router_service::domain::PriceSide::OfficialReference,
        BillingMeter::LlmInputToken,
    );
    println!(
        "official candidates: {}",
        official
            .iter()
            .map(|p| format!(
                "{:?}@{} metadata={}",
                p.unit_price, p.region_code, p.rate_metadata.is_some()
            ))
            .collect::<Vec<_>>()
            .join(", ")
    );
    for p in &official {
        if let Some(m) = &p.rate_metadata {
            println!(
                "  metadata: product={:?} operation={:?} hash={:?} conds={}",
                m.product_code, m.operation_code, m.rate_hash, m.conditions.len()
            );
        }
    }

    // 2) What does list_model_prices_for_scope return for upstream cost?
    let upstream = catalog.list_model_prices_for_scope(
        100001,
        0,
        "deepseek/deepseek-v4-flash",
        sdkwork_cloudrouter_router_service::domain::PriceSide::UpstreamCost,
        BillingMeter::LlmInputToken,
    );
    println!(
        "upstream candidates: {}",
        upstream
            .iter()
            .map(|p| format!(
                "{:?}@{} supplier={:?} account={:?}",
                p.unit_price, p.region_code, p.supplier_code, p.account_id
            ))
            .collect::<Vec<_>>()
            .join(", ")
    );

    // 3) Reproduce the selector's pricing resolution
    let resolution = PriceService::new().resolve(
        catalog.as_ref(),
        ResourceDefinition::new(
            "deepseek/deepseek-v4-flash",
            BillingMeter::LlmInputToken,
            chrono::Utc::now(),
        )
        .with_pricing_subject(1, Some(1150079326059387300))
        .with_provider("supplier-d7b1d3867c202b7f", Some(351306608665444352))
        .with_region_code("global")
        .with_model("deepseek-v4-flash")
        .with_api_code("openai.chat_completions"),
    );
    match resolution {
        Ok(r) => println!(
            "resolve ok status={:?} billability={:?} failure={:?} procurement={:?}",
            r.status,
            r.billability,
            r.failure.map(|f| (f.code, f.message)),
            r.resolved_price
                .as_ref()
                .and_then(|p| p.procurement_cost.clone())
        ),
        Err(e) => println!("resolve err: {e}"),
    }

    // 4) list_model_prices_for_scope_side for all sides
    for side in [
        sdkwork_cloudrouter_router_service::domain::PriceSide::OfficialReference,
        sdkwork_cloudrouter_router_service::domain::PriceSide::UpstreamCost,
        sdkwork_cloudrouter_router_service::domain::PriceSide::CustomerCharge,
    ] {
        let all = catalog.list_model_prices_for_scope_side(100001, 0, "deepseek/deepseek-v4-flash", side);
        println!(
            "side={:?} count={}",
            side,
            all.len()
        );
    }
}
