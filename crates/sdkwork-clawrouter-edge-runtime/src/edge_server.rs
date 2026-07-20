use std::collections::{HashMap, HashSet};
use std::net::{IpAddr, SocketAddr};
use std::path::{Component, Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};

use axum::body::{to_bytes, Body};
use axum::extract::{ConnectInfo, Request, State};
use axum::http::{header, HeaderName, HeaderValue, Method, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use hyper::{Request as HyperRequest, Response as HyperResponse};
use hyper_rustls::HttpsConnector;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::TokioExecutor;
use sdkwork_sdk_generator::{
    GenerateFromFileRequest, GeneratedPackageFormat, SdkGeneratorClient, SdkLanguage, SdkType,
};
use serde_json::json;
use tokio::sync::Mutex;
use tower::ServiceExt;

use crate::runtime;

type ProxyConnector = HttpsConnector<HttpConnector>;
type ProxyClient = Client<ProxyConnector, Body>;

const DEFAULT_FORWARD_TIMEOUT: Duration = Duration::from_secs(30);
const READY_CHECK_TIMEOUT: Duration = Duration::from_secs(2);
const PRODUCTION_ASSET_CACHE_CONTROL: &str = "public, max-age=31536000, immutable";
const PRODUCTION_HTML_CACHE_CONTROL: &str = "no-store";
const DEFAULT_HSTS_MAX_AGE_SECONDS: u64 = 31_536_000;
const RUNTIME_ENV_SCRIPT_PATH: &str = "/runtime-env.js";
const TOOL_API_MAX_BODY_BYTES: usize = 1024 * 1024;
const MIN_RUNTIME_TIMEOUT: Duration = Duration::from_millis(1);
const DEFAULT_TOOL_API_RATE_LIMIT_REQUESTS: u32 = 120;
const DEFAULT_TOOL_API_RATE_LIMIT_WINDOW: Duration = Duration::from_secs(60);
const TOOL_API_RATE_LIMIT_KEY: &str = "portal-tool-api";
const SUPPORTED_TOOL_API_LANGUAGES: &[&str] = &[
    "javascript",
    "typescript",
    "python",
    "go",
    "java",
    "cpp",
    "csharp",
    "php",
    "ruby",
    "swift",
    "kotlin",
    "dart",
    "shell",
    "rust",
];
const SUPPORTED_TYPESCRIPT_LIBRARIES: &[&str] = &["axios", "fetch"];
const SUPPORTED_JAVASCRIPT_LIBRARIES: &[&str] = &["axios", "fetch"];
const SUPPORTED_PYTHON_LIBRARIES: &[&str] = &["requests"];
const SUPPORTED_SHELL_LIBRARIES: &[&str] = &["curl"];
const SUPPORTED_GENERIC_LIBRARIES: &[&str] = &[
    "net/http",
    "fasthttp",
    "resty",
    "okhttp",
    "apache-httpclient",
    "retrofit",
    "unirest",
    "cpprest",
    "cpp-httplib",
    "boost-beast",
    "httpclient",
    "restsharp",
    "refit",
    "guzzle",
    "curl",
    "faraday",
    "httparty",
    "alamofire",
    "urlsession",
    "http",
    "dio",
    "reqwest",
];

struct GeneratedSdkArchiveSpec {
    package_name: &'static str,
    language: &'static str,
    version: &'static str,
    file_name: &'static str,
}

const GENERATED_SDK_ARCHIVES: &[GeneratedSdkArchiveSpec] = &[
    GeneratedSdkArchiveSpec {
        package_name: "@sdkwork/clawrouter-app-sdk",
        language: "typescript",
        version: "0.1.0",
        file_name: "sdkwork-clawrouter-app-sdk-typescript-0.1.0.zip",
    },
    GeneratedSdkArchiveSpec {
        package_name: "@sdkwork/clawrouter-backend-sdk",
        language: "typescript",
        version: "0.1.0",
        file_name: "sdkwork-clawrouter-backend-sdk-typescript-0.1.0.zip",
    },
];
const DEFAULT_SDK_README_NAME: &str = "SdkworkAppClient";
const DEFAULT_SDK_README_VERSION: &str = "0.1.0";
const DEFAULT_SDK_README_BASE_URL: &str = "/app/v3/api";
const DEFAULT_SDK_README_PACKAGE_NAME: &str = "@sdkwork/clawrouter-app-sdk";
const DEFAULT_SDK_README_DESCRIPTION: &str = "SDKWork Claw Router app API SDK";
const OPEN_API_PREFIX: &str = "/v1";
const APP_API_PREFIX: &str = "/app/v3/api";
const BACKEND_API_PREFIX: &str = "/backend/v3/api";

#[derive(Clone, Debug)]
pub struct EdgeServerConfig {
    gateway_base_url: String,
    backend_base_url: String,
    app_base_url: String,
    portal_base_url: String,
    portal_static_dist: Option<PathBuf>,
    portal_runtime_env: PortalRuntimeEnv,
    portal_csp_connect_src_extra_origins: Vec<String>,
    portal_csp_frame_src: Vec<String>,
    portal_cors_allowed_origins: Vec<String>,
    development_private_network_cors: bool,
    portal_content_security_policy: HeaderValue,
    portal_strict_transport_security: Option<HeaderValue>,
    external_scheme: HeaderValue,
    trust_forwarded_headers: bool,
    upstream_request_timeout: Duration,
    ready_check_timeout: Duration,
    portal_html_cache_control: HeaderValue,
    portal_asset_cache_control: HeaderValue,
    portal_tool_api_max_body_bytes: usize,
    portal_tool_api_rate_limit: ToolApiRateLimitConfig,
    portal_tool_api_sdk_archive_root: Option<PathBuf>,
    portal_tool_api_sdk_generator_base_url: Option<String>,
    portal_tool_api_sdk_generator_api_key: Option<String>,
}

#[derive(Clone)]
pub struct EdgeInProcessUpstreams {
    gateway_router: Router,
    dependency_api_router: Option<Router>,
    backend_router: Router,
    app_router: Router,
}

#[derive(Clone, Copy)]
enum EdgeApiSurface {
    Gateway,
    Backend,
    App,
}

impl EdgeInProcessUpstreams {
    pub fn new(gateway_router: Router, backend_router: Router, app_router: Router) -> Self {
        Self {
            gateway_router,
            dependency_api_router: None,
            backend_router,
            app_router,
        }
    }

    pub fn with_dependency_api_router(mut self, router: Router) -> Self {
        self.dependency_api_router = Some(router);
        self
    }

    fn router_for_surface(&self, surface: EdgeApiSurface) -> Router {
        match surface {
            EdgeApiSurface::Gateway => self.gateway_router.clone(),
            EdgeApiSurface::Backend => self.backend_router.clone(),
            EdgeApiSurface::App => self.app_router.clone(),
        }
    }

    fn router_for_path(&self, path: &str) -> Option<Router> {
        if let Some(router) = self
            .dependency_api_router
            .clone()
            .filter(|_| application_api_surface_path(path))
        {
            return Some(router);
        }
        if dependency_api_path(path) {
            return Some(
                self.dependency_api_router
                    .clone()
                    .unwrap_or_else(|| self.gateway_router.clone()),
            );
        }
        surface_for_path(path).map(|surface| self.router_for_surface(surface))
    }
}

pub async fn serve(bind_addr: &str) -> anyhow::Result<()> {
    let runtime_toml = sdkwork_claw_config::RuntimeTomlConfig::from_env_config_file()
        .map_err(anyhow::Error::msg)?;
    serve_with_runtime_config(bind_addr, runtime_toml.as_ref()).await
}

pub async fn serve_with_runtime_config(
    bind_addr: &str,
    runtime_toml: Option<&sdkwork_claw_config::RuntimeTomlConfig>,
) -> anyhow::Result<()> {
    sdkwork_claw_observability::init_tracing_with_runtime_config(
        runtime_toml.map(|config| &config.observability),
    )
    .map_err(anyhow::Error::msg)?;
    let listener = tokio::net::TcpListener::bind(bind_addr).await?;
    axum::serve(listener, runtime::router_from_env().await?)
        .with_graceful_shutdown(sdkwork_claw_http::wait_for_shutdown_signal())
        .await?;
    Ok(())
}

pub async fn serve_edge_server(bind_addr: &str, config: EdgeServerConfig) -> anyhow::Result<()> {
    let runtime_toml = sdkwork_claw_config::RuntimeTomlConfig::from_env_config_file()
        .map_err(anyhow::Error::msg)?;
    serve_edge_server_with_runtime_config(bind_addr, config, runtime_toml.as_ref()).await
}

pub async fn serve_edge_server_with_runtime_config(
    bind_addr: &str,
    config: EdgeServerConfig,
    runtime_toml: Option<&sdkwork_claw_config::RuntimeTomlConfig>,
) -> anyhow::Result<()> {
    sdkwork_claw_observability::init_tracing_with_runtime_config(
        runtime_toml.map(|config| &config.observability),
    )
    .map_err(anyhow::Error::msg)?;
    let listener = tokio::net::TcpListener::bind(bind_addr).await?;
    axum::serve(listener, edge_server_router(config))
        .with_graceful_shutdown(sdkwork_claw_http::wait_for_shutdown_signal())
        .await?;
    Ok(())
}

pub async fn all_in_one_edge_router_from_env(
    config: EdgeServerConfig,
) -> anyhow::Result<axum::Router> {
    let in_process_upstreams = runtime::all_in_one_in_process_upstreams_from_env().await?;
    Ok(edge_server_router_with_in_process_upstreams(
        config,
        in_process_upstreams,
    ))
}

pub async fn serve_all_in_one_edge_server_with_runtime_config(
    bind_addr: &str,
    config: EdgeServerConfig,
    runtime_toml: Option<&sdkwork_claw_config::RuntimeTomlConfig>,
) -> anyhow::Result<()> {
    sdkwork_claw_observability::init_tracing_with_runtime_config(
        runtime_toml.map(|config| &config.observability),
    )
    .map_err(anyhow::Error::msg)?;
    let listener = tokio::net::TcpListener::bind(bind_addr).await?;
    axum::serve(listener, all_in_one_edge_router_from_env(config).await?)
        .with_graceful_shutdown(sdkwork_claw_http::wait_for_shutdown_signal())
        .await?;
    Ok(())
}

#[derive(Clone, Debug)]
struct PortalRuntimeEnv {
    api_base_url: String,
    open_api_base_url: String,
    app_api_base_url: String,
    backend_api_base_url: String,
    appbase_backend_api_base_url: Option<String>,
    tool_api_enabled: bool,
}

impl Default for PortalRuntimeEnv {
    fn default() -> Self {
        Self {
            api_base_url: "/v1".to_owned(),
            open_api_base_url: "/v1".to_owned(),
            app_api_base_url: "/app/v3/api".to_owned(),
            backend_api_base_url: "/backend/v3/api".to_owned(),
            appbase_backend_api_base_url: Some("/backend/v3/api".to_owned()),
            tool_api_enabled: false,
        }
    }
}

#[derive(Clone, Debug)]
struct ToolApiRateLimitConfig {
    max_requests: u32,
    window: Duration,
}

impl Default for ToolApiRateLimitConfig {
    fn default() -> Self {
        Self {
            max_requests: DEFAULT_TOOL_API_RATE_LIMIT_REQUESTS,
            window: DEFAULT_TOOL_API_RATE_LIMIT_WINDOW,
        }
    }
}

impl EdgeServerConfig {
    pub fn try_new(
        gateway_base_url: impl AsRef<str>,
        backend_base_url: impl AsRef<str>,
        app_base_url: impl AsRef<str>,
        portal_base_url: impl AsRef<str>,
    ) -> Result<Self, String> {
        Ok(Self {
            gateway_base_url: normalize_forward_origin(gateway_base_url.as_ref(), "gateway")?,
            backend_base_url: normalize_forward_origin(backend_base_url.as_ref(), "backend")?,
            app_base_url: normalize_forward_origin(app_base_url.as_ref(), "app")?,
            portal_base_url: normalize_forward_origin(portal_base_url.as_ref(), "portal")?,
            portal_static_dist: None,
            portal_runtime_env: PortalRuntimeEnv::default(),
            portal_csp_connect_src_extra_origins: Vec::new(),
            portal_csp_frame_src: default_portal_csp_frame_src(),
            portal_cors_allowed_origins: Vec::new(),
            development_private_network_cors: false,
            portal_content_security_policy: default_portal_content_security_policy(),
            portal_strict_transport_security: None,
            external_scheme: HeaderValue::from_static("http"),
            trust_forwarded_headers: false,
            upstream_request_timeout: DEFAULT_FORWARD_TIMEOUT,
            ready_check_timeout: READY_CHECK_TIMEOUT,
            portal_html_cache_control: HeaderValue::from_static(PRODUCTION_HTML_CACHE_CONTROL),
            portal_asset_cache_control: HeaderValue::from_static(PRODUCTION_ASSET_CACHE_CONTROL),
            portal_tool_api_max_body_bytes: TOOL_API_MAX_BODY_BYTES,
            portal_tool_api_rate_limit: ToolApiRateLimitConfig::default(),
            portal_tool_api_sdk_archive_root: None,
            portal_tool_api_sdk_generator_base_url: None,
            portal_tool_api_sdk_generator_api_key: None,
        })
    }

    pub fn with_external_scheme(mut self, value: impl AsRef<str>) -> Result<Self, String> {
        self.external_scheme = normalize_external_scheme(value.as_ref())?;
        Ok(self)
    }

    pub fn with_trusted_forwarded_headers(mut self, value: bool) -> Self {
        self.trust_forwarded_headers = value;
        self
    }

    pub fn with_upstream_request_timeout(mut self, value: Duration) -> Result<Self, String> {
        if value < MIN_RUNTIME_TIMEOUT {
            return Err("edge upstream request timeout must be greater than 0".to_owned());
        }
        self.upstream_request_timeout = value;
        Ok(self)
    }

    pub fn with_ready_check_timeout(mut self, value: Duration) -> Result<Self, String> {
        if value < MIN_RUNTIME_TIMEOUT {
            return Err("edge ready check timeout must be greater than 0".to_owned());
        }
        self.ready_check_timeout = value;
        Ok(self)
    }

    pub fn with_portal_static_dist(mut self, path: impl Into<PathBuf>) -> Result<Self, String> {
        let path = path.into();
        if !path.join("index.html").is_file() {
            return Err(format!(
                "portal static dist must contain index.html: {}",
                path.display()
            ));
        }
        self.portal_static_dist = Some(path);
        Ok(self)
    }

    pub fn with_portal_static_cache_control(
        mut self,
        html_cache_control: impl AsRef<str>,
        asset_cache_control: impl AsRef<str>,
    ) -> Result<Self, String> {
        self.portal_html_cache_control = normalize_cache_control_header(
            html_cache_control.as_ref(),
            "portal HTML cache-control",
        )?;
        self.portal_asset_cache_control = normalize_cache_control_header(
            asset_cache_control.as_ref(),
            "portal asset cache-control",
        )?;
        Ok(self)
    }

    pub fn with_portal_public_api_base_url(
        mut self,
        value: impl AsRef<str>,
    ) -> Result<Self, String> {
        self.portal_runtime_env.api_base_url =
            normalize_portal_public_url(value.as_ref(), "PORTAL_PUBLIC_API_BASE_URL")?;
        self.portal_runtime_env.open_api_base_url = self.portal_runtime_env.api_base_url.clone();
        self.refresh_portal_content_security_policy()?;
        Ok(self)
    }

    pub fn with_portal_public_sdk_base_url(
        mut self,
        value: impl AsRef<str>,
    ) -> Result<Self, String> {
        let normalized = normalize_portal_public_url(value.as_ref(), "PORTAL_PUBLIC_SDK_BASE_URL")?;
        self.portal_runtime_env.api_base_url =
            append_portal_public_sdk_base_url(&normalized, OPEN_API_PREFIX);
        self.portal_runtime_env.open_api_base_url = self.portal_runtime_env.api_base_url.clone();
        self.portal_runtime_env.app_api_base_url =
            append_portal_public_sdk_base_url(&normalized, APP_API_PREFIX);
        self.portal_runtime_env.backend_api_base_url =
            append_portal_public_sdk_base_url(&normalized, BACKEND_API_PREFIX);
        self.portal_runtime_env.appbase_backend_api_base_url = Some(
            append_portal_public_sdk_base_url(&normalized, BACKEND_API_PREFIX),
        );
        self.refresh_portal_content_security_policy()?;
        Ok(self)
    }

    pub fn with_portal_public_open_api_base_url(
        mut self,
        value: impl AsRef<str>,
    ) -> Result<Self, String> {
        self.portal_runtime_env.open_api_base_url =
            normalize_portal_public_url(value.as_ref(), "PORTAL_PUBLIC_OPEN_API_BASE_URL")?;
        self.refresh_portal_content_security_policy()?;
        Ok(self)
    }

    pub fn with_portal_public_app_api_base_url(
        mut self,
        value: impl AsRef<str>,
    ) -> Result<Self, String> {
        self.portal_runtime_env.app_api_base_url =
            normalize_portal_public_url(value.as_ref(), "PORTAL_PUBLIC_APP_API_BASE_URL")?;
        self.refresh_portal_content_security_policy()?;
        Ok(self)
    }

    pub fn with_portal_public_backend_api_base_url(
        mut self,
        value: impl AsRef<str>,
    ) -> Result<Self, String> {
        let previous_backend_api_base_url = self.portal_runtime_env.backend_api_base_url.clone();
        let normalized =
            normalize_portal_public_url(value.as_ref(), "PORTAL_PUBLIC_BACKEND_API_BASE_URL")?;
        self.portal_runtime_env.backend_api_base_url = normalized.clone();
        if self
            .portal_runtime_env
            .appbase_backend_api_base_url
            .as_deref()
            .map_or(true, |value| value == previous_backend_api_base_url)
        {
            self.portal_runtime_env.appbase_backend_api_base_url = Some(normalized);
        }
        self.refresh_portal_content_security_policy()?;
        Ok(self)
    }

    pub fn with_portal_public_appbase_backend_api_base_url(
        mut self,
        value: impl AsRef<str>,
    ) -> Result<Self, String> {
        self.portal_runtime_env.appbase_backend_api_base_url = Some(normalize_portal_public_url(
            value.as_ref(),
            "PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL",
        )?);
        self.refresh_portal_content_security_policy()?;
        Ok(self)
    }

    pub fn with_portal_public_tool_api_enabled(mut self, value: bool) -> Self {
        self.portal_runtime_env.tool_api_enabled = value;
        self
    }

    pub fn with_portal_tool_api_max_body_bytes(mut self, value: usize) -> Result<Self, String> {
        if value == 0 {
            return Err("portal tool API max body bytes must be greater than 0".to_owned());
        }
        self.portal_tool_api_max_body_bytes = value;
        Ok(self)
    }

    pub fn with_portal_tool_api_rate_limit(
        mut self,
        max_requests: u32,
        window: Duration,
    ) -> Result<Self, String> {
        if max_requests == 0 {
            return Err("portal tool API rate limit requests must be greater than 0".to_owned());
        }
        if window.is_zero() {
            return Err("portal tool API rate limit window must be greater than 0".to_owned());
        }
        self.portal_tool_api_rate_limit = ToolApiRateLimitConfig {
            max_requests,
            window,
        };
        Ok(self)
    }

    pub fn with_portal_tool_api_sdk_archive_root(
        mut self,
        path: impl Into<PathBuf>,
    ) -> Result<Self, String> {
        let path = path.into();
        if !path.is_dir() {
            return Err(format!(
                "portal tool API SDK archive root must be an existing directory: {}",
                path.display()
            ));
        }
        let path = std::fs::canonicalize(&path).map_err(|error| {
            format!(
                "failed to resolve portal tool API SDK archive root {}: {error}",
                path.display()
            )
        })?;
        self.portal_tool_api_sdk_archive_root = Some(path);
        Ok(self)
    }

    pub fn with_portal_tool_api_sdk_generator_base_url(
        mut self,
        value: impl AsRef<str>,
    ) -> Result<Self, String> {
        self.portal_tool_api_sdk_generator_base_url = Some(normalize_forward_origin(
            value.as_ref(),
            "portal tool API SDK generator",
        )?);
        Ok(self)
    }

    pub fn with_portal_tool_api_sdk_generator_api_key(
        mut self,
        value: impl Into<String>,
    ) -> Result<Self, String> {
        let value = value.into();
        let trimmed = value.trim();
        if trimmed.is_empty() || trimmed.contains(['\r', '\n']) {
            return Err("portal tool API SDK generator API key must not be empty".to_owned());
        }
        self.portal_tool_api_sdk_generator_api_key = Some(trimmed.to_owned());
        Ok(self)
    }

    pub fn with_portal_csp_connect_src(mut self, value: impl AsRef<str>) -> Result<Self, String> {
        self.portal_csp_connect_src_extra_origins =
            normalize_portal_csp_connect_src(value.as_ref())?;
        self.refresh_portal_content_security_policy()?;
        Ok(self)
    }

    pub fn with_portal_csp_frame_src<I, S>(mut self, origins: I) -> Result<Self, String>
    where
        I: IntoIterator<Item = S>,
        S: AsRef<str>,
    {
        let mut normalized_origins = default_portal_csp_frame_src();
        for origin in origins {
            let normalized_origin = normalize_portal_csp_frame_src_origin(origin.as_ref())?;
            if !normalized_origins.contains(&normalized_origin) {
                normalized_origins.push(normalized_origin);
            }
        }
        self.portal_csp_frame_src = normalized_origins;
        self.refresh_portal_content_security_policy()?;
        Ok(self)
    }

    pub fn with_portal_strict_transport_security(
        mut self,
        enabled: bool,
        max_age_seconds: u64,
        include_subdomains: bool,
        preload: bool,
    ) -> Result<Self, String> {
        self.portal_strict_transport_security = strict_transport_security_header(
            enabled,
            max_age_seconds,
            include_subdomains,
            preload,
        )?;
        Ok(self)
    }

    pub fn with_cors_allowed_origins<I, S>(mut self, origins: I) -> Result<Self, String>
    where
        I: IntoIterator<Item = S>,
        S: AsRef<str>,
    {
        let mut normalized = Vec::new();
        for origin in origins {
            let origin = normalize_edge_cors_allowed_origin(origin.as_ref())?;
            if !normalized.contains(&origin) {
                normalized.push(origin);
            }
        }
        self.portal_cors_allowed_origins = normalized;
        Ok(self)
    }

    pub fn with_development_private_network_cors(mut self, enabled: bool) -> Self {
        self.development_private_network_cors = enabled;
        self
    }

    fn refresh_portal_content_security_policy(&mut self) -> Result<(), String> {
        self.portal_content_security_policy = build_portal_content_security_policy(self)?;
        Ok(())
    }

    fn target_for_path(&self, path: &str) -> Option<&str> {
        if path == sdkwork_claw_http::OPENAPI_SCHEMA_TABS_PATH {
            return Some(&self.gateway_base_url);
        }
        if path == "/openapi.json" {
            return Some(&self.gateway_base_url);
        }
        if path == sdkwork_claw_http::PAYMENT_AGGREGATE_OPENAPI_PATH {
            return Some(&self.gateway_base_url);
        }
        if path == sdkwork_claw_http::PAAS_OPENAPI_PATH {
            return Some(&self.gateway_base_url);
        }
        if path == sdkwork_claw_http::CLOUD_SERVICES_OPENAPI_PATH {
            return Some(&self.gateway_base_url);
        }
        if path == "/v1" || path.starts_with("/v1/") {
            return Some(&self.gateway_base_url);
        }
        if path == "/backend/v3/api" || path.starts_with("/backend/v3/api/") {
            return Some(&self.backend_base_url);
        }
        if path == "/app/v3/api" || path.starts_with("/app/v3/api/") {
            return Some(&self.app_base_url);
        }
        if self.portal_static_dist.is_none() {
            return Some(&self.portal_base_url);
        }
        None
    }
}

fn surface_for_path(path: &str) -> Option<EdgeApiSurface> {
    if path == sdkwork_claw_http::OPENAPI_SCHEMA_TABS_PATH
        || path == "/openapi.json"
        || path == sdkwork_claw_http::PAYMENT_AGGREGATE_OPENAPI_PATH
        || path == sdkwork_claw_http::PAAS_OPENAPI_PATH
        || path == sdkwork_claw_http::CLOUD_SERVICES_OPENAPI_PATH
        || path == "/v1"
        || path.starts_with("/v1/")
    {
        return Some(EdgeApiSurface::Gateway);
    }
    if path == "/backend/v3/api" || path.starts_with("/backend/v3/api/") {
        return Some(EdgeApiSurface::Backend);
    }
    if path == "/app/v3/api" || path.starts_with("/app/v3/api/") {
        return Some(EdgeApiSurface::App);
    }
    None
}

fn dependency_api_path(path: &str) -> bool {
    if is_clawrouter_owned_iam_app_path(path) {
        return false;
    }

    const APPBASE_APP_DEPENDENCY_PREFIXES: [&str; 4] = [
        "/app/v3/api/auth",
        "/app/v3/api/iam",
        "/app/v3/api/oauth",
        "/app/v3/api/system/iam",
    ];

    APPBASE_APP_DEPENDENCY_PREFIXES
        .iter()
        .any(|prefix| path_matches_prefix(path, prefix))
}

fn is_clawrouter_owned_iam_app_path(path: &str) -> bool {
    const CLAWROUTER_OWNED_IAM_APP_PREFIXES: &[&str] =
        &["/app/v3/api/iam/api_keys", "/app/v3/api/iam/users/settings"];

    CLAWROUTER_OWNED_IAM_APP_PREFIXES.iter().any(|prefix| {
        path == prefix.trim_end_matches('/') || path.starts_with(&format!("{prefix}/"))
    })
}

fn application_api_surface_path(path: &str) -> bool {
    path_matches_prefix(path, APP_API_PREFIX) || path_matches_prefix(path, BACKEND_API_PREFIX)
}

fn path_matches_prefix(path: &str, prefix: &str) -> bool {
    path == prefix
        || path
            .strip_prefix(prefix)
            .is_some_and(|suffix| suffix.starts_with('/'))
}

struct EdgeServerState {
    config: EdgeServerConfig,
    client: ProxyClient,
    in_process_upstreams: Option<EdgeInProcessUpstreams>,
    portal_tool_api_rate_limiter: Mutex<ToolApiRateLimiter>,
}

pub fn edge_server_router(config: EdgeServerConfig) -> Router {
    edge_server_router_with_optional_in_process_upstreams(config, None)
}

pub fn edge_server_router_with_in_process_upstreams(
    config: EdgeServerConfig,
    in_process_upstreams: EdgeInProcessUpstreams,
) -> Router {
    edge_server_router_with_optional_in_process_upstreams(config, Some(in_process_upstreams))
}

fn edge_server_router_with_optional_in_process_upstreams(
    config: EdgeServerConfig,
    in_process_upstreams: Option<EdgeInProcessUpstreams>,
) -> Router {
    let portal_tool_api_rate_limiter = Mutex::new(ToolApiRateLimiter::new(
        config.portal_tool_api_rate_limit.clone(),
    ));
    Router::new()
        .route("/healthz", get(edge_health))
        .route("/readyz", get(edge_ready))
        .fallback(edge_dispatch)
        .with_state(Arc::new(EdgeServerState {
            config,
            client: build_proxy_client(),
            in_process_upstreams,
            portal_tool_api_rate_limiter,
        }))
}

async fn edge_health() -> impl IntoResponse {
    Json(json!({
        "status": "ok",
        "service": "sdkwork-claw-edge-server",
    }))
}

async fn edge_ready(State(state): State<Arc<EdgeServerState>>) -> Response {
    let gateway = check_edge_api_health(state.as_ref(), "gateway", EdgeApiSurface::Gateway);
    let backend = check_edge_api_health(state.as_ref(), "backend", EdgeApiSurface::Backend);
    let app = check_edge_api_health(state.as_ref(), "app", EdgeApiSurface::App);
    let portal = check_portal_readiness(state.as_ref());
    let (gateway, backend, app, portal) = tokio::join!(gateway, backend, app, portal);
    let ready = gateway.ready && backend.ready && app.ready && portal.ready;

    let status = if ready {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };
    (
        status,
        Json(json!({
            "status": if ready { "ok" } else { "unavailable" },
            "service": "sdkwork-claw-edge-server",
            "upstreams": {
                "gateway": gateway.payload,
                "backend": backend.payload,
                "app": app.payload,
                "portal": portal.payload,
            },
        })),
    )
        .into_response()
}

async fn edge_dispatch(State(state): State<Arc<EdgeServerState>>, request: Request) -> Response {
    if is_cors_preflight(&request) {
        return preflight_response(state.as_ref(), &request);
    }

    let cors_origin = cors_origin_for_request(state.as_ref(), &request);
    let response = if let Some(response) = static_portal_contract_response(state.as_ref(), &request)
    {
        response
    } else if state.config.target_for_path(request.uri().path()).is_some() {
        forward_request(state.as_ref(), request)
            .await
            .unwrap_or_else(|message| proxy_error_response(&message))
    } else {
        serve_portal_static(state.as_ref(), request).await
    };
    with_cors_headers(response, cors_origin)
}

async fn forward_request(state: &EdgeServerState, request: Request) -> Result<Response, String> {
    if state.in_process_upstreams.is_some() {
        if let Some(router) = state
            .in_process_upstreams
            .as_ref()
            .and_then(|upstreams| upstreams.router_for_path(request.uri().path()))
        {
            return forward_request_to_in_process_router(state, router, request).await;
        }
    }

    let target = state
        .config
        .target_for_path(request.uri().path())
        .ok_or_else(|| "request path is not configured for forwarding".to_owned())?;
    let uri = build_forward_uri(target, request.uri())?;
    let (parts, body) = request.into_parts();
    let mut builder = HyperRequest::builder().method(parts.method).uri(uri);
    {
        let headers = builder
            .headers_mut()
            .ok_or_else(|| "failed to build upstream request headers".to_owned())?;
        let connection_header_names = connection_header_names(&parts.headers);
        let forwarded_host = parts.headers.get(header::HOST).cloned();
        let trusted_forwarded_host = parts.headers.get("x-forwarded-host").cloned();
        let trusted_forwarded_proto = parts.headers.get("x-forwarded-proto").cloned();
        let trusted_forwarded_for = parts.headers.get("x-forwarded-for").cloned();
        for (name, value) in parts.headers.iter() {
            if should_forward_request_header(name, &connection_header_names) {
                headers.append(name, value.clone());
            }
        }
        if state.config.trust_forwarded_headers {
            if let Some(host) = trusted_forwarded_host.or(forwarded_host) {
                headers.insert("x-forwarded-host", host);
            }
            if let Some(proto) =
                trusted_forwarded_proto.filter(|value| is_valid_forwarded_proto(value))
            {
                headers.insert("x-forwarded-proto", proto);
            } else {
                headers.insert("x-forwarded-proto", state.config.external_scheme.clone());
            }
            if let Some(forwarded_for) = trusted_forwarded_for {
                headers.insert("x-forwarded-for", forwarded_for);
            }
        } else {
            if let Some(host) = forwarded_host {
                headers.insert("x-forwarded-host", host);
            }
            headers.insert("x-forwarded-proto", state.config.external_scheme.clone());
        }
    }

    let upstream_request = builder
        .body(body)
        .map_err(|error| format!("failed to build upstream request: {error}"))?;
    let upstream_response = tokio::time::timeout(
        state.config.upstream_request_timeout,
        state.client.request(upstream_request),
    )
    .await
    .map_err(|_| "upstream request timed out".to_owned())?
    .map_err(|error| format!("upstream request failed: {error}"))?;

    upstream_to_axum_response(upstream_response).await
}

async fn forward_request_to_in_process_router(
    state: &EdgeServerState,
    router: Router,
    request: Request,
) -> Result<Response, String> {
    tokio::time::timeout(
        state.config.upstream_request_timeout,
        router.oneshot(request),
    )
    .await
    .map_err(|_| "in-process upstream request timed out".to_owned())?
    .map_err(|error| format!("in-process upstream request failed: {error}"))
}

async fn serve_portal_static(state: &EdgeServerState, request: Request) -> Response {
    let path = request.uri().path();
    if path.starts_with("/api/") {
        return handle_portal_tool_api(state, request).await;
    }

    if request.method() != Method::GET && request.method() != Method::HEAD {
        return StatusCode::METHOD_NOT_ALLOWED.into_response();
    }

    let Some(dist_root) = &state.config.portal_static_dist else {
        return proxy_error_response("portal static dist is not configured");
    };
    if path == RUNTIME_ENV_SCRIPT_PATH {
        return portal_static_response(
            StatusCode::OK,
            "application/javascript; charset=utf-8",
            &state.config.portal_html_cache_control,
            build_portal_runtime_env_script(&state.config.portal_runtime_env),
            &state.config,
        );
    }
    let requested_file = match portal_file_path(dist_root, path) {
        Some(file_path) if file_path.is_file() => file_path,
        _ => dist_root.join("index.html"),
    };
    if requested_file.ends_with("index.html") {
        match tokio::fs::read_to_string(&requested_file).await {
            Ok(html) => match inject_portal_runtime_env_script(&html) {
                Ok(html) => {
                    return portal_static_response(
                        StatusCode::OK,
                        "text/html; charset=utf-8",
                        &state.config.portal_html_cache_control,
                        html,
                        &state.config,
                    )
                }
                Err(message) => return proxy_error_response(&message),
            },
            Err(error) => {
                return proxy_error_response(&format!("failed to read portal index.html: {error}"))
            }
        }
    }

    match tokio::fs::read(&requested_file).await {
        Ok(bytes) => {
            let mut response = Response::new(Body::from(bytes));
            *response.status_mut() = StatusCode::OK;
            apply_portal_security_headers(response.headers_mut(), &state.config);
            response.headers_mut().insert(
                header::CONTENT_TYPE,
                HeaderValue::from_static(content_type_for_path(&requested_file)),
            );
            response.headers_mut().insert(
                header::CACHE_CONTROL,
                state.config.portal_asset_cache_control.clone(),
            );
            response
        }
        Err(error) => proxy_error_response(&format!("failed to read portal static asset: {error}")),
    }
}

fn static_portal_contract_response(state: &EdgeServerState, request: &Request) -> Option<Response> {
    if state.config.portal_static_dist.is_none() || request.method() != Method::GET {
        return None;
    }

    match request.uri().path() {
        sdkwork_claw_http::OPENAPI_SCHEMA_TABS_PATH => Some(
            sdkwork_claw_http::openapi_schema_tabs_response_for_surface(None),
        ),
        sdkwork_claw_http::GATEWAY_OPENAPI_PATH => {
            Some(sdkwork_claw_http::gateway_openapi_response())
        }
        sdkwork_claw_http::PAYMENT_AGGREGATE_OPENAPI_PATH => {
            Some(sdkwork_claw_http::payment_aggregate_openapi_response())
        }
        sdkwork_claw_http::PAAS_OPENAPI_PATH => Some(sdkwork_claw_http::paas_openapi_response()),
        sdkwork_claw_http::CLOUD_SERVICES_OPENAPI_PATH => {
            Some(sdkwork_claw_http::cloud_services_openapi_response())
        }
        sdkwork_claw_http::APP_OPENAPI_PATH => Some(sdkwork_claw_http::app_openapi_response()),
        sdkwork_claw_http::BACKEND_OPENAPI_PATH => {
            Some(sdkwork_claw_http::backend_openapi_response())
        }
        _ => None,
    }
}

async fn handle_portal_tool_api(state: &EdgeServerState, request: Request) -> Response {
    let path = request.uri().path().to_owned();
    if !matches!(
        path.as_str(),
        "/api/code-snippet" | "/api/sdk-readme" | "/api/generate-sdk"
    ) {
        return json_error_response(StatusCode::NOT_FOUND, "Not found");
    }

    if !state.config.portal_runtime_env.tool_api_enabled {
        return json_error_response(StatusCode::NOT_FOUND, "Not found");
    }

    if request.method() != Method::POST {
        return json_error_response(StatusCode::METHOD_NOT_ALLOWED, "Method not allowed");
    }

    let tool_request_origin = portal_tool_api_request_origin(state, &request);
    let rate_limit_key = portal_tool_api_rate_limit_key(state, &request);
    let rate_limit = state
        .portal_tool_api_rate_limiter
        .lock()
        .await
        .check(&rate_limit_key);
    if !rate_limit.allowed {
        return with_rate_limit_headers(
            json_response(
                StatusCode::TOO_MANY_REQUESTS,
                json!({
                    "code": "tool_api_rate_limited",
                    "error": "Too many local tool API requests. Retry after the current rate limit window resets.",
                }),
            ),
            &rate_limit,
        );
    }

    let body = match to_bytes(
        request.into_body(),
        state.config.portal_tool_api_max_body_bytes,
    )
    .await
    {
        Ok(body) => body,
        Err(_) => {
            return with_rate_limit_headers(
                json_error_response(StatusCode::PAYLOAD_TOO_LARGE, "Request body is too large"),
                &rate_limit,
            )
        }
    };
    let payload = match serde_json::from_slice::<serde_json::Value>(&body) {
        Ok(payload) => payload,
        Err(error) => {
            return with_rate_limit_headers(
                json_error_response(
                    StatusCode::BAD_REQUEST,
                    &format!("Request body must be valid JSON: {error}"),
                ),
                &rate_limit,
            )
        }
    };

    let response = match path.as_str() {
        "/api/code-snippet" => match normalize_code_snippet_request(&payload) {
            Ok(request) => json_ok_response(json!({ "code": build_code_snippet(&request) })),
            Err(message) => json_error_response(StatusCode::BAD_REQUEST, &message),
        },
        "/api/sdk-readme" => match normalize_sdk_readme_request(&payload) {
            Ok(mut request) => {
                request.request_origin = tool_request_origin.clone();
                json_ok_response(json!({ "readme": build_sdk_readme(&request) }))
            }
            Err(message) => json_error_response(StatusCode::BAD_REQUEST, &message),
        },
        "/api/generate-sdk" => match normalize_sdk_readme_request(&payload) {
            Ok(mut request) => {
                request.request_origin = tool_request_origin.clone();
                generate_or_serve_sdk_archive(state, &request).await
            }
            Err(message) => json_error_response(StatusCode::BAD_REQUEST, &message),
        },
        _ => json_error_response(StatusCode::NOT_FOUND, "Not found"),
    };
    with_rate_limit_headers(response, &rate_limit)
}

async fn serve_prebuilt_sdk_archive(
    state: &EdgeServerState,
    request: &SdkReadmeRequest,
) -> Response {
    let Some(root) = &state.config.portal_tool_api_sdk_archive_root else {
        return json_response(
            StatusCode::NOT_IMPLEMENTED,
            json!({
                "code": "sdk_generation_unavailable",
                "error": "SDK archive generation is not available in the Rust edge server. Configure SDKWORK_CLAW_TOOL_API_SDK_ARCHIVE_ROOT to serve prebuilt SDK ZIP archives produced by the release pipeline.",
            }),
        );
    };
    let file_name = match sdk_archive_file_name(request) {
        Ok(file_name) => file_name,
        Err(SdkArchiveFileNameError::InvalidIdentity(message)) => {
            return json_error_response(StatusCode::BAD_REQUEST, &message)
        }
        Err(SdkArchiveFileNameError::UnsupportedArchive) => {
            return json_response(
                StatusCode::BAD_REQUEST,
                json!({
                    "code": "unsupported_sdk_archive",
                    "error": "Only generated TypeScript app and backend SDK archives are available from this edge server.",
                }),
            )
        }
    };
    let archive_path = root.join(file_name);
    if !is_direct_child_path(root, &archive_path) {
        return json_error_response(StatusCode::BAD_REQUEST, "SDK archive path is invalid");
    }
    if !archive_path.is_file() {
        return json_response(
            StatusCode::NOT_FOUND,
            json!({
                "code": "sdk_archive_not_found",
                "error": format!("Prebuilt SDK archive was not found: {file_name}"),
            }),
        );
    }
    let archive_path = match tokio::fs::canonicalize(&archive_path).await {
        Ok(path) => path,
        Err(error) => {
            return proxy_error_response(&format!("failed to resolve SDK archive: {error}"))
        }
    };
    if !is_direct_child_path(root, &archive_path) {
        return json_error_response(StatusCode::BAD_REQUEST, "SDK archive path is invalid");
    }

    match tokio::fs::read(&archive_path).await {
        Ok(bytes) => sdk_archive_response(bytes, file_name),
        Err(error) => proxy_error_response(&format!("failed to read SDK archive: {error}")),
    }
}

async fn generate_or_serve_sdk_archive(
    state: &EdgeServerState,
    request: &SdkReadmeRequest,
) -> Response {
    if let Err(response) = validate_sdk_archive_request_identity(request) {
        return response;
    }

    match generate_sdk_archive(state, request).await {
        SdkArchiveGenerationResult::Generated(response) => response,
        SdkArchiveGenerationResult::Unavailable => serve_prebuilt_sdk_archive(state, request).await,
        SdkArchiveGenerationResult::Failed(response) => {
            if state.config.portal_tool_api_sdk_archive_root.is_some() {
                serve_prebuilt_sdk_archive(state, request).await
            } else {
                response
            }
        }
    }
}

async fn generate_sdk_archive(
    state: &EdgeServerState,
    request: &SdkReadmeRequest,
) -> SdkArchiveGenerationResult {
    let generator_base_url = state
        .config
        .portal_tool_api_sdk_generator_base_url
        .clone()
        .or_else(|| current_request_origin_from_tool_request(request));
    let Some(generator_base_url) = generator_base_url else {
        return SdkArchiveGenerationResult::Unavailable;
    };

    let language = match sdk_generator_language(&request.language) {
        Ok(language) => language,
        Err(message) => {
            return SdkArchiveGenerationResult::Generated(json_error_response(
                StatusCode::BAD_REQUEST,
                &message,
            ))
        }
    };
    let sdk_type = match request
        .sdk_type
        .as_deref()
        .map(sdk_generator_type)
        .transpose()
    {
        Ok(value) => value,
        Err(message) => {
            return SdkArchiveGenerationResult::Generated(json_error_response(
                StatusCode::BAD_REQUEST,
                &message,
            ))
        }
    };

    let mut builder = SdkGeneratorClient::builder(generator_base_url);
    if let Some(api_key) = &state.config.portal_tool_api_sdk_generator_api_key {
        builder = builder.api_key(api_key);
    }
    let client = match builder.build() {
        Ok(client) => client,
        Err(error) => {
            return SdkArchiveGenerationResult::Failed(json_response(
                StatusCode::BAD_GATEWAY,
                json!({
                    "code": "sdk_generator_invalid_config",
                    "error": format!("SDK generator configuration is invalid: {error}"),
                }),
            ))
        }
    };

    let spec_bytes = match serde_json::to_vec(&request.spec) {
        Ok(bytes) => bytes,
        Err(error) => {
            return SdkArchiveGenerationResult::Generated(json_error_response(
                StatusCode::BAD_REQUEST,
                &format!("spec must be serializable JSON: {error}"),
            ))
        }
    };
    let mut generate_request = GenerateFromFileRequest::new(
        api_spec_file_name(request),
        spec_bytes,
        language,
        request.name.clone(),
    )
    .base_url(request.base_url.clone())
    .api_prefix(
        request
            .api_prefix
            .clone()
            .unwrap_or_else(|| request.base_url.clone()),
    )
    .version(request.version.clone());

    if let Some(sdk_type) = sdk_type {
        generate_request = generate_request.sdk_type(sdk_type);
    }
    if let Some(package_name) = &request.package_name {
        generate_request = generate_request.package_name(package_name.clone());
    }
    if let Some(description) = &request.description {
        generate_request = generate_request.description(description.clone());
    }
    if let Some(author) = &request.author {
        generate_request = generate_request.author(author.clone());
    }
    if let Some(license) = &request.license {
        generate_request = generate_request.license(license.clone());
    }

    match client
        .generate_from_file_and_download(generate_request, GeneratedPackageFormat::Zip)
        .await
    {
        Ok(package) => SdkArchiveGenerationResult::Generated(sdk_generated_package_response(
            package.bytes.to_vec(),
            package.content_type.as_deref().unwrap_or("application/zip"),
            package.file_name.as_deref().unwrap_or("sdk.zip"),
        )),
        Err(error) => SdkArchiveGenerationResult::Failed(json_response(
            StatusCode::BAD_GATEWAY,
            json!({
                "code": "sdk_generator_failed",
                "error": format!("SDK generator request failed: {error}"),
            }),
        )),
    }
}

enum SdkArchiveGenerationResult {
    Generated(Response),
    Failed(Response),
    Unavailable,
}

struct ToolApiRateLimiter {
    config: ToolApiRateLimitConfig,
    buckets: HashMap<String, ToolApiRateLimitBucket>,
}

struct ToolApiRateLimitBucket {
    window_started_at: Instant,
    used: u32,
}

struct ToolApiRateLimitOutcome {
    allowed: bool,
    limit: u32,
    remaining: u32,
    reset_after: Duration,
}

impl ToolApiRateLimiter {
    fn new(config: ToolApiRateLimitConfig) -> Self {
        Self {
            config,
            buckets: HashMap::new(),
        }
    }

    fn check(&mut self, key: &str) -> ToolApiRateLimitOutcome {
        let now = Instant::now();
        self.buckets
            .retain(|_, bucket| now.duration_since(bucket.window_started_at) < self.config.window);
        let bucket = self
            .buckets
            .entry(key.to_owned())
            .or_insert_with(|| ToolApiRateLimitBucket {
                window_started_at: now,
                used: 0,
            });

        if now.duration_since(bucket.window_started_at) >= self.config.window {
            bucket.window_started_at = now;
            bucket.used = 0;
        }

        let reset_after = self
            .config
            .window
            .saturating_sub(now.duration_since(bucket.window_started_at));
        if bucket.used >= self.config.max_requests {
            return ToolApiRateLimitOutcome {
                allowed: false,
                limit: self.config.max_requests,
                remaining: 0,
                reset_after,
            };
        }

        bucket.used += 1;
        ToolApiRateLimitOutcome {
            allowed: true,
            limit: self.config.max_requests,
            remaining: self.config.max_requests.saturating_sub(bucket.used),
            reset_after,
        }
    }
}

fn portal_tool_api_rate_limit_key(state: &EdgeServerState, request: &Request) -> String {
    if state.config.trust_forwarded_headers {
        if let Some(client_ip) = trusted_forwarded_client_ip(request) {
            return format!("forwarded:{client_ip}");
        }
    }
    request
        .extensions()
        .get::<ConnectInfo<SocketAddr>>()
        .map(|ConnectInfo(addr)| format!("remote:{}", addr.ip()))
        .unwrap_or_else(|| TOOL_API_RATE_LIMIT_KEY.to_owned())
}

fn portal_tool_api_request_origin(state: &EdgeServerState, request: &Request) -> Option<String> {
    let host = if state.config.trust_forwarded_headers {
        request
            .headers()
            .get("x-forwarded-host")
            .or_else(|| request.headers().get(header::HOST))
    } else {
        request.headers().get(header::HOST)
    }?;
    let host = host.to_str().ok()?.trim();
    if !is_safe_http_host(host) {
        return None;
    }

    let scheme = if state.config.trust_forwarded_headers {
        request
            .headers()
            .get("x-forwarded-proto")
            .filter(|value| is_valid_forwarded_proto(value))
            .cloned()
            .unwrap_or_else(|| state.config.external_scheme.clone())
    } else {
        state.config.external_scheme.clone()
    };
    let scheme = scheme.to_str().ok()?;
    Some(format!("{scheme}://{host}"))
}

fn is_safe_http_host(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 253
        && !value.contains(['/', '\\', '?', '#', '\r', '\n', '@'])
        && !value.starts_with('.')
        && !value.ends_with('.')
}

fn trusted_forwarded_client_ip(request: &Request) -> Option<IpAddr> {
    request
        .headers()
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        .and_then(first_forwarded_ip)
}

fn first_forwarded_ip(value: &str) -> Option<IpAddr> {
    value
        .split(',')
        .map(str::trim)
        .find_map(|candidate| candidate.parse::<IpAddr>().ok())
}

struct CodeSnippetRequest {
    path: String,
    method: String,
    base_url: String,
    language: String,
    library: String,
    operation: serde_json::Value,
    path_item: serde_json::Value,
    openapi_spec: serde_json::Value,
}

struct SdkReadmeRequest {
    name: String,
    version: String,
    language: String,
    base_url: String,
    api_prefix: Option<String>,
    sdk_type: Option<String>,
    package_name: Option<String>,
    description: Option<String>,
    author: Option<String>,
    license: Option<String>,
    api_spec_path: Option<String>,
    spec_title: String,
    spec: serde_json::Value,
    request_origin: Option<String>,
}

fn normalize_code_snippet_request(
    payload: &serde_json::Value,
) -> Result<CodeSnippetRequest, String> {
    let object = payload
        .as_object()
        .ok_or_else(|| "request body must be a JSON object".to_owned())?;
    let path = require_api_path(object.get("path"), "path")?;
    let method = require_http_method(object.get("method"))?;
    let base_url = require_public_tool_base_url(object.get("baseUrl"), "baseUrl")?;
    let language = require_tool_token(object.get("language"), "language")?.to_ascii_lowercase();
    if !SUPPORTED_TOOL_API_LANGUAGES.contains(&language.as_str()) {
        return Err(format!("language {language} is not supported"));
    }
    let library = require_tool_token(object.get("library"), "library")?.to_ascii_lowercase();
    if !library_supported_for_language(&language, &library) {
        return Err(format!("library {library} is not supported for {language}"));
    }
    let operation = serde_json::Value::Object(
        require_json_object(object.get("operation"), "operation")?.clone(),
    );
    let path_item = object
        .get("pathItem")
        .map(|value| require_json_object(Some(value), "pathItem"))
        .transpose()?
        .cloned()
        .map(serde_json::Value::Object)
        .unwrap_or_else(|| json!({}));
    let openapi_spec = serde_json::Value::Object(
        require_json_object(object.get("openAPISpec"), "openAPISpec")?.clone(),
    );

    Ok(CodeSnippetRequest {
        path,
        method,
        base_url,
        language,
        library,
        operation,
        path_item,
        openapi_spec,
    })
}

fn normalize_sdk_readme_request(payload: &serde_json::Value) -> Result<SdkReadmeRequest, String> {
    let object = payload
        .as_object()
        .ok_or_else(|| "request body must be a JSON object".to_owned())?;
    let spec = require_json_object(object.get("spec"), "spec")?;
    let info = require_json_object(spec.get("info"), "spec.info")?;
    let spec_title = require_non_empty_string(info.get("title"), "spec.info.title")?;
    require_non_empty_string(info.get("version"), "spec.info.version")?;
    require_json_object(spec.get("paths"), "spec.paths")?;

    let language = require_tool_token(object.get("language"), "language")?.to_ascii_lowercase();
    if !SUPPORTED_TOOL_API_LANGUAGES.contains(&language.as_str()) {
        return Err(format!("language {language} is not supported"));
    }

    let config = object
        .get("config")
        .map(|value| require_json_object(Some(value), "config"))
        .transpose()?;
    if let Some(config) = config {
        if let Some(config_language) = config.get("language") {
            let config_language =
                require_tool_token(Some(config_language), "config.language")?.to_ascii_lowercase();
            if config_language != language {
                return Err("config.language must match language".to_owned());
            }
        }
    }
    let name = optional_safe_string(config.and_then(|value| value.get("name")), "config.name")?
        .unwrap_or_else(|| DEFAULT_SDK_README_NAME.to_owned());
    let version = optional_safe_string(
        config.and_then(|value| value.get("version")),
        "config.version",
    )?
    .unwrap_or_else(|| DEFAULT_SDK_README_VERSION.to_owned());
    let base_url = config
        .and_then(|value| value.get("baseUrl"))
        .map(|value| require_public_tool_base_url(Some(value), "config.baseUrl"))
        .transpose()?
        .unwrap_or_else(|| DEFAULT_SDK_README_BASE_URL.to_owned());
    let api_prefix = config
        .and_then(|value| value.get("apiPrefix"))
        .map(|value| require_api_path(Some(value), "config.apiPrefix"))
        .transpose()?;
    let sdk_type = config
        .and_then(|value| value.get("sdkType"))
        .map(|value| require_tool_token(Some(value), "config.sdkType"))
        .transpose()?;
    let package_name = optional_safe_string(
        config.and_then(|value| value.get("packageName")),
        "config.packageName",
    )?;
    let description = optional_safe_string(
        config.and_then(|value| value.get("description")),
        "config.description",
    )?;
    let author = optional_safe_string(
        config.and_then(|value| value.get("author")),
        "config.author",
    )?;
    let license = optional_safe_string(
        config.and_then(|value| value.get("license")),
        "config.license",
    )?;
    let api_spec_path = optional_safe_string(
        config.and_then(|value| value.get("apiSpecPath")),
        "config.apiSpecPath",
    )?;

    Ok(SdkReadmeRequest {
        name,
        version,
        language,
        base_url,
        api_prefix,
        sdk_type,
        package_name,
        description,
        author,
        license,
        api_spec_path,
        spec_title,
        spec: serde_json::Value::Object(spec.clone()),
        request_origin: None,
    })
}

fn build_code_snippet(request: &CodeSnippetRequest) -> String {
    let url = expand_request_url(request);
    let body = request_body_example(request);
    match request.language.as_str() {
        "typescript" | "javascript" if request.library == "axios" => {
            build_axios_snippet(&request.method, &url, body.as_ref())
        }
        "typescript" | "javascript" => build_fetch_snippet(&request.method, &url, body.as_ref()),
        "python" => build_python_snippet(&request.method, &url, body.as_ref()),
        "shell" => build_shell_snippet(&request.method, &url, body.as_ref()),
        _ => build_generic_http_snippet(&request.method, &url, body.as_ref()),
    }
}

fn build_sdk_readme(request: &SdkReadmeRequest) -> String {
    let package_name = request
        .package_name
        .as_deref()
        .unwrap_or(DEFAULT_SDK_README_PACKAGE_NAME);
    let description = request
        .description
        .as_deref()
        .unwrap_or(DEFAULT_SDK_README_DESCRIPTION);
    format!(
        "# {name}\n\n{description}\n\n## Package\n\n`{package_name}`\n\n## Version\n\n`{version}`\n\n## API\n\n{spec_title}\n\n## Base URL\n\n`{base_url}`\n\n## Installation\n\n```shell\n{install_command}\n```\n\n## Quick Start\n\n```{fence_language}\n{quick_start}\n```\n\n## Usage Examples\n\n```{fence_language}\n{usage_example}\n```\n",
        name = request.name,
        description = description,
        package_name = package_name,
        version = request.version,
        spec_title = request.spec_title,
        base_url = request.base_url,
        install_command = install_command(&request.language, package_name),
        fence_language = code_fence_language(&request.language),
        quick_start = quick_start_snippet(request, package_name),
        usage_example = usage_example_snippet(request),
    )
}

enum SdkArchiveFileNameError {
    InvalidIdentity(String),
    UnsupportedArchive,
}

fn validate_sdk_archive_request_identity(request: &SdkReadmeRequest) -> Result<(), Response> {
    let identity = request.package_name.as_deref().unwrap_or(&request.name);
    sdk_archive_identity_slug(identity, "config.packageName")
        .map_err(|message| json_error_response(StatusCode::BAD_REQUEST, &message))?;
    sdk_archive_identity_slug(&request.language, "language")
        .map_err(|message| json_error_response(StatusCode::BAD_REQUEST, &message))?;
    sdk_archive_identity_slug(&request.version, "config.version")
        .map_err(|message| json_error_response(StatusCode::BAD_REQUEST, &message))?;
    Ok(())
}

fn sdk_archive_file_name(
    request: &SdkReadmeRequest,
) -> Result<&'static str, SdkArchiveFileNameError> {
    let identity = request.package_name.as_deref().unwrap_or(&request.name);
    let package_slug = sdk_archive_identity_slug(identity, "config.packageName")
        .map_err(SdkArchiveFileNameError::InvalidIdentity)?;
    let language_slug = sdk_archive_identity_slug(&request.language, "language")
        .map_err(SdkArchiveFileNameError::InvalidIdentity)?;
    let version_slug = sdk_archive_identity_slug(&request.version, "config.version")
        .map_err(SdkArchiveFileNameError::InvalidIdentity)?;
    let requested_file_name = format!("{package_slug}-{language_slug}-{version_slug}.zip");

    GENERATED_SDK_ARCHIVES
        .iter()
        .find(|archive| {
            archive.package_name == identity
                && archive.language == request.language
                && archive.version == request.version
                && archive.file_name == requested_file_name
        })
        .map(|archive| archive.file_name)
        .ok_or(SdkArchiveFileNameError::UnsupportedArchive)
}

