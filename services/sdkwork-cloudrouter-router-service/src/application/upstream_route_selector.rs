use crate::application::{
    upstream_account_route_planner::plan_upstream_account_routes, AuthenticatedApiKeyContext,
    PriceResolution, PriceResolutionStatus, PriceService,
};
use chrono::Utc;
use std::cmp::Reverse;
use std::collections::BTreeMap;
use std::fmt::{Display, Formatter};

use crate::domain::{
    has_text, parse_model_catalog_identity, provider_native_model_id, BillingMeter, DomainError,
    DomainResult, GatewayApiKeyAccountGroupBinding, ModelUpstreamRoute, ResourceDefinition,
    RouteCandidate, RoutingCapability, UpstreamAccountGroup, UpstreamAccountGroupBinding,
    UpstreamAccountRoute, UpstreamAccountRoutingStrategy,
};
use crate::ports::{
    AccountGroupModelAccess, UpstreamAccountRouteCatalog, UpstreamRouteGateDiagnosis,
};

#[derive(Debug, Clone, Default)]
struct UpstreamAccountGroupBindings {
    selected_account_group_id: Option<i64>,
    by_account: BTreeMap<i64, Vec<UpstreamAccountGroupBinding>>,
}

impl UpstreamAccountGroupBindings {
    fn contains_account(&self, account_id: i64) -> bool {
        self.by_account.contains_key(&account_id)
    }

    fn best_binding_for_group(
        &self,
        account_group_id: i64,
    ) -> Option<&UpstreamAccountGroupBinding> {
        self.by_account
            .values()
            .flatten()
            .filter(|binding| binding.account_group_id == account_group_id)
            .min_by_key(|binding| (binding.priority, Reverse(binding.weight)))
    }

    fn matched_account_count(&self) -> usize {
        self.by_account.len()
    }
}

