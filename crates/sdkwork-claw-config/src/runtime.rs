use crate::DeploymentMode;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::net::SocketAddr;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RuntimeConfig {
    pub service_name: String,
    pub deployment_mode: DeploymentMode,
    pub bind_addr: String,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct RuntimeTomlConfig {
    pub runtime: RuntimeSectionConfig,
    pub services: ServicesSectionConfig,
    pub server: ServerSectionConfig,
    pub edge: EdgeSectionConfig,
    pub portal: PortalSectionConfig,
    pub paths: PathsSectionConfig,
    pub request_limits: RequestLimitsSectionConfig,
    pub observability: ObservabilitySectionConfig,
    pub redis: RedisSectionConfig,
    pub security: SecuritySectionConfig,
    pub provider_relay: ProviderRelaySectionConfig,
    pub provider_adapter: ProviderAdapterSectionConfig,
    pub provider_secret_map: ProviderSecretMapSectionConfig,
    pub usage_settlement: UsageSettlementSectionConfig,
    pub model_ranking: ModelRankingSectionConfig,
    pub install: InstallSectionConfig,
    pub bootstrap_admin: BootstrapAdminSectionConfig,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct RuntimeSectionConfig {
    pub deployment_profile: Option<String>,
    pub runtime_target: Option<String>,
    pub deployment_mode: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct ServicesSectionConfig {
    pub gateway: ServiceBindSectionConfig,
    pub admin_api: ServiceBindSectionConfig,
    pub app_api: ServiceBindSectionConfig,
    pub provider_adapter: ServiceBindSectionConfig,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct ServiceBindSectionConfig {
    pub bind: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct ServerSectionConfig {
    pub bind: Option<String>,
    pub external_scheme: Option<String>,
    pub trust_forwarded_headers: Option<bool>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct EdgeSectionConfig {
    pub enabled: Option<bool>,
    pub gateway_base_url: Option<String>,
    pub backend_api_base_url: Option<String>,
    pub app_api_base_url: Option<String>,
    pub portal_base_url: Option<String>,
    pub portal_static_dist: Option<String>,
    pub csp_connect_src: Option<String>,
    pub cors_allowed_origins: Vec<String>,
    pub upstream_request_timeout_millis: Option<u64>,
    pub upstream_ready_timeout_millis: Option<u64>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct PortalSectionConfig {
    pub public: PortalPublicSectionConfig,
    #[serde(rename = "static")]
    pub static_assets: PortalStaticSectionConfig,
    pub security: PortalSecuritySectionConfig,
    pub tools: PortalToolsSectionConfig,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct PortalPublicSectionConfig {
    pub sdk_base_url: Option<String>,
    pub api_base_url: Option<String>,
    pub open_api_base_url: Option<String>,
    pub app_api_base_url: Option<String>,
    pub backend_api_base_url: Option<String>,
    pub appbase_backend_api_base_url: Option<String>,
    pub tool_api_enabled: Option<bool>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct PortalStaticSectionConfig {
    pub html_cache_control: Option<String>,
    pub asset_cache_control: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct PortalSecuritySectionConfig {
    pub hsts_enabled: Option<bool>,
    pub hsts_max_age_seconds: Option<u64>,
    pub hsts_include_subdomains: Option<bool>,
    pub hsts_preload: Option<bool>,
    pub csp_frame_src: Option<Vec<String>>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct PortalToolsSectionConfig {
    pub rate_limit_requests: Option<u32>,
    pub rate_limit_window_seconds: Option<u64>,
    pub max_body_bytes: Option<u64>,
    pub sdk_archive_root: Option<String>,
    pub sdk_generator_base_url: Option<String>,
    pub sdk_generator_api_key_file: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct PathsSectionConfig {
    pub data_directory: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct RequestLimitsSectionConfig {
    pub admin_app_json_body_max_bytes: Option<u64>,
    pub admin_skill_json_body_max_bytes: Option<u64>,
    pub payment_callback_body_max_bytes: Option<u64>,
    pub gateway_invocation_body_max_bytes: Option<u64>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct ObservabilitySectionConfig {
    pub log_filter: Option<String>,
    pub log_format: Option<String>,
    pub log_ansi: Option<bool>,
    pub log_target: Option<bool>,
    pub log_thread_names: Option<bool>,
    pub log_thread_ids: Option<bool>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct RedisSectionConfig {
    pub enabled: Option<bool>,
    pub host: Option<String>,
    pub port: Option<u16>,
    pub database: Option<u32>,
    pub username: Option<String>,
    pub url: Option<String>,
    pub password: Option<String>,
    pub password_file: Option<String>,
    pub key_prefix: Option<String>,
    pub tls: Option<bool>,
    pub max_connections: Option<u32>,
    pub connect_timeout_millis: Option<u64>,
    pub command_timeout_millis: Option<u64>,
    pub pool_idle_timeout_seconds: Option<u64>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct SecuritySectionConfig {
    pub api_key_pepper: Option<String>,
    pub api_key_pepper_file: Option<String>,
    pub trusted_subject_secret: Option<String>,
    pub trusted_subject_secret_file: Option<String>,
    pub trusted_subject_max_clock_skew_seconds: Option<u64>,
    pub app_session_secret: Option<String>,
    pub app_session_secret_file: Option<String>,
    pub app_session_ttl_seconds: Option<u64>,
    pub app_session_max_clock_skew_seconds: Option<u64>,
    pub payment_webhook_secret: Option<String>,
    pub payment_webhook_secret_file: Option<String>,
    pub payment_webhook_max_clock_skew_seconds: Option<u64>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct ProviderRelaySectionConfig {
    pub openai: ProviderRelayOpenAiSectionConfig,
    pub runtime: ProviderRelayRuntimeSectionConfig,
    pub retry: ProviderRelayRetrySectionConfig,
    pub http_pool: ProviderRelayHttpPoolSectionConfig,
    pub passthrough: BTreeMap<String, ProviderPassthroughSectionConfig>,
    pub rate_limit: ProviderRelayRateLimitSectionConfig,
}

/// HTTP connection-pool tuning for OpenAI-compatible upstream provider clients.
///
/// All fields are optional; missing values fall back to safe production
/// defaults defined by the router service.
#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct ProviderRelayHttpPoolSectionConfig {
    /// Idle connection lifetime before eviction. Defaults to 90 seconds.
    pub pool_idle_timeout_seconds: Option<u64>,
    /// Maximum idle connections kept per upstream host. Defaults to 64.
    pub pool_max_idle_per_host: Option<usize>,
    /// HTTP/2 keep-alive ping interval. Defaults to 30 seconds.
    pub http2_keep_alive_interval_seconds: Option<u64>,
    /// HTTP/2 keep-alive ping timeout. Defaults to 10 seconds.
    pub http2_keep_alive_timeout_seconds: Option<u64>,
    /// TCP connect timeout. Defaults to 10 seconds.
    pub connect_timeout_seconds: Option<u64>,
}

/// Rate-limit tuning for provider relay invocation traffic.
///
/// `estimated_instance_count` allows the local fallback limiter to divide
/// per-tenant/per-scope quotas when Redis is unavailable, so a fleet of N
/// gateway nodes does not each allow the full configured quota.
#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct ProviderRelayRateLimitSectionConfig {
    /// Estimated number of gateway instances sharing the limiter. Defaults to 1.
    pub estimated_instance_count: Option<u32>,
    /// Maximum in-flight provider requests per tenant. Defaults to 100.
    pub tenant_max_inflight_requests: Option<u32>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct ProviderRelayOpenAiSectionConfig {
    pub base_url: Option<String>,
    pub bearer_token: Option<String>,
    pub bearer_token_file: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct ProviderRelayRuntimeSectionConfig {
    pub response_timeout_millis: Option<u64>,
    /// Timeout for streaming (SSE) provider responses. Defaults to 120000 ms.
    pub stream_response_timeout_millis: Option<u64>,
    pub health_probe_timeout_millis: Option<u64>,
    pub catalog_refresh_interval_millis: Option<u64>,
    pub circuit_breaker_recovery_window_millis: Option<u64>,
    pub failure_strategy: Option<String>,
    /// Maximum bytes accepted from a non-streaming provider response body.
    /// Defaults to 64 MiB (67108864). Exceeding the limit aborts the response.
    pub provider_response_max_bytes: Option<u64>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct ProviderRelayRetrySectionConfig {
    pub max_attempts: Option<usize>,
    pub retryable_status_codes: Vec<u16>,
    pub backoff_millis: Option<u64>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct ProviderPassthroughSectionConfig {
    pub base_url: Option<String>,
    pub bearer_token: Option<String>,
    pub bearer_token_file: Option<String>,
    pub auth_type: Option<String>,
    pub auth_name: Option<String>,
    pub auth_value: Option<String>,
    pub auth_value_file: Option<String>,
    pub default_headers: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct ProviderAdapterSectionConfig {
    pub adapter_base_url: Option<String>,
    pub manifest: Option<String>,
    pub manifest_file: Option<String>,
    pub json: Option<String>,
    pub json_file: Option<String>,
    pub gateway_token: Option<String>,
    pub gateway_token_file: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct ProviderSecretMapSectionConfig {
    pub json: Option<String>,
    pub json_file: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct UsageSettlementSectionConfig {
    pub enabled: Option<bool>,
    pub tenant_id: Option<i64>,
    pub organization_id: Option<i64>,
    pub batch_size: Option<i64>,
    pub interval_millis: Option<u64>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct ModelRankingSectionConfig {
    pub enabled: Option<bool>,
    pub tenant_id: Option<i64>,
    pub organization_id: Option<i64>,
    pub rank_scope: Option<String>,
    pub snapshot_period: Option<String>,
    pub limit: Option<i64>,
    pub lookback_days: Option<i64>,
    pub interval_millis: Option<u64>,
    pub cache_max_age_seconds: Option<i64>,
    pub run_timeout_millis: Option<u64>,
    pub max_retry_attempts: Option<u32>,
    pub retry_backoff_millis: Option<u64>,
    pub run_on_startup: Option<bool>,
    pub alert_after_consecutive_failures: Option<i64>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct InstallSectionConfig {
    pub environment: Option<String>,
    pub seed_profile: Option<String>,
    pub models_catalog_root: Option<String>,
    pub startup_mode: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct BootstrapAdminSectionConfig {
    pub enabled: Option<bool>,
    pub username: Option<String>,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub password_file: Option<String>,
}

impl RuntimeConfig {
    pub fn new(
        service_name: impl Into<String>,
        bind_addr: impl Into<String>,
    ) -> Result<Self, String> {
        Ok(Self {
            service_name: service_name.into(),
            deployment_mode: DeploymentMode::from_env()?,
            bind_addr: bind_addr.into(),
        })
    }

    pub fn from_env(
        service_name: impl Into<String>,
        bind_env_name: impl Into<String>,
        default_bind_addr: impl Into<String>,
    ) -> Result<Self, String> {
        let bind_env_name = bind_env_name.into();
        Self::from_optional_parts(
            service_name,
            bind_env_name.as_str(),
            default_bind_addr,
            std::env::var(&bind_env_name).ok(),
            std::env::var(DeploymentMode::ENV_DEPLOYMENT_MODE).ok(),
        )
    }

    pub fn from_optional_parts(
        service_name: impl Into<String>,
        bind_env_name: impl Into<String>,
        default_bind_addr: impl Into<String>,
        bind_addr: Option<String>,
        deployment_mode: Option<String>,
    ) -> Result<Self, String> {
        let service_name = service_name.into().trim().to_owned();
        if service_name.is_empty() {
            return Err("service name must not be blank".to_owned());
        }

        let bind_env_name = bind_env_name.into().trim().to_owned();
        if bind_env_name.is_empty() {
            return Err("bind environment variable name must not be blank".to_owned());
        }

        let bind_addr = bind_addr
            .unwrap_or_else(|| default_bind_addr.into())
            .trim()
            .to_owned();
        if bind_addr.is_empty() {
            return Err(format!("{bind_env_name} must not be blank"));
        }
        bind_addr
            .parse::<SocketAddr>()
            .map_err(|error| format!("{bind_env_name} must be a valid socket address: {error}"))?;

        Ok(Self {
            service_name,
            deployment_mode: DeploymentMode::from_optional_part(deployment_mode)?,
            bind_addr,
        })
    }

    pub fn bind_addr(&self) -> &str {
        &self.bind_addr
    }
}

impl RuntimeTomlConfig {
    pub fn from_env_config_file() -> Result<Option<Self>, String> {
        let Some(config_file) = std::env::var("SDKWORK_CLAW_CONFIG_FILE")
            .ok()
            .map(|value| value.trim().to_owned())
            .filter(|value| !value.is_empty())
            .map(PathBuf::from)
        else {
            return Ok(None);
        };
        Self::from_config_file_if_exists(config_file)
    }

    pub fn from_config_file_if_exists(path: impl AsRef<Path>) -> Result<Option<Self>, String> {
        let path = path.as_ref();
        if !path.exists() {
            return Ok(None);
        }
        Self::from_config_file(path).map(Some)
    }

    pub fn from_config_file(path: impl AsRef<Path>) -> Result<Self, String> {
        let path = path.as_ref();
        let content = std::fs::read_to_string(path)
            .map_err(|error| format!("failed to read {}: {error}", path.display()))?;
        Self::from_toml_str(&content)
    }

    pub fn from_toml_str(content: &str) -> Result<Self, String> {
        toml::from_str(content).map_err(|error| format!("invalid runtime config TOML: {error}"))
    }
}

pub fn config_value(name: &str, config_value: Option<&str>) -> Option<String> {
    env_optional(name).or_else(|| normalize_optional_string(config_value))
}

pub fn config_secret_value(
    name: &str,
    file_name: &str,
    config_value: Option<&str>,
    config_file: Option<&str>,
) -> Result<Option<String>, String> {
    if let Some(value) = env_optional(name) {
        return Ok(Some(value));
    }
    if let Some(path) = env_optional(file_name).or_else(|| normalize_optional_string(config_file)) {
        return read_secret_file(file_name, &path).map(Some);
    }
    Ok(normalize_optional_string(config_value))
}

pub fn config_file_value(
    name: &str,
    file_name: &str,
    config_value: Option<&str>,
    config_file: Option<&str>,
) -> Result<Option<String>, String> {
    if let Some(value) = env_optional(name) {
        return Ok(Some(value));
    }
    if let Some(path) = env_optional(file_name).or_else(|| normalize_optional_string(config_file)) {
        return read_config_file(file_name, &path).map(Some);
    }
    Ok(normalize_optional_string(config_value))
}

pub fn config_bool(name: &str, config_value: Option<bool>) -> Result<Option<bool>, String> {
    match env_optional(name) {
        Some(value) => parse_bool(name, value.as_str()).map(Some),
        None => Ok(config_value),
    }
}

pub fn config_i64(name: &str, config_value: Option<i64>) -> Result<Option<i64>, String> {
    match env_optional(name) {
        Some(value) => value
            .parse::<i64>()
            .map(Some)
            .map_err(|_| format!("{name} must be an integer")),
        None => Ok(config_value),
    }
}

pub fn config_u32(name: &str, config_value: Option<u32>) -> Result<Option<u32>, String> {
    match env_optional(name) {
        Some(value) => value
            .parse::<u32>()
            .map(Some)
            .map_err(|_| format!("{name} must be a non-negative integer")),
        None => Ok(config_value),
    }
}

pub fn config_u64(name: &str, config_value: Option<u64>) -> Result<Option<u64>, String> {
    match env_optional(name) {
        Some(value) => value
            .parse::<u64>()
            .map(Some)
            .map_err(|_| format!("{name} must be a positive integer")),
        None => Ok(config_value),
    }
}

pub fn env_optional(name: &str) -> Option<String> {
    std::env::var(name)
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

pub fn read_secret_file(label: &str, path: &str) -> Result<String, String> {
    read_nonblank_file(label, path)
}

pub fn read_config_file(label: &str, path: &str) -> Result<String, String> {
    read_nonblank_file(label, path)
}

fn read_nonblank_file(label: &str, path: &str) -> Result<String, String> {
    let path = PathBuf::from(expand_runtime_path_variables(path.trim()));
    let value = std::fs::read_to_string(&path)
        .map_err(|error| format!("failed to read {label} {}: {error}", path.display()))?;
    normalize_optional_string(Some(value.as_str()))
        .ok_or_else(|| format!("{label} {} must not be blank", path.display()))
}

fn normalize_optional_string(value: Option<&str>) -> Option<String> {
    value
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

fn parse_bool(name: &str, value: &str) -> Result<bool, String> {
    match value.trim().to_ascii_lowercase().as_str() {
        "1" | "true" | "yes" | "on" => Ok(true),
        "0" | "false" | "no" | "off" => Ok(false),
        _ => Err(format!("{name} must be a boolean value")),
    }
}

fn expand_runtime_path_variables(value: &str) -> String {
    let expanded = expand_braced_env_variables(value);
    let expanded = expand_percent_env_variables(&expanded);
    let expanded = expand_dollar_env_variables(&expanded);
    expand_home_directory(&expanded)
}

fn expand_braced_env_variables(value: &str) -> String {
    let mut output = String::with_capacity(value.len());
    let mut cursor = 0;
    while let Some(start) = value[cursor..].find("${") {
        let absolute_start = cursor + start;
        output.push_str(&value[cursor..absolute_start]);
        let name_start = absolute_start + 2;
        let Some(end_offset) = value[name_start..].find('}') else {
            output.push_str(&value[absolute_start..]);
            return output;
        };
        let name_end = name_start + end_offset;
        let name = &value[name_start..name_end];
        if !name.is_empty() {
            if let Ok(replacement) = std::env::var(name) {
                output.push_str(&replacement);
            } else {
                output.push_str(&value[absolute_start..=name_end]);
            }
        } else {
            output.push_str(&value[absolute_start..=name_end]);
        }
        cursor = name_end + 1;
    }
    output.push_str(&value[cursor..]);
    output
}

fn expand_percent_env_variables(value: &str) -> String {
    let mut output = String::with_capacity(value.len());
    let mut cursor = 0;
    while let Some(start) = value[cursor..].find('%') {
        let absolute_start = cursor + start;
        output.push_str(&value[cursor..absolute_start]);
        let name_start = absolute_start + 1;
        let Some(end_offset) = value[name_start..].find('%') else {
            output.push_str(&value[absolute_start..]);
            return output;
        };
        let name_end = name_start + end_offset;
        let name = &value[name_start..name_end];
        if !name.is_empty() {
            if let Ok(replacement) = std::env::var(name) {
                output.push_str(&replacement);
            } else {
                output.push_str(&value[absolute_start..=name_end]);
            }
        } else {
            output.push_str(&value[absolute_start..=name_end]);
        }
        cursor = name_end + 1;
    }
    output.push_str(&value[cursor..]);
    output
}

fn expand_dollar_env_variables(value: &str) -> String {
    let mut output = String::with_capacity(value.len());
    let mut chars = value.char_indices().peekable();
    while let Some((index, character)) = chars.next() {
        if character != '$' {
            output.push(character);
            continue;
        }
        if matches!(chars.peek(), Some((_, '{'))) {
            output.push('$');
            continue;
        }
        let name_start = index + 1;
        let mut name_end = name_start;
        while let Some((next_index, next_character)) = chars.peek().copied() {
            if next_character == '_' || next_character.is_ascii_alphanumeric() {
                name_end = next_index + next_character.len_utf8();
                chars.next();
            } else {
                break;
            }
        }
        if name_end == name_start {
            output.push('$');
            continue;
        }
        let name = &value[name_start..name_end];
        if let Ok(replacement) = std::env::var(name) {
            output.push_str(&replacement);
        } else {
            output.push('$');
            output.push_str(name);
        }
    }
    output
}

fn expand_home_directory(value: &str) -> String {
    if value == "~" {
        return std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| value.to_owned());
    }
    let Some(rest) = value
        .strip_prefix("~/")
        .or_else(|| value.strip_prefix("~\\"))
    else {
        return value.to_owned();
    };
    let Ok(home) = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")) else {
        return value.to_owned();
    };
    let mut path = PathBuf::from(home);
    path.push(rest);
    path.to_string_lossy().to_string()
}
