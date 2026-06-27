//! Private edge-server env resolution with legacy PORTAL_* alias support.

pub const SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC: &str = "SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC";
pub const LEGACY_PORTAL_CSP_CONNECT_SRC: &str = "PORTAL_CSP_CONNECT_SRC";

pub const SDKWORK_CLAW_EDGE_PORTAL_STATIC_HTML_CACHE_CONTROL: &str =
    "SDKWORK_CLAW_EDGE_PORTAL_STATIC_HTML_CACHE_CONTROL";
pub const LEGACY_PORTAL_STATIC_HTML_CACHE_CONTROL: &str = "PORTAL_STATIC_HTML_CACHE_CONTROL";

pub const SDKWORK_CLAW_EDGE_PORTAL_STATIC_ASSET_CACHE_CONTROL: &str =
    "SDKWORK_CLAW_EDGE_PORTAL_STATIC_ASSET_CACHE_CONTROL";
pub const LEGACY_PORTAL_STATIC_ASSET_CACHE_CONTROL: &str = "PORTAL_STATIC_ASSET_CACHE_CONTROL";

pub const SDKWORK_CLAW_EDGE_HSTS_ENABLED: &str = "SDKWORK_CLAW_EDGE_HSTS_ENABLED";
pub const LEGACY_PORTAL_SECURITY_HSTS_ENABLED: &str = "PORTAL_SECURITY_HSTS_ENABLED";

pub const SDKWORK_CLAW_EDGE_HSTS_MAX_AGE_SECONDS: &str = "SDKWORK_CLAW_EDGE_HSTS_MAX_AGE_SECONDS";
pub const LEGACY_PORTAL_SECURITY_HSTS_MAX_AGE_SECONDS: &str =
    "PORTAL_SECURITY_HSTS_MAX_AGE_SECONDS";

pub const SDKWORK_CLAW_EDGE_HSTS_INCLUDE_SUBDOMAINS: &str =
    "SDKWORK_CLAW_EDGE_HSTS_INCLUDE_SUBDOMAINS";
pub const LEGACY_PORTAL_SECURITY_HSTS_INCLUDE_SUBDOMAINS: &str =
    "PORTAL_SECURITY_HSTS_INCLUDE_SUBDOMAINS";

pub const SDKWORK_CLAW_EDGE_HSTS_PRELOAD: &str = "SDKWORK_CLAW_EDGE_HSTS_PRELOAD";
pub const LEGACY_PORTAL_SECURITY_HSTS_PRELOAD: &str = "PORTAL_SECURITY_HSTS_PRELOAD";

pub const SDKWORK_CLAW_EDGE_CSP_FRAME_SRC: &str = "SDKWORK_CLAW_EDGE_CSP_FRAME_SRC";
pub const LEGACY_PORTAL_SECURITY_CSP_FRAME_SRC: &str = "PORTAL_SECURITY_CSP_FRAME_SRC";

pub const SDKWORK_CLAW_TOOL_API_MAX_BODY_BYTES: &str = "SDKWORK_CLAW_TOOL_API_MAX_BODY_BYTES";
pub const LEGACY_PORTAL_TOOL_API_MAX_BODY_BYTES: &str = "PORTAL_TOOL_API_MAX_BODY_BYTES";

pub const SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS: &str =
    "SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS";
pub const LEGACY_PORTAL_TOOL_API_RATE_LIMIT_REQUESTS: &str = "PORTAL_TOOL_API_RATE_LIMIT_REQUESTS";

pub const SDKWORK_CLAW_TOOL_API_RATE_LIMIT_WINDOW_SECONDS: &str =
    "SDKWORK_CLAW_TOOL_API_RATE_LIMIT_WINDOW_SECONDS";
pub const LEGACY_PORTAL_TOOL_API_RATE_LIMIT_WINDOW_SECONDS: &str =
    "PORTAL_TOOL_API_RATE_LIMIT_WINDOW_SECONDS";

pub const SDKWORK_CLAW_TOOL_API_SDK_ARCHIVE_ROOT: &str = "SDKWORK_CLAW_TOOL_API_SDK_ARCHIVE_ROOT";
pub const LEGACY_PORTAL_TOOL_API_SDK_ARCHIVE_ROOT: &str = "PORTAL_TOOL_API_SDK_ARCHIVE_ROOT";

pub const SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_BASE_URL: &str =
    "SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_BASE_URL";
