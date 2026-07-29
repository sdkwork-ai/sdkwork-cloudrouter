use sdkwork_claw_config::{InternalGatewaySecurityConfig, RuntimeTomlConfig};

const TEST_SECRET: &str = "internal-gateway-test-signing-secret-0123456789";

#[test]
fn parses_internal_gateway_security_config_without_leaking_secret() {
    let config = InternalGatewaySecurityConfig::from_parts(
        TEST_SECRET,
        Some("30".to_owned()),
        Some("5".to_owned()),
    )
    .unwrap();

    assert_eq!(30, config.request_ttl_seconds());
    assert_eq!(5, config.max_clock_skew_seconds());
    assert!(!format!("{config:?}").contains(TEST_SECRET));
}

#[test]
fn rejects_weak_or_unbounded_internal_gateway_config() {
    let short = InternalGatewaySecurityConfig::from_signing_secret("too-short").unwrap_err();
    assert!(short.contains("at least 32"));

    let ttl = InternalGatewaySecurityConfig::from_parts(TEST_SECRET, Some("121".to_owned()), None)
        .unwrap_err();
    assert!(ttl.contains("at most 120"));

    let skew = InternalGatewaySecurityConfig::from_parts(TEST_SECRET, None, Some("61".to_owned()))
        .unwrap_err();
    assert!(skew.contains("at most 60"));
}

#[test]
fn reads_internal_gateway_secret_from_runtime_toml_file() {
    let secret_path = unique_secret_path("internal-gateway-signing");
    std::fs::write(&secret_path, format!("{TEST_SECRET}\n")).unwrap();
    let config = RuntimeTomlConfig::from_toml_str(&format!(
        r#"
[security]
internal_gateway_signing_secret_file = "{}"
internal_gateway_request_ttl_seconds = 45
internal_gateway_max_clock_skew_seconds = 7
"#,
        secret_path.display().to_string().replace('\\', "/")
    ))
    .unwrap();

    let security = InternalGatewaySecurityConfig::from_env_or_runtime_toml(Some(&config))
        .unwrap()
        .unwrap();

    assert_eq!(TEST_SECRET, security.signing_secret());
    assert_eq!(45, security.request_ttl_seconds());
    assert_eq!(7, security.max_clock_skew_seconds());
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
