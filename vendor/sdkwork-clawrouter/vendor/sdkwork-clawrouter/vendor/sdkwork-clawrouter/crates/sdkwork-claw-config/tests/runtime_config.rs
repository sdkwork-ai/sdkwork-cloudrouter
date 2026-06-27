use sdkwork_claw_config::{DeploymentMode, RuntimeConfig, RuntimeTomlConfig};

#[test]
fn runtime_config_uses_default_bind_and_desktop_mode_when_env_parts_are_absent() {
    let config = RuntimeConfig::from_optional_parts(
        "sdkwork-clawrouter-cloud-gateway",
        "SDKWORK_CLAW_GATEWAY_BIND",
        "0.0.0.0:18080",
        None,
        None,
    )
    .unwrap();

    assert_eq!("sdkwork-clawrouter-cloud-gateway", config.service_name);
    assert_eq!(DeploymentMode::Desktop, config.deployment_mode);
    assert_eq!("0.0.0.0:18080", config.bind_addr);
}

#[test]
fn runtime_config_accepts_service_bind_override_and_kubernetes_alias() {
    let config = RuntimeConfig::from_optional_parts(
        "sdkwork-clawrouter-cloud-gateway",
        "SDKWORK_CLAW_GATEWAY_BIND",
        "0.0.0.0:18080",
        Some("127.0.0.1:19090".to_owned()),
        Some("k8s".to_owned()),
    )
    .unwrap();

    assert_eq!(DeploymentMode::Kubernetes, config.deployment_mode);
    assert_eq!("127.0.0.1:19090", config.bind_addr);
}

#[test]
fn runtime_config_rejects_blank_or_invalid_bind_address() {
    let blank = RuntimeConfig::from_optional_parts(
        "sdkwork-clawrouter-cloud-gateway",
        "SDKWORK_CLAW_GATEWAY_BIND",
        "0.0.0.0:18080",
        Some("   ".to_owned()),
        None,
    )
    .unwrap_err();
    assert!(blank.contains("SDKWORK_CLAW_GATEWAY_BIND"));

    let invalid = RuntimeConfig::from_optional_parts(
        "sdkwork-clawrouter-cloud-gateway",
        "SDKWORK_CLAW_GATEWAY_BIND",
        "0.0.0.0:18080",
        Some("not-a-socket".to_owned()),
        None,
    )
    .unwrap_err();
    assert!(invalid.contains("valid socket address"));
}

#[test]
fn runtime_config_rejects_invalid_deployment_mode() {
    let error = RuntimeConfig::from_optional_parts(
        "sdkwork-clawrouter-cloud-gateway",
        "SDKWORK_CLAW_GATEWAY_BIND",
        "0.0.0.0:18080",
        None,
        Some("lambda".to_owned()),
    )
    .unwrap_err();

    assert!(error.contains("SDKWORK_CLAW_DEPLOYMENT_MODE"));
}

