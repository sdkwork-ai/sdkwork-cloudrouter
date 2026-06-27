use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use serde_json::{json, Value};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tower::ServiceExt;

mod common;

use common::InternalTrustedSubjectHeaders;
use sdkwork_clawrouter_router_service::application::EntityUuidGenerator;
use sdkwork_clawrouter_router_service::domain::DomainResult;
use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteRuntimeRegionSettingsStore;
use sdkwork_clawrouter_router_service::ports::{
    GetRuntimeRegionSettingsQuery, GetRuntimeRegionSettingsScopeQuery, RuntimeRegionSettings,
    RuntimeRegionSettingsFuture, RuntimeRegionSettingsStore, UpdateRuntimeRegionSettingsCommand,
};

const SETTINGS_PATH: &str = "/backend/v3/api/system/runtime_region/settings";

#[tokio::test]
async fn admin_runtime_region_settings_default_to_china_and_persist_updates() {
    let pool = sqlx::sqlite::SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_config_tables(&pool).await;

    let router =
        sdkwork_clawrouter_router_service::api::admin_runtime_region_settings_router_with_store(
            Arc::new(SqliteRuntimeRegionSettingsStore::new(pool.clone())),
            Arc::new(TestUuidGenerator::default()),
        );

    let initial = request_json(router.clone(), request(Method::GET, SETTINGS_PATH, None)).await;
    assert_eq!("2000", initial["code"]);
    assert_eq!("cn", initial["data"]["currentRegionCode"]);
    assert_eq!("China", initial["data"]["currentRegionName"]);

    let updated = request_json(
        router.clone(),
        request(
            Method::PATCH,
            SETTINGS_PATH,
            Some(json!({
                "currentRegionCode": "us",
                "currentRegionName": "United States",
                "remark": "Route default traffic to the US runtime cell."
            })),
        ),
    )
    .await;
    assert_eq!("2000", updated["code"]);
    assert_eq!("us", updated["data"]["currentRegionCode"]);
    assert_eq!("United States", updated["data"]["currentRegionName"]);

    let reloaded = request_json(router, request(Method::GET, SETTINGS_PATH, None)).await;
    assert_eq!("2000", reloaded["code"]);
    assert_eq!("us", reloaded["data"]["currentRegionCode"]);
    assert_eq!("United States", reloaded["data"]["currentRegionName"]);

    let snapshot_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ops_config_snapshot WHERE source_table = 'ops_runtime_region_settings'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1, snapshot_count);
}

#[tokio::test]
async fn admin_runtime_region_settings_reject_invalid_region_code() {
    let pool = sqlx::sqlite::SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_config_tables(&pool).await;

    let router =
        sdkwork_clawrouter_router_service::api::admin_runtime_region_settings_router_with_store(
            Arc::new(SqliteRuntimeRegionSettingsStore::new(pool)),
            Arc::new(TestUuidGenerator::default()),
        );

    let response = router
        .oneshot(request(
            Method::PATCH,
            SETTINGS_PATH,
            Some(json!({ "currentRegionCode": "CN/North" })),
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = response_json(response).await;
    assert_eq!("4001", payload["code"]);
    assert!(payload["msg"]
        .as_str()
        .unwrap()
        .contains("currentRegionCode must be a lowercase region code"));
}

#[tokio::test]
async fn admin_runtime_region_settings_cache_is_scoped_by_tenant_and_organization() {
    let store = Arc::new(CountingRuntimeRegionSettingsStore::default());
    let router =
        sdkwork_clawrouter_router_service::api::admin_runtime_region_settings_router_with_store(
            store.clone(),
            Arc::new(TestUuidGenerator::default()),
        );

    let first = request_json(
        router.clone(),
        request_for_subject(Method::GET, SETTINGS_PATH, None, 100001, 0, 30),
    )
    .await;
    assert_eq!("cn", first["data"]["currentRegionCode"]);

    let second = request_json(
        router.clone(),
        request_for_subject(Method::GET, SETTINGS_PATH, None, 11, 21, 31),
    )
    .await;
    assert_eq!("cn", second["data"]["currentRegionCode"]);

    let third = request_json(
        router,
        request_for_subject(Method::GET, SETTINGS_PATH, None, 100001, 0, 30),
    )
    .await;
    assert_eq!("cn", third["data"]["currentRegionCode"]);

    assert_eq!(
        vec![(10, 20), (11, 21)],
        store.load_calls(),
        "runtime region settings cache must retain each tenant and organization entry independently",
    );
}

#[derive(Default)]
struct TestUuidGenerator {
    next: AtomicUsize,
}

impl EntityUuidGenerator for TestUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        let value = self.next.fetch_add(1, Ordering::SeqCst) + 1;
        Ok(format!("runtime-region-test-{value}"))
    }
}

