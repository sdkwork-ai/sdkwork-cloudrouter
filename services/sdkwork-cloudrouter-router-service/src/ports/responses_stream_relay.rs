use std::future::Future;
use std::pin::Pin;

use axum::body::Body;

use crate::domain::DomainResult;
use crate::ports::ResponsesRelayRequest;

pub type ResponsesStreamRelayFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<ResponsesStreamRelayResponse>> + Send + 'a>>;

/// Streams a provider-native OpenAI Responses API call to the upstream
/// provider and exposes the raw upstream byte stream (SSE) to the caller.
///
/// Symmetric with [`crate::ports::ChatCompletionStreamRelay`]: usage
/// accounting and SSE framing stay in the API layer, which wraps the returned
/// body with the streaming usage recorder before it reaches the client.
pub trait ResponsesStreamRelay {
    fn create_response_stream<'a>(
        &'a self,
        request: ResponsesRelayRequest,
    ) -> ResponsesStreamRelayFuture<'a>;
}

pub struct ResponsesStreamRelayResponse {
    pub status_code: u16,
    pub content_type: Option<String>,
    pub body: Body,
}

impl ResponsesStreamRelayResponse {
    pub fn new(status_code: u16, content_type: Option<String>, body: Body) -> Self {
        Self {
            status_code,
            content_type,
            body,
        }
    }
}

impl std::fmt::Debug for ResponsesStreamRelayResponse {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ResponsesStreamRelayResponse")
            .field("status_code", &self.status_code)
            .field("content_type", &self.content_type)
            .field("body", &"[stream]")
            .finish()
    }
}
