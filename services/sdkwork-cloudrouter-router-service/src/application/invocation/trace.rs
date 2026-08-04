use serde_json::Value;

use super::{
    DispatchMode, Invocation, InvocationError, InvocationFuture, InvocationInterceptor,
    InvocationRouteAttempt,
};

#[derive(Debug, Clone, Default)]
pub struct TraceTelemetryInterceptor;

impl InvocationInterceptor for TraceTelemetryInterceptor {
    fn name(&self) -> &str {
        "trace_telemetry"
    }

    fn observe_pipeline_errors(&self) -> bool {
        true
    }

    fn after<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            update_trace_from_invocation(invocation, None);
            Ok(())
        })
    }

    fn on_error<'a>(
        &'a self,
        invocation: &'a mut Invocation,
        error: &'a InvocationError,
    ) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            update_trace_from_invocation(invocation, Some(error));
            Ok(())
        })
    }
}

fn update_trace_from_invocation(invocation: &mut Invocation, error: Option<&InvocationError>) {
    if let Some(attempt) = invocation.routing.attempted_routes.last().cloned() {
        apply_attempt(invocation, &attempt);
    }
    if let Some(error) = error {
        invocation.telemetry.error_type = Some(error.kind.code().to_owned());
        invocation.telemetry.error_message_masked = Some(mask_error_message(&error.message));
    } else if let Some(response) = invocation.dispatch.response.as_ref() {
        let status_code = effective_status_code(invocation, response);
        if status_code >= 400 {
            invocation.telemetry.error_type = Some(inferred_error_type(status_code));
            invocation.telemetry.provider_error_code = Some(format!("provider_http_{status_code}"));
            invocation.telemetry.error_message_masked = response
                .body
                .as_ref()
                .and_then(effective_error_body)
                .and_then(provider_error_message)
                .map(|message| mask_error_message(&message));
        }
    }
}

fn effective_status_code(
    invocation: &Invocation,
    response: &super::InvocationDispatchResponse,
) -> u16 {
    if invocation.dispatch.mode != DispatchMode::InternalProviderAdapter {
        return response.status_code;
    }
    response
        .body
        .as_ref()
        .and_then(adapter_response_status_code)
        .unwrap_or(response.status_code)
}

fn adapter_response_status_code(body: &Value) -> Option<u16> {
    body.get("statusCode")
        .or_else(|| body.get("status_code"))
        .and_then(Value::as_u64)
        .and_then(|value| u16::try_from(value).ok())
}

fn effective_error_body(body: &Value) -> Option<&Value> {
    body.get("body").or(Some(body))
}

fn apply_attempt(invocation: &mut Invocation, attempt: &InvocationRouteAttempt) {
    invocation.telemetry.latency_ms = attempt.latency_ms;
    if !attempt.success {
        invocation.telemetry.provider_error_code = attempt.error_code.clone();
        invocation.telemetry.error_message_masked = attempt
            .error_message
            .as_ref()
            .map(|message| mask_error_message(message));
    }
}

fn provider_error_message(body: &serde_json::Value) -> Option<String> {
    body.pointer("/error/message")
        .and_then(serde_json::Value::as_str)
        .or_else(|| body.get("message").and_then(serde_json::Value::as_str))
        .map(str::to_owned)
}

fn inferred_error_type(status_code: u16) -> String {
    if status_code >= 500 {
        "server_error".to_owned()
    } else {
        "invalid_request_error".to_owned()
    }
}

fn mask_error_message(message: &str) -> String {
    let mut value = message.trim().replace("sk-", "sk-***");
    if value.chars().count() > 1024 {
        value = value.chars().take(1024).collect::<String>();
        value.push_str("...");
    }
    value
}
