mod common;

use common::InternalTrustedSubjectHeaders;
use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::ports::{
    AdminStorageCollection, AdminStorageCommandFuture, AdminStorageJsonRecord, AdminStorageStore,
    CheckStorageProviderHealthCommand, CreateStorageBucketCommand,
    CreateStorageGarbageCollectionJobCommand, CreateStorageProviderCommand,
    CreateStorageQuotaPolicyCommand, CreateStorageReconciliationRunCommand,
    ListAdminStorageRecordsQuery, SetStorageDefaultBucketCommand, UpdateStorageBucketCommand,
    UpdateStorageProviderCommand,
};
use serde_json::{json, Map, Value};
use tower::ServiceExt;

#[tokio::test]
async fn admin_storage_route_exposes_complete_oss_management_center() {
    let router = sdkwork_clawrouter_router_service::api::admin_storage_router_with_store(Arc::new(
        TestAdminStorageStore,
    ));

    for (path, expected_id) in [
        ("/backend/v3/api/storage/providers", "provider-1"),
        ("/backend/v3/api/storage/buckets", "bucket-1"),
        (
            "/backend/v3/api/storage/default_buckets",
            "default-tenant-private",
        ),
        ("/backend/v3/api/storage/quotas", "quota-1"),
        (
            "/backend/v3/api/storage/usage?scope_type=organization&scope_id=20",
            "usage-1",
        ),
        (
            "/backend/v3/api/storage/usage/ledger?scope_type=user&scope_id=30",
            "ledger-1",
        ),
        (
            "/backend/v3/api/storage/usage/snapshots?scope_type=tenant&scope_id=10",
            "snapshot-1",
        ),
        (
            "/backend/v3/api/storage/reconciliation_runs?run_type=metadata&status=created",
            "reconciliation-1",
        ),
        ("/backend/v3/api/storage/gc_jobs?status=created", "gc-job-1"),
    ] {
        let payload = request_json(router.clone(), trusted_request("GET", path)).await;
        assert_eq!(0, payload["code"], "{path}");
        assert_eq!(expected_id, payload["data"]["items"][0]["id"], "{path}");
        assert!(
            payload["data"]["requestId"].as_str().unwrap().len() > 4,
            "{path}"
        );
        assert_ne!("Not implemented", payload["detail"], "{path}");
    }
}

