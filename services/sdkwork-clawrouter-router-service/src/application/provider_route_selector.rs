use crate::application::{AuthenticatedApiKeyContext, PricingResolver, ResolveModelPriceQuery};
use std::cmp::Reverse;
use std::collections::{BTreeMap, HashMap};
use std::fmt::{Display, Formatter};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};

use crate::domain::{
    parse_model_catalog_identity, provider_native_model_id, BillingMeter, DomainError,
    DomainResult, GatewayApiKeyAccountGroupBinding, ModelUpstreamRoute,
    UpstreamAccountGroupBinding, UpstreamAccountRoute, RouteCandidate, RoutingCapability,
    RoutingPolicy, RoutingPolicyScope, RoutingRule,
};
use crate::ports::PricingCatalog;

#[derive(Debug, Clone, Default)]
struct UpstreamAccountGroupBindings {
    has_any_group_binding: bool,
    by_channel: BTreeMap<i64, Vec<UpstreamAccountGroupBinding>>,
}

impl UpstreamAccountGroupBindings {
    fn unrestricted(&self) -> bool {
        !self.has_any_group_binding
    }

    fn contains_channel(&self, account_id: i64) -> bool {
        self.by_channel.contains_key(&account_id)
    }

    fn get(&self, account_id: i64) -> Option<&[UpstreamAccountGroupBinding]> {
        self.by_channel.get(&account_id).map(Vec::as_slice)
    }

    fn matched_channel_count(&self) -> usize {
        self.by_channel.len()
    }
}

pub struct ProviderRouteSelector<'a, C: PricingCatalog> {
    catalog: &'a C,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SelectProviderRouteQuery {
    pub context: AuthenticatedApiKeyContext,
    pub catalog_key: String,
    pub requested_model: String,
    pub api_code: String,
    pub capability: RoutingCapability,
    pub billing_meter: BillingMeter,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SelectedProviderRoute {
    pub route: ModelUpstreamRoute,
    pub group_id: i64,
    pub group_code: String,
    pub pricing_plan_code: String,
    pub policy_id: Option<i64>,
    pub rule_id: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SelectedProviderRoutePlan {
    pub routes: Vec<SelectedProviderRoute>,
    pub policy_id: Option<i64>,
    pub rule_id: Option<i64>,
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
    pub group_id: i64,
    pub group_code: String,
    pub pricing_plan_code: String,
    pub policy_id: Option<i64>,
    pub rule_id: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProviderRouteSelectionError {
    kind: ProviderRouteSelectionErrorKind,
    message: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProviderRouteSelectionErrorKind {
    ProviderRouteUnavailable,
    PricingUnavailable,
}

impl ProviderRouteSelectionError {
    pub fn provider_route_unavailable(message: impl Into<String>) -> Self {
        Self {
            kind: ProviderRouteSelectionErrorKind::ProviderRouteUnavailable,
            message: message.into(),
        }
    }

    pub fn pricing_unavailable(message: impl Into<String>) -> Self {
        Self {
            kind: ProviderRouteSelectionErrorKind::PricingUnavailable,
            message: message.into(),
        }
    }

    pub fn kind(&self) -> ProviderRouteSelectionErrorKind {
        self.kind
    }
}

impl Display for ProviderRouteSelectionError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.message)
    }
}

impl std::error::Error for ProviderRouteSelectionError {}

