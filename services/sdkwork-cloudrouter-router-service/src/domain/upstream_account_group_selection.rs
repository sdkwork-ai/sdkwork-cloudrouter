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
//! Selection is a **semantic** decision, not a name lookup. The session names no
//! group, so the group is the subject's declared default *for the requested
//! modality* (chat/LLM, image, video, audio, music). A tenant may therefore run
//! one pool per modality instead of a single mixed pool. In order:
//!
//! 1. **the subject's default group that serves the requested modality** —
//!    `ai_upstream_account_group.is_default` combined with the group's
//!    `group_type` / `modalities` scope. This is authoritative: an operator who
//!    renames the seeded group, or creates their own modality default under a
//!    different code, is honoured.
//! 2. **the subject's `mixed` default group** — the seeded, deployment-wide
//!    default that grants every modality. Kept as the fallback so a deployment
//!    that never configured per-modality defaults keeps routing exactly as it
//!    did before this rule gained a modality dimension.
//! 3. **the group whose `code` is [`DEFAULT_ACCOUNT_GROUP_CODE`]** — the
//!    installer's naming convention for the seeded default mixed group. Kept so
//!    a deployment whose `is_default` flag was never set (or was cleared by a
//!    partial restore) still routes.
//! 4. **the only group in scope** — a subject with exactly one group has no
//!    ambiguity left, so that group is used rather than failing the request
//!    (unless it explicitly declares a different modality; then the request
//!    fails closed here instead of at the resource gate).
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

use crate::domain::{RoutingCapability, UpstreamAccountGroup};

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

/// Requested modality of a session call, mapped onto the account group
/// vocabulary (`group_type` / `modalities`).
///
/// `RoutingCapability::Chat` and the retrieval capabilities share the `llm`
/// pool: the model catalog serves them from text/LLM accounts. `Network`
/// (management traffic) has no dedicated pool and resolves through the mixed
/// default.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SessionAccountGroupModality {
    Llm,
    Image,
    Video,
    Audio,
    Music,
}

impl SessionAccountGroupModality {
    /// Maps the invocation capability onto the account-group modality. `None`
    /// means "no modality constraint" (management endpoints such as the
    /// balance query) and resolves through the mixed default.
    pub fn from_capability(capability: RoutingCapability) -> Option<Self> {
        match capability {
            RoutingCapability::Chat | RoutingCapability::Embedding | RoutingCapability::Rerank => {
                Some(Self::Llm)
            }
            RoutingCapability::Image => Some(Self::Image),
            RoutingCapability::Video => Some(Self::Video),
            RoutingCapability::Audio => Some(Self::Audio),
            RoutingCapability::Music => Some(Self::Music),
            RoutingCapability::Network => None,
        }
    }

    /// `ai_upstream_account_group.group_type` value that serves this modality.
    pub fn group_type(self) -> &'static str {
        match self {
            Self::Llm => "llm",
            Self::Image => "image",
            Self::Video => "video",
            Self::Audio => "audio",
            Self::Music => "music",
        }
    }

    /// `ai_upstream_account_group.modalities` value that serves this modality
    /// (the catalog's resource modality vocabulary, where LLM traffic is
    /// `text`).
    pub fn wire_modality(self) -> &'static str {
        match self {
            Self::Llm => "text",
            Self::Image => "image",
            Self::Video => "video",
            Self::Audio => "audio",
            Self::Music => "music",
        }
    }
}

/// Modality scope declared by an account group.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AccountGroupModalityScope {
    /// `ai_upstream_account_group.group_type` (`mixed`/`llm`/`image`/`video`/
    /// `audio`/`music`/`other`). The database default is `mixed`.
    pub group_type: String,
    /// `ai_upstream_account_group.modalities` (for example `["text"]` or
    /// `["video"]`). Empty means "not explicitly scoped" and `group_type` is
    /// the only signal.
    pub modalities: Vec<String>,
}

impl Default for AccountGroupModalityScope {
    fn default() -> Self {
        Self::mixed()
    }
}

