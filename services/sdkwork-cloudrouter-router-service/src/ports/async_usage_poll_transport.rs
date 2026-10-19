use std::future::Future;
use std::pin::Pin;

use crate::domain::{DomainResult, ProviderAuthProfile};

/// One authenticated read against the upstream task's status endpoint.
///
/// The request owns everything the transport needs, so a host implementation
/// cannot resolve a caller-supplied target: the account identity, base URL and
/// auth profile always come from the account that created the task.
#[derive(Debug, Clone)]
pub struct AsyncPollRequest {
    pub supplier_code: String,
    pub account_id: i64,
    pub region_code: String,
    pub base_url: Option<String>,
    pub auth_profile: ProviderAuthProfile,
    pub timeout_ms: Option<u64>,
    /// The account's secret reference, when the account is credentialed.
    pub secret_ref: Option<String>,
    /// Resolved credential value for the account's `secret_ref`, when one
    /// exists.
    pub secret: Option<String>,
    /// The pollable path stored on the task (`metadata.pollPath`).
    pub path: String,
}

/// Normalized upstream read result.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AsyncPollResponse {
    pub status_code: u16,
    pub body: Option<serde_json::Value>,
    /// Raw response bytes. JSON responses also populate `body`; a batch result
    /// file (`application/jsonl` / `text/plain`) is not one JSON document, so
    /// reconciliation reads it from here.
    pub body_bytes: Option<Vec<u8>>,
}

pub type AsyncPollFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<AsyncPollResponse>> + Send + 'a>>;

/// Outbound transport used by the async usage executor.
///
/// Keeping HTTP behind a port lets the reconciliation logic (status
/// interpretation, settle vs. reschedule) be tested without a network, and lets
/// the host reuse its existing outbound policy, proxy, TLS, timeout and
/// response-size limits instead of opening a second HTTP path with different
/// security properties.
pub trait AsyncUsagePollTransport: Send + Sync {
    fn get(&self, request: AsyncPollRequest) -> AsyncPollFuture<'_>;
}
