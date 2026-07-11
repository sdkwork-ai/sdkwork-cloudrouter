use sqlx::{Row, SqlitePool};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::model_catalog_import::stable_uuid;
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::sql_admin_storage::{
    job_status_label_sql, resource_status_label_sql, STORAGE_AUDIT_TARGET_BUCKET,
    STORAGE_AUDIT_TARGET_DEFAULT_BUCKET, STORAGE_AUDIT_TARGET_GC_JOB,
    STORAGE_AUDIT_TARGET_PROVIDER, STORAGE_AUDIT_TARGET_QUOTA_POLICY,
    STORAGE_AUDIT_TARGET_RECONCILIATION_RUN,
};
use crate::ports::{
    AdminStorageCollection, AdminStorageCommandFuture, AdminStorageJsonRecord, AdminStorageStore,
    CheckStorageProviderHealthCommand, CreateStorageBucketCommand,
    CreateStorageGarbageCollectionJobCommand, CreateStorageProviderCommand,
    CreateStorageQuotaPolicyCommand, CreateStorageReconciliationRunCommand,
    ListAdminStorageRecordsQuery, SetStorageDefaultBucketCommand, UpdateStorageBucketCommand,
    UpdateStorageProviderCommand,
};

#[derive(Debug, Clone)]
pub struct SqliteAdminStorageStore {
    pool: SqlitePool,
}

impl SqliteAdminStorageStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl AdminStorageStore for SqliteAdminStorageStore {
    fn list_providers<'a>(
        &'a self,
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        Box::pin(async move { list_providers(&self.pool, query).await })
    }

    fn create_provider<'a>(
        &'a self,
        command: CreateStorageProviderCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord> {
        Box::pin(async move { create_provider(&self.pool, command).await })
    }

    fn update_provider<'a>(
        &'a self,
        command: UpdateStorageProviderCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord> {
        Box::pin(async move { update_provider(&self.pool, command).await })
    }

    fn check_provider_health<'a>(
        &'a self,
        command: CheckStorageProviderHealthCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord> {
        Box::pin(async move { check_provider_health(&self.pool, command).await })
    }

    fn list_buckets<'a>(
        &'a self,
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        Box::pin(async move { list_buckets(&self.pool, query).await })
    }

    fn create_bucket<'a>(
        &'a self,
        command: CreateStorageBucketCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord> {
        Box::pin(async move { create_bucket(&self.pool, command).await })
    }

    fn update_bucket<'a>(
        &'a self,
        command: UpdateStorageBucketCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord> {
        Box::pin(async move { update_bucket(&self.pool, command).await })
    }

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

    fn list_usage_ledger<'a>(
        &'a self,
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        Box::pin(async move { list_usage_ledger(&self.pool, query).await })
    }

    fn list_usage_snapshots<'a>(
        &'a self,
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        Box::pin(async move { list_usage_snapshots(&self.pool, query).await })
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

