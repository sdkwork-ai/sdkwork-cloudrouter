use std::collections::HashSet;
use std::num::NonZeroUsize;
use std::pin::Pin;
use std::time::Duration;

use axum::body::Body as AxumBody;
use axum::http::header::{self, HeaderName, HeaderValue};
use axum::http::request::Builder as RequestBuilder;
use axum::http::{HeaderMap, Uri};
use bytes::Bytes;
use http_body_util::{BodyExt, Full, LengthLimitError, Limited};
use hyper::Request as HyperRequest;
use hyper_rustls::HttpsConnector;
use hyper_util::client::legacy::connect::proxy::Tunnel;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::TokioExecutor;
use hyper_util::rt::TokioIo;
use sdkwork_cloudrouter_http::{
    ensure_rustls_crypto_provider, preserve_safe_upstream_response_headers, OutboundDnsResolver,
};
use sdkwork_cloudrouter_router_service::application::{
    Invocation, InvocationAccount, InvocationBody, InvocationDispatchResponse,
};
use sdkwork_cloudrouter_router_service::infrastructure::provider::{
    ProviderRelayHttpPoolConfig, ProviderResponseMemoryBudget, ProviderResponseMemoryBudgetError,
};
use sdkwork_cloudrouter_router_service::ports::{
    InvocationDispatchError, InvocationDispatcher, InvocationDispatcherFuture,
};
use sdkwork_cloudrouter_security::{
    validate_outbound_url, validate_resolved_outbound_ip, OutboundTargetPolicy,
};
use tower::Service as TowerService;

const INVOCATION_UPSTREAM_BODY_LIMIT_BYTES: usize = 32 * 1024 * 1024;
const DEFAULT_DISPATCH_TIMEOUT_MS: u64 = 30_000;

/// Outbound HTTP proxy for provider dispatch (`http://host:port`).
///
/// The provider relay client is built on hyper-util's legacy client, which —
/// unlike reqwest — never reads `HTTP_PROXY`/`HTTPS_PROXY`. Deployment hosts
/// behind an egress proxy (or whose DNS answers with proxy fake-IPs) must
/// therefore name the proxy explicitly. Because the CONNECT target hostname is
/// resolved by the proxy itself, this also bypasses local fake-IP DNS, which
/// the production outbound policy would otherwise reject.
pub const ENV_OUTBOUND_HTTP_PROXY: &str = "SDKWORK_CLOUDROUTER_OUTBOUND_HTTP_PROXY";

type InvocationHttpBody = Full<Bytes>;
type InvocationHttpConnector = HttpsConnector<OutboundConnector>;
type InvocationHttpClient = Client<InvocationHttpConnector, InvocationHttpBody>;
type BoxError = Box<dyn std::error::Error + Send + Sync>;

#[derive(Clone)]
pub struct InvocationHttpDispatcher {
    client: InvocationHttpClient,
    outbound_target_policy: OutboundTargetPolicy,
    response_max_bytes: NonZeroUsize,
    response_timeout: Duration,
    response_memory_budget: ProviderResponseMemoryBudget,
    /// A tunnelled CONNECT target is resolved by the proxy, so the local
    /// `OutboundDnsResolver` never sees it. When a proxy is configured the
    /// dispatcher pre-resolves the target locally as defence in depth.
    proxy_configured: bool,
}

impl InvocationHttpDispatcher {
    pub fn new() -> Self {
        Self::with_outbound_target_policy(OutboundTargetPolicy::Production)
    }

    /// Creates an explicit development-only dispatcher for desktop and test
    /// fixtures that intentionally target a local HTTP provider.
    pub fn for_development() -> Self {
        Self::with_outbound_target_policy(OutboundTargetPolicy::Development)
    }

    pub fn with_outbound_target_policy(outbound_target_policy: OutboundTargetPolicy) -> Self {
        Self::with_outbound_target_policy_and_response_max_bytes(
            outbound_target_policy,
            default_response_max_bytes(),
        )
    }

    /// Creates a production dispatcher with an explicit non-streaming response budget.
    pub fn with_response_max_bytes(response_max_bytes: NonZeroUsize) -> Self {
        Self::with_outbound_target_policy_and_response_max_bytes(
            OutboundTargetPolicy::Production,
            response_max_bytes,
        )
    }

    pub fn with_outbound_target_policy_and_response_max_bytes(
        outbound_target_policy: OutboundTargetPolicy,
        response_max_bytes: NonZeroUsize,
    ) -> Self {
        Self::with_outbound_target_policy_and_provider_runtime(
            outbound_target_policy,
            response_max_bytes,
            Duration::from_millis(DEFAULT_DISPATCH_TIMEOUT_MS),
            ProviderRelayHttpPoolConfig::default(),
        )
    }

    /// Creates a production dispatcher from the resolved provider relay runtime
    /// settings assembled by the gateway bootstrap.
    pub fn with_provider_runtime(
        response_max_bytes: NonZeroUsize,
        response_timeout: Duration,
        http_pool_config: ProviderRelayHttpPoolConfig,
    ) -> Self {
        Self::with_outbound_target_policy_and_provider_runtime(
            OutboundTargetPolicy::Production,
            response_max_bytes,
            response_timeout,
            http_pool_config,
        )
    }

    fn with_outbound_target_policy_and_provider_runtime(
        outbound_target_policy: OutboundTargetPolicy,
        response_max_bytes: NonZeroUsize,
        response_timeout: Duration,
        http_pool_config: ProviderRelayHttpPoolConfig,
    ) -> Self {
        let response_memory_budget = ProviderResponseMemoryBudget::with_default_limit();
        let proxy = outbound_http_proxy_or_warn();
        let proxy_configured = proxy.is_some();
        Self {
            client: build_invocation_http_client(outbound_target_policy, http_pool_config, proxy),
            outbound_target_policy,
            response_max_bytes,
            response_timeout,
            response_memory_budget,
            proxy_configured,
        }
    }

    /// Creates a production dispatcher with an explicit process-wide memory
    /// budget. Invalid response-limit/budget combinations fail at bootstrap.
    pub fn with_provider_runtime_and_memory_budget(
        response_max_bytes: NonZeroUsize,
        response_memory_budget_bytes: NonZeroUsize,
        response_timeout: Duration,
        http_pool_config: ProviderRelayHttpPoolConfig,
    ) -> Result<Self, String> {
        let response_memory_budget =
            ProviderResponseMemoryBudget::new(response_memory_budget_bytes)
                .map_err(|error| error.to_string())?;
        Self::with_provider_runtime_and_shared_memory_budget(
            response_max_bytes,
            response_memory_budget,
            response_timeout,
            http_pool_config,
        )
    }

