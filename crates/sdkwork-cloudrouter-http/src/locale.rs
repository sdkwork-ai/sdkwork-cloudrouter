//! Request locale negotiation and problem-detail localization.
//!
//! Aligned with `I18N_SPEC.md`:
//! - §2 locale selection (SDK locale header > `Accept-Language` > default > fallback);
//! - §4 locale headers (`X-SdkWork-Locale`, `Accept-Language`, `Content-Language`, `Vary`);
//! - §8-§9 problem-detail localization (stable `code`/`traceId`/`status`/`type`/`i18nKey`
//!   are never translated; `detail` is localized only for specific business/validation keys
//!   where the message catalog owns a safe template).
//!
//! Cloud Router owns this resolution boundary (handlers must not parse locale headers
//! themselves). The shared web-framework locale module is not wired, so this crate
//! provides the self-contained equivalent mounted on the served router.

use std::collections::HashMap;
use std::sync::OnceLock;

use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::{header, HeaderValue};
use axum::middleware::{from_fn_with_state, Next};
use axum::response::Response;
use axum::Router;
use sdkwork_web_core::WebRequestContext;
use serde_json::Value;

/// Supported BCP 47 locale tags (`I18N_SPEC.md` §0).
pub const CLOUD_ROUTER_SUPPORTED_LOCALES: [&str; 7] = [
    "en-US", "zh-CN", "ja-JP", "de-DE", "fr-FR", "ru-RU", "ko-KR",
];

/// Default display locale when no request preference is available.
pub const CLOUD_ROUTER_DEFAULT_LOCALE: &str = "en-US";

/// Explicit final locale when a requested locale cannot be satisfied.
pub const CLOUD_ROUTER_FALLBACK_LOCALE: &str = "en-US";

/// Approved SDKWork locale override header, produced by the SDK runtime locale provider
/// only (`I18N_SPEC.md` §4, §10). Feature code must not assemble it manually.
pub const SDK_LOCALE_HEADER: &str = "x-sdkwork-locale";

/// Largest problem+json body the localization middleware will read.
const PROBLEM_LOCALIZATION_MAX_BYTES: usize = 64 * 1024;

/// Where the effective locale came from (`I18N_SPEC.md` §3 `WebLocaleContext.source`).
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LocaleSource {
    SdkLocaleHeader,
    AcceptLanguage,
    Default,
}

/// Resolved per-request locale, available to handlers through request extensions.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RequestLocale {
    pub effective: String,
    pub requested: Option<String>,
    pub source: LocaleSource,
}

impl RequestLocale {
    pub fn effective(&self) -> &str {
        &self.effective
    }
}

/// Locale policy for Cloud Router services (`I18N_SPEC.md` §0 normative model).
#[derive(Clone, Debug)]
pub struct CloudRouterLocalePolicy {
    pub default_locale: String,
    pub fallback_locale: String,
    pub supported_locales: Vec<String>,
}

impl Default for CloudRouterLocalePolicy {
    fn default() -> Self {
        Self {
            default_locale: CLOUD_ROUTER_DEFAULT_LOCALE.to_owned(),
            fallback_locale: CLOUD_ROUTER_FALLBACK_LOCALE.to_owned(),
            supported_locales: CLOUD_ROUTER_SUPPORTED_LOCALES
                .iter()
                .map(|tag| (*tag).to_owned())
                .collect(),
        }
    }
}

impl CloudRouterLocalePolicy {
    /// Loads the policy from `SDKWORK_CLOUDROUTER_DEFAULT_LOCALE`,
    /// `SDKWORK_CLOUDROUTER_SUPPORTED_LOCALES`, and
    /// `SDKWORK_CLOUDROUTER_FALLBACK_LOCALE` (comma-separated BCP 47 tags).
    pub fn from_env() -> Self {
        let mut policy = Self::default();
        if let Some(tag) = std::env::var("SDKWORK_CLOUDROUTER_DEFAULT_LOCALE")
            .ok()
            .as_deref()
            .and_then(normalize_locale_tag)
        {
            policy.default_locale = tag;
        }
        if let Some(tag) = std::env::var("SDKWORK_CLOUDROUTER_FALLBACK_LOCALE")
            .ok()
            .as_deref()
            .and_then(normalize_locale_tag)
        {
            policy.fallback_locale = tag;
        }
        if let Some(value) = std::env::var("SDKWORK_CLOUDROUTER_SUPPORTED_LOCALES").ok() {
            let parsed = value
                .split(',')
                .filter_map(|part| normalize_locale_tag(part))
                .collect::<Vec<_>>();
            if !parsed.is_empty() {
                policy.supported_locales = parsed;
            }
        }
        policy
    }

