//! Model → account-group membership and the console's modality/vendor/model
//! group catalog.
//!
//! One question powers three surfaces:
//!
//! * the open-api `GET /v1/models/{model}/groups` extension and the `groups`
//!   field of `GET /v1/vendors`;
//! * the app-api console catalog (modality → vendor → model → groups) that the
//!   default-group page renders;
//! * the account-route selector's own group/model intersection.
//!
//! They must agree, so the membership rule lives here once:
//!
//! > A group **supports** a model when the group has at least one callable
//! > upstream account (bound to the group, base URL + credential, healthy), an
//! > upstream model route for that model lands on one of those accounts, and
//! > the group's model access policy does not forbid it.
//!
//! [`ModelGroupRoutingIndex`] pre-computes the callable accounts per group once
//! so listing a whole catalog does not rescan every route for every model.

use std::collections::HashMap;

use crate::domain::{
    account_group_can_serve_modality, select_session_account_group_with_user_routing,
    AccountGroupModalityScope, AccountGroupRouteScope, AiModel, ModelGroupCatalogModality,
    ModelGroupCatalogModel, ModelGroupCatalogVendor, ModelGroupOption, SessionAccountGroup,
    SessionAccountGroupModality, UpstreamAccountRoute, UserAccountGroupRoute,
};
use crate::ports::{AccountGroupModelAccess, PricingCatalog, UpstreamAccountRouteCatalog};

/// Pre-computed group membership for one catalog snapshot.
pub struct ModelGroupRoutingIndex {
    groups: Vec<SessionAccountGroup>,
    /// All upstream account routes of the snapshot (owned, so the per-group
    /// callable lists can be index slices instead of cloned routes).
    routes: Vec<UpstreamAccountRoute>,
    /// `group id → indices into `routes` of callable accounts for the group.
    callable_accounts: HashMap<i64, Vec<usize>>,
    model_access: HashMap<i64, AccountGroupModelAccess>,
    user_routes: Vec<UserAccountGroupRoute>,
}

impl ModelGroupRoutingIndex {
    /// Builds the index from the current snapshot.
    pub fn build<C>(catalog: &C) -> Self
    where
        C: UpstreamAccountRouteCatalog + ?Sized,
    {
        Self::build_with_user_routes(catalog, catalog.list_user_account_group_routes())
    }

    /// Builds the index from the current snapshot but uses freshly persisted
    /// user rules instead of the snapshot's copy. The console uses this so a
    /// saved default is reflected immediately, before the routing snapshot
    /// refresh picks it up for traffic.
    pub fn build_with_user_routes<C>(
        catalog: &C,
        user_routes: Vec<UserAccountGroupRoute>,
    ) -> Self
    where
        C: UpstreamAccountRouteCatalog + ?Sized,
    {
        let groups = catalog.list_session_account_groups();
        let routes = catalog.list_upstream_account_routes();
        let mut callable_accounts: HashMap<i64, Vec<usize>> = HashMap::new();
        for (index, route) in routes.iter().enumerate() {
            if !route_is_callable(route) {
                continue;
            }
            for binding in &route.account_group_bindings {
                callable_accounts
                    .entry(binding.account_group_id)
                    .or_default()
                    .push(index);
            }
        }
        let model_access = groups
            .iter()
            .filter_map(|group| {
                catalog
                    .account_group_model_access(group.group.id)
                    .map(|access| (group.group.id, access))
            })
            .collect();
        Self {
            groups,
            routes,
            callable_accounts,
            model_access,
            user_routes,
        }
    }

    pub fn groups(&self) -> &[SessionAccountGroup] {
        &self.groups
    }

