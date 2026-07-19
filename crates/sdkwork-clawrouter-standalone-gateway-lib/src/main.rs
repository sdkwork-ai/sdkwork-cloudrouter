mod edge_env;

use edge_env::{
    config_bool_or_default_with_legacy, config_optional_with_legacy,
    config_u32_or_default_with_legacy, config_u64_or_default_with_legacy,
    config_value_or_default_with_legacy, env_list_with_legacy, env_optional as edge_env_optional,
    LEGACY_PORTAL_CSP_CONNECT_SRC, LEGACY_PORTAL_SECURITY_CSP_FRAME_SRC,
    LEGACY_PORTAL_SECURITY_HSTS_ENABLED, LEGACY_PORTAL_SECURITY_HSTS_INCLUDE_SUBDOMAINS,
    LEGACY_PORTAL_SECURITY_HSTS_MAX_AGE_SECONDS, LEGACY_PORTAL_SECURITY_HSTS_PRELOAD,
    LEGACY_PORTAL_STATIC_ASSET_CACHE_CONTROL, LEGACY_PORTAL_STATIC_HTML_CACHE_CONTROL,
    LEGACY_PORTAL_TOOL_API_MAX_BODY_BYTES, LEGACY_PORTAL_TOOL_API_RATE_LIMIT_REQUESTS,
    LEGACY_PORTAL_TOOL_API_RATE_LIMIT_WINDOW_SECONDS, LEGACY_PORTAL_TOOL_API_SDK_ARCHIVE_ROOT,
    LEGACY_PORTAL_TOOL_API_SDK_GENERATOR_API_KEY,
    LEGACY_PORTAL_TOOL_API_SDK_GENERATOR_API_KEY_FILE,
    LEGACY_PORTAL_TOOL_API_SDK_GENERATOR_BASE_URL, SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC,
    SDKWORK_CLAW_EDGE_CSP_FRAME_SRC, SDKWORK_CLAW_EDGE_HSTS_ENABLED,
    SDKWORK_CLAW_EDGE_HSTS_INCLUDE_SUBDOMAINS, SDKWORK_CLAW_EDGE_HSTS_MAX_AGE_SECONDS,
    SDKWORK_CLAW_EDGE_HSTS_PRELOAD, SDKWORK_CLAW_EDGE_PORTAL_STATIC_ASSET_CACHE_CONTROL,
    SDKWORK_CLAW_EDGE_PORTAL_STATIC_HTML_CACHE_CONTROL, SDKWORK_CLAW_TOOL_API_MAX_BODY_BYTES,
    SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS, SDKWORK_CLAW_TOOL_API_RATE_LIMIT_WINDOW_SECONDS,
    SDKWORK_CLAW_TOOL_API_SDK_ARCHIVE_ROOT, SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_API_KEY,
    SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_API_KEY_FILE, SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_BASE_URL,
};

use sdkwork_clawrouter_standalone_gateway_lib::SERVICE_NAME;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    sdkwork_database_sqlx::enable_process_shared_database_pool();
    let runtime_toml = sdkwork_claw_config::RuntimeTomlConfig::from_env_config_file()
        .map_err(anyhow::Error::msg)?;
    let config = runtime_config_from_env_or_toml(
        SERVICE_NAME,
        "SDKWORK_CLAW_SERVER_BIND",
        "0.0.0.0:3900",
        runtime_toml
            .as_ref()
            .and_then(|config| config.server.bind.clone()),
        runtime_toml
            .as_ref()
            .and_then(|config| config.runtime.deployment_mode.clone()),
    )
    .map_err(anyhow::Error::msg)?;
    let edge_config = build_edge_server_config(runtime_toml.as_ref())?;
    if all_in_one_runtime_enabled() {
        return sdkwork_clawrouter_cloud_gateway::serve_all_in_one_edge_server_with_runtime_config(
            config.bind_addr(),
            edge_config,
            runtime_toml.as_ref(),
        )
        .await;
    }
    sdkwork_clawrouter_cloud_gateway::serve_edge_server_with_runtime_config(
        config.bind_addr(),
        edge_config,
        runtime_toml.as_ref(),
    )
    .await
}

