use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;

use serde_json::{json, Value};

use super::{
    OpenAiInvocationContext, OpenAiInvocationEndpoint, OpenAiInvocationPlugin,
    OpenAiInvocationPluginError, OpenAiInvocationPluginFuture, OpenAiUpstreamRoute,
};
use crate::ports::UpstreamAccountRouteCatalog;
use crate::ports::{RoutingDecisionLogRecorder, RoutingDecisionRecordCommand};

/// In-flight route-selection timers keyed by request id so `decision_latency_ms`
/// measures the actual selection time. Entries are consumed by the matching
/// `after_route_selection` / `on_error` hook; the cap bounds memory on
/// concurrent traffic.
const MAX_IN_FLIGHT_DECISION_TIMERS: usize = 10_000;

/// Records the audit-safe route decision for the OpenAI-compatible surface
/// (`/v1/chat/completions`, `/v1/responses`, `/v1/embeddings`) into
/// `ai_routing_decision_log`.
///
/// The plugin is a framework extension point: it observes the selected
/// upstream route and the rejection facts without touching the routing
/// algorithm. The full candidate chain lives in the invocation pipeline
/// interceptor (`RoutingDecisionLogInterceptor`); this plugin records the
/// decision facts visible at this surface (selected route only).
pub struct RoutingDecisionLogPlugin<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    catalog: Arc<C>,
    recorder: Arc<dyn RoutingDecisionLogRecorder + Send + Sync>,
    in_flight: Mutex<HashMap<String, Instant>>,
}

impl<C> RoutingDecisionLogPlugin<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    pub fn new(
        catalog: Arc<C>,
        recorder: Arc<dyn RoutingDecisionLogRecorder + Send + Sync>,
    ) -> Self {
        Self {
            catalog,
            recorder,
            in_flight: Mutex::new(HashMap::new()),
        }
    }

    fn start_timer(&self, request_id: &str) {
        let mut in_flight = self
            .in_flight
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        if in_flight.len() >= MAX_IN_FLIGHT_DECISION_TIMERS {
            return;
        }
        in_flight.insert(request_id.to_owned(), Instant::now());
    }

    fn take_latency_ms(&self, request_id: &str) -> Option<i32> {
        let mut in_flight = self
            .in_flight
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        let started = in_flight.remove(request_id)?;
        let latency = started.elapsed().as_millis().try_into().unwrap_or(i32::MAX);
        Some(latency.clamp(0, i32::MAX))
    }

    async fn record(
        &self,
        context: &OpenAiInvocationContext,
        route: Option<&OpenAiUpstreamRoute>,
        latency_ms: Option<i32>,
    ) {
        let command = decision_command(context, self.catalog.as_ref(), route, latency_ms);
        if let Err(error) = self.recorder.record_routing_decision(command).await {
            tracing::error!(
                tenant_id = context.api_key_context.tenant_id,
                organization_id = context.api_key_context.organization_id,
                user_id = context.api_key_context.user_id,
                request_id = %context.request_id,
                trace_id = context.trace_id.as_deref().unwrap_or_default(),
                error = %error,
                "routing decision log persistence failed for openai invocation"
            );
        }
    }
}

impl<C> OpenAiInvocationPlugin for RoutingDecisionLogPlugin<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    fn before_route_selection<'a>(
        &'a self,
        context: &'a OpenAiInvocationContext,
    ) -> OpenAiInvocationPluginFuture<'a> {
        Box::pin(async move {
            self.start_timer(&context.request_id);
            Ok(())
        })
    }

    fn after_route_selection<'a>(
        &'a self,
        context: &'a OpenAiInvocationContext,
        route: &'a mut OpenAiUpstreamRoute,
    ) -> OpenAiInvocationPluginFuture<'a> {
        Box::pin(async move {
            let latency_ms = self.take_latency_ms(&context.request_id);
            self.record(context, Some(route), latency_ms).await;
            Ok(())
        })
    }

    fn on_error<'a>(
        &'a self,
        context: &'a OpenAiInvocationContext,
        route: Option<&'a OpenAiUpstreamRoute>,
        _error: &'a OpenAiInvocationPluginError,
    ) -> OpenAiInvocationPluginFuture<'a> {
        Box::pin(async move {
            // A selected route already produced a decision record in
            // `after_route_selection`; only rejection facts (no route) belong
            // to the decision log. Relay outcome facts live in the request
            // trace, not here.
            let latency_ms = self.take_latency_ms(&context.request_id);
            if route.is_none() {
                self.record(context, None, latency_ms).await;
            }
            Ok(())
        })
    }
}

