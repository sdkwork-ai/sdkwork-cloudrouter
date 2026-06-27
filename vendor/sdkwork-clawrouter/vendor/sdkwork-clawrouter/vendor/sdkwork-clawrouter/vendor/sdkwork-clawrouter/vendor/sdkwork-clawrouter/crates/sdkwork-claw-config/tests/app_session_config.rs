use sdkwork_claw_config::{AppSessionConfig, RuntimeTomlConfig};

#[test]
fn parses_app_session_config_without_leaking_secret() {
    let config = AppSessionConfig::from_optional_parts(
        Some("0123456789abcdef0123456789abcdef".to_owned()),
        Some("3600".to_owned()),
        Some("120".to_owned()),
    )
    .unwrap()
    .unwrap();

    assert_eq!(3600, config.session_ttl_seconds());
    assert_eq!(120, config.max_clock_skew_seconds());
    assert_eq!(32, config.signing_secret().len());
    assert!(!format!("{config:?}").contains("0123456789abcdef"));
}

#[test]
fn missing_app_session_secret_keeps_config_unset() {
    assert_eq!(
        None,
        AppSessionConfig::from_optional_parts(None, None, None).unwrap()
    );
}

#[test]
fn rejects_blank_short_or_invalid_app_session_config() {
    let blank =
        AppSessionConfig::from_optional_parts(Some("   ".to_owned()), None, None).unwrap_err();
    assert!(blank.contains("SDKWORK_CLAW_APP_SESSION_SECRET"));

    let short = AppSessionConfig::from_optional_parts(Some("too-short".to_owned()), None, None)
        .unwrap_err();
    assert!(short.contains("at least 32"));

    let invalid_ttl = AppSessionConfig::from_optional_parts(
        Some("0123456789abcdef0123456789abcdef".to_owned()),
        Some("0".to_owned()),
        None,
    )
    .unwrap_err();
    assert!(invalid_ttl.contains("SDKWORK_CLAW_APP_SESSION_TTL_SECONDS"));

    let excessive_ttl = AppSessionConfig::from_optional_parts(
        Some("0123456789abcdef0123456789abcdef".to_owned()),
        Some((AppSessionConfig::MAX_SESSION_TTL_SECONDS + 1).to_string()),
        None,
    )
    .unwrap_err();
    assert!(excessive_ttl.contains("at most"));

    let excessive_skew = AppSessionConfig::from_optional_parts(
        Some("0123456789abcdef0123456789abcdef".to_owned()),
        None,
        Some((AppSessionConfig::MAX_CLOCK_SKEW_SECONDS + 1).to_string()),
    )
    .unwrap_err();
    assert!(excessive_skew.contains("at most"));
}

#[test]
fn reads_app_session_config_from_runtime_toml_secret_file() {
    let secret_path = unique_secret_path("app-session");
    std::fs::write(&secret_path, "app-session-secret-0123456789abcd\n").unwrap();
    let config = RuntimeTomlConfig::from_toml_str(&format!(
        r#"
[security]
app_session_secret_file = "{}"
app_session_ttl_seconds = 7200
app_session_max_clock_skew_seconds = 90
"#,
        secret_path.display().to_string().replace('\\', "/")
    ))
    .unwrap();

    let session = AppSessionConfig::from_env_or_runtime_toml(Some(&config))
        .unwrap()
        .unwrap();

    assert_eq!(
        "app-session-secret-0123456789abcd",
        session.signing_secret()
    );
    assert_eq!(7200, session.session_ttl_seconds());
    assert_eq!(90, session.max_clock_skew_seconds());
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
