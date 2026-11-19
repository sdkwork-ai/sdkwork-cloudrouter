//! Storage-center configuration for delivering generated media to SDKWork Drive.
//!
//! `storage_generation_delivery_policy` and `storage_vendor_asset_ttl` are
//! Cloud Router-owned governance records behind the admin storage surface
//! (`/backend/v3/api/storage/*`). This module holds the pure resolution rules so
//! the route handlers, the internal resolve API, and the generation modules all
//! agree on one precedence:
//!
//! 1. media-kind-specific rows beat `all` rows (a tenant's `video` rule is never
//!    silently overridden by a user's generic `all` preference);
//! 2. within the same specificity, `user` beats `organization` beats `tenant`;
//! 3. fields are inherited field by field, so a user override can change only
//!    `delivery_mode` while inheriting the organization's Drive target;
//! 4. when nothing matches, the system default applies: **keep the generated
//!    media remote** (no Drive download — the cost-saving default), retain the
//!    vendor reference when it expires, and copy into Drive only when a policy
//!    explicitly opts into `to_drive`.

use crate::domain::DomainError;

pub const MEDIA_KIND_ALL: &str = "all";
pub const MEDIA_KIND_IMAGE: &str = "image";
pub const MEDIA_KIND_VIDEO: &str = "video";
pub const MEDIA_KIND_AUDIO: &str = "audio";

pub const SCOPE_TENANT: &str = "tenant";
pub const SCOPE_ORGANIZATION: &str = "organization";
pub const SCOPE_USER: &str = "user";

pub const DELIVERY_MODE_REMOTE_ONLY: &str = "remote_only";
pub const DELIVERY_MODE_TO_DRIVE: &str = "to_drive";

pub const VENDOR_EXPIRY_ACTION_DELETE_REMOTE: &str = "delete_remote";
pub const VENDOR_EXPIRY_ACTION_FAIL_JOB: &str = "fail_job";
pub const VENDOR_EXPIRY_ACTION_KEEP_REFERENCE: &str = "keep_reference";

/// Conservative lifetime assumed when neither the vendor nor the operator
/// declares one.
pub const DEFAULT_VENDOR_ASSET_TTL_SECONDS: i32 = 86_400;
/// A download deadline defaults to this percentage of the vendor asset TTL.
pub const DEFAULT_DOWNLOAD_DEADLINE_TTL_PERCENT: i32 = 80;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GenerationMediaKind {
    All,
    Image,
    Video,
    Audio,
}

impl GenerationMediaKind {
    pub fn parse(value: &str) -> Option<Self> {
        match value.trim().to_ascii_lowercase().as_str() {
            MEDIA_KIND_ALL => Some(Self::All),
            MEDIA_KIND_IMAGE => Some(Self::Image),
            MEDIA_KIND_VIDEO => Some(Self::Video),
            MEDIA_KIND_AUDIO => Some(Self::Audio),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::All => MEDIA_KIND_ALL,
            Self::Image => MEDIA_KIND_IMAGE,
            Self::Video => MEDIA_KIND_VIDEO,
            Self::Audio => MEDIA_KIND_AUDIO,
        }
    }

