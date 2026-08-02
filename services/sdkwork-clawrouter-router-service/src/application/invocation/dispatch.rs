use std::fmt::{Debug, Formatter};
use std::sync::Mutex;

use axum::body::Body;
use axum::http::{HeaderMap, HeaderName, Method};
use sdkwork_claw_provider_adapter_contract::AdapterInvocationShape;
use serde_json::Value;

pub type InvocationResponseMemoryGuard = crate::ports::ProviderResponseMemoryGuard;

#[derive(Clone, PartialEq, Eq)]
pub struct InvocationAdapterTarget {
    pub supplier_code: String,
    pub endpoint_key: String,
    pub base_url: String,
    pub path_template: String,
    pub standard_path: String,
    pub gateway_token: Option<String>,
    pub shape: InvocationShape,
    pub adapter_invocation_shape: AdapterInvocationShape,
}

impl Debug for InvocationAdapterTarget {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("InvocationAdapterTarget")
            .field("supplier_code", &self.supplier_code)
            .field("endpoint_key", &self.endpoint_key)
            .field("base_url", &self.base_url)
            .field("path_template", &self.path_template)
            .field("standard_path", &self.standard_path)
            .field(
                "gateway_token",
                &self.gateway_token.as_ref().map(|_| "<redacted>"),
            )
            .field("shape", &self.shape)
            .field("adapter_invocation_shape", &self.adapter_invocation_shape)
            .finish()
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DispatchMode {
    DirectOpenAiRelay,
    DirectHttpPassthrough,
    InternalProviderAdapter,
    SyntheticLocalResponse,
    NoopFree,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InvocationShape {
    Json,
    SseStream,
    ByteStream,
    Empty,
}

#[derive(Debug)]
pub struct InvocationDispatchResponse {
    pub status_code: u16,
    pub body: Option<Value>,
    pub body_bytes: Option<Vec<u8>>,
    pub content_type: Option<String>,
    /// Streaming response body for SSE/streaming requests.
    /// Wrapped in Mutex for Sync safety. Clone creates a new empty Mutex.
    pub stream_body: Mutex<Option<Body>>,
    /// Opaque process-memory reservation retained through HTTP body delivery.
    pub memory_guard: Option<InvocationResponseMemoryGuard>,
}

impl Clone for InvocationDispatchResponse {
    fn clone(&self) -> Self {
        Self {
            status_code: self.status_code,
            body: self.body.clone(),
            body_bytes: self.body_bytes.clone(),
            content_type: self.content_type.clone(),
            stream_body: Mutex::new(None),
            memory_guard: self.memory_guard.clone(),
        }
    }
}

impl PartialEq for InvocationDispatchResponse {
    fn eq(&self, other: &Self) -> bool {
        self.status_code == other.status_code
            && self.body == other.body
            && self.body_bytes == other.body_bytes
            && self.content_type == other.content_type
    }
}

impl InvocationDispatchResponse {
    pub fn json(status_code: u16, body: Value) -> Self {
        Self {
            status_code,
            body: Some(body),
            body_bytes: None,
            content_type: Some("application/json".to_owned()),
            stream_body: Mutex::new(None),
            memory_guard: None,
        }
    }

    pub fn bytes(status_code: u16, body: impl Into<Vec<u8>>, content_type: Option<String>) -> Self {
        Self {
            status_code,
            body: None,
            body_bytes: Some(body.into()),
            content_type,
            stream_body: Mutex::new(None),
            memory_guard: None,
        }
    }

    pub fn empty(status_code: u16) -> Self {
        Self {
            status_code,
            body: None,
            body_bytes: None,
            content_type: None,
            stream_body: Mutex::new(None),
            memory_guard: None,
        }
    }

    /// Create a streaming response with the given status, content type, and body.
    pub fn streaming(status_code: u16, content_type: Option<String>, body: Body) -> Self {
        Self {
            status_code,
            body: None,
            body_bytes: None,
            content_type,
            stream_body: Mutex::new(Some(body)),
            memory_guard: None,
        }
    }

    pub fn with_memory_guard(mut self, memory_guard: InvocationResponseMemoryGuard) -> Self {
        self.memory_guard = Some(memory_guard);
        self
    }

    /// Take the stream body out, if present.
    pub fn take_stream_body(&self) -> Option<Body> {
        self.stream_body.lock().ok()?.take()
    }

    pub fn is_success(&self) -> bool {
        (200..300).contains(&self.status_code)
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct InvocationDispatch {
    pub mode: DispatchMode,
    pub invocation_shape: InvocationShape,
    pub adapter_target: Option<InvocationAdapterTarget>,
    pub resolved_secret: Option<ResolvedProviderSecret>,
    pub provider_request: Option<InvocationProviderRequest>,
    pub response: Option<InvocationDispatchResponse>,
}

#[derive(Clone, PartialEq, Eq)]
pub struct ResolvedProviderSecret {
    pub secret_ref: String,
    pub value: String,
}

#[derive(Clone, PartialEq)]
pub struct InvocationProviderRequest {
    pub method: Method,
    pub url: Option<String>,
    pub path: String,
    pub query: Option<String>,
    pub headers: HeaderMap,
    pub body: super::InvocationBody,
}

impl Debug for ResolvedProviderSecret {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("ResolvedProviderSecret")
            .field("secret_ref", &self.secret_ref)
            .field("value", &"<redacted>")
            .finish()
    }
}

impl Debug for InvocationProviderRequest {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("InvocationProviderRequest")
            .field("method", &self.method)
            .field("url", &self.url.as_deref().map(redacted_url))
            .field("path", &self.path)
            .field("query", &self.query.as_deref().map(redacted_query))
            .field("headers", &redacted_headers(&self.headers))
            .field("body", &body_debug_label(&self.body))
            .finish()
    }
}

fn redacted_headers(headers: &HeaderMap) -> Vec<(String, String)> {
    headers
        .iter()
        .map(|(name, value)| {
            let value = if sensitive_header_name(name) {
                "<redacted>".to_owned()
            } else {
                value
                    .to_str()
                    .map(redact_secret_text)
                    .unwrap_or("<non-utf8>".to_owned())
            };
            (name.as_str().to_owned(), value)
        })
        .collect()
}

fn sensitive_header_name(name: &HeaderName) -> bool {
    matches!(
        name.as_str(),
        "authorization"
            | "proxy-authorization"
            | "x-api-key"
            | "x-goog-api-key"
            | "api-key"
            | "access-token"
    )
}

fn redacted_url(value: &str) -> String {
    let Some((path, query)) = value.split_once('?') else {
        return redact_secret_text(value);
    };
    format!("{path}?{}", redacted_query(query))
}

fn redacted_query(value: &str) -> String {
    value
        .split('&')
        .map(|part| {
            part.split_once('=')
                .map(|(name, value)| {
                    if sensitive_query_name(name) {
                        format!("{name}=<redacted>")
                    } else {
                        format!("{name}={}", redact_secret_text(value))
                    }
                })
                .unwrap_or_else(|| redact_secret_text(part))
        })
        .collect::<Vec<_>>()
        .join("&")
}

fn sensitive_query_name(name: &str) -> bool {
    matches!(
        name.trim().to_ascii_lowercase().as_str(),
        "api_key" | "apikey" | "key" | "access_token" | "token"
    )
}

fn body_debug_label(body: &super::InvocationBody) -> &'static str {
    match body {
        super::InvocationBody::Empty => "empty",
        super::InvocationBody::Json(_) => "json",
        super::InvocationBody::Bytes(_) => "bytes",
    }
}

fn redact_secret_text(value: &str) -> String {
    value.replace("sk-", "sk-***")
}

impl InvocationDispatch {
    pub fn pending() -> Self {
        Self {
            mode: DispatchMode::DirectHttpPassthrough,
            invocation_shape: InvocationShape::Json,
            adapter_target: None,
            resolved_secret: None,
            provider_request: None,
            response: None,
        }
    }

    pub fn sse_stream() -> Self {
        Self {
            mode: DispatchMode::DirectHttpPassthrough,
            invocation_shape: InvocationShape::SseStream,
            adapter_target: None,
            resolved_secret: None,
            provider_request: None,
            response: None,
        }
    }

    pub fn json_response(status_code: u16, body: Value) -> Self {
        Self {
            mode: DispatchMode::DirectHttpPassthrough,
            invocation_shape: InvocationShape::Json,
            adapter_target: None,
            resolved_secret: None,
            provider_request: None,
            response: Some(InvocationDispatchResponse::json(status_code, body)),
        }
    }
}