pub fn build_edge_server_config(
    runtime_toml: Option<&sdkwork_claw_config::RuntimeTomlConfig>,
) -> anyhow::Result<sdkwork_clawrouter_cloud_gateway::EdgeServerConfig> {
    let mut edge_config = sdkwork_clawrouter_cloud_gateway::EdgeServerConfig::try_new(
        config_value_or_default(
            "SDKWORK_CLAW_EDGE_GATEWAY_BASE_URL",
            runtime_toml.and_then(|config| config.edge.gateway_base_url.as_deref()),
            "http://127.0.0.1:18080",
        ),
        config_value_or_default(
            "SDKWORK_CLAW_EDGE_BACKEND_API_BASE_URL",
            runtime_toml.and_then(|config| config.edge.backend_api_base_url.as_deref()),
            "http://127.0.0.1:18081",
        ),
        config_value_or_default(
            "SDKWORK_CLAW_EDGE_APP_API_BASE_URL",
            runtime_toml.and_then(|config| config.edge.app_api_base_url.as_deref()),
            "http://127.0.0.1:18082",
        ),
        config_value_or_default(
            "SDKWORK_CLAW_EDGE_PORTAL_BASE_URL",
            runtime_toml.and_then(|config| config.edge.portal_base_url.as_deref()),
            "http://127.0.0.1:3901",
        ),
    )
    .and_then(|config| {
        config.with_external_scheme(config_value_or_default(
            "SDKWORK_CLAW_EDGE_EXTERNAL_SCHEME",
            runtime_toml.and_then(|config| config.server.external_scheme.as_deref()),
            "http",
        ))
    })
    .map(|config| {
        config.with_trusted_forwarded_headers(config_bool_or_default(
            "SDKWORK_CLAW_EDGE_TRUST_FORWARDED_HEADERS",
            runtime_toml.and_then(|config| config.server.trust_forwarded_headers),
            false,
        ))
    })
    .map_err(anyhow::Error::msg)?;

    let upstream_request_timeout_millis = config_u64_or_default(
        "SDKWORK_CLAW_EDGE_UPSTREAM_REQUEST_TIMEOUT_MILLIS",
        runtime_toml.and_then(|config| config.edge.upstream_request_timeout_millis),
        30_000,
    )?;
    edge_config = edge_config
        .with_upstream_request_timeout(std::time::Duration::from_millis(
            upstream_request_timeout_millis,
        ))
        .map_err(anyhow::Error::msg)?;
    let upstream_ready_timeout_millis = config_u64_or_default(
        "SDKWORK_CLAW_EDGE_UPSTREAM_READY_TIMEOUT_MILLIS",
        runtime_toml.and_then(|config| config.edge.upstream_ready_timeout_millis),
        2_000,
    )?;
    edge_config = edge_config
        .with_ready_check_timeout(std::time::Duration::from_millis(
            upstream_ready_timeout_millis,
        ))
        .map_err(anyhow::Error::msg)?;

    if let Some(path) = config_optional(
        "SDKWORK_CLAW_EDGE_PORTAL_STATIC_DIST",
        runtime_toml.and_then(|config| config.edge.portal_static_dist.as_deref()),
    ) {
        edge_config = edge_config
            .with_portal_static_dist(path)
            .map_err(anyhow::Error::msg)?;
    }
    if let Some(value) = config_optional(
        "PORTAL_PUBLIC_SDK_BASE_URL",
        runtime_toml.and_then(|config| config.portal.public.sdk_base_url.as_deref()),
    ) {
        edge_config = edge_config
            .with_portal_public_sdk_base_url(value)
            .map_err(anyhow::Error::msg)?;
    }
    if let Some(value) = config_optional(
        "PORTAL_PUBLIC_API_BASE_URL",
        runtime_toml.and_then(|config| config.portal.public.api_base_url.as_deref()),
    ) {
        edge_config = edge_config
            .with_portal_public_api_base_url(value)
            .map_err(anyhow::Error::msg)?;
    }
    if let Some(value) = config_optional(
        "PORTAL_PUBLIC_OPEN_API_BASE_URL",
        runtime_toml.and_then(|config| config.portal.public.open_api_base_url.as_deref()),
    ) {
        edge_config = edge_config
            .with_portal_public_open_api_base_url(value)
            .map_err(anyhow::Error::msg)?;
    }
    if let Some(value) = config_optional(
        "PORTAL_PUBLIC_APP_API_BASE_URL",
        runtime_toml.and_then(|config| config.portal.public.app_api_base_url.as_deref()),
    ) {
        edge_config = edge_config
            .with_portal_public_app_api_base_url(value)
            .map_err(anyhow::Error::msg)?;
    }
    if let Some(value) = config_optional(
        "PORTAL_PUBLIC_BACKEND_API_BASE_URL",
        runtime_toml.and_then(|config| config.portal.public.backend_api_base_url.as_deref()),
    ) {
        edge_config = edge_config
            .with_portal_public_backend_api_base_url(value)
            .map_err(anyhow::Error::msg)?;
    }
    if let Some(value) = config_optional(
        "PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL",
        runtime_toml
            .and_then(|config| config.portal.public.appbase_backend_api_base_url.as_deref()),
    ) {
        edge_config = edge_config
            .with_portal_public_appbase_backend_api_base_url(value)
            .map_err(anyhow::Error::msg)?;
    }
    if let Some(value) = config_optional_with_legacy(
        SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC,
        LEGACY_PORTAL_CSP_CONNECT_SRC,
        runtime_toml.and_then(|config| config.edge.csp_connect_src.as_deref()),
    ) {
        edge_config = edge_config
            .with_portal_csp_connect_src(value)
            .map_err(anyhow::Error::msg)?;
    }
    edge_config = edge_config
        .with_cors_allowed_origins(cors_allowed_origins_from_env_or_toml(runtime_toml)?)
        .map_err(anyhow::Error::msg)?;
    edge_config = edge_config.with_development_private_network_cors(
        !sdkwork_claw_config::is_production_like_runtime_environment(runtime_toml),
    );
    edge_config = edge_config
        .with_portal_static_cache_control(
            config_value_or_default_with_legacy(
                SDKWORK_CLAW_EDGE_PORTAL_STATIC_HTML_CACHE_CONTROL,
                LEGACY_PORTAL_STATIC_HTML_CACHE_CONTROL,
                runtime_toml
                    .and_then(|config| config.portal.static_assets.html_cache_control.as_deref()),
                "no-store",
            ),
            config_value_or_default_with_legacy(
                SDKWORK_CLAW_EDGE_PORTAL_STATIC_ASSET_CACHE_CONTROL,
                LEGACY_PORTAL_STATIC_ASSET_CACHE_CONTROL,
                runtime_toml
                    .and_then(|config| config.portal.static_assets.asset_cache_control.as_deref()),
                "public, max-age=31536000, immutable",
            ),
        )
        .map_err(anyhow::Error::msg)?;
    let hsts_enabled = config_bool_or_default_with_legacy(
        SDKWORK_CLAW_EDGE_HSTS_ENABLED,
        LEGACY_PORTAL_SECURITY_HSTS_ENABLED,
        runtime_toml.and_then(|config| config.portal.security.hsts_enabled),
        true,
    );
    let hsts_max_age_seconds = config_u64_or_default_with_legacy(
        SDKWORK_CLAW_EDGE_HSTS_MAX_AGE_SECONDS,
        LEGACY_PORTAL_SECURITY_HSTS_MAX_AGE_SECONDS,
        runtime_toml.and_then(|config| config.portal.security.hsts_max_age_seconds),
        31_536_000,
    )?;
    let hsts_include_subdomains = config_bool_or_default_with_legacy(
        SDKWORK_CLAW_EDGE_HSTS_INCLUDE_SUBDOMAINS,
        LEGACY_PORTAL_SECURITY_HSTS_INCLUDE_SUBDOMAINS,
        runtime_toml.and_then(|config| config.portal.security.hsts_include_subdomains),
        true,
    );
    let hsts_preload = config_bool_or_default_with_legacy(
        SDKWORK_CLAW_EDGE_HSTS_PRELOAD,
        LEGACY_PORTAL_SECURITY_HSTS_PRELOAD,
        runtime_toml.and_then(|config| config.portal.security.hsts_preload),
        true,
    );
    edge_config = edge_config
        .with_portal_strict_transport_security(
            hsts_enabled,
            hsts_max_age_seconds,
            hsts_include_subdomains,
            hsts_preload,
        )
        .map_err(anyhow::Error::msg)?;
    tracing::info!(
        hsts_enabled,
        hsts_max_age_seconds,
        hsts_include_subdomains,
        hsts_preload,
        "HSTS security header configuration resolved (production default: enabled with preload)"
    );
    edge_config = edge_config
        .with_portal_csp_frame_src(portal_csp_frame_src_from_env_or_toml(runtime_toml)?)
        .map_err(anyhow::Error::msg)?;
    edge_config = edge_config.with_portal_public_tool_api_enabled(config_bool_or_default(
        "PORTAL_PUBLIC_TOOL_API_ENABLED",
        runtime_toml.and_then(|config| config.portal.public.tool_api_enabled),
        false,
    ));
    let tool_api_max_body_bytes = config_u64_or_default_with_legacy(
        SDKWORK_CLAW_TOOL_API_MAX_BODY_BYTES,
        LEGACY_PORTAL_TOOL_API_MAX_BODY_BYTES,
        runtime_toml.and_then(|config| config.portal.tools.max_body_bytes),
        1_048_576,
    )?;
    edge_config = edge_config
        .with_portal_tool_api_max_body_bytes(tool_api_max_body_bytes.try_into().map_err(|_| {
            anyhow::anyhow!(
                "{SDKWORK_CLAW_TOOL_API_MAX_BODY_BYTES} must fit in the current platform pointer size"
            )
        })?)
        .map_err(anyhow::Error::msg)?;
    let tool_api_rate_limit_requests = config_u32_or_default_with_legacy(
        SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS,
        LEGACY_PORTAL_TOOL_API_RATE_LIMIT_REQUESTS,
        runtime_toml.and_then(|config| config.portal.tools.rate_limit_requests),
        120,
    )?;
    let tool_api_rate_limit_window_seconds = config_u64_or_default_with_legacy(
        SDKWORK_CLAW_TOOL_API_RATE_LIMIT_WINDOW_SECONDS,
        LEGACY_PORTAL_TOOL_API_RATE_LIMIT_WINDOW_SECONDS,
        runtime_toml.and_then(|config| config.portal.tools.rate_limit_window_seconds),
        60,
    )?;
    edge_config = edge_config
        .with_portal_tool_api_rate_limit(
            tool_api_rate_limit_requests,
            std::time::Duration::from_secs(tool_api_rate_limit_window_seconds),
        )
        .map_err(anyhow::Error::msg)?;
    if let Some(path) = config_optional_with_legacy(
        SDKWORK_CLAW_TOOL_API_SDK_ARCHIVE_ROOT,
        LEGACY_PORTAL_TOOL_API_SDK_ARCHIVE_ROOT,
        runtime_toml.and_then(|config| config.portal.tools.sdk_archive_root.as_deref()),
    ) {
        edge_config = edge_config
            .with_portal_tool_api_sdk_archive_root(path)
            .map_err(anyhow::Error::msg)?;
    }
    if let Some(value) = config_optional_with_legacy(
        SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_BASE_URL,
        LEGACY_PORTAL_TOOL_API_SDK_GENERATOR_BASE_URL,
        runtime_toml.and_then(|config| config.portal.tools.sdk_generator_base_url.as_deref()),
    ) {
        edge_config = edge_config
            .with_portal_tool_api_sdk_generator_base_url(value)
            .map_err(anyhow::Error::msg)?;
    }
    let generator_api_key_file = config_optional_with_legacy(
        SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_API_KEY_FILE,
        LEGACY_PORTAL_TOOL_API_SDK_GENERATOR_API_KEY_FILE,
        runtime_toml.and_then(|config| config.portal.tools.sdk_generator_api_key_file.as_deref()),
    );
    let generator_api_key = match edge_env_optional(SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_API_KEY)
        .or_else(|| edge_env_optional(LEGACY_PORTAL_TOOL_API_SDK_GENERATOR_API_KEY))
    {
        Some(value) => Some(value),
        None => generator_api_key_file
            .map(|path| std::fs::read_to_string(path.trim()).map(|value| value.trim().to_owned()))
            .transpose()?,
    };
    if let Some(value) = generator_api_key.filter(|value| !value.trim().is_empty()) {
        edge_config = edge_config
            .with_portal_tool_api_sdk_generator_api_key(value)
            .map_err(anyhow::Error::msg)?;
    }

    Ok(edge_config)
}