    /// Resolves the effective request locale.
    ///
    /// Priority (`I18N_SPEC.md` §2): SDK locale header > `Accept-Language` >
    /// application `defaultLocale` > explicit `fallbackLocale`.
    pub fn resolve(&self, sdk_locale: Option<&str>, accept_language: Option<&str>) -> RequestLocale {
        if let Some(tag) = sdk_locale.and_then(normalize_locale_tag) {
            if self.supports(&tag) {
                return RequestLocale {
                    effective: tag.clone(),
                    requested: Some(tag),
                    source: LocaleSource::SdkLocaleHeader,
                };
            }
        }
        if let Some(best) = best_accept_language_match(accept_language, self) {
            return RequestLocale {
                effective: best.clone(),
                requested: Some(best),
                source: LocaleSource::AcceptLanguage,
            };
        }
        let effective = if self.supports(&self.default_locale) {
            self.default_locale.clone()
        } else {
            self.fallback_locale.clone()
        };
        RequestLocale {
            effective,
            requested: None,
            source: LocaleSource::Default,
        }
    }

    fn supports(&self, tag: &str) -> bool {
        self.supported_locales.iter().any(|supported| supported == tag)
    }
}

/// Normalizes a BCP 47 language tag to a supported canonical form.
///
/// Region variants collapse to the supported language tag (`en-GB` -> `en-US`,
/// `de-AT` -> `de-DE`); unsupported languages return `None` so the caller falls
/// through the fallback chain (`I18N_SPEC.md` §2).
pub fn normalize_locale_tag(tag: &str) -> Option<String> {
    let trimmed = tag.trim();
    if trimmed.is_empty() {
        return None;
    }
    let language = trimmed
        .split(['-', '_'])
        .next()
        .unwrap_or_default()
        .to_ascii_lowercase();
    match language.as_str() {
        "en" => Some("en-US".to_owned()),
        "zh" => Some("zh-CN".to_owned()),
        "ja" => Some("ja-JP".to_owned()),
        "de" => Some("de-DE".to_owned()),
        "fr" => Some("fr-FR".to_owned()),
        "ru" => Some("ru-RU".to_owned()),
        "ko" => Some("ko-KR".to_owned()),
        _ => None,
    }
}

/// Parses an `Accept-Language` header into `(tag, q)` pairs in header order.
///
/// The wildcard `*` is skipped: it must not beat a supported explicit tag and
/// Cloud Router only resolves against the configured supported locale list.
pub fn parse_accept_language(header_value: &str) -> Vec<(String, f32)> {
    header_value
        .split(',')
        .filter_map(|part| {
            let mut segments = part.split(';');
            let tag = segments.next()?.trim();
            if tag.is_empty() || tag == "*" {
                return None;
            }
            let mut quality = 1.0_f32;
            for parameter in segments {
                let parameter = parameter.trim();
                if let Some(value) = parameter.strip_prefix("q=") {
                    quality = value.trim().parse::<f32>().unwrap_or(1.0).clamp(0.0, 1.0);
                }
            }
            Some((tag.to_owned(), quality))
        })
        .collect()
}

fn best_accept_language_match(
    accept_language: Option<&str>,
    policy: &CloudRouterLocalePolicy,
) -> Option<String> {
    let raw = accept_language?.trim();
    if raw.is_empty() {
        return None;
    }
    let mut best: Option<(String, f32)> = None;
    for (tag, quality) in parse_accept_language(raw) {
        if quality <= 0.0 {
            continue;
        }
        let Some(canonical) = normalize_locale_tag(&tag) else {
            continue;
        };
        if !policy.supports(&canonical) {
            continue;
        }
        if best.as_ref().map_or(true, |(_, best_quality)| quality > *best_quality) {
            best = Some((canonical, quality));
        }
    }
    best.map(|(tag, _)| tag)
}