    fn is_specific(self) -> bool {
        !matches!(self, Self::All)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GenerationDeliveryScope {
    Organization,
    Tenant,
    User,
}

impl GenerationDeliveryScope {
    pub fn parse(value: &str) -> Option<Self> {
        match value.trim().to_ascii_lowercase().as_str() {
            SCOPE_ORGANIZATION => Some(Self::Organization),
            SCOPE_TENANT => Some(Self::Tenant),
            SCOPE_USER => Some(Self::User),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Organization => SCOPE_ORGANIZATION,
            Self::Tenant => SCOPE_TENANT,
            Self::User => SCOPE_USER,
        }
    }

    fn rank(self) -> u8 {
        match self {
            Self::User => 0,
            Self::Organization => 1,
            Self::Tenant => 2,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GenerationDeliveryMode {
    RemoteOnly,
    ToDrive,
}

impl GenerationDeliveryMode {
    pub fn parse(value: &str) -> Option<Self> {
        match value.trim().to_ascii_lowercase().as_str() {
            DELIVERY_MODE_REMOTE_ONLY => Some(Self::RemoteOnly),
            DELIVERY_MODE_TO_DRIVE => Some(Self::ToDrive),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::RemoteOnly => DELIVERY_MODE_REMOTE_ONLY,
            Self::ToDrive => DELIVERY_MODE_TO_DRIVE,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VendorExpiryAction {
    DeleteRemote,
    FailJob,
    KeepReference,
}

impl VendorExpiryAction {
    pub fn parse(value: &str) -> Option<Self> {
        match value.trim().to_ascii_lowercase().as_str() {
            VENDOR_EXPIRY_ACTION_DELETE_REMOTE => Some(Self::DeleteRemote),
            VENDOR_EXPIRY_ACTION_FAIL_JOB => Some(Self::FailJob),
            VENDOR_EXPIRY_ACTION_KEEP_REFERENCE => Some(Self::KeepReference),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::DeleteRemote => VENDOR_EXPIRY_ACTION_DELETE_REMOTE,
            Self::FailJob => VENDOR_EXPIRY_ACTION_FAIL_JOB,
            Self::KeepReference => VENDOR_EXPIRY_ACTION_KEEP_REFERENCE,
        }
    }
}

/// One persisted policy row (values already validated by the store).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GenerationDeliveryPolicyRow {
    pub scope_type: String,
    pub scope_id: String,
    pub media_kind: String,
    pub delivery_mode: String,
    pub drive_space_id: Option<String>,
    pub drive_folder_node_id: Option<String>,
    pub download_deadline_seconds: Option<i32>,
    pub vendor_expiry_action: String,
    pub delete_remote_after_download: bool,
}

/// One persisted vendor asset TTL row.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VendorAssetTtlRow {
    pub vendor_code: String,
    pub media_kind: String,
    pub ttl_seconds: i32,
}

/// The requester a policy is resolved for.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeliverySubjectScope {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResolvedGenerationDelivery {
    pub delivery_mode: GenerationDeliveryMode,
    pub drive_space_id: Option<String>,
    pub drive_folder_node_id: Option<String>,
    pub download_deadline_seconds: Option<i32>,
    pub vendor_expiry_action: VendorExpiryAction,
    pub delete_remote_after_download: bool,
    /// Highest-priority row that contributed a value.
    pub source_scope: Option<(GenerationDeliveryScope, String)>,
    /// Every row that contributed a value, in resolution order.
    pub applied_scopes: Vec<(GenerationDeliveryScope, String)>,
}

impl Default for ResolvedGenerationDelivery {
    fn default() -> Self {
        Self {
            delivery_mode: GenerationDeliveryMode::RemoteOnly,
            drive_space_id: None,
            drive_folder_node_id: None,
            download_deadline_seconds: None,
            vendor_expiry_action: VendorExpiryAction::KeepReference,
            delete_remote_after_download: true,
            source_scope: None,
            applied_scopes: Vec::new(),
        }
    }
}

impl DeliverySubjectScope {
    fn matches(&self, scope: GenerationDeliveryScope, scope_id: &str) -> bool {
        match scope {
            GenerationDeliveryScope::Tenant => scope_id == self.tenant_id.to_string(),
            GenerationDeliveryScope::Organization => scope_id == self.organization_id.to_string(),
            GenerationDeliveryScope::User => self
                .user_id
                .is_some_and(|user_id| scope_id == user_id.to_string()),
        }
    }
}

/// Resolves the effective delivery policy for one requester and media kind.
///
/// Rows whose scope or media kind does not parse are ignored (the store only
/// persists validated values, so this is defensive). Returned `applied_scopes`
/// makes the inheritance observable for auditing and UI source hints.
pub fn resolve_generation_delivery(
    rows: &[GenerationDeliveryPolicyRow],
    subject: &DeliverySubjectScope,
    media_kind: GenerationMediaKind,
) -> ResolvedGenerationDelivery {
    let mut applicable: Vec<(u8, u8, &GenerationDeliveryPolicyRow)> = rows
        .iter()
        .filter_map(|row| {
            let scope = GenerationDeliveryScope::parse(&row.scope_type)?;
            if !subject.matches(scope, row.scope_id.trim()) {
                return None;
            }
            let row_kind = GenerationMediaKind::parse(&row.media_kind)?;
            if !(row_kind == media_kind || row_kind == GenerationMediaKind::All) {
                return None;
            }
            // Specificity first (media-kind-specific before `all`), then scope.
            let specificity = u8::from(!row_kind.is_specific());
            Some((specificity, scope.rank(), row))
        })
        .collect();
    applicable.sort_by(|left, right| {
        (left.0, left.1)
            .cmp(&(right.0, right.1))
            .then_with(|| left.2.scope_id.cmp(&right.2.scope_id))
    });

    let mut resolved = ResolvedGenerationDelivery::default();
    // Fields are merged highest-priority-first: the first row that carries a
    // value wins, later rows only fill what is still unset (field-level
    // inheritance, never a full-row overwrite).
    let mut delivery_mode_set = false;
    let mut vendor_expiry_action_set = false;
    let mut delete_remote_set = false;
    for (_, _, row) in applicable {
        let scope = match GenerationDeliveryScope::parse(&row.scope_type) {
            Some(scope) => scope,
            None => continue,
        };
        let applied = resolved
            .applied_scopes
            .iter()
            .any(|(applied_scope, applied_id)| {
                *applied_scope == scope && applied_id == &row.scope_id
            });
        if !applied {
            resolved.applied_scopes.push((scope, row.scope_id.clone()));
        }
        if resolved.source_scope.is_none() {
            resolved.source_scope = Some((scope, row.scope_id.clone()));
        }
        if !delivery_mode_set {
            if let Some(mode) = GenerationDeliveryMode::parse(&row.delivery_mode) {
                resolved.delivery_mode = mode;
                delivery_mode_set = true;
            }
        }
        if !vendor_expiry_action_set {
            if let Some(action) = VendorExpiryAction::parse(&row.vendor_expiry_action) {
                resolved.vendor_expiry_action = action;
                vendor_expiry_action_set = true;
            }
        }
        if resolved.drive_space_id.is_none() {
            resolved.drive_space_id = row
                .drive_space_id
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_owned);
        }
        if resolved.drive_folder_node_id.is_none() {
            resolved.drive_folder_node_id = row
                .drive_folder_node_id
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_owned);
        }
        if resolved.download_deadline_seconds.is_none() {
            resolved.download_deadline_seconds =
                row.download_deadline_seconds.filter(|seconds| *seconds > 0);
        }
        if !delete_remote_set {
            resolved.delete_remote_after_download = row.delete_remote_after_download;
            delete_remote_set = true;
        }
    }
    resolved
}

/// Resolves the vendor TTL for one vendor and media kind (tenant override first,
/// then a kind-agnostic fallback is not used: the TTL table is always explicit).
pub fn resolve_vendor_asset_ttl(
    rows: &[VendorAssetTtlRow],
    vendor_code: &str,
    media_kind: GenerationMediaKind,
) -> Option<i32> {
    let vendor_code = vendor_code.trim();
    rows.iter()
        .filter(|row| row.vendor_code.trim().eq_ignore_ascii_case(vendor_code))
        .find_map(|row| {
            let row_kind = GenerationMediaKind::parse(&row.media_kind)?;
            (row_kind == media_kind && row.ttl_seconds > 0).then_some(row.ttl_seconds)
        })
}

/// The download deadline for one asset: the policy override when set, otherwise
/// the TTL percentage, never beyond the vendor TTL itself.
pub fn effective_download_deadline_seconds(
    policy: &ResolvedGenerationDelivery,
    ttl_seconds: i32,
) -> i32 {
    let ttl_seconds = ttl_seconds.max(1);
    let ttl_percent_deadline =
        (ttl_seconds.saturating_mul(DEFAULT_DOWNLOAD_DEADLINE_TTL_PERCENT) / 100).max(1);
    let deadline = policy
        .download_deadline_seconds
        .filter(|seconds| *seconds > 0)
        .map(|seconds| seconds.min(ttl_seconds))
        .unwrap_or(ttl_percent_deadline);
    deadline.max(1)
}

/// Validates an upsert payload before it reaches SQL.
pub fn validate_generation_delivery_policy(
    scope_type: &str,
    scope_id: &str,
    media_kind: &str,
    delivery_mode: &str,
    vendor_expiry_action: &str,
    download_deadline_seconds: Option<i32>,
) -> Result<(), DomainError> {
    if GenerationDeliveryScope::parse(scope_type).is_none() {
        return Err(DomainError::new(format!(
            "scopeType must be one of tenant, organization, user (got {scope_type})"
        )));
    }
    if GenerationMediaKind::parse(media_kind).is_none() {
        return Err(DomainError::new(format!(
            "mediaKind must be one of all, image, video, audio (got {media_kind})"
        )));
    }
    if GenerationDeliveryMode::parse(delivery_mode).is_none() {
        return Err(DomainError::new(format!(
            "deliveryMode must be one of remote_only, to_drive (got {delivery_mode})"
        )));
    }
    if VendorExpiryAction::parse(vendor_expiry_action).is_none() {
        return Err(DomainError::new(format!(
            "vendorExpiryAction must be one of delete_remote, fail_job, keep_reference (got {vendor_expiry_action})"
        )));
    }
    if download_deadline_seconds.is_some_and(|seconds| seconds <= 0) {
        return Err(DomainError::new(
            "downloadDeadlineSeconds must be positive when set",
        ));
    }
    if scope_id.trim().is_empty() {
        return Err(DomainError::new("scopeId must not be blank"));
    }
    Ok(())
}

/// Validates a vendor TTL upsert payload.
pub fn validate_vendor_asset_ttl(
    vendor_code: &str,
    media_kind: &str,
    ttl_seconds: i32,
    source: &str,
) -> Result<(), DomainError> {
    if vendor_code.trim().is_empty() {
        return Err(DomainError::new("vendorCode must not be blank"));
    }
    let media_kind = GenerationMediaKind::parse(media_kind).ok_or_else(|| {
        DomainError::new(format!(
            "mediaKind must be one of image, video, audio (got {media_kind})"
        ))
    })?;
    if media_kind == GenerationMediaKind::All {
        return Err(DomainError::new(
            "mediaKind must name a concrete media kind for a vendor TTL",
        ));
    }
    if ttl_seconds <= 0 {
        return Err(DomainError::new("ttlSeconds must be positive"));
    }
    if !matches!(source, "default" | "operator" | "upstream") {
        return Err(DomainError::new(format!(
            "source must be one of default, operator, upstream (got {source})"
        )));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn row(
        scope_type: &str,
        scope_id: &str,
        media_kind: &str,
        delivery_mode: &str,
    ) -> GenerationDeliveryPolicyRow {
        GenerationDeliveryPolicyRow {
            scope_type: scope_type.to_owned(),
            scope_id: scope_id.to_owned(),
            media_kind: media_kind.to_owned(),
            delivery_mode: delivery_mode.to_owned(),
            drive_space_id: None,
            drive_folder_node_id: None,
            download_deadline_seconds: None,
            vendor_expiry_action: VENDOR_EXPIRY_ACTION_KEEP_REFERENCE.to_owned(),
            delete_remote_after_download: true,
        }
    }

    fn subject() -> DeliverySubjectScope {
        DeliverySubjectScope {
            tenant_id: 100001,
            organization_id: 7,
            user_id: Some(42),
        }
    }

    #[test]
    fn system_default_keeps_generated_media_remote_to_save_cost() {
        let resolved = resolve_generation_delivery(&[], &subject(), GenerationMediaKind::Video);
        assert_eq!(
            resolved.delivery_mode,
            GenerationDeliveryMode::RemoteOnly,
            "the default must not copy generated media into Drive (cost-saving default)"
        );
        assert_eq!(
            resolved.vendor_expiry_action,
            VendorExpiryAction::KeepReference
        );
        assert!(resolved.delete_remote_after_download);
        assert!(resolved.source_scope.is_none());
    }

    #[test]
    fn a_specific_kind_beats_a_generic_all_even_for_a_lower_scope() {
        let rows = vec![
            row(
                SCOPE_TENANT,
                "100001",
                MEDIA_KIND_VIDEO,
                DELIVERY_MODE_TO_DRIVE,
            ),
            row(SCOPE_USER, "42", MEDIA_KIND_ALL, DELIVERY_MODE_REMOTE_ONLY),
        ];
        let resolved = resolve_generation_delivery(&rows, &subject(), GenerationMediaKind::Video);
        assert_eq!(
            resolved.delivery_mode,
            GenerationDeliveryMode::ToDrive,
            "a tenant video rule must not be silently overridden by a user's generic preference"
        );
        assert_eq!(
            resolved.source_scope,
            Some((GenerationDeliveryScope::Tenant, "100001".to_owned()))
        );
    }

    #[test]
    fn user_beats_organization_and_tenant_at_the_same_specificity() {
        let rows = vec![
            row(
                SCOPE_TENANT,
                "100001",
                MEDIA_KIND_IMAGE,
                DELIVERY_MODE_REMOTE_ONLY,
            ),
            row(
                SCOPE_ORGANIZATION,
                "7",
                MEDIA_KIND_IMAGE,
                DELIVERY_MODE_REMOTE_ONLY,
            ),
            row(SCOPE_USER, "42", MEDIA_KIND_IMAGE, DELIVERY_MODE_TO_DRIVE),
        ];
        let resolved = resolve_generation_delivery(&rows, &subject(), GenerationMediaKind::Image);
        assert_eq!(resolved.delivery_mode, GenerationDeliveryMode::ToDrive);
        assert_eq!(
            resolved.source_scope,
            Some((GenerationDeliveryScope::User, "42".to_owned()))
        );
    }

    #[test]
    fn fields_are_inherited_from_lower_scopes() {
        let mut organization = row(
            SCOPE_ORGANIZATION,
            "7",
            MEDIA_KIND_ALL,
            DELIVERY_MODE_TO_DRIVE,
        );
        organization.drive_space_id = Some("space-org".to_owned());
        organization.drive_folder_node_id = Some("folder-org".to_owned());
        let mut user = row(SCOPE_USER, "42", MEDIA_KIND_ALL, DELIVERY_MODE_REMOTE_ONLY);
        user.delete_remote_after_download = false;

        let resolved = resolve_generation_delivery(
            &[organization, user],
            &subject(),
            GenerationMediaKind::Audio,
        );
        assert_eq!(resolved.delivery_mode, GenerationDeliveryMode::RemoteOnly);
        assert_eq!(resolved.drive_space_id.as_deref(), Some("space-org"));
        assert_eq!(resolved.drive_folder_node_id.as_deref(), Some("folder-org"));
        assert!(!resolved.delete_remote_after_download);
        assert_eq!(resolved.applied_scopes.len(), 2);
    }

    #[test]
    fn rows_of_other_subjects_are_not_applied() {
        let rows = vec![
            row(SCOPE_USER, "43", MEDIA_KIND_ALL, DELIVERY_MODE_TO_DRIVE),
            row(
                SCOPE_ORGANIZATION,
                "8",
                MEDIA_KIND_ALL,
                DELIVERY_MODE_TO_DRIVE,
            ),
            row(
                SCOPE_TENANT,
                "100002",
                MEDIA_KIND_ALL,
                DELIVERY_MODE_TO_DRIVE,
            ),
        ];
        let resolved = resolve_generation_delivery(&rows, &subject(), GenerationMediaKind::Image);
        assert_eq!(resolved.delivery_mode, GenerationDeliveryMode::RemoteOnly);
        assert!(resolved.applied_scopes.is_empty());
    }

    #[test]
    fn vendor_ttl_and_deadline_are_bounded() {
        let rows = vec![
            VendorAssetTtlRow {
                vendor_code: "vidu".to_owned(),
                media_kind: MEDIA_KIND_VIDEO.to_owned(),
                ttl_seconds: 3_600,
            },
            VendorAssetTtlRow {
                vendor_code: "vidu".to_owned(),
                media_kind: MEDIA_KIND_IMAGE.to_owned(),
                ttl_seconds: 600,
            },
        ];
        assert_eq!(
            resolve_vendor_asset_ttl(&rows, "VIDU", GenerationMediaKind::Video),
            Some(3_600)
        );
        assert_eq!(
            resolve_vendor_asset_ttl(&rows, "vidu", GenerationMediaKind::Audio),
            None
        );

        let mut policy = ResolvedGenerationDelivery::default();
        assert_eq!(effective_download_deadline_seconds(&policy, 3_600), 2_880);
        policy.download_deadline_seconds = Some(10_000);
        assert_eq!(
            effective_download_deadline_seconds(&policy, 3_600),
            3_600,
            "the deadline never exceeds the vendor asset lifetime"
        );
        policy.download_deadline_seconds = Some(120);
        assert_eq!(effective_download_deadline_seconds(&policy, 3_600), 120);
    }

    #[test]
    fn invalid_payloads_are_rejected_before_sql() {
        assert!(validate_generation_delivery_policy(
            "user",
            "42",
            "video",
            "to_drive",
            "keep_reference",
            None
        )
        .is_ok());
        assert!(validate_generation_delivery_policy(
            "space",
            "42",
            "video",
            "to_drive",
            "keep_reference",
            None
        )
        .is_err());
        assert!(validate_generation_delivery_policy(
            "user",
            "42",
            "video",
            "stream",
            "keep_reference",
            None
        )
        .is_err());
        assert!(validate_generation_delivery_policy(
            "user",
            "42",
            "video",
            "to_drive",
            "keep_reference",
            Some(0)
        )
        .is_err());
        assert!(validate_vendor_asset_ttl("vidu", "all", 60, "operator").is_err());
        assert!(validate_vendor_asset_ttl("vidu", "video", 0, "operator").is_err());
        assert!(validate_vendor_asset_ttl("vidu", "video", 60, "vendor").is_err());
        assert!(validate_vendor_asset_ttl("vidu", "video", 60, "operator").is_ok());
    }
}