fn sdk_archive_identity_slug(value: &str, field_name: &str) -> Result<String, String> {
    let trimmed = value.trim().trim_start_matches('@');
    if trimmed.is_empty() || trimmed.len() > 96 {
        return Err(format!(
            "{field_name} must be 1-96 safe SDK archive identity characters"
        ));
    }
    if trimmed.contains("..") || trimmed.contains('\\') || trimmed.contains(['\r', '\n']) {
        return Err(format!(
            "{field_name} contains unsafe archive identity characters"
        ));
    }
    if trimmed
        .split('/')
        .any(|segment| segment.is_empty() || matches!(segment, "." | ".."))
    {
        return Err(format!(
            "{field_name} contains unsafe archive identity characters"
        ));
    }

    let mut slug = String::with_capacity(trimmed.len());
    let mut previous_was_dash = false;
    let mut has_alphanumeric = false;
    for character in trimmed.chars() {
        let normalized = if character.is_ascii_alphanumeric() {
            has_alphanumeric = true;
            Some(character.to_ascii_lowercase())
        } else if matches!(character, '-' | '_' | '/') {
            Some('-')
        } else if character == '.' {
            Some('.')
        } else {
            None
        };
        let Some(character) = normalized else {
            return Err(format!(
                "{field_name} contains unsafe archive identity characters"
            ));
        };
        if character == '-' {
            if previous_was_dash {
                continue;
            }
            previous_was_dash = true;
        } else {
            previous_was_dash = false;
        }
        slug.push(character);
    }
    let slug = slug.trim_matches('-').to_owned();
    if slug.is_empty()
        || !has_alphanumeric
        || slug.starts_with('.')
        || slug.ends_with('.')
        || slug.contains("..")
    {
        return Err(format!(
            "{field_name} must contain at least one alphanumeric SDK archive identity character"
        ));
    }
    Ok(slug)
}

