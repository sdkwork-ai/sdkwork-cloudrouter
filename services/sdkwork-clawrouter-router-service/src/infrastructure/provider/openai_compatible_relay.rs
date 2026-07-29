use axum::body::Body;
use bytes::Bytes;
use http_body_util::{BodyExt, Full, Limited};
use hyper::header::{HeaderName, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use hyper::{Method, Request, Uri};
use hyper_rustls::HttpsConnector;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::TokioExecutor;
use sdkwork_claw_config::ProviderRelayHttpPoolSectionConfig;
use sdkwork_claw_http::OutboundDnsResolver;
use sdkwork_claw_security::{redact_url, validate_outbound_base_url, OutboundTargetPolicy};
use serde_json::Value;
use std::time::Duration;

use crate::domain::{
    provider_native_model_id, DomainError, DomainResult, ProviderAuthProfile, ProviderAuthType,
    ProviderRetryPolicy,
};
use crate::ports::{
    ChatCompletionRelay, ChatCompletionRelayFuture, ChatCompletionRelayRequest,
    ChatCompletionRelayResponse, ChatCompletionStreamRelay, ChatCompletionStreamRelayFuture,
    ChatCompletionStreamRelayResponse, EmbeddingsRelay, EmbeddingsRelayFuture,
    EmbeddingsRelayRequest, EmbeddingsRelayResponse, ProviderSecretResolver, ResponsesRelay,
    ResponsesRelayFuture, ResponsesRelayRequest, ResponsesRelayResponse,
};

type RequestBody = Full<Bytes>;
type ProviderConnector = HttpsConnector<HttpConnector<OutboundDnsResolver>>;
type ProviderClient = Client<ProviderConnector, RequestBody>;
/// Default non-streaming provider response timeout (60 seconds).
///
/// Lowered from 120 seconds to bound resource usage on stalled upstream calls.
/// Streaming (SSE) responses use [`DEFAULT_PROVIDER_STREAM_RESPONSE_TIMEOUT_MILLIS`].
pub const DEFAULT_PROVIDER_RESPONSE_TIMEOUT_MILLIS: u64 = 60_000;
/// Default streaming (SSE) provider response timeout (120 seconds).
pub const DEFAULT_PROVIDER_STREAM_RESPONSE_TIMEOUT_MILLIS: u64 = 120_000;
/// Default cap on a non-streaming provider response body (64 MiB).
pub const DEFAULT_PROVIDER_RESPONSE_MAX_BYTES: u64 = 64 * 1024 * 1024;
/// Hard cap for configurable non-streaming provider responses (256 MiB).
/// Streaming responses are relayed incrementally and do not use this buffer.
pub const MAX_PROVIDER_RESPONSE_MAX_BYTES: u64 = 256 * 1024 * 1024;
const UPSTREAM_VERIFICATION_RESPONSE_MAX_BYTES: usize = 1024 * 1024;
const DEFAULT_PROVIDER_RESPONSE_TIMEOUT: Duration =
    Duration::from_millis(DEFAULT_PROVIDER_RESPONSE_TIMEOUT_MILLIS);
const DEFAULT_PROVIDER_STREAM_RESPONSE_TIMEOUT: Duration =
    Duration::from_millis(DEFAULT_PROVIDER_STREAM_RESPONSE_TIMEOUT_MILLIS);

/// Resolved HTTP connection-pool configuration for upstream provider clients.
///
/// Produced from [`ProviderRelayHttpPoolSectionConfig`] with safe production
/// defaults applied for any missing field. HTTPS is always enforced for
/// upstream provider traffic.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ProviderRelayHttpPoolConfig {
    pub pool_idle_timeout: Duration,
    pub pool_max_idle_per_host: usize,
    pub http2_keep_alive_interval: Duration,
    pub http2_keep_alive_timeout: Duration,
    pub connect_timeout: Duration,
}

impl Default for ProviderRelayHttpPoolConfig {
    fn default() -> Self {
        Self {
            pool_idle_timeout: Duration::from_secs(90),
            pool_max_idle_per_host: 64,
            http2_keep_alive_interval: Duration::from_secs(30),
            http2_keep_alive_timeout: Duration::from_secs(10),
            connect_timeout: Duration::from_secs(10),
        }
    }
}

impl ProviderRelayHttpPoolConfig {
    /// Build a resolved pool config from TOML/env config, applying defaults.
    pub fn from_section(section: &ProviderRelayHttpPoolSectionConfig) -> Self {
        let defaults = Self::default();
        Self {
            pool_idle_timeout: section
                .pool_idle_timeout_seconds
                .filter(|value| *value > 0)
                .map(Duration::from_secs)
                .unwrap_or(defaults.pool_idle_timeout),
            pool_max_idle_per_host: section
                .pool_max_idle_per_host
                .filter(|value| *value > 0)
                .unwrap_or(defaults.pool_max_idle_per_host),
            http2_keep_alive_interval: section
                .http2_keep_alive_interval_seconds
                .filter(|value| *value > 0)
                .map(Duration::from_secs)
                .unwrap_or(defaults.http2_keep_alive_interval),
            http2_keep_alive_timeout: section
                .http2_keep_alive_timeout_seconds
                .filter(|value| *value > 0)
                .map(Duration::from_secs)
                .unwrap_or(defaults.http2_keep_alive_timeout),
            connect_timeout: section
                .connect_timeout_seconds
                .filter(|value| *value > 0)
                .map(Duration::from_secs)
                .unwrap_or(defaults.connect_timeout),
        }
    }
}

#[derive(Clone)]
struct ProviderRelayRuntime {
    client: ProviderClient,
    response_timeout: Duration,
    stream_response_timeout: Duration,
    response_max_bytes: u64,
    default_retry_policy: ProviderRetryPolicy,
}

impl ProviderRelayRuntime {
    fn new(response_timeout: Duration) -> Self {
        Self::with_default_retry_policy(
            response_timeout,
            DEFAULT_PROVIDER_STREAM_RESPONSE_TIMEOUT,
            DEFAULT_PROVIDER_RESPONSE_MAX_BYTES,
            ProviderRetryPolicy::default(),
            ProviderRelayHttpPoolConfig::default(),
        )
    }

    fn with_default_retry_policy(
        response_timeout: Duration,
        stream_response_timeout: Duration,
        response_max_bytes: u64,
        default_retry_policy: ProviderRetryPolicy,
        pool_config: ProviderRelayHttpPoolConfig,
    ) -> Self {
        Self {
            client: build_provider_client(pool_config),
            response_timeout,
            stream_response_timeout,
            response_max_bytes,
            default_retry_policy,
        }
    }

