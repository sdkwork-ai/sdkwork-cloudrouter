use sqlx::{PgPool, Row};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::model_catalog_import::stable_uuid;
use crate::infrastructure::sql::runtime_id::next_cloud_runtime_id;
use crate::infrastructure::sql::sql_admin_storage::{
    job_status_label_sql, resource_status_label_sql, STORAGE_AUDIT_TARGET_DEFAULT_BUCKET,
    STORAGE_AUDIT_TARGET_GC_JOB, STORAGE_AUDIT_TARGET_QUOTA_POLICY,
    STORAGE_AUDIT_TARGET_RECONCILIATION_RUN,
};
use crate::ports::{
    AdminStorageCollection, AdminStorageCommandFuture, AdminStorageCursor, AdminStorageJsonRecord,
    AdminStorageStore, CreateStorageGarbageCollectionJobCommand, CreateStorageQuotaPolicyCommand,
    CreateStorageReconciliationRunCommand, ListAdminStorageRecordsQuery,
    SetStorageDefaultBucketCommand,
};

#[derive(Debug, Clone)]
pub struct PostgresAdminStorageStore {
    pool: PgPool,
}

impl PostgresAdminStorageStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminStorageStore for PostgresAdminStorageStore {
    fn list_default_buckets<'a>(
        &'a self,
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        Box::pin(async move { list_default_buckets(&self.pool, query).await })
    }

    fn set_default_bucket<'a>(
        &'a self,
        command: SetStorageDefaultBucketCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord> {
        Box::pin(async move { set_default_bucket(&self.pool, command).await })
    }

    fn list_quota_policies<'a>(
        &'a self,
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        Box::pin(async move { list_quota_policies(&self.pool, query).await })
    }

    fn create_quota_policy<'a>(
        &'a self,
        command: CreateStorageQuotaPolicyCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord> {
        Box::pin(async move { create_quota_policy(&self.pool, command).await })
    }

    fn list_usage_counters<'a>(
        &'a self,
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        Box::pin(async move { list_usage_counters(&self.pool, query).await })
    }

    fn list_reconciliation_runs<'a>(
        &'a self,
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        Box::pin(async move { list_reconciliation_runs(&self.pool, query).await })
    }

    fn create_reconciliation_run<'a>(
        &'a self,
        command: CreateStorageReconciliationRunCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord> {
        Box::pin(async move { create_reconciliation_run(&self.pool, command).await })
    }

    fn list_gc_jobs<'a>(
        &'a self,
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        Box::pin(async move { list_gc_jobs(&self.pool, query).await })
    }

    fn create_gc_job<'a>(
        &'a self,
        command: CreateStorageGarbageCollectionJobCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord> {
        Box::pin(async move { create_gc_job(&self.pool, command).await })
    }
}

async fn list_default_buckets(
    pool: &PgPool,
    query: ListAdminStorageRecordsQuery,
) -> DomainResult<AdminStorageCollection> {
    let status_label = resource_status_label_sql("d.status");
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"
        SELECT
            CAST(d.id AS TEXT) AS id,
            d.logical_scope AS "logicalScope",
            CAST(d.bucket_id AS TEXT) AS "bucketId",
            b.bucket_name AS "bucketName",
            CAST(b.provider_id AS TEXT) AS "providerId",
            p.supplier_code AS "providerCode",
            p.provider_type AS "providerType",
            COALESCE(b.bucket_region, p.region, '') AS region,
            COALESCE(d.reason, '') AS reason,
            {status_label} AS status,
            CAST(d.updated_at AS TEXT) AS "updatedAt"
        FROM storage_default_bucket_policy d
        JOIN object_bucket b
          ON b.tenant_id = d.tenant_id
         AND b.organization_id = d.organization_id
         AND b.id = d.bucket_id
        JOIN object_provider p
          ON p.tenant_id = b.tenant_id
         AND p.organization_id = b.organization_id
         AND p.id = b.provider_id
        WHERE d.tenant_id = $1
          AND d.organization_id = $2
          AND ($3::text IS NULL OR {status_label} = $3)
          AND ($4::text IS NULL OR d.logical_scope = $4)
          AND ($5::bigint IS NULL OR d.id < $5)
        ORDER BY d.id DESC
        LIMIT $6
        "#
    )))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.logical_scope.as_deref())
    .bind(query.cursor.map(AdminStorageCursor::id))
    .bind(query.limit + 1)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;
    collection_from_rows(rows, query, DEFAULT_BUCKET_FIELDS)
}

