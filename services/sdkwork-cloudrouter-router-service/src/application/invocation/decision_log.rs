use std::sync::Arc;

use serde_json::{json, Value};

use super::{
    Invocation, InvocationError, InvocationFuture, InvocationInterceptor, InvocationRouteCandidate,
    InvocationRouteCandidateKind,
};
use crate::domain::provider_native_model_id;
use crate::ports::UpstreamAccountRouteCatalog;
use crate::ports::{RoutingDecisionLogRecorder, RoutingDecisionRecordCommand};

/// Records the audit-safe route decision facts (`ai_routing_decision_log`)
/// declared by PRD-UPSTREAM-SUPPLIER "API Request Lifecycle" step 8 and
/// TECH `group-account-pool-routing` §8.
///
/// Runs after dispatch (and after usage recording) so the record captures the
/// resolved account, the actual attempt chain, and the measured latency. On
/// pipeline errors the rejection facts are recorded instead — the decision log
/// keeps one row per (tenant, organization, request_id) thanks to the unique
/// index and the recorder's upsert semantics.
pub struct RoutingDecisionLogInterceptor<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    catalog: Arc<C>,
    recorder: Arc<dyn RoutingDecisionLogRecorder + Send + Sync>,
}

impl<C> RoutingDecisionLogInterceptor<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    pub fn new(
        catalog: Arc<C>,
        recorder: Arc<dyn RoutingDecisionLogRecorder + Send + Sync>,
    ) -> Self {
        Self { catalog, recorder }
    }
}

impl<C> InvocationInterceptor for RoutingDecisionLogInterceptor<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    fn name(&self) -> &str {
        "routing_decision_log"
    }

    fn observe_pipeline_errors(&self) -> bool {
        true
    }

    fn after<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            self.record(invocation, None).await;
            Ok(())
        })
    }

    fn on_error<'a>(
        &'a self,
        invocation: &'a mut Invocation,
        error: &'a InvocationError,
    ) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            self.record(invocation, Some(error)).await;
            Ok(())
        })
    }
}

impl<C> RoutingDecisionLogInterceptor<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    async fn record(&self, invocation: &Invocation, error: Option<&InvocationError>) {
        if !has_decision_facts(invocation) && error.is_none() {
            // Bookkeeping calls that never reached route planning (no policy,
            // rule, or plan) produce no decision facts worth auditing.
            return;
        }
        let command = decision_command_from_invocation(self.catalog.as_ref(), invocation, error);
        if let Err(recording_error) = self.recorder.record_routing_decision(command).await {
            observe_recording_failure(invocation, &recording_error);
        }
    }
}

fn has_decision_facts(invocation: &Invocation) -> bool {
    invocation.routing.policy_id.is_some()
        || invocation.routing.rule_id.is_some()
        || invocation.routing.route_plan.is_some()
}

fn observe_recording_failure(invocation: &Invocation, error: &crate::domain::DomainError) {
    tracing::error!(
        tenant_id = invocation.subject.tenant_id,
        organization_id = invocation.subject.organization_id,
        user_id = invocation.subject.user_id,
        request_id = %invocation.request.request_id,
        trace_id = invocation.request.trace_id.as_deref().unwrap_or_default(),
        error = %error,
        "routing decision log persistence failed after invocation processing"
    );
}

