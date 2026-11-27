//! Data-center read/command port (`/backend/v3/api/datacenter/*`).
//!
//! The admin "数据中心" (Data Center) surface reads a governance plane that the
//! router service itself owns: data sources with write-only credentials,
//! connectivity history, the landed-table and dataset catalogs, governed export
//! jobs, and the access audit trail. External database connections are read-only
//! data sources, so this port never exposes a write path into a foreign database.
//!
//! Every query is scoped by [`DataCenterSubject`]; implementations MUST inject
//! the tenant/organization predicate server-side and MUST NOT return rows from
//! another workspace.

use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

/// Operator scope carried by a data-center request.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DataCenterSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
    /// Resolved display name of the caller, used for the `actor` column of a
    /// new audit or export row. `None` when the principal has no name claim.
    pub operator_name: Option<String>,
}

/// Health of one configured data source, as stored by the last connectivity test.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DataCenterSourceHealth {
    Healthy,
    Warning,
    Error,
    Unknown,
}

impl DataCenterSourceHealth {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Healthy => "healthy",
            Self::Warning => "warning",
            Self::Error => "error",
            Self::Unknown => "unknown",
        }
    }
}

/// One data source row surfaced by the sources list and the overview.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DataCenterSourceItem {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub health: DataCenterSourceHealth,
    pub table_count: i64,
    pub last_tested_at: Option<String>,
}

/// Kind of a governed table.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DataCenterTableKind {
    Landed,
    External,
    View,
}

impl DataCenterTableKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Landed => "landed",
            Self::External => "external",
            Self::View => "view",
        }
    }
}

/// One governed table row surfaced by the tables list.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DataCenterTableItem {
    pub id: String,
    pub name: String,
    pub kind: DataCenterTableKind,
    /// Exact decimal string: a row count can exceed `Number.MAX_SAFE_INTEGER`.
    pub row_count: String,
    pub column_count: i32,
    pub owner: String,
    pub updated_at: String,
}

/// Lifecycle state of a governed export job.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DataCenterExportStatus {
    PendingApproval,
    Running,
    Succeeded,
    Failed,
    Expired,
}

impl DataCenterExportStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::PendingApproval => "pending_approval",
            Self::Running => "running",
            Self::Succeeded => "succeeded",
            Self::Failed => "failed",
            Self::Expired => "expired",
        }
    }
}

/// One governed export job surfaced by the export center list.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DataCenterExportItem {
    pub id: String,
    pub dataset_name: String,
    pub status: DataCenterExportStatus,
    /// Exact decimal string for the same reason as
    /// [`DataCenterTableItem::row_count`].
    pub row_count: String,
    pub requested_by: String,
    pub expires_at: Option<String>,
}

/// Audit action recorded for a data-center operation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DataCenterAuditAction {
    Connect,
    Query,
    Download,
    Ddl,
    Dml,
    Publish,
    Approve,
    Rollback,
}

impl DataCenterAuditAction {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Connect => "connect",
            Self::Query => "query",
            Self::Download => "download",
            Self::Ddl => "ddl",
            Self::Dml => "dml",
            Self::Publish => "publish",
            Self::Approve => "approve",
            Self::Rollback => "rollback",
        }
    }
}

/// Outcome of an audited data-center operation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DataCenterAuditResult {
    Success,
    Failure,
}

impl DataCenterAuditResult {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Success => "success",
            Self::Failure => "failure",
        }
    }
}

/// One data-access audit row surfaced by the audit list.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DataCenterAuditItem {
    pub id: String,
    pub actor: String,
    pub action: DataCenterAuditAction,
    pub object: String,
    /// Exact decimal string for the same reason as
    /// [`DataCenterTableItem::row_count`].
    pub row_count: String,
    pub result: DataCenterAuditResult,
    pub at: String,
}

/// Overview counters rendered by `/admin/data/overview`.
///
/// Every counter is an exact decimal string (`API_SPEC.md` §13.6): a request
/// count is an `int64` and browsers round values past `Number.MAX_SAFE_INTEGER`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DataCenterOverview {
    pub sources: String,
    pub tables: String,
    pub today_instances: String,
    pub pending_exports: String,
    /// Percentage rendered as a decimal string, e.g. `99.20`.
    pub success_rate: String,
}

/// Paged read of the data-center governance plane.
pub type DataCenterReadFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<DataCenterOverview>> + Send + 'a>>;

/// Structural future used by the list reads.
pub type DataCenterListFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<Vec<T>>> + Send + 'a>>;

/// Record one audited data-center operation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DataCenterAuditEntry {
    pub subject: DataCenterSubject,
    pub action: DataCenterAuditAction,
    pub object_type: String,
    pub object_key: String,
    pub row_count: i64,
    pub result: DataCenterAuditResult,
    pub detail: String,
}

impl DataCenterAuditEntry {
    /// A successful audit row for one data action.
    pub fn new(
        subject: DataCenterSubject,
        action: DataCenterAuditAction,
        object_type: impl Into<String>,
        object_key: impl Into<String>,
    ) -> Self {
        Self {
            subject,
            action,
            object_type: object_type.into(),
            object_key: object_key.into(),
            row_count: 0,
            result: DataCenterAuditResult::Success,
            detail: String::new(),
        }
    }

    #[must_use]
    pub fn with_detail(mut self, detail: impl Into<String>) -> Self {
        self.detail = detail.into();
        self
    }

    #[must_use]
    pub fn with_result(mut self, result: DataCenterAuditResult) -> Self {
        self.result = result;
        self
    }
}

pub type DataCenterAuditFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<()>> + Send + 'a>>;

pub trait DataCenterStore {
    fn load_overview(&self, subject: DataCenterSubject) -> DataCenterReadFuture<'_>;

    fn list_sources(
        &self,
        subject: DataCenterSubject,
    ) -> DataCenterListFuture<'_, DataCenterSourceItem>;

    fn list_tables(
        &self,
        subject: DataCenterSubject,
    ) -> DataCenterListFuture<'_, DataCenterTableItem>;

    fn list_exports(
        &self,
        subject: DataCenterSubject,
    ) -> DataCenterListFuture<'_, DataCenterExportItem>;

    fn list_audits(
        &self,
        subject: DataCenterSubject,
    ) -> DataCenterListFuture<'_, DataCenterAuditItem>;

    fn record_audit(&self, entry: DataCenterAuditEntry) -> DataCenterAuditFuture<'_>;
}