fn current_request_origin_from_tool_request(request: &SdkReadmeRequest) -> Option<String> {
    if let Some(origin) = &request.request_origin {
        return Some(origin.clone());
    }
    let value = request.base_url.trim();
    if value.starts_with("http://") || value.starts_with("https://") {
        return normalize_forward_origin(value, "config.baseUrl").ok();
    }
    None
}

fn sdk_generator_language(language: &str) -> Result<SdkLanguage, String> {
    match language {
        "typescript" | "javascript" => Ok(SdkLanguage::TypeScript),
        "dart" => Ok(SdkLanguage::Dart),
        "python" => Ok(SdkLanguage::Python),
        "go" => Ok(SdkLanguage::Go),
        "java" => Ok(SdkLanguage::Java),
        "kotlin" => Ok(SdkLanguage::Kotlin),
        "swift" => Ok(SdkLanguage::Swift),
        "csharp" => Ok(SdkLanguage::CSharp),
        "flutter" => Ok(SdkLanguage::Flutter),
        "rust" => Ok(SdkLanguage::Rust),
        "php" => Ok(SdkLanguage::Php),
        "ruby" => Ok(SdkLanguage::Ruby),
        _ => Err(format!(
            "language {language} is not supported for SDK generation"
        )),
    }
}

fn sdk_generator_type(sdk_type: &str) -> Result<SdkType, String> {
    match sdk_type {
        "app" => Ok(SdkType::App),
        "backend" => Ok(SdkType::Backend),
        "ai" => Ok(SdkType::Ai),
        "cloud-services" => Ok(SdkType::Custom),
        "custom" => Ok(SdkType::Custom),
        _ => Err(format!("config.sdkType {sdk_type} is not supported")),
    }
}