#[test]
fn runtime_toml_config_reads_operational_sections() {
    let config = RuntimeTomlConfig::from_toml_str(
        r#"
[runtime]
deployment_mode = "server"

[services.gateway]
bind = "0.0.0.0:18080"

[services.admin_api]
bind = "0.0.0.0:18081"

[services.app_api]
bind = "0.0.0.0:18082"

[services.provider_adapter]
bind = "0.0.0.0:39110"

[server]
bind = "0.0.0.0:3900"
external_scheme = "https"
trust_forwarded_headers = true

[edge]
enabled = true
gateway_base_url = "http://gateway.internal:18080"
backend_api_base_url = "http://admin.internal:18081"
app_api_base_url = "http://app.internal:18082"
portal_base_url = "http://portal.internal:3901"
portal_static_dist = "/opt/sdkwork/router/portal/dist"
csp_connect_src = "https://api.example.com"
cors_allowed_origins = ["https://portal.example.com", "https://admin.example.com"]
upstream_request_timeout_millis = 45000
upstream_ready_timeout_millis = 3500

[portal.public]
sdk_base_url = "https://public-sdk.example.com/router"
api_base_url = "/v1"
open_api_base_url = "/v1"
app_api_base_url = "/app/v3/api"
backend_api_base_url = "/backend/v3/api"
appbase_backend_api_base_url = "https://appbase.internal/backend/v3/api"
tool_api_enabled = false

[portal.static]
html_cache_control = "no-store"
asset_cache_control = "public, max-age=604800, immutable"

[portal.security]
hsts_enabled = true
hsts_max_age_seconds = 31536000
hsts_include_subdomains = true
hsts_preload = false
csp_frame_src = ["https://player.example.com", "https://video.example.com"]

[portal.tools]
rate_limit_requests = 120
rate_limit_window_seconds = 60
max_body_bytes = 2097152
sdk_archive_root = "/opt/sdkwork/router/portal/dist/sdk-archives"
sdk_generator_base_url = "https://sdk-generator.internal"
sdk_generator_api_key_file = "/etc/sdkwork/router/sdk-generator.secret"

[paths]
data_directory = "/var/lib/sdkwork/router"

[request_limits]
admin_app_json_body_max_bytes = 131072
admin_skill_json_body_max_bytes = 65536
payment_callback_body_max_bytes = 65536

[observability]
log_filter = "info,sdkwork_claw=debug"
log_format = "json"
log_ansi = false
log_target = true
log_thread_names = true
log_thread_ids = false

[redis]
enabled = true
host = "redis.internal"
port = 6380
database = 3
username = "clawrouter"
password_file = "/etc/sdkwork/router/redis.secret"
key_prefix = "clawrouter-prod"
tls = true
max_connections = 32
connect_timeout_millis = 2500
command_timeout_millis = 1500
pool_idle_timeout_seconds = 120

[security]
api_key_pepper_file = "/etc/sdkwork/router/api-key-pepper.secret"
trusted_subject_secret_file = "/etc/sdkwork/router/trusted-subject.secret"
trusted_subject_max_clock_skew_seconds = 120
app_session_secret_file = "/etc/sdkwork/router/app-session.secret"
app_session_ttl_seconds = 86400
app_session_max_clock_skew_seconds = 120
payment_webhook_secret_file = "/etc/sdkwork/router/payment-webhook.secret"
payment_webhook_max_clock_skew_seconds = 600

[provider_relay.openai]
base_url = "https://provider-relay.internal/v1"
bearer_token_file = "/etc/sdkwork/router/openai-relay.secret"

[provider_relay.runtime]
response_timeout_millis = 120000
health_probe_timeout_millis = 10000
catalog_refresh_interval_millis = 5000
circuit_breaker_recovery_window_millis = 60000
failure_strategy = "fail_closed"

[provider_relay.retry]
max_attempts = 2
retryable_status_codes = [429, 500, 502, 503, 504]
backoff_millis = 250

[provider_relay.passthrough.google]
base_url = "https://generativelanguage.googleapis.com"
auth_type = "header"
auth_name = "x-goog-api-key"
auth_value_file = "/etc/sdkwork/router/google-provider.secret"

[provider_relay.passthrough.google.default_headers]
x-goog-api-client = "clawrouter"

[provider_adapter]
adapter_base_url = "http://provider-adapter.internal:39110"
manifest_file = "/etc/sdkwork/router/provider-adapter-manifest.json"
gateway_token_file = "/etc/sdkwork/router/provider-adapter-token.secret"

[provider_secret_map]
json_file = "/etc/sdkwork/router/provider-secrets.json"

[usage_settlement]
enabled = true
tenant_id = 100001
organization_id = 0
batch_size = 50
interval_millis = 30000

[model_ranking]
enabled = true
tenant_id = 100001
organization_id = 0
rank_scope = "global"
snapshot_period = "daily"
limit = 200
lookback_days = 7
interval_millis = 3600000
cache_max_age_seconds = 60
run_timeout_millis = 300000
max_retry_attempts = 2
retry_backoff_millis = 1000
run_on_startup = true
alert_after_consecutive_failures = 3

[install]
environment = "production"
seed_profile = "commercial"
models_catalog_root = "/opt/sdkwork/router/catalog"
startup_mode = "ensure"

[bootstrap_admin]
enabled = true
username = "admin"
display_name = "Administrator"
email = "admin@sdkwork.com"
password_file = "/etc/sdkwork/router/bootstrap-admin.secret"
"#,
    )
    .unwrap();

    assert_eq!(Some("server"), config.runtime.deployment_mode.as_deref());
    assert_eq!(
        Some("0.0.0.0:18080"),
        config.services.gateway.bind.as_deref()
    );
    assert_eq!(
        Some("0.0.0.0:18081"),
        config.services.admin_api.bind.as_deref()
    );
    assert_eq!(
        Some("0.0.0.0:18082"),
        config.services.app_api.bind.as_deref()
    );
    assert_eq!(
        Some("0.0.0.0:39110"),
        config.services.provider_adapter.bind.as_deref()
    );
    assert_eq!(Some("0.0.0.0:3900"), config.server.bind.as_deref());
    assert_eq!(Some("https"), config.server.external_scheme.as_deref());
    assert_eq!(Some(true), config.server.trust_forwarded_headers);
    assert_eq!(Some(true), config.edge.enabled);
    assert_eq!(
        Some("http://gateway.internal:18080"),
        config.edge.gateway_base_url.as_deref()
    );
    assert_eq!(
        Some("http://admin.internal:18081"),
        config.edge.backend_api_base_url.as_deref()
    );
    assert_eq!(
        Some("http://app.internal:18082"),
        config.edge.app_api_base_url.as_deref()
    );
    assert_eq!(
        Some("http://portal.internal:3901"),
        config.edge.portal_base_url.as_deref()
    );
    assert_eq!(
        Some("/opt/sdkwork/router/portal/dist"),
        config.edge.portal_static_dist.as_deref()
    );
    assert_eq!(
        Some("https://api.example.com"),
        config.edge.csp_connect_src.as_deref()
    );
    assert_eq!(
        vec!["https://portal.example.com", "https://admin.example.com"],
        config.edge.cors_allowed_origins
    );
    assert_eq!(Some(45000), config.edge.upstream_request_timeout_millis);
    assert_eq!(Some(3500), config.edge.upstream_ready_timeout_millis);
    assert_eq!(Some("/v1"), config.portal.public.api_base_url.as_deref());
    assert_eq!(
        Some("https://public-sdk.example.com/router"),
        config.portal.public.sdk_base_url.as_deref()
    );
    assert_eq!(
        Some("/backend/v3/api"),
        config.portal.public.backend_api_base_url.as_deref()
    );
    assert_eq!(
        Some("https://appbase.internal/backend/v3/api"),
        config.portal.public.appbase_backend_api_base_url.as_deref()
    );
    assert_eq!(Some(false), config.portal.public.tool_api_enabled);
    assert_eq!(
        Some("no-store"),
        config.portal.static_assets.html_cache_control.as_deref()
    );
    assert_eq!(
        Some("public, max-age=604800, immutable"),
        config.portal.static_assets.asset_cache_control.as_deref()
    );
    assert_eq!(Some(true), config.portal.security.hsts_enabled);
    assert_eq!(Some(31536000), config.portal.security.hsts_max_age_seconds);
    assert_eq!(Some(true), config.portal.security.hsts_include_subdomains);
    assert_eq!(Some(false), config.portal.security.hsts_preload);
    assert_eq!(
        Some(vec![
            "https://player.example.com".to_owned(),
            "https://video.example.com".to_owned()
        ]),
        config.portal.security.csp_frame_src
    );
    assert_eq!(Some(120), config.portal.tools.rate_limit_requests);
    assert_eq!(Some(60), config.portal.tools.rate_limit_window_seconds);
    assert_eq!(Some(2097152), config.portal.tools.max_body_bytes);
    assert_eq!(
        Some("/opt/sdkwork/router/portal/dist/sdk-archives"),
        config.portal.tools.sdk_archive_root.as_deref()
    );
    assert_eq!(
        Some("https://sdk-generator.internal"),
        config.portal.tools.sdk_generator_base_url.as_deref()
    );
    assert_eq!(
        Some("/etc/sdkwork/router/sdk-generator.secret"),
        config.portal.tools.sdk_generator_api_key_file.as_deref()
    );
    assert_eq!(
        Some("/var/lib/sdkwork/router"),
        config.paths.data_directory.as_deref()
    );
    assert_eq!(
        Some(131072),
        config.request_limits.admin_app_json_body_max_bytes
    );
    assert_eq!(
        Some(65536),
        config.request_limits.admin_skill_json_body_max_bytes
    );
    assert_eq!(
        Some(65536),
        config.request_limits.payment_callback_body_max_bytes
    );
    assert_eq!(
        Some("info,sdkwork_claw=debug"),
        config.observability.log_filter.as_deref()
    );
    assert_eq!(Some("json"), config.observability.log_format.as_deref());
    assert_eq!(Some(false), config.observability.log_ansi);
    assert_eq!(Some(true), config.observability.log_target);
    assert_eq!(Some(true), config.observability.log_thread_names);
    assert_eq!(Some(false), config.observability.log_thread_ids);
    assert_eq!(Some(true), config.redis.enabled);
    assert_eq!(Some("redis.internal"), config.redis.host.as_deref());
    assert_eq!(Some(6380), config.redis.port);
    assert_eq!(Some(3), config.redis.database);
    assert_eq!(Some("clawrouter"), config.redis.username.as_deref());
    assert_eq!(
        Some("/etc/sdkwork/router/redis.secret"),
        config.redis.password_file.as_deref()
    );
    assert_eq!(Some("clawrouter-prod"), config.redis.key_prefix.as_deref());
    assert_eq!(Some(true), config.redis.tls);
    assert_eq!(Some(32), config.redis.max_connections);
    assert_eq!(Some(2500), config.redis.connect_timeout_millis);
    assert_eq!(Some(1500), config.redis.command_timeout_millis);
    assert_eq!(Some(120), config.redis.pool_idle_timeout_seconds);
    assert_eq!(
        Some("/etc/sdkwork/router/api-key-pepper.secret"),
        config.security.api_key_pepper_file.as_deref()
    );
    assert_eq!(
        Some("/etc/sdkwork/router/trusted-subject.secret"),
        config.security.trusted_subject_secret_file.as_deref()
    );
    assert_eq!(
        Some(120),
        config.security.trusted_subject_max_clock_skew_seconds
    );
    assert_eq!(
        Some("/etc/sdkwork/router/app-session.secret"),
        config.security.app_session_secret_file.as_deref()
    );
    assert_eq!(Some(86400), config.security.app_session_ttl_seconds);
    assert_eq!(
        Some(120),
        config.security.app_session_max_clock_skew_seconds
    );
    assert_eq!(
        Some("/etc/sdkwork/router/payment-webhook.secret"),
        config.security.payment_webhook_secret_file.as_deref()
    );
    assert_eq!(
        Some(600),
        config.security.payment_webhook_max_clock_skew_seconds
    );
    assert_eq!(
        Some("https://provider-relay.internal/v1"),
        config.provider_relay.openai.base_url.as_deref()
    );
    assert_eq!(
        Some("/etc/sdkwork/router/openai-relay.secret"),
        config.provider_relay.openai.bearer_token_file.as_deref()
    );
    assert_eq!(
        Some(120000),
        config.provider_relay.runtime.response_timeout_millis
    );
    assert_eq!(
        Some(10000),
        config.provider_relay.runtime.health_probe_timeout_millis
    );
    assert_eq!(
        Some(5000),
        config
            .provider_relay
            .runtime
            .catalog_refresh_interval_millis
    );
    assert_eq!(
        Some(60000),
        config
            .provider_relay
            .runtime
            .circuit_breaker_recovery_window_millis
    );
    assert_eq!(
        Some("fail_closed"),
        config.provider_relay.runtime.failure_strategy.as_deref()
    );
    assert_eq!(Some(2), config.provider_relay.retry.max_attempts);
    assert_eq!(
        vec![429, 500, 502, 503, 504],
        config.provider_relay.retry.retryable_status_codes
    );
    assert_eq!(Some(250), config.provider_relay.retry.backoff_millis);
    let google = config
        .provider_relay
        .passthrough
        .get("google")
        .expect("google passthrough provider");
    assert_eq!(
        Some("https://generativelanguage.googleapis.com"),
        google.base_url.as_deref()
    );
    assert_eq!(Some("header"), google.auth_type.as_deref());
    assert_eq!(Some("x-goog-api-key"), google.auth_name.as_deref());
    assert_eq!(
        Some("/etc/sdkwork/router/google-provider.secret"),
        google.auth_value_file.as_deref()
    );
    assert_eq!(
        Some("clawrouter"),
        google
            .default_headers
            .get("x-goog-api-client")
            .map(String::as_str)
    );
    assert_eq!(
        Some("http://provider-adapter.internal:39110"),
        config.provider_adapter.adapter_base_url.as_deref()
    );
    assert_eq!(
        Some("/etc/sdkwork/router/provider-adapter-manifest.json"),
        config.provider_adapter.manifest_file.as_deref()
    );
    assert_eq!(
        Some("/etc/sdkwork/router/provider-adapter-token.secret"),
        config.provider_adapter.gateway_token_file.as_deref()
    );
    assert_eq!(
        Some("/etc/sdkwork/router/provider-secrets.json"),
        config.provider_secret_map.json_file.as_deref()
    );
    assert_eq!(Some(true), config.usage_settlement.enabled);
    assert_eq!(Some(10), config.usage_settlement.tenant_id);
    assert_eq!(Some(20), config.usage_settlement.organization_id);
    assert_eq!(Some(50), config.usage_settlement.batch_size);
    assert_eq!(Some(30000), config.usage_settlement.interval_millis);
    assert_eq!(Some(true), config.model_ranking.enabled);
    assert_eq!(Some("global"), config.model_ranking.rank_scope.as_deref());
    assert_eq!(
        Some("daily"),
        config.model_ranking.snapshot_period.as_deref()
    );
    assert_eq!(Some(200), config.model_ranking.limit);
    assert_eq!(Some(7), config.model_ranking.lookback_days);
    assert_eq!(Some(3600000), config.model_ranking.interval_millis);
    assert_eq!(Some(60), config.model_ranking.cache_max_age_seconds);
    assert_eq!(Some(300000), config.model_ranking.run_timeout_millis);
    assert_eq!(Some(2), config.model_ranking.max_retry_attempts);
    assert_eq!(Some(1000), config.model_ranking.retry_backoff_millis);
    assert_eq!(Some(true), config.model_ranking.run_on_startup);
    assert_eq!(
        Some(3),
        config.model_ranking.alert_after_consecutive_failures
    );
    assert_eq!(Some("production"), config.install.environment.as_deref());
    assert_eq!(Some("commercial"), config.install.seed_profile.as_deref());
    assert_eq!(
        Some("/opt/sdkwork/router/catalog"),
        config.install.models_catalog_root.as_deref()
    );
    assert_eq!(Some("ensure"), config.install.startup_mode.as_deref());
    assert_eq!(Some(true), config.bootstrap_admin.enabled);
    assert_eq!(Some("admin"), config.bootstrap_admin.username.as_deref());
    assert_eq!(
        Some("admin@sdkwork.com"),
        config.bootstrap_admin.email.as_deref()
    );
    assert_eq!(
        Some("/etc/sdkwork/router/bootstrap-admin.secret"),
        config.bootstrap_admin.password_file.as_deref()
    );
}