#[derive(Default)]
struct CountingRuntimeRegionSettingsStore {
    load_calls: std::sync::Mutex<Vec<(i64, i64)>>,
}

impl CountingRuntimeRegionSettingsStore {
    fn load_calls(&self) -> Vec<(i64, i64)> {
        self.load_calls.lock().unwrap().clone()
    }
}

impl RuntimeRegionSettingsStore for CountingRuntimeRegionSettingsStore {
    fn get_runtime_region_settings<'a>(
        &'a self,
        query: GetRuntimeRegionSettingsQuery,
    ) -> RuntimeRegionSettingsFuture<'a, RuntimeRegionSettings> {
        Box::pin(async move {
            self.load_calls
                .lock()
                .unwrap()
                .push((query.subject.tenant_id, query.subject.organization_id));
            Ok(RuntimeRegionSettings::default())
        })
    }

    fn get_runtime_region_settings_for_scope<'a>(
        &'a self,
        _query: GetRuntimeRegionSettingsScopeQuery,
    ) -> RuntimeRegionSettingsFuture<'a, RuntimeRegionSettings> {
        Box::pin(async move { Ok(RuntimeRegionSettings::default()) })
    }

    fn update_runtime_region_settings<'a>(
        &'a self,
        command: UpdateRuntimeRegionSettingsCommand,
    ) -> RuntimeRegionSettingsFuture<'a, RuntimeRegionSettings> {
        Box::pin(async move { Ok(command.settings) })
    }
}

fn request(method: Method, path: &str, body: Option<Value>) -> Request<Body> {
    request_for_subject(method, path, body, 100001, 0, 30)
}

fn request_for_subject(
    method: Method,
    path: &str,
    body: Option<Value>,
    tenant_id: i64,
    organization_id: i64,
    operator_id: i64,
) -> Request<Body> {
    let mut builder = Request::builder()
        .method(method)
        .uri(path)
        .internal_trusted_subject(tenant_id, organization_id, operator_id);
    if body.is_some() {
        builder = builder.header("content-type", "application/json");
    }
    builder
        .body(
            body.map(|value| Body::from(value.to_string()))
                .unwrap_or_else(Body::empty),
        )
        .unwrap()
}

async fn request_json(router: axum::Router, request: Request<Body>) -> Value {
    let response = router.oneshot(request).await.unwrap();
    assert_eq!(StatusCode::OK, response.status());
    response_json(response).await
}

async fn response_json(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

async fn create_config_tables(pool: &sqlx::SqlitePool) {
    sqlx::query(
        r#"
        CREATE TABLE ops_config_snapshot (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER,
            request_id TEXT,
            status INTEGER NOT NULL,
            snapshot_no TEXT NOT NULL,
            config_scope INTEGER,
            config_type INTEGER,
            source_table TEXT,
            source_ids TEXT,
            config_payload TEXT,
            config_hash TEXT,
            published_at TEXT,
            published_by INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        CREATE TABLE ops_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            target_type INTEGER,
            target_id INTEGER,
            request_id TEXT,
            operator_id INTEGER,
            operator_type INTEGER,
            change_summary TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}
