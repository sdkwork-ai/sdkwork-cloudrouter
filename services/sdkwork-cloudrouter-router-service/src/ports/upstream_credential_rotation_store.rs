//! Upstream account credential rotation store.
//!
//! `ai_upstream_account` and `ai_upstream_account_credential` carry rotation
//! metadata (`next_rotate_at`, `credential_rotation_policy`, `credential_version`,
//! `expires_at`) that no production code previously consumed. The rotation
//! worker reads accounts that are due for rotation and promotes a pre-provisioned
//! candidate credential (a newer credential_version row) to active, or
//! deactivates expired credentials. The worker never invents secret material —
//! new keys must be provisioned through the backend credential API; rotation is
//! the mechanical promotion/scheduling/alerting layer.

use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CredentialRotationSweepCommand {
    /// 0 selects every tenant (platform scope, requires explicit opt-in).
    pub tenant_id: i64,
    pub organization_id: i64,
    pub limit: i64,
    /// ISO-8601 UTC instant.
    pub now: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CredentialRotationAccount {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub account_id: i64,
    pub supplier_code: String,
    pub account_code: String,
    /// Raw `credential_rotation_policy` JSONB text, if set.
    pub credential_rotation_policy: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TryRotateCredentialCommand {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub account_id: i64,
    /// ISO-8601 UTC instant.
    pub now: String,
    /// Days until the next rotation after a successful promotion.
    pub rotation_interval_days: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CredentialRotationAction {
    /// A pre-provisioned candidate credential was promoted to active and the
    /// next rotation was scheduled.
    Rotated {
        tenant_id: i64,
        organization_id: i64,
        account_id: i64,
        promoted_credential_id: i64,
        previous_credential_id: Option<i64>,
        next_rotate_at: String,
    },
    /// The active credential expired and was deactivated; no candidate was
    /// available, so the account stays rotation-due.
    ExpiredDeactivated {
        tenant_id: i64,
        organization_id: i64,
        account_id: i64,
        deactivated_credential_id: i64,
    },
    /// Rotation is due but the active credential is still valid and no
    /// candidate has been provisioned.
    Overdue {
        tenant_id: i64,
        organization_id: i64,
        account_id: i64,
    },
    /// Nothing changed (account missing or another node rotated it first).
    Noop {
        tenant_id: i64,
        organization_id: i64,
        account_id: i64,
    },
}

impl CredentialRotationAction {
    pub fn account_key(&self) -> (i64, i64, i64) {
        match self {
            Self::Rotated {
                tenant_id,
                organization_id,
                account_id,
                ..
            }
            | Self::ExpiredDeactivated {
                tenant_id,
                organization_id,
                account_id,
                ..
            }
            | Self::Overdue {
                tenant_id,
                organization_id,
                account_id,
            }
            | Self::Noop {
                tenant_id,
                organization_id,
                account_id,
            } => (*tenant_id, *organization_id, *account_id),
        }
    }
}

pub type UpstreamCredentialRotationStoreFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

pub trait UpstreamCredentialRotationStore: Send + Sync {
    fn list_accounts_due_for_rotation(
        &self,
        command: CredentialRotationSweepCommand,
    ) -> UpstreamCredentialRotationStoreFuture<'_, Vec<CredentialRotationAccount>>;

    fn try_rotate_account(
        &self,
        command: TryRotateCredentialCommand,
    ) -> UpstreamCredentialRotationStoreFuture<'_, CredentialRotationAction>;
}