async fn list_providers(
    pool: &SqlitePool,
    query: ListAdminStorageRecordsQuery,
) -> DomainResult<AdminStorageCollection> {
    let status_label = resource_status_label_sql("p.status");
    let rows = sqlx::query(&format!(
        r#"
        SELECT
            CAST(p.id AS TEXT) AS id,
            p.provider_code AS providerCode,
            p.provider_type AS providerType,
            COALESCE(p.endpoint_url, '') AS endpointUrl,
            COALESCE(p.region, '') AS region,
            p.credential_ref AS credentialRef,
            COALESCE(p.path_style_enabled, 0) AS pathStyleEnabled,
            COALESCE(p.supports_multipart, 0) AS supportsMultipart,
            COALESCE(p.supports_lifecycle, 0) AS supportsLifecycle,
            COALESCE(p.supports_object_lock, 0) AS supportsObjectLock,
            {status_label} AS status,
            COALESCE(p.health_status, 'unknown') AS health,
            CAST(COALESCE(p.last_health_check_at, '') AS TEXT) AS lastHealthCheckAt,
            CAST(p.created_at AS TEXT) AS createdAt,
            CAST(p.updated_at AS TEXT) AS updatedAt
        FROM object_provider p
        WHERE p.tenant_id = ?1
          AND p.organization_id = ?2
          AND (?3 IS NULL OR {status_label} = ?3)
          AND (?4 IS NULL OR p.id < ?4)
        ORDER BY p.id DESC
        LIMIT ?5
        "#
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(cursor_id(query.cursor.as_deref())?)
    .bind(query.limit + 1)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, query, PROVIDER_FIELDS)
}

async fn create_provider(
    pool: &SqlitePool,
    command: CreateStorageProviderCommand,
) -> DomainResult<AdminStorageJsonRecord> {
    if let Some(id) = existing_idempotent_id(
        pool,
        "object_provider",
        command.subject.tenant_id,
        command.subject.organization_id,
        &command.idempotency_key,
    )
    .await?
    {
        return load_provider(pool, command.subject, id).await;
    }

    let id = next_claw_runtime_id("object_provider")?;
    sqlx::query(
        r#"
        INSERT INTO object_provider
            (uuid, tenant_id, organization_id, provider_code, provider_type, endpoint_url, region,
             credential_ref, path_style_enabled, supports_multipart, supports_lifecycle,
             supports_object_lock, health_status, idempotency_key, request_id, id)
        VALUES
            (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 'unknown', ?13, ?14, ?15)
        "#,
    )
    .bind(stable_uuid(
        "storage-provider",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &command.provider_code,
            &command.idempotency_key,
        ],
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.provider_code)
    .bind(&command.provider_type)
    .bind(command.endpoint_url.as_deref())
    .bind(command.region.as_deref())
    .bind(&command.credential_ref)
    .bind(command.path_style_enabled.unwrap_or(false))
    .bind(command.supports_multipart.unwrap_or(true))
    .bind(command.supports_lifecycle.unwrap_or(false))
    .bind(command.supports_object_lock.unwrap_or(false))
    .bind(&command.idempotency_key)
    .bind(command.request_id.as_deref())
    .bind(id)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to create storage provider", error))?;

    insert_audit_if_absent(
        pool,
        command.subject,
        command
            .request_id
            .as_deref()
            .unwrap_or(&command.idempotency_key),
        "storage.provider.create",
        STORAGE_AUDIT_TARGET_PROVIDER,
        id,
        None,
    )
    .await?;
    load_provider(pool, command.subject, id).await
}

async fn update_provider(
    pool: &SqlitePool,
    command: UpdateStorageProviderCommand,
) -> DomainResult<AdminStorageJsonRecord> {
    let provider_id = parse_required_id(&command.provider_id, "providerId")?;
    let result = sqlx::query(
        r#"
        UPDATE object_provider
        SET status = ?1, updated_at = CURRENT_TIMESTAMP, request_id = ?2
        WHERE tenant_id = ?3
          AND organization_id = ?4
          AND id = ?5
        "#,
    )
    .bind(&command.status)
    .bind(command.request_id.as_deref())
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(provider_id)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to update storage provider", error))?;
    ensure_affected(result.rows_affected(), "storage provider was not found")?;
    insert_audit_if_absent(
        pool,
        command.subject,
        request_id_or(
            &command.request_id,
            &format!("provider-{provider_id}-{}", command.status),
        ),
        "storage.provider.update",
        STORAGE_AUDIT_TARGET_PROVIDER,
        provider_id,
        None,
    )
    .await?;
    load_provider(pool, command.subject, provider_id).await
}

async fn check_provider_health(
    pool: &SqlitePool,
    command: CheckStorageProviderHealthCommand,
) -> DomainResult<AdminStorageJsonRecord> {
    let provider_id = parse_required_id(&command.provider_id, "providerId")?;
    let result = sqlx::query(
        r#"
        UPDATE object_provider
        SET health_status = 'healthy', last_health_check_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND id = ?3
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(provider_id)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to check storage provider health", error))?;
    ensure_affected(result.rows_affected(), "storage provider was not found")?;
    insert_audit_if_absent(
        pool,
        command.subject,
        request_id_or(
            &command.request_id,
            &format!("provider-{provider_id}-health"),
        ),
        "storage.provider.health_check",
        STORAGE_AUDIT_TARGET_PROVIDER,
        provider_id,
        None,
    )
    .await?;

    let checked_at: String = sqlx::query_scalar(
        r#"
        SELECT CAST(COALESCE(last_health_check_at, CURRENT_TIMESTAMP) AS TEXT)
        FROM object_provider
        WHERE tenant_id = ?1 AND organization_id = ?2 AND id = ?3
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(provider_id)
    .fetch_one(pool)
    .await
    .map_err(store_error)?;

    let mut record = AdminStorageJsonRecord::new();
    record.insert(
        "providerId".to_owned(),
        serde_json::Value::String(provider_id.to_string()),
    );
    record.insert("healthy".to_owned(), serde_json::Value::Bool(true));
    record.insert(
        "status".to_owned(),
        serde_json::Value::String("healthy".to_owned()),
    );
    record.insert(
        "checkedAt".to_owned(),
        serde_json::Value::String(checked_at),
    );
    Ok(record)
}

async fn list_buckets(
    pool: &SqlitePool,
    query: ListAdminStorageRecordsQuery,
) -> DomainResult<AdminStorageCollection> {
    let status_label = resource_status_label_sql("b.status");
    let rows = sqlx::query(&format!(
        r#"
        SELECT
            CAST(b.id AS TEXT) AS id,
            b.bucket_name AS bucketName,
            b.logical_scope AS logicalScope,
            CAST(b.provider_id AS TEXT) AS providerId,
            p.provider_code AS providerCode,
            p.provider_type AS providerType,
            COALESCE(b.bucket_region, p.region, '') AS region,
            COALESCE(b.bucket_region, '') AS bucketRegion,
            COALESCE(b.data_residency_region, '') AS dataResidencyRegion,
            COALESCE(b.object_key_prefix, '') AS objectKeyPrefix,
            COALESCE(b.default_storage_class, 'STANDARD') AS storageClass,
            COALESCE(b.default_storage_class, 'STANDARD') AS defaultStorageClass,
            COALESCE(b.default_encryption_mode, 'sse_s3') AS encryption,
            COALESCE(b.default_encryption_mode, 'sse_s3') AS defaultEncryptionMode,
            COALESCE(b.kms_key_ref, '') AS kmsKeyRef,
            COALESCE(b.versioning_enabled, 0) AS versioningEnabled,
            COALESCE(b.object_lock_enabled, 0) AS objectLockEnabled,
            COALESCE(b.lifecycle_enabled, 0) AS lifecycleEnabled,
            COALESCE(b.public_access_blocked, 1) AS publicAccessBlocked,
            {status_label} AS status,
            CAST(b.created_at AS TEXT) AS createdAt,
            CAST(b.updated_at AS TEXT) AS updatedAt
        FROM object_bucket b
        JOIN object_provider p
          ON p.tenant_id = b.tenant_id
         AND p.organization_id = b.organization_id
         AND p.id = b.provider_id
        WHERE b.tenant_id = ?1
          AND b.organization_id = ?2
          AND (?3 IS NULL OR {status_label} = ?3)
          AND (?4 IS NULL OR b.logical_scope = ?4)
          AND (?5 IS NULL OR b.id < ?5)
        ORDER BY b.id DESC
        LIMIT ?6
        "#
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.logical_scope.as_deref())
    .bind(cursor_id(query.cursor.as_deref())?)
    .bind(query.limit + 1)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, query, BUCKET_FIELDS)
}

async fn create_bucket(
    pool: &SqlitePool,
    command: CreateStorageBucketCommand,
) -> DomainResult<AdminStorageJsonRecord> {
    if let Some(id) = existing_idempotent_id(
        pool,
        "object_bucket",
        command.subject.tenant_id,
        command.subject.organization_id,
        &command.idempotency_key,
    )
    .await?
    {
        return load_bucket(pool, command.subject, id).await;
    }

    let provider_id = parse_required_id(&command.provider_id, "providerId")?;
    ensure_provider_exists(pool, command.subject, provider_id).await?;
    let id = next_claw_runtime_id("object_bucket")?;
    sqlx::query(
        r#"
        INSERT INTO object_bucket
            (uuid, tenant_id, organization_id, provider_id, bucket_name, bucket_region,
             logical_scope, data_residency_region, object_key_prefix, default_storage_class,
             default_encryption_mode, kms_key_ref, versioning_enabled, object_lock_enabled,
             lifecycle_enabled, public_access_blocked, idempotency_key, request_id, id)
        VALUES
            (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)
        "#,
    )
    .bind(stable_uuid(
        "storage-bucket",
        &[
            &command.subject.tenant_id.to_string(),
            &command.subject.organization_id.to_string(),
            &provider_id.to_string(),
            &command.bucket_name,
            &command.idempotency_key,
        ],
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(provider_id)
    .bind(&command.bucket_name)
    .bind(command.bucket_region.as_deref())
    .bind(&command.logical_scope)
    .bind(command.data_residency_region.as_deref())
    .bind(command.object_key_prefix.as_deref().unwrap_or(""))
    .bind(
        command
            .default_storage_class
            .as_deref()
            .unwrap_or("STANDARD"),
    )
    .bind(
        command
            .default_encryption_mode
            .as_deref()
            .unwrap_or("sse_s3"),
    )
    .bind(command.kms_key_ref.as_deref())
    .bind(command.versioning_enabled.unwrap_or(false))
    .bind(command.object_lock_enabled.unwrap_or(false))
    .bind(command.lifecycle_enabled.unwrap_or(false))
    .bind(command.public_access_blocked.unwrap_or(true))
    .bind(&command.idempotency_key)
    .bind(command.request_id.as_deref())
    .bind(id)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to create storage bucket", error))?;

    insert_audit_if_absent(
        pool,
        command.subject,
        command
            .request_id
            .as_deref()
            .unwrap_or(&command.idempotency_key),
        "storage.bucket.create",
        STORAGE_AUDIT_TARGET_BUCKET,
        id,
        None,
    )
    .await?;
    load_bucket(pool, command.subject, id).await
}

async fn update_bucket(
    pool: &SqlitePool,
    command: UpdateStorageBucketCommand,
) -> DomainResult<AdminStorageJsonRecord> {
    let bucket_id = parse_required_id(&command.bucket_id, "bucketId")?;
    let result = sqlx::query(
        r#"
        UPDATE object_bucket
        SET status = ?1, updated_at = CURRENT_TIMESTAMP, request_id = ?2
        WHERE tenant_id = ?3
          AND organization_id = ?4
          AND id = ?5
        "#,
    )
    .bind(&command.status)
    .bind(command.request_id.as_deref())
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(bucket_id)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to update storage bucket", error))?;
    ensure_affected(result.rows_affected(), "storage bucket was not found")?;
    insert_audit_if_absent(
        pool,
        command.subject,
        request_id_or(
            &command.request_id,
            &format!("bucket-{bucket_id}-{}", command.status),
        ),
        "storage.bucket.update",
        STORAGE_AUDIT_TARGET_BUCKET,
        bucket_id,
        None,
    )
    .await?;
    load_bucket(pool, command.subject, bucket_id).await
}

async fn list_default_buckets(
    pool: &SqlitePool,
    query: ListAdminStorageRecordsQuery,
) -> DomainResult<AdminStorageCollection> {
    let status_label = resource_status_label_sql("d.status");
    let rows = sqlx::query(&format!(
        r#"
        SELECT
            CAST(d.id AS TEXT) AS id,
            d.logical_scope AS logicalScope,
            CAST(d.bucket_id AS TEXT) AS bucketId,
            b.bucket_name AS bucketName,
            CAST(b.provider_id AS TEXT) AS providerId,
            p.provider_code AS providerCode,
            p.provider_type AS providerType,
            COALESCE(b.bucket_region, p.region, '') AS region,
            {status_label} AS status,
            CAST(d.updated_at AS TEXT) AS updatedAt
        FROM storage_default_bucket_policy d
        JOIN object_bucket b
          ON b.tenant_id = d.tenant_id
         AND b.organization_id = d.organization_id
         AND b.id = d.bucket_id
        JOIN object_provider p
          ON p.tenant_id = b.tenant_id
         AND p.organization_id = b.organization_id
         AND p.id = b.provider_id
        WHERE d.tenant_id = ?1
          AND d.organization_id = ?2
          AND (?3 IS NULL OR {status_label} = ?3)
          AND (?4 IS NULL OR d.logical_scope = ?4)
          AND (?5 IS NULL OR d.id < ?5)
        ORDER BY d.id DESC
        LIMIT ?6
        "#
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.logical_scope.as_deref())
    .bind(cursor_id(query.cursor.as_deref())?)
    .bind(query.limit + 1)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, query, DEFAULT_BUCKET_FIELDS)
}

async fn set_default_bucket(
    pool: &SqlitePool,
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
    sqlx::query(
        r#"
        INSERT INTO storage_default_bucket_policy
            (uuid, tenant_id, organization_id, logical_scope, bucket_id, bucket_logical_scope,
             updated_by, reason, request_id, id)
        VALUES
            (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
        ON CONFLICT(tenant_id, organization_id, logical_scope) DO UPDATE SET
            bucket_id = excluded.bucket_id,
            bucket_logical_scope = excluded.bucket_logical_scope,
            updated_by = excluded.updated_by,
            reason = excluded.reason,
            request_id = excluded.request_id,
            status = 'active',
            updated_at = CURRENT_TIMESTAMP
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
    .bind(next_claw_runtime_id("storage_default_bucket_policy")?)
    .execute(pool)
    .await
    .map_err(|error| write_error("failed to set storage default bucket", error))?;

    let default_id = sqlx::query_scalar(
        r#"
        SELECT id
        FROM storage_default_bucket_policy
        WHERE tenant_id = ?1 AND organization_id = ?2 AND logical_scope = ?3
        LIMIT 1
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(&command.logical_scope)
    .fetch_one(pool)
    .await
    .map_err(store_error)?;
    insert_audit_if_absent(
        pool,
        command.subject,
        request_id_or(
            &command.request_id,
            &format!("default-bucket-{}", command.logical_scope),
        ),
        "storage.default_bucket.update",
        STORAGE_AUDIT_TARGET_DEFAULT_BUCKET,
        default_id,
        None,
    )
    .await?;
    load_default_bucket(pool, command.subject, default_id).await
}

async fn list_quota_policies(
    pool: &SqlitePool,
    query: ListAdminStorageRecordsQuery,
) -> DomainResult<AdminStorageCollection> {
    let status_label = resource_status_label_sql("q.status");
    let rows = sqlx::query(&format!(
        r#"
        SELECT
            CAST(q.id AS TEXT) AS id,
            q.scope_type AS scopeType,
            q.scope_id AS scopeId,
            q.quota_limit_bytes AS quotaLimitBytes,
            COALESCE(u.used_logical_bytes, 0) AS usedBytes,
            COALESCE(q.single_file_limit_bytes, 0) AS singleFileLimitBytes,
            COALESCE(q.enforcement, '') AS enforcement,
            {status_label} AS status,
            CAST(q.created_at AS TEXT) AS createdAt,
            CAST(q.updated_at AS TEXT) AS updatedAt
        FROM storage_quota_policy q
        LEFT JOIN storage_usage_counter u
          ON u.tenant_id = q.tenant_id
         AND u.organization_id = q.organization_id
         AND u.scope_type = q.scope_type
         AND u.scope_id = q.scope_id
        WHERE q.tenant_id = ?1
          AND q.organization_id = ?2
          AND (?3 IS NULL OR {status_label} = ?3)
          AND (?4 IS NULL OR q.scope_type = ?4)
          AND (?5 IS NULL OR q.scope_id = ?5)
          AND (?6 IS NULL OR q.id < ?6)
        ORDER BY q.id DESC
        LIMIT ?7
        "#
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.scope_type.as_deref())
    .bind(query.scope_id.as_deref())
    .bind(cursor_id(query.cursor.as_deref())?)
    .bind(query.limit + 1)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, query, QUOTA_FIELDS)
}

async fn create_quota_policy(
    pool: &SqlitePool,
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

    let id = next_claw_runtime_id("storage_quota_policy")?;
    sqlx::query(
        r#"
        INSERT INTO storage_quota_policy
            (uuid, tenant_id, organization_id, scope_type, scope_id, quota_limit_bytes,
             single_file_limit_bytes, enforcement, idempotency_key, request_id, id)
        VALUES
            (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
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
    .bind(id)
    .execute(pool)
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
    pool: &SqlitePool,
    query: ListAdminStorageRecordsQuery,
) -> DomainResult<AdminStorageCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            CAST(id AS TEXT) AS id,
            scope_type AS scopeType,
            scope_id AS scopeId,
            scope_type || ':' || scope_id AS scope,
            used_logical_bytes AS usedBytes,
            COALESCE(reserved_bytes, 0) AS reservedBytes,
            file_count AS fileCount,
            CAST(updated_at AS TEXT) AS snapshotAt
        FROM storage_usage_counter
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND (?3 IS NULL OR scope_type = ?3)
          AND (?4 IS NULL OR scope_id = ?4)
          AND (?5 IS NULL OR id < ?5)
        ORDER BY id DESC
        LIMIT ?6
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.scope_type.as_deref())
    .bind(query.scope_id.as_deref())
    .bind(cursor_id(query.cursor.as_deref())?)
    .bind(query.limit + 1)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, query, USAGE_FIELDS)
}

async fn list_usage_ledger(
    pool: &SqlitePool,
    query: ListAdminStorageRecordsQuery,
) -> DomainResult<AdminStorageCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            CAST(id AS TEXT) AS id,
            scope_type AS scopeType,
            scope_id AS scopeId,
            usage_event_type AS eventType,
            delta_logical_bytes AS deltaBytes,
            COALESCE(delta_file_count, 0) AS deltaFileCount,
            COALESCE(reason, '') AS reason,
            CAST(occurred_at AS TEXT) AS occurredAt
        FROM storage_usage_ledger
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND (?3 IS NULL OR scope_type = ?3)
          AND (?4 IS NULL OR scope_id = ?4)
          AND (?5 IS NULL OR id < ?5)
        ORDER BY id DESC
        LIMIT ?6
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.scope_type.as_deref())
    .bind(query.scope_id.as_deref())
    .bind(cursor_id(query.cursor.as_deref())?)
    .bind(query.limit + 1)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, query, USAGE_LEDGER_FIELDS)
}

async fn list_usage_snapshots(
    pool: &SqlitePool,
    query: ListAdminStorageRecordsQuery,
) -> DomainResult<AdminStorageCollection> {
    let rows = sqlx::query(
        r#"
        SELECT
            CAST(id AS TEXT) AS id,
            scope_type AS scopeType,
            scope_id AS scopeId,
            scope_type || ':' || scope_id AS scope,
            snapshot_type AS snapshotType,
            used_logical_bytes AS usedBytes,
            COALESCE(reserved_bytes, 0) AS reservedBytes,
            file_count AS fileCount,
            CAST(snapshot_at AS TEXT) AS snapshotAt
        FROM storage_usage_snapshot
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND (?3 IS NULL OR scope_type = ?3)
          AND (?4 IS NULL OR scope_id = ?4)
          AND (?5 IS NULL OR id < ?5)
        ORDER BY id DESC
        LIMIT ?6
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.scope_type.as_deref())
    .bind(query.scope_id.as_deref())
    .bind(cursor_id(query.cursor.as_deref())?)
    .bind(query.limit + 1)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, query, USAGE_SNAPSHOT_FIELDS)
}

async fn list_reconciliation_runs(
    pool: &SqlitePool,
    query: ListAdminStorageRecordsQuery,
) -> DomainResult<AdminStorageCollection> {
    let status_label = job_status_label_sql("r.status");
    let rows = sqlx::query(&format!(
        r#"
        SELECT
            CAST(r.id AS TEXT) AS id,
            CAST(r.id AS TEXT) AS runId,
            CAST(COALESCE(r.provider_id, 0) AS TEXT) AS providerId,
            COALESCE(p.provider_code, '') AS providerCode,
            CAST(COALESCE(r.bucket_id, 0) AS TEXT) AS bucketId,
            COALESCE(b.bucket_name, '') AS bucketName,
            r.run_type AS runType,
            COALESCE(p.provider_code, '') || '/' || COALESCE(b.bucket_name, '') AS scope,
            CAST(COALESCE(r.missing_object_count, 0) + COALESCE(r.orphan_object_count, 0) + COALESCE(r.checksum_mismatch_count, 0) AS TEXT) AS issues,
            COALESCE(r.missing_object_count, 0) + COALESCE(r.orphan_object_count, 0) + COALESCE(r.checksum_mismatch_count, 0) AS issueCount,
            COALESCE(r.dry_run, 1) AS dryRun,
            {status_label} AS status,
            CAST(r.started_at AS TEXT) AS startedAt,
            CAST(COALESCE(r.completed_at, '') AS TEXT) AS completedAt
        FROM storage_reconciliation_run r
        LEFT JOIN object_provider p
          ON p.tenant_id = r.tenant_id
         AND p.organization_id = r.organization_id
         AND p.id = r.provider_id
        LEFT JOIN object_bucket b
          ON b.tenant_id = r.tenant_id
         AND b.organization_id = r.organization_id
         AND b.id = r.bucket_id
        WHERE r.tenant_id = ?1
          AND r.organization_id = ?2
          AND (?3 IS NULL OR {status_label} = ?3)
          AND (?4 IS NULL OR r.run_type = ?4)
          AND (?5 IS NULL OR r.id < ?5)
        ORDER BY r.id DESC
        LIMIT ?6
        "#
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(query.run_type.as_deref())
    .bind(cursor_id(query.cursor.as_deref())?)
    .bind(query.limit + 1)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, query, RECONCILIATION_FIELDS)
}

async fn create_reconciliation_run(
    pool: &SqlitePool,
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
    let id = next_claw_runtime_id("storage_reconciliation_run")?;
    sqlx::query(
        r#"
        INSERT INTO storage_reconciliation_run
            (uuid, tenant_id, organization_id, provider_id, bucket_id, run_type, dry_run,
             requested_by, idempotency_key, request_id, summary_json, id)
        VALUES
            (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
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
    .bind(id)
    .execute(pool)
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
    pool: &SqlitePool,
    query: ListAdminStorageRecordsQuery,
) -> DomainResult<AdminStorageCollection> {
    let status_label = job_status_label_sql("g.status");
    let rows = sqlx::query(&format!(
        r#"
        SELECT
            CAST(g.id AS TEXT) AS id,
            CAST(g.id AS TEXT) AS jobId,
            g.job_type AS jobType,
            COALESCE(g.criteria_json, '') AS criteriaJson,
            g.candidate_count AS candidateCount,
            {status_label} AS status,
            COALESCE(g.dry_run, 1) AS dryRun,
            CAST(g.created_at AS TEXT) AS createdAt,
            CAST(COALESCE(g.completed_at, '') AS TEXT) AS completedAt
        FROM storage_gc_job g
        WHERE g.tenant_id = ?1
          AND g.organization_id = ?2
          AND (?3 IS NULL OR {status_label} = ?3)
          AND (?4 IS NULL OR g.id < ?4)
        ORDER BY g.id DESC
        LIMIT ?5
        "#
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.status.as_deref())
    .bind(cursor_id(query.cursor.as_deref())?)
    .bind(query.limit + 1)
    .fetch_all(pool)
    .await
    .map_err(store_error)?;

    collection_from_rows(rows, query, GC_FIELDS)
}

async fn create_gc_job(
    pool: &SqlitePool,
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
    let id = next_claw_runtime_id("storage_gc_job")?;
    sqlx::query(
        r#"
        INSERT INTO storage_gc_job
            (uuid, tenant_id, organization_id, job_type, dry_run, requested_by,
             idempotency_key, request_id, criteria_json, result_json, id)
        VALUES
            (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
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
    .bind("{}")
    .bind(id)
    .execute(pool)
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

async fn load_provider(
    pool: &SqlitePool,
    subject: crate::ports::AdminStorageSubject,
    id: i64,
) -> DomainResult<AdminStorageJsonRecord> {
    let mut query = list_query(subject);
    query.cursor = Some((id + 1).to_string());
    query.limit = 1;
    let collection = list_providers(pool, query).await?;
    collection
        .items
        .into_iter()
        .find(|item| item.get("id").and_then(serde_json::Value::as_str) == Some(&id.to_string()))
        .ok_or_else(|| DomainError::not_found("storage provider was not found"))
}

async fn load_bucket(
    pool: &SqlitePool,
    subject: crate::ports::AdminStorageSubject,
    id: i64,
) -> DomainResult<AdminStorageJsonRecord> {
    let mut query = list_query(subject);
    query.cursor = Some((id + 1).to_string());
    query.limit = 1;
    let collection = list_buckets(pool, query).await?;
    collection
        .items
        .into_iter()
        .find(|item| item.get("id").and_then(serde_json::Value::as_str) == Some(&id.to_string()))
        .ok_or_else(|| DomainError::not_found("storage bucket was not found"))
}

async fn load_default_bucket(
    pool: &SqlitePool,
    subject: crate::ports::AdminStorageSubject,
    id: i64,
) -> DomainResult<AdminStorageJsonRecord> {
    let mut query = list_query(subject);
    query.cursor = Some((id + 1).to_string());
    query.limit = 1;
    let collection = list_default_buckets(pool, query).await?;
    collection
        .items
        .into_iter()
        .find(|item| item.get("id").and_then(serde_json::Value::as_str) == Some(&id.to_string()))
        .ok_or_else(|| DomainError::not_found("storage default bucket was not found"))
}

async fn load_quota_policy(
    pool: &SqlitePool,
    subject: crate::ports::AdminStorageSubject,
    id: i64,
) -> DomainResult<AdminStorageJsonRecord> {
    let mut query = list_query(subject);
    query.cursor = Some((id + 1).to_string());
    query.limit = 1;
    let collection = list_quota_policies(pool, query).await?;
    collection
        .items
        .into_iter()
        .find(|item| item.get("id").and_then(serde_json::Value::as_str) == Some(&id.to_string()))
        .ok_or_else(|| DomainError::not_found("storage quota policy was not found"))
}

async fn load_reconciliation_run(
    pool: &SqlitePool,
    subject: crate::ports::AdminStorageSubject,
    id: i64,
) -> DomainResult<AdminStorageJsonRecord> {
    let mut query = list_query(subject);
    query.cursor = Some((id + 1).to_string());
    query.limit = 1;
    let collection = list_reconciliation_runs(pool, query).await?;
    collection
        .items
        .into_iter()
        .find(|item| item.get("id").and_then(serde_json::Value::as_str) == Some(&id.to_string()))
        .ok_or_else(|| DomainError::not_found("storage reconciliation run was not found"))
}

async fn load_gc_job(
    pool: &SqlitePool,
    subject: crate::ports::AdminStorageSubject,
    id: i64,
) -> DomainResult<AdminStorageJsonRecord> {
    let mut query = list_query(subject);
    query.cursor = Some((id + 1).to_string());
    query.limit = 1;
    let collection = list_gc_jobs(pool, query).await?;
    collection
        .items
        .into_iter()
        .find(|item| item.get("id").and_then(serde_json::Value::as_str) == Some(&id.to_string()))
        .ok_or_else(|| DomainError::not_found("storage gc job was not found"))
}

async fn existing_idempotent_id(
    pool: &SqlitePool,
    table: &str,
    tenant_id: i64,
    organization_id: i64,
    idempotency_key: &str,
) -> DomainResult<Option<i64>> {
    sqlx::query_scalar(&format!(
        r#"
        SELECT id
        FROM {table}
        WHERE tenant_id = ?1
          AND organization_id = ?2
          AND idempotency_key = ?3
        LIMIT 1
        "#
    ))
    .bind(tenant_id)
    .bind(organization_id)
    .bind(idempotency_key)
    .fetch_optional(pool)
    .await
    .map_err(store_error)
}

async fn ensure_provider_exists(
    pool: &SqlitePool,
    subject: crate::ports::AdminStorageSubject,
    provider_id: i64,
) -> DomainResult<()> {
    let exists: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT 1
        FROM object_provider
        WHERE tenant_id = ?1 AND organization_id = ?2 AND id = ?3
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
    pool: &SqlitePool,
    subject: crate::ports::AdminStorageSubject,
    bucket_id: i64,
) -> DomainResult<()> {
    let exists: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT 1
        FROM object_bucket
        WHERE tenant_id = ?1 AND organization_id = ?2 AND id = ?3
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
    pool: &SqlitePool,
    subject: crate::ports::AdminStorageSubject,
    bucket_id: i64,
) -> DomainResult<String> {
    sqlx::query_scalar(
        r#"
        SELECT logical_scope
        FROM object_bucket
        WHERE tenant_id = ?1 AND organization_id = ?2 AND id = ?3
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

async fn insert_audit_if_absent(
    pool: &SqlitePool,
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
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, CURRENT_TIMESTAMP, ?11
        WHERE NOT EXISTS (
            SELECT 1
            FROM ops_audit_log
            WHERE tenant_id = ?12
              AND organization_id = ?13
              AND request_id = ?14
              AND action = ?15
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
    .bind(next_claw_runtime_id("ops_audit_log")?)
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

fn collection_from_rows(
    mut rows: Vec<sqlx::sqlite::SqliteRow>,
    query: ListAdminStorageRecordsQuery,
    fields: &[Field],
) -> DomainResult<AdminStorageCollection> {
    let next_cursor = if rows.len() as i64 > query.limit {
        rows.pop().map(|row| string_cell(&row, "id")).transpose()?
    } else {
        None
    };
    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        items.push(row_to_record(&row, fields)?);
    }
    Ok(AdminStorageCollection {
        items,
        next_cursor,
        request_id: query.request_id,
    })
}

fn row_to_record(
    row: &sqlx::sqlite::SqliteRow,
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
            Field::Integer(name) => {
                record.insert(
                    name.to_owned(),
                    serde_json::Value::from(integer_cell(row, name)?),
                );
            }
            Field::Bool(name) => {
                record.insert(
                    name.to_owned(),
                    serde_json::Value::Bool(bool_cell(row, name)?),
                );
            }
            Field::GcComputed => {
                add_gc_computed_fields(row, &mut record)?;
            }
        }
    }
    Ok(record)
}

fn add_gc_computed_fields(
    row: &sqlx::sqlite::SqliteRow,
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

fn cursor_id(value: Option<&str>) -> DomainResult<Option<i64>> {
    value
        .map(|value| parse_required_id(value, "cursor"))
        .transpose()
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

fn ensure_affected(rows_affected: u64, message: &str) -> DomainResult<()> {
    if rows_affected == 0 {
        return Err(DomainError::not_found(message));
    }
    Ok(())
}

fn request_id_or<'a>(request_id: &'a Option<String>, fallback: &'a str) -> &'a str {
    request_id.as_deref().unwrap_or(fallback)
}

fn json_text(value: &serde_json::Value) -> String {
    serde_json::to_string(value).unwrap_or_else(|_| "{}".to_owned())
}

fn json_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<serde_json::Value> {
    let raw = string_cell(row, column)?;
    if raw.trim().is_empty() {
        return Ok(serde_json::json!({}));
    }
    serde_json::from_str(&raw)
        .map_err(|error| DomainError::new(format!("invalid storage json {column}: {error}")))
}

fn string_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<String> {
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

fn integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<i64> {
    if let Ok(value) = row.try_get::<i64, _>(column) {
        return Ok(value);
    }
    if let Ok(value) = row.try_get::<Option<i64>, _>(column) {
        return Ok(value.unwrap_or_default());
    }
    if let Ok(value) = row.try_get::<i32, _>(column) {
        return Ok(i64::from(value));
    }
    if let Ok(value) = row.try_get::<Option<i32>, _>(column) {
        return Ok(value.map(i64::from).unwrap_or_default());
    }
    let value = string_cell(row, column)?;
    if value.trim().is_empty() {
        return Ok(0);
    }
    value
        .parse::<i64>()
        .map_err(|error| DomainError::new(format!("invalid storage integer {column}: {error}")))
}

fn bool_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<bool> {
    if let Ok(value) = row.try_get::<bool, _>(column) {
        return Ok(value);
    }
    if let Ok(value) = row.try_get::<i64, _>(column) {
        return Ok(value != 0);
    }
    if let Ok(value) = row.try_get::<i32, _>(column) {
        return Ok(value != 0);
    }
    let value = string_cell(row, column)?.to_ascii_lowercase();
    Ok(matches!(value.as_str(), "1" | "true" | "t" | "yes"))
}

fn write_error(context: &str, error: sqlx::Error) -> DomainError {
    let message = error.to_string();
    if message.contains("UNIQUE constraint failed") || message.contains("unique constraint") {
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
    Integer(&'static str),
    Bool(&'static str),
    GcComputed,
}

const PROVIDER_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("providerCode"),
    Field::String("providerType"),
    Field::String("endpointUrl"),
    Field::String("region"),
    Field::String("credentialRef"),
    Field::Bool("pathStyleEnabled"),
    Field::Bool("supportsMultipart"),
    Field::Bool("supportsLifecycle"),
    Field::Bool("supportsObjectLock"),
    Field::String("status"),
    Field::String("health"),
    Field::String("lastHealthCheckAt"),
    Field::String("createdAt"),
    Field::String("updatedAt"),
];

const BUCKET_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("bucketName"),
    Field::String("logicalScope"),
    Field::String("providerId"),
    Field::String("providerCode"),
    Field::String("providerType"),
    Field::String("region"),
    Field::String("bucketRegion"),
    Field::String("dataResidencyRegion"),
    Field::String("objectKeyPrefix"),
    Field::String("storageClass"),
    Field::String("defaultStorageClass"),
    Field::String("encryption"),
    Field::String("defaultEncryptionMode"),
    Field::String("kmsKeyRef"),
    Field::Bool("versioningEnabled"),
    Field::Bool("objectLockEnabled"),
    Field::Bool("lifecycleEnabled"),
    Field::Bool("publicAccessBlocked"),
    Field::String("status"),
    Field::String("createdAt"),
    Field::String("updatedAt"),
];

const DEFAULT_BUCKET_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("logicalScope"),
    Field::String("bucketId"),
    Field::String("bucketName"),
    Field::String("providerId"),
    Field::String("providerCode"),
    Field::String("providerType"),
    Field::String("region"),
    Field::String("status"),
    Field::String("updatedAt"),
];

const QUOTA_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("scopeType"),
    Field::String("scopeId"),
    Field::Integer("quotaLimitBytes"),
    Field::Integer("usedBytes"),
    Field::Integer("singleFileLimitBytes"),
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
    Field::Integer("usedBytes"),
    Field::Integer("reservedBytes"),
    Field::Integer("fileCount"),
    Field::String("snapshotAt"),
];

const USAGE_LEDGER_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("scopeType"),
    Field::String("scopeId"),
    Field::String("eventType"),
    Field::Integer("deltaBytes"),
    Field::Integer("deltaFileCount"),
    Field::String("reason"),
    Field::String("occurredAt"),
];

const USAGE_SNAPSHOT_FIELDS: &[Field] = &[
    Field::String("id"),
    Field::String("scopeType"),
    Field::String("scopeId"),
    Field::String("scope"),
    Field::String("snapshotType"),
    Field::Integer("usedBytes"),
    Field::Integer("reservedBytes"),
    Field::Integer("fileCount"),
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
    Field::Integer("issueCount"),
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