async fn set_default_bucket(
    pool: &PgPool,
    command: SetStorageDefaultBucketCommand,
) -> DomainResult<AdminStorageJsonRecord> {
    let bucket_id = parse_required_id(&command.bucket_id, "bucketId")?;
    let bucket_logical_scope = load_bucket_logical_scope(pool, command.subject, bucket_id).await?;
    if bucket_logical_scope != command.logical_scope {
        return Err(DomainError::conflict(format!(
            "storage bucket logical scope {bucket_logical_scope} does not match {}",
            command.logical_scope
        )));
    }
    let id: i64 = sqlx::query_scalar(
        r#"
        INSERT INTO storage_default_bucket_policy
            (uuid, tenant_id, organization_id, logical_scope, bucket_id, bucket_logical_scope,
             updated_by, reason, request_id, id)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT(tenant_id, organization_id, logical_scope) DO UPDATE SET
            bucket_id = excluded.bucket_id,
            bucket_logical_scope = excluded.bucket_logical_scope,
            updated_by = excluded.updated_by,
            reason = excluded.reason,
            request_id = excluded.request_id,
            status = 'active',
            updated_at = now()
        RETURNING id
        "#,
    )
    .bind(stable_uuid(
        "storage-default-bucket",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &command.logical_scope,
        ],
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.logical_scope)
    .bind(bucket_id)
    .bind(&bucket_logical_scope)
    .bind(command.subject.operator_id)
    .bind(&command.reason)
    .bind(command.request_id.as_deref())
    .bind(next_cloud_runtime_id("storage_default_bucket_policy")?)
    .fetch_one(pool)
    .await
    .map_err(|error| write_error("failed to set storage default bucket", error))?;
    insert_audit_if_absent(
        pool,
        command.subject,
        request_id_or(
            &command.request_id,
            &format!("default-bucket-{}", command.logical_scope),
        ),
        "storage.default_bucket.update",
        STORAGE_AUDIT_TARGET_DEFAULT_BUCKET,
        id,
        None,
    )
    .await?;
    load_default_bucket(pool, command.subject, id).await
}

async fn list_quota_policies(
    pool: &PgPool,
    query: ListAdminStorageRecordsQuery,
) -> DomainResult<AdminStorageCollection> {
    let status_label = resource_status_label_sql("q.status");
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"
        SELECT
            CAST(q.id AS TEXT) AS id,
            q.scope_type AS "scopeType",
            q.scope_id AS "scopeId",
            CAST(q.quota_limit_bytes AS TEXT) AS "quotaLimitBytes",
            CAST(COALESCE(u.used_logical_bytes, 0) AS TEXT) AS "usedBytes",
            CAST(COALESCE(q.single_file_limit_bytes, 0) AS TEXT) AS "singleFileLimitBytes",
            COALESCE(q.enforcement, '') AS enforcement,
            {status_label} AS status,
            CAST(q.created_at AS TEXT) AS "createdAt",
            CAST(q.updated_at AS TEXT) AS "updatedAt"
        FROM storage_quota_policy q
        LEFT JOIN storage_usage_counter u
          ON u.tenant_id = q.tenant_id
         AND u.organization_id = q.organization_id
         AND u.scope_type = q.scope_type
         AND u.scope_id = q.scope_id
        WHERE q.tenant_id = $1
          AND q.organization_id = $2
          AND ($3::text IS NULL OR {status_label} = $3)
          AND ($4::text IS NULL OR q.scope_type = $4)
          AND ($5::text IS NULL OR q.scope_id = $5)
          AND ($6::bigint IS NULL OR q.id < $6)
        ORDER BY q.id DESC
        LIMIT $7
        "#
    )))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.scope_type.as_deref())
    .bind(query.scope_id.as_deref())
    .bind(query.cursor.map(AdminStorageCursor::id))
    .bind(query.limit + 1)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;
    collection_from_rows(rows, query, QUOTA_FIELDS)
}

