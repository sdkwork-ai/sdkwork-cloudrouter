//! HTTP contract tests for the app-api user model → account-group surface.
//!
//! These exercise the real router (subject extraction, query/body parsing,
//! envelope, problem responses) with a recording store, so the contract the
//! BirdCoder picker calls is pinned independently of PostgreSQL.

use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_cloudrouter_http::TrustedRequestSubject;
use sdkwork_cloudrouter_router_service::api::app_model_group_router;
use sdkwork_cloudrouter_router_service::domain::{
    AccountGroupRouteScope, DomainError, ModelGroupCatalogModality, ModelGroupOption,
};
use sdkwork_cloudrouter_router_service::ports::{
    AppModelGroupCatalogQuery, AppModelGroupDefaultItem, AppModelGroupFuture, AppModelGroupStore,
    AppModelGroupSubject, SetAppModelGroupDefaultCommand,
};
use tower::ServiceExt;

const ROUTE_GROUPS: &str = "/app/v3/api/ai/routing/model_groups";
const ROUTE_DEFAULTS: &str = "/app/v3/api/ai/routing/model_group_defaults";
const MODEL: &str = "deepseek/deepseek-flash";

fn subject() -> TrustedRequestSubject {
    TrustedRequestSubject {
        tenant_id: 100_001,
        organization_id: 0,
        user_id: 7,
        operator_id: 7,
        operator_type: 1,
    }
}

fn group(code: &str, selected: bool) -> ModelGroupOption {
    ModelGroupOption {
        group_id: if code == "cheap" { 1 } else { 2 },
        group_code: code.to_owned(),
        group_name: if code == "cheap" { "Cheap pool" } else { "Premium pool" }.to_owned(),
        is_default: code == "cheap",
        selected,
    }
}

#[derive(Default)]
struct RecordingStore {
    groups: Option<Vec<ModelGroupOption>>,
    defaults: Vec<AppModelGroupDefaultItem>,
    writes: Mutex<Vec<SetAppModelGroupDefaultCommand>>,
    fail: bool,
}

impl RecordingStore {
    fn answering() -> Self {
        Self {
            groups: Some(vec![group("cheap", true), group("premium", false)]),
            defaults: vec![AppModelGroupDefaultItem {
                scope: AccountGroupRouteScope::Model,
                modality: "text".to_owned(),
                vendor_code: "deepseek".to_owned(),
                model: MODEL.to_owned(),
                account_group_id: 1,
                account_group_code: "cheap".to_owned(),
                account_group_name: "Cheap pool".to_owned(),
                priority: 0,
            }],
            ..Self::default()
        }
    }
}

impl AppModelGroupStore for RecordingStore {
    fn load_model_group_catalog<'a>(
        &'a self,
        _subject: AppModelGroupSubject,
        _query: AppModelGroupCatalogQuery,
    ) -> AppModelGroupFuture<'a, Vec<ModelGroupCatalogModality>> {
        Box::pin(async move {
            if self.fail {
                return Err(DomainError::new("catalog offline"));
            }
            Ok(Vec::new())
        })
    }

    fn load_model_groups<'a>(
        &'a self,
        _subject: AppModelGroupSubject,
        model: String,
    ) -> AppModelGroupFuture<'a, Option<Vec<ModelGroupOption>>> {
        Box::pin(async move {
            if self.fail {
                return Err(DomainError::new("store offline"));
            }
            if model == "unknown/model" {
                return Ok(None);
            }
            Ok(self.groups.clone())
        })
    }

    fn set_model_group_default<'a>(
        &'a self,
        _subject: AppModelGroupSubject,
        command: SetAppModelGroupDefaultCommand,
    ) -> AppModelGroupFuture<'a, ()> {
        Box::pin(async move {
            if self.fail {
                return Err(DomainError::new("store offline"));
            }
            self.writes.lock().expect("write log").push(command);
            Ok(())
        })
    }

    fn list_model_group_defaults<'a>(
        &'a self,
        _subject: AppModelGroupSubject,
    ) -> AppModelGroupFuture<'a, Vec<AppModelGroupDefaultItem>> {
        Box::pin(async move {
            if self.fail {
                return Err(DomainError::new("store offline"));
            }
            Ok(self.defaults.clone())
        })
    }
}

async fn send(
    store: Arc<RecordingStore>,
    request: Request<Body>,
) -> (StatusCode, serde_json::Value) {
    let response = app_model_group_router(store)
        .oneshot(request)
        .await
        .expect("router answers");
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body");
    (status, serde_json::from_slice(&body).expect("json body"))
}

fn get(uri: &str) -> Request<Body> {
    Request::builder()
        .method("GET")
        .uri(uri)
        .extension(subject())
        .body(Body::empty())
        .expect("request")
}