fn decision_command_from_invocation<C>(
    catalog: &C,
    invocation: &Invocation,
    error: Option<&InvocationError>,
) -> RoutingDecisionRecordCommand
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let account = invocation.account.as_ref();
    let candidate = invocation
        .routing
        .route_plan
        .as_ref()
        .and_then(|plan| plan.current_candidate());
    let catalog_key = invocation
        .resource
        .requested_model_catalog_key
        .clone()
        .unwrap_or_else(|| invocation.resource.route_key.clone());
    let requested_model = invocation
        .resource
        .requested_model
        .clone()
        .or_else(|| invocation.resource.provider_native_model.clone())
        .or_else(|| model_from_catalog_key(&catalog_key));
    let resolved_model = account
        .and_then(|account| account.provider_model.clone())
        .filter(|value| !value.trim().is_empty())
        .or_else(|| candidate.and_then(|candidate| candidate.provider_model.clone()))
        .filter(|value| !value.trim().is_empty())
        .or_else(|| invocation.resource.provider_native_model.clone())
        .filter(|value| !value.trim().is_empty())
        .map(|value| provider_native_model_id(value.trim()));
    let supplier_code = account
        .map(|account| account.supplier_code.clone())
        .or_else(|| candidate.map(|candidate| candidate.supplier_code.clone()));
    let account_id = account
        .map(|account| account.account_id)
        .or_else(|| candidate.map(|candidate| candidate.account_id));
    let (supplier_id, credential_id) = match (supplier_code.as_deref(), account_id) {
        (Some(supplier_code), Some(account_id)) => resolve_supplier_identity(
            catalog,
            supplier_code,
            account_id,
            account.and_then(|account| account.credential_id),
        ),
        _ => (None, None),
    };
    let latency_ms = invocation
        .routing
        .attempted_routes
        .last()
        .and_then(|attempt| attempt.latency_ms)
        .map(|value| value.clamp(0, i64::from(i32::MAX)) as i32);

    RoutingDecisionRecordCommand {
        request_id: invocation.request.request_id.clone(),
        trace_id: invocation.request.trace_id.clone(),
        tenant_id: invocation.subject.tenant_id,
        organization_id: invocation.subject.organization_id,
        user_id: positive_id(invocation.subject.user_id),
        api_key_id: invocation.subject.api_key_id,
        account_group_id: account
            .and_then(|account| account.account_group_id)
            .or(invocation.subject.account_group_id),
        account_group_code: account
            .and_then(|account| account.account_group_code.clone())
            .or_else(|| invocation.subject.account_group_code.clone()),
        policy_id: invocation.routing.policy_id,
        profile_id: None,
        rule_id: invocation.routing.rule_id,
        requested_model,
        resolved_model,
        capability: Some(invocation.resource.capability.code()),
        decision_mode: Some(invocation.routing.strategy.code()),
        selected_supplier_id: supplier_id,
        selected_account_id: account_id,
        selected_credential_id: credential_id,
        supplier_code,
        decision_reason: Some(decision_reason_json(invocation, error)),
        candidate_snapshot: candidate_snapshot_json(invocation),
        fallback_chain: fallback_chain_json(invocation),
        decision_latency_ms: latency_ms,
        status: 1,
        metadata: decision_metadata_json(invocation),
    }
}

fn positive_id(value: i64) -> Option<i64> {
    (value > 0).then_some(value)
}

fn resolve_supplier_identity<C>(
    catalog: &C,
    supplier_code: &str,
    account_id: i64,
    candidate_credential_id: Option<i64>,
) -> (Option<i64>, Option<i64>)
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let mut supplier_id = None;
    let mut credential_id = candidate_credential_id;
    for route in catalog.shared_upstream_account_routes().iter() {
        if route.supplier_code != supplier_code || route.account_id != account_id {
            continue;
        }
        supplier_id = route.supplier_id;
        if credential_id.is_none() {
            credential_id = route.credential_id;
        }
        break;
    }
    (supplier_id, credential_id)
}

fn decision_reason_json(invocation: &Invocation, error: Option<&InvocationError>) -> Value {
    let mut reason = json!({
        "strategy": invocation.routing.strategy.code(),
        "failureStrategy": invocation.routing.failure_strategy.code(),
        "routePlanned": invocation.routing.route_plan.is_some(),
        "apiCode": invocation.resource.api_code,
        "catalogKey": invocation.resource.requested_model_catalog_key
            .clone()
            .unwrap_or_else(|| invocation.resource.route_key.clone()),
    });
    if let Some(sticky) = invocation.routing.sticky.as_ref() {
        reason["sticky"] = json!({
            "mode": format!("{:?}", sticky.mode),
            "objectType": sticky.object_type,
            "objectId": sticky.object_id,
        });
    }
    if let Some(error) = error {
        reason["error"] = json!({
            "kind": error.kind.code(),
            "message": mask_error_message(&error.message),
        });
    }
    reason
}

