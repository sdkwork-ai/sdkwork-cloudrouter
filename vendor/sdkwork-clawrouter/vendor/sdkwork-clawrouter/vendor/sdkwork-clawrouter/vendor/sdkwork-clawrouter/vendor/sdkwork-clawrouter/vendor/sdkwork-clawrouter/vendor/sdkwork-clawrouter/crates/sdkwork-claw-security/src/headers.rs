use crate::redaction::REDACTED;

const SENSITIVE_HEADERS: &[&str] = &[
    "authorization",
    "access-token",
    "x-access-token",
    "x-api-key",
    "x-goog-api-key",
    "x-sdkwork-api-key-id",
    "api-key",
    "cookie",
    "set-cookie",
    "proxy-authorization",
];

pub fn is_sensitive_header(name: &str) -> bool {
    let normalized = name.trim().to_ascii_lowercase();
    SENSITIVE_HEADERS
        .iter()
        .any(|candidate| *candidate == normalized)
}

pub fn redact_header_value(name: &str, value: impl AsRef<str>) -> String {
    if is_sensitive_header(name) {
        REDACTED.to_string()
    } else {
        value.as_ref().to_string()
    }
}