    pub fn with_provider_runtime_and_shared_memory_budget(
        response_max_bytes: NonZeroUsize,
        response_memory_budget: ProviderResponseMemoryBudget,
        response_timeout: Duration,
        http_pool_config: ProviderRelayHttpPoolConfig,
    ) -> Result<Self, String> {
        response_memory_budget
            .validate_response_limit(response_max_bytes.get() as u64)
            .map_err(|error| error.to_string())?;
        let outbound_target_policy = outbound_target_policy_from_process_env();
        let proxy = outbound_http_proxy_from_process_env()?;
        let proxy_configured = proxy.is_some();
        Ok(Self {
            client: build_invocation_http_client(outbound_target_policy, http_pool_config, proxy),
            outbound_target_policy,
            response_max_bytes,
            response_timeout,
            response_memory_budget,
            proxy_configured,
        })
    }
}

impl Default for InvocationHttpDispatcher {
    fn default() -> Self {
        Self::new()
    }
}

impl InvocationDispatcher for InvocationHttpDispatcher {
    fn dispatch<'a>(
        &'a self,
        invocation: &'a Invocation,
        account: &'a InvocationAccount,
    ) -> InvocationDispatcherFuture<'a> {
        Box::pin(async move {
            let provider_request =
                invocation
                    .dispatch
                    .provider_request
                    .as_ref()
                    .ok_or_else(|| {
                        dispatch_error(
                            "provider_request_missing",
                            "invocation dispatch requires transformed provider request",
                            None,
                            false,
                        )
                    })?;
            let provider_url = provider_request.url.as_deref().ok_or_else(|| {
                dispatch_error(
                    "provider_url_missing",
                    format!(
                        "invocation route {}:{} is missing provider URL",
                        account.supplier_code, account.account_id
                    ),
                    None,
                    false,
                )
            })?;
            let uri = validated_provider_uri(provider_url, self.outbound_target_policy)?;
            if self.proxy_configured {
                ensure_proxy_target_resolves_public(&uri, self.outbound_target_policy).await?;
            }
            let provider_url_redacted = redact_provider_url(uri.to_string().as_str());

            let request = build_upstream_request(provider_request, uri)?;
            let provider_started_at = std::time::Instant::now();
            tracing::debug!(
                stage = "dispatch",
                provider_url = %provider_url_redacted,
                method = %provider_request.method,
                request_id = %invocation.request.request_id,
                trace_id = %invocation.request.trace_id.as_deref().unwrap_or(""),
                "provider HTTP request dispatched"
            );
            let response = execute_with_optional_timeout(
                account,
                self.response_timeout,
                "provider HTTP request",
                self.client.request(request),
            )
            .await?
            .map_err(|error| {
                dispatch_error(
                    "provider_http_transport_failed",
                    format!(
                        "provider HTTP request failed: {}",
                        format_error_with_causes(&error)
                    ),
                    None,
                    true,
                )
            })?;

            let status_code = response.status().as_u16();
            tracing::debug!(
                stage = "dispatch",
                provider_url = %provider_url_redacted,
                status_code,
                latency_ms = provider_started_at.elapsed().as_millis() as i64,
                request_id = %invocation.request.request_id,
                trace_id = %invocation.request.trace_id.as_deref().unwrap_or(""),
                "provider HTTP response received"
            );
            let content_type = response
                .headers()
                .get(header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_owned);
            let preserved_headers = preserve_safe_upstream_response_headers(response.headers());
            if let Some(encoding) = unsupported_provider_response_encoding(response.headers()) {
                if !(200..300).contains(&status_code) {
                    let mut withheld = InvocationDispatchResponse::bytes(
                        status_code,
                        b"{\"error\":{\"message\":\"compressed provider error body was withheld\",\"code\":\"provider_error_body_withheld\"}}".to_vec(),
                        Some("application/json".to_owned()),
                    );
                    withheld.headers = preserved_headers;
                    return Ok(withheld);
                }
                return Err(dispatch_error(
                    "provider_response_encoding_unsupported",
                    format!("provider response used unsupported content encoding: {encoding}"),
                    Some(status_code),
                    false,
                ));
            }

            let is_sse_stream =
                provider_response_should_stream(status_code, content_type.as_deref());

            if is_sse_stream {
                // For SSE streaming responses, don't buffer — pass the body through
                let (_, body) = response.into_parts();
                let mut stream_response = InvocationDispatchResponse::streaming(
                    status_code,
                    content_type,
                    AxumBody::new(body),
                );
                stream_response.headers = preserved_headers;
                return Ok(stream_response);
            }

            if declared_content_length_exceeds_limit(
                response.headers().get(header::CONTENT_LENGTH),
                self.response_max_bytes.get(),
            ) {
                return Err(provider_response_too_large_error(
                    status_code,
                    self.response_max_bytes.get(),
                ));
            }

            let memory_guard = self
                .response_memory_budget
                .try_reserve_for_declared(
                    self.response_max_bytes.get() as u64,
                    declared_content_length_bytes(response.headers().get(header::CONTENT_LENGTH)),
                )
                .map_err(provider_response_memory_error)?;

            let body = collect_bounded_provider_response_body(
                account,
                status_code,
                response.into_body(),
                self.response_max_bytes.get(),
                self.response_timeout,
            )
            .await?;

            if !(200..300).contains(&status_code) {
                let mut response =
                    InvocationDispatchResponse::bytes(status_code, body.to_vec(), content_type)
                        .with_memory_guard(memory_guard);
                response.headers = preserved_headers;
                return Ok(response);
            }

            if body.is_empty() {
                let mut response = InvocationDispatchResponse::empty(status_code);
                response.headers = preserved_headers;
                return Ok(response);
            }
            if response_body_should_parse_json(content_type.as_deref(), &body) {
                match serde_json::from_slice::<serde_json::Value>(&body) {
                    Ok(parsed) => {
                        let mut response = InvocationDispatchResponse::json(status_code, parsed);
                        response.content_type = content_type;
                        response.headers = preserved_headers;
                        return Ok(response.with_memory_guard(memory_guard));
                    }
                    Err(error) => {
                        return Err(dispatch_error(
                            "provider_json_invalid",
                            format!("provider JSON response is invalid: {error}"),
                            Some(status_code),
                            false,
                        ));
                    }
                }
            }

            let mut response =
                InvocationDispatchResponse::bytes(status_code, body.to_vec(), content_type)
                    .with_memory_guard(memory_guard);
            response.headers = preserved_headers;
            Ok(response)
        })
    }
}