pub struct UpstreamRouteSelector<'a, C: UpstreamAccountRouteCatalog> {
    catalog: &'a C,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SelectUpstreamModelRouteQuery {
    pub context: AuthenticatedApiKeyContext,
    pub catalog_key: String,
    pub requested_model: String,
    pub api_code: String,
    pub capability: RoutingCapability,
    pub billing_meter: BillingMeter,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SelectedUpstreamModelRoute {
    pub route: ModelUpstreamRoute,
    pub group_id: i64,
    pub group_code: String,
    pub pricing_plan_code: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SelectedUpstreamModelRoutePlan {
    pub routes: Vec<SelectedUpstreamModelRoute>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SelectUpstreamAccountRouteQuery {
    pub context: AuthenticatedApiKeyContext,
    pub route_key: String,
    pub api_code: String,
    pub capability: RoutingCapability,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SelectedUpstreamAccountRoute {
    pub route: UpstreamAccountRoute,
    /// 故障转移序列（planner 排序 + fallback 截断后的其余账号）
    pub failover_routes: Vec<UpstreamAccountRoute>,
    pub group_id: i64,
    pub group_code: String,
    pub pricing_plan_code: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpstreamRouteSelectionError {
    kind: UpstreamRouteSelectionErrorKind,
    message: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UpstreamRouteSelectionErrorKind {
    UpstreamRouteUnavailable,
    PricingUnavailable,
    /// The requested model is rejected by the account group's model
    /// blacklist/whitelist. Raised as a hard error: the group forbids the
    /// model, so no other bound group is tried.
    ModelForbidden,
}

impl UpstreamRouteSelectionError {
    pub fn upstream_route_unavailable(message: impl Into<String>) -> Self {
        Self {
            kind: UpstreamRouteSelectionErrorKind::UpstreamRouteUnavailable,
            message: message.into(),
        }
    }

    pub fn pricing_unavailable(message: impl Into<String>) -> Self {
        Self {
            kind: UpstreamRouteSelectionErrorKind::PricingUnavailable,
            message: message.into(),
        }
    }

    pub fn model_forbidden(message: impl Into<String>) -> Self {
        Self {
            kind: UpstreamRouteSelectionErrorKind::ModelForbidden,
            message: message.into(),
        }
    }

    pub fn kind(&self) -> UpstreamRouteSelectionErrorKind {
        self.kind
    }
}

impl Display for UpstreamRouteSelectionError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.message)
    }
}

impl std::error::Error for UpstreamRouteSelectionError {}

#[derive(Debug, Clone, PartialEq, Eq)]
enum CandidateUpstreamModelRouteEvaluation {
    Planned(Vec<ModelUpstreamRoute>),
    PricingUnavailable(DomainError),
    RoutingInvalid(DomainError),
    NoCallableCandidate,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum CandidateUpstreamAccountRouteEvaluation {
    Selected(Box<UpstreamAccountRoute>, Vec<UpstreamAccountRoute>),
    PricingUnavailable(DomainError),
    RoutingInvalid(DomainError),
    NoCallableCandidate,
}

impl<'a, C: UpstreamAccountRouteCatalog> UpstreamRouteSelector<'a, C> {
    pub fn new(catalog: &'a C) -> Self {
        Self { catalog }
    }

    pub fn select_model_route(
        &self,
        query: SelectUpstreamModelRouteQuery,
    ) -> Result<SelectedUpstreamModelRoute, UpstreamRouteSelectionError> {
        self.select_model_route_plan(query)?
            .first_route()
            .ok_or_else(|| {
                UpstreamRouteSelectionError::upstream_route_unavailable(
                    "selected upstream model route plan contains no routes",
                )
            })
    }

    pub fn select_model_route_plan(
        &self,
        query: SelectUpstreamModelRouteQuery,
    ) -> Result<SelectedUpstreamModelRoutePlan, UpstreamRouteSelectionError> {
        let mut last_unavailable = None;
        let mut last_pricing_unavailable = None;
        for context in self.route_contexts(&query.context)? {
            let scoped_query = SelectUpstreamModelRouteQuery {
                context,
                ..query.clone()
            };
            match self.select_model_route_plan_for_context(scoped_query) {
                Ok(selection) => return Ok(selection),
                Err(error) if error.kind() == UpstreamRouteSelectionErrorKind::ModelForbidden => {
                    // A model forbidden by a bound group is a hard rejection
                    // of the request: the group's blacklist denies the model
                    // for the whole group, so no other bound group is tried.
                    return Err(error);
                }
                Err(error)
                    if error.kind() == UpstreamRouteSelectionErrorKind::PricingUnavailable =>
                {
                    // A pricing gap in one bound group must not fail the whole
                    // request: another bound group may have a priced account
                    // for the same model. Prefer the pricing error if every
                    // group fails, because it is the most actionable signal.
                    last_pricing_unavailable = Some(error);
                }
                Err(error) => {
                    last_unavailable = Some(error);
                }
            }
        }

        Err(last_pricing_unavailable
            .or(last_unavailable)
            .unwrap_or_else(|| {
                UpstreamRouteSelectionError::upstream_route_unavailable(format!(
                    "upstream route is not available for model: {}",
                    query.catalog_key
                ))
            }))
    }

    fn select_model_route_plan_for_context(
        &self,
        query: SelectUpstreamModelRouteQuery,
    ) -> Result<SelectedUpstreamModelRoutePlan, UpstreamRouteSelectionError> {
        let account_routes = self.catalog.shared_upstream_account_routes();
        let account_routes_loaded = account_routes.len();
        let api_scope_keys = [query.api_code.as_str()];
        let account_group_bindings = upstream_account_group_bindings(
            &account_routes,
            query.context.group_id,
            &api_scope_keys,
            query.capability,
        );

        // Group model access gate: the selected account group's blacklist
        // forbids the whole group from serving matching models, and a
        // non-empty whitelist restricts the group to matching models only.
        // Checked before any account/resource resolution so a forbidden model
        // fails fast with a model-forbidden error instead of a misleading
        // route-unavailable one.
        if let Some(access) = self
            .catalog
            .account_group_model_access(query.context.group_id)
        {
            let vendor_code = self
                .catalog
                .find_model(&query.catalog_key)
                .map(|model| model.vendor_code);
            let reason = model_access_forbidden_reason(
                vendor_code.as_deref(),
                &query.requested_model,
                &access,
            );
            if let Some(rule) = reason {
                return Err(UpstreamRouteSelectionError::model_forbidden(
                    model_access_forbidden_message(
                        &rule,
                        &query.requested_model,
                        &query.context.group_code,
                    ),
                ));
            }
        }

        let model_routes = self.catalog.list_model_upstream_routes(&query.catalog_key);
        let model_routes_loaded = model_routes.len();
        let routes =
            self.group_scoped_model_routes(model_routes, &account_routes, &account_group_bindings);
        let account_routes =
            self.group_scoped_account_routes(&account_routes, &account_group_bindings);
        if routes.is_empty() && account_routes.is_empty() {
            log_unavailable_model_route_diagnostics(
                &query,
                model_routes_loaded,
                account_routes_loaded,
                &account_group_bindings,
                routes.len(),
                account_routes.len(),
            );
            let diagnosis = self.catalog.upstream_route_gate_diagnosis();
            if let Some(diagnosis) = &diagnosis {
                tracing::warn!(
                    requested_model = %query.requested_model,
                    catalog_key = %query.catalog_key,
                    diagnosis = %diagnosis.summary(),
                    "empty upstream route snapshot diagnosed against catalog inputs"
                );
            }
            let message = unavailable_model_route_message(
                &query,
                model_routes_loaded,
                account_routes_loaded,
                &account_group_bindings,
                routes.len(),
                account_routes.len(),
                diagnosis.as_ref(),
            );
            crate::application::log_selector_route_selection_failed(
                crate::application::classify_route_selection_failure(&message),
                query.context.api_key_id,
                query.context.tenant_id,
                query.context.organization_id,
                query.context.group_id,
                &query.context.group_code,
                &query.catalog_key,
                &query.requested_model,
                &message,
            );
            return Err(UpstreamRouteSelectionError::upstream_route_unavailable(
                message,
            ));
        }

        // Account-resource gate: the selected account group must contain at
        // least one callable account whose resource bindings (resource
        // entitlements) cover the requested model/api. When the group has no
        // supporting account, fail fast with a clear error instead of falling
        // through the policy scopes and reporting a misleading
        // "routing policy scope is required" error.
        let supporting_account_routes = account_routes
            .iter()
            .filter(|route| {
                self.account_route_is_callable(route)
                    && account_route_allows_model_request(
                        route,
                        &RouteCandidate::new(query.context.group_id, 1),
                        &query,
                    )
            })
            .cloned()
            .collect::<Vec<_>>();
        if supporting_account_routes.is_empty() {
            let mut all_unhealthy_or_not_callable = !account_routes.is_empty();
            for route in &account_routes {
                let callable = self.account_route_is_callable(route);
                let allows_model = account_route_allows_model_request(
                    route,
                    &RouteCandidate::new(query.context.group_id, 1),
                    &query,
                );
                if callable {
                    all_unhealthy_or_not_callable = false;
                }
                crate::application::log_rejected_group_account(
                    query.context.api_key_id,
                    query.context.tenant_id,
                    query.context.group_id,
                    &query.context.group_code,
                    &query.catalog_key,
                    &query.requested_model,
                    &query.api_code,
                    &crate::application::RejectedGroupAccount {
                        account_id: route.account_id,
                        supplier_code: route.supplier_code.clone(),
                        callable,
                        healthy: route.is_account_healthy(),
                        has_base_url: has_text(route.base_url.as_deref()),
                        has_credential: has_text(route.secret_ref.as_deref())
                            || !route.auth_profile.default_headers.is_empty(),
                        allows_model,
                        account_health_status: route.account_health_status,
                        credential_health_status: route.credential_health_status,
                        endpoint_health_status: route.endpoint_health_status,
                    },
                );
            }
            let stage = if all_unhealthy_or_not_callable {
                crate::application::RouteSelectionFailureStage::AccountNotCallable
            } else {
                crate::application::RouteSelectionFailureStage::ResourceNotEntitled
            };
            let message = if all_unhealthy_or_not_callable {
                format!(
                    "no upstream account in account group {} supports model {} for api {} \
                     (all {} group-bound account(s) are unhealthy or missing callable base url or credential)",
                    query.context.group_code,
                    query.catalog_key,
                    query.api_code,
                    account_routes.len()
                )
            } else {
                format!(
                    "no upstream account in account group {} supports model {} for api {}",
                    query.context.group_code, query.catalog_key, query.api_code
                )
            };
            crate::application::log_selector_route_selection_failed(
                stage,
                query.context.api_key_id,
                query.context.tenant_id,
                query.context.organization_id,
                query.context.group_id,
                &query.context.group_code,
                &query.catalog_key,
                &query.requested_model,
                &message,
            );
            return Err(UpstreamRouteSelectionError::upstream_route_unavailable(
                message,
            ));
        }

        if let Some(selection) = self.select_group_bound_account_route_plan(
            &query,
            &routes,
            &account_routes,
            &account_group_bindings,
        )? {
            return Ok(selection);
        }

        let message = format!(
            "upstream route is not available for configured upstream account route: no group-bound callable priced candidate upstream account is available for model {}",
            query.catalog_key
        );
        crate::application::log_selector_route_selection_failed(
            crate::application::classify_route_selection_failure(&message),
            query.context.api_key_id,
            query.context.tenant_id,
            query.context.organization_id,
            query.context.group_id,
            &query.context.group_code,
            &query.catalog_key,
            &query.requested_model,
            &message,
        );
        Err(UpstreamRouteSelectionError::upstream_route_unavailable(
            message,
        ))
    }

    pub fn select_account_route(
        &self,
        query: SelectUpstreamAccountRouteQuery,
    ) -> Result<SelectedUpstreamAccountRoute, UpstreamRouteSelectionError> {
        let mut last_unavailable = None;
        let mut last_pricing_unavailable = None;
        for context in self.route_contexts(&query.context)? {
            let scoped_query = SelectUpstreamAccountRouteQuery {
                context,
                ..query.clone()
            };
            match self.select_account_route_for_context(scoped_query) {
                Ok(selection) => return Ok(selection),
                Err(error)
                    if error.kind() == UpstreamRouteSelectionErrorKind::PricingUnavailable =>
                {
                    // See `select_model_route_plan`: a pricing gap in one
                    // bound group must not fail the whole request.
                    last_pricing_unavailable = Some(error);
                }
                Err(error) => {
                    last_unavailable = Some(error);
                }
            }
        }

        Err(last_pricing_unavailable.or(last_unavailable).unwrap_or_else(|| {
            UpstreamRouteSelectionError::upstream_route_unavailable(format!(
                "upstream route is not available for configured upstream account route: routing policy scope is required for route {}",
                query.route_key
            ))
        }))
    }

    fn select_account_route_for_context(
        &self,
        query: SelectUpstreamAccountRouteQuery,
    ) -> Result<SelectedUpstreamAccountRoute, UpstreamRouteSelectionError> {
        let account_routes = self.catalog.shared_upstream_account_routes();
        let api_scope_keys = [query.api_code.as_str()];
        let account_group_bindings = upstream_account_group_bindings(
            &account_routes,
            query.context.group_id,
            &api_scope_keys,
            query.capability,
        );
        let routes = self.group_scoped_account_routes(&account_routes, &account_group_bindings);
        if routes.is_empty() {
            return Err(UpstreamRouteSelectionError::upstream_route_unavailable(
                "upstream route is not available for configured upstream account route: no upstream account routes are configured",
            ));
        }

        // Account-resource gate: the selected account group must contain at
        // least one callable account whose resource bindings cover the
        // requested api resource. When the group has no supporting account,
        // fail fast with a clear error instead of reporting a misleading
        // "routing policy scope is required" error.
        let supporting_account_routes = routes
            .iter()
            .filter(|route| {
                self.account_route_is_callable(route)
                    && account_route_allows_api_resource(route, &query)
            })
            .cloned()
            .collect::<Vec<_>>();
        if supporting_account_routes.is_empty() {
            let mut all_unhealthy_or_not_callable = !routes.is_empty();
            for route in &routes {
                let callable = self.account_route_is_callable(route);
                if callable {
                    all_unhealthy_or_not_callable = false;
                }
                crate::application::log_rejected_group_account(
                    query.context.api_key_id,
                    query.context.tenant_id,
                    query.context.group_id,
                    &query.context.group_code,
                    &query.route_key,
                    &query.route_key,
                    &query.api_code,
                    &crate::application::RejectedGroupAccount {
                        account_id: route.account_id,
                        supplier_code: route.supplier_code.clone(),
                        callable,
                        healthy: route.is_account_healthy(),
                        has_base_url: has_text(route.base_url.as_deref()),
                        has_credential: has_text(route.secret_ref.as_deref())
                            || !route.auth_profile.default_headers.is_empty(),
                        allows_model: account_route_allows_api_resource(route, &query),
                        account_health_status: route.account_health_status,
                        credential_health_status: route.credential_health_status,
                        endpoint_health_status: route.endpoint_health_status,
                    },
                );
            }
            let message = if all_unhealthy_or_not_callable {
                format!(
                    "no upstream account in account group {} supports api resource {} \
                     (all {} group-bound account(s) are unhealthy or missing callable base url or credential)",
                    query.context.group_code,
                    query.api_code,
                    routes.len()
                )
            } else {
                format!(
                    "no upstream account in account group {} supports api resource {}",
                    query.context.group_code, query.api_code
                )
            };
            crate::application::log_selector_route_selection_failed(
                crate::application::classify_route_selection_failure(&message),
                query.context.api_key_id,
                query.context.tenant_id,
                query.context.organization_id,
                query.context.group_id,
                &query.context.group_code,
                &query.route_key,
                &query.route_key,
                &message,
            );
            return Err(UpstreamRouteSelectionError::upstream_route_unavailable(
                message,
            ));
        }

        if let Some(selection) =
            self.select_group_bound_account_route(&routes, &account_group_bindings, &query)?
        {
            return Ok(selection);
        }

        let message = format!(
            "upstream route is not available for configured upstream account route: no group-bound callable priced candidate upstream account is available for route {}",
            query.route_key
        );
        crate::application::log_selector_route_selection_failed(
            crate::application::classify_route_selection_failure(&message),
            query.context.api_key_id,
            query.context.tenant_id,
            query.context.organization_id,
            query.context.group_id,
            &query.context.group_code,
            &query.route_key,
            &query.route_key,
            &message,
        );
        Err(UpstreamRouteSelectionError::upstream_route_unavailable(
            message,
        ))
    }

    fn route_contexts(
        &self,
        context: &AuthenticatedApiKeyContext,
    ) -> Result<Vec<AuthenticatedApiKeyContext>, UpstreamRouteSelectionError> {
        let Some(api_key) = self.catalog.find_api_key(context.api_key_id) else {
            return Ok(vec![context.clone()]);
        };
        if api_key.tenant_id != context.tenant_id
            || api_key.organization_id != context.organization_id
            || api_key.user_id != context.user_id
        {
            return Err(UpstreamRouteSelectionError::upstream_route_unavailable(
                "authenticated api key context does not match catalog ownership",
            ));
        }

        let mut contexts = api_key
            .effective_account_group_bindings()
            .into_iter()
            .filter(|binding| binding.binding_role.trim().eq_ignore_ascii_case("route"))
            .filter_map(|binding| self.context_from_group_binding(context, &binding))
            .collect::<Vec<_>>();

        if contexts.is_empty() {
            contexts.push(context.clone());
        }
        Ok(contexts)
    }

    fn context_from_group_binding(
        &self,
        context: &AuthenticatedApiKeyContext,
        binding: &GatewayApiKeyAccountGroupBinding,
    ) -> Option<AuthenticatedApiKeyContext> {
        let group = self
            .catalog
            .find_upstream_account_group(binding.account_group_id)?;
        // Verify the bound account group belongs to the same tenant/organization,
        // or is a global resource (tenant_id == 0)
        if group.tenant_id != 0 && group.tenant_id != context.tenant_id {
            return None;
        }
        if group.organization_id != 0 && group.organization_id != context.organization_id {
            return None;
        }
        Some(AuthenticatedApiKeyContext {
            api_key_id: context.api_key_id,
            tenant_id: context.tenant_id,
            organization_id: context.organization_id,
            user_id: context.user_id,
            api_key_name_snapshot: context.api_key_name_snapshot.clone(),
            group_id: group.id,
            group_code: normalized_text_or(&binding.account_group_code, &group.code),
            pricing_plan_code: normalized_text_or(
                &binding.pricing_plan_code,
                &group.pricing_plan_code,
            ),
        })
    }

    /// Resolves the per-key binding routing strategy for a bound group.
    /// Returns `None` when the api key or binding is absent, or when the
    /// persisted strategy is the legacy `auto` value — the caller then falls
    /// back to the group default strategy.
    fn binding_strategy_for_group(
        &self,
        api_key_id: i64,
        account_group_id: i64,
    ) -> Option<UpstreamAccountRoutingStrategy> {
        let api_key = self.catalog.find_api_key(api_key_id)?;
        api_key
            .effective_account_group_bindings()
            .iter()
            .find(|binding| binding.account_group_id == account_group_id)
            .and_then(|binding| {
                crate::application::resolve_account_routing_strategy(&binding.routing_strategy)
            })
    }

    fn evaluate_candidate_route_plan(
        &self,
        query: &SelectUpstreamModelRouteQuery,
        routes: &[ModelUpstreamRoute],
        account_routes: &[UpstreamAccountRoute],
        candidates: Vec<RouteCandidate>,
    ) -> CandidateUpstreamModelRouteEvaluation {
        let mut pricing_error = None;
        let mut selected_routes = Vec::new();
        for candidate in candidates {
            let candidate_routes = match self.resolve_candidate_model_routes(
                query,
                routes,
                account_routes,
                &candidate,
            ) {
                Ok(routes) => routes,
                Err(error) => return CandidateUpstreamModelRouteEvaluation::RoutingInvalid(error),
            };
            if candidate_routes.is_empty() {
                continue;
            }
            for route in candidate_routes {
                if !self.route_is_callable(&route) {
                    continue;
                }
                match self.ensure_route_is_priced(query, &route) {
                    Ok(()) => push_unique_model_route(&mut selected_routes, route),
                    Err(error) => {
                        pricing_error.get_or_insert(error);
                    }
                }
            }
        }
        if selected_routes.is_empty() {
            pricing_error
                .map(CandidateUpstreamModelRouteEvaluation::PricingUnavailable)
                .unwrap_or(CandidateUpstreamModelRouteEvaluation::NoCallableCandidate)
        } else {
            CandidateUpstreamModelRouteEvaluation::Planned(selected_routes)
        }
    }

    fn select_group_bound_account_route_plan(
        &self,
        query: &SelectUpstreamModelRouteQuery,
        routes: &[ModelUpstreamRoute],
        account_routes: &[UpstreamAccountRoute],
        account_group_bindings: &UpstreamAccountGroupBindings,
    ) -> Result<Option<SelectedUpstreamModelRoutePlan>, UpstreamRouteSelectionError> {
        let candidates =
            group_bound_account_route_candidates(account_routes, account_group_bindings);
        if candidates.is_empty() {
            return Ok(None);
        }

        match self.evaluate_candidate_route_plan(query, routes, account_routes, candidates) {
            CandidateUpstreamModelRouteEvaluation::Planned(routes) => Ok(Some(SelectedUpstreamModelRoutePlan {
                routes: routes
                    .into_iter()
                    .map(|route| selected_upstream_model_route(route, &query.context))
                    .collect(),
            })),
            CandidateUpstreamModelRouteEvaluation::PricingUnavailable(error) => {
                Err(UpstreamRouteSelectionError::pricing_unavailable(format!(
                    "pricing is not available for group-bound upstream account route for model {}: {}",
                    query.catalog_key, error
                )))
            }
            CandidateUpstreamModelRouteEvaluation::RoutingInvalid(error) => Err(
                UpstreamRouteSelectionError::upstream_route_unavailable(format!(
                    "upstream account routing configuration is invalid for group-bound route: {}",
                    error
                )),
            ),
            CandidateUpstreamModelRouteEvaluation::NoCallableCandidate => Ok(None),
        }
    }

    fn resolve_candidate_model_routes(
        &self,
        query: &SelectUpstreamModelRouteQuery,
        routes: &[ModelUpstreamRoute],
        account_routes: &[UpstreamAccountRoute],
        candidate: &RouteCandidate,
    ) -> DomainResult<Vec<ModelUpstreamRoute>> {
        let group = self.require_account_group(candidate.account_group_id)?;
        // Candidate-group accounts are collected before filtering so a
        // failed routing decision can log *why* each bound account was
        // rejected (missing base_url/credential, unhealthy, model not
        // allowed by the group binding). Without this the strategy-route
        // path degrades to a bare "no callable priced candidate" message.
        let candidate_group_accounts = account_routes
            .iter()
            .filter(|route| account_route_matches_candidate_group(route, candidate))
            .cloned()
            .collect::<Vec<_>>();
        let account_routes = candidate_group_accounts
            .iter()
            .filter(|route| {
                account_route_allows_model_request(route, candidate, query)
                    && candidate_region_matches(
                        &route.region_code,
                        candidate.region_code.as_deref(),
                    )
            })
            .filter(|route| self.account_route_is_callable(route))
            .cloned()
            .collect::<Vec<_>>();
        if account_routes.is_empty() && !candidate_group_accounts.is_empty() {
            for route in &candidate_group_accounts {
                crate::application::log_rejected_group_account(
                    query.context.api_key_id,
                    query.context.tenant_id,
                    query.context.group_id,
                    &query.context.group_code,
                    &query.catalog_key,
                    &query.requested_model,
                    &query.api_code,
                    &crate::application::RejectedGroupAccount {
                        account_id: route.account_id,
                        supplier_code: route.supplier_code.clone(),
                        callable: self.account_route_is_callable(route),
                        healthy: route.is_account_healthy(),
                        has_base_url: has_text(route.base_url.as_deref()),
                        has_credential: has_text(route.secret_ref.as_deref())
                            || !route.auth_profile.default_headers.is_empty(),
                        allows_model: account_route_allows_model_request(route, candidate, query),
                        account_health_status: route.account_health_status,
                        credential_health_status: route.credential_health_status,
                        endpoint_health_status: route.endpoint_health_status,
                    },
                );
            }
        }
        let mut account_routes = plan_upstream_account_routes(
            &group,
            self.binding_strategy_for_group(query.context.api_key_id, candidate.account_group_id),
            account_routes,
        )?;
        // 同账户多 region 部署：默认计费 region 的部署优先（见
        // `prefer_default_region_variants`），与定价的 region 作用域一致。
        let preferred_region = self.default_billing_region_for(&query.context, &query.catalog_key);
        account_routes =
            prefer_default_region_variants(account_routes, preferred_region.as_deref());
        let mut resolved = Vec::new();
        for account_route in account_routes {
            let matching_model_routes = routes.iter().filter(|route| {
                route.account_id == account_route.account_id
                    && route.supplier_code == account_route.supplier_code
                    && same_region(&account_route.region_code, &route.region_code)
                    && candidate_region_matches(
                        &route.region_code,
                        candidate.region_code.as_deref(),
                    )
                    && model_route_matches_request_api(route, &query.api_code)
            });
            let mut matched_model_route = false;
            for route in matching_model_routes {
                matched_model_route = true;
                push_unique_model_route(
                    &mut resolved,
                    apply_upstream_account_route(route.clone(), &account_route),
                );
            }
            if !matched_model_route {
                push_unique_model_route(
                    &mut resolved,
                    synthetic_model_route_from_account_route(
                        query,
                        &account_route,
                        candidate.account_group_id,
                    ),
                );
            }
        }
        Ok(resolved)
    }

    fn route_is_callable(&self, route: &ModelUpstreamRoute) -> bool {
        has_text(route.base_url.as_deref())
            && (has_text(route.secret_ref.as_deref())
                || !route.auth_profile.default_headers.is_empty())
    }

    /// 资源级默认计费 region（`pricing_default_region`，先租户作用域再回退
    /// (0,0) 全局）。选路与定价共用同一 region 作用域来源。
    fn default_billing_region_for(
        &self,
        context: &AuthenticatedApiKeyContext,
        catalog_key: &str,
    ) -> Option<String> {
        self.catalog
            .default_billing_region(context.tenant_id, context.organization_id, catalog_key)
    }

    fn evaluate_candidate_account_routes(
        &self,
        routes: &[UpstreamAccountRoute],
        candidates: Vec<RouteCandidate>,
        query: &SelectUpstreamAccountRouteQuery,
    ) -> CandidateUpstreamAccountRouteEvaluation {
        for candidate in candidates {
            let candidate_group_accounts = routes
                .iter()
                .filter(|route| account_route_matches_candidate_group(route, &candidate))
                .cloned()
                .collect::<Vec<_>>();
            let candidate_routes = candidate_group_accounts
                .iter()
                .filter(|route| {
                    account_route_allows_api_resource(route, query)
                        && candidate_region_matches(
                            &route.region_code,
                            candidate.region_code.as_deref(),
                        )
                })
                .filter(|route| self.account_route_is_callable(route))
                .cloned()
                .collect::<Vec<_>>();
            if candidate_routes.is_empty() && !candidate_group_accounts.is_empty() {
                for route in &candidate_group_accounts {
                    crate::application::log_rejected_group_account(
                        query.context.api_key_id,
                        query.context.tenant_id,
                        query.context.group_id,
                        &query.context.group_code,
                        &query.route_key,
                        &query.route_key,
                        &query.api_code,
                        &crate::application::RejectedGroupAccount {
                            account_id: route.account_id,
                            supplier_code: route.supplier_code.clone(),
                            callable: self.account_route_is_callable(route),
                            healthy: route.is_account_healthy(),
                            has_base_url: has_text(route.base_url.as_deref()),
                            has_credential: has_text(route.secret_ref.as_deref())
                                || !route.auth_profile.default_headers.is_empty(),
                            allows_model: account_route_allows_api_resource(route, query),
                            account_health_status: route.account_health_status,
                            credential_health_status: route.credential_health_status,
                            endpoint_health_status: route.endpoint_health_status,
                        },
                    );
                }
            }
            let group = match self.require_account_group(candidate.account_group_id) {
                Ok(group) => group,
                Err(error) => {
                    return CandidateUpstreamAccountRouteEvaluation::RoutingInvalid(error)
                }
            };
            let mut routes = match plan_upstream_account_routes(
                &group,
                self.binding_strategy_for_group(
                    query.context.api_key_id,
                    candidate.account_group_id,
                ),
                candidate_routes,
            ) {
                Ok(routes) => routes,
                Err(error) => {
                    return CandidateUpstreamAccountRouteEvaluation::RoutingInvalid(error)
                }
            };
            // 同账户多 region 部署：默认计费 region 的部署优先（model-less
            // 路径以 route_key 为资源键，与定价资源键保持一致）。
            let preferred_region =
                self.default_billing_region_for(&query.context, &query.route_key);
            routes = prefer_default_region_variants(routes, preferred_region.as_deref());
            // 首个为最终账号，其余为故障转移序列（planner 已按策略排序并
            // 按 fallback mode 截断），供 dispatch 的 failover 使用。
            let Some((primary, failover)) = routes.split_first() else {
                continue;
            };
            // Model-less requests are api-request-metered; verify the
            // candidate has an api-request price so pricing preflight cannot
            // fail after the account was selected.
            if let Err(error) = self.ensure_account_route_is_priced(query, primary) {
                return CandidateUpstreamAccountRouteEvaluation::PricingUnavailable(error);
            }
            return CandidateUpstreamAccountRouteEvaluation::Selected(
                Box::new(primary.clone()),
                failover.to_vec(),
            );
        }
        CandidateUpstreamAccountRouteEvaluation::NoCallableCandidate
    }

    /// Verifies the api-request price exists for the account route on the
    /// model-less (api-request-metered) path.
    fn ensure_account_route_is_priced(
        &self,
        query: &SelectUpstreamAccountRouteQuery,
        route: &UpstreamAccountRoute,
    ) -> DomainResult<()> {
        let configured_default_region = self.catalog.default_billing_region(
            query.context.tenant_id,
            query.context.organization_id,
            &query.route_key,
        );
        let mut resource =
            ResourceDefinition::new(&query.route_key, BillingMeter::ApiRequest, Utc::now())
                .with_pricing_subject(query.context.api_key_id, Some(query.context.group_id))
                .with_provider(&route.supplier_code, Some(route.account_id))
                .with_region_code(&route.region_code)
                .with_default_billing_region(configured_default_region)
                .with_model(&query.route_key)
                .with_api_code(&query.api_code);
        if let Some(identity) = parse_model_catalog_identity(&query.route_key) {
            resource = resource.with_vendor_code(identity.vendor_code);
        }
        let resolution = PriceService::new().resolve(self.catalog, resource)?;
        if !has_quoted_procurement_cost(&resolution) {
            return Err(DomainError::new(format!(
                "upstream cost price not found for route {}, supplier {}, account {}, and region {}{}",
                query.route_key,
                route.supplier_code,
                route.account_id,
                route.region_code,
                price_resolution_failure_suffix(&resolution)
            )));
        }
        Ok(())
    }

    fn select_group_bound_account_route(
        &self,
        routes: &[UpstreamAccountRoute],
        account_group_bindings: &UpstreamAccountGroupBindings,
        query: &SelectUpstreamAccountRouteQuery,
    ) -> Result<Option<SelectedUpstreamAccountRoute>, UpstreamRouteSelectionError> {
        let candidates = group_bound_account_route_candidates(routes, account_group_bindings);
        match self.evaluate_candidate_account_routes(routes, candidates, query) {
            CandidateUpstreamAccountRouteEvaluation::Selected(primary, failover) => {
                Ok(Some(selected_upstream_account_route(
                    *primary,
                    failover,
                    &query.context,
                )))
            }
            CandidateUpstreamAccountRouteEvaluation::PricingUnavailable(error) => {
                Err(UpstreamRouteSelectionError::pricing_unavailable(format!(
                    "pricing is not available for group-bound upstream account route for route {}: {}",
                    query.route_key, error
                )))
            }
            CandidateUpstreamAccountRouteEvaluation::RoutingInvalid(error) => Err(
                UpstreamRouteSelectionError::upstream_route_unavailable(format!(
                    "upstream account routing configuration is invalid for the selected account group: {error}"
                )),
            ),
            CandidateUpstreamAccountRouteEvaluation::NoCallableCandidate => Ok(None),
        }
    }

    fn group_scoped_account_routes(
        &self,
        routes: &[UpstreamAccountRoute],
        account_group_bindings: &UpstreamAccountGroupBindings,
    ) -> Vec<UpstreamAccountRoute> {
        routes
            .iter()
            .filter(|route| account_group_bindings.contains_account(route.account_id))
            .cloned()
            .collect()
    }

    fn group_scoped_model_routes(
        &self,
        routes: Vec<ModelUpstreamRoute>,
        account_routes: &[UpstreamAccountRoute],
        account_group_bindings: &UpstreamAccountGroupBindings,
    ) -> Vec<ModelUpstreamRoute> {
        routes
            .into_iter()
            .filter(|route| {
                account_routes.iter().any(|account_route| {
                    account_route.account_id == route.account_id
                        && account_route.supplier_code == route.supplier_code
                        && account_group_bindings.contains_account(account_route.account_id)
                        && self.account_route_is_callable(account_route)
                })
            })
            .collect()
    }

    fn account_route_is_callable(&self, route: &UpstreamAccountRoute) -> bool {
        has_text(route.base_url.as_deref())
            && (has_text(route.secret_ref.as_deref())
                || !route.auth_profile.default_headers.is_empty())
            && route.is_account_healthy()
    }

    fn require_account_group(&self, account_group_id: i64) -> DomainResult<UpstreamAccountGroup> {
        self.catalog
            .find_upstream_account_group(account_group_id)
            .ok_or_else(|| {
                DomainError::new(format!(
                    "upstream account group not found: {account_group_id}"
                ))
            })
    }

    /// Verifies the candidate can be priced for every meter the invocation
    /// will settle, not just the input meter.
    ///
    /// Chat (composite) billing resolves input, output, and cache-read prices;
    /// checking only the input meter here would let a candidate reach
    /// pricing preflight with a missing output price, failing the whole
    /// request instead of letting another priced candidate win. Cache-read is
    /// optional: a missing cache price only disables cache-meter billing.
    fn ensure_route_is_priced(
        &self,
        query: &SelectUpstreamModelRouteQuery,
        route: &ModelUpstreamRoute,
    ) -> DomainResult<()> {
        let meters = composite_pricing_meters(&query.billing_meter);
        let configured_default_region = self.catalog.default_billing_region(
            query.context.tenant_id,
            query.context.organization_id,
            &route.catalog_key,
        );
        for meter in meters {
            let mut resource =
                ResourceDefinition::new(&route.catalog_key, meter.clone(), Utc::now())
                    .with_pricing_subject(query.context.api_key_id, Some(query.context.group_id))
                    .with_provider(&route.supplier_code, Some(route.account_id))
                    .with_region_code(&route.region_code)
                    .with_default_billing_region(configured_default_region.clone())
                    .with_model(&query.requested_model)
                    .with_api_code(&query.api_code);
            if let Some(identity) = parse_model_catalog_identity(&route.catalog_key) {
                resource = resource.with_vendor_code(identity.vendor_code);
            }
            let resolution = PriceService::new().resolve(self.catalog, resource);
            match resolution {
                Ok(resolution) if has_quoted_procurement_cost(&resolution) => {}
                Ok(_) if meter == BillingMeter::LlmCacheReadToken => {}
                Ok(resolution) => {
                    return Err(DomainError::new(format!(
                        "upstream cost price not found for model {}, supplier {}, account {}, and region {}{}",
                        route.catalog_key,
                        route.supplier_code,
                        route.account_id,
                        route.region_code,
                        price_resolution_failure_suffix(&resolution)
                    )));
                }
                Err(_) if meter == BillingMeter::LlmCacheReadToken => {}
                Err(error) => return Err(error),
            }
        }
        Ok(())
    }
}

fn has_quoted_procurement_cost(resolution: &PriceResolution) -> bool {
    resolution.status == PriceResolutionStatus::Quoted
        && resolution
            .resolved_price
            .as_ref()
            .and_then(|price| price.procurement_cost.as_ref())
            .is_some()
}

fn price_resolution_failure_suffix(resolution: &PriceResolution) -> String {
    resolution
        .failure
        .as_ref()
        .map(|failure| format!(": {} ({})", failure.message, failure.code.code()))
        .unwrap_or_default()
}

/// Meters that must be priced for a route candidate before dispatch.
///
/// Mirrors the invocation-layer composite billing profile: chat calls settle
/// input/output/cache-read meters while single-meter surfaces (embeddings,
/// images, audio, video) settle only their own meter.
fn composite_pricing_meters(meter: &BillingMeter) -> Vec<BillingMeter> {
    if *meter == BillingMeter::LlmInputToken {
        vec![
            BillingMeter::LlmInputToken,
            BillingMeter::LlmOutputToken,
            BillingMeter::LlmCacheReadToken,
        ]
    } else {
        vec![meter.clone()]
    }
}

impl SelectedUpstreamModelRoutePlan {
    pub fn first_route(&self) -> Option<SelectedUpstreamModelRoute> {
        self.routes.first().cloned()
    }
}

fn selected_upstream_model_route(
    route: ModelUpstreamRoute,
    context: &AuthenticatedApiKeyContext,
) -> SelectedUpstreamModelRoute {
    SelectedUpstreamModelRoute {
        route,
        group_id: context.group_id,
        group_code: context.group_code.clone(),
        pricing_plan_code: context.pricing_plan_code.clone(),
    }
}

fn selected_upstream_account_route(
    route: UpstreamAccountRoute,
    failover_routes: Vec<UpstreamAccountRoute>,
    context: &AuthenticatedApiKeyContext,
) -> SelectedUpstreamAccountRoute {
    SelectedUpstreamAccountRoute {
        route,
        failover_routes,
        group_id: context.group_id,
        group_code: context.group_code.clone(),
        pricing_plan_code: context.pricing_plan_code.clone(),
    }
}

fn group_bound_account_route_candidates(
    routes: &[UpstreamAccountRoute],
    account_group_bindings: &UpstreamAccountGroupBindings,
) -> Vec<RouteCandidate> {
    let Some(account_group_id) = account_group_bindings.selected_account_group_id else {
        return Vec::new();
    };
    let Some(binding) = account_group_bindings.best_binding_for_group(account_group_id) else {
        return Vec::new();
    };
    let has_callable_account = routes.iter().any(|route| {
        account_group_bindings.contains_account(route.account_id)
            && route
                .account_group_bindings
                .iter()
                .any(|route_binding| route_binding.account_group_id == account_group_id)
    });
    if !has_callable_account {
        return Vec::new();
    }
    vec![RouteCandidate::new(
        account_group_id,
        i64::from(binding.weight),
    )]
}

fn normalized_text_or(value: &str, fallback: &str) -> String {
    let value = value.trim();
    if value.is_empty() {
        fallback.to_owned()
    } else {
        value.to_owned()
    }
}

fn account_route_matches_candidate_group(
    route: &UpstreamAccountRoute,
    candidate: &RouteCandidate,
) -> bool {
    route
        .account_group_bindings
        .iter()
        .any(|binding| binding.account_group_id == candidate.account_group_id)
}

fn candidate_region_matches(route_region_code: &str, candidate_region_code: Option<&str>) -> bool {
    candidate_region_code
        .map(|candidate_region_code| same_region(route_region_code, candidate_region_code))
        .unwrap_or(true)
}

/// 同账户多 region 部署共享 endpoint/credential 排序，其相对顺序即目录插入
/// 顺序。资源声明了默认计费 region 时，把该 region 的部署稳定地排到最前，
/// 使选路的 region 作用域与定价一致。仅在账户分组内部重排（planner 输出按
/// 账户相邻），不改变策略层（priority/轮询）确定的账户顺序与 failover 序列。
fn prefer_default_region_variants(
    routes: Vec<UpstreamAccountRoute>,
    preferred_region: Option<&str>,
) -> Vec<UpstreamAccountRoute> {
    let Some(preferred) = preferred_region
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return routes;
    };
    let mut result = Vec::with_capacity(routes.len());
    let mut index = 0;
    while index < routes.len() {
        let key = (
            routes[index].supplier_code.clone(),
            routes[index].account_id,
        );
        let run_end = index
            + routes[index..]
                .iter()
                .take_while(|route| route.supplier_code == key.0 && route.account_id == key.1)
                .count();
        let run = &routes[index..run_end];
        result.extend(
            run.iter()
                .filter(|route| same_region(&route.region_code, preferred))
                .cloned(),
        );
        result.extend(
            run.iter()
                .filter(|route| !same_region(&route.region_code, preferred))
                .cloned(),
        );
        index = run_end;
    }
    result
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

fn unavailable_model_route_message(
    query: &SelectUpstreamModelRouteQuery,
    model_routes_loaded: usize,
    account_routes_loaded: usize,
    account_group_bindings: &UpstreamAccountGroupBindings,
    scoped_model_routes: usize,
    scoped_account_routes: usize,
    gate_diagnosis: Option<&UpstreamRouteGateDiagnosis>,
) -> String {
    let model = &query.catalog_key;
    let group = &query.context.group_code;
    let group_id = query.context.group_id;

    if model_routes_loaded == 0 && account_routes_loaded == 0 {
        // With a captured pool diagnosis the blocking configuration gate is
        // known exactly: report it instead of the generic (and frequently
        // wrong) cache-refresh hint. The "snapshot is empty" prefix stays
        // stable so failure-stage classification is unaffected.
        if let Some(diagnosis) = gate_diagnosis {
            return format!(
                "upstream route snapshot is empty for model: {model} \
                 ({})",
                diagnosis.summary()
            );
        }
        return format!(
            "upstream route snapshot is empty for model: {model} \
             (no model routes and no account routes loaded in routing catalog; \
             the routing cache may not have refreshed after admin configuration)"
        );
    }

    if account_group_bindings.matched_account_count() == 0 {
        return format!(
            "upstream route is not available for model: {model} \
             (account group '{group}' [id={group_id}] has no accounts bound \
             for api='{}' capability={:?}; {model_routes_loaded} model routes \
             and {account_routes_loaded} account routes are loaded in catalog, \
             but none are bound to this group with matching scope/capability)",
            query.api_code, query.capability
        );
    }

    if scoped_model_routes == 0 && scoped_account_routes == 0 {
        return format!(
            "upstream route is not available for model: {model} \
             (account group '{group}' [id={group_id}] has \
             {} bound accounts, but none have model routes or \
             account routes scoped to model '{model}')",
            account_group_bindings.matched_account_count()
        );
    }

    format!(
        "upstream route is not available for model: {model} \
         (group='{group}' [id={group_id}], \
         model_routes_loaded={model_routes_loaded}, \
         account_routes_loaded={account_routes_loaded}, \
         group_bound_accounts={}, \
         scoped_model_routes={scoped_model_routes}, \
         scoped_account_routes={scoped_account_routes})",
        account_group_bindings.matched_account_count()
    )
}

fn log_unavailable_model_route_diagnostics(
    query: &SelectUpstreamModelRouteQuery,
    model_routes_loaded: usize,
    account_routes_loaded: usize,
    account_group_bindings: &UpstreamAccountGroupBindings,
    scoped_model_routes: usize,
    scoped_account_routes: usize,
) {
    tracing::warn!(
        requested_model = %query.requested_model,
        catalog_key = %query.catalog_key,
        api_key_id = query.context.api_key_id,
        tenant_id = query.context.tenant_id,
        organization_id = query.context.organization_id,
        user_id = query.context.user_id,
        account_group_id = query.context.group_id,
        account_group_code = %query.context.group_code,
        capability = ?query.capability,
        model_routes_loaded,
        account_routes_loaded,
        matching_group_bound_accounts = account_group_bindings.matched_account_count(),
        scoped_model_routes,
        scoped_account_routes,
        "upstream route selection found no available model or upstream account route"
    );
}

fn upstream_account_group_bindings(
    routes: &[UpstreamAccountRoute],
    group_id: i64,
    api_scope_keys: &[&str],
    capability: RoutingCapability,
) -> UpstreamAccountGroupBindings {
    let mut bindings = UpstreamAccountGroupBindings {
        selected_account_group_id: Some(group_id),
        ..UpstreamAccountGroupBindings::default()
    };
    for route in routes {
        let route_bindings = route
            .account_group_bindings
            .iter()
            .filter(|binding| {
                if binding.account_group_id != group_id {
                    return false;
                }
                binding_matches_api_scope(binding, api_scope_keys)
                    && binding_matches_capability(binding, capability)
            })
            .cloned()
            .collect::<Vec<_>>();
        if !route_bindings.is_empty() {
            bindings.by_account.insert(route.account_id, route_bindings);
        }
    }
    bindings
}

fn binding_matches_api_scope(
    binding: &UpstreamAccountGroupBinding,
    api_scope_keys: &[&str],
) -> bool {
    if binding.api_scope.is_empty() {
        return true;
    }
    if api_scope_keys.is_empty() {
        return false;
    }
    binding.api_scope.iter().any(|scope| {
        api_scope_keys
            .iter()
            .any(|key| api_scope_value_matches_key(scope, key))
    })
}

fn api_scope_value_matches_key(scope: &str, key: &str) -> bool {
    let scope = normalize_api_scope_value(scope);
    let key = normalize_api_scope_value(key);
    if scope.is_empty() || key.is_empty() {
        return false;
    }
    if scope == "*" || scope == "all" || scope == key {
        return true;
    }
    key.starts_with(&format!("{scope}.")) || scope.starts_with(&format!("{key}."))
}

fn normalize_api_scope_value(value: &str) -> String {
    let normalized = value
        .trim()
        .trim_matches('/')
        .to_ascii_lowercase()
        .replace(['/', ':', '-'], ".");
    normalized
        .strip_prefix("api.")
        .unwrap_or(&normalized)
        .trim_matches('.')
        .to_owned()
}

fn binding_matches_capability(
    binding: &UpstreamAccountGroupBinding,
    capability: RoutingCapability,
) -> bool {
    if binding.capabilities.is_empty() {
        return true;
    }
    let expected = capability_binding_codes(capability);
    binding.capabilities.iter().any(|value| {
        expected
            .iter()
            .any(|expected| value.trim().eq_ignore_ascii_case(expected))
    })
}

fn capability_binding_codes(capability: RoutingCapability) -> &'static [&'static str] {
    match capability {
        RoutingCapability::Chat => &["llm", "chat", "text"],
        RoutingCapability::Image => &["image"],
        RoutingCapability::Audio => &["audio", "sfx", "speech"],
        RoutingCapability::Music => &["music"],
        RoutingCapability::Video => &["video"],
        RoutingCapability::Embedding => &["llm", "embedding", "embeddings"],
        RoutingCapability::Rerank => &["llm", "rerank", "ranking"],
        RoutingCapability::Network => &["network", "http"],
    }
}

fn synthetic_model_route_from_account_route(
    query: &SelectUpstreamModelRouteQuery,
    route: &UpstreamAccountRoute,
    account_group_id: i64,
) -> ModelUpstreamRoute {
    let provider_model = matching_resource_entitlement(route, account_group_id, query)
        .and_then(|entitlement| entitlement.provider_native_model.as_deref())
        .map(str::to_owned)
        .unwrap_or_else(|| provider_native_model_from_query(query));
    let mut model_route = ModelUpstreamRoute::new_for_catalog_key(
        &query.catalog_key,
        &query.requested_model,
        &route.supplier_code,
        route.account_id,
        &provider_model,
    )
    .with_region_code(&route.region_code)
    .with_api_code(&query.api_code)
    .with_credential(
        route.credential_id,
        route.credential_rotation.clone(),
        route.credential_priority,
        route.credential_weight,
    )
    .with_upstream_endpoint(route.base_url.clone(), route.secret_ref.clone())
    .with_auth_profile(route.auth_profile.clone());
    model_route.timeout_ms = route.timeout_ms;
    model_route.retry_policy = route.retry_policy.clone();
    model_route
}

fn apply_upstream_account_route(
    route: ModelUpstreamRoute,
    account_route: &UpstreamAccountRoute,
) -> ModelUpstreamRoute {
    let mut route = route
        .with_region_code(&account_route.region_code)
        .with_credential(
            account_route.credential_id,
            account_route.credential_rotation.clone(),
            account_route.credential_priority,
            account_route.credential_weight,
        )
        .with_upstream_endpoint(
            account_route.base_url.clone(),
            account_route.secret_ref.clone(),
        )
        .with_auth_profile(account_route.auth_profile.clone());
    route.timeout_ms = account_route.timeout_ms;
    route.retry_policy = account_route.retry_policy.clone();
    route
}

fn push_unique_model_route(routes: &mut Vec<ModelUpstreamRoute>, route: ModelUpstreamRoute) {
    if routes
        .iter()
        .any(|existing| same_model_route_target(existing, &route))
    {
        return;
    }
    routes.push(route);
}

fn same_model_route_target(left: &ModelUpstreamRoute, right: &ModelUpstreamRoute) -> bool {
    left.account_id == right.account_id
        && left.credential_id == right.credential_id
        && left.region_code == right.region_code
        && left.supplier_code == right.supplier_code
        && left.catalog_key == right.catalog_key
        && left.api_code == right.api_code
        && left.provider_model == right.provider_model
        && left.base_url == right.base_url
        && left.secret_ref == right.secret_ref
}

fn account_route_allows_model_request(
    route: &UpstreamAccountRoute,
    candidate: &RouteCandidate,
    query: &SelectUpstreamModelRouteQuery,
) -> bool {
    let Some(binding) = route
        .account_group_bindings
        .iter()
        .find(|binding| binding.account_group_id == candidate.account_group_id)
    else {
        return false;
    };
    match binding.resource_entitlements.as_deref() {
        None => true,
        Some(resource_entitlements) => resource_entitlements
            .iter()
            .any(|entitlement| resource_entitlement_matches_request(entitlement, query)),
    }
}

/// Model-less request path: the account's resource bindings must cover the
/// requested api resource. Model-scoped entitlements cannot be verified
/// without a model, so an account whose entitlements only name models is
/// never selected for an api-request-metered call (fail closed).
fn account_route_allows_api_resource(
    route: &UpstreamAccountRoute,
    query: &SelectUpstreamAccountRouteQuery,
) -> bool {
    let Some(binding) = route
        .account_group_bindings
        .iter()
        .find(|binding| binding.account_group_id == query.context.group_id)
    else {
        return false;
    };
    match binding.resource_entitlements.as_deref() {
        None => true,
        Some(resource_entitlements) => resource_entitlements
            .iter()
            .any(|entitlement| resource_entitlement_matches_api_request(entitlement, query)),
    }
}

fn resource_entitlement_matches_api_request(
    entitlement: &crate::domain::UpstreamResourceEntitlement,
    query: &SelectUpstreamAccountRouteQuery,
) -> bool {
    // Model-scoped constraints cannot be verified on a model-less request:
    // fail closed so an account whose entitlements only name models is never
    // picked for an api-request-metered call.
    if non_blank(entitlement.catalog_key.as_deref())
        || non_blank(entitlement.model.as_deref())
        || non_blank(entitlement.provider_native_model.as_deref())
    {
        return false;
    }
    let mut constrained = false;
    if let Some(vendor_code) = entitlement
        .vendor_code
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        constrained = true;
        let matches = parse_model_catalog_identity(&query.route_key)
            .map(|identity| {
                identity
                    .vendor_code
                    .eq_ignore_ascii_case(vendor_code.trim())
            })
            .unwrap_or(false);
        if !matches {
            return false;
        }
    }
    if let Some(api_code) = entitlement
        .api_code
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        constrained = true;
        if normalize_api_scope_value(api_code) != normalize_api_scope_value(&query.api_code) {
            return false;
        }
    }
    if let Some(modality) = entitlement
        .modality_code
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        constrained = true;
        if !capability_binding_codes(query.capability)
            .iter()
            .any(|expected| modality.trim().eq_ignore_ascii_case(expected))
        {
            return false;
        }
    }
    constrained
}