async fn create_quota_policy(
    pool: &PgPool,
    command: CreateStorageQuotaPolicyCommand,
) -> DomainResult<AdminStorageJsonRecord> {
    if let Some(id) = existing_idempotent_id(
        pool,
        "storage_quota_policy",
        command.subject.tenant_id,
        command.subject.organization_id,
        &command.idempotency_key,
    )
    .await?
    {
        return load_quota_policy(pool, command.subject, id).await;
    }
    let id: i64 = sqlx::query_scalar(
        r#"
        INSERT INTO storage_quota_policy
            (uuid, tenant_id, organization_id, scope_type, scope_id, quota_limit_bytes,
             single_file_limit_bytes, enforcement, idempotency_key, request_id, id)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
        "#,
    )
    .bind(stable_uuid(
        "storage-quota-policy",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &command.scope_type,
            &command.scope_id,
            &command.idempotency_key,
        ],
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.scope_type)
    .bind(&command.scope_id)
    .bind(command.quota_limit_bytes)
    .bind(command.single_file_limit_bytes)
    .bind(command.enforcement.as_deref())
    .bind(&command.idempotency_key)
    .bind(command.request_id.as_deref())
    .bind(next_cloud_runtime_id("storage_quota_policy")?)
    .fetch_one(pool)
    .await
    .map_err(|error| write_error("failed to create storage quota policy", error))?;
    insert_audit_if_absent(
        pool,
        command.subject,
        command
            .request_id
            .as_deref()
            .unwrap_or(&command.idempotency_key),
        "storage.quota.create",
        STORAGE_AUDIT_TARGET_QUOTA_POLICY,
        id,
        None,
    )
    .await?;
    load_quota_policy(pool, command.subject, id).await
}

async fn list_usage_counters(
    pool: &PgPool,
    query: ListAdminStorageRecordsQuery,
) -> DomainResult<AdminStorageCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            CAST(id AS TEXT) AS id,
            scope_type AS "scopeType",
            scope_id AS "scopeId",
            scope_type || ':' || scope_id AS scope,
            CAST(used_logical_bytes AS TEXT) AS "usedBytes",
            CAST(COALESCE(reserved_bytes, 0) AS TEXT) AS "reservedBytes",
            CAST(file_count AS TEXT) AS "fileCount",
            CAST(updated_at AS TEXT) AS "snapshotAt"
        FROM storage_usage_counter
        WHERE tenant_id = $1
          AND organization_id = $2
          AND ($3::text IS NULL OR scope_type = $3)
          AND ($4::text IS NULL OR scope_id = $4)
          AND ($5::bigint IS NULL OR id < $5)
        ORDER BY id DESC
        LIMIT $6
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.scope_type.as_deref())
    .bind(query.scope_id.as_deref())
    .bind(query.cursor.map(AdminStorageCursor::id))
    .bind(query.limit + 1)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;
    collection_from_rows(rows, query, USAGE_FIELDS)
}

