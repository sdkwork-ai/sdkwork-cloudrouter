//! Auth-token channel for open-api chat completions routes.
//!
//! A single `Authorization: Bearer` credential that is not an API key
//! (non `sk-`/`sp-` prefixed) is resolved into an upstream account route
//! context through [`OpenAiAuthTokenAuthenticator`], so chat requests can
//! authenticate with an SDKWork login auth token instead of a gateway API
//! key. Implementations are injected by the gateway assembly (IAM-backed),
//! keeping this router crate stateless and testable.

use async_trait::async_trait;
use axum::response::Response;

use crate::application::AuthenticatedApiKeyContext;

/// Error type for the auth-token channel (an HTTP response to return).
pub type OpenAiAuthTokenError = Box<Response>;

/// Resolves an SDKWork auth token into the account route context used by the
/// chat completions pipeline (tenant/org/user + default upstream account group).
#[async_trait]
pub trait OpenAiAuthTokenAuthenticator: Send + Sync + 'static {
    async fn authenticate(
        &self,
        raw_bearer_token: &str,
    ) -> Result<AuthenticatedApiKeyContext, OpenAiAuthTokenError>;
}