impl AccountGroupModalityScope {
    /// The deployment-wide, modality-neutral scope: the seeded `mixed` group.
    pub fn mixed() -> Self {
        Self {
            group_type: "mixed".to_owned(),
            modalities: Vec::new(),
        }
    }

    pub fn new(group_type: impl Into<String>, modalities: Vec<String>) -> Self {
        Self {
            group_type: group_type.into(),
            modalities,
        }
    }

    /// True when this scope is the deployment-wide, modality-neutral default.
    ///
    /// A group that declares an explicit `modalities` list is never the mixed
    /// catch-all, even when its `group_type` is still the database default
    /// `mixed`: the operator's explicit list is the narrower declaration and
    /// must not be widened into every modality.
    pub fn is_mixed(&self) -> bool {
        let declares_explicit_modalities =
            self.modalities.iter().any(|value| !value.trim().is_empty());
        !declares_explicit_modalities && self.group_type.trim().eq_ignore_ascii_case("mixed")
    }

    /// True when this scope can serve `modality`: an explicit `modalities`
    /// entry wins, otherwise the group type must match.
    pub fn serves(&self, modality: SessionAccountGroupModality) -> bool {
        let mut modalities = self
            .modalities
            .iter()
            .map(|value| value.trim().to_ascii_lowercase())
            .filter(|value| !value.is_empty());
        if self.modalities.iter().any(|value| !value.trim().is_empty()) {
            return modalities
                .any(|value| value == modality.wire_modality() || value == modality.group_type());
        }
        self.group_type
            .trim()
            .eq_ignore_ascii_case(modality.group_type())
    }
}

/// An account group together with the modality scope it declares.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SessionAccountGroup {
    pub group: UpstreamAccountGroup,
    pub modality_scope: AccountGroupModalityScope,
}

impl SessionAccountGroup {
    /// Wraps a group without modality metadata. Catalogs that do not expose
    /// `group_type`/`modalities` degrade to the mixed scope, which preserves
    /// the pre-modality behaviour exactly.
    pub fn from_group(group: UpstreamAccountGroup) -> Self {
        Self {
            group,
            modality_scope: AccountGroupModalityScope::mixed(),
        }
    }

    pub fn new(group: UpstreamAccountGroup, modality_scope: AccountGroupModalityScope) -> Self {
        Self {
            group,
            modality_scope,
        }
    }
}

/// Why [`select_default_session_account_group`] returned a given group.
///
/// Carried on the selection so callers can log / explain the decision (routing
/// explain surfaces) and so tests can pin which step of the rule applied.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DefaultAccountGroupSelectionReason {
    /// Step 1: the subject marked the group as its default for this modality.
    ModalityDefault,
    /// Step 2: the subject's `mixed` default group covers every modality.
    MixedDefault,
    /// Step 2 (no modality constraint): the subject marked the group as default.
    IsDefaultFlag,
    /// Step 3: the group carries the [`DEFAULT_ACCOUNT_GROUP_CODE`] code but the
    /// `is_default` flag is not set.
    CodeConvention,
    /// Step 4: the subject has exactly one group in scope.
    SingleGroupInScope,
    /// The request explicitly pinned the group through the account-group header.
    HeaderOverride,
    /// The user configured a default group for this exact model.
    UserModelDefault,
    /// The user configured a default group for every model of this vendor.
    UserVendorDefault,
    /// The user configured a default group for every model of this modality.
    UserModalityDefault,
}