fn non_blank(value: Option<&str>) -> bool {
    value.map(str::trim).is_some_and(|value| !value.is_empty())
}

fn matching_resource_entitlement<'a>(
    route: &'a UpstreamAccountRoute,
    account_group_id: i64,
    query: &SelectUpstreamModelRouteQuery,
) -> Option<&'a crate::domain::UpstreamResourceEntitlement> {
    route
        .account_group_bindings
        .iter()
        .find(|binding| binding.account_group_id == account_group_id)?
        .resource_entitlements
        .as_deref()?
        .iter()
        .find(|entitlement| resource_entitlement_matches_request(entitlement, query))
}

fn resource_entitlement_matches_request(
    entitlement: &crate::domain::UpstreamResourceEntitlement,
    query: &SelectUpstreamModelRouteQuery,
) -> bool {
    let catalog_key = query.catalog_key.trim();
    let requested_model = query.requested_model.trim();
    let native_model = provider_native_model_from_query(query);
    let mut constrained = false;

    if let Some(value) = entitlement
        .catalog_key
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        constrained = true;
        if !value.trim().eq_ignore_ascii_case(catalog_key) {
            return false;
        }
    }
    if let Some(value) = entitlement
        .model
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        constrained = true;
        let value = value.trim();
        if !value.eq_ignore_ascii_case(requested_model)
            && !value.eq_ignore_ascii_case(catalog_key)
            && !value.eq_ignore_ascii_case(&native_model)
        {
            return false;
        }
    }
    if let Some(value) = entitlement
        .provider_native_model
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        constrained = true;
        if !value.trim().eq_ignore_ascii_case(&native_model) {
            return false;
        }
    }
    if let Some(vendor_code) = entitlement
        .vendor_code
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        constrained = true;
        let matches = parse_model_catalog_identity(catalog_key)
            .map(|identity| {
                identity
                    .vendor_code
                    .eq_ignore_ascii_case(vendor_code.trim())
            })
            .unwrap_or(false);
        if !matches {
            return false;
        }
    }
    if let Some(api_code) = entitlement
        .api_code
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        constrained = true;
        if normalize_api_scope_value(api_code) != normalize_api_scope_value(&query.api_code) {
            return false;
        }
    }
    if let Some(modality) = entitlement
        .modality_code
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        constrained = true;
        if !capability_binding_codes(query.capability)
            .iter()
            .any(|expected| modality.trim().eq_ignore_ascii_case(expected))
        {
            return false;
        }
    }

    constrained
}