fn api_spec_file_name(request: &SdkReadmeRequest) -> String {
    request
        .api_spec_path
        .as_deref()
        .and_then(|path| path.rsplit('/').next())
        .filter(|file_name| {
            !file_name.is_empty()
                && file_name.contains('.')
                && !file_name.contains(['\\', '\r', '\n'])
        })
        .unwrap_or("openapi.json")
        .to_owned()
}

fn is_direct_child_path(root: &Path, path: &Path) -> bool {
    path.parent().is_some_and(|parent| parent == root)
        && path
            .file_name()
            .and_then(|file_name| file_name.to_str())
            .is_some_and(|file_name| file_name.ends_with(".zip"))
}

fn expand_request_url(request: &CodeSnippetRequest) -> String {
    let mut path = request.path.clone();
    for name in collect_parameters(request, "path") {
        path = path.replace(
            &format!("{{{}}}", name),
            &percent_encode_path_segment(&parameter_example(&name)),
        );
    }
    while let Some((start, end, name)) = find_path_template_variable(&path) {
        path.replace_range(
            start..=end,
            &percent_encode_path_segment(&parameter_example(&name)),
        );
    }

    let mut query_pairs = Vec::new();
    for name in collect_parameters(request, "query") {
        query_pairs.push(format!(
            "{}={}",
            percent_encode_query_value(&name),
            percent_encode_query_value(&parameter_example(&name))
        ));
    }
    let query = if query_pairs.is_empty() {
        String::new()
    } else {
        format!("?{}", query_pairs.join("&"))
    };

    format!(
        "{}{}",
        join_public_base_url(&request.base_url, &path),
        query
    )
}

