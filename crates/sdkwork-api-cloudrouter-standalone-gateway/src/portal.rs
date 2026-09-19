use std::path::{Component, Path, PathBuf};
use std::sync::Arc;

use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::{header, HeaderMap, HeaderValue, Method, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::Router;
use sdkwork_cloudrouter_config::RuntimeTomlConfig;
use sdkwork_web_bootstrap::{ReadinessCheck, ReadinessFuture};
use serde_json::json;
use tower::ServiceExt;

use crate::adaptive_surface::{
    adaptive_vary_header, classify_adaptive_client, select_adaptive_surface, AdaptiveSurface,
    SEC_CH_UA_MOBILE,
};

/// Adaptive Web static roots (SDKWORK_DEPLOY_SPEC.md section 8). `PC` is the
/// desktop-preferred surface and `H5` the mobile-preferred one; a client whose
/// preferred surface is not packaged collapses onto the other one.
pub const PC_STATIC_ROOT_ENV: &str = "SDKWORK_CLOUDROUTER_ROUTER_PC_STATIC_ROOT";
pub const H5_STATIC_ROOT_ENV: &str = "SDKWORK_CLOUDROUTER_ROUTER_H5_STATIC_ROOT";
const CSP_CONNECT_SRC_ENV: &str = "SDKWORK_CLOUDROUTER_EDGE_CSP_CONNECT_SRC";
const CSP_FRAME_SRC_ENV: &str = "SDKWORK_CLOUDROUTER_EDGE_CSP_FRAME_SRC";
const HSTS_ENABLED_ENV: &str = "SDKWORK_CLOUDROUTER_EDGE_HSTS_ENABLED";
const HSTS_MAX_AGE_ENV: &str = "SDKWORK_CLOUDROUTER_EDGE_HSTS_MAX_AGE_SECONDS";
const HSTS_INCLUDE_SUBDOMAINS_ENV: &str = "SDKWORK_CLOUDROUTER_EDGE_HSTS_INCLUDE_SUBDOMAINS";
const HSTS_PRELOAD_ENV: &str = "SDKWORK_CLOUDROUTER_EDGE_HSTS_PRELOAD";
const RUNTIME_ENV_SCRIPT_PATH: &str = "/runtime-env.js";
const DEFAULT_HTML_CACHE_CONTROL: &str = "no-store";
const DEFAULT_ASSET_CACHE_CONTROL: &str = "public, max-age=31536000, immutable";
const DEFAULT_HSTS_MAX_AGE_SECONDS: u64 = 31_536_000;

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

/// One packaged Adaptive Web surface. Both surfaces are plain SPA roots with an
/// `index.html` shell; the delivery declares `/` mount plus `/index.html` SPA
/// fallback for each of them.
#[derive(Clone, Debug)]
struct PortalLane {
    root: PathBuf,
    index: PathBuf,
}

impl PortalLane {
    fn load(root: PathBuf, env_key: &str) -> Result<Self, String> {
        let index = root.join("index.html");
        let html = std::fs::read_to_string(&index).map_err(|error| {
            format!(
                "{env_key} must point at a packaged SPA root containing a readable index.html at {}: {error}",
                index.display()
            )
        })?;
        inject_portal_runtime_env_script(&html)?;
        Ok(Self { root, index })
    }
}

#[derive(Clone, Debug)]
pub struct PortalStaticConfig {
    pc: Option<PortalLane>,
    h5: Option<PortalLane>,
    /// `tabletArchitecture` of the adaptive delivery: tablets prefer the PC
    /// surface unless the delivery declares `h5`.
    tablet_prefers_h5: bool,
    runtime_env: PortalRuntimeEnv,
    /// Commercial edition (community/pro/enterprise/oem), resolved from the
    /// license key at startup. Injected into the runtime-env script.
    pub license_edition: Option<String>,
    content_security_policy: HeaderValue,
    strict_transport_security: Option<HeaderValue>,
    html_cache_control: HeaderValue,
    asset_cache_control: HeaderValue,
}

impl PortalStaticConfig {
    pub fn from_env_and_runtime(
        runtime_toml: Option<&RuntimeTomlConfig>,
    ) -> Result<Option<Self>, String> {
        let edge = runtime_toml.map(|config| &config.edge);
        let pc_root = env_text(PC_STATIC_ROOT_ENV)
            .or_else(|| edge.and_then(|config| config.portal_static_dist.clone()));
        let h5_root = env_text(H5_STATIC_ROOT_ENV)
            .or_else(|| edge.and_then(|config| config.portal_h5_static_dist.clone()));
        if pc_root.is_none() && h5_root.is_none() {
            // Neither SPA surface is packaged. `static-fallback` is a
            // deploy-plane concern (SDKWORK_DEPLOY_SPEC.md section 8), so the
            // process serves the API plane only.
            return Ok(None);
        }

        let mut config =
            Self::try_new_adaptive(pc_root.map(PathBuf::from), h5_root.map(PathBuf::from))?;
        let public = runtime_toml.map(|config| &config.portal.public);
        if let Some(value) = env_text("PORTAL_PUBLIC_SDK_BASE_URL")
            .or_else(|| public.and_then(|section| section.sdk_base_url.clone()))
        {
            config.apply_sdk_base_url(&value)?;
        }
        if let Some(value) = env_value("PORTAL_PUBLIC_API_BASE_URL")
            .or_else(|| public.and_then(|section| section.api_base_url.clone()))
        {
            config.runtime_env.api_base_url =
                normalize_public_url(&value, "PORTAL_PUBLIC_API_BASE_URL", false)?;
        }
        if let Some(value) = env_value("PORTAL_PUBLIC_OPEN_API_BASE_URL")
            .or_else(|| public.and_then(|section| section.open_api_base_url.clone()))
        {
            config.runtime_env.open_api_base_url =
                normalize_public_url(&value, "PORTAL_PUBLIC_OPEN_API_BASE_URL", true)?;
        }
        if let Some(value) = env_value("PORTAL_PUBLIC_APP_API_BASE_URL")
            .or_else(|| public.and_then(|section| section.app_api_base_url.clone()))
        {
            config.runtime_env.app_api_base_url =
                normalize_public_url(&value, "PORTAL_PUBLIC_APP_API_BASE_URL", false)?;
        }
        if let Some(value) = env_value("PORTAL_PUBLIC_BACKEND_API_BASE_URL")
            .or_else(|| public.and_then(|section| section.backend_api_base_url.clone()))
        {
            config.runtime_env.backend_api_base_url =
                normalize_public_url(&value, "PORTAL_PUBLIC_BACKEND_API_BASE_URL", false)?;
        }
        if let Some(value) = env_value("PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL")
            .or_else(|| public.and_then(|section| section.appbase_backend_api_base_url.clone()))
        {
            config.runtime_env.appbase_backend_api_base_url = if value.trim().is_empty() {
                None
            } else {
                Some(normalize_public_url(
                    &value,
                    "PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL",
                    false,
                )?)
            };
        }

        let tool_api_enabled = env_value("PORTAL_PUBLIC_TOOL_API_ENABLED")
            .map(|value| parse_bool(&value, "PORTAL_PUBLIC_TOOL_API_ENABLED"))
            .transpose()?
            .or_else(|| public.and_then(|section| section.tool_api_enabled))
            .unwrap_or(false);
        if tool_api_enabled {
            return Err(
                "PORTAL_PUBLIC_TOOL_API_ENABLED=true requires assembly-owned portal tool routes; the standalone gateway does not expose host-local business APIs"
                    .to_owned(),
            );
        }
        config.runtime_env.tool_api_enabled = false;

        let csp_connect_src = env_text(CSP_CONNECT_SRC_ENV)
            .or_else(|| runtime_toml.and_then(|runtime| runtime.edge.csp_connect_src.clone()));
        let csp_frame_src = env_text(CSP_FRAME_SRC_ENV)
            .map(|value| split_config_list(&value))
            .or_else(|| {
                runtime_toml.and_then(|runtime| runtime.portal.security.csp_frame_src.clone())
            })
            .unwrap_or_else(|| vec!["https://player.bilibili.com".to_owned()]);
        config.content_security_policy = build_portal_content_security_policy(
            &config.runtime_env,
            csp_connect_src.as_deref(),
            &csp_frame_src,
        )?;

        let security = runtime_toml.map(|runtime| &runtime.portal.security);
        let hsts_enabled = env_value(HSTS_ENABLED_ENV)
            .map(|value| parse_bool(&value, HSTS_ENABLED_ENV))
            .transpose()?
            .or_else(|| security.and_then(|section| section.hsts_enabled))
            .unwrap_or(false);
        let hsts_max_age = env_value(HSTS_MAX_AGE_ENV)
            .map(|value| parse_u64(&value, HSTS_MAX_AGE_ENV))
            .transpose()?
            .or_else(|| security.and_then(|section| section.hsts_max_age_seconds))
            .unwrap_or(DEFAULT_HSTS_MAX_AGE_SECONDS);
        let hsts_include_subdomains = env_value(HSTS_INCLUDE_SUBDOMAINS_ENV)
            .map(|value| parse_bool(&value, HSTS_INCLUDE_SUBDOMAINS_ENV))
            .transpose()?
            .or_else(|| security.and_then(|section| section.hsts_include_subdomains))
            .unwrap_or(true);
        let hsts_preload = env_value(HSTS_PRELOAD_ENV)
            .map(|value| parse_bool(&value, HSTS_PRELOAD_ENV))
            .transpose()?
            .or_else(|| security.and_then(|section| section.hsts_preload))
            .unwrap_or(false);
        config.strict_transport_security = strict_transport_security_header(
            hsts_enabled,
            hsts_max_age,
            hsts_include_subdomains,
            hsts_preload,
        )?;

        let static_assets = runtime_toml.map(|runtime| &runtime.portal.static_assets);
        config.html_cache_control = normalize_header(
            static_assets
                .and_then(|section| section.html_cache_control.as_deref())
                .unwrap_or(DEFAULT_HTML_CACHE_CONTROL),
            "portal HTML cache-control",
        )?;
        config.asset_cache_control = normalize_header(
            static_assets
                .and_then(|section| section.asset_cache_control.as_deref())
                .unwrap_or(DEFAULT_ASSET_CACHE_CONTROL),
            "portal asset cache-control",
        )?;
        Ok(Some(config))
    }

    /// Loads the packaged PC and/or H5 surfaces. A root is optional only when
    /// its surface is not packaged at all (SDKWORK_DEPLOY_SPEC.md section 8 plan
    /// folding `collapse-pc` / `collapse-h5`); a configured root that cannot be
    /// read is a broken install and fails closed.
    pub fn try_new_adaptive(
        pc_root: Option<PathBuf>,
        h5_root: Option<PathBuf>,
    ) -> Result<Self, String> {
        let pc = pc_root
            .map(|root| PortalLane::load(root, PC_STATIC_ROOT_ENV))
            .transpose()?;
        let h5 = h5_root
            .map(|root| PortalLane::load(root, H5_STATIC_ROOT_ENV))
            .transpose()?;
        if pc.is_none() && h5.is_none() {
            return Err(format!(
                "portal static delivery requires {PC_STATIC_ROOT_ENV} or {H5_STATIC_ROOT_ENV}"
            ));
        }
        let runtime_env = PortalRuntimeEnv::default();
        let content_security_policy = build_portal_content_security_policy(
            &runtime_env,
            None,
            &["https://player.bilibili.com".to_owned()],
        )?;
        Ok(Self {
            pc,
            h5,
            tablet_prefers_h5: false,
            runtime_env,
            license_edition: None,
            content_security_policy,
            strict_transport_security: None,
            html_cache_control: HeaderValue::from_static(DEFAULT_HTML_CACHE_CONTROL),
            asset_cache_control: HeaderValue::from_static(DEFAULT_ASSET_CACHE_CONTROL),
        })
    }

    /// Single-surface constructor: `dist_root` is the PC surface and mobile
    /// clients collapse onto it (`collapse-pc`).
    pub fn try_new(dist_root: impl Into<PathBuf>) -> Result<Self, String> {
        Self::try_new_adaptive(Some(dist_root.into()), None)
    }

    pub fn readiness_check(&self) -> Arc<dyn ReadinessCheck> {
        let index_paths = [&self.pc, &self.h5]
            .into_iter()
            .flatten()
            .map(|lane| lane.index.clone())
            .collect();
        Arc::new(PortalReadinessCheck { index_paths })
    }

    fn surfaces(&self) -> (bool, bool) {
        (self.pc.is_some(), self.h5.is_some())
    }

    fn lane(&self, surface: AdaptiveSurface) -> &PortalLane {
        match surface {
            AdaptiveSurface::Pc => self
                .pc
                .as_ref()
                .expect("pc surface selected without a packaged pc root"),
            AdaptiveSurface::H5 => self
                .h5
                .as_ref()
                .expect("h5 surface selected without a packaged h5 root"),
        }
    }

    fn apply_sdk_base_url(&mut self, value: &str) -> Result<(), String> {
        let base = normalize_public_url(value, "PORTAL_PUBLIC_SDK_BASE_URL", true)?;
        self.runtime_env.api_base_url = append_public_path(&base, "/v1");
        self.runtime_env.open_api_base_url = self.runtime_env.api_base_url.clone();
        self.runtime_env.app_api_base_url = append_public_path(&base, "/app/v3/api");
        self.runtime_env.backend_api_base_url = append_public_path(&base, "/backend/v3/api");
        self.runtime_env.appbase_backend_api_base_url =
            Some(self.runtime_env.backend_api_base_url.clone());
        Ok(())
    }
}

#[derive(Clone)]
struct PortalReadinessCheck {
    index_paths: Vec<PathBuf>,
}

impl ReadinessCheck for PortalReadinessCheck {
    fn check(&self) -> ReadinessFuture<'_> {
        Box::pin(async move {
            for index_path in &self.index_paths {
                if !index_path.is_file() {
                    return Err(format!(
                        "portal static index is unavailable: {}",
                        index_path.display()
                    ));
                }
            }
            Ok(())
        })
    }
}

