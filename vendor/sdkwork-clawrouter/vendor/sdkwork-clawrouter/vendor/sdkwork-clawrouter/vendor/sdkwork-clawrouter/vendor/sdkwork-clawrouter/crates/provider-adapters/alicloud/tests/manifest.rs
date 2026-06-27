#[test]
fn alicloud_adapter_exposes_provider_family_without_endpoint_claims() {
    let adapter = sdkwork_provider_adapter_alicloud::provider_adapter();

    assert_eq!("alicloud", adapter.package());
    assert_eq!("alicloud", adapter.provider_family());
    assert!(adapter.provider_codes().contains(&"alicloud"));
    assert!(adapter.provider_codes().contains(&"aliyun"));
    assert!(
        adapter.endpoints().is_empty(),
        "alicloud skeleton must not claim endpoint support until endpoint mapping tests exist"
    );
}

#[test]
fn alicloud_credentials_debug_redacts_access_key_secret() {
    let credentials =
        sdkwork_provider_adapter_alicloud::common::signer_v3::AliCloudCredentials::new(
            "access-key-id",
            "access-key-secret",
        );

    let debug = format!("{credentials:?}");

    assert!(debug.contains("access-key-id"));
    assert!(!debug.contains("access-key-secret"));
    assert!(debug.contains("[REDACTED]"));
}