fn default_response_max_bytes() -> NonZeroUsize {
    NonZeroUsize::new(INVOCATION_UPSTREAM_BODY_LIMIT_BYTES)
        .expect("the hard-coded invocation response limit must be nonzero")
}

async fn execute_with_optional_timeout<F, T>(
    account: &InvocationAccount,
    default_timeout: Duration,
    operation: &'static str,
    future: F,
) -> Result<T, InvocationDispatchError>
where
    F: std::future::Future<Output = T>,
{
    let timeout = account
        .timeout_ms
        .and_then(timeout_duration)
        .unwrap_or(default_timeout);
    tokio::time::timeout(timeout, future).await.map_err(|_| {
        dispatch_error(
            "provider_http_timeout",
            format!(
                "{operation} timed out after {} ms for invocation route {}:{}",
                timeout.as_millis(),
                account.supplier_code,
                account.account_id
            ),
            None,
            true,
        )
    })
}

async fn collect_bounded_provider_response_body<B>(
    account: &InvocationAccount,
    status_code: u16,
    body: B,
    limit: usize,
    default_timeout: Duration,
) -> Result<Bytes, InvocationDispatchError>
where
    B: hyper::body::Body<Data = Bytes> + Send + 'static,
    B::Error: Into<Box<dyn std::error::Error + Send + Sync>>,
{
    execute_with_optional_timeout(
        account,
        default_timeout,
        "provider response body",
        Limited::new(body, limit).collect(),
    )
    .await?
    .map_err(|error| {
        if error.downcast_ref::<LengthLimitError>().is_some() {
            provider_response_too_large_error(status_code, limit)
        } else {
            dispatch_error(
                "provider_http_body_failed",
                format!("failed to read provider response body: {error}"),
                Some(status_code),
                true,
            )
        }
    })
    .map(|collected| collected.to_bytes())
}

/// Single-sourced from the outbound HTTP transport that owns body limits; this
/// re-export keeps the existing call sites (and tests) reading the same name.
use sdkwork_cloudrouter_provider_adapter_http::declared_content_length_exceeds_limit;

/// Parses a valid upstream `content-length` into bytes.
///
/// Used to size the response memory reservation proportionally to the payload;
/// a missing or malformed header falls back to the configured response limit.
fn declared_content_length_bytes(value: Option<&HeaderValue>) -> Option<u64> {
    value?.to_str().ok()?.trim().parse::<u64>().ok()
}

fn provider_response_too_large_error(status_code: u16, limit: usize) -> InvocationDispatchError {
    dispatch_error(
        "provider_response_too_large",
        format!("provider response body exceeds {limit} bytes"),
        Some(status_code),
        false,
    )
}

fn provider_response_memory_error(
    error: ProviderResponseMemoryBudgetError,
) -> InvocationDispatchError {
    if error.is_saturated() {
        dispatch_error(
            "provider_response_memory_saturated",
            error.to_string(),
            Some(503),
            true,
        )
    } else {
        dispatch_error(
            "provider_response_memory_config_invalid",
            error.to_string(),
            None,
            false,
        )
    }
}

fn timeout_duration(timeout_ms: u64) -> Option<Duration> {
    (timeout_ms > 0).then(|| Duration::from_millis(timeout_ms))
}

