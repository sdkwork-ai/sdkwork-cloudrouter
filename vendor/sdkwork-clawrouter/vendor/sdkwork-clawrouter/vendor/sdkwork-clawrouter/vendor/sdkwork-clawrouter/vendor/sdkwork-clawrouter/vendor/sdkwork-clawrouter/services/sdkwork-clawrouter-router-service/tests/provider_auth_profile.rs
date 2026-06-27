use sdkwork_clawrouter_router_service::domain::{ProviderAuthProfile, ProviderAuthType};

#[test]
fn standard_api_key_with_configured_name_uses_header_auth_for_unknown_provider() {
    let profile = ProviderAuthProfile::from_account_config(
        "custom_vendor",
        Some("Standard API Key"),
        Some(r#"{"name":"x-custom-api-key"}"#),
    )
    .unwrap();

    assert_eq!(ProviderAuthType::Header, profile.auth_type);
    assert_eq!(Some("x-custom-api-key"), profile.name.as_deref());
}

#[test]
fn standard_api_key_uses_vendor_default_header_for_google() {
    let profile =
        ProviderAuthProfile::from_account_config("google", Some("Standard API Key"), None).unwrap();

    assert_eq!(ProviderAuthType::Header, profile.auth_type);
    assert_eq!(Some("x-goog-api-key"), profile.name.as_deref());
}

#[test]
fn header_auth_rejects_invalid_header_name_before_runtime_forwarding() {
    let error = ProviderAuthProfile::from_account_config(
        "custom_vendor",
        Some("header"),
        Some(r#"{"name":"bad header"}"#),
    )
    .unwrap_err();

    assert!(error.to_string().contains("auth header name is invalid"));
}

#[test]
fn default_headers_reject_blank_value_before_runtime_forwarding() {
    let error = ProviderAuthProfile::from_account_config(
        "custom_vendor",
        Some("bearer"),
        Some(r#"{"defaultHeaders":{"x-provider-version":"  "}}"#),
    )
    .unwrap_err();

    assert!(error
        .to_string()
        .contains("defaultHeaders.x-provider-version"));
    assert!(error.to_string().contains("must not be blank"));
}