async fn list_reconciliation_runs(
    pool: &PgPool,
    query: ListAdminStorageRecordsQuery,
) -> DomainResult<AdminStorageCollection> {
    let status_label = job_status_label_sql("r.status");
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"
        SELECT
            CAST(r.id AS TEXT) AS id,
            CAST(r.id AS TEXT) AS "runId",
            CAST(COALESCE(r.provider_id, 0) AS TEXT) AS "providerId",
            COALESCE(p.supplier_code, '') AS "providerCode",
            CAST(COALESCE(r.bucket_id, 0) AS TEXT) AS "bucketId",
            COALESCE(b.bucket_name, '') AS "bucketName",
            r.run_type AS "runType",
            COALESCE(p.supplier_code, '') || '/' || COALESCE(b.bucket_name, '') AS scope,
            CAST(COALESCE(r.missing_object_count, 0) + COALESCE(r.orphan_object_count, 0) + COALESCE(r.checksum_mismatch_count, 0) AS TEXT) AS issues,
            CAST(COALESCE(r.missing_object_count, 0) + COALESCE(r.orphan_object_count, 0) + COALESCE(r.checksum_mismatch_count, 0) AS TEXT) AS "issueCount",
            COALESCE(r.dry_run, true) AS "dryRun",
            {status_label} AS status,
            CAST(r.started_at AS TEXT) AS "startedAt",
            CAST(COALESCE(r.completed_at::text, '') AS TEXT) AS "completedAt"
        FROM storage_reconciliation_run r
        LEFT JOIN object_provider p
          ON p.tenant_id = r.tenant_id
         AND p.organization_id = r.organization_id
         AND p.id = r.provider_id
        LEFT JOIN object_bucket b
          ON b.tenant_id = r.tenant_id
         AND b.organization_id = r.organization_id
         AND b.id = r.bucket_id
        WHERE r.tenant_id = $1
          AND r.organization_id = $2
          AND ($3::text IS NULL OR {status_label} = $3)
          AND ($4::text IS NULL OR r.run_type = $4)
          AND ($5::bigint IS NULL OR r.id < $5)
        ORDER BY r.id DESC
        LIMIT $6
        "#
    )))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.run_type.as_deref())
    .bind(query.cursor.map(AdminStorageCursor::id))
    .bind(query.limit + 1)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;
    collection_from_rows(rows, query, RECONCILIATION_FIELDS)
}

async fn create_reconciliation_run(
    pool: &PgPool,
    command: CreateStorageReconciliationRunCommand,
) -> DomainResult<AdminStorageJsonRecord> {
    if let Some(id) = existing_idempotent_id(
        pool,
        "storage_reconciliation_run",
        command.subject.tenant_id,
        command.subject.organization_id,
        &command.idempotency_key,
    )
    .await?
    {
        return load_reconciliation_run(pool, command.subject, id).await;
    }

    let provider_id = optional_parsed_id(command.provider_id.as_deref(), "providerId")?;
    let bucket_id = optional_parsed_id(command.bucket_id.as_deref(), "bucketId")?;
    if let Some(provider_id) = provider_id {
        ensure_provider_exists(pool, command.subject, provider_id).await?;
    }
    if let Some(bucket_id) = bucket_id {
        ensure_bucket_exists(pool, command.subject, bucket_id).await?;
    }
    let id: i64 = sqlx::query_scalar(
        r#"
        INSERT INTO storage_reconciliation_run
            (uuid, tenant_id, organization_id, provider_id, bucket_id, run_type, dry_run,
             requested_by, idempotency_key, request_id, summary_json, id)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)
        RETURNING id
        "#,
    )
    .bind(stable_uuid(
        "storage-reconciliation",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &command.run_type,
            &command.idempotency_key,
        ],
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(provider_id)
    .bind(bucket_id)
    .bind(&command.run_type)
    .bind(command.dry_run)
    .bind(command.subject.operator_id)
    .bind(&command.idempotency_key)
    .bind(command.request_id.as_deref())
    .bind(json_text(&serde_json::json!({ "reason": command.reason })))
    .bind(next_cloud_runtime_id("storage_reconciliation_run")?)
    .fetch_one(pool)
    .await
    .map_err(|error| write_error("failed to create storage reconciliation run", error))?;
    insert_audit_if_absent(
        pool,
        command.subject,
        command
            .request_id
            .as_deref()
            .unwrap_or(&command.idempotency_key),
        "storage.reconciliation.create",
        STORAGE_AUDIT_TARGET_RECONCILIATION_RUN,
        id,
        None,
    )
    .await?;
    load_reconciliation_run(pool, command.subject, id).await
}

