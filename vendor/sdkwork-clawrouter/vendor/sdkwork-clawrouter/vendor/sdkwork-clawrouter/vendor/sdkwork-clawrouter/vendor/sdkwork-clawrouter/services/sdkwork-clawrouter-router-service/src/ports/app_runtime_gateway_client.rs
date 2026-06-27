use std::collections::BTreeMap;

use axum::body::Body;
use axum::http::Method;
use bytes::Bytes;
use serde_json::Value;

use crate::ports::AppRuntimeFuture;

pub trait AppRuntimeGatewayClient {
    fn send<'a>(
        &'a self,
        request: AppRuntimeGatewayRequest,
    ) -> AppRuntimeFuture<'a, AppRuntimeGatewayResponse>;
}

#[derive(Debug, Clone, PartialEq)]
pub struct AppRuntimeGatewayRequest {
    pub method: Method,
    pub path: String,
    pub headers: BTreeMap<String, String>,
    pub body: Value,
    pub raw_body: Option<Bytes>,
}

impl AppRuntimeGatewayRequest {
    pub fn new(method: Method, path: impl Into<String>, body: Value) -> Self {
        Self {
            method,
            path: path.into(),
            headers: BTreeMap::new(),
            body,
            raw_body: None,
        }
    }

    pub fn with_header(mut self, name: impl Into<String>, value: impl Into<String>) -> Self {
        self.headers.insert(name.into(), value.into());
        self
    }

    pub fn with_raw_body(mut self, body: Bytes) -> Self {
        self.raw_body = Some(body);
        self
    }
}

pub struct AppRuntimeGatewayResponse {
    pub status_code: u16,
    pub content_type: Option<String>,
    pub body: Body,
}

impl AppRuntimeGatewayResponse {
    pub fn new(status_code: u16, content_type: Option<String>, body: Body) -> Self {
        Self {
            status_code,
            content_type,
            body,
        }
    }
}

impl std::fmt::Debug for AppRuntimeGatewayResponse {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AppRuntimeGatewayResponse")
            .field("status_code", &self.status_code)
            .field("content_type", &self.content_type)
            .field("body", &"[stream]")
            .finish()
    }
}