    /// Groups that can serve `model` and are visible to
    /// `(tenant_id, organization_id)`, with `selected` set for the caller's
    /// effective default when `user_id` is provided.
    pub fn groups_for_model<C>(
        &self,
        catalog: &C,
        model: &AiModel,
        tenant_id: i64,
        organization_id: i64,
        user_id: Option<i64>,
        modality: Option<SessionAccountGroupModality>,
    ) -> Vec<ModelGroupOption>
    where
        C: PricingCatalog + ?Sized,
    {
        let default_group_ids = user_id
            .map(|user_id| {
                self.effective_default_group_ids(
                    catalog,
                    model,
                    tenant_id,
                    organization_id,
                    user_id,
                )
            })
            .unwrap_or_default();
        self.groups
            .iter()
            .filter(|group| {
                crate::domain::upstream_account_group_in_subject_scope(
                    &group.group,
                    tenant_id,
                    organization_id,
                )
            })
            .filter(|group| {
                modality.map_or(true, |modality| {
                    account_group_can_serve_modality(&group.modality_scope, modality)
                })
            })
            .filter(|group| self.group_supports_model(catalog, group, model))
            .map(|group| ModelGroupOption {
                group_id: group.group.id,
                group_code: group.group.code.clone(),
                group_name: group.group.name.clone(),
                is_default: group.group.is_default,
                selected: default_group_ids.contains(&group.group.id),
            })
            .collect()
    }

    /// True when the group has a callable account that can reach the model and
    /// no model access policy forbids it.
    pub fn group_supports_model<C>(
        &self,
        catalog: &C,
        group: &SessionAccountGroup,
        model: &AiModel,
    ) -> bool
    where
        C: PricingCatalog + ?Sized,
    {
        let modalities = model_modalities(model);
        let modality_served = modalities.iter().any(|modality| {
            group.modality_scope.serves(*modality) || group.modality_scope.is_mixed()
        });
        if !modality_served {
            return false;
        }
        if group_model_access_forbids(self.model_access.get(&group.group.id), model) {
            return false;
        }
        let Some(indices) = self.callable_accounts.get(&group.group.id) else {
            return false;
        };
        let callable = indices
            .iter()
            .filter_map(|index| self.routes.get(*index))
            .collect::<Vec<_>>();
        model_reachable_via_routes(catalog, model, &callable)
    }

    /// Effective **explicit** user default group ids for one model, in failover
    /// order. The account-level default is deliberately not included: the
    /// console renders it as the inherited fallback, not as a user selection.
    pub fn effective_default_group_ids<C>(
        &self,
        catalog: &C,
        model: &AiModel,
        tenant_id: i64,
        organization_id: i64,
        user_id: i64,
    ) -> Vec<i64>
    where
        C: PricingCatalog + ?Sized,
    {
        self.effective_default(catalog, model, tenant_id, organization_id, user_id)
            .map(|(ids, _)| ids)
            .unwrap_or_default()
    }

    /// Explicit user default group ids plus the rule scope that produced them.
    ///
    /// A configured group only counts when it can actually serve the model
    /// (callable account + model access), so the console never shows a
    /// selection that would fall through at routing time. `None` means the
    /// caller has no explicit rule for this model; the account-level default is
    /// then reported separately by [`Self::account_default`].
    pub fn effective_default<C>(
        &self,
        catalog: &C,
        model: &AiModel,
        tenant_id: i64,
        organization_id: i64,
        user_id: i64,
    ) -> Option<(Vec<i64>, String)>
    where
        C: PricingCatalog + ?Sized,
    {
        let modality = model_primary_modality(model);
        let keys = [model.model.clone(), model.catalog_key.clone()];
        let vendors = [model.vendor_code.clone()];
        let supported = self
            .groups
            .iter()
            .filter(|group| self.group_supports_model(catalog, group, model))
            .map(|group| group.group.id)
            .collect::<Vec<_>>();
        let mut rules = self
            .user_routes
            .iter()
            .filter(|rule| rule.belongs_to(tenant_id, organization_id, user_id))
            .filter(|rule| crate::domain::rule_matches_request(rule, modality, &keys, &vendors))
            .filter(|rule| supported.contains(&rule.account_group_id))
            .collect::<Vec<_>>();
        rules.sort_by_key(|rule| (rule.priority, rule.account_group_id));
        for scope in [
            AccountGroupRouteScope::Model,
            AccountGroupRouteScope::Vendor,
            AccountGroupRouteScope::Modality,
        ] {
            let matching = rules
                .iter()
                .filter(|rule| rule.scope == scope)
                .map(|rule| rule.account_group_id)
                .collect::<Vec<_>>();
            if !matching.is_empty() {
                return Some((matching, scope_source(scope).to_owned()));
            }
        }
        None
    }