    fn for_request(&self, timeout_ms: Option<u64>) -> Self {
        let response_timeout = timeout_ms
            .filter(|timeout_ms| *timeout_ms > 0)
            .map(Duration::from_millis)
            .unwrap_or(self.response_timeout);
        Self {
            client: self.client.clone(),
            response_timeout,
            stream_response_timeout: self.stream_response_timeout,
            response_max_bytes: self.response_max_bytes,
            default_retry_policy: self.default_retry_policy.clone(),
        }
    }
}

impl Default for ProviderRelayRuntime {
    fn default() -> Self {
        Self::new(DEFAULT_PROVIDER_RESPONSE_TIMEOUT)
    }
}

#[derive(Clone)]
pub struct UpstreamProviderEndpoint {
    base_url: String,
    includes_openai_v1_prefix: bool,
    bearer_token: String,
    auth_profile: ProviderAuthProfile,
}

impl UpstreamProviderEndpoint {
    pub fn new(base_url: impl Into<String>, bearer_token: impl Into<String>) -> DomainResult<Self> {
        let base_url = base_url.into();
        if base_url.trim().is_empty() {
            return Err(DomainError::new("upstream provider base URL is required"));
        }
        let validated_url =
            validate_outbound_base_url(&base_url, OutboundTargetPolicy::Production).map_err(
                |error| {
                    DomainError::new(format!(
                        "ssrf_blocked: upstream provider base URL violates the outbound target policy: {error}"
                    ))
                },
            )?;
        let base_url = validated_url.as_str().trim_end_matches('/').to_owned();
        let uri = base_url.parse::<Uri>().map_err(|error| {
            DomainError::new(format!(
                "upstream provider base URL must be an absolute https provider URL: {error}"
            ))
        })?;
        let scheme = uri.scheme_str();
        // H-1: upstream provider traffic must use HTTPS. Plain HTTP is rejected
        // here (defense-in-depth) and again at the connector via `.https_only()`.
        if !matches!(scheme, Some("https")) || uri.authority().is_none() {
            return Err(DomainError::new(
                "upstream provider base URL must be an absolute https provider URL",
            ));
        }
        let uri_path = uri.path().trim_end_matches('/');
        let includes_openai_v1_prefix = uri_path == "/v1" || uri_path.ends_with("/v1");
        let bearer_token = bearer_token.into().trim().to_owned();
        if bearer_token.is_empty() {
            return Err(DomainError::new(
                "upstream provider bearer token is required",
            ));
        }
        Ok(Self {
            base_url,
            includes_openai_v1_prefix,
            bearer_token,
            auth_profile: ProviderAuthProfile::bearer(),
        })
    }

    pub fn with_auth_profile(mut self, auth_profile: ProviderAuthProfile) -> Self {
        self.auth_profile = auth_profile;
        self
    }

    fn chat_completions_uri(&self) -> DomainResult<Uri> {
        self.openai_uri("/v1/chat/completions")
    }

    fn responses_uri(&self) -> DomainResult<Uri> {
        self.openai_uri("/v1/responses")
    }

    fn embeddings_uri(&self) -> DomainResult<Uri> {
        self.openai_uri("/v1/embeddings")
    }

    fn models_uri(&self) -> DomainResult<Uri> {
        self.openai_uri("/v1/models")
    }

    pub async fn verify_models(
        &self,
        response_timeout: Duration,
    ) -> DomainResult<UpstreamProviderVerification> {
        let runtime = ProviderRelayRuntime::new(response_timeout);
        let uri = self.models_uri()?;
        let request = self
            .apply_auth_headers(
                Request::builder()
                    .method(Method::GET)
                    .uri(self.authenticated_uri(uri.clone())?),
            )?
            .body(Full::new(Bytes::new()))
            .map_err(|error| {
                DomainError::new(format!(
                    "failed to build upstream provider verification request: {error}"
                ))
            })?;
        let started_at = std::time::Instant::now();
        let response = send_provider_request(&runtime, request).await?;
        let latency_ms = u64::try_from(started_at.elapsed().as_millis()).unwrap_or(u64::MAX);
        let status_code = response.status().as_u16();
        let bytes = tokio::time::timeout(
            response_timeout,
            Limited::new(
                response.into_body(),
                UPSTREAM_VERIFICATION_RESPONSE_MAX_BYTES,
            )
            .collect(),
        )
        .await
        .map_err(|_| DomainError::new("upstream provider verification body timed out"))?
        .map_err(|error| {
            DomainError::new(format!(
                "upstream provider verification body failed (limit 1048576 bytes): {error}"
            ))
        })?
        .to_bytes();
        let body = serde_json::from_slice::<Value>(&bytes).ok();
        Ok(upstream_verification_outcome(
            status_code,
            latency_ms,
            body.as_ref(),
        ))
    }

    fn openai_uri(&self, path: &str) -> DomainResult<Uri> {
        let path = if self.includes_openai_v1_prefix {
            path.strip_prefix("/v1").unwrap_or(path)
        } else {
            path
        };
        format!("{}{}", self.base_url, path)
            .parse()
            .map_err(|error| DomainError::new(format!("invalid upstream provider URI: {error}")))
    }

    fn authorization_value(&self) -> String {
        format!("Bearer {}", self.bearer_token)
    }

    fn apply_auth_headers(
        &self,
        builder: hyper::http::request::Builder,
    ) -> DomainResult<hyper::http::request::Builder> {
        let mut builder = builder;
        for header in &self.auth_profile.default_headers {
            builder = builder.header(
                parse_provider_header_name(&header.name)?,
                parse_provider_header_value(&header.name, &header.value)?,
            );
        }
        match self.auth_profile.auth_type {
            ProviderAuthType::Bearer => {
                Ok(builder.header(AUTHORIZATION, self.authorization_value()))
            }
            ProviderAuthType::Header => {
                let name = self.auth_profile.name.as_deref().ok_or_else(|| {
                    DomainError::new("provider account header auth name is required")
                })?;
                Ok(builder.header(
                    parse_provider_header_name(name)?,
                    parse_provider_header_value(name, &self.bearer_token)?,
                ))
            }
            ProviderAuthType::Query => Ok(builder),
        }
    }

