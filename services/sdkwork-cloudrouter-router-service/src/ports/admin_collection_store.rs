//! AI capability collection port (`/backend/v3/api/ai/collections*`).
//!
//! A collection is an ordered set of AI capabilities an operator groups for a
//! workspace. It is either a `mixed` set that combines skills, MCP servers,
//! agents, and plugins, or a single-kind set (a skills-only collection, an
//! MCP-only collection, an agent-only collection, a plugin-only collection).
//!
//! Ownership: this port owns the collection records (`ai_collection*`). The
//! capability records themselves stay owned by the sibling repositories
//! (`sdkwork-skills`, `sdkwork-mcp`, `sdkwork-agents`, `sdkwork-plugins`); a
//! collection item stores the owning capability key plus a display snapshot,
//! never a cross-schema foreign key.
//!
//! Every query is scoped by [`AdminCollectionSubject`]. Implementations MUST
//! inject the tenant/organization predicate server-side and MUST NOT return a
//! record from another workspace.

use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

/// Operator scope carried by an admin collection request.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminCollectionSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

/// Result wrapper for one collection command.
pub type AdminCollectionFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

/// Outcome of a collection/category delete. `false` means the record was not
/// found in the caller's workspace.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminCollectionDeleteOutcome {
    pub deleted: bool,
}

/// One collection category as stored and rendered by the admin surface.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminCollectionCategoryItem {
    pub id: String,
    pub category_code: String,
    pub name: String,
    pub description: String,
    pub icon_ref: String,
    pub collection_kind: String,
    pub parent_id: Option<String>,
    pub sort_order: i32,
    pub status: String,
    pub is_system: bool,
    /// Exact decimal string (`API_SPEC.md` §13.6): an int64 count the browser
    /// must not round.
    pub collection_count: String,
    pub created_at: String,
    pub updated_at: String,
}

/// One page of collection categories.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminCollectionCategoryListPage {
    pub items: Vec<AdminCollectionCategoryItem>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

/// Category list filters.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminCollectionCategoriesQuery {
    pub subject: AdminCollectionSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub search: Option<String>,
    pub collection_kind: Option<String>,
    pub status: Option<String>,
}

/// Create one category.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminCollectionCategoryCommand {
    pub subject: AdminCollectionSubject,
    pub collection_kind: String,
    pub category_code: String,
    pub name: String,
    pub description: String,
    pub icon_ref: String,
    pub parent_id: Option<String>,
    pub sort_order: i32,
    pub status: String,
}

/// Update one category. `parent_id` is a double option so the caller can
/// distinguish "leave unchanged" (`None`) from "move to root" (`Some(None)`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminCollectionCategoryCommand {
    pub subject: AdminCollectionSubject,
    pub category_id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub icon_ref: Option<String>,
    pub parent_id: Option<Option<String>>,
    pub sort_order: Option<i32>,
    pub status: Option<String>,
}

/// Delete one category.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAdminCollectionCategoryCommand {
    pub subject: AdminCollectionSubject,
    pub category_id: String,
}

/// One capability entry of a collection.
#[derive(Debug, Clone, PartialEq)]
pub struct AdminCollectionItemRecord {
    pub id: String,
    pub collection_id: String,
    pub capability_type: String,
    pub capability_key: String,
    pub capability_name: String,
    pub capability_version: String,
    pub capability_icon_ref: String,
    /// Per-item operator configuration. Always a JSON object.
    pub config: serde_json::Value,
    pub sort_order: i32,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Per-type item counters rendered by the collection list badges.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminCollectionCapabilityCounts {
    pub skill: String,
    pub mcp: String,
    pub agent: String,
    pub plugin: String,
}

/// One collection with its ordered items.
#[derive(Debug, Clone, PartialEq)]
pub struct AdminCollectionRecord {
    pub id: String,
    pub collection_key: String,
    pub name: String,
    pub summary: String,
    pub description: String,
    pub icon_ref: String,
    pub collection_kind: String,
    pub category_id: Option<String>,
    pub category_name: Option<String>,
    pub visibility: String,
    pub publish_status: String,
    pub published_at: Option<String>,
    /// Exact decimal string (`API_SPEC.md` §13.6).
    pub item_count: String,
    pub capability_counts: AdminCollectionCapabilityCounts,
    pub tags: Vec<String>,
    pub featured: bool,
    pub sort_order: i32,
    pub owner_user_id: String,
    pub created_by: String,
    pub updated_by: String,
    pub status: String,
    pub latest_release_no: Option<i32>,
    pub items: Vec<AdminCollectionItemRecord>,
    pub created_at: String,
    pub updated_at: String,
}

/// One page of collections.
#[derive(Debug, Clone, PartialEq)]
pub struct AdminCollectionListPage {
    pub items: Vec<AdminCollectionRecord>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

/// Collection list filters.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminCollectionsQuery {
    pub subject: AdminCollectionSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub search: Option<String>,
    pub collection_kind: Option<String>,
    pub category_id: Option<String>,
    pub publish_status: Option<String>,
    pub status: Option<String>,
    pub featured: Option<bool>,
}

/// One capability entry supplied by the caller when a collection is created or
/// its item list is replaced.
#[derive(Debug, Clone, PartialEq)]
pub struct AdminCollectionItemInput {
    pub capability_type: String,
    pub capability_key: String,
    pub capability_name: String,
    pub capability_version: String,
    pub capability_icon_ref: String,
    pub config: serde_json::Value,
    pub enabled: bool,
    pub sort_order: i32,
}

/// Create one collection, optionally with its first item set.
#[derive(Debug, Clone, PartialEq)]
pub struct CreateAdminCollectionCommand {
    pub subject: AdminCollectionSubject,
    pub collection_key: Option<String>,
    pub name: String,
    pub summary: String,
    pub description: String,
    pub icon_ref: String,
    pub collection_kind: String,
    pub category_id: Option<String>,
    pub visibility: String,
    pub tags: Vec<String>,
    pub featured: bool,
    pub sort_order: i32,
    pub items: Vec<AdminCollectionItemInput>,
}

/// Update collection metadata. `category_id` is a double option so the caller
/// can distinguish "leave unchanged" (`None`) from "unfile" (`Some(None)`).
#[derive(Debug, Clone, PartialEq)]
pub struct UpdateAdminCollectionCommand {
    pub subject: AdminCollectionSubject,
    pub collection_id: String,
    pub name: Option<String>,
    pub summary: Option<String>,
    pub description: Option<String>,
    pub icon_ref: Option<String>,
    pub category_id: Option<Option<String>>,
    pub visibility: Option<String>,
    pub tags: Option<Vec<String>>,
    pub featured: Option<bool>,
    pub sort_order: Option<i32>,
    pub status: Option<String>,
}

/// Delete one collection (soft delete; items and releases stay for history).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAdminCollectionCommand {
    pub subject: AdminCollectionSubject,
    pub collection_id: String,
}