    /// The account-level default group and reason for one model, used as the
    /// inherited fallback when the user has no explicit rule.
    pub fn account_default<C>(
        &self,
        _catalog: &C,
        model: &AiModel,
        tenant_id: i64,
        organization_id: i64,
    ) -> Option<(i64, String)>
    where
        C: PricingCatalog + ?Sized,
    {
        let modality = model_primary_modality(model);
        let keys = [model.model.clone(), model.catalog_key.clone()];
        let vendors = [model.vendor_code.clone()];
        select_session_account_group_with_user_routing(
            &self.groups,
            &[],
            tenant_id,
            organization_id,
            0,
            modality,
            &keys,
            &vendors,
            None,
        )
        .map(|selection| (selection.group().id, selection.reason().as_str().to_owned()))
    }
}

/// True when the upstream account route is reachable for the group: bound to
/// the group, with a base URL, a credential (or provider default headers), and
/// a healthy account.
pub fn account_route_is_callable_for_group(
    route: &UpstreamAccountRoute,
    account_group_id: i64,
) -> bool {
    route
        .account_group_bindings
        .iter()
        .any(|binding| binding.account_group_id == account_group_id)
        && route_is_callable(route)
}

/// Shared callability predicate: base URL + credential (or provider default
/// headers) + healthy account.
pub fn route_is_callable(route: &UpstreamAccountRoute) -> bool {
    route
        .base_url
        .as_deref()
        .map(str::trim)
        .is_some_and(|value| !value.is_empty())
        && (route
            .secret_ref
            .as_deref()
            .map(str::trim)
            .is_some_and(|value| !value.is_empty())
            || !route.auth_profile.default_headers.is_empty())
        && route.is_account_healthy()
}

/// True when at least one of `routes` can serve `model`.
///
/// Two authorities are consulted, because the runtime snapshot and the
/// in-memory test catalog carry membership differently:
///
/// * the model-route projection (`list_model_upstream_routes`), used by the
///   in-memory catalog and any catalog that materializes explicit model routes;
/// * the route's resource entitlements (`ai_resource_binding` →
///   `UpstreamResourceEntitlement`), which is how the SQL snapshot represents
///   "this account is entitled to serve this catalog model".
pub fn model_reachable_via_routes<C>(
    catalog: &C,
    model: &AiModel,
    routes: &[&UpstreamAccountRoute],
) -> bool
where
    C: PricingCatalog + ?Sized,
{
    if routes.is_empty() {
        return false;
    }
    let model_keys = [model.model.as_str(), model.catalog_key.as_str()];
    let serviceable = routes.iter().any(|route| {
        route.account_group_bindings.iter().any(|binding| {
            binding
                .resource_entitlements
                .as_ref()
                .is_some_and(|entitlements| {
                    entitlements.iter().any(|entitlement| {
                        entitlement
                            .route_kind
                            .as_deref()
                            .map_or(true, |kind| kind.eq_ignore_ascii_case("model"))
                            && model_keys.iter().any(|key| {
                                entitlement
                                    .catalog_key
                                    .as_deref()
                                    .is_some_and(|value| value.eq_ignore_ascii_case(key))
                                    || entitlement
                                        .model
                                        .as_deref()
                                        .is_some_and(|value| value.eq_ignore_ascii_case(key))
                                    || entitlement
                                        .resource_code
                                        .eq_ignore_ascii_case(key)
                                    || entitlement
                                        .api_code
                                        .as_deref()
                                        .is_some_and(|value| value.eq_ignore_ascii_case(key))
                            })
                    })
                })
        })
    });
    if serviceable {
        return true;
    }
    model_keys.iter().any(|key| {
        catalog.list_model_upstream_routes(key).iter().any(|route| {
            routes.iter().any(|candidate| {
                candidate.account_id == route.account_id
                    && candidate.supplier_code == route.supplier_code
            })
        })
    })
}