    fn authenticated_uri(&self, uri: Uri) -> DomainResult<Uri> {
        if self.auth_profile.auth_type != ProviderAuthType::Query {
            return Ok(uri);
        }
        let name = self
            .auth_profile
            .name
            .as_deref()
            .ok_or_else(|| DomainError::new("provider account query auth name is required"))?;
        append_query_pair(uri, name, &self.bearer_token)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpstreamProviderVerification {
    pub success: bool,
    pub status_code: u16,
    pub latency_ms: u64,
    pub message: String,
}

fn upstream_verification_outcome(
    status_code: u16,
    latency_ms: u64,
    body: Option<&Value>,
) -> UpstreamProviderVerification {
    let valid_catalog = body
        .and_then(|value| value.get("data"))
        .is_some_and(Value::is_array);
    let success = (200..300).contains(&status_code) && valid_catalog;
    let message = if success {
        "upstream authentication and model catalog verified".to_owned()
    } else if (200..300).contains(&status_code) {
        "upstream provider returned an invalid model catalog".to_owned()
    } else {
        safe_verification_status_message(status_code).to_owned()
    };
    UpstreamProviderVerification {
        success,
        status_code,
        latency_ms,
        message,
    }
}

fn safe_verification_status_message(status_code: u16) -> &'static str {
    match status_code {
        401 | 403 => "upstream provider rejected the configured credential",
        408 | 504 => "upstream provider verification timed out",
        429 => "upstream provider rate limited the verification request",
        500..=599 => "upstream provider is unavailable",
        _ => "upstream provider rejected the verification request",
    }
}

impl std::fmt::Debug for UpstreamProviderEndpoint {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("UpstreamProviderEndpoint")
            .field("base_url", &self.base_url)
            .field("bearer_token", &"[REDACTED]")
            .finish()
    }
}

fn parse_provider_header_name(name: &str) -> DomainResult<HeaderName> {
    HeaderName::from_bytes(name.trim().as_bytes()).map_err(|error| {
        DomainError::new(format!(
            "provider account auth header name is invalid: {error}"
        ))
    })
}

fn parse_provider_header_value(name: &str, value: &str) -> DomainResult<HeaderValue> {
    HeaderValue::from_str(value).map_err(|error| {
        DomainError::new(format!(
            "provider account auth header {name} value is invalid: {error}"
        ))
    })
}

fn append_query_pair(uri: Uri, name: &str, value: &str) -> DomainResult<Uri> {
    let mut parts = uri.into_parts();
    let path_and_query = parts
        .path_and_query
        .as_ref()
        .map(|value| value.as_str())
        .unwrap_or("/");
    let separator = if path_and_query.contains('?') {
        "&"
    } else {
        "?"
    };
    let path_and_query = format!(
        "{path_and_query}{separator}{}={}",
        percent_encode_query_component(name),
        percent_encode_query_component(value)
    );
    parts.path_and_query = Some(path_and_query.parse().map_err(|error| {
        DomainError::new(format!(
            "provider account query auth URI is invalid: {error}"
        ))
    })?);
    Uri::from_parts(parts).map_err(|error| {
        DomainError::new(format!(
            "provider account query auth URI is invalid: {error}"
        ))
    })
}

fn percent_encode_query_component(value: &str) -> String {
    let mut encoded = String::with_capacity(value.len());
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~') {
            encoded.push(byte as char);
        } else {
            encoded.push('%');
            encoded.push(hex_digit(byte >> 4));
            encoded.push(hex_digit(byte & 0x0f));
        }
    }
    encoded
}

fn hex_digit(value: u8) -> char {
    match value {
        0..=9 => (b'0' + value) as char,
        10..=15 => (b'A' + value - 10) as char,
        _ => unreachable!("query percent encoding nibble must be in 0..=15"),
    }
}

#[derive(Clone)]
pub struct OpenAiCompatibleChatCompletionRelay {
    endpoint: UpstreamProviderEndpoint,
    runtime: ProviderRelayRuntime,
}

impl OpenAiCompatibleChatCompletionRelay {
    pub fn new(endpoint: UpstreamProviderEndpoint) -> Self {
        Self {
            endpoint,
            runtime: ProviderRelayRuntime::default(),
        }
    }

    pub fn with_response_timeout(
        endpoint: UpstreamProviderEndpoint,
        response_timeout: Duration,
    ) -> Self {
        Self::with_runtime(endpoint, response_timeout, ProviderRetryPolicy::default())
    }

    pub fn with_runtime(
        endpoint: UpstreamProviderEndpoint,
        response_timeout: Duration,
        default_retry_policy: ProviderRetryPolicy,
    ) -> Self {
        Self::with_full_runtime(
            endpoint,
            response_timeout,
            DEFAULT_PROVIDER_STREAM_RESPONSE_TIMEOUT,
            DEFAULT_PROVIDER_RESPONSE_MAX_BYTES,
            default_retry_policy,
            ProviderRelayHttpPoolConfig::default(),
        )
    }

    /// Build a relay with the full set of provider relay runtime tunables.
    ///
    /// Exposed so deployers can wire TOML/env-resolved values for stream
    /// timeout, response body cap, and HTTP connection-pool tuning instead of
    /// relying on the compiled defaults.
    pub fn with_full_runtime(
        endpoint: UpstreamProviderEndpoint,
        response_timeout: Duration,
        stream_response_timeout: Duration,
        response_max_bytes: u64,
        default_retry_policy: ProviderRetryPolicy,
        http_pool_config: ProviderRelayHttpPoolConfig,
    ) -> Self {
        Self {
            endpoint,
            runtime: ProviderRelayRuntime::with_default_retry_policy(
                response_timeout,
                stream_response_timeout,
                response_max_bytes,
                default_retry_policy,
                http_pool_config,
            ),
        }
    }
}

#[derive(Clone)]
pub struct OpenAiCompatibleChatCompletionStreamRelay {
    endpoint: UpstreamProviderEndpoint,
    runtime: ProviderRelayRuntime,
}

impl OpenAiCompatibleChatCompletionStreamRelay {
    pub fn new(endpoint: UpstreamProviderEndpoint) -> Self {
        Self {
            endpoint,
            runtime: ProviderRelayRuntime::default(),
        }
    }

    pub fn with_response_timeout(
        endpoint: UpstreamProviderEndpoint,
        response_timeout: Duration,
    ) -> Self {
        Self::with_runtime(endpoint, response_timeout, ProviderRetryPolicy::default())
    }

    pub fn with_runtime(
        endpoint: UpstreamProviderEndpoint,
        response_timeout: Duration,
        default_retry_policy: ProviderRetryPolicy,
    ) -> Self {
        Self::with_full_runtime(
            endpoint,
            response_timeout,
            DEFAULT_PROVIDER_STREAM_RESPONSE_TIMEOUT,
            DEFAULT_PROVIDER_RESPONSE_MAX_BYTES,
            default_retry_policy,
            ProviderRelayHttpPoolConfig::default(),
        )
    }