/// Owns the embedded message templates used for problem-detail localization.
///
/// Authored sources follow `I18N_SPEC.md` §6.1 Rust layout:
/// `resources/i18n/<locale>/<domain>/<capability>/<bundle>.json`.
#[derive(Debug, Default)]
pub struct EmbeddedMessageCatalog {
    by_locale: HashMap<String, HashMap<String, String>>,
}

impl EmbeddedMessageCatalog {
    fn load() -> Self {
        let mut by_locale = HashMap::new();
        for (locale, raw) in [
            ("en-US", include_str!("../resources/i18n/en-US/cloudrouter/errors/result.json")),
            ("zh-CN", include_str!("../resources/i18n/zh-CN/cloudrouter/errors/result.json")),
        ] {
            match serde_json::from_str::<HashMap<String, String>>(raw) {
                Ok(entries) => {
                    by_locale.insert(locale.to_owned(), entries);
                }
                Err(error) => {
                    tracing::error!(%locale, %error, "invalid embedded message catalog");
                }
            }
        }
        Self { by_locale }
    }

    /// Resolves a message template for a locale with the standard fallback
    /// chain: exact locale, then the language default (`zh` -> `zh-CN`),
    /// then `en-US`.
    pub fn resolve(&self, key: &str, locale: &str) -> Option<&str> {
        if let Some(entries) = self.by_locale.get(locale) {
            if let Some(template) = entries.get(key) {
                return Some(template.as_str());
            }
        }
        if locale.to_ascii_lowercase().starts_with("zh") {
            if let Some(template) = self
                .by_locale
                .get("zh-CN")
                .and_then(|entries| entries.get(key))
            {
                return Some(template.as_str());
            }
        }
        self.by_locale
            .get("en-US")
            .and_then(|entries| entries.get(key))
            .map(String::as_str)
    }
}

pub fn embedded_message_catalog() -> &'static EmbeddedMessageCatalog {
    static CATALOG: OnceLock<EmbeddedMessageCatalog> = OnceLock::new();
    CATALOG.get_or_init(EmbeddedMessageCatalog::load)
}

/// Interpolates `{{name}}` placeholders from a sanitized params object.
///
/// Returns `None` when any placeholder cannot be resolved so callers keep the
/// original safe message instead of emitting a half-rendered template.
pub fn interpolate_template(template: &str, params: &Value) -> Option<String> {
    let params = params.as_object()?;
    let mut result = String::with_capacity(template.len());
    let mut rest = template;
    while let Some(open) = rest.find("{{") {
        let after_open = &rest[open + 2..];
        let Some(close) = after_open.find("}}") else {
            return None;
        };
        let key = after_open[..close].trim();
        result.push_str(&rest[..open]);
        let value = match key_value(key, params) {
            Some(value) => value,
            None => return None,
        };
        result.push_str(&value);
        rest = &after_open[close + 2..];
    }
    result.push_str(rest);
    Some(result)
}

fn key_value(key: &str, params: &serde_json::Map<String, Value>) -> Option<String> {
    let value = params.get(key)?;
    match value {
        Value::String(text) => Some(text.clone()),
        Value::Number(number) => Some(number.to_string()),
        Value::Bool(flag) => Some(flag.to_string()),
        _ => None,
    }
}

/// Localizes a problem+json payload for the effective locale.
///
/// - `locale` is always recorded (effective display language).
/// - `detail` is localized only for specific business/validation `i18nKey`s whose
///   template resolves completely. Generic `errors.result.<code>` keys never replace
///   the handler-provided detail (it may carry business specifics); frontends
///   translate those keys themselves (`I18N_SPEC.md` §7).
pub fn localize_problem_payload(payload: &mut Value, locale: &str) {
    localize_problem_payload_with_catalog(payload, locale, embedded_message_catalog());
}

