//! Persistence port for the console's user-level model → account-group
//! defaults and the model-group catalog reads.
//!
//! Reads combine the runtime routing catalog (group membership, callable
//! accounts) with the caller's freshly persisted rules, so a saved default is
//! visible on the next page load even before the routing snapshot refresh
//! picks it up for traffic.

use std::future::Future;
use std::pin::Pin;

use crate::domain::{
    AccountGroupRouteScope, DomainResult, ModelGroupCatalogModality, ModelGroupOption,
    SessionAccountGroupModality,
};

pub type AppModelGroupFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

/// Authenticated caller scope of a console model-group request.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AppModelGroupSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
}

/// Catalog read filter: one modality at a time, optionally narrowed to a vendor.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct AppModelGroupCatalogQuery {
    pub modality: Option<SessionAccountGroupModality>,
    pub vendor_code: Option<String>,
}

/// One "set this model/vendor/modality to this ordered group list" command.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SetAppModelGroupDefaultCommand {
    pub scope: AccountGroupRouteScope,
    pub modality: Option<SessionAccountGroupModality>,
    pub vendor_code: String,
    pub model: String,
    /// Group codes or numeric ids, ordered by failover priority. The command
    /// replaces the whole list for the scope; an empty list clears it.
    pub account_groups: Vec<String>,
}

/// One stored rule projected for the console (used by "current defaults").
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppModelGroupDefaultItem {
    pub scope: AccountGroupRouteScope,
    pub modality: String,
    pub vendor_code: String,
    pub model: String,
    pub account_group_id: i64,
    pub account_group_code: String,
    pub account_group_name: String,
    pub priority: i32,
}

pub trait AppModelGroupStore: Send + Sync {
    /// Modality → vendor → model → groups for the caller, with effective
    /// defaults resolved from the caller's persisted rules.
    fn load_model_group_catalog<'a>(
        &'a self,
        subject: AppModelGroupSubject,
        query: AppModelGroupCatalogQuery,
    ) -> AppModelGroupFuture<'a, Vec<ModelGroupCatalogModality>>;

    /// Groups that can serve one model. `None` means the model is unknown to
    /// the catalog (caller maps it to 404).
    fn load_model_groups<'a>(
        &'a self,
        subject: AppModelGroupSubject,
        model: String,
    ) -> AppModelGroupFuture<'a, Option<Vec<ModelGroupOption>>>;

    /// Upserts (or clears, for a blank group) one rule.
    fn set_model_group_default<'a>(
        &'a self,
        subject: AppModelGroupSubject,
        command: SetAppModelGroupDefaultCommand,
    ) -> AppModelGroupFuture<'a, ()>;

    /// Every rule currently stored for the caller (console "reset" preview).
    fn list_model_group_defaults<'a>(
        &'a self,
        subject: AppModelGroupSubject,
    ) -> AppModelGroupFuture<'a, Vec<AppModelGroupDefaultItem>>;
}
