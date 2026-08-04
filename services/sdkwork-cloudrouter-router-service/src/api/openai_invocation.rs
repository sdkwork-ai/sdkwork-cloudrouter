use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::http::{header::USER_AGENT, HeaderMap, StatusCode, Uri};
use axum::response::Response;
use serde_json::Value;

use crate::api::openai_error::openai_error;
use crate::api::request_id::generate_server_request_id;
use crate::application::AuthenticatedApiKeyContext;

pub use super::openai_runtime::ResolvedOpenAiUpstreamRoute as OpenAiUpstreamRoute;

const X_TRACE_ID: &str = "x-trace-id";
const MAX_HTTP_USER_AGENT_LEN: usize = 1024;

pub type OpenAiInvocationPluginFuture<'a> =
    Pin<Box<dyn Future<Output = Result<(), OpenAiInvocationPluginError>> + Send + 'a>>;

pub type OpenAiInvocationPluginRef = Arc<dyn OpenAiInvocationPlugin>;

#[derive(Debug, Clone, Copy, Default)]
pub struct OpenAiBillingSubjectGuardPlugin;

impl OpenAiBillingSubjectGuardPlugin {
    pub fn new() -> Self {
        Self
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OpenAiInvocationEndpoint {
    ChatCompletions,
    Responses,
    Embeddings,
}

#[derive(Debug, Clone, PartialEq)]
pub struct OpenAiInvocationContext {
    pub endpoint: OpenAiInvocationEndpoint,
    pub api_key_context: AuthenticatedApiKeyContext,
    pub requested_model: String,
    pub stream: bool,
    pub request_body: Value,
    pub request_path: String,
    pub http_method: String,
    pub request_id: String,
    pub trace_id: Option<String>,
    pub user_agent: Option<String>,
}

impl OpenAiInvocationContext {
    pub fn new(
        endpoint: OpenAiInvocationEndpoint,
        api_key_context: AuthenticatedApiKeyContext,
        requested_model: impl Into<String>,
        stream: bool,
        request_body: Value,
        headers: &HeaderMap,
        uri: &Uri,
    ) -> Self {
        Self {
            endpoint,
            api_key_context,
            requested_model: requested_model.into(),
            stream,
            request_body,
            request_path: uri.path().to_owned(),
            http_method: "POST".to_owned(),
            request_id: server_generated_request_id(),
            trace_id: header_value(headers, X_TRACE_ID),
            user_agent: header_value(headers, USER_AGENT.as_str())
                .and_then(|value| normalize_user_agent_header(value.as_str())),
        }
    }
}

pub fn normalize_user_agent_header(value: &str) -> Option<String> {
    let sanitized = value
        .chars()
        .map(|character| {
            if character.is_control() {
                ' '
            } else {
                character
            }
        })
        .collect::<String>();
    let compact = sanitized.split_whitespace().collect::<Vec<_>>().join(" ");
    if compact.is_empty() {
        return None;
    }
    Some(compact.chars().take(MAX_HTTP_USER_AGENT_LEN).collect())
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OpenAiInvocationFaultKind {
    RelayTransport,
    RelayInvalidStatus,
    RelayHttpStatus,
    UsageRecording,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OpenAiInvocationFault {
    pub kind: OpenAiInvocationFaultKind,
    pub status_code: Option<u16>,
    pub error_code: String,
    pub message: String,
    pub retryable: bool,
    pub latency_ms: Option<i64>,
}

impl OpenAiInvocationFault {
    pub fn relay_transport(message: impl Into<String>) -> Self {
        Self {
            kind: OpenAiInvocationFaultKind::RelayTransport,
            status_code: None,
            error_code: "provider_relay_failed".to_owned(),
            message: message.into(),
            retryable: true,
            latency_ms: None,
        }
    }

    pub fn relay_invalid_status(message: impl Into<String>) -> Self {
        Self {
            kind: OpenAiInvocationFaultKind::RelayInvalidStatus,
            status_code: None,
            error_code: "provider_relay_invalid_status".to_owned(),
            message: message.into(),
            retryable: true,
            latency_ms: None,
        }
    }

    pub fn relay_http_status(
        status_code: u16,
        retryable: bool,
        message: impl Into<String>,
    ) -> Self {
        Self {
            kind: OpenAiInvocationFaultKind::RelayHttpStatus,
            status_code: Some(status_code),
            error_code: format!("upstream_http_{status_code}"),
            message: message.into(),
            retryable,
            latency_ms: None,
        }
    }

    pub fn usage_recording(message: impl Into<String>) -> Self {
        Self {
            kind: OpenAiInvocationFaultKind::UsageRecording,
            status_code: None,
            error_code: "provider_usage_record_failed".to_owned(),
            message: message.into(),
            retryable: false,
            latency_ms: None,
        }
    }

    pub fn provider_usage_missing(message: impl Into<String>) -> Self {
        Self {
            kind: OpenAiInvocationFaultKind::UsageRecording,
            status_code: None,
            error_code: "provider_usage_missing".to_owned(),
            message: message.into(),
            retryable: false,
            latency_ms: None,
        }
    }

    pub fn with_latency_ms(mut self, latency_ms: i64) -> Self {
        self.latency_ms = Some(latency_ms.max(0));
        self
    }

    pub fn is_retryable(&self) -> bool {
        self.retryable
    }

    pub fn health_http_status(&self) -> Option<i32> {
        self.status_code.map(i32::from)
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct OpenAiInvocationRelayOutcome {
    pub status_code: u16,
    pub streaming: bool,
    pub response_body: Option<Value>,
    pub content_type: Option<String>,
    pub latency_ms: Option<i64>,
}

impl OpenAiInvocationRelayOutcome {
    pub fn json(status_code: u16, response_body: Value) -> Self {
        Self {
            status_code,
            streaming: false,
            response_body: Some(response_body),
            content_type: None,
            latency_ms: None,
        }
    }

    pub fn stream(status_code: u16, content_type: Option<String>) -> Self {
        Self {
            status_code,
            streaming: true,
            response_body: None,
            content_type,
            latency_ms: None,
        }
    }

    pub fn with_latency_ms(mut self, latency_ms: i64) -> Self {
        self.latency_ms = Some(latency_ms.max(0));
        self
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OpenAiInvocationPluginError {
    pub status_code: StatusCode,
    pub code: &'static str,
    pub error_type: &'static str,
    pub message: String,
}

impl OpenAiInvocationPluginError {
    pub fn new(
        status_code: StatusCode,
        code: &'static str,
        error_type: &'static str,
        message: impl Into<String>,
    ) -> Self {
        Self {
            status_code,
            code,
            error_type,
            message: message.into(),
        }
    }

    pub fn into_openai_response(self) -> Response {
        openai_error(self.status_code, self.code, self.error_type, self.message)
    }
}

impl OpenAiInvocationPlugin for OpenAiBillingSubjectGuardPlugin {
    fn before_route_selection<'a>(
        &'a self,
        context: &'a OpenAiInvocationContext,
    ) -> OpenAiInvocationPluginFuture<'a> {
        Box::pin(async move {
            let subject = &context.api_key_context;
            let mut missing = Vec::new();
            if subject.api_key_id <= 0 {
                missing.push("api key");
            }
            if subject.tenant_id <= 0 {
                missing.push("tenant");
            }
            if subject.organization_id <= 0 {
                missing.push("organization");
            }
            if subject.user_id <= 0 {
                missing.push("user");
            }
            if subject.group_id <= 0 {
                missing.push("upstream account group");
            }
            if subject.group_code.trim().is_empty() {
                missing.push("upstream account group code");
            }
            if subject.pricing_plan_code.trim().is_empty() {
                missing.push("pricing plan");
            }
            if missing.is_empty() {
                return Ok(());
            }

            Err(OpenAiInvocationPluginError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                "billing_subject_missing",
                "server_error",
                format!(
                    "OpenAI relay request is missing required billing subject fields: {}",
                    missing.join(", ")
                ),
            ))
        })
    }
}

pub trait OpenAiInvocationPlugin: Send + Sync {
    fn before_route_selection<'a>(
        &'a self,
        _context: &'a OpenAiInvocationContext,
    ) -> OpenAiInvocationPluginFuture<'a> {
        ok_plugin_future()
    }

    fn after_route_selection<'a>(
        &'a self,
        _context: &'a OpenAiInvocationContext,
        _route: &'a mut OpenAiUpstreamRoute,
    ) -> OpenAiInvocationPluginFuture<'a> {
        ok_plugin_future()
    }

    fn before_relay<'a>(
        &'a self,
        _context: &'a OpenAiInvocationContext,
        _route: &'a mut OpenAiUpstreamRoute,
    ) -> OpenAiInvocationPluginFuture<'a> {
        ok_plugin_future()
    }

    fn after_relay<'a>(
        &'a self,
        _context: &'a OpenAiInvocationContext,
        _route: &'a OpenAiUpstreamRoute,
        _outcome: &'a OpenAiInvocationRelayOutcome,
    ) -> OpenAiInvocationPluginFuture<'a> {
        ok_plugin_future()
    }

    fn on_error<'a>(
        &'a self,
        _context: &'a OpenAiInvocationContext,
        _route: Option<&'a OpenAiUpstreamRoute>,
        _error: &'a OpenAiInvocationPluginError,
    ) -> OpenAiInvocationPluginFuture<'a> {
        ok_plugin_future()
    }

    fn on_route_fault<'a>(
        &'a self,
        _context: &'a OpenAiInvocationContext,
        _route: &'a OpenAiUpstreamRoute,
        _fault: &'a OpenAiInvocationFault,
    ) -> OpenAiInvocationPluginFuture<'a> {
        ok_plugin_future()
    }

    fn on_route_success<'a>(
        &'a self,
        _context: &'a OpenAiInvocationContext,
        _route: &'a OpenAiUpstreamRoute,
        _outcome: &'a OpenAiInvocationRelayOutcome,
    ) -> OpenAiInvocationPluginFuture<'a> {
        ok_plugin_future()
    }
}