async fn list_gc_jobs(
    pool: &PgPool,
    query: ListAdminStorageRecordsQuery,
) -> DomainResult<AdminStorageCollection> {
    let status_label = job_status_label_sql("g.status");
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"
        SELECT
            CAST(g.id AS TEXT) AS id,
            CAST(g.id AS TEXT) AS "jobId",
            g.job_type AS "jobType",
            CAST(COALESCE(g.criteria_json::text, '') AS TEXT) AS "criteriaJson",
            CAST(g.candidate_count AS TEXT) AS "candidateCount",
            {status_label} AS status,
            COALESCE(g.dry_run, true) AS "dryRun",
            CAST(g.created_at AS TEXT) AS "createdAt",
            CAST(COALESCE(g.completed_at::text, '') AS TEXT) AS "completedAt"
        FROM storage_gc_job g
        WHERE g.tenant_id = $1
          AND g.organization_id = $2
          AND ($3::text IS NULL OR {status_label} = $3)
          AND ($4::bigint IS NULL OR g.id < $4)
        ORDER BY g.id DESC
        LIMIT $5
        "#
    )))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.cursor.map(AdminStorageCursor::id))
    .bind(query.limit + 1)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;
    collection_from_rows(rows, query, GC_FIELDS)
}

async fn create_gc_job(
    pool: &PgPool,
    command: CreateStorageGarbageCollectionJobCommand,
) -> DomainResult<AdminStorageJsonRecord> {
    if let Some(id) = existing_idempotent_id(
        pool,
        "storage_gc_job",
        command.subject.tenant_id,
        command.subject.organization_id,
        &command.idempotency_key,
    )
    .await?
    {
        return load_gc_job(pool, command.subject, id).await;
    }

    let criteria_json = json_text(&serde_json::json!({
        "target": command.target,
        "retentionWindow": command.retention_window,
        "dryRunSample": command.dry_run_sample,
        "criteria": command.criteria,
    }));
    let id: i64 = sqlx::query_scalar(
        r#"
        INSERT INTO storage_gc_job
            (uuid, tenant_id, organization_id, job_type, dry_run, requested_by,
             idempotency_key, request_id, criteria_json, result_json, id)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, '{}'::jsonb, $10)
        RETURNING id
        "#,
    )
    .bind(stable_uuid(
        "storage-gc-job",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &command.job_type,
            &command.idempotency_key,
        ],
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.job_type)
    .bind(command.dry_run)
    .bind(command.subject.operator_id)
    .bind(&command.idempotency_key)
    .bind(command.request_id.as_deref())
    .bind(&criteria_json)
    .bind(next_cloud_runtime_id("storage_gc_job")?)
    .fetch_one(pool)
    .await
    .map_err(|error| write_error("failed to create storage garbage collection job", error))?;
    insert_audit_if_absent(
        pool,
        command.subject,
        command
            .request_id
            .as_deref()
            .unwrap_or(&command.idempotency_key),
        "storage.gc.create",
        STORAGE_AUDIT_TARGET_GC_JOB,
        id,
        None,
    )
    .await?;
    load_gc_job(pool, command.subject, id).await
}

async fn load_default_bucket(
    pool: &PgPool,
    subject: crate::ports::AdminStorageSubject,
    id: i64,
) -> DomainResult<AdminStorageJsonRecord> {
    let query = load_query(subject, id)?;
    let collection = list_default_buckets(pool, query).await?;
    find_loaded_record(collection, id, "storage default bucket was not found")
}

async fn load_quota_policy(
    pool: &PgPool,
    subject: crate::ports::AdminStorageSubject,
    id: i64,
) -> DomainResult<AdminStorageJsonRecord> {
    let query = load_query(subject, id)?;
    let collection = list_quota_policies(pool, query).await?;
    find_loaded_record(collection, id, "storage quota policy was not found")
}

async fn load_reconciliation_run(
    pool: &PgPool,
    subject: crate::ports::AdminStorageSubject,
    id: i64,
) -> DomainResult<AdminStorageJsonRecord> {
    let query = load_query(subject, id)?;
    let collection = list_reconciliation_runs(pool, query).await?;
    find_loaded_record(collection, id, "storage reconciliation run was not found")
}

async fn load_gc_job(
    pool: &PgPool,
    subject: crate::ports::AdminStorageSubject,
    id: i64,
) -> DomainResult<AdminStorageJsonRecord> {
    let query = load_query(subject, id)?;
    let collection = list_gc_jobs(pool, query).await?;
    find_loaded_record(collection, id, "storage gc job was not found")
}

fn find_loaded_record(
    collection: AdminStorageCollection,
    id: i64,
    message: &str,
) -> DomainResult<AdminStorageJsonRecord> {
    collection
        .items
        .into_iter()
        .find(|item| item.get("id").and_then(serde_json::Value::as_str) == Some(&id.to_string()))
        .ok_or_else(|| DomainError::not_found(message))
}