pub const LEGACY_PORTAL_TOOL_API_SDK_GENERATOR_BASE_URL: &str =
    "PORTAL_TOOL_API_SDK_GENERATOR_BASE_URL";

pub const SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_API_KEY: &str =
    "SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_API_KEY";
pub const LEGACY_PORTAL_TOOL_API_SDK_GENERATOR_API_KEY: &str =
    "PORTAL_TOOL_API_SDK_GENERATOR_API_KEY";

pub const SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_API_KEY_FILE: &str =
    "SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_API_KEY_FILE";
pub const LEGACY_PORTAL_TOOL_API_SDK_GENERATOR_API_KEY_FILE: &str =
    "PORTAL_TOOL_API_SDK_GENERATOR_API_KEY_FILE";

pub fn env_optional(name: &str) -> Option<String> {
    std::env::var(name)
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

pub fn env_optional_with_legacy(canonical: &str, legacy: &str) -> Option<String> {
    env_optional(canonical).or_else(|| env_optional(legacy))
}

pub fn config_optional_with_legacy(
    canonical: &str,
    legacy: &str,
    config_value: Option<&str>,
) -> Option<String> {
    env_optional_with_legacy(canonical, legacy).or_else(|| {
        config_value
            .map(|value| value.trim().to_owned())
            .filter(|value| !value.is_empty())
    })
}

pub fn config_value_or_default_with_legacy(
    canonical: &str,
    legacy: &str,
    config_value: Option<&str>,
    default_value: &str,
) -> String {
    config_optional_with_legacy(canonical, legacy, config_value)
        .unwrap_or_else(|| default_value.to_owned())
}

pub fn config_bool_or_default_with_legacy(
    canonical: &str,
    legacy: &str,
    config_value: Option<bool>,
    default_value: bool,
) -> bool {
    for name in [canonical, legacy] {
        if let Ok(value) = std::env::var(name) {
            return matches!(
                value.trim().to_ascii_lowercase().as_str(),
                "1" | "true" | "yes" | "on"
            );
        }
    }
    config_value.unwrap_or(default_value)
}

pub fn config_u32_or_default_with_legacy(
    canonical: &str,
    legacy: &str,
    config_value: Option<u32>,
    default_value: u32,
) -> anyhow::Result<u32> {
    for name in [canonical, legacy] {
        if let Some(value) = env_optional(name) {
            return value
                .parse::<u32>()
                .map_err(|error| anyhow::anyhow!("{name} must be a positive integer: {error}"));
        }
    }
    Ok(config_value.unwrap_or(default_value))
}

pub fn config_u64_or_default_with_legacy(
    canonical: &str,
    legacy: &str,
    config_value: Option<u64>,
    default_value: u64,
) -> anyhow::Result<u64> {
    for name in [canonical, legacy] {
        if let Some(value) = env_optional(name) {
            return value
                .parse::<u64>()
                .map_err(|error| anyhow::anyhow!("{name} must be a positive integer: {error}"));
        }
    }
    Ok(config_value.unwrap_or(default_value))
}

pub fn split_env_list(value: &str) -> Vec<String> {
    value
        .split(|character: char| character == ',' || character.is_whitespace())
        .map(str::trim)
        .filter(|entry| !entry.is_empty())
        .map(str::to_owned)
        .collect()
}

pub fn env_list_with_legacy(canonical: &str, legacy: &str) -> Option<Vec<String>> {
    env_optional_with_legacy(canonical, legacy).map(|value| split_env_list(&value))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn split_env_list_splits_commas_and_whitespace() {
        assert_eq!(
            split_env_list("https://a.example.com, https://b.example.com"),
            vec![
                "https://a.example.com".to_owned(),
                "https://b.example.com".to_owned(),
            ],
        );
    }

    #[test]
    fn env_optional_with_legacy_prefers_canonical_value() {
        const CANONICAL: &str = "SDKWORK_CLAW_EDGE_ENV_TEST_CANONICAL";
        const LEGACY: &str = "SDKWORK_CLAW_EDGE_ENV_TEST_LEGACY";
        unsafe {
            std::env::set_var(LEGACY, "legacy-value");
            std::env::set_var(CANONICAL, "canonical-value");
        }
        assert_eq!(
            env_optional_with_legacy(CANONICAL, LEGACY).as_deref(),
            Some("canonical-value"),
        );
        unsafe {
            std::env::remove_var(CANONICAL);
            std::env::remove_var(LEGACY);
        }
    }
}