fn decision_command<C>(
    context: &OpenAiInvocationContext,
    catalog: &C,
    route: Option<&OpenAiUpstreamRoute>,
    latency_ms: Option<i32>,
) -> RoutingDecisionRecordCommand
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let api_key = &context.api_key_context;
    let (supplier_id, credential_id) = match route {
        Some(route) => resolve_supplier_identity(catalog, &route.supplier_code, route.account_id),
        None => (None, None),
    };
    let capability = capability_for_endpoint(context.endpoint);

    RoutingDecisionRecordCommand {
        request_id: context.request_id.clone(),
        trace_id: context.trace_id.clone(),
        tenant_id: api_key.tenant_id,
        organization_id: api_key.organization_id,
        user_id: (api_key.user_id > 0).then_some(api_key.user_id),
        api_key_id: Some(api_key.api_key_id),
        account_group_id: Some(api_key.group_id),
        account_group_code: Some(api_key.group_code.clone()),
        policy_id: route.and_then(|route| route.policy_id),
        profile_id: None,
        rule_id: route.and_then(|route| route.rule_id),
        requested_model: Some(context.requested_model.clone()),
        resolved_model: route.map(|route| route.provider_model.clone()),
        capability: Some(capability),
        decision_mode: None,
        selected_supplier_id: supplier_id,
        selected_account_id: route.map(|route| route.account_id),
        selected_credential_id: credential_id,
        supplier_code: route.map(|route| route.supplier_code.clone()),
        decision_reason: Some(decision_reason_json(context, route)),
        candidate_snapshot: route.map(redacted_route_json),
        fallback_chain: None,
        decision_latency_ms: latency_ms,
        status: 1,
        metadata: json!({
            "pricingPlanCode": api_key.pricing_plan_code,
            "regionCode": route.map(|route| route.region_code.as_str()).unwrap_or("global"),
            "catalogKey": route.map(|route| route.catalog_key.as_str()).unwrap_or_default(),
            "endpoint": format!("{:?}", context.endpoint),
        }),
    }
}

fn capability_for_endpoint(endpoint: OpenAiInvocationEndpoint) -> i32 {
    match endpoint {
        OpenAiInvocationEndpoint::ChatCompletions | OpenAiInvocationEndpoint::Responses => 1,
        OpenAiInvocationEndpoint::Embeddings => 6,
    }
}

fn resolve_supplier_identity<C>(
    catalog: &C,
    supplier_code: &str,
    account_id: i64,
) -> (Option<i64>, Option<i64>)
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    for route in catalog.shared_upstream_account_routes().iter() {
        if route.supplier_code == supplier_code && route.account_id == account_id {
            return (route.supplier_id, route.credential_id);
        }
    }
    (None, None)
}

fn decision_reason_json(
    context: &OpenAiInvocationContext,
    route: Option<&OpenAiUpstreamRoute>,
) -> Value {
    let mut reason = json!({
        "endpoint": format!("{:?}", context.endpoint),
        "requestedModel": context.requested_model,
        "routeSelected": route.is_some(),
        "stream": context.stream,
    });
    if let Some(route) = route {
        reason["group"] = json!({
            "id": route.group_id,
            "code": route.group_code,
        });
    }
    if route.is_none() {
        reason["error"] = json!({
            "message": "upstream route selection failed or was rejected before dispatch",
        });
    }
    reason
}

fn redacted_route_json(route: &OpenAiUpstreamRoute) -> Value {
    // Audit-safe: ids and codes only. Base URL, secret reference, and auth
    // profile material are deliberately excluded.
    json!({
        "selectedIndex": 0,
        "candidates": [{
            "supplierCode": route.supplier_code,
            "accountId": route.account_id,
            "accountGroupId": route.group_id,
            "accountGroupCode": route.group_code,
            "policyId": route.policy_id,
            "ruleId": route.rule_id,
            "catalogKey": route.catalog_key,
            "providerModel": route.provider_model,
            "regionCode": route.region_code,
            "pricingPlanCode": route.pricing_plan_code,
        }],
    })
}
