use sdkwork_clawrouter_router_service::application::{
    ApiKeyAuthenticator, ApiKeySecretHasher, AuthenticateApiKeyQuery,
};
use sdkwork_clawrouter_router_service::domain::{
    DecimalValue, DomainResult, GatewayApiKey, Money, PriceSide, PricingPlan, UpstreamAccountGroup,
};
use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;

struct TestHasher;

impl ApiKeySecretHasher for TestHasher {
    fn hash_secret(&self, secret: &str) -> DomainResult<String> {
        Ok(format!("hash:{secret}"))
    }
}

#[test]
fn authenticates_api_key_by_hash_without_exposing_secret() {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_upstream_account_group(UpstreamAccountGroup::new(
        10,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.000000").unwrap(),
    ));
    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::parse("1.000000").unwrap(),
        Money::usd("0.000000").unwrap(),
    ));
    catalog.add_api_key(GatewayApiKey::new(
        100,
        10,
        "sk-live",
        "hash:sk-live-secret",
    ));
    let authenticator = ApiKeyAuthenticator::new(&catalog, &TestHasher);

    let context = authenticator
        .authenticate(AuthenticateApiKeyQuery {
            credential_secret: "sk-live-secret",
        })
        .unwrap();

    assert_eq!(100, context.api_key_id);
    assert_eq!(10, context.group_id);
    assert_eq!("standard-group", context.group_code);
    assert_eq!("standard", context.pricing_plan_code);
    assert!(!format!("{context:?}").contains("sk-live-secret"));
}

#[test]
fn rejects_unknown_api_key_hash_without_exposing_secret() {
    let catalog = InMemoryPricingCatalog::default();
    let authenticator = ApiKeyAuthenticator::new(&catalog, &TestHasher);

    let error = authenticator
        .authenticate(AuthenticateApiKeyQuery {
            credential_secret: "sk-missing-secret",
        })
        .unwrap_err();

    assert_eq!("api key credential is invalid", error.to_string());
    assert!(!format!("{error:?}").contains("sk-missing-secret"));
}