fn collect_parameters(request: &CodeSnippetRequest, location: &str) -> Vec<String> {
    let mut names = Vec::new();
    for container in [&request.path_item, &request.operation] {
        let Some(parameters) = container
            .get("parameters")
            .and_then(|value| value.as_array())
        else {
            continue;
        };
        for parameter in parameters {
            let Some(parameter_location) = parameter.get("in").and_then(|value| value.as_str())
            else {
                continue;
            };
            let Some(name) = parameter.get("name").and_then(|value| value.as_str()) else {
                continue;
            };
            if parameter_location == location && !names.iter().any(|existing| existing == name) {
                names.push(name.to_owned());
            }
        }
    }
    names
}

fn find_path_template_variable(path: &str) -> Option<(usize, usize, String)> {
    let start = path.find('{')?;
    let end = path[start..].find('}').map(|relative| start + relative)?;
    if end <= start + 1 {
        return None;
    }
    Some((start, end, path[start + 1..end].trim().to_owned()))
}

fn parameter_example(name: &str) -> String {
    let lowercase = name.to_ascii_lowercase();
    if lowercase.contains("model") {
        "gpt-4.1-mini".to_owned()
    } else if lowercase.contains("user") {
        "user_id".to_owned()
    } else if lowercase.contains("key") {
        "api_key_id".to_owned()
    } else if lowercase.contains("id") {
        format!(
            "{}_id",
            lowercase.trim_end_matches("id").trim_end_matches('_')
        )
    } else {
        "value".to_owned()
    }
}

fn request_body_example(request: &CodeSnippetRequest) -> Option<serde_json::Value> {
    if let Some(schema) = request
        .operation
        .get("requestBody")
        .and_then(|value| value.get("content"))
        .and_then(|value| value.get("application/json"))
        .and_then(|value| value.get("schema"))
    {
        return Some(example_from_schema(schema, &request.openapi_spec, "body"));
    }
    if matches!(request.method.as_str(), "post" | "put" | "patch") {
        return Some(json!({}));
    }
    None
}

fn example_from_schema(
    schema: &serde_json::Value,
    openapi_spec: &serde_json::Value,
    property_name: &str,
) -> serde_json::Value {
    let schema = resolve_local_ref(schema, openapi_spec).unwrap_or(schema);
    if let Some(value) = schema.get("example") {
        return value.clone();
    }
    if let Some(value) = schema.get("default") {
        return value.clone();
    }
    if let Some(values) = schema.get("enum").and_then(|value| value.as_array()) {
        if let Some(value) = values.first() {
            return value.clone();
        }
    }
    if let Some(values) = schema.get("oneOf").and_then(|value| value.as_array()) {
        if let Some(value) = values.first() {
            return example_from_schema(value, openapi_spec, property_name);
        }
    }
    if let Some(values) = schema.get("anyOf").and_then(|value| value.as_array()) {
        if let Some(value) = values.first() {
            return example_from_schema(value, openapi_spec, property_name);
        }
    }
    if let Some(values) = schema.get("allOf").and_then(|value| value.as_array()) {
        let mut merged = serde_json::Map::new();
        for value in values {
            if let serde_json::Value::Object(object) =
                example_from_schema(value, openapi_spec, property_name)
            {
                merged.extend(object);
            }
        }
        if !merged.is_empty() {
            return serde_json::Value::Object(merged);
        }
    }

    let schema_type = schema
        .get("type")
        .and_then(|value| value.as_str())
        .or_else(|| schema.get("properties").map(|_| "object"));
    match schema_type {
        Some("object") => {
            let mut object = serde_json::Map::new();
            if let Some(properties) = schema.get("properties").and_then(|value| value.as_object()) {
                for (name, property_schema) in properties {
                    object.insert(
                        name.clone(),
                        example_from_schema(property_schema, openapi_spec, name),
                    );
                }
            }
            serde_json::Value::Object(object)
        }
        Some("array") => serde_json::Value::Array(vec![example_from_schema(
            schema.get("items").unwrap_or(&serde_json::Value::Null),
            openapi_spec,
            property_name,
        )]),
        Some("integer") | Some("number") => json!(0),
        Some("boolean") => json!(true),
        Some("string") => {
            if schema.get("format").and_then(|value| value.as_str()) == Some("date-time") {
                json!("2026-01-01T00:00:00.000Z")
            } else if property_name.to_ascii_lowercase().contains("model") {
                json!("gpt-4.1-mini")
            } else {
                json!("string")
            }
        }
        _ => json!({}),
    }
}

fn resolve_local_ref<'a>(
    schema: &'a serde_json::Value,
    openapi_spec: &'a serde_json::Value,
) -> Option<&'a serde_json::Value> {
    let reference = schema.get("$ref")?.as_str()?;
    let mut current = openapi_spec;
    for segment in reference.strip_prefix("#/")?.split('/') {
        let segment = segment.replace("~1", "/").replace("~0", "~");
        current = current.get(segment)?;
    }
    Some(current)
}