#[derive(Clone)]
struct GatewayState {
    api_router: Router,
    portal: Arc<PortalStaticConfig>,
}

pub fn mount_portal_static(api_router: Router, portal: Option<PortalStaticConfig>) -> Router {
    let Some(portal) = portal else {
        return api_router;
    };
    Router::new()
        .fallback(dispatch_gateway_request)
        .with_state(GatewayState {
            api_router,
            portal: Arc::new(portal),
        })
}

async fn dispatch_gateway_request(State(state): State<GatewayState>, request: Request) -> Response {
    let method = request.method().clone();
    let path = request.uri().path().to_owned();
    let headers = request.headers().clone();
    let api_response = match state.api_router.clone().oneshot(request).await {
        Ok(response) => response,
        Err(error) => match error {},
    };
    if api_response.status() != StatusCode::NOT_FOUND || is_reserved_api_path(&path) {
        return api_response;
    }
    serve_portal_static(state.portal.as_ref(), &headers, &method, &path).await
}

async fn serve_portal_static(
    config: &PortalStaticConfig,
    headers: &HeaderMap,
    method: &Method,
    request_path: &str,
) -> Response {
    if method != Method::GET && method != Method::HEAD {
        return StatusCode::METHOD_NOT_ALLOWED.into_response();
    }

    if request_path == RUNTIME_ENV_SCRIPT_PATH {
        return static_response(
            method,
            "application/javascript; charset=utf-8",
            config.html_cache_control.clone(),
            build_portal_runtime_env_script(&config.runtime_env, config.license_edition.as_deref())
                .into_bytes(),
            config,
        );
    }

    let (pc_ready, h5_ready) = config.surfaces();
    let Some(surface) = select_adaptive_surface(
        classify_adaptive_client(headers),
        config.tablet_prefers_h5,
        pc_ready,
        h5_ready,
    ) else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let lane = config.lane(surface);

    let requested_file = match portal_file_path(&lane.root, request_path) {
        Some(path) if path.is_file() => path,
        _ => lane.index.clone(),
    };
    let content_type = content_type_for_path(&requested_file);
    let cache_control = if requested_file.ends_with("index.html") {
        config.html_cache_control.clone()
    } else {
        config.asset_cache_control.clone()
    };
    let bytes = if requested_file.ends_with("index.html") {
        match tokio::fs::read_to_string(&requested_file).await {
            Ok(html) => match inject_portal_runtime_env_script(&html) {
                Ok(html) => html.into_bytes(),
                Err(message) => return internal_error(message),
            },
            Err(error) => {
                return internal_error(format!("failed to read portal index.html: {error}"))
            }
        }
    } else {
        match tokio::fs::read(&requested_file).await {
            Ok(bytes) => bytes,
            Err(error) => {
                return internal_error(format!("failed to read portal static asset: {error}"))
            }
        }
    };
    let mut response = static_response(method, content_type, cache_control, bytes, config);
    response
        .headers_mut()
        .insert(header::VARY, adaptive_vary_header());
    response.headers_mut().insert(
        SEC_CH_UA_MOBILE,
        HeaderValue::from_static("Sec-CH-UA-Mobile"),
    );
    response
}

