use axum::http::HeaderMap;
/// Internal response marker used only between Cloud Router HTTP layers.
pub const GATEWAY_GENERATED_ERROR_HEADER: &str = "x-sdkwork-internal-gateway-error";

#[derive(Debug, Clone, Copy)]
/// Marker distinguishing gateway-created errors from upstream provider errors.
pub struct GatewayGeneratedError;

/// Marks an error response produced by the gateway itself so vendor-protocol
/// response mapping can leave upstream error bodies untouched.
pub fn mark_gateway_generated_error_response(response: &mut axum::response::Response) {
    response.extensions_mut().insert(GatewayGeneratedError);
}

/// Marks a normalized response-header map as containing a gateway-generated error.
pub fn mark_gateway_generated_error_header(headers: &mut HeaderMap) {
    headers.insert(
        GATEWAY_GENERATED_ERROR_HEADER,
        axum::http::HeaderValue::from_static("true"),
    );
}

/// Removes and reports the gateway-generated-error marker from a response-header map.
pub fn take_gateway_generated_error(headers: &mut HeaderMap) -> bool {
    headers.remove(GATEWAY_GENERATED_ERROR_HEADER).is_some()
}

/// Removes and reports the gateway-generated-error marker from an HTTP response.
pub fn take_gateway_generated_error_response(response: &mut axum::response::Response) -> bool {
    response
        .extensions_mut()
        .remove::<GatewayGeneratedError>()
        .is_some()
}

pub fn default_security_headers() -> &'static [(&'static str, &'static str)] {
    &[
        ("x-content-type-options", "nosniff"),
        ("x-frame-options", "DENY"),
        ("referrer-policy", "no-referrer"),
        ("cross-origin-resource-policy", "same-origin"),
    ]
}

/// Preserves end-to-end upstream response metadata while removing transport,
/// cookie, CORS, and Cloud Router-internal headers.
///
/// This is an allowlist, not a denylist: a relayed provider response reaches an
/// API client of the Cloud Router, so an unknown upstream header (vendor
/// internals, debug breadcrumbs) must be dropped rather than trusted. The
/// passthrough faces that must forward nearly everything keep using
/// [`is_public_upstream_response_header`].
pub fn preserve_safe_upstream_response_headers(headers: &HeaderMap) -> HeaderMap {
    let connection_headers = headers
        .get_all("connection")
        .iter()
        .filter_map(|value| value.to_str().ok())
        .flat_map(|value| value.split(','))
        .map(|name| name.trim().to_ascii_lowercase())
        .filter(|name| !name.is_empty())
        .collect::<Vec<_>>();
    let mut preserved = HeaderMap::new();
    for (name, value) in headers {
        if is_hop_by_hop_header(name)
            || connection_headers
                .iter()
                .any(|connection_name| connection_name == name.as_str())
            || !is_allowed_upstream_response_metadata(name.as_str())
        {
            continue;
        }
        preserved.append(name.clone(), value.clone());
    }
    preserved
}

fn is_allowed_upstream_response_metadata(name: &str) -> bool {
    matches!(
        name,
        "retry-after"
            | "anthropic-organization-id"
            | "x-request-id"
            | "request-id"
            | "openai-organization"
            | "openai-version"
            | "openai-processing-ms"
            | "x-should-retry"
            | "x-ratelimit-limit-requests"
            | "x-ratelimit-limit-tokens"
            | "x-ratelimit-remaining-requests"
            | "x-ratelimit-remaining-tokens"
            | "x-ratelimit-reset-requests"
            | "x-ratelimit-reset-tokens"
            | "x-ratelimit-request-ids"
            | "x-goog-request-id"
            | "x-goog-ratelimit-last-update-time"
    ) || name.starts_with("anthropic-ratelimit-")
}

/// Whether an upstream response header is safe to expose to API clients.
pub fn is_public_upstream_response_header(name: &str) -> bool {
    let name = name.to_ascii_lowercase();
    !matches!(
        name.as_str(),
        "content-length"
            | "content-encoding"
            | "content-type"
            | "set-cookie"
            | "transfer-encoding"
            | "access-control-allow-origin"
            | "access-control-allow-credentials"
            | "access-control-expose-headers"
            | "access-control-max-age"
            | "access-control-allow-methods"
            | "access-control-allow-headers"
    ) && !name.starts_with("access-control-")
        && !name.starts_with("x-sdkwork-")
        && name != GATEWAY_GENERATED_ERROR_HEADER
}

