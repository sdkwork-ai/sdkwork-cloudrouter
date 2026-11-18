use std::sync::{Mutex, OnceLock};

use sdkwork_cloudrouter_config::{RequestLimitsConfig, RuntimeTomlConfig};

#[test]
fn request_limits_config_uses_production_defaults_when_absent() {
    let _guard = env_guard().lock().unwrap();
    clear_request_limit_env();

    let config = RequestLimitsConfig::from_env_or_runtime_toml(None).unwrap();

    assert_eq!(128 * 1024, config.admin_app_json_body_max_bytes());
    assert_eq!(64 * 1024, config.admin_skill_json_body_max_bytes());
    // 25 MiB default covers official OpenAI multipart uploads (audio 25 MiB,
    // images/edits up to 50 MiB; operators may raise via env/toml).
    assert_eq!(25 * 1024 * 1024, config.gateway_invocation_body_max_bytes());
    // The outer backstop must clear the 60 s provider hop plus the billing,
    // usage and settlement stages; 30 s (the framework default) does not.
    assert_eq!(120_000, config.gateway_request_timeout_millis());
}

#[test]
fn gateway_request_timeout_outlives_the_default_provider_hop_timeout() {
    let _guard = env_guard().lock().unwrap();
    clear_request_limit_env();

    let config = RequestLimitsConfig::from_env_or_runtime_toml(None).unwrap();

    // The provider egress allows 60 s per hop
    // (`DEFAULT_PROVIDER_RESPONSE_TIMEOUT_MILLIS`) and the web framework's
    // production default backstop is 30 s. The gateway default must sit above
    // the provider hop, otherwise a long completion is cut by the transport
    // layer before the provider answers.
    assert!(
        config.gateway_request_timeout_millis() > 60_000,
        "a request-level backstop tighter than one provider hop cuts long completions with a 408"
    );
    assert!(
        config.gateway_request_timeout_millis() > 30_000,
        "the framework production default must not silence the provider budget"
    );
}

#[test]
fn request_limits_config_reads_runtime_toml_and_env_overrides() {
    let _guard = env_guard().lock().unwrap();
    clear_request_limit_env();
    let runtime_toml = RuntimeTomlConfig::from_toml_str(
        r#"
[request_limits]
admin_app_json_body_max_bytes = 262144
admin_skill_json_body_max_bytes = 98304
gateway_invocation_body_max_bytes = 2097152
gateway_request_timeout_millis = 900000
"#,
    )
    .unwrap();

    let config = RequestLimitsConfig::from_env_or_runtime_toml(Some(&runtime_toml)).unwrap();

    clear_request_limit_env();
    assert_eq!(262144, config.admin_app_json_body_max_bytes());
    assert_eq!(98304, config.admin_skill_json_body_max_bytes());
    assert_eq!(2097152, config.gateway_invocation_body_max_bytes());
    assert_eq!(900000, config.gateway_request_timeout_millis());
}

#[test]
fn request_limits_config_rejects_zero_limits() {
    let _guard = env_guard().lock().unwrap();
    clear_request_limit_env();
    let runtime_toml = RuntimeTomlConfig::from_toml_str(
        r#"
[request_limits]
gateway_invocation_body_max_bytes = 0
"#,
    )
    .unwrap();

    let error = RequestLimitsConfig::from_env_or_runtime_toml(Some(&runtime_toml)).unwrap_err();

    assert!(error.contains(RequestLimitsConfig::ENV_GATEWAY_INVOCATION_BODY_MAX_BYTES));

    let runtime_toml = RuntimeTomlConfig::from_toml_str(
        r#"
[request_limits]
gateway_request_timeout_millis = 0
"#,
    )
    .unwrap();

    let error = RequestLimitsConfig::from_env_or_runtime_toml(Some(&runtime_toml)).unwrap_err();

    assert!(error.contains(RequestLimitsConfig::ENV_GATEWAY_REQUEST_TIMEOUT_MILLIS));
}

fn clear_request_limit_env() {
    for name in [
        RequestLimitsConfig::ENV_ADMIN_APP_JSON_BODY_MAX_BYTES,
        RequestLimitsConfig::ENV_ADMIN_SKILL_JSON_BODY_MAX_BYTES,
        RequestLimitsConfig::ENV_GATEWAY_INVOCATION_BODY_MAX_BYTES,
        RequestLimitsConfig::ENV_GATEWAY_REQUEST_TIMEOUT_MILLIS,
    ] {
        std::env::remove_var(name);
    }
}

fn env_guard() -> &'static Mutex<()> {
    static ENV_GUARD: OnceLock<Mutex<()>> = OnceLock::new();
    ENV_GUARD.get_or_init(|| Mutex::new(()))
}
