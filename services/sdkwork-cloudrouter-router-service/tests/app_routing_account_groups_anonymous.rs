//! Anonymous catalog browsing on `routing.accountGroups.list`.
//!
//! The route declares `dual-token-or-anonymous`: signed-out portal visitors
//! (model catalog sale multipliers) must not be gated, while signed-in callers
//! keep their own tenant-scoped projection including per-key `authorized`
//! flags. These tests pin both halves of that contract at the handler layer.

pub mod common;

use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::StatusCode;
use sdkwork_cloudrouter_router_service::ports::{
    AppRoutingAccountGroupListPage, AppRoutingApiKeyListPage, AppRoutingListQuery,
    AppRoutingReadFuture, AppRoutingReadStore, AppRoutingRequestTraceListPage, AppRoutingSubject,
    AppRoutingTraceQuery, AppRoutingUsageSnapshot,
};
use sdkwork_cloudrouter_router_service::{api, ports};
use serde_json::Value;
use tower::ServiceExt;

#[derive(Default)]
struct CapturingRoutingStore {
    account_groups_subjects: Mutex<Vec<Option<AppRoutingSubject>>>,
}

impl CapturingRoutingStore {
    fn last_account_groups_subject(&self) -> Option<AppRoutingSubject> {
        self.account_groups_subjects
            .lock()
            .expect("capture mutex")
            .last()
            .copied()
            .flatten()
    }
}

impl AppRoutingReadStore for CapturingRoutingStore {
    fn load_routing_account_groups<'a>(
        &'a self,
        subject: Option<AppRoutingSubject>,
        query: AppRoutingListQuery,
        _locale: Option<&'a str>,
    ) -> AppRoutingReadFuture<'a, AppRoutingAccountGroupListPage> {
        self.account_groups_subjects
            .lock()
            .expect("capture mutex")
            .push(subject);
        Box::pin(async move {
            Ok(AppRoutingAccountGroupListPage {
                items: Vec::new(),
                total: 0,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn load_routing_api_keys<'a>(
        &'a self,
        _subject: Option<AppRoutingSubject>,
        query: AppRoutingListQuery,
        _locale: Option<&'a str>,
    ) -> AppRoutingReadFuture<'a, AppRoutingApiKeyListPage> {
        Box::pin(async move {
            Ok(AppRoutingApiKeyListPage {
                items: Vec::new(),
                total: 0,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn load_routing_request_traces<'a>(
        &'a self,
        _subject: Option<AppRoutingSubject>,
        _query: AppRoutingTraceQuery,
        _locale: Option<&'a str>,
    ) -> AppRoutingReadFuture<'a, AppRoutingRequestTraceListPage> {
        Box::pin(async move {
            Ok(AppRoutingRequestTraceListPage {
                items: Vec::new(),
                next_cursor: None,
                has_more: false,
                page_size: 20,
            })
        })
    }

    fn load_routing_usage<'a>(
        &'a self,
        _subject: Option<AppRoutingSubject>,
    ) -> AppRoutingReadFuture<'a, AppRoutingUsageSnapshot> {
        Box::pin(async { Ok(AppRoutingUsageSnapshot::default()) })
    }
}

/// Tenant scope the deployment resolves for anonymous catalog readers: the
/// configured deployment tenant (`SDKWORK_RTC_HYDRATE_TENANT_ID`) or the
/// canonical deployment tenant, with organization 0 and no user.
fn expected_anonymous_subject() -> AppRoutingSubject {
    let tenant_id = std::env::var("SDKWORK_RTC_HYDRATE_TENANT_ID")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or(100_001);
    AppRoutingSubject {
        tenant_id,
        organization_id: 0,
        user_id: 0,
    }
}

fn capture_store() -> Arc<CapturingRoutingStore> {
    Arc::new(CapturingRoutingStore::default())
}

#[tokio::test]
async fn anonymous_account_groups_request_browses_without_credentials() {
    let store = capture_store();
    let router = api::app_routing_router_with_read_store(store.clone());

    let response = router
        .oneshot(common::web_framework_app_request_without_subject(
            "GET",
            "/app/v3/api/ai/routing/account_groups",
            Body::empty(),
        ))
        .await
        .expect("response");

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), 64 * 1024)
        .await
        .expect("body");
    let envelope: Value = serde_json::from_slice(&body).expect("envelope");
    assert_eq!(Value::from(0), envelope["code"]);
    assert_eq!(
        Some(expected_anonymous_subject()),
        store.last_account_groups_subject()
    );
}

#[tokio::test]
async fn signed_in_account_groups_request_keeps_caller_tenant_scope() {
    let store = capture_store();
    let router = api::app_routing_router_with_read_store(store.clone());

    let response = router
        .oneshot(common::web_framework_app_request(
            "GET",
            "/app/v3/api/ai/routing/account_groups",
            Body::empty(),
            "200002",
            Some("300003"),
            "40",
        ))
        .await
        .expect("response");

    assert_eq!(StatusCode::OK, response.status());
    assert_eq!(
        Some(AppRoutingSubject {
            tenant_id: 200_002,
            organization_id: 300_003,
            user_id: 40,
        }),
        store.last_account_groups_subject()
    );
}