#[derive(Debug, Clone, PartialEq, Eq)]
struct SelectedPolicyScope {
    scope: RoutingPolicyScope,
    policies: Vec<RoutingPolicy>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum PolicyScopeRouteSelection {
    Planned(SelectedProviderRoutePlan),
    SoftUnavailable(ProviderRouteSelectionError),
    HardError(ProviderRouteSelectionError),
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum PolicyScopeChannelRouteSelection {
    Selected(SelectedUpstreamAccountRoute),
    SoftUnavailable(ProviderRouteSelectionError),
    HardError(ProviderRouteSelectionError),
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum CandidateRouteEvaluation {
    Planned(Vec<ModelUpstreamRoute>),
    PricingUnavailable(DomainError),
    NoCallableCandidate,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum CandidateChannelRouteEvaluation {
    Selected(UpstreamAccountRoute),
    NoCallableCandidate,
}

impl<'a, C: PricingCatalog> ProviderRouteSelector<'a, C> {
    pub fn new(catalog: &'a C) -> Self {
        Self { catalog }
    }

    pub fn select(
        &self,
        query: SelectProviderRouteQuery,
    ) -> Result<SelectedProviderRoute, ProviderRouteSelectionError> {
        self.select_plan(query)?.first_route().ok_or_else(|| {
            ProviderRouteSelectionError::provider_route_unavailable(
                "selected provider route plan contains no routes",
            )
        })
    }

    pub fn select_plan(
        &self,
        query: SelectProviderRouteQuery,
    ) -> Result<SelectedProviderRoutePlan, ProviderRouteSelectionError> {
        let mut last_unavailable = None;
        for context in self.route_contexts(&query.context)? {
            let scoped_query = SelectProviderRouteQuery {
                context,
                ..query.clone()
            };
            match self.select_plan_for_context(scoped_query) {
                Ok(selection) => return Ok(selection),
                Err(error)
                    if error.kind() == ProviderRouteSelectionErrorKind::PricingUnavailable =>
                {
                    return Err(error);
                }
                Err(error) => {
                    last_unavailable = Some(error);
                }
            }
        }

        Err(last_unavailable.unwrap_or_else(|| {
            ProviderRouteSelectionError::provider_route_unavailable(format!(
                "provider route is not available for model: {}",
                query.catalog_key
            ))
        }))
    }

    fn select_plan_for_context(
        &self,
        query: SelectProviderRouteQuery,
    ) -> Result<SelectedProviderRoutePlan, ProviderRouteSelectionError> {
        let channel_routes = self.catalog.list_upstream_account_routes();
        let channel_routes_loaded = channel_routes.len();
        let api_scope_keys = [query.api_code.as_str()];
        let account_group_bindings = upstream_account_account_group_bindings(
            &channel_routes,
            query.context.group_id,
            &api_scope_keys,
            query.capability,
        );
        let model_routes = self.catalog.list_model_upstream_routes(&query.catalog_key);
        let model_routes_loaded = model_routes.len();
        let routes = self.group_scoped_model_routes(model_routes, &channel_routes, &account_group_bindings);
        let channel_routes = self.group_scoped_channel_routes(channel_routes, &account_group_bindings);
        if routes.is_empty() && channel_routes.is_empty() {
            log_unavailable_model_route_diagnostics(
                &query,
                model_routes_loaded,
                channel_routes_loaded,
                &account_group_bindings,
                routes.len(),
                channel_routes.len(),
            );
            return Err(ProviderRouteSelectionError::provider_route_unavailable(
                unavailable_model_route_message(&query, model_routes_loaded, channel_routes_loaded),
            ));
        }

        let policy_scopes = self.select_policy_scopes(&query.context);
        let mut last_unavailable = None;
        for policy_scope in policy_scopes {
            match self.select_plan_from_policy_scope(
                &query,
                &routes,
                &channel_routes,
                policy_scope,
                &account_group_bindings,
            ) {
                PolicyScopeRouteSelection::Planned(selection) => return Ok(selection),
                PolicyScopeRouteSelection::SoftUnavailable(error) => {
                    last_unavailable = Some(error);
                }
                PolicyScopeRouteSelection::HardError(error) => return Err(error),
            }
        }
        if let Some(selection) = self.select_group_bound_channel_route_plan(
            &query,
            &routes,
            &channel_routes,
            &account_group_bindings,
        )? {
            return Ok(selection);
        }
        if let Some(error) = last_unavailable {
            return Err(error);
        }

        Err(ProviderRouteSelectionError::provider_route_unavailable(
            format!(
                "provider route is not available for configured channel route: routing policy scope is required for model {}",
                query.catalog_key
            ),
        ))
    }

    pub fn select_channel_route(
        &self,
        query: SelectUpstreamAccountRouteQuery,
    ) -> Result<SelectedUpstreamAccountRoute, ProviderRouteSelectionError> {
        let mut last_unavailable = None;
        for context in self.route_contexts(&query.context)? {
            let scoped_query = SelectUpstreamAccountRouteQuery {
                context,
                ..query.clone()
            };
            match self.select_channel_route_for_context(scoped_query) {
                Ok(selection) => return Ok(selection),
                Err(error)
                    if error.kind() == ProviderRouteSelectionErrorKind::PricingUnavailable =>
                {
                    return Err(error);
                }
                Err(error) => {
                    last_unavailable = Some(error);
                }
            }
        }

        Err(last_unavailable.unwrap_or_else(|| {
            ProviderRouteSelectionError::provider_route_unavailable(format!(
                "provider route is not available for configured channel route: routing policy scope is required for route {}",
                query.route_key
            ))
        }))
    }

    fn select_channel_route_for_context(
        &self,
        query: SelectUpstreamAccountRouteQuery,
    ) -> Result<SelectedUpstreamAccountRoute, ProviderRouteSelectionError> {
        let channel_routes = self.catalog.list_upstream_account_routes();
        let api_scope_keys = [query.api_code.as_str()];
        let account_group_bindings = upstream_account_account_group_bindings(
            &channel_routes,
            query.context.group_id,
            &api_scope_keys,
            query.capability,
        );
        let routes = self.group_scoped_channel_routes(channel_routes, &account_group_bindings);
        if routes.is_empty() {
            return Err(ProviderRouteSelectionError::provider_route_unavailable(
                "provider route is not available for configured channel route: no channel routes are configured",
            ));
        }

        let policy_scopes = self.select_policy_scopes(&query.context);
        let mut last_unavailable = None;
        for policy_scope in policy_scopes {
            match self.select_channel_route_from_policy_scope(
                &query,
                &routes,
                policy_scope,
                &account_group_bindings,
            ) {
                PolicyScopeChannelRouteSelection::Selected(selection) => return Ok(selection),
                PolicyScopeChannelRouteSelection::SoftUnavailable(error) => {
                    last_unavailable = Some(error);
                }
                PolicyScopeChannelRouteSelection::HardError(error) => return Err(error),
            }
        }
        if let Some(selection) =
            self.select_group_bound_channel_route(&routes, &account_group_bindings, &query.context)
        {
            return Ok(selection);
        }
        if let Some(error) = last_unavailable {
            return Err(error);
        }

        Err(ProviderRouteSelectionError::provider_route_unavailable(
            format!(
                "provider route is not available for configured channel route: routing policy scope is required for route {}",
                query.route_key
            ),
        ))
    }

    fn route_contexts(
        &self,
        context: &AuthenticatedApiKeyContext,
    ) -> Result<Vec<AuthenticatedApiKeyContext>, ProviderRouteSelectionError> {
        let Some(api_key) = self.catalog.find_api_key(context.api_key_id) else {
            return Ok(vec![context.clone()]);
        };
        if api_key.tenant_id != context.tenant_id
            || api_key.organization_id != context.organization_id
            || api_key.user_id != context.user_id
        {
            return Err(ProviderRouteSelectionError::provider_route_unavailable(
                "authenticated api key context does not match catalog ownership",
            ));
        }

        let mut contexts = api_key
            .effective_account_account_group_bindings()
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
        let group = self.catalog.find_upstream_account_group(binding.group_id)?;
        // Verify the bound channel group belongs to the same tenant/organization,
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
            group_code: normalized_text_or(&binding.group_code, &group.code),
            pricing_plan_code: normalized_text_or(
                &binding.pricing_plan_code,
                &group.pricing_plan_code,
            ),
        })
    }

    fn select_policy_scopes(
        &self,
        context: &AuthenticatedApiKeyContext,
    ) -> Vec<SelectedPolicyScope> {
        let mut policies = self
            .catalog
            .list_routing_policies()
            .into_iter()
            .filter(|policy| self.policy_is_in_scope(policy, context))
            .collect::<Vec<_>>();
        policies.sort_by_key(|policy| (policy_rank(policy.policy_scope), policy.id));
        let mut scopes = Vec::new();
        for policy in policies {
            if let Some(existing) = scopes
                .iter_mut()
                .find(|scope: &&mut SelectedPolicyScope| scope.scope == policy.policy_scope)
            {
                existing.policies.push(policy);
            } else {
                scopes.push(SelectedPolicyScope {
                    scope: policy.policy_scope,
                    policies: vec![policy],
                });
            }
        }
        scopes
    }

    fn select_plan_from_policy_scope(
        &self,
        query: &SelectProviderRouteQuery,
        routes: &[ModelUpstreamRoute],
        channel_routes: &[UpstreamAccountRoute],
        policy_scope: SelectedPolicyScope,
        account_group_bindings: &UpstreamAccountGroupBindings,
    ) -> PolicyScopeRouteSelection {
        let policy = match self
            .select_policy_for_capability(&policy_scope.policies, query.capability)
        {
            Some(policy) => policy,
            None => {
                let error = ProviderRouteSelectionError::provider_route_unavailable(format!(
                    "provider route is not available for configured channel route: {} policy scope has no routing policy for capability {:?}",
                    scope_label(policy_scope.scope),
                    query.capability
                ));
                if account_group_bindings.unrestricted() {
                    return PolicyScopeRouteSelection::HardError(error);
                }
                return PolicyScopeRouteSelection::SoftUnavailable(error);
            }
        };
        let Some(profile_id) = policy.default_profile_id else {
            return PolicyScopeRouteSelection::SoftUnavailable(
                ProviderRouteSelectionError::provider_route_unavailable(format!(
                    "provider route is not available for configured channel route: routing policy {} has no default profile",
                    policy.policy_code
                )),
            );
        };
        let mut rules = self.catalog.list_routing_rules(profile_id);
        rules.sort_by_key(|rule| (rule.priority, rule.id));
        for rule in rules
            .into_iter()
            .filter(|rule| self.rule_is_in_scope(rule, &query.context))
            .filter(|rule| rule.matches_catalog_key(&query.catalog_key, &query.requested_model))
        {
            let candidate_chain = scoped_candidate_chain(&rule, &policy, account_group_bindings);
            let used_rule_fallback_chain =
                candidate_chain_uses_rule_fallback(&rule, &candidate_chain);
            match self.evaluate_candidate_route_plan(query, routes, channel_routes, candidate_chain)
            {
                CandidateRouteEvaluation::Planned(routes) => {
                    return PolicyScopeRouteSelection::Planned(SelectedProviderRoutePlan {
                        routes: routes
                            .into_iter()
                            .map(|route| {
                                selected_provider_route(
                                    route,
                                    &query.context,
                                    Some(policy.id),
                                    Some(rule.id),
                                )
                            })
                            .collect(),
                        policy_id: Some(policy.id),
                        rule_id: Some(rule.id),
                    });
                }
                CandidateRouteEvaluation::PricingUnavailable(error) => {
                    return PolicyScopeRouteSelection::HardError(
                        ProviderRouteSelectionError::pricing_unavailable(format!(
                            "pricing is not available for configured channel route: policy {} rule {} candidate price is unavailable for model {}: {}",
                            policy.policy_code, rule.rule_code, query.catalog_key, error
                        )),
                    );
                }
                CandidateRouteEvaluation::NoCallableCandidate => {}
            }
            if !policy
                .fallback_mode_or_default()
                .allows_rule_fallback_chain()
                && !rule.fallback_chain.is_empty()
            {
                return PolicyScopeRouteSelection::SoftUnavailable(
                    ProviderRouteSelectionError::provider_route_unavailable(format!(
                        "provider route is not available for configured channel route: policy {} fallback mode none disables rule {} fallback chain for model {}",
                        policy.policy_code, rule.rule_code, query.catalog_key
                    )),
                );
            }
            return PolicyScopeRouteSelection::SoftUnavailable(
                ProviderRouteSelectionError::provider_route_unavailable(format!(
                    "provider route is not available for configured channel route: policy {} rule {} has no callable priced candidate channel{} for model {}",
                    policy.policy_code,
                    rule.rule_code,
                    if used_rule_fallback_chain {
                        " or fallback channel"
                    } else {
                        ""
                    },
                    query.catalog_key
                )),
            );
        }
        PolicyScopeRouteSelection::SoftUnavailable(
            ProviderRouteSelectionError::provider_route_unavailable(format!(
                "provider route is not available for configured channel route: policy {} has no routing rule for model {}",
                policy.policy_code, query.catalog_key
            )),
        )
    }

    fn select_channel_route_from_policy_scope(
        &self,
        query: &SelectUpstreamAccountRouteQuery,
        routes: &[UpstreamAccountRoute],
        policy_scope: SelectedPolicyScope,
        account_group_bindings: &UpstreamAccountGroupBindings,
    ) -> PolicyScopeChannelRouteSelection {
        let policy = match self
            .select_policy_for_capability(&policy_scope.policies, query.capability)
        {
            Some(policy) => policy,
            None => {
                let error = ProviderRouteSelectionError::provider_route_unavailable(format!(
                    "provider route is not available for configured channel route: {} policy scope has no routing policy for capability {:?}",
                    scope_label(policy_scope.scope),
                    query.capability
                ));
                if account_group_bindings.unrestricted() {
                    return PolicyScopeChannelRouteSelection::HardError(error);
                }
                return PolicyScopeChannelRouteSelection::SoftUnavailable(error);
            }
        };
        let Some(profile_id) = policy.default_profile_id else {
            return PolicyScopeChannelRouteSelection::SoftUnavailable(
                ProviderRouteSelectionError::provider_route_unavailable(format!(
                    "provider route is not available for configured channel route: routing policy {} has no default profile",
                    policy.policy_code
                )),
            );
        };
        let mut rules = self.catalog.list_routing_rules(profile_id);
        rules.sort_by_key(|rule| (rule.priority, rule.id));
        for rule in rules
            .into_iter()
            .filter(|rule| self.rule_is_in_scope(rule, &query.context))
            .filter(|rule| rule.matches_route_key(&query.route_key))
        {
            let candidate_chain = scoped_candidate_chain(&rule, &policy, account_group_bindings);
            let used_rule_fallback_chain =
                candidate_chain_uses_rule_fallback(&rule, &candidate_chain);
            match self.evaluate_candidate_channel_routes(routes, candidate_chain) {
                CandidateChannelRouteEvaluation::Selected(route) => {
                    return PolicyScopeChannelRouteSelection::Selected(
                        selected_upstream_account_route(
                            route,
                            &query.context,
                            Some(policy.id),
                            Some(rule.id),
                        ),
                    );
                }
                CandidateChannelRouteEvaluation::NoCallableCandidate => {}
            }
            if !policy
                .fallback_mode_or_default()
                .allows_rule_fallback_chain()
                && !rule.fallback_chain.is_empty()
            {
                return PolicyScopeChannelRouteSelection::SoftUnavailable(
                    ProviderRouteSelectionError::provider_route_unavailable(format!(
                        "provider route is not available for configured channel route: policy {} fallback mode none disables rule {} fallback chain for route {}",
                        policy.policy_code, rule.rule_code, query.route_key
                    )),
                );
            }
            return PolicyScopeChannelRouteSelection::SoftUnavailable(
                ProviderRouteSelectionError::provider_route_unavailable(format!(
                    "provider route is not available for configured channel route: policy {} rule {} has no callable channel route candidate{} for route {}",
                    policy.policy_code,
                    rule.rule_code,
                    if used_rule_fallback_chain {
                        " or fallback channel"
                    } else {
                        ""
                    },
                    query.route_key
                )),
            );
        }
        PolicyScopeChannelRouteSelection::SoftUnavailable(
            ProviderRouteSelectionError::provider_route_unavailable(format!(
                "provider route is not available for configured channel route: policy {} has no routing rule for route {}",
                policy.policy_code, query.route_key
            )),
        )
    }

    fn select_policy_for_capability(
        &self,
        policies: &[RoutingPolicy],
        capability: RoutingCapability,
    ) -> Option<RoutingPolicy> {
        policies
            .iter()
            .filter(|policy| self.policy_matches_capability(policy, capability))
            .cloned()
            .min_by_key(|policy| (capability_match_rank(policy, capability), policy.id))
    }

    fn policy_matches_capability(
        &self,
        policy: &RoutingPolicy,
        capability: RoutingCapability,
    ) -> bool {
        policy
            .capability
            .map(|policy_capability| policy_capability == capability)
            .unwrap_or(true)
    }

    fn policy_is_in_scope(
        &self,
        policy: &RoutingPolicy,
        context: &AuthenticatedApiKeyContext,
    ) -> bool {
        match policy.policy_scope {
            RoutingPolicyScope::UpstreamAccountGroup => {
                same_tenant_org(policy, context) && policy.subject_id == Some(context.group_id)
            }
            RoutingPolicyScope::ApiKey => {
                same_tenant_org(policy, context) && policy.subject_id == Some(context.api_key_id)
            }
            RoutingPolicyScope::Organization => {
                same_tenant(policy, context)
                    && policy.organization_id == context.organization_id
                    && policy.subject_id.unwrap_or(context.organization_id)
                        == context.organization_id
            }
            RoutingPolicyScope::Tenant => {
                policy.tenant_id == context.tenant_id
                    && policy.subject_id.unwrap_or(context.tenant_id) == context.tenant_id
            }
            RoutingPolicyScope::Global => {
                policy.tenant_id == 0 && policy.organization_id == 0 && policy.subject_id.is_none()
            }
        }
    }

    fn rule_is_in_scope(&self, rule: &RoutingRule, context: &AuthenticatedApiKeyContext) -> bool {
        (rule.tenant_id == 0 || rule.tenant_id == context.tenant_id)
            && (rule.organization_id == 0 || rule.organization_id == context.organization_id)
    }

    fn evaluate_candidate_route_plan(
        &self,
        query: &SelectProviderRouteQuery,
        routes: &[ModelUpstreamRoute],
        channel_routes: &[UpstreamAccountRoute],
        candidates: Vec<RouteCandidate>,
    ) -> CandidateRouteEvaluation {
        let mut pricing_error = None;
        let mut selected_routes = Vec::new();
        for candidate in candidates {
            let candidate_routes =
                self.resolve_candidate_model_routes(query, routes, channel_routes, &candidate);
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
                .map(CandidateRouteEvaluation::PricingUnavailable)
                .unwrap_or(CandidateRouteEvaluation::NoCallableCandidate)
        } else {
            CandidateRouteEvaluation::Planned(selected_routes)
        }
    }

    fn select_group_bound_channel_route_plan(
        &self,
        query: &SelectProviderRouteQuery,
        routes: &[ModelUpstreamRoute],
        channel_routes: &[UpstreamAccountRoute],
        account_group_bindings: &UpstreamAccountGroupBindings,
    ) -> Result<Option<SelectedProviderRoutePlan>, ProviderRouteSelectionError> {
        if account_group_bindings.unrestricted() {
            return Ok(None);
        }

        let candidates = group_bound_channel_route_candidates(channel_routes, account_group_bindings);
        if candidates.is_empty() {
            return Ok(None);
        }

        match self.evaluate_candidate_route_plan(query, routes, channel_routes, candidates) {
            CandidateRouteEvaluation::Planned(routes) => Ok(Some(SelectedProviderRoutePlan {
                routes: routes
                    .into_iter()
                    .map(|route| selected_provider_route(route, &query.context, None, None))
                    .collect(),
                policy_id: None,
                rule_id: None,
            })),
            CandidateRouteEvaluation::PricingUnavailable(error) => {
                Err(ProviderRouteSelectionError::pricing_unavailable(format!(
                    "pricing is not available for group-bound channel route for model {}: {}",
                    query.catalog_key, error
                )))
            }
            CandidateRouteEvaluation::NoCallableCandidate => Ok(None),
        }
    }

    fn resolve_candidate_model_routes(
        &self,
        query: &SelectProviderRouteQuery,
        routes: &[ModelUpstreamRoute],
        channel_routes: &[UpstreamAccountRoute],
        candidate: &RouteCandidate,
    ) -> Vec<ModelUpstreamRoute> {
        let model_routes = routes
            .iter()
            .filter_map(|route| {
                if route.account_id != candidate.account_id
                    || !candidate_region_matches(
                        &route.region_code,
                        candidate.region_code.as_deref(),
                    )
                    || !model_route_matches_request_api(route, &query.api_code)
                {
                    return None;
                }
                if route.credential_id.is_some() && self.route_is_callable(route) {
                    return Some(route.clone());
                }
                let channel_route = channel_routes
                    .iter()
                    .filter(|channel_route| {
                        channel_route.account_id == route.account_id
                            && channel_route.supplier_code == route.supplier_code
                            && same_region(&channel_route.region_code, &route.region_code)
                            && self.channel_route_is_callable(channel_route)
                    })
                    .cloned()
                    .collect::<Vec<_>>()
                    .pipe(order_channel_credential_routes)
                    .into_iter()
                    .next();
                Some(match channel_route {
                    Some(channel_route) => {
                        apply_channel_route_account(route.clone(), &channel_route)
                    }
                    None => route.clone(),
                })
            })
            .collect::<Vec<_>>();
        if !model_routes.is_empty() {
            return order_model_credential_routes(model_routes);
        }

        channel_routes
            .iter()
            .filter(|route| {
                route.account_id == candidate.account_id
                    && candidate_region_matches(
                        &route.region_code,
                        candidate.region_code.as_deref(),
                    )
            })
            .filter(|route| self.channel_route_is_callable(route))
            .map(|route| synthetic_model_route_from_channel_route(query, route))
            .collect::<Vec<_>>()
            .pipe(order_model_credential_routes)
    }

    fn route_is_callable(&self, route: &ModelUpstreamRoute) -> bool {
        has_text(route.base_url.as_deref())
            && (has_text(route.secret_ref.as_deref())
                || !route.auth_profile.default_headers.is_empty())
    }

    fn evaluate_candidate_channel_routes(
        &self,
        routes: &[UpstreamAccountRoute],
        candidates: Vec<RouteCandidate>,
    ) -> CandidateChannelRouteEvaluation {
        for candidate in candidates {
            let route = routes
                .iter()
                .filter(|route| {
                    route.account_id == candidate.account_id
                        && candidate_region_matches(
                            &route.region_code,
                            candidate.region_code.as_deref(),
                        )
                })
                .cloned()
                .collect::<Vec<_>>()
                .pipe(order_channel_credential_routes)
                .into_iter()
                .find(|route| self.channel_route_is_callable(route));
            let Some(route) = route else {
                continue;
            };
            return CandidateChannelRouteEvaluation::Selected(route);
        }
        CandidateChannelRouteEvaluation::NoCallableCandidate
    }

    fn select_group_bound_channel_route(
        &self,
        routes: &[UpstreamAccountRoute],
        account_group_bindings: &UpstreamAccountGroupBindings,
        context: &AuthenticatedApiKeyContext,
    ) -> Option<SelectedUpstreamAccountRoute> {
        if account_group_bindings.unrestricted() {
            return None;
        }

        let candidates = group_bound_channel_route_candidates(routes, account_group_bindings);
        match self.evaluate_candidate_channel_routes(routes, candidates) {
            CandidateChannelRouteEvaluation::Selected(route) => {
                Some(selected_upstream_account_route(route, context, None, None))
            }
            CandidateChannelRouteEvaluation::NoCallableCandidate => None,
        }
    }

    fn group_scoped_channel_routes(
        &self,
        routes: Vec<UpstreamAccountRoute>,
        account_group_bindings: &UpstreamAccountGroupBindings,
    ) -> Vec<UpstreamAccountRoute> {
        if account_group_bindings.unrestricted() {
            return routes;
        }

        routes
            .into_iter()
            .filter(|route| account_group_bindings.contains_channel(route.account_id))
            .collect()
    }

    fn group_scoped_model_routes(
        &self,
        routes: Vec<ModelUpstreamRoute>,
        channel_routes: &[UpstreamAccountRoute],
        account_group_bindings: &UpstreamAccountGroupBindings,
    ) -> Vec<ModelUpstreamRoute> {
        if account_group_bindings.unrestricted() {
            return routes;
        }

        routes
            .into_iter()
            .filter(|route| {
                channel_routes.iter().any(|channel_route| {
                    channel_route.account_id == route.account_id
                        && channel_route.supplier_code == route.supplier_code
                        && account_group_bindings.contains_channel(channel_route.account_id)
                        && self.channel_route_is_callable(channel_route)
                })
            })
            .collect()
    }

    fn channel_route_is_callable(&self, route: &UpstreamAccountRoute) -> bool {
        has_text(route.base_url.as_deref())
            && (has_text(route.secret_ref.as_deref())
                || !route.auth_profile.default_headers.is_empty())
            && route.is_account_healthy()
    }

    fn ensure_route_is_priced(
        &self,
        query: &SelectProviderRouteQuery,
        route: &ModelUpstreamRoute,
    ) -> DomainResult<()> {
        PricingResolver::new(self.catalog)
            .resolve(ResolveModelPriceQuery {
                api_key_id: query.context.api_key_id,
                account_group_id: Some(query.context.group_id),
                model: route.catalog_key.clone(),
                billing_meter: query.billing_meter.clone(),
                supplier_code: Some(route.supplier_code.clone()),
                account_id: Some(route.account_id),
                region_code: Some(route.region_code.clone()),
            })
            .map(|_| ())
    }
}

impl SelectedProviderRoutePlan {
    pub fn first_route(&self) -> Option<SelectedProviderRoute> {
        self.routes.first().cloned()
    }
}

fn selected_provider_route(
    route: ModelUpstreamRoute,
    context: &AuthenticatedApiKeyContext,
    policy_id: Option<i64>,
    rule_id: Option<i64>,
) -> SelectedProviderRoute {
    SelectedProviderRoute {
        route,
        group_id: context.group_id,
        group_code: context.group_code.clone(),
        pricing_plan_code: context.pricing_plan_code.clone(),
        policy_id,
        rule_id,
    }
}

fn selected_upstream_account_route(
    route: UpstreamAccountRoute,
    context: &AuthenticatedApiKeyContext,
    policy_id: Option<i64>,
    rule_id: Option<i64>,
) -> SelectedUpstreamAccountRoute {
    SelectedUpstreamAccountRoute {
        route,
        group_id: context.group_id,
        group_code: context.group_code.clone(),
        pricing_plan_code: context.pricing_plan_code.clone(),
        policy_id,
        rule_id,
    }
}

fn candidate_chain(rule: &RoutingRule, policy: &RoutingPolicy) -> Vec<RouteCandidate> {
    let mut candidates = rule.candidate_account_groups.clone();
    candidates.sort_by_key(|candidate| (Reverse(candidate.weight), candidate.account_id));
    if policy
        .fallback_mode_or_default()
        .allows_rule_fallback_chain()
    {
        candidates.extend(rule.fallback_chain.clone());
    }
    candidates
}

fn scoped_candidate_chain(
    rule: &RoutingRule,
    policy: &RoutingPolicy,
    account_group_bindings: &UpstreamAccountGroupBindings,
) -> Vec<RouteCandidate> {
    if account_group_bindings.unrestricted() {
        return candidate_chain(rule, policy);
    }

    let mut candidates = group_bound_candidates(rule.candidate_account_groups.clone(), account_group_bindings);
    if policy
        .fallback_mode_or_default()
        .allows_rule_fallback_chain()
    {
        candidates.extend(group_bound_candidates(
            rule.fallback_chain.clone(),
            account_group_bindings,
        ));
    }
    candidates
}

fn group_bound_candidates(
    mut candidates: Vec<RouteCandidate>,
    account_group_bindings: &UpstreamAccountGroupBindings,
) -> Vec<RouteCandidate> {
    candidates.retain(|candidate| account_group_bindings.contains_channel(candidate.account_id));
    candidates.sort_by_key(|candidate| {
        let binding = account_group_bindings
            .get(candidate.account_id)
            .and_then(best_group_binding)
            .expect("group-bound candidate must have a binding");
        (
            binding.priority,
            Reverse(binding.weight),
            Reverse(candidate.weight),
            candidate.account_id,
        )
    });
    candidates
}

fn group_bound_channel_route_candidates(
    routes: &[UpstreamAccountRoute],
    account_group_bindings: &UpstreamAccountGroupBindings,
) -> Vec<RouteCandidate> {
    let mut candidates = routes
        .iter()
        .filter_map(|route| {
            let binding = account_group_bindings
                .get(route.account_id)
                .and_then(best_group_binding)?;
            Some((
                binding.priority,
                Reverse(binding.weight),
                route.account_id,
                RouteCandidate::new(route.account_id, i64::from(binding.weight))
                    .with_region_code(&route.region_code),
            ))
        })
        .collect::<Vec<_>>();
    candidates.sort_by_key(|(priority, weight, account_id, _candidate)| {
        (*priority, *weight, *account_id)
    });
    candidates
        .into_iter()
        .map(|(_priority, _weight, _account_id, candidate)| candidate)
        .collect()
}

fn candidate_chain_uses_rule_fallback(rule: &RoutingRule, candidates: &[RouteCandidate]) -> bool {
    candidates.iter().any(|candidate| {
        !rule
            .candidate_account_groups
            .iter()
            .any(|primary| same_candidate_route(primary, candidate))
    })
}

fn same_candidate_route(left: &RouteCandidate, right: &RouteCandidate) -> bool {
    left.account_id == right.account_id
        && match (left.region_code.as_deref(), right.region_code.as_deref()) {
            (Some(left), Some(right)) => same_region(left, right),
            (None, None) => true,
            _ => false,
        }
}

fn policy_rank(scope: RoutingPolicyScope) -> i32 {
    match scope {
        RoutingPolicyScope::UpstreamAccountGroup => 0,
        RoutingPolicyScope::ApiKey => 1,
        RoutingPolicyScope::Organization => 2,
        RoutingPolicyScope::Tenant => 3,
        RoutingPolicyScope::Global => 4,
    }
}

fn capability_match_rank(policy: &RoutingPolicy, capability: RoutingCapability) -> i32 {
    match policy.capability {
        Some(policy_capability) if policy_capability == capability => 0,
        None => 1,
        Some(_) => 2,
    }
}

fn scope_label(scope: RoutingPolicyScope) -> &'static str {
    match scope {
        RoutingPolicyScope::UpstreamAccountGroup => "channel group",
        RoutingPolicyScope::ApiKey => "api key",
        RoutingPolicyScope::Organization => "organization",
        RoutingPolicyScope::Tenant => "tenant",
        RoutingPolicyScope::Global => "global",
    }
}

fn same_tenant_org(policy: &RoutingPolicy, context: &AuthenticatedApiKeyContext) -> bool {
    same_tenant(policy, context) && policy.organization_id == context.organization_id
}

fn same_tenant(policy: &RoutingPolicy, context: &AuthenticatedApiKeyContext) -> bool {
    policy.tenant_id == context.tenant_id
}

fn has_text(value: Option<&str>) -> bool {
    value.map(str::trim).is_some_and(|value| !value.is_empty())
}

fn normalized_text_or(value: &str, fallback: &str) -> String {
    let value = value.trim();
    if value.is_empty() {
        fallback.to_owned()
    } else {
        value.to_owned()
    }
}

fn candidate_region_matches(route_region_code: &str, candidate_region_code: Option<&str>) -> bool {
    candidate_region_code
        .map(|candidate_region_code| same_region(route_region_code, candidate_region_code))
        .unwrap_or(true)
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
    query: &SelectProviderRouteQuery,
    model_routes_loaded: usize,
    channel_routes_loaded: usize,
) -> String {
    if model_routes_loaded == 0 && channel_routes_loaded == 0 {
        return format!(
            "provider route snapshot is empty for model: {}",
            query.catalog_key
        );
    }
    format!(
        "provider route is not available for model: {}",
        query.catalog_key
    )
}

fn log_unavailable_model_route_diagnostics(
    query: &SelectProviderRouteQuery,
    model_routes_loaded: usize,
    channel_routes_loaded: usize,
    account_group_bindings: &UpstreamAccountGroupBindings,
    scoped_model_routes: usize,
    scoped_channel_routes: usize,
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
        channel_routes_loaded,
        any_account_group_bindings = account_group_bindings.has_any_group_binding,
        matching_group_bound_channels = account_group_bindings.matched_channel_count(),
        scoped_model_routes,
        scoped_channel_routes,
        "provider route selection found no available model or channel route"
    );
}

