pub const REDACTED: &str = "[REDACTED]";

pub fn redact_secret(value: impl AsRef<str>) -> String {
    let value = value.as_ref();
    if value.len() <= 8 {
        return REDACTED.to_string();
    }

    let prefix: String = value.chars().take(4).collect();
    let suffix: String = value
        .chars()
        .rev()
        .take(4)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect();
    format!("{prefix}...{REDACTED}...{suffix}")
}

/// Redact a URL to expose only its origin (scheme + host + port).
///
/// Drops userinfo, path, query, and fragment from the URL so that logs
/// never leak credentials or sensitive path segments. Returns `[REDACTED]`
/// when the URL is empty or cannot be parsed into a scheme + host.
///
/// Examples:
/// - `https://user:pass@api.openai.com/v1/chat?key=secret` -> `https://api.openai.com`
/// - `https://api.openai.com:8443/v1` -> `https://api.openai.com:8443`
pub fn redact_url(url: impl AsRef<str>) -> String {
    let url = url.as_ref().trim();
    if url.is_empty() {
        return REDACTED.to_string();
    }
    let scheme_sep = match url.find("://") {
        Some(pos) if pos > 0 => pos,
        _ => return REDACTED.to_string(),
    };
    let scheme = &url[..scheme_sep];
    if scheme.is_empty() || !scheme.chars().all(|c| c.is_ascii_alphanumeric()) {
        return REDACTED.to_string();
    }
    let after_scheme = &url[scheme_sep + 3..];
    let auth_end = after_scheme
        .find(|c: char| c == '/' || c == '?' || c == '#')
        .unwrap_or(after_scheme.len());
    let authority = &after_scheme[..auth_end];
    let host_part = match authority.rfind('@') {
        Some(pos) => &authority[pos + 1..],
        None => authority,
    };
    if host_part.is_empty() {
        return REDACTED.to_string();
    }
    format!("{scheme}://{host_part}")
}

/// Redact sensitive data (such as embedded URLs) from an error message.
///
/// Scans the error's Display representation for `http://` or `https://`
/// URL substrings and replaces each with its redacted form via [`redact_url`].
/// Non-URL text is preserved unchanged so diagnostic context remains useful.
pub fn redact_error_message(error: impl std::fmt::Display) -> String {
    let message = error.to_string();
    redact_urls_in_text(&message)
}

fn redact_urls_in_text(text: &str) -> String {
    let mut result = String::with_capacity(text.len());
    let mut remaining = text;
    while let Some(pos) = find_url_start(remaining) {
        result.push_str(&remaining[..pos]);
        let url_segment = &remaining[pos..];
        let url_end = url_segment
            .find(is_url_terminator)
            .unwrap_or(url_segment.len());
        result.push_str(&redact_url(&url_segment[..url_end]));
        remaining = &url_segment[url_end..];
    }
    result.push_str(remaining);
    result
}

fn find_url_start(text: &str) -> Option<usize> {
    let http_pos = text.find("http://");
    let https_pos = text.find("https://");
    match (http_pos, https_pos) {
        (Some(a), Some(b)) => Some(a.min(b)),
        (Some(a), None) | (None, Some(a)) => Some(a),
        (None, None) => None,
    }
}

fn is_url_terminator(c: char) -> bool {
    c.is_whitespace()
        || matches!(
            c,
            '"' | '\'' | '(' | ')' | '[' | ']' | '{' | '}' | '<' | '>' | '`'
        )
}
