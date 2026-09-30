//! Single authority for the admin/app command-build error plumbing.
//!
//! Every admin/app API module converts a request into a command and can fail in
//! exactly two ways: the caller supplied something invalid ([`BadRequest`]), or
//! an internal dependency failed ([`System`]). All modules previously declared a
//! private `*CommandBuildError` enum with those two variants plus matching
//! `request_id_error` / `command_build_error_response` converters — twelve
//! byte-identical copies. This module collapses them into one type with the
//! shared conversions so the surface stays uniform and the modules only supply
//! their own context string.
//!
//! [`BadRequest`]: ApiCommandError::BadRequest
//! [`System`]: ApiCommandError::System

use axum::response::{IntoResponse, Response};

use crate::api::request_id::RequestIdError;
use crate::api::response::{bad_request, problem_from_wire_code};
use crate::domain::DomainError;

/// A command-build failure shared by every admin/app API module.
#[derive(Debug)]
pub enum ApiCommandError {
    /// The caller supplied an invalid value; reported as HTTP 400.
    BadRequest(String),
    /// An internal dependency failed; reported as HTTP 500 with the caller's
    /// context string so operators can locate the failing surface.
    System(DomainError),
}

/// Lifts a request-id failure onto the command-build error.
///
/// An invalid request id is a caller problem ([`ApiCommandError::BadRequest`]);
/// a generator failure is internal ([`ApiCommandError::System`]).
pub fn command_error_from_request_id(error: RequestIdError) -> ApiCommandError {
    match error {
        RequestIdError::Invalid(message) => ApiCommandError::BadRequest(message),
        RequestIdError::System(message) => ApiCommandError::System(DomainError::new(message)),
    }
}

/// Renders a command-build failure as its wire response.
///
/// `context` names the failing surface and is only used for the internal (500)
/// branch, so each module passes its own stable label.
pub fn command_error_response(error: ApiCommandError, context: &str) -> Response {
    match error {
        ApiCommandError::BadRequest(message) => bad_request(message),
        ApiCommandError::System(error) => {
            problem_from_wire_code("5000", format!("{context}: {error}")).into_response()
        }
    }
}

/// Renders an internal dependency failure as the standard 500 problem response.
///
/// Single authority for the `"{context}: {error}"` system-error mapping used by
/// every admin/app module.
pub fn system_error_response(context: &str, error: DomainError) -> Response {
    problem_from_wire_code("5000", format!("{context}: {error}")).into_response()
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::to_bytes;
    use axum::http::StatusCode;

    async fn body_json(response: Response) -> serde_json::Value {
        let (parts, body) = response.into_parts();
        assert_eq!(StatusCode::BAD_REQUEST, parts.status);
        let bytes = to_bytes(body, usize::MAX).await.expect("body");
        serde_json::from_slice(&bytes).expect("json")
    }

    /// The BadRequest branch must keep emitting the `4001` wire code (which maps
    /// to platform `40001`) so the admin/app surfaces stay uniform after the
    /// per-module enums were removed.
    #[tokio::test]
    async fn bad_request_branch_emits_the_shared_wire_code() {
        let response = command_error_response(
            ApiCommandError::BadRequest("name is required".to_owned()),
            "announcement command is invalid",
        );
        let payload = body_json(response).await;
        assert_eq!(Some(40001), payload["code"].as_i64());
        assert_eq!(Some("name is required"), payload["detail"].as_str());
        assert_eq!(Some("Validation failed"), payload["title"].as_str());
        assert_eq!(Some("validation.common.field.required"), payload["i18nKey"].as_str());
    }

    /// The System branch must emit the `5000` wire code (platform `50001`) and
    /// keep the internal detail out of the client-visible payload.
    #[tokio::test]
    async fn system_branch_emits_the_system_wire_code_with_context() {
        let response = command_error_response(
            ApiCommandError::System(DomainError::new("store offline")),
            "pricing command is invalid",
        );
        let (parts, body) = response.into_parts();
        assert_eq!(StatusCode::INTERNAL_SERVER_ERROR, parts.status);
        let bytes = to_bytes(body, usize::MAX).await.expect("body");
        let payload: serde_json::Value = serde_json::from_slice(&bytes).expect("json");
        assert_eq!(Some(50001), payload["code"].as_i64());
        // 500 responses are redacted: the raw driver/context detail must not leak.
        let detail = payload["detail"].as_str().unwrap_or_default();
        assert!(!detail.contains("store offline"), "internal detail leaked: {detail}");
        assert!(!detail.contains("pricing command is invalid"), "context leaked: {detail}");
    }

    /// A request-id failure is classified as BadRequest, not System.
    #[tokio::test]
    async fn invalid_request_id_maps_to_bad_request() {
        let error = command_error_from_request_id(RequestIdError::Invalid("bad id".to_owned()));
        assert!(matches!(error, ApiCommandError::BadRequest(_)));
    }
}
