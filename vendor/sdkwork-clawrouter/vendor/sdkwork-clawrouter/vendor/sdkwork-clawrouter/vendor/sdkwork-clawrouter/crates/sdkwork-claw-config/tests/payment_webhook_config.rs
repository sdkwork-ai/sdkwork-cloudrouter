use sdkwork_claw_config::{PaymentWebhookConfig, RuntimeTomlConfig};

#[test]
fn payment_webhook_config_accepts_valid_secret_and_defaults() {
    let config = PaymentWebhookConfig::from_optional_parts(
        Some("payment-webhook-secret-0123456789abcdef".to_owned()),
        None,
    )
    .unwrap()
    .unwrap();

    assert_eq!(
        "payment-webhook-secret-0123456789abcdef",
        config.signing_secret()
    );
    assert_eq!(
        PaymentWebhookConfig::DEFAULT_MAX_CLOCK_SKEW_SECONDS,
        config.max_clock_skew_seconds()
    );
    assert_eq!(
        PaymentWebhookConfig::ENV_PAYMENT_WEBHOOK_SECRET,
        "SDKWORK_CLAW_PAYMENT_WEBHOOK_SECRET"
    );
}

#[test]
fn payment_webhook_config_rejects_missing_blank_short_and_invalid_skew() {
    assert_eq!(
        None,
        PaymentWebhookConfig::from_optional_parts(None, None).unwrap()
    );

    let blank =
        PaymentWebhookConfig::from_optional_parts(Some("   ".to_owned()), None).unwrap_err();
    assert!(blank.contains("SDKWORK_CLAW_PAYMENT_WEBHOOK_SECRET must not be blank"));

    let short =
        PaymentWebhookConfig::from_optional_parts(Some("too-short".to_owned()), None).unwrap_err();
    assert!(short.contains("SDKWORK_CLAW_PAYMENT_WEBHOOK_SECRET must be at least 32 characters"));

    let invalid_skew = PaymentWebhookConfig::from_optional_parts(
        Some("payment-webhook-secret-0123456789abcdef".to_owned()),
        Some("not-a-number".to_owned()),
    )
    .unwrap_err();
    assert!(invalid_skew.contains(
        "SDKWORK_CLAW_PAYMENT_WEBHOOK_MAX_CLOCK_SKEW_SECONDS must be a positive integer"
    ));

    let excessive_skew = PaymentWebhookConfig::from_optional_parts(
        Some("payment-webhook-secret-0123456789abcdef".to_owned()),
        Some((PaymentWebhookConfig::MAX_CLOCK_SKEW_SECONDS + 1).to_string()),
    )
    .unwrap_err();
    assert!(excessive_skew
        .contains("SDKWORK_CLAW_PAYMENT_WEBHOOK_MAX_CLOCK_SKEW_SECONDS must be at most 3600"));
}

#[test]
fn payment_webhook_config_debug_redacts_secret() {
    let config =
        PaymentWebhookConfig::from_signing_secret("payment-webhook-secret-0123456789abcdef")
            .unwrap();
    let debug = format!("{config:?}");

    assert!(debug.contains("[REDACTED]"));
    assert!(!debug.contains("payment-webhook-secret-0123456789abcdef"));
}

#[test]
fn reads_payment_webhook_config_from_runtime_toml_secret_file() {
    let secret_path = unique_secret_path("payment-webhook");
    std::fs::write(&secret_path, "payment-webhook-secret-0123456789abcdef\n").unwrap();
    let config = RuntimeTomlConfig::from_toml_str(&format!(
        r#"
[security]
payment_webhook_secret_file = "{}"
payment_webhook_max_clock_skew_seconds = 300
"#,
        secret_path.display().to_string().replace('\\', "/")
    ))
    .unwrap();

    let webhook = PaymentWebhookConfig::from_env_or_runtime_toml(Some(&config))
        .unwrap()
        .unwrap();

    assert_eq!(
        "payment-webhook-secret-0123456789abcdef",
        webhook.signing_secret()
    );
    assert_eq!(300, webhook.max_clock_skew_seconds());
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