fn build_fetch_snippet(method: &str, url: &str, body: Option<&serde_json::Value>) -> String {
    let mut lines = Vec::new();
    if let Some(body) = body {
        lines.push(format!(
            "const requestBody = {};",
            serde_json::to_string_pretty(body).unwrap_or_else(|_| "{}".to_owned())
        ));
        lines.push(String::new());
    }
    lines.push(format!("const response = await fetch(\"{url}\", {{"));
    lines.push(format!("  method: \"{}\",", method.to_ascii_uppercase()));
    lines.push("  headers: {".to_owned());
    lines.push("    Authorization: `Bearer ${process.env.CLAWROUTER_API_KEY ?? \"\"}`,".to_owned());
    if body.is_some() {
        lines.push("    \"Content-Type\": \"application/json\",".to_owned());
    }
    lines.push("  },".to_owned());
    if body.is_some() {
        lines.push("  body: JSON.stringify(requestBody),".to_owned());
    }
    lines.push("});".to_owned());
    lines.push(String::new());
    lines.push("if (!response.ok) {".to_owned());
    lines.push("  throw new Error(`Request failed with status ${response.status}`);".to_owned());
    lines.push("}".to_owned());
    lines.push(String::new());
    lines.push("const data = await response.json();".to_owned());
    lines.push("console.log(data);".to_owned());
    lines.join("\n")
}

fn build_axios_snippet(method: &str, url: &str, body: Option<&serde_json::Value>) -> String {
    let mut lines = vec!["import axios from \"axios\";".to_owned(), String::new()];
    if let Some(body) = body {
        lines.push(format!(
            "const requestBody = {};",
            serde_json::to_string_pretty(body).unwrap_or_else(|_| "{}".to_owned())
        ));
        lines.push(String::new());
    }
    lines.push("const response = await axios.request({".to_owned());
    lines.push(format!("  method: \"{}\",", method.to_ascii_uppercase()));
    lines.push(format!("  url: \"{url}\","));
    lines.push("  headers: {".to_owned());
    lines.push("    Authorization: `Bearer ${process.env.CLAWROUTER_API_KEY ?? \"\"}`,".to_owned());
    if body.is_some() {
        lines.push("    \"Content-Type\": \"application/json\",".to_owned());
    }
    lines.push("  },".to_owned());
    if body.is_some() {
        lines.push("  data: requestBody,".to_owned());
    }
    lines.push("});".to_owned());
    lines.push(String::new());
    lines.push("console.log(response.data);".to_owned());
    lines.join("\n")
}

fn build_python_snippet(method: &str, url: &str, body: Option<&serde_json::Value>) -> String {
    let mut lines = vec![
        "import os".to_owned(),
        "import requests".to_owned(),
        String::new(),
        format!("url = \"{url}\""),
        "headers = {".to_owned(),
        "    \"Authorization\": f\"Bearer {os.environ.get('CLAWROUTER_API_KEY', '')}\",".to_owned(),
    ];
    if body.is_some() {
        lines.push("    \"Content-Type\": \"application/json\",".to_owned());
    }
    lines.push("}".to_owned());
    if let Some(body) = body {
        lines.push(format!(
            "payload = {}",
            serde_json::to_string_pretty(body).unwrap_or_else(|_| "{}".to_owned())
        ));
        lines.push(format!(
            "response = requests.{}(url, headers=headers, json=payload)",
            method
        ));
    } else {
        lines.push(format!(
            "response = requests.{}(url, headers=headers)",
            method
        ));
    }
    lines.push("response.raise_for_status()".to_owned());
    lines.push("print(response.json())".to_owned());
    lines.join("\n")
}

fn build_shell_snippet(method: &str, url: &str, body: Option<&serde_json::Value>) -> String {
    let mut lines = vec![
        format!("curl -X {} \"{}\" \\", method.to_ascii_uppercase(), url),
        "  -H \"Authorization: Bearer $CLAWROUTER_API_KEY\"".to_owned(),
    ];
    if let Some(body) = body {
        let payload = serde_json::to_string(body).unwrap_or_else(|_| "{}".to_owned());
        let last = lines.pop().unwrap_or_default();
        lines.push(format!("{last} \\"));
        lines.push("  -H \"Content-Type: application/json\" \\".to_owned());
        lines.push(format!("  --data-raw '{}'", payload.replace('\'', "'\\''")));
    }
    lines.join("\n")
}

fn build_generic_http_snippet(method: &str, url: &str, body: Option<&serde_json::Value>) -> String {
    let mut lines = vec![
        format!("{} {}", method.to_ascii_uppercase(), url),
        "Authorization: Bearer <CLAWROUTER_API_KEY>".to_owned(),
    ];
    if let Some(body) = body {
        lines.push("Content-Type: application/json".to_owned());
        lines.push(String::new());
        lines.push(serde_json::to_string_pretty(body).unwrap_or_else(|_| "{}".to_owned()));
    }
    lines.join("\n")
}

fn install_command(language: &str, package_name: &str) -> String {
    match language {
        "typescript" | "javascript" => format!("npm install {package_name}"),
        "python" => format!("pip install {package_name}"),
        "go" => format!("go get {package_name}"),
        "java" => format!("// Add {package_name} to your Maven or Gradle dependencies"),
        "ruby" => format!("gem install {package_name}"),
        "php" => format!("composer require {package_name}"),
        "csharp" => format!("dotnet add package {package_name}"),
        "rust" => format!("cargo add {package_name}"),
        "dart" => format!("dart pub add {package_name}"),
        _ => format!("Install {package_name} with the package manager for {language}"),
    }
}

fn quick_start_snippet(request: &SdkReadmeRequest, package_name: &str) -> String {
    match request.language.as_str() {
        "typescript" | "javascript" => format!(
            "import {{ {name} }} from \"{package_name}\";\n\nconst client = new {name}({{\n  baseUrl: \"{base_url}\",\n  apiKey: process.env.CLAWROUTER_API_KEY,\n}});",
            name = request.name,
            base_url = request.base_url,
        ),
        "python" => format!(
            "from {module_name} import {name}\n\nclient = {name}(\n    base_url=\"{base_url}\",\n    api_key=\"YOUR_API_KEY\",\n)",
            module_name = package_name.replace('-', "_"),
            name = request.name,
            base_url = request.base_url,
        ),
        _ => format!(
            "Initialize {name} with base URL {base_url} and your CLAWROUTER_API_KEY.",
            name = request.name,
            base_url = request.base_url,
        ),
    }
}

fn usage_example_snippet(request: &SdkReadmeRequest) -> String {
    match request.language.as_str() {
        "typescript" | "javascript" => {
            "const models = await client.models.list();\nconsole.log(models);".to_owned()
        }
        "python" => "models = client.models.list()\nprint(models)".to_owned(),
        _ => "Call the generated client methods that match the OpenAPI operation names.".to_owned(),
    }
}

fn code_fence_language(language: &str) -> &str {
    match language {
        "typescript" => "typescript",
        "javascript" => "javascript",
        "python" => "python",
        "go" => "go",
        "java" => "java",
        "ruby" => "ruby",
        "php" => "php",
        "csharp" => "csharp",
        "rust" => "rust",
        "dart" => "dart",
        "shell" => "shell",
        _ => "text",
    }
}

fn library_supported_for_language(language: &str, library: &str) -> bool {
    match language {
        "typescript" => SUPPORTED_TYPESCRIPT_LIBRARIES.contains(&library),
        "javascript" => SUPPORTED_JAVASCRIPT_LIBRARIES.contains(&library),
        "python" => SUPPORTED_PYTHON_LIBRARIES.contains(&library),
        "shell" => SUPPORTED_SHELL_LIBRARIES.contains(&library),
        _ => SUPPORTED_GENERIC_LIBRARIES.contains(&library),
    }
}

fn require_json_object<'a>(
    value: Option<&'a serde_json::Value>,
    field_name: &str,
) -> Result<&'a serde_json::Map<String, serde_json::Value>, String> {
    value
        .and_then(|value| value.as_object())
        .ok_or_else(|| format!("{field_name} must be a JSON object"))
}

fn require_non_empty_string(
    value: Option<&serde_json::Value>,
    field_name: &str,
) -> Result<String, String> {
    let value = value
        .and_then(|value| value.as_str())
        .ok_or_else(|| format!("{field_name} must be a non-empty string"))?
        .trim();
    if value.is_empty() || value.contains(['\r', '\n']) {
        return Err(format!("{field_name} must be a non-empty string"));
    }
    Ok(value.to_owned())
}

fn optional_safe_string(
    value: Option<&serde_json::Value>,
    field_name: &str,
) -> Result<Option<String>, String> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = value
        .as_str()
        .ok_or_else(|| format!("{field_name} must be a string"))?
        .trim();
    if value.is_empty() {
        return Ok(None);
    }
    if value.contains(['\r', '\n']) {
        return Err(format!("{field_name} must not contain control characters"));
    }
    Ok(Some(value.to_owned()))
}

fn require_api_path(value: Option<&serde_json::Value>, field_name: &str) -> Result<String, String> {
    let value = require_non_empty_string(value, field_name)?;
    if !value.starts_with('/')
        || value.contains(['\r', '\n'])
        || value.contains('?')
        || value.contains('#')
        || value.contains('\\')
    {
        return Err(format!(
            "{field_name} must start with / and must not contain query strings or control characters"
        ));
    }
    Ok(value)
}

fn require_http_method(value: Option<&serde_json::Value>) -> Result<String, String> {
    let method = require_non_empty_string(value, "method")?.to_ascii_lowercase();
    if matches!(
        method.as_str(),
        "get" | "post" | "put" | "patch" | "delete" | "options" | "head"
    ) {
        Ok(method)
    } else {
        Err("method must be one of get, post, put, patch, delete, options, head".to_owned())
    }
}

fn require_http_url(value: Option<&serde_json::Value>, field_name: &str) -> Result<String, String> {
    let value = require_non_empty_string(value, field_name)?;
    let uri = value
        .parse::<Uri>()
        .map_err(|_| format!("{field_name} must be an HTTP or HTTPS URL"))?;
    if !matches!(uri.scheme_str(), Some("http" | "https")) || uri.authority().is_none() {
        return Err(format!("{field_name} must be an HTTP or HTTPS URL"));
    }
    if uri.query().is_some() || value.contains('#') {
        return Err(format!(
            "{field_name} must be an HTTP/HTTPS URL or root-relative path without query strings or fragments"
        ));
    }
    Ok(value.trim_end_matches('#').to_owned())
}

fn require_public_tool_base_url(
    value: Option<&serde_json::Value>,
    field_name: &str,
) -> Result<String, String> {
    let value = require_non_empty_string(value, field_name)?;
    if value.starts_with('/') {
        if value.starts_with("//")
            || value.contains(['\r', '\n'])
            || value.contains('\\')
            || value.contains('?')
            || value.contains('#')
        {
            return Err(format!(
                "{field_name} must be an HTTP/HTTPS URL or root-relative path"
            ));
        }
        let normalized = value.trim_end_matches('/');
        return Ok(if normalized.is_empty() {
            "/".to_owned()
        } else {
            normalized.to_owned()
        });
    }
    require_http_url(Some(&serde_json::Value::String(value)), field_name)
}

fn require_tool_token(
    value: Option<&serde_json::Value>,
    field_name: &str,
) -> Result<String, String> {
    let value = require_non_empty_string(value, field_name)?;
    if value.len() > 64
        || !value.chars().all(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '.' | '_' | '-' | '/')
        })
    {
        return Err(format!("{field_name} must be 1-64 ASCII token characters"));
    }
    Ok(value)
}

fn join_public_base_url(base_url: &str, path: &str) -> String {
    let normalized_base = base_url.trim_end_matches('/');
    let normalized_path = if path.starts_with('/') {
        path.to_owned()
    } else {
        format!("/{path}")
    };
    for prefix in ["/v1", "/app/v3/api", "/backend/v3/api"] {
        if normalized_base.ends_with(prefix) && normalized_path.starts_with(&format!("{prefix}/")) {
            return format!(
                "{}{}",
                normalized_base,
                normalized_path.trim_start_matches(prefix)
            );
        }
    }
    if normalized_base.is_empty() {
        return normalized_path;
    }
    format!("{normalized_base}{normalized_path}")
}

fn percent_encode_path_segment(value: &str) -> String {
    percent_encode(value, true)
}

fn percent_encode_query_value(value: &str) -> String {
    percent_encode(value, false)
}

fn percent_encode(value: &str, encode_slash: bool) -> String {
    let mut encoded = String::new();
    for byte in value.bytes() {
        let character = byte as char;
        if character.is_ascii_alphanumeric()
            || matches!(character, '-' | '_' | '.' | '~')
            || (!encode_slash && character == '/')
        {
            encoded.push(character);
        } else {
            encoded.push_str(&format!("%{byte:02X}"));
        }
    }
    encoded
}

fn json_ok_response(payload: serde_json::Value) -> Response {
    json_response(StatusCode::OK, payload)
}

fn json_error_response(status: StatusCode, message: &str) -> Response {
    json_response(status, json!({ "error": message }))
}

fn json_response(status: StatusCode, payload: serde_json::Value) -> Response {
    let mut response = (
        status,
        [(header::CONTENT_TYPE, "application/json; charset=utf-8")],
        Json(payload),
    )
        .into_response();
    response
        .headers_mut()
        .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    response.headers_mut().insert(
        "x-content-type-options",
        HeaderValue::from_static("nosniff"),
    );
    response
}

fn sdk_archive_response(bytes: Vec<u8>, file_name: &str) -> Response {
    sdk_generated_package_response(bytes, "application/zip", file_name)
}

fn sdk_generated_package_response(bytes: Vec<u8>, content_type: &str, file_name: &str) -> Response {
    let mut response = Response::new(Body::from(bytes));
    *response.status_mut() = StatusCode::OK;
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_str(content_type)
            .unwrap_or_else(|_| HeaderValue::from_static("application/zip")),
    );
    response.headers_mut().insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_str(&format!("attachment; filename=\"{file_name}\""))
            .unwrap_or_else(|_| HeaderValue::from_static("attachment")),
    );
    response
        .headers_mut()
        .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    response.headers_mut().insert(
        "x-content-type-options",
        HeaderValue::from_static("nosniff"),
    );
    response
}

