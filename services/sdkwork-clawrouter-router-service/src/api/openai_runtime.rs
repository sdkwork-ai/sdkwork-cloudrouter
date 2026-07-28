use axum::http::StatusCode;
use axum::response::Response;
use sdkwork_claw_http::ApiKeyIdentity;

use crate::api::openai_error::openai_error;
use crate::application::{
    ApiKeyAuthenticator, ApiKeySecretHasher, AuthenticateApiKeyQuery, AuthenticatedApiKeyContext,
    ProviderRouteSelectionError, ProviderRouteSelectionErrorKind, ProviderRouteSelector,
    SelectProviderRouteQuery, SelectedProviderRoute,
};
use crate::domain::{
    AiModel, BillingMeter, ModelMappingRule, ProviderAuthProfile, ProviderRetryPolicy,
    ResolveModelMappingContext, RoutingCapability,
};
use crate::ports::PricingCatalog;

pub(crate) type OpenAiRouteError = Box<Response>;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResolvedOpenAiProviderRoute {
    pub catalog_key: String,
    pub policy_id: Option<i64>,
    pub rule_id: Option<i64>,
    pub group_id: i64,
    pub group_code: String,
    pub pricing_plan_code: String,
    pub supplier_code: String,
    pub region_code: String,
    pub account_id: i64,
    pub provider_model: String,
    pub provider_base_url: Option<String>,
    pub provider_secret_ref: Option<String>,
    pub provider_auth_profile: ProviderAuthProfile,
    pub provider_timeout_ms: Option<u64>,
    pub provider_retry_policy: Option<ProviderRetryPolicy>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResolvedOpenAiProviderRoutePlan {
    pub catalog_key: String,
    pub routes: Vec<ResolvedOpenAiProviderRoute>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OpenAiRuntimeFailureStrategy {
    Failover,
    FailClosed,
}

impl OpenAiRuntimeFailureStrategy {
    pub fn should_try_next_route(self, is_last_route: bool) -> bool {
        matches!(self, Self::Failover) && !is_last_route
    }
}

impl Default for OpenAiRuntimeFailureStrategy {
    fn default() -> Self {
        Self::Failover
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OpenAiRuntimeRouteConfig {
    pub default_retry_policy: ProviderRetryPolicy,
    pub failure_strategy: OpenAiRuntimeFailureStrategy,
}

impl OpenAiRuntimeRouteConfig {
    pub fn new(
        default_retry_policy: ProviderRetryPolicy,
        failure_strategy: OpenAiRuntimeFailureStrategy,
    ) -> Self {
        Self {
            default_retry_policy,
            failure_strategy,
        }
    }
}

impl Default for OpenAiRuntimeRouteConfig {
    fn default() -> Self {
        Self {
            default_retry_policy: ProviderRetryPolicy::default(),
            failure_strategy: OpenAiRuntimeFailureStrategy::default(),
        }
    }
}

pub(super) fn authenticate_api_key<C>(
    catalog: &C,
    api_key_hasher: &(dyn ApiKeySecretHasher + Send + Sync),
    identity: &ApiKeyIdentity,
) -> Result<AuthenticatedApiKeyContext, OpenAiRouteError>
where
    C: PricingCatalog,
{
    let Some(credential_secret) = identity.credential_secret() else {
        return Err(Box::new(openai_error(
            StatusCode::UNAUTHORIZED,
            "invalid_api_key",
            "invalid_request_error",
            "missing api key credential",
        )));
    };
    let authenticator = ApiKeyAuthenticator::new(catalog, api_key_hasher);
    authenticator
        .authenticate(AuthenticateApiKeyQuery { credential_secret })
        .map_err(|_| {
            Box::new(openai_error(
                StatusCode::UNAUTHORIZED,
                "invalid_api_key",
                "invalid_request_error",
                "api key credential is invalid",
            ))
        })
}

pub(super) fn find_catalog_model<C>(catalog: &C, model: &str) -> Result<AiModel, OpenAiRouteError>
where
    C: PricingCatalog,
{
    let model = model.trim();
    if let Some(catalog_model) = catalog.find_model(model) {
        return Ok(catalog_model);
    }

    let matches = catalog
        .list_models(None)
        .into_iter()
        .filter(|candidate| candidate.model == model)
        .collect::<Vec<_>>();
    match matches.as_slice() {
        [] => Err(model_not_found(model)),
        [model] => Ok(model.clone()),
        _ => Err(Box::new(openai_error(
            StatusCode::BAD_REQUEST,
            "ambiguous_model",
            "invalid_request_error",
            format!(
                "model id is ambiguous: {model}. Use one of these catalog keys: {}",
                matches
                    .iter()
                    .map(|candidate| candidate.catalog_key.as_str())
                    .collect::<Vec<_>>()
                    .join(", ")
            ),
        ))),
    }
}

fn model_not_found(model: &str) -> OpenAiRouteError {
    Box::new(openai_error(
        StatusCode::NOT_FOUND,
        "model_not_found",
        "invalid_request_error",
        format!("model is not available: {model}"),
    ))
}

pub(super) fn ensure_model_capability(
    model: &AiModel,
    accepted_capabilities: &[&str],
    capability_label: &str,
) -> Result<(), OpenAiRouteError> {
    let supported = model.capabilities.iter().any(|capability| {
        let normalized = capability.trim().to_ascii_lowercase();
        accepted_capabilities
            .iter()
            .any(|accepted| normalized == *accepted)
    });
    if supported {
        return Ok(());
    }
    Err(Box::new(openai_error(
        StatusCode::BAD_REQUEST,
        "model_capability_not_supported",
        "invalid_request_error",
        format!("model does not support {capability_label}: {}", model.model),
    )))
}

#[allow(dead_code)]
pub(super) fn resolve_openai_provider_route<C>(
    catalog: &C,
    context: &AuthenticatedApiKeyContext,
    model: &str,
    accepted_capabilities: &[&str],
    capability_label: &str,
    capability: RoutingCapability,
    billing_meter: BillingMeter,
) -> Result<ResolvedOpenAiProviderRoute, OpenAiRouteError>
where
    C: PricingCatalog,
{
    Ok(resolve_openai_provider_route_plan(
        catalog,
        context,
        model,
        accepted_capabilities,
        capability_label,
        capability,
        billing_meter,
    )?
    .first_route()
    .ok_or_else(|| {
        openai_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "route_plan_empty",
            "internal_error",
            "resolved route plan contains no routes",
        )
    })?)
}

pub(crate) fn resolve_openai_provider_route_plan<C>(
    catalog: &C,
    context: &AuthenticatedApiKeyContext,
    model: &str,
    accepted_capabilities: &[&str],
    capability_label: &str,
    capability: RoutingCapability,
    billing_meter: BillingMeter,
) -> Result<ResolvedOpenAiProviderRoutePlan, OpenAiRouteError>
where
    C: PricingCatalog,
{
    let global_mapping = catalog.resolve_model_mapping(model, &ResolveModelMappingContext::new());
    let global_effective_model = global_mapping
        .as_ref()
        .map(ModelMappingRule::effective_catalog_key)
        .unwrap_or(model);
    let global_catalog_model = find_catalog_model(catalog, global_effective_model)?;
    let vendor_mapping = catalog.resolve_model_mapping(
        model,
        &ResolveModelMappingContext::new()
            .with_vendor_code(global_catalog_model.vendor_code.as_str()),
    );
    let effective_model = vendor_mapping
        .as_ref()
        .or(global_mapping.as_ref())
        .map(ModelMappingRule::effective_catalog_key)
        .unwrap_or(global_effective_model);
    let catalog_model = if effective_model == global_catalog_model.catalog_key
        || effective_model == global_catalog_model.model
    {
        global_catalog_model
    } else {
        find_catalog_model(catalog, effective_model)?
    };
    ensure_model_capability(&catalog_model, accepted_capabilities, capability_label)?;
    let model_catalog_key = catalog_model.catalog_key;
    let routing_catalog_key = route_scope_catalog_key(effective_model, &model_catalog_key);
    let model_plan = ProviderRouteSelector::new(catalog)
        .select_plan(SelectProviderRouteQuery {
            context: context.clone(),
            catalog_key: routing_catalog_key.clone(),
            requested_model: model.to_owned(),
            api_code: openai_api_code(capability_label).to_owned(),
            capability,
            billing_meter,
        })
        .map_err(provider_route_selection_error)?;
    let channel_routes = catalog.list_upstream_account_routes();
    let routes = model_plan
        .routes
        .into_iter()
        .map(|selection| {
            resolve_model_route(
                catalog,
                context,
                model,
                catalog_model.vendor_code.as_str(),
                routing_catalog_key.as_str(),
                selection,
                &channel_routes,
            )
        })
        .collect::<Result<Vec<_>, _>>()?;
    if routes.is_empty() {
        return Err(provider_route_selection_error(
            ProviderRouteSelectionError::provider_route_unavailable(format!(
                "provider route is not available for configured channel route: route plan is empty for model {}",
                routing_catalog_key
            )),
        ));
    }
    Ok(ResolvedOpenAiProviderRoutePlan {
        catalog_key: routing_catalog_key,
        routes,
    })
}

fn route_scope_catalog_key(requested_model: &str, model_catalog_key: &str) -> String {
    if requested_model.trim() == model_catalog_key.trim() {
        requested_model.trim().to_owned()
    } else {
        model_catalog_key.to_owned()
    }
}

fn openai_api_code(capability_label: &str) -> &'static str {
    match capability_label {
        "responses" | "response" => "openai.responses",
        "embeddings" | "embedding" => "openai.embeddings",
        _ => "openai.chat_completions",
    }
}

fn resolve_model_route(
    catalog: &(impl PricingCatalog + ?Sized),
    _context: &AuthenticatedApiKeyContext,
    requested_model: &str,
    vendor_code: &str,
    catalog_key: &str,
    selection: SelectedProviderRoute,
    channel_routes: &[crate::domain::UpstreamAccountRoute],
) -> Result<ResolvedOpenAiProviderRoute, OpenAiRouteError> {
    let model_route = selection.route;
    let channel_metadata = find_selected_channel_route_metadata(&model_route, channel_routes);
    if channel_metadata
        .as_ref()
        .map(|route| route.supplier_code.as_str())
        .is_some_and(|supplier_code| supplier_code != model_route.supplier_code)
    {
        return Err(provider_route_selection_error(
            ProviderRouteSelectionError::provider_route_unavailable(format!(
                "provider route is not available for configured channel route: selected channel {} provider mismatch for model {}",
                model_route.account_id, catalog_key
            )),
        ));
    }
    if !has_text(model_route.base_url.as_deref()) || !has_text(model_route.secret_ref.as_deref()) {
        return Err(provider_route_selection_error(
            ProviderRouteSelectionError::provider_route_unavailable(format!(
                "provider route is not available for configured channel route: selected channel {} is missing callable base URL or credential for model {}",
                model_route.account_id, catalog_key
            )),
        ));
    }

    let channel_mapping = catalog.resolve_model_mapping(
        requested_model,
        &ResolveModelMappingContext::new()
            .with_vendor_code(vendor_code)
            .with_account_id(model_route.account_id)
            .with_account_code(
                channel_metadata
                    .as_ref()
                    .and_then(|route| route.account_code.as_deref())
                    .unwrap_or_default(),
            )
            .with_account_group_id(selection.group_id)
            .with_account_group_code(selection.group_code.as_str())
            .with_supplier(
                channel_metadata
                    .as_ref()
                    .and_then(|route| route.supplier_id),
                channel_metadata
                    .as_ref()
                    .map(|route| route.supplier_code.as_str()),
            )
            .with_endpoint(
                channel_metadata
                    .as_ref()
                    .and_then(|route| route.endpoint_id),
                channel_metadata
                    .as_ref()
                    .and_then(|route| route.endpoint_code.as_deref()),
            ),
    );
    let model_route = match channel_mapping.as_ref() {
        Some(rule) if rule.effective_catalog_key() != model_route.catalog_key => catalog
            .list_model_upstream_routes(rule.effective_catalog_key())
            .into_iter()
            .find(|candidate| candidate.account_id == model_route.account_id)
            .map(|candidate| apply_selected_route_account(candidate, &model_route))
            .ok_or_else(|| {
                provider_route_selection_error(ProviderRouteSelectionError::provider_route_unavailable(
                    format!(
                        "provider route is not available for configured channel route: channel {} has no mapped route for model {}",
                        model_route.account_id,
                        rule.effective_catalog_key()
                    ),
                ))
            })?,
        _ => model_route,
    };
    if channel_metadata
        .as_ref()
        .map(|route| route.supplier_code.as_str())
        .is_some_and(|supplier_code| supplier_code != model_route.supplier_code)
    {
        return Err(provider_route_selection_error(
            ProviderRouteSelectionError::provider_route_unavailable(format!(
                "provider route is not available for configured channel route: selected channel {} provider mismatch for model {}",
                model_route.account_id, model_route.catalog_key
            )),
        ));
    }

    let provider_model = channel_mapping
        .as_ref()
        .and_then(|rule| rule.effective_provider_model().map(str::to_owned))
        .unwrap_or_else(|| {
            normalized_resolved_provider_model(
                &model_route.catalog_key,
                &model_route.model,
                &model_route.provider_model,
            )
        });
    let region_code =
        resolved_deployment_region_code(&model_route.region_code, channel_metadata.as_ref());

    Ok(ResolvedOpenAiProviderRoute {
        catalog_key: model_route.catalog_key,
        policy_id: selection.policy_id,
        rule_id: selection.rule_id,
        group_id: selection.group_id,
        group_code: selection.group_code,
        pricing_plan_code: selection.pricing_plan_code,
        supplier_code: model_route.supplier_code,
        region_code,
        account_id: model_route.account_id,
        provider_model,
        provider_base_url: model_route.base_url,
        provider_secret_ref: model_route.secret_ref,
        provider_auth_profile: model_route.auth_profile,
        provider_timeout_ms: model_route.timeout_ms,
        provider_retry_policy: model_route.retry_policy,
    })
}

fn find_selected_channel_route_metadata(
    model_route: &crate::domain::ModelUpstreamRoute,
    channel_routes: &[crate::domain::UpstreamAccountRoute],
) -> Option<crate::domain::UpstreamAccountRoute> {
    let mut candidates = channel_routes
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

    if has_text(model_route.base_url.as_deref()) || has_text(model_route.secret_ref.as_deref()) {
        if let Some(route) = candidates.iter().find(|route| {
            same_optional_text(route.base_url.as_deref(), model_route.base_url.as_deref())
                && same_optional_text(
                    route.secret_ref.as_deref(),
                    model_route.secret_ref.as_deref(),
                )
        }) {
            return Some(route.clone());
        }
    }

    candidates.into_iter().next()
}

fn apply_selected_route_account(
    mut model_route: crate::domain::ModelUpstreamRoute,
    selected_route: &crate::domain::ModelUpstreamRoute,
) -> crate::domain::ModelUpstreamRoute {
    model_route.region_code = selected_route.region_code.clone();
    model_route.credential_id = selected_route.credential_id;
    model_route.credential_rotation = selected_route.credential_rotation.clone();
    model_route.credential_priority = selected_route.credential_priority;
    model_route.credential_weight = selected_route.credential_weight;
    model_route.base_url = selected_route.base_url.clone();
    model_route.secret_ref = selected_route.secret_ref.clone();
    model_route.auth_profile = selected_route.auth_profile.clone();
    model_route.timeout_ms = selected_route.timeout_ms;
    model_route.retry_policy = selected_route.retry_policy.clone();
    model_route
}

fn same_optional_text(left: Option<&str>, right: Option<&str>) -> bool {
    match (left, right) {
        (Some(left), Some(right)) => left.trim() == right.trim(),
        (None, None) => true,
        _ => false,
    }
}

fn same_region(left: &str, right: &str) -> bool {
    normalize_region_code(left).eq_ignore_ascii_case(&normalize_region_code(right))
}

fn normalize_region_code(value: &str) -> String {
    let value = value.trim();
    if value.is_empty() {
        "global".to_owned()
    } else {
        value.to_owned()
    }
}

fn resolved_deployment_region_code(
    model_route_region: &str,
    channel_metadata: Option<&crate::domain::UpstreamAccountRoute>,
) -> String {
    let model_route_region = model_route_region.trim();
    if !model_route_region.is_empty() {
        return model_route_region.to_owned();
    }
    let channel_route_region = channel_metadata
        .map(|route| route.region_code.as_str())
        .unwrap_or_default()
        .trim();
    if channel_route_region.is_empty() {
        "global".to_owned()
    } else {
        channel_route_region.to_owned()
    }
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
            crate::domain::provider_native_model_id(catalog_key)
        } else {
            model.to_owned()
        };
    }
    let native_model = crate::domain::provider_native_model_id(provider_model);
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

impl ResolvedOpenAiProviderRoutePlan {
    pub fn first_route(&self) -> Option<ResolvedOpenAiProviderRoute> {
        self.routes.first().cloned()
    }
}

pub(super) fn route_http_status_is_retryable(
    route: &ResolvedOpenAiProviderRoute,
    default_retry_policy: &ProviderRetryPolicy,
    status_code: u16,
) -> bool {
    route
        .provider_retry_policy
        .as_ref()
        .unwrap_or(default_retry_policy)
        .is_retryable_status(status_code)
}

pub(super) fn provider_relay_attempt_retry_policy(
    route: &ResolvedOpenAiProviderRoute,
    _failure_strategy: OpenAiRuntimeFailureStrategy,
    route_count: usize,
) -> Option<ProviderRetryPolicy> {
    if route_count > 1 {
        return Some(ProviderRetryPolicy {
            max_attempts: 1,
            retryable_status_codes: Vec::new(),
            backoff_ms: 0,
        });
    }
    route.provider_retry_policy.clone()
}

fn provider_route_selection_error(error: ProviderRouteSelectionError) -> OpenAiRouteError {
    let message = error.to_string();
    match error.kind() {
        ProviderRouteSelectionErrorKind::ProviderRouteUnavailable => Box::new(openai_error(
            StatusCode::SERVICE_UNAVAILABLE,
            if message.contains("provider route snapshot is empty") {
                "provider_route_snapshot_empty"
            } else {
                "provider_route_not_available"
            },
            "server_error",
            message,
        )),
        ProviderRouteSelectionErrorKind::PricingUnavailable => Box::new(openai_error(
            StatusCode::BAD_REQUEST,
            "pricing_unavailable",
            "invalid_request_error",
            message,
        )),
    }
}

fn has_text(value: Option<&str>) -> bool {
    value
        .map(str::trim)
        .map(|value| !value.is_empty())
        .unwrap_or(false)
}
