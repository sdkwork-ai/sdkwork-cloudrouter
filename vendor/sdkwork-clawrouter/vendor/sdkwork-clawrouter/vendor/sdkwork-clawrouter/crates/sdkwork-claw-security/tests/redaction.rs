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