/// Formats a model's primary modality for display (`text` for LLM models).
pub fn model_primary_modality(model: &AiModel) -> Option<SessionAccountGroupModality> {
    model_modalities(model).into_iter().next()
}

/// Catalog modalities a model can serve, derived from its capability list.
pub fn model_modalities(model: &AiModel) -> Vec<SessionAccountGroupModality> {
    let mut modalities = Vec::new();
    for capability in &model.capabilities {
        let modality = match capability.trim().to_ascii_lowercase().as_str() {
            "chat" | "embedding" | "rerank" => SessionAccountGroupModality::Llm,
            "image" | "image_generation" => SessionAccountGroupModality::Image,
            "video" | "video_generation" => SessionAccountGroupModality::Video,
            "audio" | "audio_generation" | "speech" | "tts" | "asr" => {
                SessionAccountGroupModality::Audio
            }
            "music" | "music_generation" => SessionAccountGroupModality::Music,
            _ => continue,
        };
        if !modalities.contains(&modality) {
            modalities.push(modality);
        }
    }
    if modalities.is_empty() {
        modalities.push(SessionAccountGroupModality::Llm);
    }
    modalities
}

/// Builds the console's modality → vendor → model catalog.
///
/// `modality` and `vendor_code` are optional filters; the page fetches one
/// modality at a time so the response stays small.
pub fn build_model_group_catalog<C>(
    catalog: &C,
    subject: (i64, i64, i64),
    modality: Option<SessionAccountGroupModality>,
    vendor_code: Option<&str>,
    index: &ModelGroupRoutingIndex,
) -> Vec<ModelGroupCatalogModality>
where
    C: PricingCatalog + ?Sized,
{
    let (tenant_id, organization_id, user_id) = subject;
    let vendor_code = vendor_code
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| value.to_ascii_lowercase());
    let mut catalog_rows: Vec<(String, String, String, ModelGroupCatalogModel)> = Vec::new();
    catalog.visit_models(None, &mut |model| {
        let model_modalities = model_modalities(model);
        let matching_modalities = match modality {
            Some(requested) => {
                if model_modalities.contains(&requested) {
                    vec![requested]
                } else {
                    Vec::new()
                }
            }
            None => model_modalities.clone(),
        };
        if matching_modalities.is_empty() {
            return true;
        }
        if vendor_code
            .as_deref()
            .is_some_and(|filter| !model.vendor_code.eq_ignore_ascii_case(filter))
        {
            return true;
        }
        let groups = index.groups_for_model(
            catalog,
            model,
            tenant_id,
            organization_id,
            Some(user_id),
            modality,
        );
        if groups.is_empty() {
            return true;
        }
        let effective =
            index.effective_default(catalog, model, tenant_id, organization_id, user_id);
        let default_group_codes = effective
            .as_ref()
            .map(|(ids, _)| {
                ids.iter()
                    .filter_map(|id| {
                        index
                            .groups
                            .iter()
                            .find(|group| group.group.id == *id)
                            .map(|group| group.group.code.clone())
                    })
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        // When no explicit rule exists, surface the inherited account-level
        // default as the source (the group codes stay empty so the console
        // renders "use account default" as the active choice).
        let default_source = effective
            .as_ref()
            .map(|(_, source)| source.clone())
            .or_else(|| {
                index
                    .account_default(catalog, model, tenant_id, organization_id)
                    .map(|(_, source)| source)
            });
        for model_modality in matching_modalities {
            let vendor_name = catalog
                .find_vendor(&model.vendor_code)
                .map(|vendor| vendor.display_name.clone())
                .unwrap_or_else(|| model.vendor_code.clone());
            catalog_rows.push((
                model_modality.wire_modality().to_owned(),
                model.vendor_code.clone(),
                vendor_name,
                ModelGroupCatalogModel {
                    model: model.model.clone(),
                    catalog_key: model.catalog_key.clone(),
                    display_name: model.display_name.clone(),
                    vendor_code: model.vendor_code.clone(),
                    modalities: model_modalities
                        .iter()
                        .map(|value| value.wire_modality().to_owned())
                        .collect(),
                    groups: groups.clone(),
                    default_group_codes: default_group_codes.clone(),
                    default_source: default_source.clone(),
                },
            ));
        }
        true
    });

    let mut by_modality: Vec<ModelGroupCatalogModality> = Vec::new();
    for (modality_code, vendor_code, vendor_name, model) in catalog_rows {
        let modality_entry =
            match by_modality.iter_mut().find(|entry| entry.modality == modality_code) {
                Some(entry) => entry,
                None => {
                    by_modality.push(ModelGroupCatalogModality {
                        modality: modality_code.clone(),
                        vendors: Vec::new(),
                    });
                    by_modality.last_mut().expect("just pushed")
                }
            };
        let vendor_entry = match modality_entry
            .vendors
            .iter_mut()
            .find(|entry| entry.vendor_code == vendor_code)
        {
            Some(entry) => entry,
            None => {
                modality_entry.vendors.push(ModelGroupCatalogVendor {
                    vendor_code: vendor_code.clone(),
                    vendor_name,
                    models: Vec::new(),
                });
                modality_entry.vendors.last_mut().expect("just pushed")
            }
        };
        vendor_entry.models.push(model);
    }
    for entry in &mut by_modality {
        entry
            .vendors
            .sort_by(|left, right| left.vendor_name.cmp(&right.vendor_name));
        for vendor in &mut entry.vendors {
            vendor
                .models
                .sort_by(|left, right| left.display_name.cmp(&right.display_name));
        }
    }
    by_modality
        .sort_by(|left, right| modality_order(&left.modality).cmp(&modality_order(&right.modality)));
    by_modality
}

fn scope_source(scope: AccountGroupRouteScope) -> &'static str {
    match scope {
        AccountGroupRouteScope::Model => "user-model-default",
        AccountGroupRouteScope::Vendor => "user-vendor-default",
        AccountGroupRouteScope::Modality => "user-modality-default",
    }
}

