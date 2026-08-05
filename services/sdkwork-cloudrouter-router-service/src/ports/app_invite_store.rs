use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

pub type AppInviteCommandFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

/// Tenant/user scope for app-api invite stores that persist BIGINT subject columns.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AppInviteSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
}

/// Public registration/login invite-code policy resolved from the auth settings snapshot.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AppInvitePolicy {
    pub register_required: bool,
    pub login_required: bool,
}

/// Owner resolved for a validated invite code.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AppInviteCodeOwner {
    pub user_id: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ValidateAppInviteCodeQuery {
    pub invite_code: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IssueAppInviteCodeCommand {
    pub subject: AppInviteSubject,
    pub invite_code: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppInviteCodeItem {
    pub invite_code: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ClaimAppInviteRelationCommand {
    pub subject: AppInviteSubject,
    pub inviter_user_id: i64,
    pub invite_code: String,
    pub source: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppInviteRelationClaimed {
    pub relation_id: i64,
    pub reward_status: String,
}

pub trait AppInviteStore {
    /// Resolve the owner of an active invite code for the given tenant scope.
    fn validate_invite_code<'a>(
        &'a self,
        query: ValidateAppInviteCodeQuery,
    ) -> AppInviteCommandFuture<'a, Option<AppInviteCodeOwner>>;

    /// Lazily create the current user's personal invite code; returns the existing code when present.
    fn issue_invite_code<'a>(
        &'a self,
        command: IssueAppInviteCodeCommand,
    ) -> AppInviteCommandFuture<'a, AppInviteCodeItem>;

    /// Bind the invitee (subject) to the inviter; conflicts when the invitee is already bound.
    fn claim_invite_relation<'a>(
        &'a self,
        command: ClaimAppInviteRelationCommand,
    ) -> AppInviteCommandFuture<'a, AppInviteRelationClaimed>;
}
