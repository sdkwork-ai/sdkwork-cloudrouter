use std::sync::Arc;

use serde_json::Value;

use crate::api::openai_invocation::{OpenAiInvocationContext, OpenAiInvocationPluginRef};
use crate::api::openai_runtime::{
    OpenAiRuntimeFailureStrategy, ResolvedOpenAiUpstreamRoute, ResolvedOpenAiUpstreamRoutePlan,
};
use crate::api::openai_usage::OpenAiUsageRecorder;
use crate::application::AuthenticatedApiKeyContext;
use crate::domain::ProviderRetryPolicy;
use crate::ports::GatewayUsageRecorder;

pub(crate) struct OpenAiRelayExecution<'a, C, R> {
    pub usage_recorder: Option<Arc<dyn GatewayUsageRecorder + Send + Sync>>,
    pub usage_recording: Option<Arc<OpenAiUsageRecorder<C>>>,
    pub plugins: &'a [OpenAiInvocationPluginRef],
    pub invocation_context: &'a OpenAiInvocationContext,
    pub context: AuthenticatedApiKeyContext,
    pub route_plan: ResolvedOpenAiUpstreamRoutePlan,
    pub request: R,
    pub failure_strategy: OpenAiRuntimeFailureStrategy,
    pub default_retry_policy: &'a ProviderRetryPolicy,
}

pub(crate) struct OpenAiRouteRelayExecution<'a, C> {
    pub usage_recorder: Option<Arc<dyn GatewayUsageRecorder + Send + Sync>>,
    pub usage_recording: Option<&'a Arc<OpenAiUsageRecorder<C>>>,
    pub plugins: &'a [OpenAiInvocationPluginRef],
    pub invocation_context: &'a OpenAiInvocationContext,
    pub context: &'a AuthenticatedApiKeyContext,
    pub route: &'a ResolvedOpenAiUpstreamRoute,
    pub requested_model: &'a str,
    pub request_body: Value,
    pub failure_strategy: OpenAiRuntimeFailureStrategy,
    pub route_count: usize,
    pub default_retry_policy: &'a ProviderRetryPolicy,
}
