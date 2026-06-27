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

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminStorageRecordsQuery {
    pub subject: AdminStorageSubject,
    pub cursor: Option<String>,
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
    pub next_cursor: Option<String>,
    pub request_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateStorageProviderCommand {
    pub subject: AdminStorageSubject,
    pub provider_code: String,
    pub provider_type: String,
    pub endpoint_url: Option<String>,
    pub region: Option<String>,
    pub credential_ref: String,
    pub path_style_enabled: Option<bool>,
    pub supports_multipart: Option<bool>,
    pub supports_lifecycle: Option<bool>,
    pub supports_object_lock: Option<bool>,
    pub idempotency_key: String,
    pub request_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateStorageProviderCommand {
    pub subject: AdminStorageSubject,
    pub provider_id: String,
    pub status: String,
    pub reason: String,
    pub request_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CheckStorageProviderHealthCommand {
    pub subject: AdminStorageSubject,
    pub provider_id: String,
    pub request_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateStorageBucketCommand {
    pub subject: AdminStorageSubject,
    pub bucket_name: String,
    pub provider_id: String,
    pub logical_scope: String,
    pub bucket_region: Option<String>,
    pub data_residency_region: Option<String>,
    pub object_key_prefix: Option<String>,
    pub default_storage_class: Option<String>,
    pub default_encryption_mode: Option<String>,
    pub kms_key_ref: Option<String>,
    pub versioning_enabled: Option<bool>,
    pub object_lock_enabled: Option<bool>,
    pub lifecycle_enabled: Option<bool>,
    pub public_access_blocked: Option<bool>,
    pub idempotency_key: String,
    pub request_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateStorageBucketCommand {
    pub subject: AdminStorageSubject,
    pub bucket_id: String,
    pub status: String,
    pub reason: String,
    pub request_id: Option<String>,
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
    fn list_providers<'a>(
        &'a self,
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection>;

    fn create_provider<'a>(
        &'a self,
        command: CreateStorageProviderCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord>;

    fn update_provider<'a>(
        &'a self,
        command: UpdateStorageProviderCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord>;

    fn check_provider_health<'a>(
        &'a self,
        command: CheckStorageProviderHealthCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord>;

    fn list_buckets<'a>(
        &'a self,
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection>;

    fn create_bucket<'a>(
        &'a self,
        command: CreateStorageBucketCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord>;

    fn update_bucket<'a>(
        &'a self,
        command: UpdateStorageBucketCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord>;

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

    fn list_usage_ledger<'a>(
        &'a self,
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection>;

    fn list_usage_snapshots<'a>(
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