async fn existing_idempotent_id(
    pool: &PgPool,
    table: &'static str,
    tenant_id: i64,
    organization_id: i64,
    idempotency_key: &str,
) -> DomainResult<Option<i64>> {
    sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        r#"
        SELECT id
        FROM {table}
        WHERE tenant_id = $1
          AND organization_id = $2
          AND idempotency_key = $3
        LIMIT 1
        "#
    )))
    .bind(tenant_id)
    .bind(organization_id)
    .bind(idempotency_key)
    .fetch_optional(pool)
    .await
    .map_err(store_error)
}

async fn insert_audit_if_absent(
    pool: &PgPool,
    subject: crate::ports::AdminStorageSubject,
    request_id: &str,
    action: &str,
    target_type: i32,
    target_id: i64,
    target_uuid: Option<&str>,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (uuid, tenant_id, organization_id, request_id, operator_id, operator_type,
             action, target_type, target_id, target_uuid, created_at, id)
        SELECT
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), $11
        WHERE NOT EXISTS (
            SELECT 1::bigint
            FROM ops_audit_log
            WHERE tenant_id = $12
              AND organization_id = $13
              AND request_id = $14
              AND action = $15
        )
        "#,
    )
    .bind(stable_uuid(
        "storage-audit",
        &[
            &subject.tenant_id.to_string(),
            &subject.organization_id.to_string(),
            request_id,
            action,
        ],
    ))
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(request_id)
    .bind(subject.operator_id)
    .bind(subject.operator_type)
    .bind(action)
    .bind(target_type)
    .bind(target_id)
    .bind(target_uuid)
    .bind(next_cloud_runtime_id("ops_audit_log")?)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(request_id)
    .bind(action)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to write storage audit log", error))?;
    Ok(())
}

fn list_query(subject: crate::ports::AdminStorageSubject) -> ListAdminStorageRecordsQuery {
    ListAdminStorageRecordsQuery {
        subject,
        cursor: None,
        limit: 1,
        status: None,
        logical_scope: None,
        scope_type: None,
        scope_id: None,
        run_type: None,
        request_id: "storage-load".to_owned(),
    }
}

fn load_query(
    subject: crate::ports::AdminStorageSubject,
    id: i64,
) -> DomainResult<ListAdminStorageRecordsQuery> {
    let cursor_id = id
        .checked_add(1)
        .and_then(AdminStorageCursor::new)
        .ok_or_else(|| DomainError::new("storage record id cannot be paginated"))?;
    let mut query = list_query(subject);
    query.cursor = Some(cursor_id);
    Ok(query)
}

fn collection_from_rows(
    rows: Vec<sqlx::postgres::PgRow>,
    query: ListAdminStorageRecordsQuery,
    fields: &[Field],
) -> DomainResult<AdminStorageCollection> {
    let (rows, next_cursor) = keyset_window(rows, query.limit, |row| {
        let id = parse_required_id(&string_cell(row, "id")?, "cursor")?;
        AdminStorageCursor::new(id)
            .ok_or_else(|| DomainError::new("storage cursor id must be positive"))
    })?;
    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        items.push(row_to_record(&row, fields)?);
    }
    Ok(AdminStorageCollection {
        items,
        next_cursor,
        page_size: query.limit,
        request_id: query.request_id,
    })
}

fn keyset_window<T, F>(
    mut rows: Vec<T>,
    page_size: i64,
    cursor_for: F,
) -> DomainResult<(Vec<T>, Option<AdminStorageCursor>)>
where
    F: Fn(&T) -> DomainResult<AdminStorageCursor>,
{
    let page_size = usize::try_from(page_size)
        .ok()
        .filter(|page_size| *page_size > 0)
        .ok_or_else(|| DomainError::new("storage page size must be positive"))?;
    let has_more = rows.len() > page_size;
    rows.truncate(page_size);
    let next_cursor = if has_more {
        Some(cursor_for(rows.last().ok_or_else(|| {
            DomainError::new("storage cursor row is unavailable")
        })?)?)
    } else {
        None
    };
    Ok((rows, next_cursor))
}

