use std::sync::Arc;

use super::{
    AccountBillingMode, BillingMode, DispatchMode, Invocation, InvocationError,
    InvocationErrorKind, InvocationFuture, InvocationInterceptor, InvocationRouteCandidate,
    InvocationRouteCandidateKind, InvocationRoutePlan, ResourceType, RoutingPipeline,
    StickyRouteConstraint,
};
use crate::application::upstream_base_url::{
    protocol_code_from_api_code, resolve_upstream_base_url,
};
use crate::application::{
    model_access_forbidden_message, model_access_forbidden_reason, AuthenticatedApiKeyContext,
    SelectUpstreamAccountRouteQuery, SelectUpstreamModelRouteQuery, SelectedUpstreamAccountRoute,
    SelectedUpstreamModelRoute, UpstreamRouteSelectionErrorKind, UpstreamRouteSelector,
};
use crate::domain::{
    has_text, provider_native_model_id, BillingMeter, ModelUpstreamRoute,
    ResolveModelMappingContext, RoutingCapability, UpstreamAccountRoute,
};
use crate::ports::{AccountBaseUrlConfig, UpstreamAccountRouteCatalog};

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
                if let Some(reason) =
                    sticky_route_invalid_reason(self.catalog.as_ref(), invocation, &sticky_route)
                {
                    tracing::warn!(
                        tenant_id = invocation.subject.tenant_id,
                        organization_id = invocation.subject.organization_id,
                        api_key_id = invocation.subject.api_key_id.unwrap_or_default(),
                        supplier_code = %sticky_route.supplier_code,
                        account_id = sticky_route.account_id,
                        reason = %reason,
                        "sticky route target is no longer callable; falling back to regular route planning"
                    );
                    invocation.routing.sticky_route = None;
                } else {
                    let candidate =
                        sticky_candidate(self.catalog.as_ref(), invocation, sticky_route);
                    invocation.routing.route_plan = Some(InvocationRoutePlan::new(vec![candidate]));
                    return Ok(());
                }
            }

            let context = authenticated_context(invocation)?;
            // 统一路由管道：模型类/API 资源类共享编排，RouteKind 由资源推导。
            RoutingPipeline::new(Arc::clone(&self.catalog)).plan_route(invocation, context)
        })
    }
}

/// 统一管道入口：模型类规划（供 `RoutingPipeline` 调用）。
pub(crate) fn plan_model_route_pipeline<C>(
    catalog: &C,
    invocation: &mut Invocation,
    context: AuthenticatedApiKeyContext,
) -> Result<(), InvocationError>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    plan_model_route(catalog, invocation, context)
}

/// 统一管道入口：API 资源类规划（供 `RoutingPipeline` 调用）。
pub(crate) fn plan_account_route_pipeline<C>(
    catalog: &C,
    invocation: &mut Invocation,
    context: AuthenticatedApiKeyContext,
) -> Result<(), InvocationError>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    plan_upstream_account_route(catalog, invocation, context)
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
    // 模型类路由流程第 2 步：根据请求模型解析 catalog key 与支持该模型的
    // vendor 列表（对应 sdkwork-models 目录的模型→vendor 解析）。
    let catalog_key = resolve_catalog_key(catalog, invocation, &requested_model)?;
    invocation.resource.requested_model_catalog_key = Some(catalog_key.clone());
    invocation.resource.resolved_vendor_codes = catalog.model_vendor_codes_by_name(&requested_model);
    tracing::trace!(
        tenant_id = invocation.subject.tenant_id,
        organization_id = invocation.subject.organization_id,
        requested_model = %requested_model,
        catalog_key = %catalog_key,
        vendor_codes = ?invocation.resource.resolved_vendor_codes,
        "model-type route: resolved supporting vendors"
    );

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
        .map_err(|error| {
            if error.kind() == UpstreamRouteSelectionErrorKind::ModelForbidden {
                InvocationError::new(InvocationErrorKind::ModelForbidden, error.to_string())
            } else {
                route_error(error.to_string())
            }
        })?;

    let candidates = plan
        .routes
        .into_iter()
        .map(|selection| {
            mapped_model_candidate(
                catalog,
                &requested_model,
                invocation.resource.capability,
                selection,
                &mapping_context,
            )
        })
        .collect::<Vec<_>>();
    log_planned_candidates(invocation, &candidates, "model route");
    invocation.routing.route_plan = Some(InvocationRoutePlan::new(candidates));
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

    // 最终账号 + 故障转移序列（planner 已按策略排序并按 fallback mode 截断），
    // 供过滤链与 dispatch 的 failover 使用。
    let failover_routes = selection.failover_routes.clone();
    let mut candidates = vec![upstream_account_candidate(selection, invocation, catalog)];
    candidates.extend(
        failover_routes
            .into_iter()
            .map(|route| account_route_candidate(route, invocation, catalog)),
    );
    log_planned_candidates(invocation, &candidates, "account route");
    invocation.routing.route_plan = Some(InvocationRoutePlan::new(candidates));
    Ok(())
}

