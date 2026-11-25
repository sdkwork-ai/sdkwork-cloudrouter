use serde_json::{json, Value};

pub(crate) fn supports_protocol(protocol_id: &str) -> bool {
    matches!(
        protocol_id,
        "anthropic-messages"
            | "bytedance-ark-v3"
            | "bytedance-tts-v1"
            | "google-gemini-v1beta"
            | "luma-dream-machine-v1"
            | "openai-v1"
            | "volcengine-ark-v3"
    )
}

pub(crate) fn error_body(
    protocol_id: &str,
    status: u16,
    code: &str,
    message: &str,
    request_id: &str,
) -> Option<Value> {
    match protocol_id {
        "anthropic-messages" => Some(json!({
            "type": "error",
            "error": {
                "type": anthropic_error_type(status),
                "message": message,
            },
            "request_id": request_id,
        })),
        "google-gemini-v1beta" => Some(json!({
            "error": {
                "code": status,
                "message": message,
                "status": google_rpc_status(status),
            }
        })),
        "bytedance-ark-v3" | "volcengine-ark-v3" => Some(json!({
            "error": {
                "code": code,
                "message": message,
                "type": "gateway_error",
                "request_id": request_id,
            }
        })),
        "bytedance-tts-v1" => Some(json!({
            "code": status,
            "message": message,
            "reqid": request_id,
        })),
        "luma-dream-machine-v1" => Some(json!({"detail": message})),
        "openai-v1" => Some(json!({
            "error": {
                "message": message,
                "type": openai_error_type(status),
                "param": null,
                "code": code
            }
        })),
        _ => None,
    }
}

fn anthropic_error_type(status: u16) -> &'static str {
    match status {
        400 => "invalid_request_error",
        401 => "authentication_error",
        402 => "billing_error",
        403 => "permission_error",
        404 => "not_found_error",
        409 => "conflict_error",
        413 => "request_too_large",
        429 => "rate_limit_error",
        500..=599 => "api_error",
        _ => "invalid_request_error",
    }
}

fn google_rpc_status(status: u16) -> &'static str {
    match status {
        400 => "INVALID_ARGUMENT",
        401 => "UNAUTHENTICATED",
        403 => "PERMISSION_DENIED",
        404 => "NOT_FOUND",
        429 => "RESOURCE_EXHAUSTED",
        500..=599 => "INTERNAL",
        _ => "UNKNOWN",
    }
}

fn openai_error_type(status: u16) -> &'static str {
    match status {
        400 => "invalid_request_error",
        401 => "authentication_error",
        403 => "permission_error",
        404 => "invalid_request_error",
        409 => "conflict_error",
        402 => "insufficient_quota",
        429 => "rate_limit_error",
        500..=599 => "server_error",
        _ => "invalid_request_error",
    }
}

#[cfg(test)]
mod tests {
    use super::{error_body, supports_protocol};

    #[test]
    fn maps_only_protocols_with_verified_error_contracts() {
        for protocol in [
            "openai-v1",
            "anthropic-messages",
            "google-gemini-v1beta",
            "luma-dream-machine-v1",
        ] {
            assert!(supports_protocol(protocol));
            assert!(error_body(protocol, 429, "rate_limited", "retry later", "req-1").is_some());
        }
        assert!(!supports_protocol("kling-v1"));
        assert!(error_body("kling-v1", 429, "rate_limited", "retry later", "req-1").is_none());
    }

    #[test]
    fn emits_anthropic_and_google_error_wire_shapes() {
        let anthropic = error_body(
            "anthropic-messages",
            429,
            "rate_limited",
            "retry later",
            "req-1",
        )
        .expect("Anthropic mapping");
        assert_eq!("error", anthropic["type"]);
        assert_eq!("rate_limit_error", anthropic["error"]["type"]);
        assert_eq!("req-1", anthropic["request_id"]);
        let anthropic_billing = error_body(
            "anthropic-messages",
            402,
            "insufficient_balance",
            "payment required",
            "req-1",
        )
        .expect("Anthropic billing mapping");
        assert_eq!("billing_error", anthropic_billing["error"]["type"]);

        let google = error_body(
            "google-gemini-v1beta",
            429,
            "rate_limited",
            "retry later",
            "req-1",
        )
        .expect("Gemini mapping");
        assert_eq!(429, google["error"]["code"]);
        assert_eq!("RESOURCE_EXHAUSTED", google["error"]["status"]);
        assert!(google["error"].get("details").is_none());

        for (status, expected) in [
            (401, "UNAUTHENTICATED"),
            (403, "PERMISSION_DENIED"),
            (409, "UNKNOWN"),
            (408, "UNKNOWN"),
            (413, "UNKNOWN"),
            (429, "RESOURCE_EXHAUSTED"),
            (501, "INTERNAL"),
            (503, "INTERNAL"),
            (504, "INTERNAL"),
        ] {
            let error = error_body(
                "google-gemini-v1beta",
                status,
                "gateway_error",
                "failed",
                "req-1",
            )
            .expect("Gemini mapping");
            assert_eq!(expected, error["error"]["status"]);
        }
    }

    #[test]
    fn emits_the_luma_default_error_shape() {
        let luma = error_body(
            "luma-dream-machine-v1",
            503,
            "upstream_unavailable",
            "the gateway could not reach the provider",
            "req-1",
        )
        .expect("Luma mapping");
        assert_eq!("the gateway could not reach the provider", luma["detail"]);
        assert_eq!(1, luma.as_object().expect("object error").len());
    }

    #[test]
    fn emits_the_ark_error_shape_with_a_request_id() {
        let error = error_body(
            "bytedance-ark-v3",
            503,
            "upstream_unavailable",
            "the gateway could not reach the provider",
            "req-1",
        )
        .expect("Ark mapping");
        assert_eq!("upstream_unavailable", error["error"]["code"]);
        assert_eq!("gateway_error", error["error"]["type"]);
        assert_eq!("req-1", error["error"]["request_id"]);
    }
}