fn row_to_record(
    row: &sqlx::postgres::PgRow,
    fields: &[Field],
) -> DomainResult<AdminStorageJsonRecord> {
    let mut record = AdminStorageJsonRecord::new();
    for field in fields {
        match *field {
            Field::String(name) => {
                record.insert(
                    name.to_owned(),
                    serde_json::Value::String(string_cell(row, name)?),
                );
            }
            Field::Bool(name) => {
                record.insert(
                    name.to_owned(),
                    serde_json::Value::Bool(bool_cell(row, name)?),
                );
            }
            Field::GcComputed => add_gc_computed_fields(row, &mut record)?,
        }
    }
    Ok(record)
}

fn add_gc_computed_fields(
    row: &sqlx::postgres::PgRow,
    record: &mut AdminStorageJsonRecord,
) -> DomainResult<()> {
    let criteria = json_cell(row, "criteriaJson")?;
    record.insert(
        "target".to_owned(),
        serde_json::Value::String(json_string(&criteria, "target").unwrap_or_default()),
    );
    record.insert(
        "retention".to_owned(),
        serde_json::Value::String(json_string(&criteria, "retentionWindow").unwrap_or_default()),
    );
    Ok(())
}

fn json_string(value: &serde_json::Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(serde_json::Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .map(ToOwned::to_owned)
}

fn parse_required_id(value: &str, field_name: &str) -> DomainResult<i64> {
    let parsed = value
        .trim()
        .parse::<i64>()
        .map_err(|error| DomainError::new(format!("invalid storage {field_name}: {error}")))?;
    if parsed <= 0 {
        return Err(DomainError::new(format!(
            "invalid storage {field_name}: value must be positive"
        )));
    }
    Ok(parsed)
}

fn optional_parsed_id(value: Option<&str>, field_name: &str) -> DomainResult<Option<i64>> {
    value
        .map(|value| parse_required_id(value, field_name))
        .transpose()
}

fn request_id_or<'a>(request_id: &'a Option<String>, fallback: &'a str) -> &'a str {
    request_id.as_deref().unwrap_or(fallback)
}

fn json_text(value: &serde_json::Value) -> String {
    serde_json::to_string(value).unwrap_or_else(|_| "{}".to_owned())
}

fn json_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<serde_json::Value> {
    let raw = string_cell(row, column)?;
    if raw.trim().is_empty() {
        return Ok(serde_json::json!({}));
    }
    serde_json::from_str(&raw)
        .map_err(|error| DomainError::new(format!("invalid storage json {column}: {error}")))
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<String> {
    if let Ok(value) = row.try_get::<Option<String>, _>(column) {
        return Ok(value.unwrap_or_default());
    }
    if let Ok(value) = row.try_get::<String, _>(column) {
        return Ok(value);
    }
    if let Ok(value) = row.try_get::<Option<i64>, _>(column) {
        return Ok(value.map(|value| value.to_string()).unwrap_or_default());
    }
    if let Ok(value) = row.try_get::<i64, _>(column) {
        return Ok(value.to_string());
    }
    if let Ok(value) = row.try_get::<Option<i32>, _>(column) {
        return Ok(value.map(|value| value.to_string()).unwrap_or_default());
    }
    if let Ok(value) = row.try_get::<i32, _>(column) {
        return Ok(value.to_string());
    }
    Err(DomainError::new(format!(
        "storage row column {column} is not readable as text"
    )))
}

fn bool_cell(row: &sqlx::postgres::PgRow, column: &str) -> DomainResult<bool> {
    if let Ok(value) = row.try_get::<bool, _>(column) {
        return Ok(value);
    }
    if let Ok(value) = row.try_get::<i64, _>(column) {
        return Ok(value != 0);
    }
    let value = string_cell(row, column)?.to_ascii_lowercase();
    Ok(matches!(value.as_str(), "1" | "true" | "t" | "yes"))
}

fn write_error(context: &str, error: sqlx::Error) -> DomainError {
    let message = error.to_string();
    if message.contains("duplicate key value") || message.contains("unique constraint") {
        return DomainError::conflict(format!("{context}: record already exists"));
    }
    DomainError::new(format!("{context}: {message}"))
}

fn store_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}

#[derive(Clone, Copy)]
enum Field {
    String(&'static str),
    Bool(&'static str),
    GcComputed,
}

const DEFAULT_BUCKET_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("logicalScope"),
    Field::String("bucketId"),
    Field::String("bucketName"),
    Field::String("providerId"),
    Field::String("providerCode"),
    Field::String("providerType"),
    Field::String("region"),
    Field::String("reason"),
    Field::String("status"),
    Field::String("updatedAt"),
];

const QUOTA_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("scopeType"),
    Field::String("scopeId"),
    Field::String("quotaLimitBytes"),
    Field::String("usedBytes"),
    Field::String("singleFileLimitBytes"),
    Field::String("enforcement"),
    Field::String("status"),
    Field::String("createdAt"),
    Field::String("updatedAt"),
];

const USAGE_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("scopeType"),
    Field::String("scopeId"),
    Field::String("scope"),
    Field::String("usedBytes"),
    Field::String("reservedBytes"),
    Field::String("fileCount"),
    Field::String("snapshotAt"),
];

