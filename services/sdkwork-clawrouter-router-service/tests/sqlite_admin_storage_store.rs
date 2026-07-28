use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAdminStorageStore;
use sdkwork_clawrouter_router_service::ports::{
    AdminStorageStore, AdminStorageSubject, CheckStorageProviderHealthCommand,
    CreateStorageBucketCommand, CreateStorageGarbageCollectionJobCommand,
    CreateStorageProviderCommand, CreateStorageQuotaPolicyCommand,
    CreateStorageReconciliationRunCommand, ListAdminStorageRecordsQuery,
    SetStorageDefaultBucketCommand, UpdateStorageBucketCommand, UpdateStorageProviderCommand,
};
use sqlx::sqlite::SqlitePoolOptions;

#[tokio::test]
async fn sqlite_admin_storage_store_manages_storage_center_records() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_storage_tables(&pool).await;
    seed_storage_center(&pool).await;

    let store = SqliteAdminStorageStore::new(pool.clone());

    let providers = store
        .list_providers(list_query())
        .await
        .expect("providers should load");
    assert_eq!("aws-primary", providers.items[0]["providerCode"]);
    assert_eq!("active", providers.items[0]["status"]);

    let created_provider = store
        .create_provider(CreateStorageProviderCommand {
            subject: subject(),
            supplier_code: "minio-dev".to_owned(),
            provider_type: "minio".to_owned(),
            endpoint_url: Some("http://127.0.0.1:9000".to_owned()),
            region: Some("local".to_owned()),
            credential_ref: "secret://oss/minio-dev".to_owned(),
            path_style_enabled: Some(true),
            supports_multipart: Some(true),
            supports_lifecycle: Some(false),
            supports_object_lock: Some(false),
            idempotency_key: "idem-provider-create".to_owned(),
            request_id: Some("req-provider-create".to_owned()),
        })
        .await
        .expect("provider should be created");
    assert_eq!("minio-dev", created_provider["providerCode"]);
    assert_eq!("unknown", created_provider["health"]);

    let updated_provider = store
        .update_provider(UpdateStorageProviderCommand {
            subject: subject(),
            provider_id: created_provider["id"].as_str().unwrap().to_owned(),
            status: "disabled".to_owned(),
            reason: "maintenance".to_owned(),
            request_id: Some("req-provider-update".to_owned()),
        })
        .await
        .expect("provider should update");
    assert_eq!("disabled", updated_provider["status"]);

    let health = store
        .check_provider_health(CheckStorageProviderHealthCommand {
            subject: subject(),
            provider_id: created_provider["id"].as_str().unwrap().to_owned(),
            request_id: Some("req-provider-health".to_owned()),
        })
        .await
        .expect("health should update");
    assert_eq!(true, health["healthy"]);

    let created_bucket = store
        .create_bucket(CreateStorageBucketCommand {
            subject: subject(),
            bucket_name: "tenant-private-assets".to_owned(),
            provider_id: "1".to_owned(),
            logical_scope: "tenant_private".to_owned(),
            bucket_region: Some("us-east-1".to_owned()),
            data_residency_region: Some("US".to_owned()),
            object_key_prefix: Some("tenants/{tenantId}/".to_owned()),
            default_storage_class: Some("STANDARD".to_owned()),
            default_encryption_mode: Some("sse_s3".to_owned()),
            kms_key_ref: None,
            versioning_enabled: Some(true),
            object_lock_enabled: Some(false),
            lifecycle_enabled: Some(true),
            public_access_blocked: Some(true),
            idempotency_key: "idem-bucket-create".to_owned(),
            request_id: Some("req-bucket-create".to_owned()),
        })
        .await
        .expect("bucket should be created");
    assert_eq!("tenant-private-assets", created_bucket["bucketName"]);
    assert_eq!("aws-primary", created_bucket["providerCode"]);

    let buckets = store
        .list_buckets(list_query())
        .await
        .expect("buckets should load");
    assert!(buckets
        .items
        .iter()
        .any(|item| item["id"] == created_bucket["id"]));

    let archived_bucket = store
        .update_bucket(UpdateStorageBucketCommand {
            subject: subject(),
            bucket_id: created_bucket["id"].as_str().unwrap().to_owned(),
            status: "archived".to_owned(),
            reason: "retired".to_owned(),
            request_id: Some("req-bucket-update".to_owned()),
        })
        .await
        .expect("bucket should archive");
    assert_eq!("archived", archived_bucket["status"]);

    let default_bucket = store
        .set_default_bucket(SetStorageDefaultBucketCommand {
            subject: subject(),
            logical_scope: "tenant_private".to_owned(),
            bucket_id: "1".to_owned(),
            reason: "tenant private default".to_owned(),
            request_id: Some("req-default-bucket".to_owned()),
        })
        .await
        .expect("default bucket should be set");
    assert_eq!("tenant_private", default_bucket["logicalScope"]);
    assert_eq!("tenant-assets", default_bucket["bucketName"]);

    let quota = store
        .create_quota_policy(CreateStorageQuotaPolicyCommand {
            subject: subject(),
            scope_type: "organization".to_owned(),
            scope_id: "20".to_owned(),
            quota_limit_bytes: 1_099_511_627_776,
            single_file_limit_bytes: Some(10_737_418_240),
            enforcement: Some("hard".to_owned()),
            idempotency_key: "idem-quota-create".to_owned(),
            request_id: Some("req-quota-create".to_owned()),
        })
        .await
        .expect("quota should be created");
    assert_eq!("organization", quota["scopeType"]);
    assert_eq!(1_099_511_627_776_i64, quota["quotaLimitBytes"]);

    let usage = store
        .list_usage_counters(ListAdminStorageRecordsQuery {
            scope_type: Some("organization".to_owned()),
            scope_id: Some("20".to_owned()),
            ..list_query()
        })
        .await
        .expect("usage should load");
    assert_eq!("organization:20", usage.items[0]["scope"]);
    assert_eq!(2_048_i64, usage.items[0]["usedBytes"]);

    let ledger = store
        .list_usage_ledger(ListAdminStorageRecordsQuery {
            scope_type: Some("user".to_owned()),
            scope_id: Some("30".to_owned()),
            ..list_query()
        })
        .await
        .expect("ledger should load");
    assert_eq!(512_i64, ledger.items[0]["deltaBytes"]);

    let snapshots = store
        .list_usage_snapshots(ListAdminStorageRecordsQuery {
            scope_type: Some("tenant".to_owned()),
            scope_id: Some("10".to_owned()),
            ..list_query()
        })
        .await
        .expect("snapshots should load");
    assert_eq!("tenant:10", snapshots.items[0]["scope"]);

    let reconciliation = store
        .create_reconciliation_run(CreateStorageReconciliationRunCommand {
            subject: subject(),
            provider_id: Some("1".to_owned()),
            bucket_id: Some("1".to_owned()),
            run_type: "metadata".to_owned(),
            dry_run: true,
            reason: Some("operator check".to_owned()),
            idempotency_key: "idem-reconciliation-create".to_owned(),
            request_id: Some("req-reconciliation-create".to_owned()),
        })
        .await
        .expect("reconciliation run should be created");
    assert_eq!("metadata", reconciliation["runType"]);
    assert_eq!("created", reconciliation["status"]);

    let gc = store
        .create_gc_job(CreateStorageGarbageCollectionJobCommand {
            subject: subject(),
            job_type: "expired_uploads".to_owned(),
            target: Some("uploads".to_owned()),
            dry_run: true,
            retention_window: Some("P7D".to_owned()),
            dry_run_sample: Some("100".to_owned()),
            criteria: None,
            idempotency_key: "idem-gc-create".to_owned(),
            request_id: Some("req-gc-create".to_owned()),
        })
        .await
        .expect("gc job should be created");
    assert_eq!("expired_uploads", gc["jobType"]);
    assert_eq!("created", gc["status"]);

    let audit_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ops_audit_log WHERE action LIKE 'storage.%' AND tenant_id = 100001",
    )
    .fetch_one(&pool)
    .await
    .expect("audit count should load");
    assert!(
        audit_count >= 7,
        "storage commands must write audit records, got {audit_count}"
    );
}