fn localize_problem_payload_with_catalog(
    payload: &mut Value,
    locale: &str,
    catalog: &EmbeddedMessageCatalog,
) {
    payload["locale"] = Value::String(locale.to_owned());
    let Some(key) = payload.get("i18nKey").and_then(Value::as_str) else {
        return;
    };
    if key.starts_with("errors.result.") {
        return;
    }
    let Some(template) = catalog.resolve(key, locale) else {
        return;
    };
    let params = payload.get("params").cloned().unwrap_or(Value::Null);
    if let Some(localized) = interpolate_template(template, &params) {
        payload["detail"] = Value::String(localized);
    }
}

/// Mounts request locale negotiation on the outermost router.
///
/// The middleware resolves the effective locale from request headers, exposes it
/// to handlers through a [`RequestLocale`] extension, and enriches problem+json
/// responses with the `locale` field plus `Content-Language` / `Vary` headers.
pub fn with_request_locale(router: Router) -> Router {
    router.layer(from_fn_with_state(
        CloudRouterLocalePolicy::from_env(),
        request_locale_middleware,
    ))
}

async fn request_locale_middleware(
    State(policy): State<CloudRouterLocalePolicy>,
    mut request: Request,
    next: Next,
) -> Response {
    let sdk_locale = request
        .headers()
        .get(SDK_LOCALE_HEADER)
        .and_then(|value| value.to_str().ok());
    let accept_language = request
        .headers()
        .get(header::ACCEPT_LANGUAGE)
        .and_then(|value| value.to_str().ok());
    let locale = policy.resolve(sdk_locale, accept_language);
    tracing::debug!(
        effective = %locale.effective,
        requested = ?locale.requested,
        source = ?locale.source,
        "resolved request locale"
    );

    if let Some(context) = request.extensions_mut().get_mut::<WebRequestContext>() {
        context.locale = Some(locale.effective.clone());
    }
    request.extensions_mut().insert(locale.clone());

    let mut response = next.run(request).await;
    if let Ok(value) = HeaderValue::from_str(&locale.effective) {
        response.headers_mut().insert(header::CONTENT_LANGUAGE, value);
    }
    append_vary_accept_language(&mut response);

    if is_problem_json(&response) {
        if let Some(mut payload) = read_problem_payload(&mut response).await {
            localize_problem_payload(&mut payload, &locale.effective);
            write_problem_payload(&mut response, &payload);
        }
    }
    response
}

fn is_problem_json(response: &Response) -> bool {
    response
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(|value| {
            value.starts_with("application/problem+json")
                || value.starts_with("application/problem+json;")
        })
        .unwrap_or(false)
}

fn append_vary_accept_language(response: &mut Response) {
    if let Some(existing) = response.headers_mut().get_mut(header::VARY) {
        let already_present = existing
            .to_str()
            .map(|value| {
                value
                    .split(',')
                    .any(|part| part.trim().eq_ignore_ascii_case("Accept-Language"))
            })
            .unwrap_or(false);
        if !already_present {
            let merged = format!("{}, Accept-Language", existing.to_str().unwrap_or_default());
            if let Ok(value) = HeaderValue::from_str(&merged) {
                *existing = value;
            }
        }
        return;
    }
    response
        .headers_mut()
        .insert(header::VARY, HeaderValue::from_static("Accept-Language"));
}

async fn read_problem_payload(response: &mut Response) -> Option<Value> {
    let (parts, body) = std::mem::replace(response, Response::new(Body::empty())).into_parts();
    match axum::body::to_bytes(body, PROBLEM_LOCALIZATION_MAX_BYTES).await {
        Ok(bytes) => {
            let payload = serde_json::from_slice(&bytes).ok();
            *response = Response::from_parts(parts, Body::from(bytes));
            payload
        }
        Err(error) => {
            tracing::warn!(%error, "failed to read problem response body for localization");
            *response = Response::from_parts(parts, Body::empty());
            None
        }
    }
}