pub(super) fn with_builtin_invocation_plugins(
    plugins: Vec<OpenAiInvocationPluginRef>,
) -> Vec<OpenAiInvocationPluginRef> {
    let mut invocation_plugins: Vec<OpenAiInvocationPluginRef> =
        Vec::with_capacity(plugins.len().saturating_add(1));
    let builtin_billing_guard: OpenAiInvocationPluginRef =
        Arc::new(OpenAiBillingSubjectGuardPlugin::new());
    invocation_plugins.push(builtin_billing_guard);
    invocation_plugins.extend(plugins);
    invocation_plugins
}

pub(super) async fn notify_before_route_selection(
    plugins: &[OpenAiInvocationPluginRef],
    context: &OpenAiInvocationContext,
) -> Result<(), OpenAiInvocationPluginError> {
    for plugin in plugins {
        plugin.before_route_selection(context).await?;
    }
    Ok(())
}

pub(super) async fn notify_after_route_selection(
    plugins: &[OpenAiInvocationPluginRef],
    context: &OpenAiInvocationContext,
    route: &mut OpenAiUpstreamRoute,
) -> Result<(), OpenAiInvocationPluginError> {
    let selected_route = route.clone();
    for plugin in plugins {
        let result = plugin.after_route_selection(context, route).await;
        let route_was_mutated = *route != selected_route;
        if route_was_mutated {
            *route = selected_route.clone();
        }
        result?;
        if route_was_mutated {
            return Err(upstream_route_mutation_not_allowed());
        }
    }
    Ok(())
}