impl DefaultAccountGroupSelectionReason {
    /// Stable machine-readable label, for logs and routing-explain output.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::ModalityDefault => "modality-default",
            Self::MixedDefault => "mixed-default",
            Self::IsDefaultFlag => "is_default",
            Self::CodeConvention => "default-group-code",
            Self::SingleGroupInScope => "single-group-in-scope",
            Self::HeaderOverride => "header-override",
            Self::UserModelDefault => "user-model-default",
            Self::UserVendorDefault => "user-vendor-default",
            Self::UserModalityDefault => "user-modality-default",
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
/// organization_id)` and an optional requested modality.
///
/// See the module docs for the four-step rule. Returns `None` when no group is
/// in scope, or when several are in scope and none of them matches the
/// modality, the mixed default, or the seeded default code — ambiguous
/// ownership must fail closed rather than pick an arbitrary account pool.
pub fn select_default_session_account_group(
    groups: &[SessionAccountGroup],
    tenant_id: i64,
    organization_id: i64,
    modality: Option<SessionAccountGroupModality>,
) -> Option<DefaultAccountGroupSelection> {
    let mut in_scope: Vec<&SessionAccountGroup> = groups
        .iter()
        .filter(|group| {
            upstream_account_group_in_subject_scope(&group.group, tenant_id, organization_id)
        })
        .collect();
    if in_scope.is_empty() {
        return None;
    }
    // The catalog listing order is a database artifact. Sort by id so the
    // selection is reproducible across reloads and identical for every process
    // serving the same subject.
    in_scope.sort_by_key(|group| group.group.id);

    let defaults = |selection: &DefaultAccountGroupSelection| selection.clone();
    let declared = in_scope
        .iter()
        .copied()
        .filter(|group| group.group.is_default)
        .collect::<Vec<_>>();

    if let Some(modality) = modality {
        if let Some(group) = declared
            .iter()
            .find(|group| group.modality_scope.serves(modality))
        {
            return Some(defaults(&DefaultAccountGroupSelection {
                group: group.group.clone(),
                reason: DefaultAccountGroupSelectionReason::ModalityDefault,
            }));
        }
        if let Some(group) = declared
            .iter()
            .find(|group| group.modality_scope.is_mixed())
        {
            return Some(defaults(&DefaultAccountGroupSelection {
                group: group.group.clone(),
                reason: DefaultAccountGroupSelectionReason::MixedDefault,
            }));
        }
    } else if let Some(group) = declared.first() {
        return Some(defaults(&DefaultAccountGroupSelection {
            group: group.group.clone(),
            reason: DefaultAccountGroupSelectionReason::IsDefaultFlag,
        }));
    }

    if let Some(group) = in_scope.iter().find(|group| {
        group.group.code == DEFAULT_ACCOUNT_GROUP_CODE
            && modality.map_or(true, |modality| {
                group.modality_scope.serves(modality) || group.modality_scope.is_mixed()
            })
    }) {
        return Some(DefaultAccountGroupSelection {
            group: group.group.clone(),
            reason: DefaultAccountGroupSelectionReason::CodeConvention,
        });
    }
    if let [group] = in_scope.as_slice() {
        // "The only group in scope" is unambiguous **for the requested
        // modality**. A single group that explicitly declares another modality
        // (for example a text-only LLM pool serving a video request) must fail
        // closed here instead of being picked and failing later at the resource
        // gate; a mixed / unscoped single group still serves every modality.
        let covers_modality = modality.map_or(true, |modality| {
            group.modality_scope.serves(modality) || group.modality_scope.is_mixed()
        });
        if covers_modality {
            return Some(DefaultAccountGroupSelection {
                group: group.group.clone(),
                reason: DefaultAccountGroupSelectionReason::SingleGroupInScope,
            });
        }
    }
    None
}

/// Modality-free overload kept for the API-key creation fallback: a key names
/// one group, so its default resolution must not depend on a request modality.
///
/// Delegates to [`select_default_session_account_group`] with no modality and a
/// mixed scope for every group, which is exactly the pre-modality rule.
pub fn select_default_account_group_for_subject(
    groups: &[UpstreamAccountGroup],
    tenant_id: i64,
    organization_id: i64,
) -> Option<DefaultAccountGroupSelection> {
    let scoped = groups
        .iter()
        .cloned()
        .map(SessionAccountGroup::from_group)
        .collect::<Vec<_>>();
    select_default_session_account_group(&scoped, tenant_id, organization_id, None)
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

    fn session(
        id: i64,
        code: &str,
        is_default: bool,
        group_type: &str,
        modalities: &[&str],
    ) -> SessionAccountGroup {
        SessionAccountGroup::new(
            group(id, TENANT_ID, 0, code, is_default),
            AccountGroupModalityScope::new(
                group_type,
                modalities.iter().map(|value| (*value).to_owned()).collect(),
            ),
        )
    }

    #[test]
    fn modality_default_wins_over_the_mixed_default() {
        // Per-modality pools: a video default and a mixed default coexist.
        let groups = vec![
            session(10, "default-group", true, "mixed", &[]),
            session(20, "video-pool", true, "video", &["video"]),
        ];
        let selection = select_default_session_account_group(
            &groups,
            TENANT_ID,
            0,
            Some(SessionAccountGroupModality::Video),
        )
        .expect("video default");
        assert_eq!(selection.group.id, 20);
        assert_eq!(
            selection.reason,
            DefaultAccountGroupSelectionReason::ModalityDefault
        );
    }

    #[test]
    fn mixed_default_serves_modalities_without_a_dedicated_default() {
        let groups = vec![
            session(10, "default-group", true, "mixed", &[]),
            session(20, "video-pool", true, "video", &["video"]),
        ];
        let selection = select_default_session_account_group(
            &groups,
            TENANT_ID,
            0,
            Some(SessionAccountGroupModality::Llm),
        )
        .expect("mixed fallback");
        assert_eq!(selection.group.id, 10);
        assert_eq!(
            selection.reason,
            DefaultAccountGroupSelectionReason::MixedDefault
        );
    }

    #[test]
    fn explicit_modalities_list_wins_over_the_group_type() {
        // A group whose `modalities` says `text` serves LLM traffic even when
        // its `group_type` is still the database default `mixed`.
        let groups = vec![session(10, "llm-pool", true, "mixed", &["text"])];
        let selection = select_default_session_account_group(
            &groups,
            TENANT_ID,
            0,
            Some(SessionAccountGroupModality::Llm),
        )
        .expect("text modality");
        assert_eq!(selection.group.id, 10);
        assert_eq!(
            selection.reason,
            DefaultAccountGroupSelectionReason::ModalityDefault
        );
        assert!(select_default_session_account_group(
            &groups,
            TENANT_ID,
            0,
            Some(SessionAccountGroupModality::Video)
        )
        .is_none());
    }

    #[test]
    fn no_modality_keeps_the_legacy_single_default_behaviour() {
        let groups = vec![session(10, "only-pool", true, "video", &["video"])];
        let selection = select_default_session_account_group(&groups, TENANT_ID, 0, None)
            .expect("a declared default");
        assert_eq!(selection.group.id, 10);
        assert_eq!(
            selection.reason,
            DefaultAccountGroupSelectionReason::IsDefaultFlag
        );
    }

    #[test]
    fn a_single_mixed_group_still_serves_every_modality() {
        // Backward compatibility: an unscoped single group (the pre-modality
        // deployment shape) resolves for any modality.
        let groups = vec![session(10, "only-pool", false, "mixed", &[])];
        for modality in [
            SessionAccountGroupModality::Llm,
            SessionAccountGroupModality::Video,
            SessionAccountGroupModality::Music,
        ] {
            let selection =
                select_default_session_account_group(&groups, TENANT_ID, 0, Some(modality))
                    .expect("a mixed single group covers every modality");
            assert_eq!(selection.group.id, 10);
            assert_eq!(
                selection.reason,
                DefaultAccountGroupSelectionReason::SingleGroupInScope
            );
        }
    }

    #[test]
    fn modality_without_any_default_fails_closed_instead_of_using_a_foreign_pool() {
        // Two modality pools, neither marked default, and no mixed default:
        // the request must fail closed rather than pick an arbitrary pool.
        let groups = vec![
            session(10, "llm-pool", false, "llm", &["text"]),
            session(20, "video-pool", false, "video", &["video"]),
        ];
        assert!(select_default_session_account_group(
            &groups,
            TENANT_ID,
            0,
            Some(SessionAccountGroupModality::Llm)
        )
        .is_none());
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