fn runtime_config_from_env_or_toml(
    service_name: impl Into<String>,
    bind_env_name: impl Into<String>,
    default_bind_addr: impl Into<String>,
    config_bind_addr: Option<String>,
    config_deployment_mode: Option<String>,
) -> Result<sdkwork_claw_config::RuntimeConfig, String> {
    let bind_env_name = bind_env_name.into();
    sdkwork_claw_config::RuntimeConfig::from_optional_parts(
        service_name,
        bind_env_name.as_str(),
        default_bind_addr,
        std::env::var(&bind_env_name).ok().or(config_bind_addr),
        std::env::var(sdkwork_claw_config::DeploymentMode::ENV_DEPLOYMENT_MODE)
            .ok()
            .or(config_deployment_mode),
    )
}

fn all_in_one_runtime_enabled() -> bool {
    env_truthy("SDKWORK_CLAW_ALL_IN_ONE_RUNTIME")
}

fn config_value_or_default(name: &str, config_value: Option<&str>, default_value: &str) -> String {
    config_optional(name, config_value).unwrap_or_else(|| default_value.to_owned())
}

fn config_optional(name: &str, config_value: Option<&str>) -> Option<String> {
    edge_env_optional(name).or_else(|| {
        config_value
            .map(|value| value.trim().to_owned())
            .filter(|value| !value.is_empty())
    })
}

