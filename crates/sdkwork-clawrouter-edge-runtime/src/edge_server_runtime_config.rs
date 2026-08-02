use std::time::Duration;

use sdkwork_claw_config::RuntimeTomlConfig;

use crate::EdgeServerConfig;

pub const ENV_EDGE_SERVER_ENABLED: &str = "SDKWORK_CLAW_EDGE_SERVER";
const ENV_EDGE_GATEWAY_BASE_URL: &str = "SDKWORK_CLAW_EDGE_GATEWAY_BASE_URL";
const ENV_EDGE_BACKEND_API_BASE_URL: &str = "SDKWORK_CLAW_EDGE_BACKEND_API_BASE_URL";
const ENV_EDGE_APP_API_BASE_URL: &str = "SDKWORK_CLAW_EDGE_APP_API_BASE_URL";
const ENV_EDGE_PORTAL_BASE_URL: &str = "SDKWORK_CLAW_EDGE_PORTAL_BASE_URL";
const ENV_EDGE_PORTAL_STATIC_DIST: &str = "SDKWORK_CLAW_EDGE_PORTAL_STATIC_DIST";
const ENV_EDGE_EXTERNAL_SCHEME: &str = "SDKWORK_CLAW_EDGE_EXTERNAL_SCHEME";
const ENV_EDGE_TRUST_FORWARDED_HEADERS: &str = "SDKWORK_CLAW_EDGE_TRUST_FORWARDED_HEADERS";
const ENV_EDGE_UPSTREAM_REQUEST_TIMEOUT_MILLIS: &str =
    "SDKWORK_CLAW_EDGE_UPSTREAM_REQUEST_TIMEOUT_MILLIS";
const ENV_EDGE_UPSTREAM_READY_TIMEOUT_MILLIS: &str =
    "SDKWORK_CLAW_EDGE_UPSTREAM_READY_TIMEOUT_MILLIS";
const ENV_EDGE_CSP_CONNECT_SRC: &str = "SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC";

pub fn edge_server_enabled(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<bool, String> {
    sdkwork_claw_config::runtime::config_bool(
        ENV_EDGE_SERVER_ENABLED,
        runtime_toml.and_then(|config| config.edge.enabled),
    )
    .map(|enabled| enabled.unwrap_or(false))
}

pub fn edge_server_config_from_env_or_runtime_toml(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<EdgeServerConfig, String> {
    let edge = runtime_toml.map(|config| &config.edge);
    let gateway_base_url = required_config_value(
        ENV_EDGE_GATEWAY_BASE_URL,
        edge.and_then(|config| config.gateway_base_url.as_deref()),
    )?;
    let backend_api_base_url = required_config_value(
        ENV_EDGE_BACKEND_API_BASE_URL,
        edge.and_then(|config| config.backend_api_base_url.as_deref()),
    )?;
    let app_api_base_url = required_config_value(
        ENV_EDGE_APP_API_BASE_URL,
        edge.and_then(|config| config.app_api_base_url.as_deref()),
    )?;
    let portal_static_dist = sdkwork_claw_config::runtime::config_value(
        ENV_EDGE_PORTAL_STATIC_DIST,
        edge.and_then(|config| config.portal_static_dist.as_deref()),
    );
    let portal_base_url = sdkwork_claw_config::runtime::config_value(
        ENV_EDGE_PORTAL_BASE_URL,
        edge.and_then(|config| config.portal_base_url.as_deref()),
    )
    .or_else(|| portal_static_dist.as_ref().map(|_| app_api_base_url.clone()))
    .ok_or_else(|| format!("{ENV_EDGE_PORTAL_BASE_URL} is required when edge server is enabled"))?;

    let mut config = EdgeServerConfig::try_new(
        gateway_base_url,
        backend_api_base_url,
        app_api_base_url,
        portal_base_url,
    )?;

    if let Some(value) = sdkwork_claw_config::runtime::config_value(
        ENV_EDGE_EXTERNAL_SCHEME,
        runtime_toml.and_then(|config| config.server.external_scheme.as_deref()),
    ) {
        config = config.with_external_scheme(value)?;
    }
    if let Some(value) = sdkwork_claw_config::runtime::config_bool(
        ENV_EDGE_TRUST_FORWARDED_HEADERS,
        runtime_toml.and_then(|config| config.server.trust_forwarded_headers),
    )? {
        config = config.with_trusted_forwarded_headers(value);
    }
    if let Some(value) = sdkwork_claw_config::runtime::config_u64(
        ENV_EDGE_UPSTREAM_REQUEST_TIMEOUT_MILLIS,
        edge.and_then(|config| config.upstream_request_timeout_millis),
    )? {
        config = config.with_upstream_request_timeout(Duration::from_millis(value))?;
    }
    if let Some(value) = sdkwork_claw_config::runtime::config_u64(
        ENV_EDGE_UPSTREAM_READY_TIMEOUT_MILLIS,
        edge.and_then(|config| config.upstream_ready_timeout_millis),
    )? {
        config = config.with_ready_check_timeout(Duration::from_millis(value))?;
    }
    if let Some(value) = portal_static_dist {
        config = config.with_portal_static_dist(value)?;
    }
    if let Some(value) = sdkwork_claw_config::runtime::config_value(
        ENV_EDGE_CSP_CONNECT_SRC,
        edge.and_then(|config| config.csp_connect_src.as_deref()),
    ) {
        config = config.with_portal_csp_connect_src(value)?;
    }
    if let Some(edge) = edge {
        config = config.with_cors_allowed_origins(&edge.cors_allowed_origins)?;
    }

    Ok(config)
}

fn required_config_value(name: &str, configured: Option<&str>) -> Result<String, String> {
    sdkwork_claw_config::runtime::config_value(name, configured)
        .ok_or_else(|| format!("{name} is required when edge server is enabled"))
}

#[cfg(test)]
mod tests {
    use super::{edge_server_config_from_env_or_runtime_toml, edge_server_enabled};
    use sdkwork_claw_config::RuntimeTomlConfig;

    #[test]
    fn edge_server_is_disabled_unless_explicitly_configured() {
        assert!(!edge_server_enabled(None).unwrap());
    }

    #[test]
    fn enabled_edge_server_requires_every_upstream() {
        let mut runtime = RuntimeTomlConfig::default();
        runtime.edge.enabled = Some(true);
        runtime.edge.gateway_base_url = Some("http://gateway.internal:18080".to_owned());
        runtime.edge.backend_api_base_url = Some("http://admin.internal:18081".to_owned());

        let error = edge_server_config_from_env_or_runtime_toml(Some(&runtime)).unwrap_err();
        assert!(error.contains("SDKWORK_CLAW_EDGE_APP_API_BASE_URL"));
    }

    #[test]
    fn enabled_edge_server_accepts_declared_upstreams() {
        let mut runtime = RuntimeTomlConfig::default();
        runtime.edge.enabled = Some(true);
        runtime.edge.gateway_base_url = Some("http://gateway.internal:18080".to_owned());
        runtime.edge.backend_api_base_url = Some("http://admin.internal:18081".to_owned());
        runtime.edge.app_api_base_url = Some("http://app.internal:18082".to_owned());
        runtime.edge.portal_base_url = Some("http://portal.internal:3901".to_owned());

        edge_server_config_from_env_or_runtime_toml(Some(&runtime)).unwrap();
    }
}
