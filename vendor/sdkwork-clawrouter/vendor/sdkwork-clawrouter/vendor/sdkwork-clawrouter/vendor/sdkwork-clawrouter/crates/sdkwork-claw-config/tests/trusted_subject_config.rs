use sdkwork_claw_config::{RuntimeTomlConfig, TrustedSubjectConfig};

#[test]
fn parses_trusted_subject_config_without_leaking_secret() {
    let config = TrustedSubjectConfig::from_optional_parts(
        Some("0123456789abcdef0123456789abcdef".to_owned()),
        Some("120".to_owned()),
    )
    .unwrap()
    .unwrap();

    assert_eq!(120, config.max_clock_skew_seconds());
    assert_eq!(32, config.signing_secret().len());
    assert!(!format!("{config:?}").contains("0123456789abcdef"));
}

#[test]
fn missing_trusted_subject_secret_keeps_config_unset() {
    assert_eq!(
        None,
        TrustedSubjectConfig::from_optional_parts(None, None).unwrap()
    );
}

#[test]
fn rejects_blank_short_or_invalid_trusted_subject_config() {
    let blank =
        TrustedSubjectConfig::from_optional_parts(Some("   ".to_owned()), None).unwrap_err();
    assert!(blank.contains("SDKWORK_CLAW_TRUSTED_SUBJECT_SECRET"));

    let short =
        TrustedSubjectConfig::from_optional_parts(Some("too-short".to_owned()), None).unwrap_err();
    assert!(short.contains("at least 32"));

    let invalid_skew = TrustedSubjectConfig::from_optional_parts(
        Some("0123456789abcdef0123456789abcdef".to_owned()),
        Some("0".to_owned()),
    )
    .unwrap_err();
    assert!(invalid_skew.contains("SDKWORK_CLAW_TRUSTED_SUBJECT_MAX_CLOCK_SKEW_SECONDS"));

    let oversized_skew = TrustedSubjectConfig::from_optional_parts(
        Some("0123456789abcdef0123456789abcdef".to_owned()),
        Some("3601".to_owned()),
    )
    .unwrap_err();
    assert!(oversized_skew.contains("at most 3600"));
}

#[test]
fn reads_trusted_subject_config_from_runtime_toml_secret_file() {
    let secret_path = unique_secret_path("trusted-subject");
    std::fs::write(&secret_path, "trusted-subject-secret-0123456789\n").unwrap();
    let config = RuntimeTomlConfig::from_toml_str(&format!(
        r#"
[security]
trusted_subject_secret_file = "{}"
trusted_subject_max_clock_skew_seconds = 180
"#,
        secret_path.display().to_string().replace('\\', "/")
    ))
    .unwrap();

    let subject = TrustedSubjectConfig::from_env_or_runtime_toml(Some(&config))
        .unwrap()
        .unwrap();

    assert_eq!(
        "trusted-subject-secret-0123456789",
        subject.signing_secret()
    );
    assert_eq!(180, subject.max_clock_skew_seconds());
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
