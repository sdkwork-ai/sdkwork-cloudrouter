use crate::application::{
    upstream_account_route_planner::plan_upstream_account_routes, AuthenticatedApiKeyContext,
    PricingResolver, ResolveModelPriceQuery,
};
use std::cmp::Reverse;
use std::collections::BTreeMap;
use std::fmt::{Display, Formatter};

use crate::domain::{
    parse_model_catalog_identity, provider_native_model_id, BillingMeter, DomainError,
    DomainResult, GatewayApiKeyAccountGroupBinding, ModelUpstreamRoute, RouteCandidate,
    RoutingCapability, RoutingPolicy, RoutingPolicyScope, RoutingRule, UpstreamAccountGroup,
    UpstreamAccountGroupBinding, UpstreamAccountRoute,
};
use crate::ports::PricingCatalog;

#[derive(Debug, Clone, Default)]
struct UpstreamAccountGroupBindings {
    selected_account_group_id: Option<i64>,
    by_account: BTreeMap<i64, Vec<UpstreamAccountGroupBinding>>,
}

impl UpstreamAccountGroupBindings {
    fn contains_account(&self, account_id: i64) -> bool {
        self.by_account.contains_key(&account_id)
    }

    fn contains_group(&self, account_group_id: i64) -> bool {
        self.selected_account_group_id == Some(account_group_id)
            && self
                .by_account
                .values()
                .flatten()
                .any(|binding| binding.account_group_id == account_group_id)
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

pub struct UpstreamRouteSelector<'a, C: PricingCatalog> {
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
    pub policy_id: Option<i64>,
    pub rule_id: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SelectedUpstreamModelRoutePlan {
    pub routes: Vec<SelectedUpstreamModelRoute>,
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
pub struct UpstreamRouteSelectionError {
    kind: UpstreamRouteSelectionErrorKind,
    message: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UpstreamRouteSelectionErrorKind {
    UpstreamRouteUnavailable,
    PricingUnavailable,
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
struct SelectedPolicyScope {
    scope: RoutingPolicyScope,
    policies: Vec<RoutingPolicy>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum PolicyScopeRouteSelection {
    Planned(SelectedUpstreamModelRoutePlan),
    SoftUnavailable(UpstreamRouteSelectionError),
    HardError(UpstreamRouteSelectionError),
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum PolicyScopeUpstreamAccountRouteSelection {
    Selected(SelectedUpstreamAccountRoute),
    SoftUnavailable(UpstreamRouteSelectionError),
    HardError(UpstreamRouteSelectionError),
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum CandidateUpstreamModelRouteEvaluation {
    Planned(Vec<ModelUpstreamRoute>),
    PricingUnavailable(DomainError),
    RoutingInvalid(DomainError),
    NoCallableCandidate,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum CandidateUpstreamAccountRouteEvaluation {
    Selected(UpstreamAccountRoute),
    RoutingInvalid(DomainError),
    NoCallableCandidate,
}

impl<'a, C: PricingCatalog> UpstreamRouteSelector<'a, C> {
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
        for context in self.route_contexts(&query.context)? {
            let scoped_query = SelectUpstreamModelRouteQuery {
                context,
                ..query.clone()
            };
            match self.select_model_route_plan_for_context(scoped_query) {
                Ok(selection) => return Ok(selection),
                Err(error)
                    if error.kind() == UpstreamRouteSelectionErrorKind::PricingUnavailable =>
                {
                    return Err(error);
                }
                Err(error) => {
                    last_unavailable = Some(error);
                }
            }
        }

        Err(last_unavailable.unwrap_or_else(|| {
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
        let account_routes = self.catalog.list_upstream_account_routes();
        let account_routes_loaded = account_routes.len();
        let api_scope_keys = [query.api_code.as_str()];
        let account_group_bindings = upstream_account_group_bindings(
            &account_routes,
            query.context.group_id,
            &api_scope_keys,
            query.capability,
        );
        let model_routes = self.catalog.list_model_upstream_routes(&query.catalog_key);
        let model_routes_loaded = model_routes.len();
        let routes =
            self.group_scoped_model_routes(model_routes, &account_routes, &account_group_bindings);
        let account_routes =
            self.group_scoped_account_routes(account_routes, &account_group_bindings);
        if routes.is_empty() && account_routes.is_empty() {
            log_unavailable_model_route_diagnostics(
                &query,
                model_routes_loaded,
                account_routes_loaded,
                &account_group_bindings,
                routes.len(),
                account_routes.len(),
            );
            return Err(UpstreamRouteSelectionError::upstream_route_unavailable(
                unavailable_model_route_message(&query, model_routes_loaded, account_routes_loaded),
            ));
        }

        let policy_scopes = self.select_policy_scopes(&query.context);
        let mut last_unavailable = None;
        for policy_scope in policy_scopes {
            match self.select_model_route_plan_from_policy_scope(
                &query,
                &routes,
                &account_routes,
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
        if let Some(error) = last_unavailable {
            return Err(error);
        }
        if let Some(selection) = self.select_group_bound_account_route_plan(
            &query,
            &routes,
            &account_routes,
            &account_group_bindings,
        )? {
            return Ok(selection);
        }

        Err(UpstreamRouteSelectionError::upstream_route_unavailable(
            format!(
                "upstream route is not available for configured upstream account route: routing policy scope is required for model {}",
                query.catalog_key
            ),
        ))
    }

    pub fn select_account_route(
        &self,
        query: SelectUpstreamAccountRouteQuery,
    ) -> Result<SelectedUpstreamAccountRoute, UpstreamRouteSelectionError> {
        let mut last_unavailable = None;
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
                    return Err(error);
                }
                Err(error) => {
                    last_unavailable = Some(error);
                }
            }
        }

        Err(last_unavailable.unwrap_or_else(|| {
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
        let account_routes = self.catalog.list_upstream_account_routes();
        let api_scope_keys = [query.api_code.as_str()];
        let account_group_bindings = upstream_account_group_bindings(
            &account_routes,
            query.context.group_id,
            &api_scope_keys,
            query.capability,
        );
        let routes = self.group_scoped_account_routes(account_routes, &account_group_bindings);
        if routes.is_empty() {
            return Err(UpstreamRouteSelectionError::upstream_route_unavailable(
                "upstream route is not available for configured upstream account route: no upstream account routes are configured",
            ));
        }

        let policy_scopes = self.select_policy_scopes(&query.context);
        let mut last_unavailable = None;
        for policy_scope in policy_scopes {
            match self.select_account_route_from_policy_scope(
                &query,
                &routes,
                policy_scope,
                &account_group_bindings,
            ) {
                PolicyScopeUpstreamAccountRouteSelection::Selected(selection) => {
                    return Ok(selection)
                }
                PolicyScopeUpstreamAccountRouteSelection::SoftUnavailable(error) => {
                    last_unavailable = Some(error);
                }
                PolicyScopeUpstreamAccountRouteSelection::HardError(error) => return Err(error),
            }
        }
        if let Some(error) = last_unavailable {
            return Err(error);
        }
        if let Some(selection) =
            self.select_group_bound_account_route(&routes, &account_group_bindings, &query.context)?
        {
            return Ok(selection);
        }

        Err(UpstreamRouteSelectionError::upstream_route_unavailable(
            format!(
                "upstream route is not available for configured upstream account route: routing policy scope is required for route {}",
                query.route_key
            ),
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

    fn select_model_route_plan_from_policy_scope(
        &self,
        query: &SelectUpstreamModelRouteQuery,
        routes: &[ModelUpstreamRoute],
        account_routes: &[UpstreamAccountRoute],
        policy_scope: SelectedPolicyScope,
        account_group_bindings: &UpstreamAccountGroupBindings,
    ) -> PolicyScopeRouteSelection {
        let policy = match self
            .select_policy_for_capability(&policy_scope.policies, query.capability)
        {
            Some(policy) => policy,
            None => {
                let error = UpstreamRouteSelectionError::upstream_route_unavailable(format!(
                    "upstream route is not available for configured upstream account route: {} policy scope has no routing policy for capability {:?}",
                    scope_label(policy_scope.scope),
                    query.capability
                ));
                return PolicyScopeRouteSelection::HardError(error);
            }
        };
        let Some(profile_id) = policy.default_profile_id else {
            return PolicyScopeRouteSelection::SoftUnavailable(
                UpstreamRouteSelectionError::upstream_route_unavailable(format!(
                    "upstream route is not available for configured upstream account route: routing policy {} has no default profile",
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
            match self.evaluate_candidate_route_plan(query, routes, account_routes, candidate_chain)
            {
                CandidateUpstreamModelRouteEvaluation::Planned(routes) => {
                    return PolicyScopeRouteSelection::Planned(SelectedUpstreamModelRoutePlan {
                        routes: routes
                            .into_iter()
                            .map(|route| {
                                selected_upstream_model_route(
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
                CandidateUpstreamModelRouteEvaluation::PricingUnavailable(error) => {
                    return PolicyScopeRouteSelection::HardError(
                        UpstreamRouteSelectionError::pricing_unavailable(format!(
                            "pricing is not available for configured upstream account route: policy {} rule {} candidate price is unavailable for model {}: {}",
                            policy.policy_code, rule.rule_code, query.catalog_key, error
                        )),
                    );
                }
                CandidateUpstreamModelRouteEvaluation::RoutingInvalid(error) => {
                    return PolicyScopeRouteSelection::HardError(
                        UpstreamRouteSelectionError::upstream_route_unavailable(format!(
                            "upstream account routing configuration is invalid for policy {} rule {}: {}",
                            policy.policy_code, rule.rule_code, error
                        )),
                    );
                }
                CandidateUpstreamModelRouteEvaluation::NoCallableCandidate => {}
            }
            if !policy
                .fallback_mode_or_default()
                .allows_rule_fallback_chain()
                && !rule.fallback_chain.is_empty()
            {
                return PolicyScopeRouteSelection::SoftUnavailable(
                    UpstreamRouteSelectionError::upstream_route_unavailable(format!(
                        "upstream route is not available for configured upstream account route: policy {} fallback mode none disables rule {} fallback chain for model {}",
                        policy.policy_code, rule.rule_code, query.catalog_key
                    )),
                );
            }
            return PolicyScopeRouteSelection::SoftUnavailable(
                UpstreamRouteSelectionError::upstream_route_unavailable(format!(
                    "upstream route is not available for configured upstream account route: policy {} rule {} has no callable priced candidate upstream account{} for model {}",
                    policy.policy_code,
                    rule.rule_code,
                    if used_rule_fallback_chain {
                        " or fallback upstream account"
                    } else {
                        ""
                    },
                    query.catalog_key
                )),
            );
        }
        PolicyScopeRouteSelection::SoftUnavailable(
            UpstreamRouteSelectionError::upstream_route_unavailable(format!(
                "upstream route is not available for configured upstream account route: policy {} has no routing rule for model {}",
                policy.policy_code, query.catalog_key
            )),
        )
    }

    fn select_account_route_from_policy_scope(
        &self,
        query: &SelectUpstreamAccountRouteQuery,
        routes: &[UpstreamAccountRoute],
        policy_scope: SelectedPolicyScope,
        account_group_bindings: &UpstreamAccountGroupBindings,
    ) -> PolicyScopeUpstreamAccountRouteSelection {
        let policy = match self
            .select_policy_for_capability(&policy_scope.policies, query.capability)
        {
            Some(policy) => policy,
            None => {
                let error = UpstreamRouteSelectionError::upstream_route_unavailable(format!(
                    "upstream route is not available for configured upstream account route: {} policy scope has no routing policy for capability {:?}",
                    scope_label(policy_scope.scope),
                    query.capability
                ));
                return PolicyScopeUpstreamAccountRouteSelection::HardError(error);
            }
        };
        let Some(profile_id) = policy.default_profile_id else {
            return PolicyScopeUpstreamAccountRouteSelection::SoftUnavailable(
                UpstreamRouteSelectionError::upstream_route_unavailable(format!(
                    "upstream route is not available for configured upstream account route: routing policy {} has no default profile",
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
            match self.evaluate_candidate_account_routes(routes, candidate_chain) {
                CandidateUpstreamAccountRouteEvaluation::Selected(route) => {
                    return PolicyScopeUpstreamAccountRouteSelection::Selected(
                        selected_upstream_account_route(
                            route,
                            &query.context,
                            Some(policy.id),
                            Some(rule.id),
                        ),
                    );
                }
                CandidateUpstreamAccountRouteEvaluation::RoutingInvalid(error) => {
                    return PolicyScopeUpstreamAccountRouteSelection::HardError(
                        UpstreamRouteSelectionError::upstream_route_unavailable(format!(
                            "upstream account routing configuration is invalid for policy {} rule {}: {}",
                            policy.policy_code, rule.rule_code, error
                        )),
                    );
                }
                CandidateUpstreamAccountRouteEvaluation::NoCallableCandidate => {}
            }
            if !policy
                .fallback_mode_or_default()
                .allows_rule_fallback_chain()
                && !rule.fallback_chain.is_empty()
            {
                return PolicyScopeUpstreamAccountRouteSelection::SoftUnavailable(
                    UpstreamRouteSelectionError::upstream_route_unavailable(format!(
                        "upstream route is not available for configured upstream account route: policy {} fallback mode none disables rule {} fallback chain for route {}",
                        policy.policy_code, rule.rule_code, query.route_key
                    )),
                );
            }
            return PolicyScopeUpstreamAccountRouteSelection::SoftUnavailable(
                UpstreamRouteSelectionError::upstream_route_unavailable(format!(
                    "upstream route is not available for configured upstream account route: policy {} rule {} has no callable upstream account route candidate{} for route {}",
                    policy.policy_code,
                    rule.rule_code,
                    if used_rule_fallback_chain {
                        " or fallback upstream account"
                    } else {
                        ""
                    },
                    query.route_key
                )),
            );
        }
        PolicyScopeUpstreamAccountRouteSelection::SoftUnavailable(
            UpstreamRouteSelectionError::upstream_route_unavailable(format!(
                "upstream route is not available for configured upstream account route: policy {} has no routing rule for route {}",
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
                    .map(|route| selected_upstream_model_route(route, &query.context, None, None))
                    .collect(),
                policy_id: None,
                rule_id: None,
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
        let account_routes = account_routes
            .iter()
            .filter(|route| {
                account_route_matches_candidate_group(route, candidate)
                    && account_route_allows_model_request(route, candidate, query)
                    && candidate_region_matches(
                        &route.region_code,
                        candidate.region_code.as_deref(),
                    )
            })
            .filter(|route| self.account_route_is_callable(route))
            .collect::<Vec<_>>()
            .into_iter()
            .cloned()
            .collect::<Vec<_>>();
        let account_routes = plan_upstream_account_routes(&group, account_routes)?;
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

    fn evaluate_candidate_account_routes(
        &self,
        routes: &[UpstreamAccountRoute],
        candidates: Vec<RouteCandidate>,
    ) -> CandidateUpstreamAccountRouteEvaluation {
        for candidate in candidates {
            let candidate_routes = routes
                .iter()
                .filter(|route| {
                    account_route_matches_candidate_group(route, &candidate)
                        && candidate_region_matches(
                            &route.region_code,
                            candidate.region_code.as_deref(),
                        )
                })
                .cloned()
                .collect::<Vec<_>>()
                .into_iter()
                .filter(|route| self.account_route_is_callable(route))
                .collect::<Vec<_>>();
            let group = match self.require_account_group(candidate.account_group_id) {
                Ok(group) => group,
                Err(error) => {
                    return CandidateUpstreamAccountRouteEvaluation::RoutingInvalid(error)
                }
            };
            let routes = match plan_upstream_account_routes(&group, candidate_routes) {
                Ok(routes) => routes,
                Err(error) => {
                    return CandidateUpstreamAccountRouteEvaluation::RoutingInvalid(error)
                }
            };
            let Some(route) = routes.into_iter().next() else {
                continue;
            };
            return CandidateUpstreamAccountRouteEvaluation::Selected(route);
        }
        CandidateUpstreamAccountRouteEvaluation::NoCallableCandidate
    }

    fn select_group_bound_account_route(
        &self,
        routes: &[UpstreamAccountRoute],
        account_group_bindings: &UpstreamAccountGroupBindings,
        context: &AuthenticatedApiKeyContext,
    ) -> Result<Option<SelectedUpstreamAccountRoute>, UpstreamRouteSelectionError> {
        let candidates = group_bound_account_route_candidates(routes, account_group_bindings);
        match self.evaluate_candidate_account_routes(routes, candidates) {
            CandidateUpstreamAccountRouteEvaluation::Selected(route) => {
                Ok(Some(selected_upstream_account_route(route, context, None, None)))
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
        routes: Vec<UpstreamAccountRoute>,
        account_group_bindings: &UpstreamAccountGroupBindings,
    ) -> Vec<UpstreamAccountRoute> {
        routes
            .into_iter()
            .filter(|route| account_group_bindings.contains_account(route.account_id))
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

    fn ensure_route_is_priced(
        &self,
        query: &SelectUpstreamModelRouteQuery,
        route: &ModelUpstreamRoute,
    ) -> DomainResult<()> {
        let resolved = PricingResolver::new(self.catalog).resolve(ResolveModelPriceQuery {
            api_key_id: query.context.api_key_id,
            account_group_id: Some(query.context.group_id),
            model: route.catalog_key.clone(),
            billing_meter: query.billing_meter.clone(),
            supplier_code: Some(route.supplier_code.clone()),
            account_id: Some(route.account_id),
            region_code: Some(route.region_code.clone()),
        })?;
        if resolved.procurement_cost.is_none() {
            return Err(DomainError::new(format!(
                "upstream cost price not found for model {}, supplier {}, account {}, and region {}",
                route.catalog_key, route.supplier_code, route.account_id, route.region_code
            )));
        }
        Ok(())
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
    policy_id: Option<i64>,
    rule_id: Option<i64>,
) -> SelectedUpstreamModelRoute {
    SelectedUpstreamModelRoute {
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

fn scoped_candidate_chain(
    rule: &RoutingRule,
    policy: &RoutingPolicy,
    account_group_bindings: &UpstreamAccountGroupBindings,
) -> Vec<RouteCandidate> {
    let mut candidates = group_bound_candidates(
        rule.candidate_account_groups.clone(),
        account_group_bindings,
    );
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
    candidates
        .retain(|candidate| account_group_bindings.contains_group(candidate.account_group_id));
    candidates.sort_by_key(|candidate| {
        let binding = account_group_bindings
            .best_binding_for_group(candidate.account_group_id)
            .expect("group-bound candidate must have a binding");
        (
            binding.priority,
            Reverse(binding.weight),
            Reverse(candidate.weight),
            candidate.account_group_id,
        )
    });
    candidates
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

fn candidate_chain_uses_rule_fallback(rule: &RoutingRule, candidates: &[RouteCandidate]) -> bool {
    candidates.iter().any(|candidate| {
        !rule
            .candidate_account_groups
            .iter()
            .any(|primary| same_candidate_route(primary, candidate))
    })
}

fn same_candidate_route(left: &RouteCandidate, right: &RouteCandidate) -> bool {
    left.account_group_id == right.account_group_id
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
        RoutingPolicyScope::UpstreamAccountGroup => "account group",
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
) -> String {
    if model_routes_loaded == 0 && account_routes_loaded == 0 {
        return format!(
            "upstream route snapshot is empty for model: {}",
            query.catalog_key
        );
    }
    format!(
        "upstream route is not available for model: {}",
        query.catalog_key
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
    let mut bindings = UpstreamAccountGroupBindings::default();
    bindings.selected_account_group_id = Some(group_id);
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
