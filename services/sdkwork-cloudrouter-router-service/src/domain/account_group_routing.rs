//! User-scoped model → account-group routing.
//!
//! The console lets a signed-in user pin one upstream account group per
//! **model**, per **vendor** (every model of that vendor), or per **modality**
//! (every model of a modality). Those rules live in
//! `ai_user_account_group_route` and are consumed by the auth-token open-api
//! channel before the account-level default-group fallback.
//!
//! Resolution precedence is deliberately narrow and deterministic:
//!
//! 1. the explicit request header ([`ACCOUNT_GROUP_ROUTING_HEADER`]), when it
//!    names a group that is in the subject's scope and serves the requested
//!    modality;
//! 2. the user's rule for the requested **model** (most specific; a rule whose
//!    `vendor_code` matches the requested vendor wins over a vendor-agnostic
//!    one);
//! 3. the user's rule for the requested **vendor**;
//! 4. the user's rule for the requested **modality**;
//! 5. the existing account-level default group
//!    ([`select_default_session_account_group`] — modality default, mixed
//!    default, `default-group` code convention, single group in scope).
//!
//! A rule that names a group outside the subject's scope, or a group that does
//! not serve the requested modality, is skipped rather than failing the
//! request: stale console configuration must never make the whole account pool
//! unreachable. Everything fails closed only when step 5 has no candidate
//! either.
//!
//! The module is pure data + pure functions: it has no database, HTTP, or
//! snapshot dependency, which keeps the precedence table testable on its own.

use crate::domain::upstream_account_group_selection::{
    select_default_session_account_group, AccountGroupModalityScope, DefaultAccountGroupSelection,
    DefaultAccountGroupSelectionReason, SessionAccountGroup, SessionAccountGroupModality,
};
// `upstream_account_group_selection` only imports this type for its own use; the
// canonical path is the domain re-export.
use crate::domain::UpstreamAccountGroup;

/// Request header that pins the account group for one model call.
///
/// Accepted values are either the numeric group id or the group code (case
/// insensitive). The header is opt-in and only honoured when the named group is
/// already reachable by the caller.
pub const ACCOUNT_GROUP_ROUTING_HEADER: &str = "x-sdkwork-account-group";

/// Highest accepted length of the header value (a group code is at most 128).
pub const ACCOUNT_GROUP_ROUTING_HEADER_MAX_LEN: usize = 128;

/// Scope of one user routing rule: a single model, a whole vendor, or a whole
/// modality.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum AccountGroupRouteScope {
    /// Most specific: one model (optionally restricted to one vendor).
    Model,
    /// Every model of `vendor_code`.
    Vendor,
    /// Every model of `modality`.
    Modality,
}

impl AccountGroupRouteScope {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Model => "model",
            Self::Vendor => "vendor",
            Self::Modality => "modality",
        }
    }

    /// Parses the database / API vocabulary. Unknown values are rejected so a
    /// typo cannot silently become a catch-all rule.
    pub fn parse(value: &str) -> Option<Self> {
        match value.trim().to_ascii_lowercase().as_str() {
            "model" => Some(Self::Model),
            "vendor" => Some(Self::Vendor),
            "modality" => Some(Self::Modality),
            _ => None,
        }
    }
}

/// One row of `ai_user_account_group_route`.
///
/// A scope is one-to-many: the same `(scope, modality, vendor, model)` may list
/// several groups, ordered by `priority`. The router tries them in order and
/// skips a group that cannot serve the requested model.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UserAccountGroupRoute {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
    pub scope: AccountGroupRouteScope,
    /// Catalog modality (`text`/`image`/`video`/`audio`/`music`). Empty means
    /// "not modality-bound".
    pub modality: String,
    pub vendor_code: String,
    pub model: String,
    pub account_group_id: i64,
    pub account_group_code: String,
    /// Lower value is tried first.
    pub priority: i32,
}

impl UserAccountGroupRoute {
    /// True when the rule belongs to `(tenant, organization, user)`.
    pub fn belongs_to(&self, tenant_id: i64, organization_id: i64, user_id: i64) -> bool {
        self.tenant_id == tenant_id
            && self.organization_id == organization_id
            && self.user_id == user_id
    }
}

/// Result of [`select_session_account_group_with_user_routing`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SessionAccountGroupRoutingSelection {
    pub selection: DefaultAccountGroupSelection,
    /// Rule that produced the selection for steps 2-4; `None` for the header
    /// override and for the account-level fallback.
    pub matched_rule: Option<UserAccountGroupRoute>,
}