#[tokio::test]
async fn admin_storage_route_exposes_provider_bucket_quota_and_job_commands() {
    let router = sdkwork_clawrouter_router_service::api::admin_storage_router_with_store(Arc::new(
        TestAdminStorageStore,
    ));

    let provider = request_json(
        router.clone(),
        trusted_json_request(
            "POST",
            "/backend/v3/api/storage/providers",
            r#"{"providerCode":"aws-primary","providerType":"aws_s3","region":"us-east-1","endpointUrl":"https://s3.amazonaws.com","credentialRef":"secret://oss/aws-primary","supportsMultipart":true,"supportsLifecycle":true,"supportsObjectLock":false}"#,
        ),
    )
    .await;
    assert_eq!(0, provider["code"].as_i64().unwrap());
    assert_eq!("provider-created", provider["data"]["provider"]["id"]);
    assert_eq!("aws-primary", provider["data"]["provider"]["providerCode"]);

    let provider_update = request_json(
        router.clone(),
        trusted_json_request(
            "PATCH",
            "/backend/v3/api/storage/providers/provider-created",
            r#"{"status":"disabled","reason":"maintenance"}"#,
        ),
    )
    .await;
    assert_eq!(0, provider_update["code"].as_i64().unwrap());
    assert_eq!("disabled", provider_update["data"]["provider"]["status"]);

    let health = request_json(
        router.clone(),
        trusted_empty_request(
            "POST",
            "/backend/v3/api/storage/providers/provider-created/health_check",
        ),
    )
    .await;
    assert_eq!(0, health["code"].as_i64().unwrap());
    assert_eq!("provider-created", health["data"]["providerId"]);
    assert_eq!(true, health["data"]["healthy"]);

    let bucket = request_json(
        router.clone(),
        trusted_json_request(
            "POST",
            "/backend/v3/api/storage/buckets",
            r#"{"bucketName":"tenant-assets","providerId":"provider-created","logicalScope":"tenant_private","objectKeyPrefix":"tenants/{tenantId}/","defaultStorageClass":"STANDARD","defaultEncryptionMode":"sse_s3","publicAccessBlocked":true,"versioningEnabled":true}"#,
        ),
    )
    .await;
    assert_eq!(0, bucket["code"].as_i64().unwrap());
    assert_eq!("bucket-created", bucket["data"]["bucket"]["id"]);
    assert_eq!("tenant-assets", bucket["data"]["bucket"]["bucketName"]);

    let bucket_update = request_json(
        router.clone(),
        trusted_json_request(
            "PATCH",
            "/backend/v3/api/storage/buckets/bucket-created",
            r#"{"status":"archived","reason":"retired"}"#,
        ),
    )
    .await;
    assert_eq!(0, bucket_update["code"].as_i64().unwrap());
    assert_eq!("archived", bucket_update["data"]["bucket"]["status"]);

    let default_bucket = request_json(
        router.clone(),
        trusted_json_request(
            "PATCH",
            "/backend/v3/api/storage/default_buckets/tenant_private",
            r#"{"bucketId":"bucket-created","reason":"default tenant private route"}"#,
        ),
    )
    .await;
    assert_eq!(0, default_bucket["code"].as_i64().unwrap());
    assert_eq!(
        "tenant_private",
        default_bucket["data"]["defaultBucket"]["logicalScope"]
    );

    let quota = request_json(
        router.clone(),
        trusted_json_request(
            "POST",
            "/backend/v3/api/storage/quotas",
            r#"{"scopeType":"organization","scopeId":"20","quotaLimitBytes":1099511627776,"singleFileLimitBytes":10737418240,"enforcement":"hard"}"#,
        ),
    )
    .await;
    assert_eq!(0, quota["code"].as_i64().unwrap());
    assert_eq!("quota-created", quota["data"]["quotaPolicy"]["id"]);
    assert_eq!(
        1099511627776_i64,
        quota["data"]["quotaPolicy"]["quotaLimitBytes"]
    );

    let reconciliation = request_json(
        router.clone(),
        trusted_json_request(
            "POST",
            "/backend/v3/api/storage/reconciliation_runs",
            r#"{"providerId":"provider-created","bucketId":"bucket-created","runType":"metadata","dryRun":true,"reason":"operator check"}"#,
        ),
    )
    .await;
    assert_eq!(0, reconciliation["code"].as_i64().unwrap());
    assert_eq!(
        "reconciliation-created",
        reconciliation["data"]["reconciliationRun"]["id"]
    );

    let gc = request_json(
        router,
        trusted_json_request(
            "POST",
            "/backend/v3/api/storage/gc_jobs",
            r#"{"jobType":"expired_uploads","target":"uploads","dryRun":true,"retentionWindow":"P7D"}"#,
        ),
    )
    .await;
    assert_eq!(0, gc["code"].as_i64().unwrap());
    assert_eq!("gc-created", gc["data"]["job"]["id"]);
}

#[tokio::test]
async fn admin_storage_route_rejects_missing_trusted_subject_before_store_access() {
    let router = sdkwork_clawrouter_router_service::api::admin_storage_router_with_store(Arc::new(
        TestAdminStorageStore,
    ));

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/storage/providers")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40101, payload["code"].as_i64().unwrap());
}

#[derive(Clone)]
struct TestAdminStorageStore;