fn config_bool_or_default(name: &str, config_value: Option<bool>, default_value: bool) -> bool {
    std::env::var(name)
        .ok()
        .map(|value| {
            matches!(
                value.trim().to_ascii_lowercase().as_str(),
                "1" | "true" | "yes" | "on"
            )
        })
        .or(config_value)
        .unwrap_or(default_value)
}

fn config_u64_or_default(
    name: &str,
    config_value: Option<u64>,
    default_value: u64,
) -> anyhow::Result<u64> {
    let Some(value) = edge_env_optional(name) else {
        return Ok(config_value.unwrap_or(default_value));
    };
    value
        .parse::<u64>()
        .map_err(|error| anyhow::anyhow!("{name} must be a positive integer: {error}"))
}

fn cors_allowed_origins_from_env_or_toml(
    runtime_toml: Option<&sdkwork_claw_config::RuntimeTomlConfig>,
) -> anyhow::Result<Vec<String>> {
    const CORS_ALLOWED_ORIGINS: &str = "SDKWORK_CLAW_EDGE_CORS_ALLOWED_ORIGINS";
    if let Some(value) = edge_env_optional(CORS_ALLOWED_ORIGINS) {
        return Ok(edge_env::split_env_list(&value));
    }
    Ok(runtime_toml
        .map(|config| config.edge.cors_allowed_origins.clone())
        .unwrap_or_default())
}

fn portal_csp_frame_src_from_env_or_toml(
    runtime_toml: Option<&sdkwork_claw_config::RuntimeTomlConfig>,
) -> anyhow::Result<Vec<String>> {
    if let Some(values) = env_list_with_legacy(
        SDKWORK_CLAW_EDGE_CSP_FRAME_SRC,
        LEGACY_PORTAL_SECURITY_CSP_FRAME_SRC,
    ) {
        return Ok(values);
    }
    Ok(runtime_toml
        .and_then(|config| config.portal.security.csp_frame_src.clone())
        .unwrap_or_default())
}

fn env_truthy(name: &str) -> bool {
    std::env::var(name)
        .ok()
        .is_some_and(|value| matches!(value.as_str(), "1" | "true" | "yes" | "on"))
}
