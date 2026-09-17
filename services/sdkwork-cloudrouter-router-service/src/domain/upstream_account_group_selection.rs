//! Canonical resolution of the upstream account group that serves **session**
//! traffic — requests that reach the account pool without naming a group.
//!
//! Two channels depend on this rule and must never disagree, because the
//! account-route selector matches the resolved group against the account's
//! `account_group_binding` by strict id equality
//! (`upstream_route_selector::upstream_account_group_bindings`), and the group
//! also caps which vendor resources that account may serve
//! (`matched_resource_scope` = group grant ∩ vendor resource):
//!
//! * the **auth-token channel** (`IamAuthTokenAuthenticator`) — every signed-in
//!   end user of the portal and of the content-generation surfaces calls the
//!   open-api with the IAM session bearer token and no explicit group;
//! * the **default-group fallback of the API-key channel** (`app_api_keys`) —
//!   taken when a key is created without `accountGroup` / `accountGroupId`.
//!
//! # The rule
//!
//! Selection is a **semantic** decision, not a name lookup. In order:
//!
//! 1. **the group the subject marked `is_default`** (`ai_upstream_account_group
//!    .is_default`) — the subject's own declaration of which account group is
//!    its default. This is authoritative: an operator who renames the seeded
//!    group, or creates their own default group under a different code, is
//!    honoured.
//! 2. **the group whose `code` is [`DEFAULT_ACCOUNT_GROUP_CODE`]** — the
//!    installer's naming convention for the seeded default mixed group. Kept as
//!    the *second* step so a deployment whose `is_default` flag was never set
//!    (or was cleared by a partial restore) still routes.
//! 3. **the only group in scope** — a subject with exactly one group has no
//!    ambiguity left, so that group is used rather than failing the request.
//!
//! Anything else resolves to `None` and the caller must fail closed.
//!
//! # Scope
//!
//! A group is in a subject's scope when it is owned by the subject, or is a
//! global / organization-agnostic resource (`tenant_id == 0` /
//! `organization_id == 0`). The installer seeds the default mixed group with
//! `organization_id == 0` (`DEFAULT_IAM_ORGANIZATION_SQL_ID`), so it serves
//! every organization of its tenant. This is the same predicate
//! `upstream_route_selector::context_from_group_binding` and
//! `ports::api_key_management_read_store` already apply — this module is its
//! single definition.

use crate::domain::UpstreamAccountGroup;

/// Account group code of the seeded default **mixed** account group.
///
/// This is a cross-crate contract, not a local label:
///
/// * the installer seeds the default mixed group with this code
///   (`infrastructure::sql::ai_routing_seed`),
/// * the auth-token channel resolves every signed-in session to the group this
///   module selects (which falls back to this code),
/// * the account-route selector then requires an exact
///   `binding.account_group_id == group_id` match.
///
/// A rename on any side silently de-routes the whole signed-in user base, so
/// every site must reference this constant instead of re-typing the literal.
pub const DEFAULT_ACCOUNT_GROUP_CODE: &str = "default-group";

/// Why [`select_default_account_group_for_subject`] returned a given group.
///
/// Carried on the selection so callers can log / explain the decision (routing
/// explain surfaces) and so tests can pin which step of the rule applied.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DefaultAccountGroupSelectionReason {
    /// Step 1: the subject marked the group as its default (`is_default`).
    IsDefaultFlag,
    /// Step 2: the group carries the [`DEFAULT_ACCOUNT_GROUP_CODE`] code but the
    /// `is_default` flag is not set.
    CodeConvention,
    /// Step 3: the subject has exactly one group in scope.
    SingleGroupInScope,
}

impl DefaultAccountGroupSelectionReason {
    /// Stable machine-readable label, for logs and routing-explain output.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::IsDefaultFlag => "is_default",
            Self::CodeConvention => "default-group-code",
            Self::SingleGroupInScope => "single-group-in-scope",
        }
    }
}

/// The group selected for a session, together with the rule step that chose it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DefaultAccountGroupSelection {
    pub group: UpstreamAccountGroup,
    pub reason: DefaultAccountGroupSelectionReason,
}

