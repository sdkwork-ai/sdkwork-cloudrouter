//! 轮换 API Key pepper 不能让已签发的 key 失效。
//!
//! 鉴权是按哈希查行（`find_api_key_by_hash`），所以只换 pepper 会让旧哈希查不到
//! 任何行——所有存量 key 立即 401。这里验证 ring：活跃 pepper 生成新哈希，退役
//! pepper 仍被探测，旧 key 继续可用；错误 secret 依旧失败。

use sdkwork_cloudrouter_router_service::application::{
    ApiKeyAuthenticator, ApiKeySecretHasher, AuthenticateApiKeyQuery,
};
use sdkwork_cloudrouter_router_service::domain::{
    DecimalValue, GatewayApiKey, Money, UpstreamAccountGroup,
};
use sdkwork_cloudrouter_router_service::infrastructure::crypto::HmacSha256ApiKeySecretHasher;
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;

const TENANT_ID: i64 = 10;
const ORGANIZATION_ID: i64 = 20;
const ACCOUNT_GROUP_ID: i64 = 10;
const API_KEY_ID: i64 = 100;
const RETIRED_PEPPER: &str = "11111111111111111111111111111111";
const ACTIVE_PEPPER: &str = "22222222222222222222222222222222";
const RAW_KEY: &str = "sk-live-key-0123456789abcdef";

fn catalog_with_legacy_key(legacy_hash: &str) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
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
        GatewayApiKey::new(API_KEY_ID, ACCOUNT_GROUP_ID, "legacy key", legacy_hash).with_owner(
            TENANT_ID,
            ORGANIZATION_ID,
            30,
        ),
    );
    // `Money` keeps the domain import honest: the group fees above are rates,
    // and this mirrors the billing fixtures' price shape.
    let _ = Money::usd("0.000000").unwrap();
    catalog
}

#[test]
fn a_key_hashed_before_the_rotation_still_authenticates() {
    let legacy_hasher = HmacSha256ApiKeySecretHasher::new(RETIRED_PEPPER).expect("legacy hasher");
    let legacy_hash = legacy_hasher.hash_secret(RAW_KEY).expect("legacy hash");
    let catalog = catalog_with_legacy_key(&legacy_hash);

    let hasher =
        HmacSha256ApiKeySecretHasher::with_key_ring(ACTIVE_PEPPER, vec![RETIRED_PEPPER.to_owned()])
            .expect("ring");
    let authenticator = ApiKeyAuthenticator::new(&catalog, &hasher);

    let context = authenticator
        .authenticate(AuthenticateApiKeyQuery {
            credential_secret: RAW_KEY,
        })
        .expect("a key hashed with the retired pepper must still authenticate");
    assert_eq!(API_KEY_ID, context.api_key_id);
    assert_eq!(TENANT_ID, context.tenant_id);
}

#[test]
fn a_wrong_secret_still_fails_under_the_ring() {
    let legacy_hasher = HmacSha256ApiKeySecretHasher::new(RETIRED_PEPPER).expect("legacy hasher");
    let legacy_hash = legacy_hasher.hash_secret(RAW_KEY).expect("legacy hash");
    let catalog = catalog_with_legacy_key(&legacy_hash);

    let hasher =
        HmacSha256ApiKeySecretHasher::with_key_ring(ACTIVE_PEPPER, vec![RETIRED_PEPPER.to_owned()])
            .expect("ring");
    let authenticator = ApiKeyAuthenticator::new(&catalog, &hasher);

    assert!(authenticator
        .authenticate(AuthenticateApiKeyQuery {
            credential_secret: "sk-not-the-key",
        })
        .is_err());
}

#[test]
fn new_keys_are_hashed_with_the_active_pepper_only() {
    let hasher =
        HmacSha256ApiKeySecretHasher::with_key_ring(ACTIVE_PEPPER, vec![RETIRED_PEPPER.to_owned()])
            .expect("ring");
    let retired_hasher = HmacSha256ApiKeySecretHasher::new(RETIRED_PEPPER).expect("retired hasher");

    assert_ne!(
        retired_hasher.hash_secret(RAW_KEY).expect("retired hash"),
        hasher.hash_secret(RAW_KEY).expect("active hash"),
        "new keys must not be hashed with a retired pepper"
    );
    assert_eq!(
        hasher.hash_secret(RAW_KEY).expect("active hash"),
        hasher.candidate_hashes(RAW_KEY).expect("candidates")[0],
        "the active generation is always probed first"
    );
}