impl SessionAccountGroupRoutingSelection {
    pub fn group(&self) -> &UpstreamAccountGroup {
        &self.selection.group
    }

    pub fn reason(&self) -> DefaultAccountGroupSelectionReason {
        self.selection.reason
    }
}

/// Normalizes a raw header value, rejecting blank or over-long input.
///
/// Returns `None` for "no explicit override"; a malformed override is ignored
/// (the request falls back to the user/account rules) rather than failing:
/// routing configuration must not be able to reject an otherwise valid call
/// through a header typo.
pub fn normalize_account_group_header(raw: Option<&str>) -> Option<&str> {
    let value = raw?.trim();
    if value.is_empty() || value.len() > ACCOUNT_GROUP_ROUTING_HEADER_MAX_LEN {
        return None;
    }
    Some(value)
}

/// Resolves the account group for one session call.
///
/// See the module docs for the precedence table. `requested_model_keys` should
/// hold every spelling the caller resolved for the request (requested name and
/// catalog key); `requested_vendor_codes` the vendor(s) the model is published
/// under.
#[allow(clippy::too_many_arguments)]
pub fn select_session_account_group_with_user_routing(
    groups: &[SessionAccountGroup],
    user_routes: &[UserAccountGroupRoute],
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
    modality: Option<SessionAccountGroupModality>,
    requested_model_keys: &[String],
    requested_vendor_codes: &[String],
    header_group: Option<&str>,
) -> Option<SessionAccountGroupRoutingSelection> {
    select_session_account_group_with_user_routing_and_support(
        groups,
        user_routes,
        tenant_id,
        organization_id,
        user_id,
        modality,
        requested_model_keys,
        requested_vendor_codes,
        header_group,
        None,
    )
}

/// Like [`select_session_account_group_with_user_routing`], but restricts the
/// candidates to groups that can actually serve the requested model.
///
/// `supported_group_ids` is `None` when the caller cannot compute model
/// membership (management/model-list calls); routing then keeps the
/// modality-scope behaviour. When it is `Some`, a group that cannot serve the
/// model is skipped and the next configured group is tried — this is what makes
/// a one-to-many model rule a real failover list instead of a single pin.
#[allow(clippy::too_many_arguments)]
pub fn select_session_account_group_with_user_routing_and_support(
    groups: &[SessionAccountGroup],
    user_routes: &[UserAccountGroupRoute],
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
    modality: Option<SessionAccountGroupModality>,
    requested_model_keys: &[String],
    requested_vendor_codes: &[String],
    header_group: Option<&str>,
    supported_group_ids: Option<&[i64]>,
) -> Option<SessionAccountGroupRoutingSelection> {
    let supported = |group: &UpstreamAccountGroup| {
        supported_group_ids.map_or(true, |ids| ids.contains(&group.id))
    };
    let in_scope = in_scope_groups(groups, tenant_id, organization_id)
        .into_iter()
        .filter(|group| supported(&group.group))
        .collect::<Vec<_>>();
    if in_scope.is_empty() {
        return None;
    }

    // 1. Explicit header override.
    if let Some(raw) = normalize_account_group_header(header_group) {
        let matched = in_scope.iter().find(|group| {
            group_matches_override(&group.group, raw) && group_serves_modality(group, modality)
        });
        if let Some(group) = matched {
            return Some(SessionAccountGroupRoutingSelection {
                selection: DefaultAccountGroupSelection {
                    group: group.group.clone(),
                    reason: DefaultAccountGroupSelectionReason::HeaderOverride,
                },
                matched_rule: None,
            });
        }
        tracing::warn!(
            header = ACCOUNT_GROUP_ROUTING_HEADER,
            requested = raw,
            tenant_id,
            organization_id,
            user_id,
            "requested account group is not reachable for this subject; falling back to user/account defaults"
        );
    }

    // 2-4. User rules, most specific scope first. Each scope may list several
    // groups; they are tried in priority order and an unusable one falls
    // through to the next group before the next scope.
    for scope in [
        AccountGroupRouteScope::Model,
        AccountGroupRouteScope::Vendor,
        AccountGroupRouteScope::Modality,
    ] {
        let rules = matching_rules_for_scope(
            user_routes,
            scope,
            tenant_id,
            organization_id,
            user_id,
            modality,
            requested_model_keys,
            requested_vendor_codes,
        );
        for rule in rules {
            let Some(group) = in_scope.iter().find(|group| {
                group_matches_rule(group, &rule) && group_serves_modality(group, modality)
            }) else {
                // The rule points at a group the subject cannot reach, a group
                // scoped to another modality, or a group that cannot serve the
                // requested model: skip it and keep trying the ordered list.
                tracing::warn!(
                    account_group_id = rule.account_group_id,
                    account_group_code = %rule.account_group_code,
                    scope = rule.scope.as_str(),
                    tenant_id,
                    organization_id,
                    user_id,
                    "user model routing rule references an unusable account group; skipping"
                );
                continue;
            };
            return Some(SessionAccountGroupRoutingSelection {
                selection: DefaultAccountGroupSelection {
                    group: group.group.clone(),
                    reason: scope_reason(scope),
                },
                matched_rule: Some(rule),
            });
        }
    }

    // 5. Account-level default group (existing rule). Recompute the scope from
    // the supported subset so the fallback honours the same model constraint.
    let fallback_groups = in_scope
        .iter()
        .map(|group| (*group).clone())
        .collect::<Vec<_>>();
    select_default_session_account_group(&fallback_groups, tenant_id, organization_id, modality)
        .map(|selection| SessionAccountGroupRoutingSelection {
            selection,
            matched_rule: None,
        })
}

