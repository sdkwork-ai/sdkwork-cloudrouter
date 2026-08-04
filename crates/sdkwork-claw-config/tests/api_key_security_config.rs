use sdkwork_claw_config::{ApiKeySecurityConfig, RuntimeTomlConfig};

#[test]
fn parses_api_key_pepper_config_without_leaking_secret() {
    let config = ApiKeySecurityConfig::from_optional_parts(Some(
        "0123456789abcdef0123456789abcdef".to_owned(),
    ))
    .unwrap()
    .unwrap();

    assert_eq!(32, config.pepper_secret().len());
    assert!(!format!("{config:?}").contains("0123456789abcdef"));
}

#[test]
fn missing_api_key_pepper_keeps_config_unset() {
    assert_eq!(
        None,
        ApiKeySecurityConfig::from_optional_parts(None).unwrap()
    );
}

#[test]
fn rejects_blank_or_short_api_key_pepper() {
    let blank = ApiKeySecurityConfig::from_optional_parts(Some("   ".to_owned())).unwrap_err();
    assert!(blank.contains("SDKWORK_CLAW_API_KEY_PEPPER"));

    let short =
        ApiKeySecurityConfig::from_optional_parts(Some("too-short".to_owned())).unwrap_err();
    assert!(short.contains("at least 32"));
}

#[test]
fn reads_api_key_pepper_from_runtime_toml_secret_file() {
    let secret_path = unique_secret_path("api-key-pepper");
    std::fs::write(&secret_path, "0123456789abcdef0123456789abcdef\n").unwrap();
    let config = RuntimeTomlConfig::from_toml_str(&format!(
        r#"
[security]
api_key_pepper_file = "{}"
"#,
        secret_path.display().to_string().replace('\\', "/")
    ))
    .unwrap();

    let security = ApiKeySecurityConfig::from_env_or_runtime_toml(Some(&config))
        .unwrap()
        .unwrap();

    assert_eq!("0123456789abcdef0123456789abcdef", security.pepper_secret());
    let _ = std::fs::remove_file(secret_path);
}

fn unique_secret_path(name: &str) -> std::path::PathBuf {
    std::env::temp_dir().join(format!(
        "clawrouter-{name}-{}-{}.secret",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ))
}

#[test]
fn api_key_secret_storage_mode_defaults_to_plaintext() {
    let config = ApiKeySecurityConfig::from_optional_parts(Some(
        "0123456789abcdef0123456789abcdef".to_owned(),
    ))
    .unwrap()
    .unwrap();

    assert_eq!(
        sdkwork_claw_config::ApiKeySecretStorageMode::Plaintext,
        config.secret_storage_mode()
    );
    assert!(!config.secret_storage_mode().is_ciphertext());
}

#[test]
fn api_key_secret_storage_mode_parses_explicit_values() {
    let ciphertext = ApiKeySecurityConfig::from_parts(
        "0123456789abcdef0123456789abcdef",
        sdkwork_claw_config::ApiKeySecretStorageMode::Ciphertext,
    )
    .unwrap();
    assert!(ciphertext.secret_storage_mode().is_ciphertext());
    assert_eq!("ciphertext", ciphertext.secret_storage_mode().as_str());

    let plaintext = ApiKeySecurityConfig::from_parts(
        "0123456789abcdef0123456789abcdef",
        sdkwork_claw_config::ApiKeySecretStorageMode::Plaintext,
    )
    .unwrap();
    assert_eq!("plaintext", plaintext.secret_storage_mode().as_str());
}

#[test]
fn api_key_secret_storage_mode_reads_env_var_and_rejects_invalid_values() {
    std::env::set_var(ApiKeySecurityConfig::ENV_API_KEY_PEPPER, "0123456789abcdef0123456789abcdef");
    std::env::set_var(
        sdkwork_claw_config::ApiKeySecretStorageMode::ENV_SECRET_STORAGE,
        "ciphertext",
    );
    let config = ApiKeySecurityConfig::from_env().unwrap().unwrap();
    assert!(config.secret_storage_mode().is_ciphertext());
    std::env::remove_var(sdkwork_claw_config::ApiKeySecretStorageMode::ENV_SECRET_STORAGE);

    std::env::set_var(
        sdkwork_claw_config::ApiKeySecretStorageMode::ENV_SECRET_STORAGE,
        "encrypted",
    );
    let error = ApiKeySecurityConfig::from_env().unwrap_err();
    assert!(error.contains("plaintext"));
    assert!(error.contains("ciphertext"));
    std::env::remove_var(sdkwork_claw_config::ApiKeySecretStorageMode::ENV_SECRET_STORAGE);
    std::env::remove_var(ApiKeySecurityConfig::ENV_API_KEY_PEPPER);
}

#[test]
fn api_key_secret_storage_mode_reads_runtime_toml_field() {
    let config = RuntimeTomlConfig::from_toml_str(
        r#"
[security]
api_key_pepper = "0123456789abcdef0123456789abcdef"
api_key_secret_storage = "ciphertext"
"#,
    )
    .unwrap();

    let security = ApiKeySecurityConfig::from_env_or_runtime_toml(Some(&config))
        .unwrap()
        .unwrap();

    assert!(security.secret_storage_mode().is_ciphertext());
}

#[test]
fn api_key_security_config_debug_redacts_pepper_but_keeps_mode() {
    let config = ApiKeySecurityConfig::from_parts(
        "0123456789abcdef0123456789abcdef",
        sdkwork_claw_config::ApiKeySecretStorageMode::Ciphertext,
    )
    .unwrap();
    let debug = format!("{config:?}");

    assert!(!debug.contains("0123456789abcdef"));
    assert!(debug.contains("Ciphertext"));
}