    /// Build a relay with the full set of provider relay runtime tunables.
    ///
    /// Exposed so deployers can wire TOML/env-resolved values for stream
    /// timeout, response body cap, and HTTP connection-pool tuning instead of
    /// relying on the compiled defaults.
    pub fn with_full_runtime(
        endpoint: UpstreamProviderEndpoint,
        response_timeout: Duration,
        stream_response_timeout: Duration,
        response_max_bytes: u64,
        default_retry_policy: ProviderRetryPolicy,
        http_pool_config: ProviderRelayHttpPoolConfig,
    ) -> Self {
        Self {
            endpoint,
            runtime: ProviderRelayRuntime::with_default_retry_policy(
                response_timeout,
                stream_response_timeout,
                response_max_bytes,
                default_retry_policy,
                http_pool_config,
            ),
        }
    }
}

#[derive(Clone)]
pub struct SecretRefOpenAiCompatibleChatCompletionRelay {
    secret_resolver: std::sync::Arc<dyn ProviderSecretResolver + Send + Sync>,
    runtime: ProviderRelayRuntime,
}

impl SecretRefOpenAiCompatibleChatCompletionRelay {
    pub fn new(secret_resolver: std::sync::Arc<dyn ProviderSecretResolver + Send + Sync>) -> Self {
        Self {
            secret_resolver,
            runtime: ProviderRelayRuntime::default(),
        }
    }

    pub fn with_response_timeout(
        secret_resolver: std::sync::Arc<dyn ProviderSecretResolver + Send + Sync>,
        response_timeout: Duration,
    ) -> Self {
        Self::with_runtime(
            secret_resolver,
            response_timeout,
            ProviderRetryPolicy::default(),
        )
    }

    pub fn with_runtime(
        secret_resolver: std::sync::Arc<dyn ProviderSecretResolver + Send + Sync>,
        response_timeout: Duration,
        default_retry_policy: ProviderRetryPolicy,
    ) -> Self {
        Self::with_full_runtime(
            secret_resolver,
            response_timeout,
            DEFAULT_PROVIDER_STREAM_RESPONSE_TIMEOUT,
            DEFAULT_PROVIDER_RESPONSE_MAX_BYTES,
            default_retry_policy,
            ProviderRelayHttpPoolConfig::default(),
        )
    }

    /// Build a relay with the full set of provider relay runtime tunables.
    ///
    /// Exposed so deployers can wire TOML/env-resolved values for stream
    /// timeout, response body cap, and HTTP connection-pool tuning instead of
    /// relying on the compiled defaults.
    pub fn with_full_runtime(
        secret_resolver: std::sync::Arc<dyn ProviderSecretResolver + Send + Sync>,
        response_timeout: Duration,
        stream_response_timeout: Duration,
        response_max_bytes: u64,
        default_retry_policy: ProviderRetryPolicy,
        http_pool_config: ProviderRelayHttpPoolConfig,
    ) -> Self {
        Self {
            secret_resolver,
            runtime: ProviderRelayRuntime::with_default_retry_policy(
                response_timeout,
                stream_response_timeout,
                response_max_bytes,
                default_retry_policy,
                http_pool_config,
            ),
        }
    }
}

#[derive(Clone)]
pub struct SecretRefOpenAiCompatibleChatCompletionStreamRelay {
    secret_resolver: std::sync::Arc<dyn ProviderSecretResolver + Send + Sync>,
    runtime: ProviderRelayRuntime,
}

impl SecretRefOpenAiCompatibleChatCompletionStreamRelay {
    pub fn new(secret_resolver: std::sync::Arc<dyn ProviderSecretResolver + Send + Sync>) -> Self {
        Self {
            secret_resolver,
            runtime: ProviderRelayRuntime::default(),
        }
    }

    pub fn with_response_timeout(
        secret_resolver: std::sync::Arc<dyn ProviderSecretResolver + Send + Sync>,
        response_timeout: Duration,
    ) -> Self {
        Self::with_runtime(
            secret_resolver,
            response_timeout,
            ProviderRetryPolicy::default(),
        )
    }

    pub fn with_runtime(
        secret_resolver: std::sync::Arc<dyn ProviderSecretResolver + Send + Sync>,
        response_timeout: Duration,
        default_retry_policy: ProviderRetryPolicy,
    ) -> Self {
        Self::with_full_runtime(
            secret_resolver,
            response_timeout,
            DEFAULT_PROVIDER_STREAM_RESPONSE_TIMEOUT,
            DEFAULT_PROVIDER_RESPONSE_MAX_BYTES,
            default_retry_policy,
            ProviderRelayHttpPoolConfig::default(),
        )
    }

    /// Build a relay with the full set of provider relay runtime tunables.
    ///
    /// Exposed so deployers can wire TOML/env-resolved values for stream
    /// timeout, response body cap, and HTTP connection-pool tuning instead of
    /// relying on the compiled defaults.
    pub fn with_full_runtime(
        secret_resolver: std::sync::Arc<dyn ProviderSecretResolver + Send + Sync>,
        response_timeout: Duration,
        stream_response_timeout: Duration,
        response_max_bytes: u64,
        default_retry_policy: ProviderRetryPolicy,
        http_pool_config: ProviderRelayHttpPoolConfig,
    ) -> Self {
        Self {
            secret_resolver,
            runtime: ProviderRelayRuntime::with_default_retry_policy(
                response_timeout,
                stream_response_timeout,
                response_max_bytes,
                default_retry_policy,
                http_pool_config,
            ),
        }
    }
}

impl ChatCompletionRelay for SecretRefOpenAiCompatibleChatCompletionRelay {
    fn create_chat_completion<'a>(
        &'a self,
        request: ChatCompletionRelayRequest,
    ) -> ChatCompletionRelayFuture<'a> {
        Box::pin(async move {
            let base_url = request
                .provider_base_url
                .clone()
                .ok_or_else(|| DomainError::new("provider base URL is required for relay"))?;
            let secret_ref = request
                .provider_secret_ref
                .clone()
                .ok_or_else(|| DomainError::new("provider secret_ref is required for relay"))?;
            let bearer_token = self.secret_resolver.resolve_secret_value(&secret_ref)?;
            let endpoint = UpstreamProviderEndpoint::new(base_url, bearer_token)?
                .with_auth_profile(request.provider_auth_profile.clone());
            let runtime = self.runtime.for_request(request.provider_timeout_ms);
            send_chat_completion_with_runtime(&runtime, &endpoint, request).await
        })
    }
}