fn modality_order(value: &str) -> u8 {
    match value {
        "text" => 0,
        "image" => 1,
        "video" => 2,
        "audio" => 3,
        "music" => 4,
        _ => 9,
    }
}

/// Groups that can serve `model`, without a subject scope (used by the
/// open-api where the key/user scope is resolved separately).
pub fn model_group_options<C>(
    catalog: &C,
    model: &AiModel,
    tenant_id: i64,
    organization_id: i64,
) -> Vec<ModelGroupOption>
where
    C: UpstreamAccountRouteCatalog + ?Sized,
{
    model_group_options_for_context(catalog, model, tenant_id, organization_id, None, None)
}

/// Open-api projection of the groups that serve `model`, with
/// `defaultForModel` set for the group a request without an override would use.
///
/// * API-key traffic passes `user_id = None` and the key's own `group_id` as
///   `fallback_group_id`; the bound default group is marked when it serves the
///   model.
/// * Auth-token traffic passes `user_id = Some(..)`; explicit user rules mark
///   their selected groups, and when the user has no rule the account-level
///   default is marked instead.
pub fn model_group_options_for_context<C>(
    catalog: &C,
    model: &AiModel,
    tenant_id: i64,
    organization_id: i64,
    user_id: Option<i64>,
    fallback_group_id: Option<i64>,
) -> Vec<ModelGroupOption>
where
    C: UpstreamAccountRouteCatalog + ?Sized,
{
    let index = ModelGroupRoutingIndex::build(catalog);
    let mut groups =
        index.groups_for_model(catalog, model, tenant_id, organization_id, user_id, None);
    if groups.iter().any(|group| group.selected) {
        return groups;
    }
    let default_group_id = fallback_group_id.or_else(|| {
        index
            .account_default(catalog, model, tenant_id, organization_id)
            .map(|(id, _)| id)
    });
    if let Some(default_group_id) = default_group_id {
        for group in &mut groups {
            group.selected = group.group_id == default_group_id;
        }
    }
    groups
}