fn with_rate_limit_headers(mut response: Response, outcome: &ToolApiRateLimitOutcome) -> Response {
    insert_header_value(response.headers_mut(), "ratelimit-limit", outcome.limit);
    insert_header_value(
        response.headers_mut(),
        "ratelimit-remaining",
        outcome.remaining,
    );
    insert_header_value(
        response.headers_mut(),
        "ratelimit-reset",
        duration_retry_after_seconds(outcome.reset_after),
    );
    if response.status() == StatusCode::TOO_MANY_REQUESTS {
        insert_header_value(
            response.headers_mut(),
            header::RETRY_AFTER,
            duration_retry_after_seconds(outcome.reset_after),
        );
    }
    response
}

fn duration_retry_after_seconds(duration: Duration) -> u64 {
    duration.as_secs().max(1)
}

fn insert_header_value<K>(headers: &mut axum::http::HeaderMap, key: K, value: impl ToString)
where
    K: axum::http::header::IntoHeaderName,
{
    if let Ok(value) = HeaderValue::from_str(&value.to_string()) {
        headers.insert(key, value);
    }
}

fn portal_static_response(
    status: StatusCode,
    content_type: &'static str,
    cache_control: &HeaderValue,
    body: String,
    config: &EdgeServerConfig,
) -> Response {
    let mut response = Response::new(Body::from(body));
    *response.status_mut() = status;
    apply_portal_security_headers(response.headers_mut(), config);
    response
        .headers_mut()
        .insert(header::CONTENT_TYPE, HeaderValue::from_static(content_type));
    response
        .headers_mut()
        .insert(header::CACHE_CONTROL, cache_control.clone());
    response
}

fn apply_portal_security_headers(headers: &mut axum::http::HeaderMap, config: &EdgeServerConfig) {
    headers.insert(
        "x-content-type-options",
        HeaderValue::from_static("nosniff"),
    );
    headers.insert("x-frame-options", HeaderValue::from_static("DENY"));
    headers.insert(
        "referrer-policy",
        HeaderValue::from_static("strict-origin-when-cross-origin"),
    );
    headers.insert(
        "permissions-policy",
        HeaderValue::from_static("camera=(), microphone=(), geolocation=(), payment=()"),
    );
    headers.insert(
        "content-security-policy",
        config.portal_content_security_policy.clone(),
    );
    if let Some(value) = &config.portal_strict_transport_security {
        headers.insert("strict-transport-security", value.clone());
    }
}

fn portal_file_path(dist_root: &Path, request_path: &str) -> Option<PathBuf> {
    let relative_path = request_path.trim_start_matches('/');
    if relative_path.is_empty() {
        return None;
    }

    let mut path = PathBuf::new();
    for component in Path::new(relative_path).components() {
        match component {
            Component::Normal(value) => {
                let text = value.to_str()?;
                if text.contains('\\') || text == "." || text == ".." {
                    return None;
                }
                path.push(value);
            }
            _ => return None,
        }
    }
    Some(dist_root.join(path))
}

fn inject_portal_runtime_env_script(html: &str) -> Result<String, String> {
    let script_tag = r#"<script type="module" src="/runtime-env.js"></script>"#;
    if html.contains(r#"src="/runtime-env.js""#) {
        return Ok(html.to_owned());
    }

    let Some(index) = find_module_script_index(html) else {
        return Err("portal index.html must contain a module script".to_owned());
    };
    let mut output = String::with_capacity(html.len() + script_tag.len() + 5);
    output.push_str(&html[..index]);
    output.push_str(script_tag);
    output.push('\n');
    output.push_str(&html[index..]);
    Ok(output)
}

fn find_module_script_index(html: &str) -> Option<usize> {
    let mut offset = 0;
    while let Some(relative_index) = html[offset..].find("<script") {
        let index = offset + relative_index;
        let end = html[index..]
            .find('>')
            .map(|relative_end| index + relative_end)?;
        let tag = html[index..=end].to_ascii_lowercase();
        if tag.contains("type=\"module\"") || tag.contains("type='module'") {
            return Some(index);
        }
        offset = end + 1;
    }
    None
}

fn build_portal_runtime_env_script(runtime_env: &PortalRuntimeEnv) -> String {
    let mut runtime_env_json = json!({
        "VITE_API_BASE_URL": runtime_env.api_base_url,
        "VITE_CLAWROUTER_OPEN_API_BASE_URL": runtime_env.open_api_base_url,
        "VITE_CLAWROUTER_APP_API_BASE_URL": runtime_env.app_api_base_url,
        "VITE_CLAWROUTER_BACKEND_API_BASE_URL": runtime_env.backend_api_base_url,
        "VITE_TOOL_API_ENABLED": if runtime_env.tool_api_enabled { "true" } else { "false" },
    });
    if let Some(appbase_backend_api_base_url) = &runtime_env.appbase_backend_api_base_url {
        runtime_env_json["VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL"] =
            json!(appbase_backend_api_base_url);
    }

    let serialized = runtime_env_json
        .to_string()
        .replace('<', "\\u003C")
        .replace('>', "\\u003E")
        .replace('&', "\\u0026")
        .replace('\u{2028}', "\\u2028")
        .replace('\u{2029}', "\\u2029");

    format!("window.__CLAWROUTER_ENV__ = Object.freeze({serialized});\n")
}

fn content_type_for_path(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|extension| extension.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase()
        .as_str()
    {
        "css" => "text/css; charset=utf-8",
        "js" | "mjs" => "application/javascript; charset=utf-8",
        "json" | "map" => "application/json; charset=utf-8",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "ico" => "image/x-icon",
        "woff2" => "font/woff2",
        _ => "application/octet-stream",
    }
}

struct ReadinessCheck {
    ready: bool,
    payload: serde_json::Value,
}

async fn check_portal_readiness(state: &EdgeServerState) -> ReadinessCheck {
    if let Some(dist_root) = &state.config.portal_static_dist {
        let ready = dist_root.join("index.html").is_file();
        return ReadinessCheck {
            ready,
            payload: json!({
                "status": if ready { "ok" } else { "unavailable" },
                "service": "portal",
                "mode": "static-dist",
            }),
        };
    }
    check_upstream_health(state, "portal", &state.config.portal_base_url).await
}

async fn check_edge_api_health(
    state: &EdgeServerState,
    name: &'static str,
    surface: EdgeApiSurface,
) -> ReadinessCheck {
    if let Some(in_process_upstreams) = &state.in_process_upstreams {
        return check_in_process_health(
            state,
            name,
            in_process_upstreams.router_for_surface(surface),
        )
        .await;
    }

    let base_url = match surface {
        EdgeApiSurface::Gateway => &state.config.gateway_base_url,
        EdgeApiSurface::Backend => &state.config.backend_base_url,
        EdgeApiSurface::App => &state.config.app_base_url,
    };
    check_upstream_health(state, name, base_url).await
}

async fn check_in_process_health(
    state: &EdgeServerState,
    name: &'static str,
    router: Router,
) -> ReadinessCheck {
    let request = match Request::builder()
        .method(Method::GET)
        .uri("/healthz")
        .body(Body::empty())
    {
        Ok(request) => request,
        Err(error) => {
            return ReadinessCheck {
                ready: false,
                payload: json!({
                    "status": "unavailable",
                    "service": name,
                    "mode": "in-process",
                    "error": format!("failed to build in-process health request: {error}"),
                }),
            }
        }
    };

    match tokio::time::timeout(state.config.ready_check_timeout, router.oneshot(request)).await {
        Ok(Ok(response)) => {
            let status = response.status();
            let ready = status.is_success();
            let body = match to_bytes(response.into_body(), 64 * 1024).await {
                Ok(body) => body,
                Err(error) => {
                    return ReadinessCheck {
                        ready: false,
                        payload: json!({
                            "status": "unavailable",
                            "service": name,
                            "mode": "in-process",
                            "httpStatus": status.as_u16(),
                            "error": format!("failed to read in-process health response: {error}"),
                        }),
                    }
                }
            };
            let payload = serde_json::from_slice::<serde_json::Value>(&body)
                .ok()
                .and_then(|value| match value {
                    serde_json::Value::Object(mut object) => {
                        object.entry("status").or_insert_with(|| {
                            serde_json::Value::String(
                                if ready { "ok" } else { "unavailable" }.to_owned(),
                            )
                        });
                        object
                            .entry("service")
                            .or_insert_with(|| serde_json::Value::String(name.to_owned()));
                        object
                            .entry("mode")
                            .or_insert_with(|| serde_json::Value::String("in-process".to_owned()));
                        object.entry("httpStatus").or_insert_with(|| {
                            serde_json::Value::Number(serde_json::Number::from(status.as_u16()))
                        });
                        Some(serde_json::Value::Object(object))
                    }
                    _ => None,
                })
                .unwrap_or_else(|| {
                    json!({
                        "status": if ready { "ok" } else { "unavailable" },
                        "service": name,
                        "mode": "in-process",
                        "httpStatus": status.as_u16(),
                    })
                });

            ReadinessCheck { ready, payload }
        }
        Ok(Err(error)) => ReadinessCheck {
            ready: false,
            payload: json!({
                "status": "unavailable",
                "service": name,
                "mode": "in-process",
                "error": error.to_string(),
            }),
        },
        Err(_) => ReadinessCheck {
            ready: false,
            payload: json!({
                "status": "unavailable",
                "service": name,
                "mode": "in-process",
                "error": "in-process health check timed out",
            }),
        },
    }
}

async fn check_upstream_health(
    state: &EdgeServerState,
    name: &'static str,
    base_url: &str,
) -> ReadinessCheck {
    let uri = match format!("{base_url}/healthz").parse::<Uri>() {
        Ok(uri) => uri,
        Err(error) => {
            return ReadinessCheck {
                ready: false,
                payload: json!({
                    "status": "unavailable",
                    "service": name,
                    "error": format!("invalid upstream health URI: {error}"),
                }),
            }
        }
    };
    let request = match HyperRequest::builder()
        .method(Method::GET)
        .uri(uri)
        .body(Body::empty())
    {
        Ok(request) => request,
        Err(error) => {
            return ReadinessCheck {
                ready: false,
                payload: json!({
                    "status": "unavailable",
                    "service": name,
                    "error": format!("failed to build upstream health request: {error}"),
                }),
            }
        }
    };

    match tokio::time::timeout(
        state.config.ready_check_timeout,
        state.client.request(request),
    )
    .await
    {
        Ok(Ok(response)) => {
            let status = response.status();
            ReadinessCheck {
                ready: status.is_success(),
                payload: json!({
                    "status": if status.is_success() { "ok" } else { "unavailable" },
                    "service": name,
                    "httpStatus": status.as_u16(),
                }),
            }
        }
        Ok(Err(error)) => ReadinessCheck {
            ready: false,
            payload: json!({
                "status": "unavailable",
                "service": name,
                "error": error.to_string(),
            }),
        },
        Err(_) => ReadinessCheck {
            ready: false,
            payload: json!({
                "status": "unavailable",
                "service": name,
                "error": "upstream health check timed out",
            }),
        },
    }
}

async fn upstream_to_axum_response(
    upstream_response: HyperResponse<hyper::body::Incoming>,
) -> Result<Response, String> {
    let (parts, body) = upstream_response.into_parts();
    let mut response = Response::new(Body::new(body));
    *response.status_mut() = parts.status;
    let connection_header_names = connection_header_names(&parts.headers);
    for (name, value) in parts.headers.iter() {
        if should_forward_response_header(name, &connection_header_names) {
            response.headers_mut().append(name, value.clone());
        }
    }
    Ok(response)
}

fn build_forward_uri(base_url: &str, original_uri: &Uri) -> Result<Uri, String> {
    let path_and_query = original_uri
        .path_and_query()
        .map(|value| value.as_str())
        .unwrap_or("/");
    format!("{base_url}{path_and_query}")
        .parse::<Uri>()
        .map_err(|error| format!("invalid upstream URI: {error}"))
}

fn normalize_forward_origin(value: &str, label: &str) -> Result<String, String> {
    let trimmed = value.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Err(format!("{label} forward URL must not be blank"));
    }
    let uri = trimmed
        .parse::<Uri>()
        .map_err(|error| format!("{label} forward URL must be an HTTP/HTTPS origin: {error}"))?;
    if !matches!(uri.scheme_str(), Some("http" | "https")) || uri.authority().is_none() {
        return Err(format!("{label} forward URL must be an HTTP/HTTPS origin"));
    }
    if uri.path() != "/" || uri.query().is_some() {
        return Err(format!(
            "{label} forward URL must be an origin without path or query"
        ));
    }
    Ok(trimmed.to_owned())
}

fn normalize_portal_public_url(value: &str, label: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty()
        || trimmed.contains(['\r', '\n'])
        || trimmed.contains('\\')
        || trimmed.contains('"')
        || trimmed.contains('\'')
    {
        return Err(format!(
            "{label} must be an HTTP/HTTPS URL or root-relative path"
        ));
    }
    if trimmed.starts_with('/') {
        if trimmed.starts_with("//") || trimmed.contains('?') || trimmed.contains('#') {
            return Err(format!(
                "{label} must be an HTTP/HTTPS URL or root-relative path"
            ));
        }
        return Ok(trimmed.to_owned());
    }

    let uri = trimmed
        .parse::<Uri>()
        .map_err(|_| format!("{label} must be an HTTP/HTTPS URL or root-relative path"))?;
    if !matches!(uri.scheme_str(), Some("http" | "https")) || uri.authority().is_none() {
        return Err(format!(
            "{label} must be an HTTP/HTTPS URL or root-relative path"
        ));
    }
    if uri.query().is_some() {
        return Err(format!(
            "{label} must be an HTTP/HTTPS URL or root-relative path"
        ));
    }
    Ok(trimmed.trim_end_matches('/').to_owned())
}