/// Groups the subject may route through (same predicate the account-level
/// default selection uses), sorted by id for reproducibility.
fn in_scope_groups(
    groups: &[SessionAccountGroup],
    tenant_id: i64,
    organization_id: i64,
) -> Vec<&SessionAccountGroup> {
    let mut in_scope = groups
        .iter()
        .filter(|group| {
            crate::domain::upstream_account_group_in_subject_scope(
                &group.group,
                tenant_id,
                organization_id,
            )
        })
        .collect::<Vec<_>>();
    in_scope.sort_by_key(|group| group.group.id);
    in_scope
}

fn scope_reason(scope: AccountGroupRouteScope) -> DefaultAccountGroupSelectionReason {
    match scope {
        AccountGroupRouteScope::Model => DefaultAccountGroupSelectionReason::UserModelDefault,
        AccountGroupRouteScope::Vendor => DefaultAccountGroupSelectionReason::UserVendorDefault,
        AccountGroupRouteScope::Modality => DefaultAccountGroupSelectionReason::UserModalityDefault,
    }
}

fn group_serves_modality(
    group: &SessionAccountGroup,
    modality: Option<SessionAccountGroupModality>,
) -> bool {
    modality.map_or(true, |modality| {
        group.modality_scope.serves(modality) || group.modality_scope.is_mixed()
    })
}

fn group_matches_override(group: &UpstreamAccountGroup, raw: &str) -> bool {
    let raw = raw.trim();
    if raw.is_empty() {
        return false;
    }
    if let Ok(id) = raw.parse::<i64>() {
        return group.id == id;
    }
    group.code.trim().eq_ignore_ascii_case(raw)
}

fn group_matches_rule(group: &SessionAccountGroup, rule: &UserAccountGroupRoute) -> bool {
    group.group.id == rule.account_group_id
        || (!rule.account_group_code.trim().is_empty()
            && group
                .group
                .code
                .trim()
                .eq_ignore_ascii_case(rule.account_group_code.trim()))
}

fn matching_rules_for_scope(
    user_routes: &[UserAccountGroupRoute],
    scope: AccountGroupRouteScope,
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
    modality: Option<SessionAccountGroupModality>,
    requested_model_keys: &[String],
    requested_vendor_codes: &[String],
) -> Vec<UserAccountGroupRoute> {
    let mut rules = user_routes
        .iter()
        .filter(|rule| rule.scope == scope)
        .filter(|rule| rule.belongs_to(tenant_id, organization_id, user_id))
        .filter(|rule| rule_modality_matches(rule, modality))
        .filter(|rule| {
            rule_model_and_vendor_matches(rule, requested_model_keys, requested_vendor_codes)
        })
        .cloned()
        .collect::<Vec<_>>();
    rules.sort_by_key(|rule| {
        (
            rule.priority,
            rule_specificity(rule, requested_vendor_codes),
        )
    });
    rules
}