impl AdminStorageStore for TestAdminStorageStore {
    fn list_providers<'a>(
        &'a self,
        _query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        collection("provider-1", provider_record)
    }

    fn create_provider<'a>(
        &'a self,
        command: CreateStorageProviderCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord> {
        Box::pin(async move {
            assert_eq!("aws-primary", command.supplier_code);
            Ok(provider_record("provider-created"))
        })
    }

    fn update_provider<'a>(
        &'a self,
        command: UpdateStorageProviderCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord> {
        Box::pin(async move {
            assert_eq!("provider-created", command.provider_id);
            let mut item = provider_record("provider-created");
            item.insert("status".to_owned(), json!(command.status));
            Ok(item)
        })
    }

    fn check_provider_health<'a>(
        &'a self,
        command: CheckStorageProviderHealthCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord> {
        Box::pin(async move {
            Ok(record([
                ("providerId", json!(command.provider_id)),
                ("healthy", json!(true)),
                ("status", json!("healthy")),
                ("checkedAt", json!("2026-05-25T00:00:00Z")),
            ]))
        })
    }

    fn list_buckets<'a>(
        &'a self,
        _query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        collection("bucket-1", bucket_record)
    }

    fn create_bucket<'a>(
        &'a self,
        command: CreateStorageBucketCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord> {
        Box::pin(async move {
            assert_eq!("tenant-assets", command.bucket_name);
            Ok(bucket_record("bucket-created"))
        })
    }

    fn update_bucket<'a>(
        &'a self,
        command: UpdateStorageBucketCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord> {
        Box::pin(async move {
            assert_eq!("bucket-created", command.bucket_id);
            let mut item = bucket_record("bucket-created");
            item.insert("status".to_owned(), json!(command.status));
            Ok(item)
        })
    }

    fn list_default_buckets<'a>(
        &'a self,
        _query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        collection("default-tenant-private", default_bucket_record)
    }

    fn set_default_bucket<'a>(
        &'a self,
        command: SetStorageDefaultBucketCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord> {
        Box::pin(async move {
            assert_eq!("tenant_private", command.logical_scope);
            Ok(default_bucket_record("default-tenant-private"))
        })
    }

    fn list_quota_policies<'a>(
        &'a self,
        _query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        collection("quota-1", quota_record)
    }

    fn create_quota_policy<'a>(
        &'a self,
        command: CreateStorageQuotaPolicyCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord> {
        Box::pin(async move {
            assert_eq!("organization", command.scope_type);
            Ok(quota_record("quota-created"))
        })
    }

    fn list_usage_counters<'a>(
        &'a self,
        _query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        collection("usage-1", usage_record)
    }

    fn list_usage_ledger<'a>(
        &'a self,
        _query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        collection("ledger-1", usage_ledger_record)
    }

    fn list_usage_snapshots<'a>(
        &'a self,
        _query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        collection("snapshot-1", usage_snapshot_record)
    }

    fn list_reconciliation_runs<'a>(
        &'a self,
        _query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        collection("reconciliation-1", reconciliation_record)
    }

    fn create_reconciliation_run<'a>(
        &'a self,
        command: CreateStorageReconciliationRunCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord> {
        Box::pin(async move {
            assert_eq!("metadata", command.run_type);
            Ok(reconciliation_record("reconciliation-created"))
        })
    }

    fn list_gc_jobs<'a>(
        &'a self,
        _query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        collection("gc-job-1", gc_record)
    }

    fn create_gc_job<'a>(
        &'a self,
        command: CreateStorageGarbageCollectionJobCommand,
    ) -> AdminStorageCommandFuture<'a, AdminStorageJsonRecord> {
        Box::pin(async move {
            assert_eq!("expired_uploads", command.job_type);
            Ok(gc_record("gc-created"))
        })
    }
}

fn collection<'a>(
    id: &'static str,
    build: fn(&str) -> AdminStorageJsonRecord,
) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
    Box::pin(async move {
        Ok(AdminStorageCollection {
            items: vec![build(id)],
            next_cursor: None,
            request_id: "req-test-storage".to_owned(),
        })
    })
}

fn provider_record(id: &str) -> AdminStorageJsonRecord {
    record([
        ("id", json!(id)),
        ("providerCode", json!("aws-primary")),
        ("providerType", json!("aws_s3")),
        ("region", json!("us-east-1")),
        ("endpointUrl", json!("https://s3.amazonaws.com")),
        ("credentialRef", json!("secret://oss/aws-primary")),
        ("pathStyleEnabled", json!(false)),
        ("supportsMultipart", json!(true)),
        ("supportsLifecycle", json!(true)),
        ("supportsObjectLock", json!(false)),
        ("status", json!("active")),
        ("health", json!("healthy")),
    ])
}

fn bucket_record(id: &str) -> AdminStorageJsonRecord {
    record([
        ("id", json!(id)),
        ("bucketName", json!("tenant-assets")),
        ("logicalScope", json!("tenant_private")),
        ("providerId", json!("provider-created")),
        ("providerCode", json!("aws-primary")),
        ("storageClass", json!("STANDARD")),
        ("defaultStorageClass", json!("STANDARD")),
        ("encryption", json!("sse_s3")),
        ("defaultEncryptionMode", json!("sse_s3")),
        ("status", json!("active")),
    ])
}

