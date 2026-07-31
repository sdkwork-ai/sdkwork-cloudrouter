use std::sync::Arc;

use super::{
    BillingMode, DispatchMode, Invocation, InvocationError, InvocationErrorKind, InvocationFuture,
    InvocationInterceptor, InvocationRouteCandidate, InvocationRouteCandidateKind,
    InvocationRoutePlan, InvocationSurface, ResourceType, StickyRouteConstraint,
};
use crate::application::{
    AuthenticatedApiKeyContext, SelectUpstreamAccountRouteQuery, SelectUpstreamModelRouteQuery,
    SelectedUpstreamAccountRoute, SelectedUpstreamModelRoute, UpstreamRouteSelector,
};
use crate::domain::{
    provider_native_model_id, AiModel, BillingMeter, ModelUpstreamRoute, ProviderAuthProfile,
    ResolveModelMappingContext, UpstreamAccountRoute,
};
use crate::ports::UpstreamAccountRouteCatalog;

#[derive(Clone)]
pub struct RoutePlanningInterceptor<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    catalog: Arc<C>,
}

impl<C> RoutePlanningInterceptor<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    pub fn new(catalog: Arc<C>) -> Self {
        Self { catalog }
    }
}

impl<C> InvocationInterceptor for RoutePlanningInterceptor<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    fn name(&self) -> &str {
        "route_planning"
    }

    fn before<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            if invocation.dispatch.mode == DispatchMode::SyntheticLocalResponse {
                return Ok(());
            }
            if invocation.billing.mode == BillingMode::Free
                || invocation.resource.resource_type == ResourceType::FreeEndpoint
            {
                return Ok(());
            }

            if let Some(sticky_route) = invocation.routing.sticky_route.clone() {
                let candidate = sticky_candidate(self.catalog.as_ref(), invocation, sticky_route);
                invocation.routing.route_plan = Some(InvocationRoutePlan::new(vec![candidate]));
                return Ok(());
            }

            let context = authenticated_context(invocation)?;
            if should_plan_model_route(invocation) {
                plan_model_route(self.catalog.as_ref(), invocation, context)
            } else {
                plan_upstream_account_route(self.catalog.as_ref(), invocation, context)
            }
        })
    }
}

fn plan_model_route<C>(
    catalog: &C,
    invocation: &mut Invocation,
    context: AuthenticatedApiKeyContext,
) -> Result<(), InvocationError>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let requested_model = invocation
        .resource
        .requested_model
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| route_error("model route planning requires requested model"))?
        .to_owned();
    let catalog_key = resolve_catalog_key(catalog, invocation, &requested_model)?;
    invocation.resource.requested_model_catalog_key = Some(catalog_key.clone());

    let billing_meter = invocation
        .billing
        .meter
        .clone()
        .unwrap_or(BillingMeter::LlmInputToken);
    let mapping_context = context.clone();
    let plan = UpstreamRouteSelector::new(catalog)
        .select_model_route_plan(SelectUpstreamModelRouteQuery {
            context,
            catalog_key,
            requested_model: requested_model.clone(),
            api_code: invocation.resource.api_code.clone(),
            capability: invocation.resource.capability,
            billing_meter,
        })
        .map_err(|error| route_error(error.to_string()))?;

    invocation.routing.policy_id = plan.policy_id;
    invocation.routing.rule_id = plan.rule_id;
    invocation.routing.route_plan = Some(InvocationRoutePlan::new(
        plan.routes
            .into_iter()
            .map(|selection| {
                mapped_model_candidate(catalog, &requested_model, selection, &mapping_context)
            })
            .collect::<Vec<_>>(),
    ));
    Ok(())
}

fn plan_upstream_account_route<C>(
    catalog: &C,
    invocation: &mut Invocation,
    context: AuthenticatedApiKeyContext,
) -> Result<(), InvocationError>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let selection = UpstreamRouteSelector::new(catalog)
        .select_account_route(SelectUpstreamAccountRouteQuery {
            context,
            route_key: invocation.resource.route_key.clone(),
            api_code: invocation.resource.api_code.clone(),
            capability: invocation.resource.capability,
        })
        .map_err(|error| route_error(error.to_string()))?;

    invocation.routing.policy_id = selection.policy_id;
    invocation.routing.rule_id = selection.rule_id;
    invocation.routing.route_plan =
        Some(InvocationRoutePlan::new(vec![upstream_account_candidate(
            selection, invocation,
        )]));
    Ok(())
}