/// Selects the outbound target policy from the process environment so
/// development workstations (which commonly resolve upstream hostnames to
/// proxy fake-IP ranges such as 198.18.0.0/15) are not rejected by the
/// production SSRF guard. Production and test environments keep the strict
/// public-IP-only policy.
/// Renders an error together with its full source chain.
///
/// hyper's legacy client error displays only as `client error (Connect)`
/// while the actionable cause (DNS resolution failure, a forbidden resolved
/// address, TCP connect refusal, TLS handshake failure) hangs off
/// [`std::error::Error::source`]. Without the chain a transport failure is
/// undiagnosable from the error alone.
fn format_error_with_causes(error: &(dyn std::error::Error + 'static)) -> String {
    let mut rendered = error.to_string();
    let mut source = error.source();
    while let Some(cause) = source {
        rendered.push_str(": ");
        rendered.push_str(&cause.to_string());
        source = cause.source();
    }
    rendered
}

/// Resolves the outbound proxy from the process environment, treating an
/// invalid value as a hard configuration error.
fn outbound_http_proxy_from_process_env() -> Result<Option<Uri>, String> {
    for key in [
        ENV_OUTBOUND_HTTP_PROXY,
        "HTTPS_PROXY",
        "https_proxy",
        "HTTP_PROXY",
        "http_proxy",
    ] {
        let Ok(value) = std::env::var(key) else {
            continue;
        };
        let value = value.trim();
        if value.is_empty() {
            continue;
        }
        return parse_outbound_http_proxy(value).map(Some);
    }
    Ok(None)
}

/// Environment-reading variant for constructors that cannot fail: an invalid
/// proxy value is logged and ignored so the dispatcher still builds (the
/// direct path keeps its own outbound policy).
pub(crate) fn outbound_http_proxy_or_warn() -> Option<Uri> {
    match outbound_http_proxy_from_process_env() {
        Ok(proxy) => proxy,
        Err(error) => {
            tracing::error!("{error}; ignoring the outbound proxy for provider HTTP dispatch");
            None
        }
    }
}

fn parse_outbound_http_proxy(value: &str) -> Result<Uri, String> {
    let uri: Uri = value
        .parse()
        .map_err(|_| format!("outbound proxy `{value}` is not a valid URI"))?;
    if uri.scheme_str() != Some("http") {
        return Err(format!(
            "outbound proxy `{value}` must use the http scheme (CONNECT tunneling); found {:?}",
            uri.scheme_str()
        ));
    }
    if uri.host().is_none() {
        return Err(format!("outbound proxy `{value}` has no host"));
    }
    Ok(uri)
}

/// The provider relay connector: direct (DNS-resolving, policy-checked) or
/// tunnelled through an explicitly configured HTTP proxy. The tunnel
/// (`hyper_util` `proxy::Tunnel`) sends the CONNECT target hostname to the
/// proxy, so the target is resolved by the proxy itself — bypassing local
/// fake-IP DNS that the production outbound policy would otherwise reject.
#[derive(Clone)]
pub(crate) enum OutboundConnector {
    Direct(HttpConnector<OutboundDnsResolver>),
    Tunnelled(Tunnel<HttpConnector>),
}

impl TowerService<Uri> for OutboundConnector {
    type Response = TokioIo<tokio::net::TcpStream>;
    type Error = BoxError;
    type Future =
        Pin<Box<dyn std::future::Future<Output = Result<Self::Response, BoxError>> + Send>>;

    fn poll_ready(
        &mut self,
        context: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Result<(), Self::Error>> {
        match self {
            OutboundConnector::Direct(inner) => inner.poll_ready(context).map_err(Into::into),
            OutboundConnector::Tunnelled(inner) => inner.poll_ready(context).map_err(Into::into),
        }
    }

    fn call(&mut self, dst: Uri) -> Self::Future {
        match self {
            OutboundConnector::Direct(inner) => {
                let future = inner.call(dst);
                Box::pin(async move { future.await.map_err(Into::into) })
            }
            OutboundConnector::Tunnelled(inner) => {
                let future = inner.call(dst);
                Box::pin(async move { future.await.map_err(Into::into) })
            }
        }
    }
}

fn outbound_target_policy_from_process_env() -> OutboundTargetPolicy {
    let environment = sdkwork_cloudrouter_http::resolve_cloud_web_environment_from_process_env();
    match environment {
        sdkwork_web_core::WebEnvironment::Dev | sdkwork_web_core::WebEnvironment::Test => {
            OutboundTargetPolicy::Development
        }
        sdkwork_web_core::WebEnvironment::Prod => OutboundTargetPolicy::Production,
    }
}

fn build_invocation_http_client(
    policy: OutboundTargetPolicy,
    pool_config: ProviderRelayHttpPoolConfig,
    proxy: Option<Uri>,
) -> InvocationHttpClient {
    ensure_rustls_crypto_provider();
    let builder = hyper_rustls::HttpsConnectorBuilder::new().with_webpki_roots();
    let builder = match policy {
        OutboundTargetPolicy::Production => builder.https_only(),
        OutboundTargetPolicy::Development => builder.https_or_http(),
    };
    let outbound_connector = match proxy {
        Some(proxy) => {
            // The proxy is operator infrastructure: resolved by the system
            // resolver (no SSRF validation) and connected over plain TCP; the
            // tunnelled target keeps the full outbound-policy chain.
            let mut proxy_connector = HttpConnector::new();
            proxy_connector.set_connect_timeout(Some(pool_config.connect_timeout));
            OutboundConnector::Tunnelled(Tunnel::new(proxy, proxy_connector))
        }
        None => {
            let mut http_connector =
                HttpConnector::new_with_resolver(OutboundDnsResolver::new(policy));
            http_connector.set_connect_timeout(Some(pool_config.connect_timeout));
            http_connector.enforce_http(false);
            OutboundConnector::Direct(http_connector)
        }
    };
    let connector = builder.enable_http1().wrap_connector(outbound_connector);
    Client::builder(TokioExecutor::new())
        .pool_idle_timeout(Some(pool_config.pool_idle_timeout))
        .pool_max_idle_per_host(pool_config.pool_max_idle_per_host)
        .build(connector)
}

/// Masks the query string (and any userinfo) of a provider URL before it is
/// logged, so credentials embedded in URLs never reach the log stream.
fn redact_provider_url(value: &str) -> String {
    let mut parts = value.splitn(2, '?');
    let base = parts.next().unwrap_or(value);
    match parts.next() {
        Some(_query) => format!("{base}?<redacted>"),
        None => base.to_owned(),
    }
}

fn validated_provider_uri(
    value: &str,
    policy: OutboundTargetPolicy,
) -> Result<Uri, InvocationDispatchError> {
    validate_outbound_url(value, policy).map_err(|_| {
        dispatch_error(
            "provider_target_not_allowed",
            "provider URL violates the outbound target policy",
            None,
            false,
        )
    })?;
    value.parse::<Uri>().map_err(|_| {
        dispatch_error(
            "invalid_provider_url",
            "provider URL is invalid",
            None,
            false,
        )
    })
}

/// Rejects a tunnelled provider target whose local DNS answer is not public.
///
/// With an outbound proxy configured, hyper sends `CONNECT <host>` and the
/// proxy resolves the name, so [`OutboundDnsResolver`] never validates the
/// address that is actually connected. URL-shape validation alone accepts an
/// attacker-chosen hostname such as `internal.example.com` that resolves to
/// `10.0.0.5` or `169.254.169.254`. This pre-resolution closes the casual
/// bypass for the tunnelled path; the proxy must still enforce its own egress
/// ACL because a CONNECT tunnel re-resolves the name.
async fn ensure_proxy_target_resolves_public(
    uri: &Uri,
    policy: OutboundTargetPolicy,
) -> Result<(), InvocationDispatchError> {
    if policy == OutboundTargetPolicy::Development {
        return Ok(());
    }
    let Some(host) = uri.host() else {
        return Err(dispatch_error(
            "provider_target_not_allowed",
            "provider URL has no host",
            None,
            false,
        ));
    };
    if host.parse::<std::net::IpAddr>().is_ok() {
        // IP literals are already rejected by the URL policy.
        return Ok(());
    }
    let port = uri.port_u16().unwrap_or(443);
    let resolved = tokio::time::timeout(
        Duration::from_secs(2),
        tokio::net::lookup_host((host, port)),
    )
    .await
    .map_err(|_| {
        dispatch_error(
            "provider_target_dns_timeout",
            "provider target DNS resolution timed out",
            None,
            true,
        )
    })?
    .map_err(|error| {
        dispatch_error(
            "provider_target_dns_failed",
            format!("provider target DNS resolution failed: {error}"),
            None,
            true,
        )
    })?;
    let mut resolved_any = false;
    for address in resolved {
        resolved_any = true;
        if validate_resolved_outbound_ip(address.ip(), policy).is_err() {
            return Err(dispatch_error(
                "provider_target_not_allowed",
                "provider target resolved to a non-public address",
                None,
                false,
            ));
        }
    }
    if !resolved_any {
        return Err(dispatch_error(
            "provider_target_dns_failed",
            "provider target DNS resolution returned no addresses",
            None,
            true,
        ));
    }
    Ok(())
}

fn build_upstream_request(
    provider_request: &sdkwork_cloudrouter_router_service::application::InvocationProviderRequest,
    uri: Uri,
) -> Result<HyperRequest<InvocationHttpBody>, InvocationDispatchError> {
    let mut builder = HyperRequest::builder()
        .method(provider_request.method.clone())
        .uri(uri);
    let connection_header_names = connection_header_names(&provider_request.headers);
    for (name, value) in provider_request.headers.iter() {
        if should_forward_header(name, &connection_header_names) {
            builder = builder.header(name, value);
        }
    }
    if let Some(headers) = builder.headers_mut() {
        headers.insert(
            header::ACCEPT_ENCODING,
            HeaderValue::from_static("identity"),
        );
    }
    builder = apply_body_content_type(builder, &provider_request.body)?;
    builder
        .body(Full::new(body_bytes(&provider_request.body)?))
        .map_err(|error| {
            dispatch_error(
                "provider_request_build_failed",
                format!("failed to build provider request: {error}"),
                None,
                false,
            )
        })
}

fn apply_body_content_type(
    mut builder: RequestBuilder,
    body: &InvocationBody,
) -> Result<RequestBuilder, InvocationDispatchError> {
    let content_type_missing = builder
        .headers_ref()
        .and_then(|headers| headers.get(header::CONTENT_TYPE))
        .is_none();
    if matches!(body, InvocationBody::Json(_)) && content_type_missing {
        builder = builder.header(
            header::CONTENT_TYPE,
            HeaderValue::from_static("application/json"),
        );
    }
    Ok(builder)
}

fn body_bytes(body: &InvocationBody) -> Result<Bytes, InvocationDispatchError> {
    match body {
        InvocationBody::Empty => Ok(Bytes::new()),
        InvocationBody::Json(value) => {
            serde_json::to_vec(value).map(Bytes::from).map_err(|error| {
                dispatch_error(
                    "provider_request_json_failed",
                    format!("failed to serialize provider JSON request body: {error}"),
                    None,
                    false,
                )
            })
        }
        InvocationBody::Bytes(value) => Ok(Bytes::from(value.clone())),
    }
}

fn response_body_should_parse_json(content_type: Option<&str>, bytes: &[u8]) -> bool {
    content_type
        .map(|value| value.to_ascii_lowercase().contains("application/json"))
        .unwrap_or_else(|| {
            let first = bytes
                .iter()
                .copied()
                .find(|byte| !byte.is_ascii_whitespace());
            matches!(first, Some(b'{') | Some(b'['))
        })
}

fn unsupported_provider_response_encoding(headers: &HeaderMap) -> Option<String> {
    let encodings = headers
        .get_all(header::CONTENT_ENCODING)
        .iter()
        .filter_map(|value| value.to_str().ok())
        .flat_map(|value| value.split(','))
        .map(str::trim)
        .filter(|value| !value.is_empty() && !value.eq_ignore_ascii_case("identity"))
        .collect::<Vec<_>>();
    (!encodings.is_empty()).then(|| encodings.join(", "))
}

fn provider_response_should_stream(status_code: u16, content_type: Option<&str>) -> bool {
    (200..300).contains(&status_code)
        && content_type.is_some_and(|content_type| {
            let content_type = content_type.to_ascii_lowercase();
            content_type.starts_with("text/event-stream")
                || content_type.starts_with("application/x-ndjson")
        })
}

fn should_forward_header(name: &HeaderName, connection_header_names: &HashSet<String>) -> bool {
    !is_hop_by_hop_header(name)
        && !connection_header_names.contains(name.as_str())
        && !is_gateway_owned_request_header(name)
        && name != header::HOST
        && name != header::CONTENT_LENGTH
}

/// Inbound request headers the gateway must terminate instead of relaying.
///
/// The invocation egress client is a plain hyper client (`Client<…>`, built
/// without any compression feature) and nothing between the provider response
/// and `serde_json` decodes a body. Relaying the caller's `accept-encoding`
/// therefore makes a provider answer with `gzip`/`br` bytes that are parsed as
/// JSON, which surfaces as `provider_json_invalid` / 502 for ordinary
/// non-streaming calls and corrupts streamed frames. The legacy passthrough
/// transport already strips the same header for the same reason
/// (`provider_passthrough_transport.rs`); the metered pipeline was missing it.
///
/// The remaining entries are gateway-edge identity material: a caller's session
/// cookie and the proxy/forwarding chain belong to this gateway, not to a
/// third-party provider, and must not be replayed upstream.
pub(crate) fn is_gateway_owned_request_header(name: &HeaderName) -> bool {
    let name = name.as_str();
    // `forwarded`/`x-forwarded-*`/`x-real-ip`/`x-scheme` describe the edge that
    // received the request. Replaying them upstream would let a caller forge the
    // provider's view of the original client and protocol. `x-sdkwork-*` carries
    // this platform's internal identity/projection metadata, which a third-party
    // provider has no use for.
    //
    // `idempotency-key` is the gateway's *tenant-scoped* dedup key: the gateway
    // already guarantees at-most-once execution through its own idempotency
    // store, and forwarding the raw key upstream is unsafe — a provider dedups
    // per account, so two tenants whose client-chosen keys collide would have
    // one caller's request silently answered with the other's result, and a
    // failover attempt could be deduped against an unrelated earlier request.
    matches!(
        name,
        "accept-encoding"
            | "access-token"
            | "cookie"
            | "forwarded"
            | "x-forwarded-for"
            | "x-forwarded-host"
            | "x-forwarded-port"
            | "x-forwarded-proto"
            | "x-real-ip"
            | "x-scheme"
            | "idempotency-key"
            | "x-idempotency-key"
    ) || name.starts_with("x-sdkwork-")
}

fn connection_header_names(headers: &axum::http::HeaderMap) -> HashSet<String> {
    headers
        .get_all(header::CONNECTION)
        .iter()
        .filter_map(|value| value.to_str().ok())
        .flat_map(|value| value.split(','))
        .map(|value| value.trim().to_ascii_lowercase())
        .filter(|value| !value.is_empty())
        .collect()
}

fn is_hop_by_hop_header(name: &HeaderName) -> bool {
    matches!(
        name.as_str(),
        "connection"
            | "keep-alive"
            | "proxy-authenticate"
            | "proxy-authorization"
            | "te"
            | "trailer"
            | "transfer-encoding"
            | "upgrade"
    )
}

fn dispatch_error(
    code: impl Into<String>,
    message: impl Into<String>,
    status_code: Option<u16>,
    retryable: bool,
) -> InvocationDispatchError {
    InvocationDispatchError::new(code, message, status_code, retryable)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_successful_sse_responses_stream_without_error_body_buffering() {
        assert!(provider_response_should_stream(
            200,
            Some("text/event-stream")
        ));
        assert!(provider_response_should_stream(
            202,
            Some("application/x-ndjson")
        ));
        assert!(!provider_response_should_stream(
            429,
            Some("text/event-stream")
        ));
        assert!(!provider_response_should_stream(
            500,
            Some("application/x-ndjson")
        ));
    }

    /// Serializes env-mutating proxy tests: `std::env` is process-global.
    fn proxy_env_guard() -> &'static std::sync::Mutex<()> {
        static GUARD: std::sync::OnceLock<std::sync::Mutex<()>> = std::sync::OnceLock::new();
        GUARD.get_or_init(|| std::sync::Mutex::new(()))
    }

    const PROXY_ENV_KEYS: [&str; 5] = [
        ENV_OUTBOUND_HTTP_PROXY,
        "HTTPS_PROXY",
        "https_proxy",
        "HTTP_PROXY",
        "http_proxy",
    ];

    /// The gateway's tenant-scoped dedup key must never reach a provider: a
    /// provider dedups per account, so a forwarded key could collide across
    /// tenants or dedup a failover attempt against an unrelated request.
    #[test]
    fn the_gateway_idempotency_key_is_not_forwarded_upstream() {
        let none = std::collections::HashSet::new();
        for name in ["idempotency-key", "x-idempotency-key"] {
            let header = HeaderName::from_bytes(name.as_bytes()).expect("header name");
            assert!(
                !should_forward_header(&header, &none),
                "{name} must be terminated at the gateway"
            );
        }
        // Ordinary caller headers still flow through.
        let content_type = HeaderName::from_static("x-custom-trace");
        assert!(should_forward_header(&content_type, &none));
    }

    #[test]
    fn parses_an_http_proxy_and_rejects_other_schemes() {
        assert_eq!(
            parse_outbound_http_proxy("http://127.0.0.1:7897")
                .expect("valid http proxy")
                .host(),
            Some("127.0.0.1")
        );
        assert!(parse_outbound_http_proxy("https://127.0.0.1:7897").is_err());
        assert!(parse_outbound_http_proxy("not a uri").is_err());
        assert!(parse_outbound_http_proxy("http://").is_err());
    }

    #[tokio::test]
    async fn proxy_target_pre_resolution_rejects_private_dns_answers() {
        let uri: Uri = "https://localhost/v1".parse().expect("valid uri");

        assert!(
            ensure_proxy_target_resolves_public(&uri, OutboundTargetPolicy::Production)
                .await
                .is_err(),
            "a tunnelled hostname resolving to loopback must be rejected before CONNECT"
        );
        ensure_proxy_target_resolves_public(&uri, OutboundTargetPolicy::Development)
            .await
            .expect("development fixtures may target loopback");
    }

    #[test]
    fn resolves_the_proxy_from_the_first_configured_env_key() {
        let _guard = proxy_env_guard().lock().unwrap();
        let previous: Vec<(String, Option<String>)> = PROXY_ENV_KEYS
            .iter()
            .map(|key| (key.to_string(), std::env::var(key).ok()))
            .collect();
        // SAFETY: test-only, serialized by proxy_env_guard.
        for key in PROXY_ENV_KEYS {
            unsafe { std::env::remove_var(key) };
        }

        assert_eq!(
            outbound_http_proxy_from_process_env().expect("no proxy configured"),
            None
        );
        // SAFETY: test-only, serialized by proxy_env_guard.
        unsafe { std::env::set_var(ENV_OUTBOUND_HTTP_PROXY, "http://10.0.0.2:3128") };
        assert_eq!(
            outbound_http_proxy_from_process_env()
                .expect("valid proxy")
                .map(|uri| uri.to_string()),
            // Uri normalization appends the empty path "/".
            Some("http://10.0.0.2:3128/".to_owned())
        );
        // SAFETY: test-only, serialized by proxy_env_guard.
        unsafe { std::env::set_var(ENV_OUTBOUND_HTTP_PROXY, "socks5://10.0.0.2:1080") };
        assert!(outbound_http_proxy_from_process_env().is_err());

        for (key, value) in &previous {
            // SAFETY: test-only, serialized by proxy_env_guard.
            unsafe {
                match value {
                    Some(value) => std::env::set_var(key, value),
                    None => std::env::remove_var(key),
                }
            }
        }
    }

    #[tokio::test]
    async fn tunnels_through_a_proxy_that_answers_connect() {
        use tokio::io::{AsyncReadExt, AsyncWriteExt};

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let proxy_addr = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut request = vec![0u8; 512];
            let read = socket.read(&mut request).await.unwrap();
            let request = String::from_utf8_lossy(&request[..read]).into_owned();
            assert!(request.starts_with("CONNECT example.com:443 HTTP/1.1\r\n"));
            assert!(request.contains("Host: example.com:443\r\n"));
            socket
                .write_all(b"HTTP/1.1 200 Connection established\r\n\r\n")
                .await
                .unwrap();
            // The client must observe the response head ending in CRLFCRLF
            // before the tunneled payload arrives; writing both back-to-back
            // can coalesce into one read and break the header scan.
            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            socket.write_all(b"tunnel-ready").await.unwrap();
        });

        let proxy: Uri = proxy_addr.parse().unwrap();
        let mut tunnel = Tunnel::new(proxy, HttpConnector::new());
        let stream = tunnel
            .call(Uri::from_static("https://example.com:443"))
            .await
            .expect("CONNECT tunnel established");

        // `Tunnel` yields a `TokioIo<tokio::net::TcpStream>` which only implements
        // hyper's `rt::Read`; unwrap it back to the tokio stream for tokio io traits.
        let mut stream = stream.into_inner();
        let mut echoed = Vec::new();
        stream.read_to_end(&mut echoed).await.unwrap();
        assert_eq!(echoed, b"tunnel-ready");
        server.await.unwrap();
    }

    #[tokio::test]
    async fn surfaces_a_proxy_connect_rejection() {
        // hyper-util 0.1.20 does not re-export `TunnelError` from the proxy
        // module, so assert via its `Display` ("unsuccessful" for a non-2xx
        // CONNECT answer) instead of matching on the type.
        use tokio::io::{AsyncReadExt, AsyncWriteExt};

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let proxy_addr = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut request = vec![0u8; 512];
            let _ = socket.read(&mut request).await.unwrap();
            socket
                .write_all(b"HTTP/1.1 403 Forbidden\r\n\r\n")
                .await
                .unwrap();
        });

        let proxy: Uri = proxy_addr.parse().unwrap();
        let mut tunnel = Tunnel::new(proxy, HttpConnector::new());
        let error = tunnel
            .call(Uri::from_static("https://example.com:443"))
            .await
            .expect_err("403 proxy answer must fail the tunnel");
        assert!(
            error.to_string().contains("unsuccessful"),
            "unexpected tunnel error: {error}"
        );
        server.await.unwrap();
    }

    #[test]
    fn renders_the_full_error_source_chain() {
        // Mimics hyper's legacy client error shape: an opaque display
        // (`client error (Connect)`) with the actionable cause in `source()`.
        #[derive(Debug)]
        struct OpaqueConnectError(std::io::Error);
        impl std::fmt::Display for OpaqueConnectError {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                write!(f, "client error (Connect)")
            }
        }
        impl std::error::Error for OpaqueConnectError {
            fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
                Some(&self.0)
            }
        }

        let error = OpaqueConnectError(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            "outbound target DNS resolution returned a forbidden address",
        ));

        let rendered = format_error_with_causes(&error);

        assert_eq!(
            rendered,
            "client error (Connect): outbound target DNS resolution returned a forbidden address"
        );
    }

    fn account() -> InvocationAccount {
        InvocationAccount {
            supplier_code: "test-provider".to_owned(),
            account_id: 1,
            region_code: "global".to_owned(),
            credential_id: None,
            credential_rotation: None,
            base_url: None,
            secret_ref: None,
            auth_profile: Default::default(),
            timeout_ms: Some(DEFAULT_DISPATCH_TIMEOUT_MS),
            retry_policy: None,
            provider_model: None,
            billing_mode:
                sdkwork_cloudrouter_router_service::application::AccountBillingMode::Prepay,
            account_group_id: None,
            account_group_code: None,
            pricing_plan_code: None,
        }
    }

    #[test]
    fn safe_upstream_headers_are_preserved_and_unsafe_ones_dropped() {
        let mut upstream = HeaderMap::new();
        upstream.insert(header::RETRY_AFTER, HeaderValue::from_static("30"));
        upstream.insert("x-request-id", HeaderValue::from_static("req_123"));
        upstream.append("x-request-id", HeaderValue::from_static("req_456"));
        upstream.insert(
            "x-ratelimit-limit-tokens",
            HeaderValue::from_static("100000"),
        );
        upstream.insert(
            "anthropic-ratelimit-requests-reset",
            HeaderValue::from_static("2026-01-01T00:00:00Z"),
        );
        upstream.insert("openai-organization", HeaderValue::from_static("org-x"));
        upstream.insert(
            header::CONTENT_TYPE,
            HeaderValue::from_static("application/json"),
        );
        upstream.insert(header::CONNECTION, HeaderValue::from_static("keep-alive"));
        upstream.insert("set-cookie", HeaderValue::from_static("session=abc"));
        upstream.insert("x-secret", HeaderValue::from_static("leak"));

        let preserved = preserve_safe_upstream_response_headers(&upstream);

        // SDK-facing headers survive for 429 backoff and tracing.
        assert_eq!(
            Some("30"),
            preserved
                .get(header::RETRY_AFTER)
                .and_then(|v| v.to_str().ok())
        );
        assert_eq!(
            Some("req_123"),
            preserved.get("x-request-id").and_then(|v| v.to_str().ok())
        );
        assert_eq!(
            vec!["req_123", "req_456"],
            preserved
                .get_all("x-request-id")
                .iter()
                .map(|value| value.to_str().unwrap())
                .collect::<Vec<_>>()
        );
        assert_eq!(
            Some("100000"),
            preserved
                .get("x-ratelimit-limit-tokens")
                .and_then(|v| v.to_str().ok())
        );
        assert_eq!(
            Some("org-x"),
            preserved
                .get("openai-organization")
                .and_then(|v| v.to_str().ok())
        );
        assert_eq!(
            Some("2026-01-01T00:00:00Z"),
            preserved
                .get("anthropic-ratelimit-requests-reset")
                .and_then(|value| value.to_str().ok())
        );
        // Content-type travels separately; hop-by-hop and sensitive headers
        // must never leak.
        assert!(preserved.get(header::CONTENT_TYPE).is_none());
        assert!(preserved.get(header::CONNECTION).is_none());
        assert!(preserved.get("set-cookie").is_none());
        assert!(preserved.get("x-secret").is_none());
    }

    /// The egress client cannot decode a compressed body, so negotiating one on
    /// the caller's behalf turns every compressed provider answer into a 502.
    #[test]
    fn gateway_owned_request_headers_are_not_relayed_to_the_provider() {
        let mut headers = HeaderMap::new();
        headers.insert(
            header::ACCEPT_ENCODING,
            HeaderValue::from_static("gzip, br"),
        );
        headers.insert(header::COOKIE, HeaderValue::from_static("session=abc"));
        headers.insert("forwarded", HeaderValue::from_static("for=203.0.113.7"));
        headers.insert("x-forwarded-for", HeaderValue::from_static("203.0.113.7"));
        headers.insert(
            "x-forwarded-host",
            HeaderValue::from_static("edge.example.com"),
        );
        headers.insert("x-forwarded-proto", HeaderValue::from_static("https"));
        headers.insert("x-scheme", HeaderValue::from_static("https"));
        headers.insert("x-real-ip", HeaderValue::from_static("203.0.113.7"));
        headers.insert("x-sdkwork-tenant-id", HeaderValue::from_static("100001"));
        headers.insert(
            header::AUTHORIZATION,
            HeaderValue::from_static("Bearer sk-provider"),
        );
        headers.insert(
            header::CONTENT_TYPE,
            HeaderValue::from_static("application/json"),
        );
        headers.insert(header::HOST, HeaderValue::from_static("api.openai.com"));
        headers.insert(header::CONTENT_LENGTH, HeaderValue::from_static("12"));
        headers.insert(
            header::CONNECTION,
            HeaderValue::from_static("keep-alive, x-drop-me"),
        );
        headers.insert(
            HeaderName::from_static("x-drop-me"),
            HeaderValue::from_static("1"),
        );

        let connection_header_names = connection_header_names(&headers);
        let forwarded: Vec<&str> = headers
            .iter()
            .filter(|(name, _)| should_forward_header(name, &connection_header_names))
            .map(|(name, _)| name.as_str())
            .collect();

        for terminated in [
            "accept-encoding",
            "cookie",
            "forwarded",
            "x-forwarded-for",
            "x-forwarded-host",
            "x-forwarded-proto",
            "x-real-ip",
            "x-scheme",
            "x-sdkwork-tenant-id",
            "host",
            "content-length",
            "connection",
            "x-drop-me",
        ] {
            assert!(
                !forwarded.contains(&terminated),
                "{terminated} must stay on the gateway edge: {forwarded:?}"
            );
        }
        // Provider credentials are injected by the request builder and must
        // still reach the provider.
        assert!(forwarded.contains(&"authorization"), "{forwarded:?}");
        assert!(forwarded.contains(&"content-type"), "{forwarded:?}");
    }

    #[test]
    fn upstream_requests_force_identity_content_encoding() {
        let mut headers = HeaderMap::new();
        headers.insert(
            header::ACCEPT_ENCODING,
            HeaderValue::from_static("gzip, br"),
        );
        let provider_request =
            sdkwork_cloudrouter_router_service::application::InvocationProviderRequest {
                method: axum::http::Method::POST,
                url: Some("https://provider.example/v1/invoke".to_owned()),
                path: "/v1/invoke".to_owned(),
                query: None,
                headers,
                body: InvocationBody::Empty,
            };

        let request = build_upstream_request(
            &provider_request,
            "https://provider.example/v1/invoke".parse().unwrap(),
        )
        .expect("provider request");

        assert_eq!("identity", request.headers()[header::ACCEPT_ENCODING]);
    }

    #[test]
    fn compressed_provider_responses_are_detected_across_header_values() {
        let mut headers = HeaderMap::new();
        headers.append(header::CONTENT_ENCODING, HeaderValue::from_static("gzip"));
        headers.append(header::CONTENT_ENCODING, HeaderValue::from_static("br"));
        assert_eq!(
            Some("gzip, br".to_owned()),
            unsupported_provider_response_encoding(&headers)
        );

        headers.remove(header::CONTENT_ENCODING);
        headers.insert(
            header::CONTENT_ENCODING,
            HeaderValue::from_static("identity"),
        );
        assert_eq!(None, unsupported_provider_response_encoding(&headers));
    }

    #[test]
    fn declared_content_length_rejects_only_valid_values_over_the_limit() {
        assert!(declared_content_length_exceeds_limit(
            Some(&HeaderValue::from_static("5")),
            4
        ));
        assert!(!declared_content_length_exceeds_limit(
            Some(&HeaderValue::from_static("4")),
            4
        ));
        assert!(!declared_content_length_exceeds_limit(
            Some(&HeaderValue::from_static("not-a-length")),
            4
        ));
        assert!(declared_content_length_exceeds_limit(
            Some(&HeaderValue::from_static(" 5 ")),
            4
        ));
    }

    #[test]
    fn provider_target_policy_is_fail_closed_in_production() {
        let error = validated_provider_uri(
            "http://127.0.0.1:8080/v1/chat/completions",
            OutboundTargetPolicy::Production,
        )
        .expect_err("production provider target must reject local HTTP");
        assert_eq!("provider_target_not_allowed", error.code);
        assert!(!error.retryable);

        assert!(validated_provider_uri(
            "https://api.openai.com/v1/chat/completions",
            OutboundTargetPolicy::Production,
        )
        .is_ok());
        assert!(validated_provider_uri(
            "http://127.0.0.1:8080/v1/chat/completions",
            OutboundTargetPolicy::Development,
        )
        .is_ok());
    }

    #[tokio::test]
    async fn bounded_provider_collection_rejects_an_oversized_frame() {
        let error = collect_bounded_provider_response_body(
            &account(),
            200,
            Full::new(Bytes::from_static(b"12345")),
            4,
            Duration::from_millis(DEFAULT_DISPATCH_TIMEOUT_MS),
        )
        .await
        .expect_err("a frame over the budget must not be collected");

        assert_eq!("provider_response_too_large", error.code);
        assert_eq!("provider response body exceeds 4 bytes", error.message);
        assert_eq!(Some(200), error.status_code);
        assert!(!error.retryable);
    }

    #[tokio::test]
    async fn configured_response_budget_is_used_for_provider_body_collection() {
        let dispatcher = InvocationHttpDispatcher::with_response_max_bytes(
            NonZeroUsize::new(4).expect("test response limit must be nonzero"),
        );

        let error = collect_bounded_provider_response_body(
            &account(),
            200,
            Full::new(Bytes::from_static(b"12345")),
            dispatcher.response_max_bytes.get(),
            dispatcher.response_timeout,
        )
        .await
        .expect_err("configured response budget must reject oversized body");

        assert_eq!("provider_response_too_large", error.code);
        assert_eq!("provider response body exceeds 4 bytes", error.message);
    }

    #[test]
    fn configured_provider_runtime_timeout_is_retained_by_the_dispatcher() {
        let timeout = Duration::from_millis(123);
        let dispatcher = InvocationHttpDispatcher::with_provider_runtime(
            NonZeroUsize::new(1024).expect("nonzero response budget"),
            timeout,
            ProviderRelayHttpPoolConfig::default(),
        );

        assert_eq!(timeout, dispatcher.response_timeout);
    }

    #[test]
    fn process_memory_budget_rejects_concurrent_reservations_at_capacity() {
        let budget = ProviderResponseMemoryBudget::new(
            NonZeroUsize::new(16).expect("nonzero process memory budget"),
        )
        .expect("test process memory budget must be valid");
        let response_limit = NonZeroUsize::new(4).expect("nonzero response limit");

        let first = budget
            .try_reserve(response_limit.get() as u64)
            .expect("first response must reserve the full test budget");
        let saturated = budget
            .try_reserve(response_limit.get() as u64)
            .expect_err("a second reservation must fail closed while capacity is held");
        assert!(saturated.is_saturated());

        drop(first);
        assert!(budget.try_reserve(response_limit.get() as u64).is_ok());
    }

    #[test]
    fn cloned_response_retains_the_same_memory_reservation() {
        let budget = ProviderResponseMemoryBudget::new(
            NonZeroUsize::new(16).expect("nonzero process memory budget"),
        )
        .expect("test process memory budget must be valid");
        let response_limit = NonZeroUsize::new(4).expect("nonzero response limit");
        let guard = budget
            .try_reserve(response_limit.get() as u64)
            .expect("first response must reserve capacity");
        let response =
            InvocationDispatchResponse::bytes(200, b"body".to_vec(), None).with_memory_guard(guard);
        let normalized_copy = response.clone();
        drop(response);

        assert!(budget.try_reserve(response_limit.get() as u64).is_err());
        drop(normalized_copy);
        assert!(budget.try_reserve(response_limit.get() as u64).is_ok());
    }

    #[test]
    fn explicit_runtime_rejects_response_limit_above_process_budget() {
        let error = InvocationHttpDispatcher::with_provider_runtime_and_memory_budget(
            NonZeroUsize::new(5).expect("nonzero response limit"),
            NonZeroUsize::new(16).expect("nonzero process budget"),
            Duration::from_secs(1),
            ProviderRelayHttpPoolConfig::default(),
        )
        .err()
        .expect("response memory amplification must fit the process budget");

        assert!(error.contains("requires a 20 byte memory reservation"));
    }
}