fn model_route_matches_request_api(route: &ModelUpstreamRoute, requested_api_code: &str) -> bool {
    route
        .api_code
        .as_deref()
        .map(|api_code| api_scope_value_matches_key(api_code, requested_api_code))
        .unwrap_or(true)
}

fn provider_native_model_from_query(query: &SelectUpstreamModelRouteQuery) -> String {
    if let Some(native_model) = native_model_from_base_catalog_key(&query.catalog_key) {
        return native_model;
    }
    provider_native_model_id(&query.catalog_key)
}

fn native_model_from_base_catalog_key(value: &str) -> Option<String> {
    parse_model_catalog_identity(value).map(|identity| identity.model_id())
}

/// Returns `Some(rule)` when the account group's model access rules reject
/// the requested model (`"blacklist"` when a blacklist entry matches,
/// `"whitelist"` when a non-empty whitelist does not match), or `None` when
/// the request is allowed. The blacklist wins over the whitelist. An entry
/// with an empty `models` list covers every model of the vendor, and an
/// entry matches only when the request's model vendor is known and equals the
/// entry vendor; model names compare case-insensitively against the requested
/// model.
pub fn model_access_forbidden_reason(
    vendor_code: Option<&str>,
    requested_model: &str,
    access: &AccountGroupModelAccess,
) -> Option<&'static str> {
    model_access_forbidden_reason_lists(
        vendor_code,
        requested_model,
        &access.blacklist,
        &access.whitelist,
    )
}