pub(super) async fn notify_before_relay(
    plugins: &[OpenAiInvocationPluginRef],
    context: &OpenAiInvocationContext,
    route: &mut OpenAiUpstreamRoute,
) -> Result<(), OpenAiInvocationPluginError> {
    let selected_route = route.clone();
    for plugin in plugins {
        let result = plugin.before_relay(context, route).await;
        let route_was_mutated = *route != selected_route;
        if route_was_mutated {
            *route = selected_route.clone();
        }
        result?;
        if route_was_mutated {
            return Err(upstream_route_mutation_not_allowed());
        }
    }
    Ok(())
}

fn upstream_route_mutation_not_allowed() -> OpenAiInvocationPluginError {
    OpenAiInvocationPluginError::new(
        StatusCode::INTERNAL_SERVER_ERROR,
        "upstream_route_mutation_not_allowed",
        "server_error",
        "plugin mutated the selected upstream route; upstream account changes must be configured through upstream account group routing",
    )
}

pub(super) async fn notify_after_relay_observers(
    plugins: &[OpenAiInvocationPluginRef],
    context: &OpenAiInvocationContext,
    route: &OpenAiUpstreamRoute,
    outcome: &OpenAiInvocationRelayOutcome,
) {
    for plugin in plugins {
        if let Err(error) = plugin.after_relay(context, route, outcome).await {
            notify_error(plugins, context, Some(route), &error).await;
            tracing::warn!(
                error_code = error.code,
                error = %error.message,
                status_code = outcome.status_code,
                "openai invocation after_relay observer failed"
            );
        }
    }
}

pub(super) async fn notify_error(
    plugins: &[OpenAiInvocationPluginRef],
    context: &OpenAiInvocationContext,
    route: Option<&OpenAiUpstreamRoute>,
    error: &OpenAiInvocationPluginError,
) {
    for plugin in plugins {
        if let Err(hook_error) = plugin.on_error(context, route, error).await {
            tracing::warn!(
                error_code = hook_error.code,
                error = %hook_error.message,
                "openai invocation plugin error hook failed"
            );
        }
    }
}