fn list_query() -> ListAdminStorageRecordsQuery {
    ListAdminStorageRecordsQuery {
        subject: subject(),
        cursor: None,
        limit: 100,
        status: None,
        logical_scope: None,
        scope_type: None,
        scope_id: None,
        run_type: None,
        request_id: "req-list-storage".to_owned(),
    }
}

fn subject() -> AdminStorageSubject {
    AdminStorageSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    }
}

async fn create_storage_tables(pool: &sqlx::SqlitePool) {
    for statement in [
        r#"
        CREATE TABLE object_provider (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            supplier_code TEXT NOT NULL,
            provider_type TEXT NOT NULL,
            endpoint_url TEXT,
            region TEXT,
            credential_ref TEXT NOT NULL,
            path_style_enabled INTEGER NOT NULL DEFAULT 0,
            supports_multipart INTEGER NOT NULL DEFAULT 1,
            supports_lifecycle INTEGER NOT NULL DEFAULT 0,
            supports_object_lock INTEGER NOT NULL DEFAULT 0,
            health_status TEXT NOT NULL DEFAULT 'unknown',
            last_health_check_at TEXT,
            idempotency_key TEXT,
            request_id TEXT
        )
        "#,
        "CREATE UNIQUE INDEX uq_object_provider_tenant_code ON object_provider (tenant_id, organization_id, supplier_code)",
        r#"
        CREATE TABLE object_bucket (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            provider_id INTEGER NOT NULL,
            bucket_name TEXT NOT NULL,
            bucket_region TEXT,
            logical_scope TEXT NOT NULL,
            data_residency_region TEXT,
            object_key_prefix TEXT NOT NULL DEFAULT '',
            default_storage_class TEXT NOT NULL DEFAULT 'STANDARD',
            default_encryption_mode TEXT NOT NULL DEFAULT 'sse_s3',
            kms_key_ref TEXT,
            versioning_enabled INTEGER NOT NULL DEFAULT 0,
            object_lock_enabled INTEGER NOT NULL DEFAULT 0,
            lifecycle_enabled INTEGER NOT NULL DEFAULT 0,
            public_access_blocked INTEGER NOT NULL DEFAULT 1,
            idempotency_key TEXT,
            request_id TEXT
        )
        "#,
        "CREATE UNIQUE INDEX uq_object_bucket_provider_name ON object_bucket (tenant_id, organization_id, provider_id, bucket_name)",
        r#"
        CREATE TABLE storage_default_bucket_policy (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            logical_scope TEXT NOT NULL,
            bucket_id INTEGER NOT NULL,
            bucket_logical_scope TEXT NOT NULL,
            updated_by INTEGER NOT NULL,
            reason TEXT,
            request_id TEXT
        )
        "#,
        "CREATE UNIQUE INDEX uq_storage_default_bucket_policy_scope ON storage_default_bucket_policy (tenant_id, organization_id, logical_scope)",
        r#"
        CREATE TABLE storage_quota_policy (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            scope_type TEXT NOT NULL,
            scope_id TEXT NOT NULL,
            quota_limit_bytes INTEGER NOT NULL,
            single_file_limit_bytes INTEGER,
            enforcement TEXT,
            idempotency_key TEXT,
            request_id TEXT
        )
        "#,
        "CREATE UNIQUE INDEX uq_storage_quota_policy_scope ON storage_quota_policy (tenant_id, organization_id, scope_type, scope_id)",
        r#"
        CREATE TABLE storage_usage_counter (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            scope_type TEXT NOT NULL,
            scope_id TEXT NOT NULL,
            space_id TEXT,
            app_id TEXT,
            business_domain TEXT,
            used_logical_bytes INTEGER NOT NULL DEFAULT 0,
            reserved_bytes INTEGER NOT NULL DEFAULT 0,
            file_count INTEGER NOT NULL DEFAULT 0,
            last_ledger_id INTEGER NOT NULL DEFAULT 0
        )
        "#,
        r#"
        CREATE TABLE storage_usage_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            scope_type TEXT NOT NULL,
            scope_id TEXT NOT NULL,
            space_id TEXT,
            app_id TEXT,
            business_domain TEXT,
            usage_event_type TEXT NOT NULL,
            delta_logical_bytes INTEGER NOT NULL,
            delta_file_count INTEGER NOT NULL DEFAULT 0,
            reason TEXT,
            idempotency_key TEXT,
            occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
        r#"
        CREATE TABLE storage_usage_snapshot (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            scope_type TEXT NOT NULL,
            scope_id TEXT NOT NULL,
            space_id TEXT,
            app_id TEXT,
            business_domain TEXT,
            snapshot_type TEXT NOT NULL,
            snapshot_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            used_logical_bytes INTEGER NOT NULL DEFAULT 0,
            reserved_bytes INTEGER NOT NULL DEFAULT 0,
            file_count INTEGER NOT NULL DEFAULT 0
        )
        "#,
        r#"
        CREATE TABLE storage_reconciliation_run (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            provider_id INTEGER,
            bucket_id INTEGER,
            run_type TEXT NOT NULL,
            dry_run INTEGER NOT NULL DEFAULT 1,
            started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            completed_at TEXT,
            scanned_object_count INTEGER NOT NULL DEFAULT 0,
            missing_object_count INTEGER NOT NULL DEFAULT 0,
            orphan_object_count INTEGER NOT NULL DEFAULT 0,
            checksum_mismatch_count INTEGER NOT NULL DEFAULT 0,
            requested_by INTEGER NOT NULL,
            idempotency_key TEXT NOT NULL,
            request_id TEXT,
            summary_json TEXT
        )
        "#,
        "CREATE UNIQUE INDEX uq_storage_reconciliation_run_idempotency ON storage_reconciliation_run (tenant_id, organization_id, idempotency_key)",
        r#"
        CREATE TABLE storage_gc_job (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            job_type TEXT NOT NULL,
            dry_run INTEGER NOT NULL DEFAULT 1,
            requested_by INTEGER NOT NULL,
            idempotency_key TEXT NOT NULL,
            cursor_token TEXT,
            candidate_count INTEGER NOT NULL DEFAULT 0,
            deleted_object_count INTEGER NOT NULL DEFAULT 0,
            released_bytes INTEGER NOT NULL DEFAULT 0,
            started_at TEXT,
            completed_at TEXT,
            request_id TEXT,
            criteria_json TEXT,
            result_json TEXT
        )
        "#,
        "CREATE UNIQUE INDEX uq_storage_gc_job_idempotency ON storage_gc_job (tenant_id, organization_id, idempotency_key)",
        r#"
        CREATE TABLE ops_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            request_id TEXT,
            operator_id INTEGER,
            operator_type INTEGER,
            action TEXT,
            target_type INTEGER,
            target_id INTEGER,
            target_uuid TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_storage_center(pool: &sqlx::SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO object_provider
            (id, uuid, tenant_id, organization_id, supplier_code, provider_type, endpoint_url, region, credential_ref, supports_multipart, supports_lifecycle, health_status)
        VALUES
            (1, 'provider-aws-primary', 100001, 0, 'aws-primary', 'aws_s3', 'https://s3.amazonaws.com', 'us-east-1', 'secret://oss/aws-primary', 1, 1, 'healthy')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO object_bucket
            (id, uuid, tenant_id, organization_id, provider_id, bucket_name, bucket_region, logical_scope, data_residency_region, object_key_prefix, default_storage_class, default_encryption_mode, lifecycle_enabled)
        VALUES
            (1, 'bucket-tenant-assets', 100001, 0, 1, 'tenant-assets', 'us-east-1', 'tenant_private', 'US', 'tenants/{tenantId}/', 'STANDARD', 'sse_s3', 1)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO storage_usage_counter
            (id, uuid, tenant_id, organization_id, scope_type, scope_id, used_logical_bytes, reserved_bytes, file_count)
        VALUES
            (1, 'usage-org-20', 100001, 0, 'organization', '20', 2048, 128, 4)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO storage_usage_ledger
            (id, uuid, tenant_id, organization_id, user_id, scope_type, scope_id, usage_event_type, delta_logical_bytes, delta_file_count, reason, idempotency_key)
        VALUES
            (1, 'ledger-user-30', 100001, 0, 30, 'user', '30', 'file.upload.completed', 512, 1, 'upload', 'seed-ledger')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO storage_usage_snapshot
            (id, uuid, tenant_id, organization_id, scope_type, scope_id, snapshot_type, used_logical_bytes, reserved_bytes, file_count)
        VALUES
            (1, 'snapshot-tenant-10', 100001, 0, 'tenant', '10', 'daily', 2048, 128, 4)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}