fn upstream_account_account_group_bindings(
    routes: &[UpstreamAccountRoute],
    group_id: i64,
    api_scope_keys: &[&str],
    capability: RoutingCapability,
) -> UpstreamAccountGroupBindings {
    let mut bindings = UpstreamAccountGroupBindings::default();
    for route in routes {
        bindings.has_any_group_binding |= !route.account_group_bindings.is_empty();
        let route_bindings = route
            .account_group_bindings
            .iter()
            .filter(|binding| {
                if binding.group_id != group_id {
                    return false;
                }
                binding_matches_api_scope(binding, api_scope_keys)
                    && binding_matches_capability(binding, capability)
            })
            .cloned()
            .collect::<Vec<_>>();
        if !route_bindings.is_empty() {
            bindings.by_channel.insert(route.account_id, route_bindings);
        }
    }
    bindings
}

fn best_group_binding(
    bindings: &[UpstreamAccountGroupBinding],
) -> Option<&UpstreamAccountGroupBinding> {
    bindings
        .iter()
        .min_by_key(|binding| (binding.priority, Reverse(binding.weight)))
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

fn synthetic_model_route_from_channel_route(
    query: &SelectProviderRouteQuery,
    route: &UpstreamAccountRoute,
) -> ModelUpstreamRoute {
    let provider_model = provider_native_model_from_query(query);
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

fn apply_channel_route_account(
    route: ModelUpstreamRoute,
    channel_route: &UpstreamAccountRoute,
) -> ModelUpstreamRoute {
    let mut route = route
        .with_region_code(&channel_route.region_code)
        .with_credential(
            channel_route.credential_id,
            channel_route.credential_rotation.clone(),
            channel_route.credential_priority,
            channel_route.credential_weight,
        )
        .with_upstream_endpoint(
            channel_route.base_url.clone(),
            channel_route.secret_ref.clone(),
        )
        .with_auth_profile(channel_route.auth_profile.clone());
    route.timeout_ms = channel_route.timeout_ms;
    route.retry_policy = channel_route.retry_policy.clone();
    route
}

/// Per-channel credential rotation counters.
///
/// Each key is a composite of supplier_code and account_id, ensuring that
/// round-robin rotation advances independently for each channel group.
/// This prevents the global counter issue where different channels would
/// share the same rotation sequence, leading to uneven credential usage.
static PER_CHANNEL_ROTATION_COUNTER: OnceLock<Mutex<HashMap<String, u64>>> = OnceLock::new();

fn per_channel_rotation_key(supplier_code: &str, account_id: i64) -> String {
    format!("{supplier_code}:{account_id}")
}

fn next_per_channel_offset(supplier_code: &str, account_id: i64, modulus: usize) -> usize {
    if modulus <= 1 {
        return 0;
    }
    let map = PER_CHANNEL_ROTATION_COUNTER.get_or_init(|| Mutex::new(HashMap::new()));
    let key = per_channel_rotation_key(supplier_code, account_id);
    let Ok(mut guard) = map.lock() else {
        return CREDENTIAL_ROTATION_COUNTER.fetch_add(1, Ordering::Relaxed) as usize % modulus;
    };
    let counter = guard.entry(key).or_insert(0);
    let offset = *counter as usize % modulus;
    *counter = counter.wrapping_add(1);
    offset
}

/// Fallback global counter for cases where per-channel identity is not
/// available (e.g. routes without a account_id).
static CREDENTIAL_ROTATION_COUNTER: AtomicU64 = AtomicU64::new(0);

trait Pipe: Sized {
    fn pipe<T>(self, f: impl FnOnce(Self) -> T) -> T {
        f(self)
    }
}

impl<T> Pipe for T {}

fn order_model_credential_routes(mut routes: Vec<ModelUpstreamRoute>) -> Vec<ModelUpstreamRoute> {
    routes.sort_by_key(|route| {
        (
            route.credential_priority,
            Reverse(route.credential_weight),
            route.credential_id.unwrap_or(i64::MAX),
            route.region_code.clone(),
            route.supplier_code.clone(),
        )
    });
    if routes.len() <= 1 {
        return routes;
    }
    let strategy = normalized_route_rotation(
        routes
            .iter()
            .map(|route| route.credential_rotation.as_str())
            .find(|value| !value.trim().is_empty()),
    );
    match strategy {
        "weighted_round_robin" => weighted_rotate_model_routes(routes),
        "round_robin" | "random" => rotate_model_routes(routes, strategy),
        _ => routes,
    }
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

fn order_channel_credential_routes(
    mut routes: Vec<UpstreamAccountRoute>,
) -> Vec<UpstreamAccountRoute> {
    routes.sort_by_key(|route| {
        (
            route.credential_priority,
            Reverse(route.credential_weight),
            route.credential_id.unwrap_or(i64::MAX),
            route.region_code.clone(),
            route.supplier_code.clone(),
        )
    });
    if routes.len() <= 1 {
        return routes;
    }
    let strategy = normalized_route_rotation(
        routes
            .iter()
            .map(|route| route.credential_rotation.as_str())
            .find(|value| !value.trim().is_empty()),
    );
    match strategy {
        "weighted_round_robin" => weighted_rotate_channel_routes(routes),
        "round_robin" | "random" => rotate_channel_routes(routes, strategy),
        _ => routes,
    }
}

fn rotate_model_routes(
    mut routes: Vec<ModelUpstreamRoute>,
    strategy: &str,
) -> Vec<ModelUpstreamRoute> {
    let offset = credential_rotation_offset(
        strategy,
        routes.len(),
        routes
            .first()
            .map(|route| (route.supplier_code.as_str(), route.account_id)),
    );
    routes.rotate_left(offset);
    routes
}

fn weighted_rotate_model_routes(routes: Vec<ModelUpstreamRoute>) -> Vec<ModelUpstreamRoute> {
    let weights: Vec<usize> = routes
        .iter()
        .map(|route| route.credential_weight.max(0) as usize)
        .collect();
    let channel_key = routes
        .first()
        .map(|route| (route.supplier_code.as_str(), route.account_id));
    let offset = weighted_credential_rotation_offset(&weights, channel_key);
    let selected_index = weighted_index(weights.into_iter(), offset);
    rotate_with_selected_index(routes, selected_index)
}

fn weighted_rotate_channel_routes(routes: Vec<UpstreamAccountRoute>) -> Vec<UpstreamAccountRoute> {
    let weights: Vec<usize> = routes
        .iter()
        .map(|route| route.credential_weight.max(0) as usize)
        .collect();
    let channel_key = routes
        .first()
        .map(|route| (route.supplier_code.as_str(), route.account_id));
    let offset = weighted_credential_rotation_offset(&weights, channel_key);
    let selected_index = weighted_index(weights.into_iter(), offset);
    rotate_with_selected_index(routes, selected_index)
}

fn rotate_channel_routes(
    mut routes: Vec<UpstreamAccountRoute>,
    strategy: &str,
) -> Vec<UpstreamAccountRoute> {
    let offset = credential_rotation_offset(
        strategy,
        routes.len(),
        routes
            .first()
            .map(|route| (route.supplier_code.as_str(), route.account_id)),
    );
    routes.rotate_left(offset);
    routes
}

fn credential_rotation_offset(
    strategy: &str,
    route_count: usize,
    channel_key: Option<(&str, i64)>,
) -> usize {
    if route_count <= 1 {
        return 0;
    }
    match strategy {
        "random" => random_offset(route_count),
        "round_robin" => {
            if let Some((supplier_code, account_id)) = channel_key {
                return next_per_channel_offset(supplier_code, account_id, route_count);
            }
            CREDENTIAL_ROTATION_COUNTER.fetch_add(1, Ordering::Relaxed) as usize % route_count
        }
        _ => 0,
    }
}

fn weighted_credential_rotation_offset(
    weights: &[usize],
    channel_key: Option<(&str, i64)>,
) -> usize {
    let total_weight = weights.iter().copied().sum::<usize>();
    if total_weight == 0 {
        return 0;
    }
    if let Some((supplier_code, account_id)) = channel_key {
        return next_per_channel_offset(supplier_code, account_id, total_weight);
    }
    CREDENTIAL_ROTATION_COUNTER.fetch_add(1, Ordering::Relaxed) as usize % total_weight
}

fn weighted_index(weights: impl IntoIterator<Item = usize>, offset: usize) -> usize {
    let mut cursor = 0;
    for (index, weight) in weights.into_iter().enumerate() {
        cursor += weight;
        if offset < cursor {
            return index;
        }
    }
    0
}

fn rotate_with_selected_index<T>(mut routes: Vec<T>, selected_index: usize) -> Vec<T> {
    if routes.len() <= 1 {
        return routes;
    }
    let route_count = routes.len();
    routes.rotate_left(selected_index % route_count);
    routes
}

fn random_offset(route_count: usize) -> usize {
    let mut bytes = [0_u8; 8];
    if getrandom::fill(&mut bytes).is_ok() {
        return u64::from_le_bytes(bytes) as usize % route_count;
    }
    CREDENTIAL_ROTATION_COUNTER.fetch_add(1, Ordering::Relaxed) as usize % route_count
}

fn normalized_route_rotation(value: Option<&str>) -> &'static str {
    match value
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "round_robin" => "round_robin",
        "weighted_round_robin" => "weighted_round_robin",
        "random" => "random",
        _ => "priority",
    }
}

fn model_route_matches_request_api(route: &ModelUpstreamRoute, requested_api_code: &str) -> bool {
    route
        .api_code
        .as_deref()
        .map(|api_code| api_scope_value_matches_key(api_code, requested_api_code))
        .unwrap_or(true)
}

fn provider_native_model_from_query(query: &SelectProviderRouteQuery) -> String {
    if let Some(native_model) = native_model_from_base_catalog_key(&query.catalog_key) {
        return native_model;
    }
    provider_native_model_id(&query.catalog_key)
}

fn native_model_from_base_catalog_key(value: &str) -> Option<String> {
    parse_model_catalog_identity(value).map(|identity| identity.model_id())
}