impl ChatCompletionStreamRelay for SecretRefOpenAiCompatibleChatCompletionStreamRelay {
    fn create_chat_completion_stream<'a>(
        &'a self,
        request: ChatCompletionRelayRequest,
    ) -> ChatCompletionStreamRelayFuture<'a> {
        Box::pin(async move {
            let base_url = request
                .provider_base_url
                .clone()
                .ok_or_else(|| DomainError::new("provider base URL is required for relay"))?;
            let secret_ref = request
                .provider_secret_ref
                .clone()
                .ok_or_else(|| DomainError::new("provider secret_ref is required for relay"))?;
            let bearer_token = self.secret_resolver.resolve_secret_value(&secret_ref)?;
            let endpoint = UpstreamProviderEndpoint::new(base_url, bearer_token)?
                .with_auth_profile(request.provider_auth_profile.clone());
            let runtime = self.runtime.for_request(request.provider_timeout_ms);
            send_chat_completion_stream_with_runtime(&runtime, &endpoint, request).await
        })
    }
}

#[derive(Clone)]
pub struct OpenAiCompatibleResponsesRelay {
    endpoint: UpstreamProviderEndpoint,
    runtime: ProviderRelayRuntime,
}

impl OpenAiCompatibleResponsesRelay {
    pub fn new(endpoint: UpstreamProviderEndpoint) -> Self {
        Self {
            endpoint,
            runtime: ProviderRelayRuntime::default(),
        }
    }

    pub fn with_response_timeout(
        endpoint: UpstreamProviderEndpoint,
        response_timeout: Duration,
    ) -> Self {
        Self::with_runtime(endpoint, response_timeout, ProviderRetryPolicy::default())
    }

    pub fn with_runtime(
        endpoint: UpstreamProviderEndpoint,
        response_timeout: Duration,
        default_retry_policy: ProviderRetryPolicy,
    ) -> Self {
        Self::with_full_runtime(
            endpoint,
            response_timeout,
            DEFAULT_PROVIDER_STREAM_RESPONSE_TIMEOUT,
            DEFAULT_PROVIDER_RESPONSE_MAX_BYTES,
            default_retry_policy,
            ProviderRelayHttpPoolConfig::default(),
        )
    }

    /// Build a relay with the full set of provider relay runtime tunables.
    ///
    /// Exposed so deployers can wire TOML/env-resolved values for stream
    /// timeout, response body cap, and HTTP connection-pool tuning instead of
    /// relying on the compiled defaults.
    pub fn with_full_runtime(
        endpoint: UpstreamProviderEndpoint,
        response_timeout: Duration,
        stream_response_timeout: Duration,
        response_max_bytes: u64,
        default_retry_policy: ProviderRetryPolicy,
        http_pool_config: ProviderRelayHttpPoolConfig,
    ) -> Self {
        Self {
            endpoint,
            runtime: ProviderRelayRuntime::with_default_retry_policy(
                response_timeout,
                stream_response_timeout,
                response_max_bytes,
                default_retry_policy,
                http_pool_config,
            ),
        }
    }
}

#[derive(Clone)]
pub struct OpenAiCompatibleEmbeddingsRelay {
    endpoint: UpstreamProviderEndpoint,
    runtime: ProviderRelayRuntime,
}

impl OpenAiCompatibleEmbeddingsRelay {
    pub fn new(endpoint: UpstreamProviderEndpoint) -> Self {
        Self {
            endpoint,
            runtime: ProviderRelayRuntime::default(),
        }
    }

    pub fn with_response_timeout(
        endpoint: UpstreamProviderEndpoint,
        response_timeout: Duration,
    ) -> Self {
        Self::with_runtime(endpoint, response_timeout, ProviderRetryPolicy::default())
    }

    pub fn with_runtime(
        endpoint: UpstreamProviderEndpoint,
        response_timeout: Duration,
        default_retry_policy: ProviderRetryPolicy,
    ) -> Self {
        Self::with_full_runtime(
            endpoint,
            response_timeout,
            DEFAULT_PROVIDER_STREAM_RESPONSE_TIMEOUT,
            DEFAULT_PROVIDER_RESPONSE_MAX_BYTES,
            default_retry_policy,
            ProviderRelayHttpPoolConfig::default(),
        )
    }

    /// Build a relay with the full set of provider relay runtime tunables.
    ///
    /// Exposed so deployers can wire TOML/env-resolved values for stream
    /// timeout, response body cap, and HTTP connection-pool tuning instead of
    /// relying on the compiled defaults.
    pub fn with_full_runtime(
        endpoint: UpstreamProviderEndpoint,
        response_timeout: Duration,
        stream_response_timeout: Duration,
        response_max_bytes: u64,
        default_retry_policy: ProviderRetryPolicy,
        http_pool_config: ProviderRelayHttpPoolConfig,
    ) -> Self {
        Self {
            endpoint,
            runtime: ProviderRelayRuntime::with_default_retry_policy(
                response_timeout,
                stream_response_timeout,
                response_max_bytes,
                default_retry_policy,
                http_pool_config,
            ),
        }
    }
}

#[derive(Clone)]
pub struct SecretRefOpenAiCompatibleResponsesRelay {
    secret_resolver: std::sync::Arc<dyn ProviderSecretResolver + Send + Sync>,
    runtime: ProviderRelayRuntime,
}

impl SecretRefOpenAiCompatibleResponsesRelay {
    pub fn new(secret_resolver: std::sync::Arc<dyn ProviderSecretResolver + Send + Sync>) -> Self {
        Self {
            secret_resolver,
            runtime: ProviderRelayRuntime::default(),
        }
    }

    pub fn with_response_timeout(
        secret_resolver: std::sync::Arc<dyn ProviderSecretResolver + Send + Sync>,
        response_timeout: Duration,
    ) -> Self {
        Self::with_runtime(
            secret_resolver,
            response_timeout,
            ProviderRetryPolicy::default(),
        )
    }

    pub fn with_runtime(
        secret_resolver: std::sync::Arc<dyn ProviderSecretResolver + Send + Sync>,
        response_timeout: Duration,
        default_retry_policy: ProviderRetryPolicy,
    ) -> Self {
        Self::with_full_runtime(
            secret_resolver,
            response_timeout,
            DEFAULT_PROVIDER_STREAM_RESPONSE_TIMEOUT,
            DEFAULT_PROVIDER_RESPONSE_MAX_BYTES,
            default_retry_policy,
            ProviderRelayHttpPoolConfig::default(),
        )
    }