/// Debug-level summary of the planned route candidates (supplier/account/
/// region/endpoint). Credential references are logged as opaque refs; the
/// secret material itself never leaves the catalog.
fn log_planned_candidates(
    invocation: &Invocation,
    candidates: &[InvocationRouteCandidate],
    plan_kind: &str,
) {
    let summary = candidates
        .iter()
        .map(|candidate| {
            format!(
                "{}@{}:{}:{}",
                candidate.supplier_code,
                candidate.account_id,
                candidate.region_code,
                candidate.base_url.as_deref().unwrap_or("no-base-url")
            )
        })
        .collect::<Vec<_>>()
        .join(" -> ");
    tracing::debug!(
        stage = "route_planning",
        plan_kind,
        candidate_count = candidates.len(),
        route_key = %invocation.resource.route_key,
        api_code = %invocation.resource.api_code,
        requested_model = %invocation.resource.requested_model.as_deref().unwrap_or(""),
        request_id = %invocation.request.request_id,
        trace_id = %invocation.request.trace_id.as_deref().unwrap_or(""),
        candidates = %summary,
        "route planning succeeded"
    );
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
        base_url: resolve_upstream_base_url(
            invocation.resource.capability,
            protocol_code_from_api_code(Some(invocation.resource.api_code.as_str())),
            catalog
                .account_base_url_config(sticky_route.account_id)
                .as_ref(),
            catalog.supplier_default_base_url(&sticky_route.supplier_code),
            account_route
                .as_ref()
                .and_then(|route| route.base_url.clone()),
        ),
        secret_ref: account_route
            .as_ref()
            .and_then(|route| route.secret_ref.clone()),
        auth_profile: account_route
            .as_ref()
            .map(|route| route.auth_profile.clone())
            .unwrap_or_default(),
        timeout_ms: account_route.as_ref().and_then(|route| route.timeout_ms),
        retry_policy: account_route
            .as_ref()
            .and_then(|route| route.retry_policy.clone()),
        billing_mode: billing_mode_for(catalog, sticky_route.account_id),
    }
}

