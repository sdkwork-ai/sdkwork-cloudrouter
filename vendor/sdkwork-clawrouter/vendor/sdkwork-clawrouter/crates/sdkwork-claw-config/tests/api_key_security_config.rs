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