fn sticky_candidate<C>(
    catalog: &C,
    invocation: &Invocation,
    sticky_route: StickyRouteConstraint,
) -> InvocationRouteCandidate
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let account_route = matching_upstream_account_route(catalog, &sticky_route);
    let group = sticky_route
        .account_group_id
        .and_then(|group_id| catalog.find_upstream_account_group(group_id));
    InvocationRouteCandidate {
        kind: InvocationRouteCandidateKind::Sticky,
        supplier_code: sticky_route.supplier_code.clone(),
        account_id: sticky_route.account_id,
        account_group_id: sticky_route
            .account_group_id
            .or(invocation.subject.account_group_id),
        account_group_code: group
            .as_ref()
            .map(|group| group.code.clone())
            .or_else(|| invocation.subject.account_group_code.clone()),
        pricing_plan_code: group
            .as_ref()
            .map(|group| group.pricing_plan_code.clone())
            .or_else(|| invocation.subject.pricing_plan_code.clone()),
        policy_id: invocation.routing.policy_id,
        rule_id: invocation.routing.rule_id,
        api_code: sticky_route
            .api_code
            .unwrap_or_else(|| invocation.resource.api_code.clone()),
        catalog_key: sticky_route.catalog_key,
        requested_model: invocation.resource.requested_model.clone(),
        provider_model: sticky_provider_model_fallback(
            sticky_route.provider_model.as_deref(),
            invocation,
        ),
        region_code: sticky_route
            .region_code
            .or_else(|| {
                account_route
                    .as_ref()
                    .map(|route| route.region_code.clone())
            })
            .unwrap_or_else(|| "global".to_owned()),
        credential_id: account_route.as_ref().and_then(|route| route.credential_id),
        credential_rotation: account_route
            .as_ref()
            .map(|route| route.credential_rotation.clone()),
        base_url: account_route
            .as_ref()
            .and_then(|route| route.base_url.clone()),
        secret_ref: account_route
            .as_ref()
            .and_then(|route| route.secret_ref.clone()),
        auth_profile: account_route
            .as_ref()
            .map(|route| route.auth_profile.clone())
            .unwrap_or_else(ProviderAuthProfile::default),
        timeout_ms: account_route.as_ref().and_then(|route| route.timeout_ms),
        retry_policy: account_route
            .as_ref()
            .and_then(|route| route.retry_policy.clone()),
    }
}

fn mapped_model_candidate<C>(
    catalog: &C,
    requested_model: &str,
    selection: SelectedUpstreamModelRoute,
    context: &AuthenticatedApiKeyContext,
) -> InvocationRouteCandidate
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let route = &selection.route;
    let account_routes = catalog.shared_upstream_account_routes();
    let account_metadata = find_upstream_account_route_metadata(route, &account_routes);
    let vendor_code = catalog
        .find_model(&route.catalog_key)
        .map(|model| model.vendor_code)
        .unwrap_or_default();
    let account_mapping = catalog.resolve_model_mapping(
        requested_model,
        &ResolveModelMappingContext::new()
            .with_vendor_code(vendor_code.as_str())
            .with_account_id(route.account_id)
            .with_account_code(
                account_metadata
                    .as_ref()
                    .and_then(|route| route.account_code.as_deref())
                    .unwrap_or_default(),
            )
            .with_account_group_id(context.group_id)
            .with_account_group_code(context.group_code.as_str()),
    );
    let catalog_key = route.catalog_key.clone();
    let model = route.model.clone();
    let provider_model = route.provider_model.clone();
    let mut candidate = model_candidate(selection);
    candidate.provider_model = Some(
        account_mapping
            .as_ref()
            .and_then(|rule| rule.effective_provider_model().map(str::to_owned))
            .unwrap_or_else(|| {
                normalized_resolved_provider_model(&catalog_key, &model, &provider_model)
            }),
    );
    candidate
}