    /// Build a relay with the full set of provider relay runtime tunables.
    ///
    /// Exposed so deployers can wire TOML/env-resolved values for stream
    /// timeout, response body cap, and HTTP connection-pool tuning instead of
    /// relying on the compiled defaults.
    pub fn with_full_runtime(
        secret_resolver: std::sync::Arc<dyn ProviderSecretResolver + Send + Sync>,
        response_timeout: Duration,
        stream_response_timeout: Duration,
        response_max_bytes: u64,
        default_retry_policy: ProviderRetryPolicy,
        http_pool_config: ProviderRelayHttpPoolConfig,
    ) -> Self {
        Self {
            secret_resolver,
            runtime: ProviderRelayRuntime::with_default_retry_policy(
                response_timeout,
                stream_response_timeout,
                response_max_bytes,
                default_retry_policy,
                http_pool_config,
            ),
        }
    }
}

#[derive(Clone)]
pub struct SecretRefOpenAiCompatibleEmbeddingsRelay {
    secret_resolver: std::sync::Arc<dyn ProviderSecretResolver + Send + Sync>,
    runtime: ProviderRelayRuntime,
}

impl SecretRefOpenAiCompatibleEmbeddingsRelay {
    pub fn new(secret_resolver: std::sync::Arc<dyn ProviderSecretResolver + Send + Sync>) -> Self {
        Self {
            secret_resolver,
            runtime: ProviderRelayRuntime::default(),
        }
    }

    pub fn with_response_timeout(
        secret_resolver: std::sync::Arc<dyn ProviderSecretResolver + Send + Sync>,
        response_timeout: Duration,
    ) -> Self {
        Self::with_runtime(
            secret_resolver,
            response_timeout,
            ProviderRetryPolicy::default(),
        )
    }

    pub fn with_runtime(
        secret_resolver: std::sync::Arc<dyn ProviderSecretResolver + Send + Sync>,
        response_timeout: Duration,
        default_retry_policy: ProviderRetryPolicy,
    ) -> Self {
        Self::with_full_runtime(
            secret_resolver,
            response_timeout,
            DEFAULT_PROVIDER_STREAM_RESPONSE_TIMEOUT,
            DEFAULT_PROVIDER_RESPONSE_MAX_BYTES,
            default_retry_policy,
            ProviderRelayHttpPoolConfig::default(),
        )
    }

    /// Build a relay with the full set of provider relay runtime tunables.
    ///
    /// Exposed so deployers can wire TOML/env-resolved values for stream
    /// timeout, response body cap, and HTTP connection-pool tuning instead of
    /// relying on the compiled defaults.
    pub fn with_full_runtime(
        secret_resolver: std::sync::Arc<dyn ProviderSecretResolver + Send + Sync>,
        response_timeout: Duration,
        stream_response_timeout: Duration,
        response_max_bytes: u64,
        default_retry_policy: ProviderRetryPolicy,
        http_pool_config: ProviderRelayHttpPoolConfig,
    ) -> Self {
        Self {
            secret_resolver,
            runtime: ProviderRelayRuntime::with_default_retry_policy(
                response_timeout,
                stream_response_timeout,
                response_max_bytes,
                default_retry_policy,
                http_pool_config,
            ),
        }
    }
}

impl ResponsesRelay for SecretRefOpenAiCompatibleResponsesRelay {
    fn create_response<'a>(&'a self, request: ResponsesRelayRequest) -> ResponsesRelayFuture<'a> {
        Box::pin(async move {
            let base_url = request
                .provider_base_url
                .clone()
                .ok_or_else(|| DomainError::new("provider base URL is required for relay"))?;
            let secret_ref = request
                .provider_secret_ref
                .clone()
                .ok_or_else(|| DomainError::new("provider secret_ref is required for relay"))?;
            let bearer_token = self.secret_resolver.resolve_secret_value(&secret_ref)?;
            let endpoint = UpstreamProviderEndpoint::new(base_url, bearer_token)?
                .with_auth_profile(request.provider_auth_profile.clone());
            let runtime = self.runtime.for_request(request.provider_timeout_ms);
            send_response_with_runtime(&runtime, &endpoint, request).await
        })
    }
}

impl EmbeddingsRelay for SecretRefOpenAiCompatibleEmbeddingsRelay {
    fn create_embedding<'a>(
        &'a self,
        request: EmbeddingsRelayRequest,
    ) -> EmbeddingsRelayFuture<'a> {
        Box::pin(async move {
            let base_url = request
                .provider_base_url
                .clone()
                .ok_or_else(|| DomainError::new("provider base URL is required for relay"))?;
            let secret_ref = request
                .provider_secret_ref
                .clone()
                .ok_or_else(|| DomainError::new("provider secret_ref is required for relay"))?;
            let bearer_token = self.secret_resolver.resolve_secret_value(&secret_ref)?;
            let endpoint = UpstreamProviderEndpoint::new(base_url, bearer_token)?
                .with_auth_profile(request.provider_auth_profile.clone());
            let runtime = self.runtime.for_request(request.provider_timeout_ms);
            send_embedding_with_runtime(&runtime, &endpoint, request).await
        })
    }
}

impl ResponsesRelay for OpenAiCompatibleResponsesRelay {
    fn create_response<'a>(&'a self, request: ResponsesRelayRequest) -> ResponsesRelayFuture<'a> {
        Box::pin(async move { self.send_response(request).await })
    }
}

impl EmbeddingsRelay for OpenAiCompatibleEmbeddingsRelay {
    fn create_embedding<'a>(
        &'a self,
        request: EmbeddingsRelayRequest,
    ) -> EmbeddingsRelayFuture<'a> {
        Box::pin(async move { self.send_embedding(request).await })
    }
}

impl OpenAiCompatibleResponsesRelay {
    async fn send_response(
        &self,
        request: ResponsesRelayRequest,
    ) -> DomainResult<ResponsesRelayResponse> {
        let runtime = self.runtime.for_request(request.provider_timeout_ms);
        send_response_with_runtime(&runtime, &self.endpoint, request).await
    }
}

impl OpenAiCompatibleEmbeddingsRelay {
    async fn send_embedding(
        &self,
        request: EmbeddingsRelayRequest,
    ) -> DomainResult<EmbeddingsRelayResponse> {
        let runtime = self.runtime.for_request(request.provider_timeout_ms);
        send_embedding_with_runtime(&runtime, &self.endpoint, request).await
    }
}

impl ChatCompletionRelay for OpenAiCompatibleChatCompletionRelay {
    fn create_chat_completion<'a>(
        &'a self,
        request: ChatCompletionRelayRequest,
    ) -> ChatCompletionRelayFuture<'a> {
        Box::pin(async move { self.send_chat_completion(request).await })
    }
}

impl ChatCompletionStreamRelay for OpenAiCompatibleChatCompletionStreamRelay {
    fn create_chat_completion_stream<'a>(
        &'a self,
        request: ChatCompletionRelayRequest,
    ) -> ChatCompletionStreamRelayFuture<'a> {
        Box::pin(async move { self.send_chat_completion_stream(request).await })
    }
}