fn append_portal_public_sdk_base_url(value: &str, api_prefix: &str) -> String {
    let prefix = if api_prefix.starts_with('/') {
        api_prefix.to_owned()
    } else {
        format!("/{api_prefix}")
    };
    let base = value.trim_end_matches('/');
    if base.is_empty() {
        return prefix;
    }
    format!("{base}{prefix}")
}

fn normalize_portal_csp_connect_src(value: &str) -> Result<Vec<String>, String> {
    let mut origins = Vec::new();
    for token in value
        .split(|character: char| character == ',' || character.is_whitespace())
        .map(str::trim)
        .filter(|token| !token.is_empty())
    {
        let origin = normalize_portal_csp_origin(token)?;
        if !origins.contains(&origin) {
            origins.push(origin);
        }
    }
    Ok(origins)
}

fn normalize_portal_csp_origin(value: &str) -> Result<String, String> {
    let trimmed = value.trim().trim_end_matches('/');
    if trimmed.is_empty()
        || trimmed.contains(['\r', '\n'])
        || trimmed.contains('\\')
        || trimmed.contains('"')
        || trimmed.contains('\'')
        || trimmed.contains(';')
    {
        return Err(
            "SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC entries must be HTTP/HTTPS origins without directives"
                .to_owned(),
        );
    }
    let uri = trimmed.parse::<Uri>().map_err(|error| {
        format!("SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC entry must be an HTTP/HTTPS origin: {error}")
    })?;
    if !matches!(uri.scheme_str(), Some("http" | "https")) || uri.authority().is_none() {
        return Err(
            "SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC entries must be HTTP/HTTPS origins".to_owned(),
        );
    }
    if uri.path() != "/" || uri.query().is_some() {
        return Err(
            "SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC entries must be origins without path or query"
                .to_owned(),
        );
    }
    Ok(trimmed.to_owned())
}

fn normalize_portal_csp_frame_src_origin(value: &str) -> Result<String, String> {
    let trimmed = value.trim().trim_end_matches('/');
    if trimmed.is_empty()
        || trimmed == "*"
        || trimmed.contains(['\r', '\n'])
        || trimmed.contains('\\')
        || trimmed.contains('"')
        || trimmed.contains('\'')
        || trimmed.contains(';')
    {
        return Err(
            "portal CSP frame-src entries must be explicit HTTP/HTTPS origins without directives"
                .to_owned(),
        );
    }
    let uri = trimmed.parse::<Uri>().map_err(|error| {
        format!("portal CSP frame-src entry must be an HTTP/HTTPS origin: {error}")
    })?;
    if !matches!(uri.scheme_str(), Some("http" | "https")) || uri.authority().is_none() {
        return Err("portal CSP frame-src entries must be HTTP/HTTPS origins".to_owned());
    }
    if uri.path() != "/" || uri.query().is_some() {
        return Err("portal CSP frame-src entries must not include path or query".to_owned());
    }
    Ok(trimmed.to_owned())
}

fn normalize_edge_cors_allowed_origin(value: &str) -> Result<String, String> {
    let trimmed = value.trim().trim_end_matches('/');
    if trimmed.is_empty()
        || trimmed == "*"
        || trimmed.contains(['\r', '\n'])
        || trimmed.contains('\\')
        || trimmed.contains('"')
        || trimmed.contains('\'')
        || trimmed.contains(';')
    {
        return Err(
            "edge CORS allowed origins must be explicit HTTP/HTTPS origins without directives"
                .to_owned(),
        );
    }
    let uri = trimmed.parse::<Uri>().map_err(|error| {
        format!("edge CORS allowed origin must be an HTTP/HTTPS origin: {error}")
    })?;
    if !matches!(uri.scheme_str(), Some("http" | "https")) || uri.authority().is_none() {
        return Err("edge CORS allowed origins must be HTTP/HTTPS origins".to_owned());
    }
    if uri.path() != "/" || uri.query().is_some() {
        return Err("edge CORS allowed origins must not include path or query".to_owned());
    }
    Ok(trimmed.to_owned())
}

fn default_portal_csp_frame_src() -> Vec<String> {
    vec!["https://player.bilibili.com".to_owned()]
}

fn default_portal_content_security_policy() -> HeaderValue {
    HeaderValue::from_static(
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://api.sdkwork.com; frame-src 'self' https://player.bilibili.com; frame-ancestors 'none'",
    )
}

fn build_portal_content_security_policy(config: &EdgeServerConfig) -> Result<HeaderValue, String> {
    let mut connect_src = vec!["'self'".to_owned(), "https://api.sdkwork.com".to_owned()];
    for public_url in [
        &config.portal_runtime_env.api_base_url,
        &config.portal_runtime_env.open_api_base_url,
        &config.portal_runtime_env.app_api_base_url,
        &config.portal_runtime_env.backend_api_base_url,
    ] {
        if let Some(origin) = portal_public_url_origin(public_url)? {
            push_unique(&mut connect_src, origin);
        }
    }
    if let Some(public_url) = &config.portal_runtime_env.appbase_backend_api_base_url {
        if let Some(origin) = portal_public_url_origin(public_url)? {
            push_unique(&mut connect_src, origin);
        }
    }
    for origin in &config.portal_csp_connect_src_extra_origins {
        push_unique(&mut connect_src, origin.clone());
    }

    let mut frame_src = vec!["'self'".to_owned()];
    for origin in &config.portal_csp_frame_src {
        push_unique(&mut frame_src, origin.clone());
    }

    let policy = format!(
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src {}; frame-src {}; frame-ancestors 'none'",
        connect_src.join(" "),
        frame_src.join(" ")
    );
    HeaderValue::from_str(&policy)
        .map_err(|error| format!("failed to build portal content-security-policy: {error}"))
}

fn portal_public_url_origin(value: &str) -> Result<Option<String>, String> {
    if value.starts_with('/') {
        return Ok(None);
    }
    let uri = value
        .parse::<Uri>()
        .map_err(|error| format!("portal public runtime URL is invalid: {error}"))?;
    let Some(scheme) = uri.scheme_str() else {
        return Ok(None);
    };
    let Some(authority) = uri.authority() else {
        return Ok(None);
    };
    Ok(Some(format!("{scheme}://{authority}")))
}

fn push_unique(values: &mut Vec<String>, value: String) {
    if !values.contains(&value) {
        values.push(value);
    }
}

fn normalize_external_scheme(value: &str) -> Result<HeaderValue, String> {
    let trimmed = value.trim().to_ascii_lowercase();
    match trimmed.as_str() {
        "http" => Ok(HeaderValue::from_static("http")),
        "https" => Ok(HeaderValue::from_static("https")),
        _ => Err("external scheme must be http or https".to_owned()),
    }
}

fn strict_transport_security_header(
    enabled: bool,
    max_age_seconds: u64,
    include_subdomains: bool,
    preload: bool,
) -> Result<Option<HeaderValue>, String> {
    if !enabled {
        return Ok(None);
    }
    if max_age_seconds == 0 {
        return Err("portal HSTS max-age seconds must be greater than 0".to_owned());
    }
    if preload && (max_age_seconds < DEFAULT_HSTS_MAX_AGE_SECONDS || !include_subdomains) {
        return Err(
            "portal HSTS preload requires max-age >= 31536000 and includeSubDomains".to_owned(),
        );
    }
    let mut value = format!("max-age={max_age_seconds}");
    if include_subdomains {
        value.push_str("; includeSubDomains");
    }
    if preload {
        value.push_str("; preload");
    }
    HeaderValue::from_str(&value)
        .map(Some)
        .map_err(|error| format!("failed to build strict-transport-security header: {error}"))
}

fn normalize_cache_control_header(value: &str, label: &str) -> Result<HeaderValue, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(format!("{label} must not be blank"));
    }
    if trimmed.contains(['\r', '\n']) {
        return Err(format!("{label} must be a single header value"));
    }
    HeaderValue::from_str(trimmed).map_err(|_| format!("{label} must be a valid header value"))
}

fn is_valid_forwarded_proto(value: &HeaderValue) -> bool {
    value
        .to_str()
        .ok()
        .is_some_and(|scheme| matches!(scheme.to_ascii_lowercase().as_str(), "http" | "https"))
}

fn build_proxy_client() -> ProxyClient {
    let connector = hyper_rustls::HttpsConnectorBuilder::new()
        .with_webpki_roots()
        .https_or_http()
        .enable_http1()
        .build();
    Client::builder(TokioExecutor::new()).build(connector)
}

fn should_forward_request_header(
    name: &HeaderName,
    connection_header_names: &HashSet<String>,
) -> bool {
    !is_hop_by_hop_header(name)
        && !connection_header_names.contains(name.as_str())
        && name != header::HOST
        && name != header::CONTENT_LENGTH
        && name.as_str() != "x-forwarded-host"
        && name.as_str() != "x-forwarded-proto"
        && name.as_str() != "x-forwarded-for"
        && name.as_str() != "forwarded"
        && name.as_str() != "x-real-ip"
}

fn should_forward_response_header(
    name: &HeaderName,
    connection_header_names: &HashSet<String>,
) -> bool {
    !is_hop_by_hop_header(name)
        && !connection_header_names.contains(name.as_str())
        && name != header::CONTENT_LENGTH
        && name != header::TRANSFER_ENCODING
        && !name.as_str().starts_with("access-control-")
}

fn is_hop_by_hop_header(name: &HeaderName) -> bool {
    matches!(
        name.as_str(),
        "connection"
            | "keep-alive"
            | "proxy-authenticate"
            | "proxy-authorization"
            | "te"
            | "trailer"
            | "transfer-encoding"
            | "upgrade"
    )
}

fn connection_header_names(headers: &axum::http::HeaderMap) -> HashSet<String> {
    let mut names = HashSet::new();
    for value in headers.get_all(header::CONNECTION) {
        let Ok(text) = value.to_str() else {
            continue;
        };
        for token in text.split(',') {
            let normalized = token.trim().to_ascii_lowercase();
            if !normalized.is_empty() {
                names.insert(normalized);
            }
        }
    }
    names
}

fn proxy_error_response(message: &str) -> Response {
    (
        StatusCode::BAD_GATEWAY,
        [(header::CONTENT_TYPE, "application/json; charset=utf-8")],
        Json(json!({ "error": message })),
    )
        .into_response()
}

fn preflight_response(state: &EdgeServerState, request: &Request) -> Response {
    let origin = cors_origin_for_request(state, request);
    if origin.is_none() {
        return StatusCode::FORBIDDEN.into_response();
    }

    with_cors_headers(StatusCode::NO_CONTENT.into_response(), origin)
}

fn is_cors_preflight(request: &Request) -> bool {
    request.method() == Method::OPTIONS
        && request.headers().contains_key(header::ORIGIN)
        && request
            .headers()
            .contains_key(header::ACCESS_CONTROL_REQUEST_METHOD)
}

fn cors_origin_for_request(state: &EdgeServerState, request: &Request) -> Option<HeaderValue> {
    let origin = request.headers().get(header::ORIGIN)?;
    let origin_text = origin.to_str().ok()?;
    if origin_text == state.config.portal_base_url {
        return Some(origin.clone());
    }
    if state
        .config
        .portal_cors_allowed_origins
        .iter()
        .any(|allowed_origin| allowed_origin == origin_text)
    {
        return Some(origin.clone());
    }
    if state.config.development_private_network_cors
        && sdkwork_web_core::is_development_private_network_origin(origin_text)
    {
        return Some(origin.clone());
    }
    None
}

fn with_cors_headers(mut response: Response, origin: Option<HeaderValue>) -> Response {
    let headers = response.headers_mut();
    if let Some(origin) = origin {
        headers.insert(header::ACCESS_CONTROL_ALLOW_ORIGIN, origin);
        headers.insert(
            header::ACCESS_CONTROL_ALLOW_CREDENTIALS,
            HeaderValue::from_static("true"),
        );
        merge_vary_origin(headers);
    }
    headers.insert(
        header::ACCESS_CONTROL_ALLOW_METHODS,
        HeaderValue::from_static("GET,POST,PUT,PATCH,DELETE,OPTIONS"),
    );
    headers.insert(
        header::ACCESS_CONTROL_ALLOW_HEADERS,
        HeaderValue::from_static(
            "authorization,access-token,content-type,idempotency-key,x-api-key,x-goog-api-key,x-request-id",
        ),
    );
    headers.insert(
        header::ACCESS_CONTROL_EXPOSE_HEADERS,
        HeaderValue::from_static("x-request-id"),
    );
    response
}

fn merge_vary_origin(headers: &mut axum::http::HeaderMap) {
    let Some(existing) = headers.get(header::VARY) else {
        headers.insert(header::VARY, HeaderValue::from_static("Origin"));
        return;
    };
    let Ok(existing_text) = existing.to_str() else {
        headers.insert(header::VARY, HeaderValue::from_static("Origin"));
        return;
    };
    if existing_text
        .split(',')
        .any(|part| part.trim().eq_ignore_ascii_case("origin"))
    {
        return;
    }
    let merged = format!("{existing_text}, Origin");
    if let Ok(value) = HeaderValue::from_str(&merged) {
        headers.insert(header::VARY, value);
    }
}