fn find_upstream_account_route_metadata(
    model_route: &ModelUpstreamRoute,
    account_routes: &[UpstreamAccountRoute],
) -> Option<UpstreamAccountRoute> {
    let mut candidates = account_routes
        .iter()
        .filter(|route| {
            route.account_id == model_route.account_id
                && route.credential_id == model_route.credential_id
                && route.supplier_code == model_route.supplier_code
                && same_region(&route.region_code, &model_route.region_code)
        })
        .cloned()
        .collect::<Vec<_>>();
    candidates.sort_by_key(|route| {
        (
            route.credential_priority,
            std::cmp::Reverse(route.credential_weight),
            route.credential_id.unwrap_or(i64::MAX),
            route.region_code.clone(),
            route.supplier_code.clone(),
        )
    });
    candidates.into_iter().next()
}

fn normalized_resolved_provider_model(
    catalog_key: &str,
    model: &str,
    provider_model: &str,
) -> String {
    let provider_model = provider_model.trim();
    if provider_model.is_empty() {
        let model = model.trim();
        return if model.is_empty() {
            provider_native_model_id(catalog_key)
        } else {
            model.to_owned()
        };
    }
    let native_model = provider_native_model_id(provider_model);
    if provider_model == catalog_key.trim()
        || (!native_model.is_empty()
            && native_model == model.trim()
            && native_model != provider_model)
    {
        native_model
    } else {
        provider_model.to_owned()
    }
}

fn model_candidate(selection: SelectedUpstreamModelRoute) -> InvocationRouteCandidate {
    let route = selection.route;
    InvocationRouteCandidate {
        kind: InvocationRouteCandidateKind::Model,
        supplier_code: route.supplier_code.clone(),
        account_id: route.account_id,
        account_group_id: Some(selection.group_id),
        account_group_code: Some(selection.group_code),
        pricing_plan_code: Some(selection.pricing_plan_code),
        policy_id: selection.policy_id,
        rule_id: selection.rule_id,
        api_code: route.api_code.clone().unwrap_or_default(),
        catalog_key: Some(route.catalog_key.clone()),
        requested_model: Some(route.model.clone()),
        provider_model: Some(route.provider_model.clone()),
        region_code: route.region_code.clone(),
        credential_id: route.credential_id,
        credential_rotation: Some(route.credential_rotation.clone()),
        base_url: route.base_url.clone(),
        secret_ref: route.secret_ref.clone(),
        auth_profile: route.auth_profile.clone(),
        timeout_ms: route.timeout_ms,
        retry_policy: route.retry_policy.clone(),
    }
}

fn upstream_account_candidate(
    selection: SelectedUpstreamAccountRoute,
    invocation: &Invocation,
) -> InvocationRouteCandidate {
    let route = selection.route;
    InvocationRouteCandidate {
        kind: InvocationRouteCandidateKind::UpstreamAccount,
        supplier_code: route.supplier_code.clone(),
        account_id: route.account_id,
        account_group_id: Some(selection.group_id),
        account_group_code: Some(selection.group_code),
        pricing_plan_code: Some(selection.pricing_plan_code),
        policy_id: selection.policy_id,
        rule_id: selection.rule_id,
        api_code: invocation.resource.api_code.clone(),
        catalog_key: invocation.resource.requested_model_catalog_key.clone(),
        requested_model: invocation.resource.requested_model.clone(),
        provider_model: invocation.resource.provider_native_model.clone(),
        region_code: route.region_code.clone(),
        credential_id: route.credential_id,
        credential_rotation: Some(route.credential_rotation.clone()),
        base_url: route.base_url.clone(),
        secret_ref: route.secret_ref.clone(),
        auth_profile: route.auth_profile.clone(),
        timeout_ms: route.timeout_ms,
        retry_policy: route.retry_policy.clone(),
    }
}