/// 底层判定：黑名单命中返回 "blacklist"；白名单非空且未覆盖返回 "whitelist"。
/// 分组级与供应商级黑白名单共用（两者条目结构与语义一致）。
pub fn model_access_forbidden_reason_lists(
    vendor_code: Option<&str>,
    requested_model: &str,
    blacklist: &[crate::ports::VendorModelListEntry],
    whitelist: &[crate::ports::VendorModelListEntry],
) -> Option<&'static str> {
    let entry_matches = |entry: &crate::ports::VendorModelListEntry| {
        vendor_code
            .map(|vendor| vendor == entry.vendor_code)
            .unwrap_or(false)
            && (entry.models.is_empty()
                || entry
                    .models
                    .iter()
                    .any(|model| model.eq_ignore_ascii_case(requested_model)))
    };
    if blacklist.iter().any(entry_matches) {
        return Some("blacklist");
    }
    if !whitelist.is_empty() && !whitelist.iter().any(entry_matches) {
        return Some("whitelist");
    }
    None
}

pub fn model_access_forbidden_message(
    rule: &str,
    requested_model: &str,
    group_code: &str,
) -> String {
    match rule {
        "blacklist" => format!(
            "model {requested_model} is forbidden by account group {group_code} (model blacklist)"
        ),
        _ => format!(
            "model {requested_model} is not allowed by account group {group_code} (model whitelist)"
        ),
    }
}