/// True when a rule applies to the request's modality, model, and vendor.
/// Shared by the resolver and the console catalog so both use one match rule.
pub(crate) fn rule_matches_request(
    rule: &UserAccountGroupRoute,
    modality: Option<SessionAccountGroupModality>,
    requested_model_keys: &[String],
    requested_vendor_codes: &[String],
) -> bool {
    rule_modality_matches(rule, modality)
        && rule_model_and_vendor_matches(rule, requested_model_keys, requested_vendor_codes)
}

/// Modality filter of a rule. An empty rule modality is not modality-bound and
/// matches any request; otherwise the request modality must be known and equal
/// to the rule's catalog (`text`) or group-type (`llm`) spelling.
fn rule_modality_matches(
    rule: &UserAccountGroupRoute,
    modality: Option<SessionAccountGroupModality>,
) -> bool {
    let rule_modality = rule.modality.trim();
    if rule_modality.is_empty() {
        return true;
    }
    let Some(modality) = modality else {
        // A modality-bound rule must not apply to a modality-less call.
        return false;
    };
    rule_modality.eq_ignore_ascii_case(modality.wire_modality())
        || rule_modality.eq_ignore_ascii_case(modality.group_type())
}

fn rule_model_and_vendor_matches(
    rule: &UserAccountGroupRoute,
    requested_model_keys: &[String],
    requested_vendor_codes: &[String],
) -> bool {
    let rule_vendor = rule.vendor_code.trim();
    let vendor_matches = rule_vendor.is_empty()
        || requested_vendor_codes
            .iter()
            .any(|vendor| vendor.trim().eq_ignore_ascii_case(rule_vendor));
    if !vendor_matches {
        return false;
    }
    match rule.scope {
        AccountGroupRouteScope::Model => {
            let rule_model = rule.model.trim();
            !rule_model.is_empty()
                && requested_model_keys.iter().any(|key| {
                    let key = key.trim();
                    key.eq_ignore_ascii_case(rule_model)
                        || model_basename(key).eq_ignore_ascii_case(model_basename(rule_model))
                })
        }
        AccountGroupRouteScope::Vendor => !rule_vendor.is_empty(),
        AccountGroupRouteScope::Modality => true,
    }
}

/// Last path segment of a catalog key (`openai/gpt-4o` → `gpt-4o`). Used only
/// as a fallback when the caller supplied both the wire name and the catalog
/// key, so a rule stored in either spelling still matches.
fn model_basename(value: &str) -> &str {
    value.rsplit('/').next().unwrap_or(value)
}

fn rule_specificity(rule: &UserAccountGroupRoute, requested_vendor_codes: &[String]) -> (u8, i64) {
    let vendor_specific = rule
        .vendor_code
        .trim()
        .is_empty()
        .then_some(1u8)
        .unwrap_or_else(|| {
            requested_vendor_codes
                .iter()
                .any(|vendor| vendor.trim().eq_ignore_ascii_case(rule.vendor_code.trim()))
                .then_some(0)
                .unwrap_or(1)
        });
    (vendor_specific, rule.account_group_id)
}

/// Resolves the header override for API-key traffic: a key may only pin one of
/// the groups it is already bound to. Returns `None` when the header names a
/// group the key cannot use (the caller keeps the key's default group).
pub fn select_api_key_account_group_override(
    bound_group_ids: &[i64],
    groups: &[UpstreamAccountGroup],
    raw: Option<&str>,
) -> Option<UpstreamAccountGroup> {
    let raw = normalize_account_group_header(raw)?;
    let group = groups
        .iter()
        .find(|group| group_matches_override(group, raw))?;
    bound_group_ids.contains(&group.id).then(|| group.clone())
}

/// Converts a stored modality/group-type string into the selection enum.
pub fn session_modality_from_wire(value: &str) -> Option<SessionAccountGroupModality> {
    match value.trim().to_ascii_lowercase().as_str() {
        "text" | "llm" => Some(SessionAccountGroupModality::Llm),
        "image" => Some(SessionAccountGroupModality::Image),
        "video" => Some(SessionAccountGroupModality::Video),
        "audio" => Some(SessionAccountGroupModality::Audio),
        "music" => Some(SessionAccountGroupModality::Music),
        _ => None,
    }
}