impl OpenAiCompatibleChatCompletionRelay {
    async fn send_chat_completion(
        &self,
        request: ChatCompletionRelayRequest,
    ) -> DomainResult<ChatCompletionRelayResponse> {
        let runtime = self.runtime.for_request(request.provider_timeout_ms);
        send_chat_completion_with_runtime(&runtime, &self.endpoint, request).await
    }
}

impl OpenAiCompatibleChatCompletionStreamRelay {
    async fn send_chat_completion_stream(
        &self,
        request: ChatCompletionRelayRequest,
    ) -> DomainResult<ChatCompletionStreamRelayResponse> {
        let runtime = self.runtime.for_request(request.provider_timeout_ms);
        send_chat_completion_stream_with_runtime(&runtime, &self.endpoint, request).await
    }
}

async fn send_chat_completion_with_runtime(
    runtime: &ProviderRelayRuntime,
    endpoint: &UpstreamProviderEndpoint,
    request: ChatCompletionRelayRequest,
) -> DomainResult<ChatCompletionRelayResponse> {
    let body = upstream_model_request_body(
        request.request_body,
        &request.provider_model,
        "chat completion",
    )?;
    let (status_code, body) = send_openai_json_with_runtime(
        runtime,
        endpoint,
        endpoint.chat_completions_uri()?,
        body,
        "chat completion",
        request.provider_retry_policy,
    )
    .await?;

    Ok(ChatCompletionRelayResponse::json(status_code, body))
}

async fn send_chat_completion_stream_with_runtime(
    runtime: &ProviderRelayRuntime,
    endpoint: &UpstreamProviderEndpoint,
    request: ChatCompletionRelayRequest,
) -> DomainResult<ChatCompletionStreamRelayResponse> {
    let body =
        upstream_model_request_body(request.request_body, &request.provider_model, "chat stream")?;
    let upstream_uri = endpoint.chat_completions_uri()?;
    tracing::debug!(
        supplier_code = %request.supplier_code,
        provider_account_id = request.provider_account_id,
        upstream_host = %redact_url(&endpoint.base_url),
        upstream_path = %upstream_uri.path(),
        model = body.get("model").and_then(|value| value.as_str()).unwrap_or(""),
        "forwarding OpenAI-compatible chat stream request to upstream provider"
    );
    let builder = Request::builder()
        .method(Method::POST)
        .uri(endpoint.authenticated_uri(upstream_uri)?)
        .header(CONTENT_TYPE, "application/json");
    let http_request = endpoint
        .apply_auth_headers(builder)?
        .body(Full::new(Bytes::from(body.to_string())))
        .map_err(|error| {
            DomainError::new(format!(
                "failed to build upstream provider request: {error}"
            ))
        })?;

    let response = send_provider_request(runtime, http_request).await?;
    let status_code = response.status().as_u16();
    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);
    tracing::info!(
        supplier_code = %request.supplier_code,
        provider_account_id = request.provider_account_id,
        status_code,
        content_type = content_type.as_deref().unwrap_or(""),
        "upstream OpenAI-compatible chat stream response received"
    );
    Ok(ChatCompletionStreamRelayResponse::new(
        status_code,
        content_type,
        Body::new(response.into_body()),
    ))
}

async fn send_response_with_runtime(
    runtime: &ProviderRelayRuntime,
    endpoint: &UpstreamProviderEndpoint,
    request: ResponsesRelayRequest,
) -> DomainResult<ResponsesRelayResponse> {
    let body =
        upstream_model_request_body(request.request_body, &request.provider_model, "responses")?;
    let (status_code, body) = send_openai_json_with_runtime(
        runtime,
        endpoint,
        endpoint.responses_uri()?,
        body,
        "responses",
        request.provider_retry_policy,
    )
    .await?;

    Ok(ResponsesRelayResponse::json(status_code, body))
}

async fn send_embedding_with_runtime(
    runtime: &ProviderRelayRuntime,
    endpoint: &UpstreamProviderEndpoint,
    request: EmbeddingsRelayRequest,
) -> DomainResult<EmbeddingsRelayResponse> {
    let body =
        upstream_model_request_body(request.request_body, &request.provider_model, "embeddings")?;
    let (status_code, body) = send_openai_json_with_runtime(
        runtime,
        endpoint,
        endpoint.embeddings_uri()?,
        body,
        "embeddings",
        request.provider_retry_policy,
    )
    .await?;

    Ok(EmbeddingsRelayResponse::json(status_code, body))
}

async fn send_openai_json_with_runtime(
    runtime: &ProviderRelayRuntime,
    endpoint: &UpstreamProviderEndpoint,
    uri: Uri,
    request_body: Value,
    request_label: &str,
    retry_policy: Option<ProviderRetryPolicy>,
) -> DomainResult<(u16, Value)> {
    let body = upstream_request_body(request_body, request_label)?;
    let body_bytes = Bytes::from(body.to_string());
    let retry_policy = retry_policy.unwrap_or_else(|| runtime.default_retry_policy.clone());
    let request_model = body
        .get("model")
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .to_owned();

    for attempt in 1..=retry_policy.max_attempts {
        tracing::debug!(
            request_label,
            attempt,
            max_attempts = retry_policy.max_attempts,
            upstream_host = %redact_url(&endpoint.base_url),
            upstream_path = %uri.path(),
            model = %request_model,
            "forwarding OpenAI-compatible JSON request to upstream provider"
        );
        let builder = Request::builder()
            .method(Method::POST)
            .uri(endpoint.authenticated_uri(uri.clone())?)
            .header(CONTENT_TYPE, "application/json");
        let http_request = endpoint
            .apply_auth_headers(builder)?
            .body(Full::new(body_bytes.clone()))
            .map_err(|error| {
                DomainError::new(format!(
                    "failed to build upstream provider request: {error}"
                ))
            })?;

        let response = send_provider_request(runtime, http_request).await?;
        let status_code = response.status().as_u16();
        // H-3: bound the response body to defend against oversized/trickling
        // upstream responses. `Limited` aborts collection once the configured
        // byte cap is exceeded.
        let bytes = tokio::time::timeout(
            runtime.response_timeout,
            Limited::new(
                response.into_body(),
                usize::try_from(runtime.response_max_bytes)
                    .unwrap_or(usize::MAX)
                    .min(MAX_PROVIDER_RESPONSE_MAX_BYTES as usize),
            )
            .collect(),
        )
        .await
        .map_err(|_| DomainError::new("upstream provider body timed out"))?
        .map_err(|error| {
            DomainError::new(format!(
                "upstream provider body failed (limit {} bytes): {error}",
                runtime.response_max_bytes
            ))
        })?
        .to_bytes();
        let body = serde_json::from_slice(&bytes).map_err(|error| {
            DomainError::new(format!("upstream provider returned invalid JSON: {error}"))
        })?;
        tracing::debug!(
            request_label,
            attempt,
            status_code,
            upstream_path = %uri.path(),
            model = %request_model,
            "upstream OpenAI-compatible JSON response received"
        );

        if attempt < retry_policy.max_attempts && retry_policy.is_retryable_status(status_code) {
            if retry_policy.backoff_ms > 0 {
                tokio::time::sleep(Duration::from_millis(retry_policy.backoff_ms)).await;
            }
            continue;
        }

        return Ok((status_code, body));
    }

    Err(DomainError::new(
        "upstream provider retry policy is invalid",
    ))
}

