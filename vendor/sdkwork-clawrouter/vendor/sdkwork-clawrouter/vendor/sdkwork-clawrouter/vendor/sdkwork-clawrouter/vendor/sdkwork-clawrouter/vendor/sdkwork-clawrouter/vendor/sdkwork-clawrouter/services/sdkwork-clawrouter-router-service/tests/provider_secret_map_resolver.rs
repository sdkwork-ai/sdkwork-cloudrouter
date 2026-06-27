use sdkwork_claw_config::ProviderSecretMapConfig;
use sdkwork_clawrouter_router_service::infrastructure::provider::{
    ProviderSecretMapResolver, RefreshableProviderSecretMapResolver,
};
use sdkwork_clawrouter_router_service::ports::ProviderSecretResolver;
use std::collections::BTreeMap;

#[test]
fn provider_secret_map_resolver_resolves_secret_values_without_debug_leak() {
    let config = ProviderSecretMapConfig::from_json(
        r#"{
            "vault://providers/openrouter/account/main": "sk-openrouter-provider-token",
            "env://providers/local/account/dev": "sk-local-provider-token"
        }"#,
    )
    .unwrap();
    let resolver = ProviderSecretMapResolver::from_config(config);

    assert_eq!(
        "sk-openrouter-provider-token",
        resolver
            .resolve_secret_value("vault://providers/openrouter/account/main")
            .unwrap()
    );
    assert_eq!(
        "sk-local-provider-token",
        resolver
            .resolve_secret_value(" env://providers/local/account/dev ")
            .unwrap()
    );
    assert!(!format!("{resolver:?}").contains("sk-openrouter-provider-token"));
    assert!(!format!("{resolver:?}").contains("sk-local-provider-token"));
    assert!(!format!("{resolver:?}").contains("bearer_tokens"));
}

#[test]
fn provider_secret_map_resolver_rejects_missing_secret_ref_without_leaking_values() {
    let config = ProviderSecretMapConfig::from_json(
        r#"{"vault://providers/openrouter/account/main": "sk-openrouter-provider-token"}"#,
    )
    .unwrap();
    let resolver = ProviderSecretMapResolver::from_config(config);

    let blank = resolver.resolve_secret_value("   ").unwrap_err();
    assert!(blank
        .to_string()
        .contains("provider secret_ref is required"));
    assert!(!blank.to_string().contains("sk-openrouter-provider-token"));

    let missing = resolver
        .resolve_secret_value("vault://providers/openrouter/account/missing")
        .unwrap_err();
    assert!(missing
        .to_string()
        .contains("provider secret_ref is not configured"));
    assert!(!missing.to_string().contains("sk-openrouter-provider-token"));
}

#[test]
fn provider_secret_map_resolver_combines_external_and_managed_provider_account_secrets() {
    let config = ProviderSecretMapConfig::from_json(
        r#"{"vault://providers/openrouter/account/main": "sk-openrouter-provider-token"}"#,
    )
    .unwrap();
    let mut managed = BTreeMap::new();
    managed.insert(
        "secret://provider-accounts/openai/managed".to_owned(),
        "sk-managed-openai-provider-token".to_owned(),
    );
    let resolver = ProviderSecretMapResolver::from_config_and_managed_secrets(config, managed);

    assert_eq!(
        "sk-openrouter-provider-token",
        resolver
            .resolve_secret_value("vault://providers/openrouter/account/main")
            .unwrap()
    );
    assert_eq!(
        "sk-managed-openai-provider-token",
        resolver
            .resolve_secret_value("secret://provider-accounts/openai/managed")
            .unwrap()
    );
    assert!(!format!("{resolver:?}").contains("sk-managed-openai-provider-token"));
}

#[test]
fn refreshable_provider_secret_map_resolver_refreshes_managed_provider_account_secrets() {
    let config = ProviderSecretMapConfig::from_json(
        r#"{"vault://providers/openrouter/account/main": "sk-openrouter-provider-token"}"#,
    )
    .unwrap();
    let resolver =
        RefreshableProviderSecretMapResolver::from_maps(config.into_secret_map(), BTreeMap::new());

    assert!(resolver
        .resolve_secret_value("secret://provider-accounts/openai/new")
        .is_err());

    let mut managed = BTreeMap::new();
    managed.insert(
        "secret://provider-accounts/openai/new".to_owned(),
        "sk-new-managed-token".to_owned(),
    );
    resolver.replace_managed_secrets(managed);

    assert_eq!(
        "sk-new-managed-token",
        resolver
            .resolve_secret_value("secret://provider-accounts/openai/new")
            .unwrap()
    );
    assert_eq!(
        "sk-openrouter-provider-token",
        resolver
            .resolve_secret_value("vault://providers/openrouter/account/main")
            .unwrap()
    );
    assert!(!format!("{resolver:?}").contains("sk-new-managed-token"));
}