fn authenticated_context(
    invocation: &Invocation,
) -> Result<AuthenticatedApiKeyContext, InvocationError> {
    let api_key_id = invocation
        .subject
        .api_key_id
        .ok_or_else(|| route_error("route planning requires api key context"))?;
    let group_id = invocation
        .subject
        .account_group_id
        .ok_or_else(|| route_error("route planning requires upstream account group context"))?;
    Ok(AuthenticatedApiKeyContext {
        api_key_id,
        tenant_id: invocation.subject.tenant_id,
        organization_id: invocation.subject.organization_id,
        user_id: invocation.subject.user_id,
        api_key_name_snapshot: invocation
            .subject
            .api_key_name_snapshot
            .clone()
            .unwrap_or_default(),
        group_id,
        group_code: invocation
            .subject
            .account_group_code
            .clone()
            .unwrap_or_default(),
        pricing_plan_code: invocation
            .subject
            .pricing_plan_code
            .clone()
            .unwrap_or_default(),
    })
}

fn should_plan_model_route(invocation: &Invocation) -> bool {
    if invocation.resource.surface == InvocationSurface::ProviderNative {
        return false;
    }
    invocation
        .resource
        .model_requirement
        .routes_model_when_present()
        && invocation
            .resource
            .requested_model
            .as_deref()
            .map(str::trim)
            .is_some_and(|value| !value.is_empty())
}

fn resolve_catalog_key<C>(
    catalog: &C,
    invocation: &Invocation,
    requested_model: &str,
) -> Result<String, InvocationError>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    if let Some(catalog_key) = invocation
        .resource
        .requested_model_catalog_key
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        return Ok(catalog_key.to_owned());
    }
    if requested_model.contains('/') && catalog.find_model(requested_model).is_some() {
        return Ok(requested_model.to_owned());
    }
    let mut first_catalog_key = None;
    let mut ambiguous = false;
    catalog.visit_models(None, &mut |model| {
        if !model_matches_requested(model, requested_model) {
            return true;
        }
        if first_catalog_key.is_none() {
            first_catalog_key = Some(model.catalog_key.clone());
            return true;
        }
        ambiguous = true;
        false
    });
    match (first_catalog_key, ambiguous) {
        (Some(catalog_key), false) => Ok(catalog_key),
        (None, _) => Err(route_error(format!(
            "model is not available for route planning: {requested_model}"
        ))),
        (Some(_), true) => Err(route_error(format!(
            "model id is ambiguous for route planning: {requested_model}"
        ))),
    }
}

fn model_matches_requested(model: &AiModel, requested_model: &str) -> bool {
    model.catalog_key == requested_model || model.model == requested_model
}

fn matching_upstream_account_route<C>(
    catalog: &C,
    sticky_route: &StickyRouteConstraint,
) -> Option<UpstreamAccountRoute>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    catalog
        .shared_upstream_account_routes()
        .into_iter()
        .filter(|route| {
            route.supplier_code == sticky_route.supplier_code
                && route.account_id == sticky_route.account_id
                && sticky_route
                    .region_code
                    .as_deref()
                    .map(|region| same_region(&route.region_code, region))
                    .unwrap_or(true)
        })
        .next()
        .cloned()
}

fn same_region(left: &str, right: &str) -> bool {
    normalize_region(left).eq_ignore_ascii_case(&normalize_region(right))
}

fn sticky_provider_model_fallback(
    sticky_provider_model: Option<&str>,
    invocation: &Invocation,
) -> Option<String> {
    let trimmed = sticky_provider_model
        .map(str::trim)
        .filter(|v| !v.is_empty());
    if trimmed.is_some() {
        return trimmed.map(str::to_owned);
    }
    invocation
        .resource
        .provider_native_model
        .clone()
        .or_else(|| invocation.resource.requested_model.clone())
}

fn normalize_region(value: &str) -> String {
    let value = value.trim();
    if value.is_empty() {
        "global".to_owned()
    } else {
        value.to_owned()
    }
}

fn route_error(message: impl Into<String>) -> InvocationError {
    InvocationError::new(InvocationErrorKind::Routing, message)
}