/// Ids of the groups that can serve `model` inside `(tenant, organization)`.
///
/// This is the per-request variant of [`ModelGroupRoutingIndex::groups_for_model`]:
/// it only inspects the one model instead of pre-computing every group's
/// membership, so the auth-token resolver can restrict a one-to-many rule list
/// to usable groups without building the whole console catalog.
pub fn model_supported_group_ids<C>(
    catalog: &C,
    model: &AiModel,
    tenant_id: i64,
    organization_id: i64,
) -> Vec<i64>
where
    C: UpstreamAccountRouteCatalog + ?Sized,
{
    let routes = catalog.list_upstream_account_routes();
    let modalities = model_modalities(model);
    catalog
        .list_session_account_groups()
        .into_iter()
        .filter(|group| {
            crate::domain::upstream_account_group_in_subject_scope(
                &group.group,
                tenant_id,
                organization_id,
            )
        })
        .filter(|group| {
            modalities.iter().any(|modality| {
                group.modality_scope.serves(*modality) || group.modality_scope.is_mixed()
            })
        })
        .filter(|group| {
            !group_model_access_forbids(
                catalog.account_group_model_access(group.group.id).as_ref(),
                model,
            )
        })
        .filter(|group| {
            let callable = routes
                .iter()
                .filter(|route| account_route_is_callable_for_group(route, group.group.id))
                .collect::<Vec<_>>();
            model_reachable_via_routes(catalog, model, &callable)
        })
        .map(|group| group.group.id)
        .collect()
}

/// True when the group's model access policy forbids `model`.
pub fn group_model_access_forbids(
    access: Option<&AccountGroupModelAccess>,
    model: &AiModel,
) -> bool {
    let Some(access) = access else {
        return false;
    };
    crate::application::model_access_forbidden_reason(
        Some(&model.vendor_code),
        &model.model,
        access,
    )
    .is_some()
}