fn mapped_model_candidate<C>(
    catalog: &C,
    requested_model: &str,
    capability: RoutingCapability,
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
    let supplier_default_base_url = catalog.supplier_default_base_url(&route.supplier_code);
    let account_config = catalog.account_base_url_config(route.account_id);
    // 克隆 api_code：其借用指向 selection.route，须在移动 selection 前解耦
    let api_code = route.api_code.clone();
    let mut candidate = model_candidate(
        selection,
        capability,
        supplier_default_base_url,
        api_code.as_deref(),
        account_config.as_ref(),
    );
    candidate.provider_model = Some(
        account_mapping
            .as_ref()
            .and_then(|rule| rule.effective_provider_model().map(str::to_owned))
            .unwrap_or_else(|| {
                normalized_resolved_provider_model(&catalog_key, &model, &provider_model)
            }),
    );
    candidate.billing_mode = billing_mode_for(catalog, candidate.account_id);
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

/// 按请求资源能力与 LLM 协议判定最终调用 Base URL（详见
/// `application::upstream_base_url::resolve_upstream_base_url`）。
/// 优先级：账号配置 > 供应商配置 > 端点解析结果（`route_base_url` 已含
/// 端点 Base URL 与供应商默认 Base URL 兜底，见 rows.rs）。

fn model_candidate(
    selection: SelectedUpstreamModelRoute,
    capability: RoutingCapability,
    supplier_default_base_url: Option<String>,
    api_code: Option<&str>,
    account_config: Option<&AccountBaseUrlConfig>,
) -> InvocationRouteCandidate {
    let route = selection.route;
    InvocationRouteCandidate {
        kind: InvocationRouteCandidateKind::Model,
        supplier_code: route.supplier_code.clone(),
        account_id: route.account_id,
        account_group_id: Some(selection.group_id),
        account_group_code: Some(selection.group_code),
        pricing_plan_code: Some(selection.pricing_plan_code),
        api_code: route.api_code.clone().unwrap_or_default(),
        catalog_key: Some(route.catalog_key.clone()),
        requested_model: Some(route.model.clone()),
        provider_model: Some(route.provider_model.clone()),
        region_code: route.region_code.clone(),
        credential_id: route.credential_id,
        credential_rotation: Some(route.credential_rotation.clone()),
        base_url: resolve_upstream_base_url(
            capability,
            protocol_code_from_api_code(api_code),
            account_config,
            supplier_default_base_url,
            route.base_url.clone(),
        ),
        secret_ref: route.secret_ref.clone(),
        auth_profile: route.auth_profile.clone(),
        timeout_ms: route.timeout_ms,
        retry_policy: route.retry_policy.clone(),
        billing_mode: AccountBillingMode::default(),
    }
}

fn upstream_account_candidate<C>(
    selection: SelectedUpstreamAccountRoute,
    invocation: &Invocation,
    catalog: &C,
) -> InvocationRouteCandidate
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let route = selection.route;
    InvocationRouteCandidate {
        kind: InvocationRouteCandidateKind::UpstreamAccount,
        supplier_code: route.supplier_code.clone(),
        account_id: route.account_id,
        account_group_id: Some(selection.group_id),
        account_group_code: Some(selection.group_code),
        pricing_plan_code: Some(selection.pricing_plan_code),
        api_code: invocation.resource.api_code.clone(),
        catalog_key: invocation.resource.requested_model_catalog_key.clone(),
        requested_model: invocation.resource.requested_model.clone(),
        provider_model: invocation.resource.provider_native_model.clone(),
        region_code: route.region_code.clone(),
        credential_id: route.credential_id,
        credential_rotation: Some(route.credential_rotation.clone()),
        base_url: resolve_upstream_base_url(
            invocation.resource.capability,
            protocol_code_from_api_code(Some(invocation.resource.api_code.as_str())),
            catalog.account_base_url_config(route.account_id).as_ref(),
            catalog.supplier_default_base_url(&route.supplier_code),
            route.base_url.clone(),
        ),
        secret_ref: route.secret_ref.clone(),
        auth_profile: route.auth_profile.clone(),
        timeout_ms: route.timeout_ms,
        retry_policy: route.retry_policy.clone(),
        billing_mode: billing_mode_for(catalog, route.account_id),
    }
}

/// 故障转移候选：与 `upstream_account_candidate` 同构，用于无模型/账号路由
/// 路径的剩余账号（policy/rule 归属与主账号相同来源，故障转移语义一致）。
fn account_route_candidate<C>(
    route: UpstreamAccountRoute,
    invocation: &Invocation,
    catalog: &C,
) -> InvocationRouteCandidate
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    InvocationRouteCandidate {
        kind: InvocationRouteCandidateKind::UpstreamAccount,
        supplier_code: route.supplier_code.clone(),
        account_id: route.account_id,
        account_group_id: invocation.subject.account_group_id,
        account_group_code: invocation.subject.account_group_code.clone(),
        pricing_plan_code: invocation.subject.pricing_plan_code.clone(),
        api_code: invocation.resource.api_code.clone(),
        catalog_key: invocation.resource.requested_model_catalog_key.clone(),
        requested_model: invocation.resource.requested_model.clone(),
        provider_model: invocation.resource.provider_native_model.clone(),
        region_code: route.region_code.clone(),
        credential_id: route.credential_id,
        credential_rotation: Some(route.credential_rotation.clone()),
        base_url: resolve_upstream_base_url(
            invocation.resource.capability,
            protocol_code_from_api_code(Some(invocation.resource.api_code.as_str())),
            catalog.account_base_url_config(route.account_id).as_ref(),
            catalog.supplier_default_base_url(&route.supplier_code),
            route.base_url.clone(),
        ),
        secret_ref: route.secret_ref.clone(),
        auth_profile: route.auth_profile.clone(),
        timeout_ms: route.timeout_ms,
        retry_policy: route.retry_policy.clone(),
        billing_mode: billing_mode_for(catalog, route.account_id),
    }
}