/// Scope of an account group used by the console's model-group catalog.
pub fn account_group_can_serve_modality(
    scope: &AccountGroupModalityScope,
    modality: SessionAccountGroupModality,
) -> bool {
    scope.serves(modality) || scope.is_mixed()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::DecimalValue;

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
            pricing_plan_id: 7,
            pricing_plan_code: "standard".to_owned(),
            routing_strategy: crate::domain::UpstreamAccountRoutingStrategy::Weighted,
            fallback_mode: crate::domain::UpstreamAccountFallbackMode::Sequential,
            priority: 100,
            cost_multiplier: DecimalValue::ONE,
            sale_multiplier: DecimalValue::ONE,
        }
    }

    fn session(
        id: i64,
        code: &str,
        is_default: bool,
        group_type: &str,
        modalities: &[&str],
    ) -> SessionAccountGroup {
        SessionAccountGroup::new(
            group(id, code, is_default),
            AccountGroupModalityScope::new(
                group_type,
                modalities.iter().map(|value| (*value).to_owned()).collect(),
            ),
        )
    }

    fn rule(
        scope: AccountGroupRouteScope,
        modality: &str,
        vendor: &str,
        model: &str,
        group_id: i64,
        group_code: &str,
    ) -> UserAccountGroupRoute {
        UserAccountGroupRoute {
            tenant_id: TENANT_ID,
            organization_id: 0,
            user_id: 30,
            scope,
            modality: modality.to_owned(),
            vendor_code: vendor.to_owned(),
            model: model.to_owned(),
            account_group_id: group_id,
            account_group_code: group_code.to_owned(),
            priority: 100,
        }
    }

    fn keys(values: &[&str]) -> Vec<String> {
        values.iter().map(|value| (*value).to_owned()).collect()
    }

    fn groups() -> Vec<SessionAccountGroup> {
        vec![
            session(10, "default-group", true, "mixed", &[]),
            session(20, "video-pool", false, "video", &["video"]),
            session(30, "llm-pool", false, "llm", &["text"]),
        ]
    }

    #[test]
    fn model_rule_wins_over_vendor_and_modality_rules() {
        let routes = vec![
            rule(
                AccountGroupRouteScope::Modality,
                "text",
                "",
                "",
                10,
                "default-group",
            ),
            rule(
                AccountGroupRouteScope::Vendor,
                "text",
                "openai",
                "",
                30,
                "llm-pool",
            ),
            rule(
                AccountGroupRouteScope::Model,
                "text",
                "openai",
                "gpt-4o",
                20,
                "video-pool",
            ),
        ];
        let selection = select_session_account_group_with_user_routing(
            &groups(),
            &routes,
            TENANT_ID,
            0,
            30,
            Some(SessionAccountGroupModality::Llm),
            &keys(&["gpt-4o", "openai/gpt-4o"]),
            &keys(&["openai"]),
            None,
        )
        .expect("model rule");
        // The rule points at the video pool, which does not serve LLM traffic,
        // so it is skipped; the vendor rule then applies.
        assert_eq!(30, selection.group().id);
        assert_eq!(
            selection.reason(),
            DefaultAccountGroupSelectionReason::UserVendorDefault
        );
    }

    #[test]
    fn model_rule_wins_when_the_group_serves_the_modality() {
        let routes = vec![
            rule(
                AccountGroupRouteScope::Modality,
                "text",
                "",
                "",
                10,
                "default-group",
            ),
            rule(
                AccountGroupRouteScope::Vendor,
                "text",
                "openai",
                "",
                20,
                "video-pool",
            ),
            rule(
                AccountGroupRouteScope::Model,
                "text",
                "openai",
                "gpt-4o",
                30,
                "llm-pool",
            ),
        ];
        let selection = select_session_account_group_with_user_routing(
            &groups(),
            &routes,
            TENANT_ID,
            0,
            30,
            Some(SessionAccountGroupModality::Llm),
            &keys(&["openai/gpt-4o"]),
            &keys(&["openai"]),
            None,
        )
        .expect("model rule");
        assert_eq!(30, selection.group().id);
        assert_eq!(
            selection.reason(),
            DefaultAccountGroupSelectionReason::UserModelDefault
        );
        assert_eq!(
            AccountGroupRouteScope::Model,
            selection.matched_rule.expect("rule").scope
        );
    }

    #[test]
    fn header_override_wins_over_every_rule() {
        let selection = select_session_account_group_with_user_routing(
            &groups(),
            &[rule(
                AccountGroupRouteScope::Model,
                "text",
                "openai",
                "gpt-4o",
                30,
                "llm-pool",
            )],
            TENANT_ID,
            0,
            30,
            Some(SessionAccountGroupModality::Llm),
            &keys(&["gpt-4o"]),
            &keys(&["openai"]),
            Some("default-group"),
        )
        .expect("header override");
        assert_eq!(10, selection.group().id);
        assert_eq!(
            selection.reason(),
            DefaultAccountGroupSelectionReason::HeaderOverride
        );
    }

    #[test]
    fn header_accepts_numeric_group_id() {
        let selection = select_session_account_group_with_user_routing(
            &groups(),
            &[],
            TENANT_ID,
            0,
            30,
            Some(SessionAccountGroupModality::Llm),
            &[],
            &[],
            Some("30"),
        )
        .expect("numeric override");
        assert_eq!(30, selection.group().id);
    }

    #[test]
    fn unreachable_header_group_falls_back_to_account_default() {
        let selection = select_session_account_group_with_user_routing(
            &groups(),
            &[],
            TENANT_ID,
            0,
            30,
            Some(SessionAccountGroupModality::Llm),
            &[],
            &[],
            Some("does-not-exist"),
        )
        .expect("fallback");
        assert_eq!(10, selection.group().id);
        assert_eq!(
            selection.reason(),
            DefaultAccountGroupSelectionReason::MixedDefault
        );
    }

    #[test]
    fn rules_of_other_users_are_ignored() {
        let mut foreign = rule(
            AccountGroupRouteScope::Model,
            "text",
            "openai",
            "gpt-4o",
            20,
            "video-pool",
        );
        foreign.user_id = 31;
        let selection = select_session_account_group_with_user_routing(
            &groups(),
            &[foreign],
            TENANT_ID,
            0,
            30,
            Some(SessionAccountGroupModality::Llm),
            &keys(&["gpt-4o"]),
            &keys(&["openai"]),
            None,
        )
        .expect("account default");
        assert_eq!(10, selection.group().id);
    }

    #[test]
    fn user_rule_pointing_outside_scope_is_skipped() {
        let mut outside = rule(
            AccountGroupRouteScope::Model,
            "text",
            "openai",
            "gpt-4o",
            99,
            "other-tenant",
        );
        outside.tenant_id = TENANT_ID + 1;
        let selection = select_session_account_group_with_user_routing(
            &groups(),
            &[outside],
            TENANT_ID,
            0,
            30,
            Some(SessionAccountGroupModality::Llm),
            &keys(&["gpt-4o"]),
            &keys(&["openai"]),
            None,
        )
        .expect("account default");
        assert_eq!(10, selection.group().id);
    }

    #[test]
    fn model_scope_tries_the_configured_groups_in_priority_order() {
        let mut first = rule(
            AccountGroupRouteScope::Model,
            "text",
            "openai",
            "gpt-4o",
            20,
            "video-pool",
        );
        first.priority = 10;
        let mut second = rule(
            AccountGroupRouteScope::Model,
            "text",
            "openai",
            "gpt-4o",
            30,
            "llm-pool",
        );
        second.priority = 20;
        let selection = select_session_account_group_with_user_routing(
            &groups(),
            &[second, first],
            TENANT_ID,
            0,
            30,
            Some(SessionAccountGroupModality::Llm),
            &keys(&["gpt-4o"]),
            &keys(&["openai"]),
            None,
        )
        .expect("one-to-many model rules");
        // The priority-10 group is the video pool (cannot serve LLM traffic),
        // so routing falls through to the priority-20 LLM pool.
        assert_eq!(30, selection.group().id);
        assert_eq!(20, selection.matched_rule.expect("rule").priority);
    }

    #[test]
    fn api_key_override_requires_a_bound_group() {
        let groups = vec![
            group(10, "default-group", true),
            group(20, "video-pool", false),
        ];
        assert_eq!(
            20,
            select_api_key_account_group_override(&[10, 20], &groups, Some("video-pool"))
                .expect("bound group")
                .id
        );
        assert!(
            select_api_key_account_group_override(&[10], &groups, Some("video-pool")).is_none()
        );
    }

    #[test]
    fn blank_and_overlong_headers_are_ignored() {
        assert!(normalize_account_group_header(Some("   ")).is_none());
        assert!(normalize_account_group_header(Some(&"x".repeat(129))).is_none());
        assert_eq!(Some("pool"), normalize_account_group_header(Some(" pool ")));
    }
}