fn static_response(
    method: &Method,
    content_type: &'static str,
    cache_control: HeaderValue,
    bytes: Vec<u8>,
    config: &PortalStaticConfig,
) -> Response {
    let content_length = bytes.len();
    let mut response = Response::new(if method == Method::HEAD {
        Body::empty()
    } else {
        Body::from(bytes)
    });
    apply_security_headers(response.headers_mut(), config);
    response
        .headers_mut()
        .insert(header::CONTENT_TYPE, HeaderValue::from_static(content_type));
    response
        .headers_mut()
        .insert(header::CACHE_CONTROL, cache_control);
    if let Ok(value) = HeaderValue::from_str(&content_length.to_string()) {
        response.headers_mut().insert(header::CONTENT_LENGTH, value);
    }
    response
}

fn apply_security_headers(headers: &mut HeaderMap, config: &PortalStaticConfig) {
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
        config.content_security_policy.clone(),
    );
    if let Some(value) = &config.strict_transport_security {
        headers.insert("strict-transport-security", value.clone());
    }
}

fn internal_error(message: String) -> Response {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        [(header::CONTENT_TYPE, "text/plain; charset=utf-8")],
        message,
    )
        .into_response()
}

fn is_reserved_api_path(path: &str) -> bool {
    const EXACT: &[&str] = &["/healthz", "/livez", "/readyz", "/metrics", "/openapi.json"];
    const PREFIXES: &[&str] = &[
        "/api/",
        "/app/",
        "/backend/",
        "/cloud/",
        "/openapi/",
        "/paas/",
        "/payments/",
        "/v1/",
    ];
    EXACT.contains(&path) || PREFIXES.iter().any(|prefix| path.starts_with(prefix))
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
    let mut output = String::with_capacity(html.len() + script_tag.len() + 1);
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

fn build_portal_runtime_env_script(
    runtime_env: &PortalRuntimeEnv,
    license_edition: Option<&str>,
) -> String {
    let mut payload = json!({
        "VITE_API_BASE_URL": runtime_env.api_base_url,
        "VITE_CLOUDROUTER_OPEN_API_BASE_URL": runtime_env.open_api_base_url,
        "VITE_CLOUDROUTER_APP_API_BASE_URL": runtime_env.app_api_base_url,
        "VITE_CLOUDROUTER_BACKEND_API_BASE_URL": runtime_env.backend_api_base_url,
        "VITE_TOOL_API_ENABLED": if runtime_env.tool_api_enabled { "true" } else { "false" },
    });
    if let Some(value) = &runtime_env.appbase_backend_api_base_url {
        payload["VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL"] = json!(value);
    }
    let serialized = payload
        .to_string()
        .replace('<', "\\u003C")
        .replace('>', "\\u003E")
        .replace('&', "\\u0026")
        .replace('\u{2028}', "\\u2028")
        .replace('\u{2029}', "\\u2029");
    let mut script = format!("window.__CLOUDROUTER_ENV__ = Object.freeze({serialized});\n");

    // Commercial edition (community/pro/enterprise/oem) for the portal UI.
    if let Some(edition) = license_edition {
        script.push_str(&format!(
            "window.__SDKWORK_EDITION__ = {};\n",
            json!(edition).to_string()
        ));
    }

    // No credential-entry bootstrap Access-Token is injected here. A usable
    // token (explicit `SDKWORK_ACCESS_TOKEN` or a signed tenant-bound session
    // token) must never be distributed through an anonymously readable runtime
    // script: it would publish a live credential to every visitor. Development
    // workstations may opt in to a payload-only token through
    // `SDKWORK_CLOUDROUTER_PORTAL_DEV_BOOTSTRAP_TOKEN` on the edge server.
    script
}

fn build_portal_content_security_policy(
    runtime_env: &PortalRuntimeEnv,
    extra_connect_src: Option<&str>,
    frame_src_values: &[String],
) -> Result<HeaderValue, String> {
    let mut connect_src = vec!["'self'".to_owned(), "https://api.sdkwork.com".to_owned()];
    for value in [
        &runtime_env.api_base_url,
        &runtime_env.open_api_base_url,
        &runtime_env.app_api_base_url,
        &runtime_env.backend_api_base_url,
    ] {
        if let Some(origin) = public_url_origin(value)? {
            push_unique(&mut connect_src, origin);
        }
    }
    if let Some(value) = &runtime_env.appbase_backend_api_base_url {
        if let Some(origin) = public_url_origin(value)? {
            push_unique(&mut connect_src, origin);
        }
    }
    if let Some(value) = extra_connect_src {
        for token in split_config_list(value) {
            push_unique(
                &mut connect_src,
                normalize_origin(&token, CSP_CONNECT_SRC_ENV)?,
            );
        }
    }

    let mut frame_src = vec!["'self'".to_owned()];
    for value in frame_src_values {
        push_unique(&mut frame_src, normalize_origin(value, CSP_FRAME_SRC_ENV)?);
    }
    HeaderValue::from_str(&format!(
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src {}; frame-src {}; frame-ancestors 'none'",
        connect_src.join(" "),
        frame_src.join(" ")
    ))
    .map_err(|error| format!("failed to build portal content-security-policy: {error}"))
}

fn public_url_origin(value: &str) -> Result<Option<String>, String> {
    if value.is_empty() || value.starts_with('/') {
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

fn normalize_origin(value: &str, label: &str) -> Result<String, String> {
    let trimmed = value.trim().trim_end_matches('/');
    if trimmed.is_empty() || trimmed == "*" || trimmed.contains(['\r', '\n', '\\', '"', '\'', ';'])
    {
        return Err(format!(
            "{label} entries must be explicit HTTP/HTTPS origins without directives"
        ));
    }
    let uri = trimmed
        .parse::<Uri>()
        .map_err(|error| format!("{label} entry must be an HTTP/HTTPS origin: {error}"))?;
    if !matches!(uri.scheme_str(), Some("http" | "https"))
        || uri.authority().is_none()
        || uri.path() != "/"
        || uri.query().is_some()
    {
        return Err(format!(
            "{label} entries must be HTTP/HTTPS origins without path or query"
        ));
    }
    Ok(trimmed.to_owned())
}

fn normalize_public_url(value: &str, label: &str, allow_empty: bool) -> Result<String, String> {
    let trimmed = value.trim();
    if allow_empty && trimmed.is_empty() {
        return Ok(String::new());
    }
    if trimmed.is_empty() || trimmed.contains(['\r', '\n', '\\', '"', '\'']) {
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
        return Ok(trimmed.trim_end_matches('/').to_owned());
    }
    let uri = trimmed
        .parse::<Uri>()
        .map_err(|_| format!("{label} must be an HTTP/HTTPS URL or root-relative path"))?;
    if !matches!(uri.scheme_str(), Some("http" | "https"))
        || uri.authority().is_none()
        || uri.query().is_some()
    {
        return Err(format!(
            "{label} must be an HTTP/HTTPS URL or root-relative path"
        ));
    }
    Ok(trimmed.trim_end_matches('/').to_owned())
}

fn append_public_path(base: &str, path: &str) -> String {
    if base.is_empty() {
        path.to_owned()
    } else {
        format!("{}{path}", base.trim_end_matches('/'))
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

fn normalize_header(value: &str, label: &str) -> Result<HeaderValue, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.contains(['\r', '\n']) {
        return Err(format!("{label} must be a non-empty single header value"));
    }
    HeaderValue::from_str(trimmed).map_err(|_| format!("{label} must be a valid header value"))
}

fn parse_bool(value: &str, label: &str) -> Result<bool, String> {
    match value.trim().to_ascii_lowercase().as_str() {
        "1" | "true" | "yes" | "on" => Ok(true),
        "0" | "false" | "no" | "off" => Ok(false),
        _ => Err(format!("{label} must be true or false")),
    }
}

fn parse_u64(value: &str, label: &str) -> Result<u64, String> {
    value
        .trim()
        .parse::<u64>()
        .map_err(|_| format!("{label} must be an unsigned integer"))
}

fn env_value(name: &str) -> Option<String> {
    std::env::var(name).ok()
}

fn env_text(name: &str) -> Option<String> {
    env_value(name).filter(|value| !value.trim().is_empty())
}

fn split_config_list(value: &str) -> Vec<String> {
    value
        .split(|character: char| character == ',' || character.is_whitespace())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .collect()
}

fn push_unique(values: &mut Vec<String>, value: String) {
    if !values.contains(&value) {
        values.push(value);
    }
}

fn content_type_for_path(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|extension| extension.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase()
        .as_str()
    {
        "html" => "text/html; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "js" | "mjs" => "application/javascript; charset=utf-8",
        "json" | "map" => "application/json; charset=utf-8",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "ico" => "image/x-icon",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "txt" => "text/plain; charset=utf-8",
        _ => "application/octet-stream",
    }
}

#[cfg(test)]
mod tests {
    use std::time::{SystemTime, UNIX_EPOCH};

    use axum::body::to_bytes;
    use axum::http::header::USER_AGENT;
    use axum::routing::get;

    use super::*;

    const DESKTOP_USER_AGENT: &str =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
    const MOBILE_USER_AGENT: &str =
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";

    fn fixture_root(label: &str) -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock")
            .as_nanos();
        std::env::temp_dir().join(format!("cloudrouter-portal-{label}-{suffix}"))
    }

    fn write_fixture(root: &Path, shell: &str) {
        std::fs::create_dir_all(root.join("assets")).expect("create fixture");
        std::fs::write(
            root.join("index.html"),
            format!(
                r#"<div id="root">{shell}</div><script type="module" src="/assets/app.js"></script>"#
            ),
        )
        .expect("write index");
        std::fs::write(root.join("assets/app.js"), "console.log('ok');").expect("write asset");
    }

    async fn issue_request(router: Router, uri: &str, user_agent: Option<&str>) -> Response {
        let mut request = Request::builder().uri(uri);
        if let Some(user_agent) = user_agent {
            request = request.header(USER_AGENT, user_agent);
        }
        router
            .clone()
            .oneshot(request.body(Body::empty()).expect("request"))
            .await
            .expect("response")
    }

    async fn body_text(response: Response) -> String {
        let bytes = to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("body");
        String::from_utf8(bytes.to_vec()).expect("utf8")
    }

    #[tokio::test]
    async fn api_routes_win_and_static_assets_use_spa_fallback() {
        let root = fixture_root("single");
        write_fixture(&root, "pc");
        let portal = PortalStaticConfig::try_new(&root).expect("portal config");
        let api = Router::new().route("/v1/ping", get(|| async { "pong" }));
        let router = mount_portal_static(api, Some(portal));

        let api_response =
            issue_request(router.clone(), "/v1/ping", Some(DESKTOP_USER_AGENT)).await;
        assert_eq!(api_response.status(), StatusCode::OK);
        assert_eq!(body_text(api_response).await, "pong");

        let page_response = issue_request(
            router.clone(),
            "/console/dashboard",
            Some(DESKTOP_USER_AGENT),
        )
        .await;
        assert_eq!(page_response.status(), StatusCode::OK);
        assert_eq!(
            page_response
                .headers()
                .get("x-content-type-options")
                .expect("security header"),
            "nosniff"
        );
        assert_eq!(
            page_response.headers().get(header::VARY).expect("vary"),
            "User-Agent, Sec-CH-UA-Mobile"
        );
        assert_eq!(
            page_response
                .headers()
                .get(SEC_CH_UA_MOBILE)
                .expect("accept-ch"),
            "Sec-CH-UA-Mobile"
        );
        let page = body_text(page_response).await;
        assert!(page.contains("/runtime-env.js"));
        assert!(page.contains(r#"<div id="root">pc</div>"#));

        let missing_api =
            issue_request(router, "/backend/v3/api/missing", Some(DESKTOP_USER_AGENT)).await;
        assert_eq!(missing_api.status(), StatusCode::NOT_FOUND);
        let _ = std::fs::remove_dir_all(root);
    }

    #[tokio::test]
    async fn adaptive_dispatch_selects_the_surface_by_device_class() {
        let pc_root = fixture_root("adaptive-pc");
        let h5_root = fixture_root("adaptive-h5");
        write_fixture(&pc_root, "pc");
        write_fixture(&h5_root, "h5");
        let portal =
            PortalStaticConfig::try_new_adaptive(Some(pc_root.clone()), Some(h5_root.clone()))
                .expect("adaptive portal config");
        let router = mount_portal_static(Router::new(), Some(portal));

        let desktop = issue_request(router.clone(), "/", Some(DESKTOP_USER_AGENT)).await;
        assert_eq!(desktop.status(), StatusCode::OK);
        assert!(body_text(desktop)
            .await
            .contains(r#"<div id="root">pc</div>"#));

        let mobile = issue_request(router.clone(), "/", Some(MOBILE_USER_AGENT)).await;
        assert_eq!(mobile.status(), StatusCode::OK);
        assert!(body_text(mobile)
            .await
            .contains(r#"<div id="root">h5</div>"#));

        let hinted = router
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/")
                    .header(USER_AGENT, DESKTOP_USER_AGENT)
                    .header(SEC_CH_UA_MOBILE, "?1")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("response");
        assert!(body_text(hinted)
            .await
            .contains(r#"<div id="root">h5</div>"#));

        let _ = std::fs::remove_dir_all(pc_root);
        let _ = std::fs::remove_dir_all(h5_root);
    }

    #[tokio::test]
    async fn mobile_collapses_onto_the_pc_surface_when_h5_is_not_packaged() {
        let root = fixture_root("collapse-pc");
        write_fixture(&root, "pc");
        let portal = PortalStaticConfig::try_new(&root).expect("portal config");
        let router = mount_portal_static(Router::new(), Some(portal));

        let mobile = issue_request(router, "/", Some(MOBILE_USER_AGENT)).await;
        assert_eq!(mobile.status(), StatusCode::OK);
        assert!(body_text(mobile)
            .await
            .contains(r#"<div id="root">pc</div>"#));
        let _ = std::fs::remove_dir_all(root);
    }

    #[tokio::test]
    async fn desktop_collapses_onto_the_h5_surface_when_pc_is_not_packaged() {
        let root = fixture_root("collapse-h5");
        write_fixture(&root, "h5");
        let portal =
            PortalStaticConfig::try_new_adaptive(None, Some(root.clone())).expect("portal config");
        let router = mount_portal_static(Router::new(), Some(portal));

        let desktop = issue_request(router, "/", Some(DESKTOP_USER_AGENT)).await;
        assert_eq!(desktop.status(), StatusCode::OK);
        assert!(body_text(desktop)
            .await
            .contains(r#"<div id="root">h5</div>"#));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn config_rejects_missing_or_invalid_index() {
        let root = fixture_root("invalid");
        std::fs::create_dir_all(&root).expect("create fixture");
        assert!(PortalStaticConfig::try_new(&root)
            .expect_err("missing index must fail")
            .contains("readable index.html"));
        std::fs::write(root.join("index.html"), "<div>no module</div>").expect("write index");
        assert!(PortalStaticConfig::try_new(&root)
            .expect_err("invalid index must fail")
            .contains("module script"));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn config_requires_at_least_one_surface() {
        assert!(PortalStaticConfig::try_new_adaptive(None, None)
            .expect_err("no surface must fail")
            .contains(PC_STATIC_ROOT_ENV));
    }
}
