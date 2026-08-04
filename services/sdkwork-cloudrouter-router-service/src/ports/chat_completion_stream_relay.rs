use std::future::Future;
use std::pin::Pin;

use axum::body::Body;
use serde_json::{Map, Value};

use crate::domain::{DomainError, DomainResult};
use crate::ports::ChatCompletionRelayRequest;

pub(crate) fn require_stream_usage(mut request_body: Value) -> DomainResult<Value> {
    let object = request_body
        .as_object_mut()
        .ok_or_else(|| DomainError::new("chat stream request body must be a JSON object"))?;
    let stream_options = object
        .entry("stream_options".to_owned())
        .or_insert_with(|| Value::Object(Map::new()));
    let stream_options = stream_options.as_object_mut().ok_or_else(|| {
        DomainError::new("chat stream request stream_options must be a JSON object")
    })?;
    stream_options.insert("include_usage".to_owned(), Value::Bool(true));
    Ok(request_body)
}

pub type ChatCompletionStreamRelayFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<ChatCompletionStreamRelayResponse>> + Send + 'a>>;

pub trait ChatCompletionStreamRelay {
    fn create_chat_completion_stream<'a>(
        &'a self,
        request: ChatCompletionRelayRequest,
    ) -> ChatCompletionStreamRelayFuture<'a>;
}

pub struct ChatCompletionStreamRelayResponse {
    pub status_code: u16,
    pub content_type: Option<String>,
    pub body: Body,
}

impl ChatCompletionStreamRelayResponse {
    pub fn new(status_code: u16, content_type: Option<String>, body: Body) -> Self {
        Self {
            status_code,
            content_type,
            body,
        }
    }
}

impl std::fmt::Debug for ChatCompletionStreamRelayResponse {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ChatCompletionStreamRelayResponse")
            .field("status_code", &self.status_code)
            .field("content_type", &self.content_type)
            .field("body", &"[stream]")
            .finish()
    }
}
