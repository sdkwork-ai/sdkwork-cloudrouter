use std::future::Future;
use std::pin::Pin;

use serde_json::{Map, Value};

use crate::domain::DomainResult;

pub type AdminStorageCommandFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

pub type AdminStorageJsonRecord = Map<String, Value>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminStorageSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminStorageCursor(i64);

impl AdminStorageCursor {
    pub fn new(id: i64) -> Option<Self> {
        (id > 0).then_some(Self(id))
    }

    pub fn id(self) -> i64 {
        self.0
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminStorageRecordsQuery {
    pub subject: AdminStorageSubject,
    pub cursor: Option<AdminStorageCursor>,
    pub limit: i64,
    pub status: Option<String>,
    pub logical_scope: Option<String>,
    pub scope_type: Option<String>,
    pub scope_id: Option<String>,
    pub run_type: Option<String>,
    pub request_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminStorageCollection {
    pub items: Vec<AdminStorageJsonRecord>,
    pub next_cursor: Option<AdminStorageCursor>,
    pub page_size: i64,
    pub request_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SetStorageDefaultBucketCommand {
    pub subject: AdminStorageSubject,
    pub logical_scope: String,
    pub bucket_id: String,
    pub reason: String,
    pub request_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateStorageQuotaPolicyCommand {
    pub subject: AdminStorageSubject,
    pub scope_type: String,
    pub scope_id: String,
    pub quota_limit_bytes: i64,
    pub single_file_limit_bytes: Option<i64>,
    pub enforcement: Option<String>,
    pub idempotency_key: String,
    pub request_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateStorageReconciliationRunCommand {
    pub subject: AdminStorageSubject,
    pub provider_id: Option<String>,
    pub bucket_id: Option<String>,
    pub run_type: String,
    pub dry_run: bool,
    pub reason: Option<String>,
    pub idempotency_key: String,
    pub request_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateStorageGarbageCollectionJobCommand {
    pub subject: AdminStorageSubject,
    pub job_type: String,
    pub target: Option<String>,
    pub dry_run: bool,
    pub retention_window: Option<String>,
    pub dry_run_sample: Option<String>,
    pub criteria: Option<Value>,
    pub idempotency_key: String,
    pub request_id: Option<String>,
}

pub trait AdminStorageStore {
    fn list_default_buckets<'a>(
        &'a self,
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection>;

    fn set_default_bucket<'a>(
        &'a self,
        command: SetStorageDefaultBucketCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord>;

    fn list_quota_policies<'a>(
        &'a self,
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection>;

    fn create_quota_policy<'a>(
        &'a self,
        command: CreateStorageQuotaPolicyCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord>;

    fn list_usage_counters<'a>(
        &'a self,
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection>;

    fn list_reconciliation_runs<'a>(
        &'a self,
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection>;

    fn create_reconciliation_run<'a>(
        &'a self,
        command: CreateStorageReconciliationRunCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord>;

    fn list_gc_jobs<'a>(
        &'a self,
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection>;

    fn create_gc_job<'a>(
        &'a self,
        command: CreateStorageGarbageCollectionJobCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord>;
}