fn is_hop_by_hop_header(name: &axum::http::HeaderName) -> bool {
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

/// Converts vendor-adapter response headers into the safe end-to-end metadata
/// set used by direct HTTP provider relays.
pub fn preserve_adapter_response_headers(
    headers: &std::collections::BTreeMap<String, String>,
) -> HeaderMap {
    let mut source = HeaderMap::new();
    for (name, value) in headers {
        let (Ok(name), Ok(value)) = (
            axum::http::HeaderName::from_bytes(name.as_bytes()),
            axum::http::HeaderValue::from_str(value),
        ) else {
            continue;
        };
        source.append(name, value);
    }
    preserve_safe_upstream_response_headers(&source)
}

#[cfg(test)]
mod tests {
    use axum::http::{header, HeaderMap, HeaderValue};

    use super::preserve_safe_upstream_response_headers;

    #[test]
    fn preserves_sdk_response_metadata_and_filters_unsafe_headers() {
        let mut headers = HeaderMap::new();
        headers.insert(header::RETRY_AFTER, HeaderValue::from_static("30"));
        headers.insert("x-request-id", HeaderValue::from_static("req-1"));
        headers.insert(
            "x-ratelimit-remaining-tokens",
            HeaderValue::from_static("123"),
        );
        headers.insert(header::CONTENT_TYPE, HeaderValue::from_static("text/plain"));
        headers.insert(header::CONNECTION, HeaderValue::from_static("keep-alive"));
        headers.insert("set-cookie", HeaderValue::from_static("session=secret"));

        let preserved = preserve_safe_upstream_response_headers(&headers);

        assert_eq!(
            Some("30"),
            preserved
                .get(header::RETRY_AFTER)
                .and_then(|v| v.to_str().ok())
        );
        assert_eq!(
            Some("req-1"),
            preserved.get("x-request-id").and_then(|v| v.to_str().ok())
        );
        assert_eq!(
            Some("123"),
            preserved
                .get("x-ratelimit-remaining-tokens")
                .and_then(|v| v.to_str().ok())
        );
        assert!(!preserved.contains_key(header::CONTENT_TYPE));
        assert!(!preserved.contains_key(header::CONNECTION));
        assert!(!preserved.contains_key("set-cookie"));
    }

    #[test]
    fn connection_named_headers_are_removed_from_http_responses() {
        let mut headers = HeaderMap::new();
        headers.append("connection", "x-hop-secret".parse().unwrap());
        headers.append("connection", "x-second-hop".parse().unwrap());
        headers.insert("x-hop-secret", "value".parse().unwrap());
        headers.insert("x-second-hop", "value".parse().unwrap());
        headers.insert("x-request-id", "request-1".parse().unwrap());
        let preserved = preserve_safe_upstream_response_headers(&headers);
        assert!(preserved.get("x-hop-secret").is_none());
        assert!(preserved.get("x-second-hop").is_none());
        assert_eq!("request-1", preserved.get("x-request-id").unwrap());
    }

    #[test]
    fn preserves_vendor_metadata_and_filters_platform_headers() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "anthropic-ratelimit-requests-reset",
            "2026-01-01T00:00:00Z".parse().unwrap(),
        );
        headers.insert("x-provider-new-metadata", "provider-value".parse().unwrap());
        headers.insert("x-should-retry", "true".parse().unwrap());
        headers.insert("x-sdkwork-internal-tenant-id", "tenant-1".parse().unwrap());
        headers.insert("access-control-allow-origin", "*".parse().unwrap());
        headers.insert("set-cookie", "session=secret".parse().unwrap());

        let preserved = preserve_safe_upstream_response_headers(&headers);

        assert_eq!(
            "2026-01-01T00:00:00Z",
            preserved.get("anthropic-ratelimit-requests-reset").unwrap()
        );
        assert_eq!("true", preserved.get("x-should-retry").unwrap());
        assert!(!preserved.contains_key("x-provider-new-metadata"));
        assert!(!preserved.contains_key("x-sdkwork-internal-tenant-id"));
        assert!(!preserved.contains_key("access-control-allow-origin"));
        assert!(!preserved.contains_key("set-cookie"));
    }

    #[test]
    fn repeated_safe_upstream_metadata_values_are_preserved() {
        let mut headers = HeaderMap::new();
        headers.append("x-request-id", "request-1".parse().unwrap());
        headers.append("x-request-id", "request-2".parse().unwrap());

        let preserved = preserve_safe_upstream_response_headers(&headers);
        let request_ids = preserved
            .get_all("x-request-id")
            .iter()
            .map(|value| value.to_str().unwrap())
            .collect::<Vec<_>>();

        assert_eq!(vec!["request-1", "request-2"], request_ids);
    }
}

pub fn redact_http_header(name: &str, value: impl AsRef<str>) -> String {
    sdkwork_cloudrouter_security::redact_header_value(name, value)
}
