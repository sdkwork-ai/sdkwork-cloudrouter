use axum::http::HeaderMap;

pub fn default_security_headers() -> &'static [(&'static str, &'static str)] {
    &[
        ("x-content-type-options", "nosniff"),
        ("x-frame-options", "DENY"),
        ("referrer-policy", "no-referrer"),
        ("cross-origin-resource-policy", "same-origin"),
    ]
}

/// Preserves response headers that SDK-compatible clients use for retries,
/// request tracing, and rate-limit handling. Content metadata is carried
/// separately, and hop-by-hop or unrelated upstream headers are excluded.
pub fn preserve_safe_upstream_response_headers(headers: &HeaderMap) -> HeaderMap {
    let connection_headers = headers
        .get("connection")
        .and_then(|value| value.to_str().ok())
        .into_iter()
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
            || !matches!(
                name.as_str(),
                "retry-after"
                    | "x-request-id"
                    | "request-id"
                    | "openai-organization"
                    | "openai-version"
                    | "openai-processing-ms"
                    | "x-ratelimit-limit-requests"
                    | "x-ratelimit-limit-tokens"
                    | "x-ratelimit-remaining-requests"
                    | "x-ratelimit-remaining-tokens"
                    | "x-ratelimit-reset-requests"
                    | "x-ratelimit-reset-tokens"
                    | "x-ratelimit-request-ids"
                    | "x-goog-request-id"
                    | "x-goog-ratelimit-last-update-time"
            )
        {
            continue;
        }
        preserved.append(name.clone(), value.clone());
    }
    preserved
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

        assert_eq!(Some("30"), preserved.get(header::RETRY_AFTER).and_then(|v| v.to_str().ok()));
        assert_eq!(Some("req-1"), preserved.get("x-request-id").and_then(|v| v.to_str().ok()));
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
}

pub fn redact_http_header(name: &str, value: impl AsRef<str>) -> String {
    sdkwork_cloudrouter_security::redact_header_value(name, value)
}