/// Replace the complete ordered item list of one collection.
#[derive(Debug, Clone, PartialEq)]
pub struct ReplaceAdminCollectionItemsCommand {
    pub subject: AdminCollectionSubject,
    pub collection_id: String,
    pub items: Vec<AdminCollectionItemInput>,
}

/// Move a collection through its publish lifecycle. A `published` transition
/// writes an immutable release snapshot; `archived` keeps the last release.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminCollectionStatusCommand {
    pub subject: AdminCollectionSubject,
    pub collection_id: String,
    /// `published` or `archived`.
    pub publish_status: String,
    pub notes: String,
}

/// Read one page of publish releases for a collection.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminCollectionReleasesQuery {
    pub subject: AdminCollectionSubject,
    pub collection_id: String,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
}

/// One immutable publish release.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminCollectionReleaseRecord {
    pub id: String,
    pub release_no: i32,
    pub name: String,
    /// Exact decimal string (`API_SPEC.md` §13.6).
    pub item_count: String,
    pub release_status: String,
    pub notes: String,
    pub published_by: String,
    pub published_at: String,
    pub created_at: String,
}

/// One page of publish releases.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminCollectionReleaseListPage {
    pub items: Vec<AdminCollectionReleaseRecord>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

/// Persistence port of the AI capability collection plane.
pub trait AdminCollectionStore {
    fn list_categories<'a>(
        &'a self,
        query: ListAdminCollectionCategoriesQuery,
    ) -> AdminCollectionFuture<'a, AdminCollectionCategoryListPage>;

    /// Idempotently ensures the built-in category set of the caller's workspace
    /// and returns the resulting page.
    fn initialize_categories<'a>(
        &'a self,
        subject: AdminCollectionSubject,
    ) -> AdminCollectionFuture<'a, AdminCollectionCategoryListPage>;

    fn create_category<'a>(
        &'a self,
        command: CreateAdminCollectionCategoryCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionCategoryItem>;

    fn update_category<'a>(
        &'a self,
        command: UpdateAdminCollectionCategoryCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionCategoryItem>;

    fn delete_category<'a>(
        &'a self,
        command: DeleteAdminCollectionCategoryCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionDeleteOutcome>;

    fn list_collections<'a>(
        &'a self,
        query: ListAdminCollectionsQuery,
    ) -> AdminCollectionFuture<'a, AdminCollectionListPage>;

    fn get_collection<'a>(
        &'a self,
        subject: AdminCollectionSubject,
        collection_id: String,
    ) -> AdminCollectionFuture<'a, AdminCollectionRecord>;

    fn create_collection<'a>(
        &'a self,
        command: CreateAdminCollectionCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionRecord>;

    fn update_collection<'a>(
        &'a self,
        command: UpdateAdminCollectionCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionRecord>;

    fn delete_collection<'a>(
        &'a self,
        command: DeleteAdminCollectionCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionDeleteOutcome>;

    fn replace_collection_items<'a>(
        &'a self,
        command: ReplaceAdminCollectionItemsCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionRecord>;

    fn update_collection_status<'a>(
        &'a self,
        command: UpdateAdminCollectionStatusCommand,
    ) -> AdminCollectionFuture<'a, AdminCollectionRecord>;

    fn list_collection_releases<'a>(
        &'a self,
        query: ListAdminCollectionReleasesQuery,
    ) -> AdminCollectionFuture<'a, AdminCollectionReleaseListPage>;
}