fn put(body: &str) -> Request<Body> {
    Request::builder()
        .method("PUT")
        .uri(ROUTE_DEFAULTS)
        .header("content-type", "application/json")
        .extension(subject())
        .body(Body::from(body.to_owned()))
        .expect("request")
}

#[tokio::test]
async fn lists_the_groups_that_serve_one_model() {
    let store = Arc::new(RecordingStore::answering());
    let (status, payload) = send(store, get(&format!("{ROUTE_GROUPS}?model=deepseek%2Fdeepseek-flash"))).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(payload["code"], 0);
    assert_eq!(payload["data"]["item"]["model"], MODEL);
    let groups = payload["data"]["item"]["groups"].as_array().expect("groups");
    assert_eq!(groups.len(), 2);
    assert_eq!(groups[0]["groupCode"], "cheap");
    assert_eq!(groups[0]["selected"], true);
    assert_eq!(groups[1]["groupCode"], "premium");
    assert_eq!(groups[1]["selected"], false);
}

#[tokio::test]
async fn rejects_a_missing_model_and_an_unknown_model() {
    let store = Arc::new(RecordingStore::answering());
    let (status, payload) = send(store.clone(), get(ROUTE_GROUPS)).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(payload["code"], 40001);

    let (status, payload) = send(store, get(&format!("{ROUTE_GROUPS}?model=unknown%2Fmodel"))).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    assert!(payload["detail"].as_str().is_some());
}

#[tokio::test]
async fn lists_the_callers_stored_rules() {
    let (status, payload) = send(Arc::new(RecordingStore::answering()), get(ROUTE_DEFAULTS)).await;
    assert_eq!(status, StatusCode::OK);
    let defaults = payload["data"]["item"]["defaults"].as_array().expect("defaults");
    assert_eq!(defaults.len(), 1);
    assert_eq!(defaults[0]["scope"], "model");
    assert_eq!(defaults[0]["model"], MODEL);
    assert_eq!(defaults[0]["accountGroupCode"], "cheap");
    assert_eq!(defaults[0]["accountGroupName"], "Cheap pool");
    assert_eq!(defaults[0]["priority"], 0);
}

#[tokio::test]
async fn accepts_the_camel_case_write_body_and_answers_accepted() {
    let store = Arc::new(RecordingStore::answering());
    let body = format!(
        r#"{{"scope":"model","model":"{MODEL}","vendorCode":"deepseek","accountGroups":["premium"]}}"#
    );
    let (status, payload) = send(store.clone(), put(&body)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(payload["data"]["accepted"], true);
    let writes = store.writes.lock().expect("writes");
    assert_eq!(writes.len(), 1);
    assert_eq!(writes[0].scope, AccountGroupRouteScope::Model);
    assert_eq!(writes[0].model, MODEL);
    assert_eq!(writes[0].vendor_code, "deepseek");
    assert_eq!(writes[0].account_groups, vec!["premium".to_owned()]);
}

#[tokio::test]
async fn clears_the_scope_with_an_empty_group_list() {
    let store = Arc::new(RecordingStore::answering());
    let body = format!(r#"{{"scope":"model","model":"{MODEL}","accountGroups":[]}}"#);
    let (status, _payload) = send(store.clone(), put(&body)).await;
    assert_eq!(status, StatusCode::OK);
    let writes = store.writes.lock().expect("writes");
    assert!(writes[0].account_groups.is_empty());
    assert_eq!(writes[0].vendor_code, "");
}

#[tokio::test]
async fn rejects_an_unknown_scope_and_an_invalid_body() {
    let store = Arc::new(RecordingStore::answering());
    let body = format!(r#"{{"scope":"tenant","model":"{MODEL}"}}"#);
    let (status, payload) = send(store.clone(), put(&body)).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(payload["code"], 40001);
    assert!(store.writes.lock().expect("writes").is_empty());

    let (status, payload) = send(store, put("{not-json")).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(payload["code"], 40001);
}

#[tokio::test]
async fn requires_an_authenticated_subject() {
    let request = Request::builder()
        .method("GET")
        .uri(format!("{ROUTE_GROUPS}?model=deepseek%2Fdeepseek-flash"))
        .body(Body::empty())
        .expect("request");
    let response = app_model_group_router(Arc::new(RecordingStore::answering()))
        .oneshot(request)
        .await
        .expect("router answers");
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn reports_store_failures_as_problems() {
    let store = Arc::new(RecordingStore { fail: true, ..RecordingStore::default() });
    let (status, payload) = send(store, get(&format!("{ROUTE_GROUPS}?model=deepseek%2Fdeepseek-flash"))).await;
    assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);
    assert_eq!(payload["code"], 50001);
    // Internal store diagnostics never reach the caller.
    assert_eq!(payload["detail"], "An internal error occurred");
}