/// True when `group` may serve a request coming from
/// `(tenant_id, organization_id)`.
///
/// A zero on *either* side of a dimension means "not scoped to that dimension":
/// `tenant_id == 0` is a global group, `organization_id == 0` is an
/// organization-agnostic group. Both are seeded that way by the installer.
pub fn upstream_account_group_in_subject_scope(
    group: &UpstreamAccountGroup,
    tenant_id: i64,
    organization_id: i64,
) -> bool {
    (group.tenant_id == 0 || group.tenant_id == tenant_id)
        && (group.organization_id == 0 || group.organization_id == organization_id)
}

/// Resolves the upstream account group for a session of `(tenant_id,
/// organization_id)` out of the full catalog listing.
///
/// See the module docs for the three-step rule. Returns `None` when no group is
/// in scope, or when several are in scope and none of them is either the
/// subject's declared default or the seeded default code — ambiguous ownership
/// must fail closed rather than pick an arbitrary account pool.
pub fn select_default_account_group_for_subject(
    groups: &[UpstreamAccountGroup],
    tenant_id: i64,
    organization_id: i64,
) -> Option<DefaultAccountGroupSelection> {
    let mut in_scope: Vec<&UpstreamAccountGroup> = groups
        .iter()
        .filter(|group| upstream_account_group_in_subject_scope(group, tenant_id, organization_id))
        .collect();
    if in_scope.is_empty() {
        return None;
    }
    // The catalog listing order is a database artifact. Sort by id so the
    // selection is reproducible across reloads and identical for every process
    // serving the same subject.
    in_scope.sort_by_key(|group| group.id);

    if let Some(group) = in_scope.iter().find(|group| group.is_default) {
        return Some(DefaultAccountGroupSelection {
            group: (*group).clone(),
            reason: DefaultAccountGroupSelectionReason::IsDefaultFlag,
        });
    }
    if let Some(group) = in_scope
        .iter()
        .find(|group| group.code == DEFAULT_ACCOUNT_GROUP_CODE)
    {
        return Some(DefaultAccountGroupSelection {
            group: (*group).clone(),
            reason: DefaultAccountGroupSelectionReason::CodeConvention,
        });
    }
    if let [group] = in_scope.as_slice() {
        return Some(DefaultAccountGroupSelection {
            group: (*group).clone(),
            reason: DefaultAccountGroupSelectionReason::SingleGroupInScope,
        });
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{
        DecimalValue, UpstreamAccountFallbackMode, UpstreamAccountRoutingStrategy,
    };

    const TENANT_ID: i64 = 100_001;

    fn group(
        id: i64,
        tenant_id: i64,
        organization_id: i64,
        code: &str,
        is_default: bool,
    ) -> UpstreamAccountGroup {
        UpstreamAccountGroup {
            id,
            tenant_id,
            organization_id,
            name: code.to_owned(),
            code: code.to_owned(),
            is_default,
            pricing_plan_tenant_id: tenant_id,
            pricing_plan_organization_id: organization_id,
            pricing_plan_id: 7,
            pricing_plan_code: "standard".to_owned(),
            routing_strategy: UpstreamAccountRoutingStrategy::Weighted,
            fallback_mode: UpstreamAccountFallbackMode::Sequential,
            priority: 100,
            cost_multiplier: DecimalValue::ONE,
            sale_multiplier: DecimalValue::ONE,
        }
    }

    #[test]
    fn is_default_wins_over_the_default_group_code() {
        // The seeded shape, plus an operator-declared default under a custom
        // code: the declaration must win even though a `default-group`-coded
        // group also exists.
        let groups = vec![
            group(10, TENANT_ID, 0, DEFAULT_ACCOUNT_GROUP_CODE, false),
            group(20, TENANT_ID, 0, "custom-default", true),
        ];
        let selection = select_default_account_group_for_subject(&groups, TENANT_ID, 0)
            .expect("a default group is declared");
        assert_eq!(selection.group.id, 20);
        assert_eq!(
            selection.reason,
            DefaultAccountGroupSelectionReason::IsDefaultFlag
        );
    }

    #[test]
    fn falls_back_to_the_default_group_code_when_no_flag_is_set() {
        let groups = vec![
            group(10, TENANT_ID, 0, "priority-pool", false),
            group(20, TENANT_ID, 0, DEFAULT_ACCOUNT_GROUP_CODE, false),
        ];
        let selection = select_default_account_group_for_subject(&groups, TENANT_ID, 0)
            .expect("the code convention still routes");
        assert_eq!(selection.group.id, 20);
        assert_eq!(
            selection.reason,
            DefaultAccountGroupSelectionReason::CodeConvention
        );
    }

    #[test]
    fn falls_back_to_the_single_group_in_scope() {
        let groups = vec![group(10, TENANT_ID, 0, "only-pool", false)];
        let selection = select_default_account_group_for_subject(&groups, TENANT_ID, 0)
            .expect("one group is unambiguous");
        assert_eq!(selection.group.id, 10);
        assert_eq!(
            selection.reason,
            DefaultAccountGroupSelectionReason::SingleGroupInScope
        );
    }

    #[test]
    fn ambiguous_groups_without_a_default_fail_closed() {
        let groups = vec![
            group(10, TENANT_ID, 0, "pool-a", false),
            group(20, TENANT_ID, 0, "pool-b", false),
        ];
        assert!(select_default_account_group_for_subject(&groups, TENANT_ID, 0).is_none());
    }

    #[test]
    fn other_tenants_groups_are_out_of_scope() {
        let groups = vec![
            group(10, TENANT_ID + 1, 0, DEFAULT_ACCOUNT_GROUP_CODE, true),
            group(20, TENANT_ID, 0, "pool-a", false),
        ];
        let selection = select_default_account_group_for_subject(&groups, TENANT_ID, 0)
            .expect("only the in-tenant group is considered");
        assert_eq!(selection.group.id, 20);
        assert_eq!(
            selection.reason,
            DefaultAccountGroupSelectionReason::SingleGroupInScope
        );
        assert!(
            select_default_account_group_for_subject(&groups, TENANT_ID + 2, 0).is_none(),
            "a tenant with no group of its own must not inherit another tenant's default"
        );
    }

    #[test]
    fn global_and_org_agnostic_groups_are_in_scope() {
        // The seeded default: tenant-scoped, organization-agnostic.
        let groups = vec![group(10, TENANT_ID, 0, DEFAULT_ACCOUNT_GROUP_CODE, true)];
        for organization_id in [0, 5, 999] {
            let selection =
                select_default_account_group_for_subject(&groups, TENANT_ID, organization_id)
                    .unwrap_or_else(|| {
                        panic!("org {organization_id} must reach the seeded default")
                    });
            assert_eq!(selection.group.id, 10);
        }
        // A fully global group serves any tenant.
        let globals = vec![group(11, 0, 0, DEFAULT_ACCOUNT_GROUP_CODE, true)];
        assert!(
            select_default_account_group_for_subject(&globals, TENANT_ID, 5).is_some(),
            "tenant_id == 0 is a global group"
        );
        // An organization-scoped group does not leak into an organization-less
        // session.
        let org_scoped = vec![group(12, TENANT_ID, 5, DEFAULT_ACCOUNT_GROUP_CODE, true)];
        assert!(
            select_default_account_group_for_subject(&org_scoped, TENANT_ID, 5).is_some(),
            "the owning organization reaches its group"
        );
        assert!(
            select_default_account_group_for_subject(&org_scoped, TENANT_ID, 0).is_none(),
            "a session without an organization must not fall into another organization's pool"
        );
    }

    #[test]
    fn selection_is_reproducible_regardless_of_listing_order() {
        let mut groups = vec![
            group(30, TENANT_ID, 0, "pool-a", false),
            group(10, TENANT_ID, 0, "pool-b", false),
            group(20, TENANT_ID, 0, "pool-c", false),
        ];
        assert!(select_default_account_group_for_subject(&groups, TENANT_ID, 0).is_none());
        groups.reverse();
        assert!(select_default_account_group_for_subject(&groups, TENANT_ID, 0).is_none());

        // With a duplicate `is_default` (only reachable if the partial unique
        // index is bypassed) the lowest id wins deterministically.
        let duplicates = vec![
            group(30, TENANT_ID, 0, "pool-a", true),
            group(20, TENANT_ID, 0, "pool-b", true),
        ];
        let selection =
            select_default_account_group_for_subject(&duplicates, TENANT_ID, 0).unwrap();
        assert_eq!(selection.group.id, 20);
    }
}