pub(super) async fn notify_route_fault(
    plugins: &[OpenAiInvocationPluginRef],
    context: &OpenAiInvocationContext,
    route: &OpenAiUpstreamRoute,
    fault: &OpenAiInvocationFault,
) {
    for plugin in plugins {
        if let Err(error) = plugin.on_route_fault(context, route, fault).await {
            tracing::warn!(
                error_code = error.code,
                error = %error.message,
                supplier_code = route.supplier_code,
                account_id = route.account_id,
                "openai invocation route fault hook failed"
            );
        }
    }
}

pub(super) async fn notify_route_success(
    plugins: &[OpenAiInvocationPluginRef],
    context: &OpenAiInvocationContext,
    route: &OpenAiUpstreamRoute,
    outcome: &OpenAiInvocationRelayOutcome,
) {
    for plugin in plugins {
        if let Err(error) = plugin.on_route_success(context, route, outcome).await {
            tracing::warn!(
                error_code = error.code,
                error = %error.message,
                supplier_code = route.supplier_code,
                account_id = route.account_id,
                status_code = outcome.status_code,
                "openai invocation route success hook failed"
            );
        }
    }
}

fn ok_plugin_future<'a>() -> OpenAiInvocationPluginFuture<'a> {
    Box::pin(async { Ok(()) })
}

fn server_generated_request_id() -> String {
    generate_server_request_id().unwrap_or_else(|error| {
        tracing::warn!(
            error = ?error,
            "failed to generate canonical OpenAI invocation request id; falling back to server-local id"
        );
        fallback_server_request_id()
    })
}

fn fallback_server_request_id() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    format!("openai-invocation-{nanos}")
}

fn header_value(headers: &HeaderMap, name: &str) -> Option<String> {
    headers
        .get(name)
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

#[cfg(test)]
mod tests {
    use axum::http::{HeaderMap, HeaderValue, Uri};
    use serde_json::json;

    use super::{OpenAiInvocationContext, OpenAiInvocationEndpoint};
    use crate::application::AuthenticatedApiKeyContext;

    #[test]
    fn openai_invocation_context_ignores_client_request_id_header() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "x-request-id",
            HeaderValue::from_static("client-request-id"),
        );
        headers.insert("x-trace-id", HeaderValue::from_static("client-trace-id"));
        let uri: Uri = "/v1/chat/completions".parse().unwrap();

        let context = OpenAiInvocationContext::new(
            OpenAiInvocationEndpoint::ChatCompletions,
            authenticated_api_key_context(),
            "gpt-4o-mini",
            false,
            json!({"model": "gpt-4o-mini"}),
            &headers,
            &uri,
        );

        assert_ne!("client-request-id", context.request_id);
        assert!(is_uuid(&context.request_id));
        assert_eq!(Some("client-trace-id"), context.trace_id.as_deref());
    }

    #[test]
    fn openai_invocation_context_captures_normalized_user_agent_header() {
        let mut headers = HeaderMap::new();
        headers.insert(
            axum::http::header::USER_AGENT,
            HeaderValue::from_static(
                " Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0 ",
            ),
        );
        let uri: Uri = "/v1/chat/completions".parse().unwrap();

        let context = OpenAiInvocationContext::new(
            OpenAiInvocationEndpoint::ChatCompletions,
            authenticated_api_key_context(),
            "gpt-4o-mini",
            false,
            json!({"model": "gpt-4o-mini"}),
            &headers,
            &uri,
        );

        assert_eq!(
            Some("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0"),
            context.user_agent.as_deref()
        );
    }

    fn authenticated_api_key_context() -> AuthenticatedApiKeyContext {
        AuthenticatedApiKeyContext {
            api_key_id: 101,
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            api_key_name_snapshot: "sk-live".to_owned(),
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
        }
    }

    fn is_uuid(value: &str) -> bool {
        let bytes = value.as_bytes();
        bytes.len() == 36
            && bytes.iter().enumerate().all(|(index, byte)| {
                matches!(index, 8 | 13 | 18 | 23) && *byte == b'-'
                    || !matches!(index, 8 | 13 | 18 | 23) && byte.is_ascii_hexdigit()
            })
            && bytes.get(14) == Some(&b'4')
            && matches!(bytes.get(19), Some(b'8' | b'9' | b'a' | b'b'))
    }
}