fn default_bucket_record(id: &str) -> AdminStorageJsonRecord {
    record([
        ("id", json!(id)),
        ("logicalScope", json!("tenant_private")),
        ("bucketId", json!("bucket-created")),
        ("bucketName", json!("tenant-assets")),
        ("providerId", json!("provider-created")),
        ("providerCode", json!("aws-primary")),
        ("providerType", json!("aws_s3")),
        ("region", json!("us-east-1")),
        ("status", json!("active")),
        ("updatedAt", json!("2026-05-25T00:00:00Z")),
    ])
}

fn quota_record(id: &str) -> AdminStorageJsonRecord {
    record([
        ("id", json!(id)),
        ("scopeType", json!("organization")),
        ("scopeId", json!("20")),
        ("quotaLimitBytes", json!(1099511627776_i64)),
        ("usedBytes", json!(1073741824_i64)),
        ("singleFileLimitBytes", json!(10737418240_i64)),
        ("enforcement", json!("hard")),
        ("status", json!("active")),
    ])
}

fn usage_record(id: &str) -> AdminStorageJsonRecord {
    record([
        ("id", json!(id)),
        ("scopeType", json!("organization")),
        ("scopeId", json!("20")),
        ("scope", json!("organization:20")),
        ("usedBytes", json!(1073741824_i64)),
        ("reservedBytes", json!(0)),
        ("fileCount", json!(42)),
        ("snapshotAt", json!("2026-05-25T00:00:00Z")),
    ])
}

fn usage_ledger_record(id: &str) -> AdminStorageJsonRecord {
    record([
        ("id", json!(id)),
        ("scopeType", json!("user")),
        ("scopeId", json!("30")),
        ("deltaBytes", json!(4096)),
        ("occurredAt", json!("2026-05-25T00:00:00Z")),
    ])
}

fn usage_snapshot_record(id: &str) -> AdminStorageJsonRecord {
    record([
        ("id", json!(id)),
        ("scopeType", json!("tenant")),
        ("scopeId", json!("10")),
        ("scope", json!("tenant:10")),
        ("usedBytes", json!(1073741824_i64)),
        ("reservedBytes", json!(0)),
        ("fileCount", json!(42)),
        ("snapshotAt", json!("2026-05-25T00:00:00Z")),
    ])
}

fn reconciliation_record(id: &str) -> AdminStorageJsonRecord {
    record([
        ("id", json!(id)),
        ("runId", json!(id)),
        ("providerId", json!("provider-created")),
        ("providerCode", json!("aws-primary")),
        ("bucketId", json!("bucket-created")),
        ("bucketName", json!("tenant-assets")),
        ("runType", json!("metadata")),
        ("scope", json!("provider-created/bucket-created")),
        ("issues", json!("0")),
        ("issueCount", json!(0)),
        ("dryRun", json!(true)),
        ("status", json!("created")),
    ])
}

fn gc_record(id: &str) -> AdminStorageJsonRecord {
    record([
        ("id", json!(id)),
        ("jobId", json!(id)),
        ("jobType", json!("expired_uploads")),
        ("target", json!("uploads")),
        ("candidateCount", json!("0")),
        ("retention", json!("P7D")),
        ("dryRun", json!(true)),
        ("status", json!("created")),
    ])
}

fn trusted_request(method: &str, path: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .internal_trusted_subject(100001, 0, 30)
        .body(Body::empty())
        .unwrap()
}

fn trusted_empty_request(method: &str, path: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .internal_trusted_subject(100001, 0, 30)
        .header("X-Request-Id", "req-test-storage")
        .body(Body::empty())
        .unwrap()
}

fn trusted_json_request(method: &str, path: &str, body: &str) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(path)
        .internal_trusted_subject(100001, 0, 30)
        .header("content-type", "application/json")
        .header("Idempotency-Key", "idem-test-storage")
        .header("X-Request-Id", "req-test-storage")
        .body(Body::from(body.to_owned()))
        .unwrap()
}

async fn request_json(router: axum::Router, request: Request<Body>) -> Value {
    let response = router.oneshot(request).await.unwrap();
    assert_eq!(StatusCode::OK, response.status());
    json_payload(response).await
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

fn record(entries: impl IntoIterator<Item = (&'static str, Value)>) -> AdminStorageJsonRecord {
    let mut item = Map::new();
    for (key, value) in entries {
        item.insert(key.to_owned(), value);
    }
    item
}
