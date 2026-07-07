#[test]
fn sensitive_headers_are_matched_case_insensitively() {
    assert!(sdkwork_claw_security::is_sensitive_header("Authorization"));
    assert!(sdkwork_claw_security::is_sensitive_header("Access-Token"));
    assert!(sdkwork_claw_security::is_sensitive_header("X-API-Key"));
    assert!(sdkwork_claw_security::is_sensitive_header("set-cookie"));
    assert!(!sdkwork_claw_security::is_sensitive_header("x-request-id"));
}

#[test]
fn secrets_are_redacted_without_exposing_full_values() {
    assert_eq!("[REDACTED]", sdkwork_claw_security::redact_secret(""));
    assert_eq!("[REDACTED]", sdkwork_claw_security::redact_secret("short"));
    assert_eq!(
        "sk-p...[REDACTED]...7890",
        sdkwork_claw_security::redact_secret("sk-prod-1234567890")
    );
}

#[test]
fn sensitive_header_values_are_redacted() {
    assert_eq!(
        "[REDACTED]",
        sdkwork_claw_security::redact_header_value("authorization", "Bearer abc")
    );
    assert_eq!(
        "public",
        sdkwork_claw_security::redact_header_value("x-request-id", "public")
    );
}

#[test]
fn redact_url_keeps_only_scheme_and_host() {
    assert_eq!(
        "https://api.openai.com",
        sdkwork_claw_security::redact_url("https://api.openai.com/v1/chat/completions")
    );
    assert_eq!(
        "https://api.openai.com",
        sdkwork_claw_security::redact_url("https://api.openai.com/v1/chat?key=sk-secret")
    );
}

#[test]
fn redact_url_strips_userinfo() {
    assert_eq!(
        "https://api.openai.com",
        sdkwork_claw_security::redact_url("https://user:pass@api.openai.com/v1")
    );
    assert_eq!(
        "https://api.openai.com",
        sdkwork_claw_security::redact_url("https://token@api.openai.com/v1?key=secret")
    );
}

#[test]
fn redact_url_preserves_port() {
    assert_eq!(
        "https://api.openai.com:8443",
        sdkwork_claw_security::redact_url("https://api.openai.com:8443/v1/chat")
    );
}

#[test]
fn redact_url_redacts_empty_and_invalid_input() {
    assert_eq!("[REDACTED]", sdkwork_claw_security::redact_url(""));
    assert_eq!("[REDACTED]", sdkwork_claw_security::redact_url("not a url"));
    assert_eq!(
        "[REDACTED]",
        sdkwork_claw_security::redact_url("://missing-scheme")
    );
    assert_eq!("[REDACTED]", sdkwork_claw_security::redact_url("https://"));
}

#[test]
fn redact_error_message_redacts_embedded_urls() {
    let message = "upstream call to https://user:secret@api.openai.com/v1/chat failed";
    let redacted = sdkwork_claw_security::redact_error_message(message);
    assert!(!redacted.contains("secret"));
    assert!(!redacted.contains("user:secret"));
    assert!(redacted.contains("https://api.openai.com"));
    assert!(redacted.contains("upstream call to"));
    assert!(redacted.contains("failed"));
}

#[test]
fn redact_error_message_preserves_non_url_text() {
    let message = "database connection failed: timeout";
    let redacted = sdkwork_claw_security::redact_error_message(message);
    assert_eq!(message, redacted);
}

#[test]
fn redact_error_message_redacts_multiple_urls() {
    let message = "see https://a.com/path and http://b.com:8080/x";
    let redacted = sdkwork_claw_security::redact_error_message(message);
    assert!(redacted.contains("https://a.com"));
    assert!(redacted.contains("http://b.com:8080"));
    assert!(!redacted.contains("/path"));
    assert!(!redacted.contains("/x"));
}