const RECONCILIATION_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("runId"),
    Field::String("providerId"),
    Field::String("providerCode"),
    Field::String("bucketId"),
    Field::String("bucketName"),
    Field::String("runType"),
    Field::String("scope"),
    Field::String("issues"),
    Field::String("issueCount"),
    Field::Bool("dryRun"),
    Field::String("status"),
    Field::String("startedAt"),
    Field::String("completedAt"),
];

const GC_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("jobId"),
    Field::String("jobType"),
    Field::GcComputed,
    Field::String("candidateCount"),
    Field::Bool("dryRun"),
    Field::String("status"),
    Field::String("createdAt"),
    Field::String("completedAt"),
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keyset_window_uses_the_last_returned_id_without_gaps() {
        let source = [5_i64, 4, 3];
        let mut cursor = None;
        let mut seen = Vec::new();

        loop {
            let candidates = source
                .iter()
                .copied()
                .filter(|id| cursor.is_none_or(|cursor: AdminStorageCursor| *id < cursor.id()))
                .take(2)
                .collect();
            let (items, next_cursor) = keyset_window(candidates, 1, |id| {
                AdminStorageCursor::new(*id)
                    .ok_or_else(|| DomainError::new("test cursor must be positive"))
            })
            .expect("keyset window");
            seen.extend(items);

            match next_cursor {
                Some(next_cursor) => cursor = Some(next_cursor),
                None => break,
            }
        }

        assert_eq!(vec![5, 4, 3], seen);
    }
}

async fn ensure_provider_exists(
    pool: &PgPool,
    subject: crate::ports::AdminStorageSubject,
    provider_id: i64,
) -> DomainResult<()> {
    let exists: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT 1::bigint
        FROM object_provider
        WHERE tenant_id = $1 AND organization_id = $2 AND id = $3
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(provider_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;
    if exists.is_none() {
        return Err(DomainError::not_found("storage provider was not found"));
    }
    Ok(())
}

async fn ensure_bucket_exists(
    pool: &PgPool,
    subject: crate::ports::AdminStorageSubject,
    bucket_id: i64,
) -> DomainResult<()> {
    let exists: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT 1::bigint
        FROM object_bucket
        WHERE tenant_id = $1 AND organization_id = $2 AND id = $3
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(bucket_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?;
    if exists.is_none() {
        return Err(DomainError::not_found("storage bucket was not found"));
    }
    Ok(())
}

async fn load_bucket_logical_scope(
    pool: &PgPool,
    subject: crate::ports::AdminStorageSubject,
    bucket_id: i64,
) -> DomainResult<String> {
    sqlx::query_scalar(
        r#"
        SELECT logical_scope
        FROM object_bucket
        WHERE tenant_id = $1 AND organization_id = $2 AND id = $3
        LIMIT 1
        "#,
    )
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(bucket_id)
    .fetch_optional(pool)
    .await
    .map_err(store_error)?
    .ok_or_else(|| DomainError::not_found("storage bucket was not found"))
}
