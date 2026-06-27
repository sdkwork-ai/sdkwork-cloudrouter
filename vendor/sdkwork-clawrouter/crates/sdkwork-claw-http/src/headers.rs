pub fn default_security_headers() -> &'static [(&'static str, &'static str)] {
    &[
        ("x-content-type-options", "nosniff"),
        ("x-frame-options", "DENY"),
        ("referrer-policy", "no-referrer"),
        ("cross-origin-resource-policy", "same-origin"),
    ]
}

pub fn redact_http_header(name: &str, value: impl AsRef<str>) -> String {
    sdkwork_claw_security::redact_header_value(name, value)
}
