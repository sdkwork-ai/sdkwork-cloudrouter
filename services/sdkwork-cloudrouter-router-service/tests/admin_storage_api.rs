pub mod common;

use common::InternalTrustedSubjectHeaders;
use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_cloudrouter_router_service::ports::{
    AdminStorageCollection, AdminStorageCommandFuture, AdminStorageCursor, AdminStorageJsonRecord,
    AdminStorageStore,
    CreateStorageGarbageCollectionJobCommand,
    CreateStorageQuotaPolicyCommand, CreateStorageReconciliationRunCommand, ListAdminStorageRecordsQuery,
    SetStorageDefaultBucketCommand,
};
use serde_json::{json, Map, Value};
use tower::ServiceExt;

#[tokio::test]
async fn admin_storage_route_exposes_complete_oss_management_center() {
    let router = sdkwork_cloudrouter_router_service::api::admin_storage_router_with_store(
        Arc::new(TestAdminStorageStore),
    );

    for (path, expected_id) in [
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
            "/backend/v3/api/storage/reconciliation_runs?run_type=metadata&status=created",
            "reconciliation-1",
        ),
        ("/backend/v3/api/storage/gc_jobs?status=created", "gc-job-1"),
    ] {
        let payload = request_json(router.clone(), trusted_request("GET", path)).await;
        assert_eq!(0, payload["code"], "{path}");
        assert_eq!(expected_id, payload["data"]["items"][0]["id"], "{path}");
        assert!(payload["traceId"].as_str().unwrap().len() > 4, "{path}");
        assert_eq!("cursor", payload["data"]["pageInfo"]["mode"], "{path}");
        assert_eq!(20, payload["data"]["pageInfo"]["pageSize"], "{path}");
        assert_ne!("Not implemented", payload["detail"], "{path}");
    }
}

#[tokio::test]
async fn admin_storage_cursor_pages_are_opaque_and_do_not_skip_rows() {
    let router = sdkwork_cloudrouter_router_service::api::admin_storage_router_with_store(
        Arc::new(TestAdminStorageStore),
    );
    let mut path = "/backend/v3/api/storage/default_buckets?page_size=1".to_owned();
    let mut ids = Vec::new();

    for expected_has_more in [true, true, false] {
        let payload = request_json(router.clone(), trusted_request("GET", &path)).await;
        ids.push(
            payload["data"]["items"][0]["id"]
                .as_str()
                .unwrap()
                .to_owned(),
        );
        assert_eq!("cursor", payload["data"]["pageInfo"]["mode"]);
        assert_eq!(1, payload["data"]["pageInfo"]["pageSize"]);
        assert_eq!(expected_has_more, payload["data"]["pageInfo"]["hasMore"]);

        if expected_has_more {
            let cursor = payload["data"]["pageInfo"]["nextCursor"]
                .as_str()
                .expect("next page cursor");
            assert_ne!(ids.last().unwrap(), cursor);
            assert!(cursor.chars().all(
                |character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_')
            ));
            path = format!("/backend/v3/api/storage/default_buckets?page_size=1&cursor={cursor}");
        } else {
            assert!(payload["data"]["pageInfo"]["nextCursor"].is_null());
        }
    }

    assert_eq!(vec!["5", "4", "3"], ids);
}

#[tokio::test]
async fn admin_storage_list_rejects_pagination_aliases_and_plain_cursors() {
    let router = sdkwork_cloudrouter_router_service::api::admin_storage_router_with_store(
        Arc::new(TestAdminStorageStore),
    );

    for (key, value) in [
        ("pageSize", "1"),
        ("limit", "1"),
        ("page", "1"),
        ("cursor", "5"),
    ] {
        let query = format!("{key}={value}");
        let response = router
            .clone()
            .oneshot(trusted_request(
                "GET",
                &format!("/backend/v3/api/storage/default_buckets?{query}"),
            ))
            .await
            .unwrap();
        assert_eq!(StatusCode::BAD_REQUEST, response.status(), "query: {query}");
        let payload = json_payload(response).await;
        assert_eq!(40003, payload["code"].as_i64().unwrap(), "query: {query}");
    }
}

#[tokio::test]
async fn admin_storage_route_exposes_governance_commands() {
    let router = sdkwork_cloudrouter_router_service::api::admin_storage_router_with_store(
        Arc::new(TestAdminStorageStore),
    );

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
            r#"{"scopeType":"organization","scopeId":"20","quotaLimitBytes":"1099511627776","singleFileLimitBytes":"10737418240","enforcement":"hard"}"#,
        ),
    )
    .await;
    assert_eq!(0, quota["code"].as_i64().unwrap());
    assert_eq!("quota-created", quota["data"]["quotaPolicy"]["id"]);
    assert_eq!(
        "1099511627776",
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
    let router = sdkwork_cloudrouter_router_service::api::admin_storage_router_with_store(
        Arc::new(TestAdminStorageStore),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/storage/default_buckets")
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
    fn list_default_buckets<'a>(
        &'a self,
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        if query.limit != 1 {
            return collection("default-tenant-private", default_bucket_record, query.limit, None);
        }
        match query.cursor.map(AdminStorageCursor::id) {
            None => collection(
                "5",
                default_bucket_record,
                query.limit,
                AdminStorageCursor::new(5),
            ),
            Some(5) => collection(
                "4",
                default_bucket_record,
                query.limit,
                AdminStorageCursor::new(4),
            ),
            Some(4) => collection("3", default_bucket_record, query.limit, None),
            Some(_) => collection("2", default_bucket_record, query.limit, None),
        }
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
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        collection("quota-1", quota_record, query.limit, None)
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
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        collection("usage-1", usage_record, query.limit, None)
    }

    fn list_reconciliation_runs<'a>(
        &'a self,
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        collection("reconciliation-1", reconciliation_record, query.limit, None)
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
        query: ListAdminStorageRecordsQuery,
    ) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
        collection("gc-job-1", gc_record, query.limit, None)
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
    page_size: i64,
    next_cursor: Option<AdminStorageCursor>,
) -> AdminStorageCommandFuture<'a, AdminStorageCollection> {
    Box::pin(async move {
        Ok(AdminStorageCollection {
            items: vec![build(id)],
            next_cursor,
            page_size,
            request_id: "req-test-storage".to_owned(),
        })
    })
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
        ("reason", json!("default tenant private route")),
        ("status", json!("active")),
        ("updatedAt", json!("2026-05-25T00:00:00Z")),
    ])
}

fn quota_record(id: &str) -> AdminStorageJsonRecord {
    record([
        ("id", json!(id)),
        ("scopeType", json!("organization")),
        ("scopeId", json!("20")),
        ("quotaLimitBytes", json!("1099511627776")),
        ("usedBytes", json!("1073741824")),
        ("singleFileLimitBytes", json!("10737418240")),
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
        ("usedBytes", json!("1073741824")),
        ("reservedBytes", json!("0")),
        ("fileCount", json!("42")),
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
        ("issueCount", json!("0")),
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