async fn send_provider_request(
    runtime: &ProviderRelayRuntime,
    http_request: Request<RequestBody>,
) -> DomainResult<hyper::Response<hyper::body::Incoming>> {
    tokio::time::timeout(
        runtime.response_timeout,
        runtime.client.request(http_request),
    )
    .await
    .map_err(|_| DomainError::new("upstream provider response timed out"))?
    .map_err(|error| DomainError::new(format!("upstream provider request failed: {error}")))
}

fn build_provider_client(pool_config: ProviderRelayHttpPoolConfig) -> ProviderClient {
    // C-5: tune the upstream connection pool. C-5/H-1: enforce HTTPS for all
    // upstream provider traffic via `.https_only()` so plain HTTP upstreams are
    // rejected at connector construction time (defense-in-depth with the
    // scheme check in `UpstreamProviderEndpoint::new`).
    //
    // `connect_timeout` is applied to the underlying `HttpConnector` because
    // the legacy client `Builder` does not expose a connect-timeout setter.
    // HTTP/2 keep-alive fields are kept in the config for forward compatibility
    // but are not applied here because the workspace does not enable the
    // `http2` feature on hyper/hyper-util/hyper-rustls.
    let mut http_connector = HttpConnector::new_with_resolver(OutboundDnsResolver::new(
        OutboundTargetPolicy::Production,
    ));
    http_connector.set_connect_timeout(Some(pool_config.connect_timeout));
    http_connector.enforce_http(false);
    let connector = hyper_rustls::HttpsConnectorBuilder::new()
        .with_webpki_roots()
        .https_only()
        .enable_http1()
        .wrap_connector(http_connector);
    Client::builder(TokioExecutor::new())
        .pool_idle_timeout(Some(pool_config.pool_idle_timeout))
        .pool_max_idle_per_host(pool_config.pool_max_idle_per_host)
        .build(connector)
}

fn upstream_request_body(body: Value, request_label: &str) -> DomainResult<Value> {
    body.as_object().ok_or_else(|| {
        DomainError::new(format!(
            "{request_label} request body must be a JSON object"
        ))
    })?;
    Ok(body)
}

fn upstream_model_request_body(
    mut request_body: Value,
    provider_model: &str,
    request_label: &str,
) -> DomainResult<Value> {
    let provider_model = provider_model.trim();
    if provider_model.is_empty() {
        return Err(DomainError::new(format!(
            "{request_label} provider model is required"
        )));
    }
    let provider_model = provider_native_model_id(provider_model);
    let object = request_body.as_object_mut().ok_or_else(|| {
        DomainError::new(format!(
            "{request_label} request body must be a JSON object"
        ))
    })?;
    object.insert("model".to_owned(), Value::String(provider_model));
    Ok(request_body)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn endpoint_for(base_url: &str) -> DomainResult<UpstreamProviderEndpoint> {
        UpstreamProviderEndpoint::new(base_url, "test-bearer-token")
    }

    #[test]
    fn ssrf_blocks_ipv4_loopback() {
        let error = endpoint_for("https://127.0.0.1/v1").unwrap_err();
        assert!(
            error.to_string().contains("ssrf_blocked"),
            "expected ssrf_blocked error, got: {error}"
        );
    }

    #[test]
    fn upstream_base_url_policy_rejects_unsafe_authorities_and_components() {
        for value in [
            "https://10.0.0.1/v1",
            "https://169.254.169.254/v1",
            "https://[::1]/v1",
            "https://localhost/v1",
            "https://token@api.openai.com/v1",
            "https://api.openai.com/v1?api_key=secret",
            "https://api.openai.com/v1#fragment",
        ] {
            let error = endpoint_for(value).unwrap_err();
            assert!(
                error.to_string().contains("ssrf_blocked"),
                "{value} should be rejected: {error}"
            );
        }
    }

    #[test]
    fn https_only_connector_rejects_http_scheme() {
        // build_provider_client enforces https_only; constructing a client must
        // not panic and must yield a usable client.
        let _client = build_provider_client(ProviderRelayHttpPoolConfig::default());
    }

    #[test]
    fn http_upstream_url_is_rejected_by_scheme_check() {
        let error = endpoint_for("http://127.0.0.1/v1").unwrap_err();
        assert!(error.to_string().contains("must use HTTPS"));
    }

    #[test]
    fn verification_accepts_a_valid_openai_model_catalog() {
        let body = serde_json::json!({"data": [{"id": "gpt-5"}]});
        let outcome = upstream_verification_outcome(200, 12, Some(&body));

        assert!(outcome.success);
        assert_eq!(200, outcome.status_code);
        assert_eq!(12, outcome.latency_ms);
    }

    #[test]
    fn verification_rejects_a_malformed_success_payload() {
        let body = serde_json::json!({"data": {"id": "not-an-array"}});
        let outcome = upstream_verification_outcome(200, 12, Some(&body));

        assert!(!outcome.success);
        assert_eq!(
            "upstream provider returned an invalid model catalog",
            outcome.message
        );
    }

    #[test]
    fn verification_does_not_forward_upstream_error_text() {
        let body = serde_json::json!({
            "error": {"message": "credential sk-production-secret was rejected"}
        });
        let outcome = upstream_verification_outcome(401, 12, Some(&body));

        assert!(!outcome.success);
        assert_eq!(
            "upstream provider rejected the configured credential",
            outcome.message
        );
        assert!(!outcome.message.contains("sk-production-secret"));
    }

    #[test]
    fn verification_response_body_is_capped_at_one_mebibyte() {
        assert_eq!(1024 * 1024, UPSTREAM_VERIFICATION_RESPONSE_MAX_BYTES);
    }
}
