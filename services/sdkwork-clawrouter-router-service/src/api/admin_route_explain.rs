use std::sync::Arc;

use axum::body::Bytes;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use crate::api::response::{problem_from_wire_code, success_envelope};
use crate::application::{
    AuthenticatedApiKeyContext, ProviderRouteSelectionErrorKind, ProviderRouteSelector,
    SelectProviderChannelRouteQuery, SelectProviderRouteQuery, SelectedProviderChannelRoute,
    SelectedProviderRoute,
};
use crate::domain::{BillingMeter, ChannelGroup, GatewayApiKey, RoutingCapability};
use crate::ports::PricingCatalog;

struct AdminRouteExplainState<C> {
    catalog: Arc<C>,
}

impl<C> Clone for AdminRouteExplainState<C> {
    fn clone(&self) -> Self {
        Self {
            catalog: Arc::clone(&self.catalog),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminRouteExplainRequest {
    api_key_id: Option<String>,
    channel_group_id: Option<String>,
    resource_code: Option<String>,
    catalog_key: Option<String>,
    model: Option<String>,
    api_code: Option<String>,
    capability: Option<String>,
    billing_meter: Option<String>,
    route_key: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminRouteExplainResponse {
    source: &'static str,
    ready: bool,
    resource_code: String,
    catalog_key: Option<String>,
    model: Option<String>,
    api_code: String,
    capability: String,
    billing_meter: String,
    api_key_id: String,
    channel_group_id: String,
    group_code: String,
    pricing_plan_code: String,
    candidate_count: usize,
    selected_candidates: Vec<AdminRouteExplainCandidateResponse>,
    blocked_reasons: Vec<AdminRouteExplainIssueResponse>,
    warnings: Vec<AdminRouteExplainIssueResponse>,
    policy_id: Option<String>,
    rule_id: Option<String>,
    policy_snapshot_version: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminRouteExplainCandidateResponse {
    kind: &'static str,
    provider_code: String,
    channel_id: String,
    channel_group_id: String,
    channel_group_code: String,
    pricing_plan_code: String,
    policy_id: Option<String>,
    rule_id: Option<String>,
    api_code: String,
    catalog_key: Option<String>,
    requested_model: Option<String>,
    provider_model: Option<String>,
    region_code: String,
    credential_id: Option<String>,
    credential_rotation: Option<String>,
    timeout_ms: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminRouteExplainIssueResponse {
    code: String,
    severity: &'static str,
    message: String,
}

pub fn admin_route_explain_router<C>(catalog: Arc<C>) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    Router::new()
        .route("/backend/v3/api/ai/route_explain", post(explain_route::<C>))
        .with_state(AdminRouteExplainState { catalog })
}

async fn explain_route<C>(State(state): State<AdminRouteExplainState<C>>, body: Bytes) -> Response
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let request = match parse_json_body::<AdminRouteExplainRequest>(&body, "route explain") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let normalized = match normalize_route_explain_request(state.catalog.as_ref(), request) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };

    let selector = ProviderRouteSelector::new(state.catalog.as_ref());
    let result = if let Some(catalog_key) = normalized.catalog_key.clone() {
        selector
            .select_plan(SelectProviderRouteQuery {
                context: normalized.context.clone(),
                catalog_key,
                requested_model: normalized.model.clone().unwrap_or_default(),
                api_code: normalized.api_code.clone(),
                capability: normalized.capability,
                billing_meter: normalized.billing_meter.clone(),
            })
            .map(|plan| {
                let policy_id = plan.policy_id;
                let rule_id = plan.rule_id;
                let candidates = plan
                    .routes
                    .into_iter()
                    .map(to_model_candidate_response)
                    .collect::<Vec<_>>();
                (candidates, policy_id, rule_id)
            })
    } else {
        selector
            .select_channel_route(SelectProviderChannelRouteQuery {
                context: normalized.context.clone(),
                route_key: normalized.route_key.clone(),
                api_code: normalized.api_code.clone(),
                capability: normalized.capability,
            })
            .map(|selection| {
                let policy_id = selection.policy_id;
                let rule_id = selection.rule_id;
                (
                    vec![to_channel_candidate_response(
                        selection,
                        &normalized.api_code,
                    )],
                    policy_id,
                    rule_id,
                )
            })
    };

    let (selected_candidates, policy_id, rule_id, blocked_reasons) = match result {
        Ok((candidates, policy_id, rule_id)) => (candidates, policy_id, rule_id, Vec::new()),
        Err(error) => {
            let issue = route_explain_issue(
                route_explain_error_code(error.kind()),
                "blocking",
                error.to_string(),
            );
            (Vec::new(), None, None, vec![issue])
        }
    };

    Json(success_envelope(AdminRouteExplainResponse {
        source: "runtime_selector",
        ready: blocked_reasons.is_empty(),
        resource_code: normalized.resource_code,
        catalog_key: normalized.catalog_key,
        model: normalized.model,
        api_code: normalized.api_code,
        capability: capability_code(normalized.capability).to_owned(),
        billing_meter: normalized.billing_meter.code().to_owned(),
        api_key_id: normalized.context.api_key_id.to_string(),
        channel_group_id: normalized.context.group_id.to_string(),
        group_code: normalized.context.group_code,
        pricing_plan_code: normalized.context.pricing_plan_code,
        candidate_count: selected_candidates.len(),
        selected_candidates,
        blocked_reasons,
        warnings: Vec::new(),
        policy_id: policy_id.map(|value| value.to_string()),
        rule_id: rule_id.map(|value| value.to_string()),
        policy_snapshot_version: "runtime-catalog-current".to_owned(),
    }))
    .into_response()
}

#[derive(Debug)]
struct NormalizedRouteExplainRequest {
    context: AuthenticatedApiKeyContext,
    resource_code: String,
    catalog_key: Option<String>,
    model: Option<String>,
    api_code: String,
    capability: RoutingCapability,
    billing_meter: BillingMeter,
    route_key: String,
}

fn normalize_route_explain_request<C>(
    catalog: &C,
    request: AdminRouteExplainRequest,
) -> Result<NormalizedRouteExplainRequest, String>
where
    C: PricingCatalog,
{
    let api_key_id = parse_positive_i64(request.api_key_id.as_deref(), "apiKeyId")?;
    let api_key = catalog
        .find_api_key(api_key_id)
        .ok_or_else(|| format!("api key was not found: {api_key_id}"))?;
    let channel_group_id = request
        .channel_group_id
        .as_deref()
        .map(|value| parse_positive_i64(Some(value), "channelGroupId"))
        .transpose()?
        .unwrap_or(api_key.group_id);
    let group = catalog
        .find_channel_group(channel_group_id)
        .ok_or_else(|| format!("channel group was not found: {channel_group_id}"))?;
    ensure_same_scope(&api_key, &group)?;
    let resource_code = normalize_optional_text(request.resource_code.as_deref())
        .or_else(|| normalize_optional_text(request.api_code.as_deref()))
        .or_else(|| normalize_optional_text(request.route_key.as_deref()))
        .ok_or_else(|| "resourceCode is required".to_owned())?;
    let api_code = normalize_optional_text(request.api_code.as_deref())
        .unwrap_or_else(|| normalize_api_code_from_resource(&resource_code));
    let catalog_key = normalize_optional_text(request.catalog_key.as_deref());
    let model = normalize_optional_text(request.model.as_deref()).or_else(|| catalog_key.clone());
    let capability = request
        .capability
        .as_deref()
        .map(parse_capability)
        .transpose()?
        .unwrap_or(RoutingCapability::Chat);
    let billing_meter = request
        .billing_meter
        .as_deref()
        .map(parse_billing_meter)
        .transpose()?
        .unwrap_or(BillingMeter::LlmInputToken);

    Ok(NormalizedRouteExplainRequest {
        context: AuthenticatedApiKeyContext {
            api_key_id: api_key.id,
            tenant_id: api_key.tenant_id,
            organization_id: api_key.organization_id,
            user_id: api_key.user_id,
            api_key_name_snapshot: api_key.display_name(),
            group_id: group.id,
            group_code: group.code,
            pricing_plan_code: group.pricing_plan_code,
        },
        resource_code: resource_code.clone(),
        catalog_key,
        model,
        api_code: api_code.clone(),
        capability,
        billing_meter,
        route_key: normalize_optional_text(request.route_key.as_deref()).unwrap_or(api_code),
    })
}

fn ensure_same_scope(api_key: &GatewayApiKey, group: &ChannelGroup) -> Result<(), String> {
    if api_key.tenant_id == group.tenant_id && api_key.organization_id == group.organization_id {
        return Ok(());
    }
    Err("apiKeyId and channelGroupId must belong to the same tenant and organization".to_owned())
}

fn to_model_candidate_response(
    selection: SelectedProviderRoute,
) -> AdminRouteExplainCandidateResponse {
    let route = selection.route;
    AdminRouteExplainCandidateResponse {
        kind: "model",
        provider_code: route.provider_code,
        channel_id: route.channel_id.to_string(),
        channel_group_id: selection.group_id.to_string(),
        channel_group_code: selection.group_code,
        pricing_plan_code: selection.pricing_plan_code,
        policy_id: selection.policy_id.map(|value| value.to_string()),
        rule_id: selection.rule_id.map(|value| value.to_string()),
        api_code: route.api_code.unwrap_or_default(),
        catalog_key: Some(route.catalog_key),
        requested_model: Some(route.model),
        provider_model: Some(route.provider_model),
        region_code: route.region_code,
        credential_id: route.credential_id.map(|value| value.to_string()),
        credential_rotation: Some(route.credential_rotation),
        timeout_ms: route.timeout_ms,
    }
}

fn to_channel_candidate_response(
    selection: SelectedProviderChannelRoute,
    api_code: &str,
) -> AdminRouteExplainCandidateResponse {
    let route = selection.route;
    AdminRouteExplainCandidateResponse {
        kind: "channel",
        provider_code: route.provider_code,
        channel_id: route.channel_id.to_string(),
        channel_group_id: selection.group_id.to_string(),
        channel_group_code: selection.group_code,
        pricing_plan_code: selection.pricing_plan_code,
        policy_id: selection.policy_id.map(|value| value.to_string()),
        rule_id: selection.rule_id.map(|value| value.to_string()),
        api_code: api_code.to_owned(),
        catalog_key: None,
        requested_model: None,
        provider_model: None,
        region_code: route.region_code,
        credential_id: route.credential_id.map(|value| value.to_string()),
        credential_rotation: Some(route.credential_rotation),
        timeout_ms: route.timeout_ms,
    }
}

fn route_explain_error_code(kind: ProviderRouteSelectionErrorKind) -> &'static str {
    match kind {
        ProviderRouteSelectionErrorKind::ProviderRouteUnavailable => "route.unavailable",
        ProviderRouteSelectionErrorKind::PricingUnavailable => "pricing.unavailable",
    }
}

fn route_explain_issue(
    code: impl Into<String>,
    severity: &'static str,
    message: impl Into<String>,
) -> AdminRouteExplainIssueResponse {
    AdminRouteExplainIssueResponse {
        code: code.into(),
        severity,
        message: message.into(),
    }
}

fn parse_json_body<T>(body: &[u8], entity_name: &str) -> Result<T, String>
where
    T: for<'de> Deserialize<'de>,
{
    if body.iter().all(u8::is_ascii_whitespace) {
        return Err(format!("{entity_name} request body is required"));
    }
    serde_json::from_slice(body)
        .map_err(|error| format!("invalid {entity_name} request body: {error}"))
}

fn parse_positive_i64(value: Option<&str>, field_name: &str) -> Result<i64, String> {
    let value = value
        .and_then(|value| normalize_optional_text(Some(value)))
        .ok_or_else(|| format!("{field_name} is required"))?;
    let id = value
        .parse::<i64>()
        .map_err(|_| format!("{field_name} must be a positive integer"))?;
    if id <= 0 {
        return Err(format!("{field_name} must be a positive integer"));
    }
    Ok(id)
}

fn normalize_optional_text(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn normalize_api_code_from_resource(value: &str) -> String {
    value
        .trim()
        .strip_prefix("api.")
        .unwrap_or(value.trim())
        .to_owned()
}

fn parse_capability(value: &str) -> Result<RoutingCapability, String> {
    match value.trim().to_ascii_lowercase().as_str() {
        "chat" | "llm" | "text" => Ok(RoutingCapability::Chat),
        "image" => Ok(RoutingCapability::Image),
        "audio" | "speech" | "sfx" => Ok(RoutingCapability::Audio),
        "music" => Ok(RoutingCapability::Music),
        "video" => Ok(RoutingCapability::Video),
        "embedding" | "embeddings" => Ok(RoutingCapability::Embedding),
        "rerank" | "ranking" => Ok(RoutingCapability::Rerank),
        "network" | "http" | "api" => Ok(RoutingCapability::Network),
        _ => Err("capability must be one of chat, image, audio, music, video, embedding, rerank, or network".to_owned()),
    }
}

fn capability_code(capability: RoutingCapability) -> &'static str {
    match capability {
        RoutingCapability::Chat => "chat",
        RoutingCapability::Image => "image",
        RoutingCapability::Audio => "audio",
        RoutingCapability::Music => "music",
        RoutingCapability::Video => "video",
        RoutingCapability::Embedding => "embedding",
        RoutingCapability::Rerank => "rerank",
        RoutingCapability::Network => "network",
    }
}

fn parse_billing_meter(value: &str) -> Result<BillingMeter, String> {
    let normalized = value.trim();
    let meter = BillingMeter::from_code(normalized);
    if meter == BillingMeter::Unknown && normalized != BillingMeter::Unknown.code() {
        return Err(format!("billingMeter is not supported: {normalized}"));
    }
    Ok(meter)
}

fn bad_request(message: String) -> Response {
    problem_from_wire_code("4001", message).into_response()
}