/// 从 catalog 读取账号计费模式；未配置/未知时回退默认（prepay 预扣）。
fn billing_mode_for<C>(catalog: &C, account_id: i64) -> AccountBillingMode
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    catalog
        .account_billing_mode(account_id)
        .map(|code| AccountBillingMode::from_code(&code))
        .unwrap_or_default()
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
    // 目录级索引（快照加载时构建），O(1) 解析模型名 → catalog key，
    // 避免每个请求线性扫描全部模型。
    let keys = catalog.model_catalog_keys_by_name(requested_model);
    match keys.as_slice() {
        [catalog_key] => Ok(catalog_key.clone()),
        [] => Err(route_error(format!(
            "model is not available for route planning: {requested_model}"
        ))),
        _ => Err(route_error(format!(
            "model id is ambiguous for route planning: {requested_model}"
        ))),
    }
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
        .iter()
        .find(|route| {
            route.supplier_code == sticky_route.supplier_code
                && route.account_id == sticky_route.account_id
                && sticky_route
                    .region_code
                    .as_deref()
                    .map(|region| same_region(&route.region_code, region))
                    .unwrap_or(true)
        })
        .cloned()
}

/// Validates a resolved sticky constraint before pinning the route plan.
///
/// A sticky binding may outlive its upstream account route: the admin can
/// remove the account from the bound group, disable it, or mark it unhealthy.
/// Pinning blindly would keep billing traffic on an account the group no
/// longer covers, so the sticky target is re-validated against the live
/// catalog and the caller falls back to regular route planning when invalid.
fn sticky_route_invalid_reason<C>(
    catalog: &C,
    invocation: &Invocation,
    sticky_route: &StickyRouteConstraint,
) -> Option<String>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let account_route = matching_upstream_account_route(catalog, sticky_route)?;
    if !account_route.is_account_healthy() {
        return Some("sticky upstream account is not healthy".to_owned());
    }
    if !has_text(account_route.base_url.as_deref())
        || (!has_text(account_route.secret_ref.as_deref())
            && account_route.auth_profile.default_headers.is_empty())
    {
        return Some("sticky upstream account is not callable".to_owned());
    }
    if let Some(group_id) = sticky_route
        .account_group_id
        .or(invocation.subject.account_group_id)
    {
        let bound_to_group = account_route
            .account_group_bindings
            .iter()
            .any(|binding| binding.account_group_id == group_id);
        if !bound_to_group {
            return Some(
                "sticky upstream account is no longer bound to the account group".to_owned(),
            );
        }
        // The group's model blacklist/whitelist also governs sticky routes:
        // a forbidden model invalidates the sticky route so the request falls
        // back to regular route planning, which rejects it with a
        // model-forbidden error.
        if let Some(requested_model) = invocation.resource.requested_model.as_deref() {
            if let Some(access) = catalog.account_group_model_access(group_id) {
                let vendor_code = resolve_catalog_key(catalog, invocation, requested_model)
                    .ok()
                    .and_then(|catalog_key| catalog.find_model(&catalog_key))
                    .map(|model| model.vendor_code);
                if let Some(rule) =
                    model_access_forbidden_reason(vendor_code.as_deref(), requested_model, &access)
                {
                    return Some(model_access_forbidden_message(
                        rule,
                        requested_model,
                        &group_id.to_string(),
                    ));
                }
            }
        }
    }
    None
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