/// Convenience: whether a scope serves a modality (used by the console to grey
/// out groups that cannot serve the selected modality).
pub fn scope_serves_modality(
    scope: &AccountGroupModalityScope,
    modality: SessionAccountGroupModality,
) -> bool {
    account_group_can_serve_modality(scope, modality)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{
        AccountGroupModalityScope, DecimalValue, ModelVendor, ModelVendorDefinition,
        UpstreamAccountGroup, UpstreamAccountGroupBinding, UpstreamAccountRoutingStrategy,
        UpstreamResourceEntitlement,
    };
    use crate::infrastructure::InMemoryPricingCatalog;

    const TENANT_ID: i64 = 100_001;

    fn group(id: i64, code: &str, is_default: bool) -> UpstreamAccountGroup {
        UpstreamAccountGroup {
            id,
            tenant_id: TENANT_ID,
            organization_id: 0,
            name: code.to_owned(),
            code: code.to_owned(),
            is_default,
            pricing_plan_tenant_id: TENANT_ID,
            pricing_plan_organization_id: 0,
            pricing_plan_id: 1,
            pricing_plan_code: "standard".to_owned(),
            routing_strategy: UpstreamAccountRoutingStrategy::LeastCost,
            fallback_mode: crate::domain::UpstreamAccountFallbackMode::Sequential,
            priority: 100,
            cost_multiplier: DecimalValue::ONE,
            sale_multiplier: DecimalValue::ONE,
        }
    }

    /// A route that carries only `ai_resource_binding` entitlements (the SQL
    /// snapshot shape: no explicit model-route projection).
    fn entitlement_route(account_id: i64, group_id: i64, catalog_key: &str) -> UpstreamAccountRoute {
        let entitlement =
            UpstreamResourceEntitlement::new(catalog_key, "model").with_route_kind("model");
        let mut route = UpstreamAccountRoute::new("openai", account_id)
            .with_upstream_endpoint(Some("https://api.openai.com"), Some("vault://openai"));
        route.account_group_bindings = vec![
            UpstreamAccountGroupBinding::new(group_id, 10, 100)
                .with_resource_entitlements(vec![entitlement]),
        ];
        route
    }

    fn catalog() -> (InMemoryPricingCatalog, AiModel) {
        let mut catalog = InMemoryPricingCatalog::default();
        catalog.add_vendor(ModelVendorDefinition::new(
            "openai",
            ModelVendor::OpenAi,
            "OpenAI",
        ));
        let model = AiModel::new("gpt-4o", "GPT-4o", "openai", vec!["chat"]);
        catalog.add_model(model.clone());
        catalog.add_upstream_account_group(group(10, "default-group", true));
        catalog.add_upstream_account_group(group(20, "backup-group", false));
        catalog.set_upstream_account_group_modality_scope(
            10,
            AccountGroupModalityScope::mixed(),
        );
        catalog.set_upstream_account_group_modality_scope(
            20,
            AccountGroupModalityScope::mixed(),
        );
        // Account 1001 only reaches the model through resource entitlements.
        catalog.add_upstream_account_route(entitlement_route(1001, 10, "openai/gpt-4o"));
        catalog.add_upstream_account_route(entitlement_route(1002, 20, "openai/gpt-4o"));
        (catalog, model)
    }

    #[test]
    fn entitlement_only_routes_count_as_model_membership() {
        let (catalog, model) = catalog();
        let index = ModelGroupRoutingIndex::build(&catalog);
        let groups = index.groups_for_model(&catalog, &model, TENANT_ID, 0, None, None);
        assert_eq!(
            vec![10, 20],
            groups.iter().map(|group| group.group_id).collect::<Vec<_>>()
        );
    }

    #[test]
    fn explicit_rule_is_selected_and_empty_rule_reports_the_inherited_source() {
        let (mut catalog, _model) = catalog();
        catalog.add_user_account_group_route(UserAccountGroupRoute {
            tenant_id: TENANT_ID,
            organization_id: 0,
            user_id: 30,
            scope: AccountGroupRouteScope::Model,
            modality: "text".to_owned(),
            vendor_code: "openai".to_owned(),
            model: "gpt-4o".to_owned(),
            account_group_id: 20,
            account_group_code: "backup-group".to_owned(),
            priority: 10,
        });

        let catalog_entries = build_model_group_catalog(
            &catalog,
            (TENANT_ID, 0, 30),
            Some(SessionAccountGroupModality::Llm),
            Some("openai"),
            &ModelGroupRoutingIndex::build(&catalog),
        );
        let model_entry = &catalog_entries[0].vendors[0].models[0];
        assert_eq!(vec!["backup-group"], model_entry.default_group_codes);
        assert_eq!(Some("user-model-default"), model_entry.default_source.as_deref());

        // No rule: the account default is the inherited source, not a user
        // selection, so `defaultGroupCodes` stays empty.
        let empty = build_model_group_catalog(
            &catalog,
            (TENANT_ID, 0, 31),
            Some(SessionAccountGroupModality::Llm),
            Some("openai"),
            &ModelGroupRoutingIndex::build(&catalog),
        );
        let inherited = &empty[0].vendors[0].models[0];
        assert!(inherited.default_group_codes.is_empty());
        assert!(inherited.default_source.is_some());
    }

    #[test]
    fn api_key_default_group_is_marked_when_it_serves_the_model() {
        let (catalog, model) = catalog();
        let groups = model_group_options_for_context(
            &catalog,
            &model,
            TENANT_ID,
            0,
            None,
            Some(20),
        );
        assert_eq!(1, groups.iter().filter(|group| group.selected).count());
        assert!(groups
            .iter()
            .any(|group| group.group_id == 20 && group.selected));
    }
}