fn write_problem_payload(response: &mut Response, payload: &Value) {
    let Ok(bytes) = serde_json::to_vec(payload) else {
        tracing::warn!("failed to encode localized problem response");
        return;
    };
    let (parts, _) = std::mem::replace(response, Response::new(Body::empty())).into_parts();
    *response = Response::from_parts(parts, Body::from(bytes));
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::StatusCode;
    use axum::response::IntoResponse;
    use serde_json::json;

    fn policy() -> CloudRouterLocalePolicy {
        CloudRouterLocalePolicy::default()
    }

    #[test]
    fn normalizes_locale_tags() {
        assert_eq!(Some("en-US".to_owned()), normalize_locale_tag("en"));
        assert_eq!(Some("zh-CN".to_owned()), normalize_locale_tag("zh-CN"));
        assert_eq!(Some("zh-CN".to_owned()), normalize_locale_tag("zh_CN"));
        assert_eq!(Some("de-DE".to_owned()), normalize_locale_tag("de-AT"));
        assert_eq!(Some("en-US".to_owned()), normalize_locale_tag(" en-GB "));
        assert_eq!(None, normalize_locale_tag(""));
        assert_eq!(None, normalize_locale_tag("xx"));
    }

    #[test]
    fn parses_accept_language_with_quality() {
        let parsed = parse_accept_language("en-US,en;q=0.9, zh-CN;q=0.8");
        assert_eq!(
            vec![
                ("en-US".to_owned(), 1.0),
                ("en".to_owned(), 0.9),
                ("zh-CN".to_owned(), 0.8),
            ],
            parsed
        );
        assert!(parse_accept_language("*").is_empty());
        assert_eq!(vec![("en".to_owned(), 1.0)], parse_accept_language("*,en"));
    }

    #[test]
    fn resolve_prefers_sdk_locale_header() {
        let resolved = policy().resolve(Some("zh-CN"), Some("en-US,en;q=0.9"));
        assert_eq!("zh-CN", resolved.effective());
        assert_eq!(LocaleSource::SdkLocaleHeader, resolved.source);
    }

    #[test]
    fn resolve_uses_accept_language_when_sdk_header_absent() {
        let resolved = policy().resolve(None, Some("ja-JP,en;q=0.9"));
        assert_eq!("ja-JP", resolved.effective());
        assert_eq!(LocaleSource::AcceptLanguage, resolved.source);
    }

    #[test]
    fn resolve_falls_back_to_default_for_unsupported_locales() {
        let resolved = policy().resolve(Some("xx-XX"), Some("xx;q=0.9"));
        assert_eq!(CLOUD_ROUTER_DEFAULT_LOCALE, resolved.effective());
        assert_eq!(LocaleSource::Default, resolved.source);
        assert_eq!(None, resolved.requested);
    }

    #[test]
    fn resolve_skips_zero_quality_accept_language() {
        let resolved = policy().resolve(None, Some("zh-CN;q=0"));
        assert_eq!(CLOUD_ROUTER_DEFAULT_LOCALE, resolved.effective());
    }

    #[test]
    fn interpolates_templates_with_params() {
        let params = json!({ "entity": "provider", "maxLength": 128 });
        assert_eq!(
            Some("provider was not found".to_owned()),
            interpolate_template("{{entity}} was not found", &params)
        );
        assert_eq!(
            Some("value 128".to_owned()),
            interpolate_template("value {{maxLength}}", &params)
        );
    }

    #[test]
    fn interpolation_is_incomplete_without_params() {
        assert_eq!(None, interpolate_template("{{entity}} was not found", &json!({})));
        assert_eq!(None, interpolate_template("{{entity}}", &Value::Null));
    }

    #[test]
    fn platform_problem_localization_sets_locale_but_keeps_detail() {
        let mut payload = json!({
            "type": "https://docs.sdkwork.com/problems/40003",
            "title": "Invalid parameter",
            "status": 400,
            "code": 40003,
            "traceId": "trace-1",
            "detail": "page must be greater than or equal to 1",
            "i18nKey": "errors.result.40003"
        });
        localize_problem_payload(&mut payload, "zh-CN");
        assert_eq!("zh-CN", payload["locale"].as_str().unwrap());
        assert_eq!(
            "page must be greater than or equal to 1",
            payload["detail"].as_str().unwrap()
        );
    }

    #[test]
    fn business_problem_localization_localizes_detail() {
        let catalog = business_fixture_catalog();
        let mut payload = json!({
            "type": "https://docs.sdkwork.com/problems/40401",
            "title": "Not found",
            "status": 404,
            "code": 40401,
            "traceId": "trace-2",
            "detail": "supplier was not found",
            "i18nKey": "business.admin.upstream.supplierNotFound",
            "params": { "entity": "supplier" }
        });
        localize_problem_payload_with_catalog(&mut payload, "zh-CN", &catalog);
        assert_eq!("zh-CN", payload["locale"].as_str().unwrap());
        assert_eq!("供应商不存在", payload["detail"].as_str().unwrap());
    }

    #[test]
    fn business_problem_keeps_detail_when_template_unresolved() {
        let catalog = business_fixture_catalog();
        let mut payload = json!({
            "type": "https://docs.sdkwork.com/problems/40003",
            "title": "Invalid parameter",
            "status": 400,
            "code": 40003,
            "traceId": "trace-3",
            "detail": "original safe message",
            "i18nKey": "business.test.missingParams"
        });
        localize_problem_payload_with_catalog(&mut payload, "zh-CN", &catalog);
        assert_eq!("original safe message", payload["detail"].as_str().unwrap());
    }

    /// Phase 2 business/validation keys use this same template shape; the fixture
    /// verifies the localization path end to end without touching the shared catalog.
    fn business_fixture_catalog() -> EmbeddedMessageCatalog {
        let mut catalog = EmbeddedMessageCatalog::load();
        let zh = catalog.by_locale.get_mut("zh-CN").unwrap();
        zh.insert(
            "business.admin.upstream.supplierNotFound".to_owned(),
            "供应商不存在".to_owned(),
        );
        zh.insert(
            "business.test.missingParams".to_owned(),
            "缺少参数 {{entity}}".to_owned(),
        );
        let en = catalog.by_locale.get_mut("en-US").unwrap();
        en.insert(
            "business.admin.upstream.supplierNotFound".to_owned(),
            "{{entity}} was not found".to_owned(),
        );
        en.insert(
            "business.test.missingParams".to_owned(),
            "missing param {{entity}}".to_owned(),
        );
        catalog
    }

    #[tokio::test]
    async fn middleware_injects_locale_extension_and_headers() {
        use axum::extract::Extension;
        use axum::routing::get;
        use tower::ServiceExt;

        async fn handler(Extension(locale): Extension<RequestLocale>) -> impl IntoResponse {
            (StatusCode::OK, locale.effective().to_owned())
        }

        let router = with_request_locale(Router::new().route("/locale", get(handler)));
        let response = router
            .oneshot(
                Request::builder()
                    .uri("/locale")
                    .header(header::ACCEPT_LANGUAGE, "zh-CN,en;q=0.9")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(StatusCode::OK, response.status());
        assert_eq!("zh-CN", axum::body::to_bytes(response.into_body(), 1024).await.unwrap());
    }

    #[tokio::test]
    async fn middleware_localizes_problem_responses() {
        use axum::routing::get;
        use tower::ServiceExt;

        // The middleware records the effective locale and enriches problem
        // payloads; business-key detail localization is covered by the
        // `localize_problem_payload_with_catalog` unit tests.
        async fn handler() -> impl IntoResponse {
            let body = json!({
                "type": "https://docs.sdkwork.com/problems/40401",
                "title": "Not found",
                "status": 404,
                "code": 40401,
                "traceId": "trace-4",
                "detail": "supplier was not found",
                "i18nKey": "errors.result.40401"
            });
            (
                StatusCode::NOT_FOUND,
                [("content-type", "application/problem+json")],
                body.to_string(),
            )
        }

        let router = with_request_locale(Router::new().route("/problem", get(handler)));
        let response = router
            .oneshot(
                Request::builder()
                    .uri("/problem")
                    .header(SDK_LOCALE_HEADER, "zh-CN")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(
            "zh-CN",
            response.headers().get(header::CONTENT_LANGUAGE).unwrap()
        );
        assert_eq!(
            "Accept-Language",
            response.headers().get(header::VARY).unwrap()
        );
        let bytes = axum::body::to_bytes(response.into_body(), 1024).await.unwrap();
        let payload: Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!("zh-CN", payload["locale"].as_str().unwrap());
        // Generic `errors.result.<code>` keys never replace handler detail;
        // frontends translate those keys themselves.
        assert_eq!("supplier was not found", payload["detail"].as_str().unwrap());
    }
}
