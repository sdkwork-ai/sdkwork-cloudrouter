use sdkwork_clawrouter_router_service::application::ApiKeySecretHasher;
use sdkwork_clawrouter_router_service::infrastructure::crypto::HmacSha256ApiKeySecretHasher;

#[test]
fn hmac_api_key_secret_hasher_matches_sha256_vector() {
    let hasher = HmacSha256ApiKeySecretHasher::new("key").unwrap();

    let digest = hasher
        .hash_secret("The quick brown fox jumps over the lazy dog")
        .unwrap();

    assert_eq!(
        "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
        digest
    );
}

#[test]
fn hmac_api_key_secret_hasher_rejects_empty_pepper_and_redacts_debug() {
    assert!(HmacSha256ApiKeySecretHasher::new(" ").is_err());

    let hasher = HmacSha256ApiKeySecretHasher::new("secret-pepper-value").unwrap();
    let debug = format!("{hasher:?}");

    assert!(debug.contains("HmacSha256ApiKeySecretHasher"));
    assert!(!debug.contains("secret-pepper-value"));
}