fn candidate_snapshot_json(invocation: &Invocation) -> Option<Value> {
    let plan = invocation.routing.route_plan.as_ref()?;
    if plan.candidates.is_empty() {
        return None;
    }
    Some(json!({
        "selectedIndex": plan.selected_index,
        "candidates": plan
            .candidates
            .iter()
            .map(redacted_candidate_json)
            .collect::<Vec<_>>(),
    }))
}

fn redacted_candidate_json(candidate: &InvocationRouteCandidate) -> Value {
    // Audit-safe: ids and codes only. Base URL, secret reference, and auth
    // profile material are deliberately excluded.
    json!({
        "kind": redacted_kind(candidate.kind.clone()),
        "supplierCode": candidate.supplier_code,
        "accountId": candidate.account_id,
        "accountGroupId": candidate.account_group_id,
        "accountGroupCode": candidate.account_group_code,
        "policyId": candidate.policy_id,
        "ruleId": candidate.rule_id,
        "apiCode": candidate.api_code,
        "catalogKey": candidate.catalog_key,
        "requestedModel": candidate.requested_model,
        "providerModel": candidate.provider_model,
        "regionCode": candidate.region_code,
        "credentialId": candidate.credential_id,
        "pricingPlanCode": candidate.pricing_plan_code,
    })
}

fn redacted_kind(kind: InvocationRouteCandidateKind) -> &'static str {
    match kind {
        InvocationRouteCandidateKind::Model => "model",
        InvocationRouteCandidateKind::UpstreamAccount => "upstream_account",
        InvocationRouteCandidateKind::Sticky => "sticky",
    }
}

fn fallback_chain_json(invocation: &Invocation) -> Option<Value> {
    let attempts = &invocation.routing.attempted_routes;
    if !attempts.is_empty() {
        return Some(json!({
            "source": "attempts",
            "routes": attempts
                .iter()
                .map(|attempt| {
                    json!({
                        "supplierCode": attempt.supplier_code,
                        "accountId": attempt.account_id,
                        "candidateIndex": attempt.candidate_index,
                        "success": attempt.success,
                        "retryable": attempt.retryable,
                        "statusCode": attempt.status_code,
                        "errorCode": attempt.error_code,
                        "errorMessage": attempt
                            .error_message
                            .as_deref()
                            .map(mask_error_message),
                        "latencyMs": attempt.latency_ms,
                    })
                })
                .collect::<Vec<_>>(),
        }));
    }
    // No attempts yet (e.g. route selection rejection): the planned chain is
    // the ordered candidates after the selected one under failover.
    let plan = invocation.routing.route_plan.as_ref()?;
    if plan.candidates.len() <= plan.selected_index + 1 {
        return None;
    }
    Some(json!({
        "source": "planned",
        "routes": plan
            .candidates
            .iter()
            .skip(plan.selected_index + 1)
            .map(redacted_candidate_json)
            .collect::<Vec<_>>(),
    }))
}

fn decision_metadata_json(invocation: &Invocation) -> Value {
    json!({
        "pricingPlanCode": invocation.subject.pricing_plan_code,
        "regionCode": invocation
            .account
            .as_ref()
            .map(|account| account.region_code.as_str())
            .unwrap_or("global"),
        "routeKey": invocation.resource.route_key,
    })
}

fn model_from_catalog_key(catalog_key: &str) -> Option<String> {
    catalog_key
        .split_once('/')
        .map(|(_, model)| model.to_owned())
}

fn mask_error_message(message: &str) -> String {
    let mut value = message.trim().replace("sk-", "sk-***");
    if value.chars().count() > 1024 {
        value = value.chars().take(1024).collect::<String>();
        value.push_str("...");
    }
    value
}
