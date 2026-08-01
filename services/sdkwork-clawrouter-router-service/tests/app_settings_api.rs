pub mod common;

use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{header, HeaderValue, StatusCode};
use sdkwork_clawrouter_router_service::api::{app_settings_router, app_settings_router_with_store};
use sdkwork_clawrouter_router_service::application::EntityUuidGenerator;
use sdkwork_clawrouter_router_service::domain::{DomainError, DomainResult};
use sdkwork_clawrouter_router_service::ports::{
    SettingsCommandFuture, SettingsData, SettingsNotifications, SettingsReadFuture, SettingsStore,
    SettingsSubject, UpdateSettingsCommand, UpdateSettingsOutcome,
};
use serde_json::{json, Value};
use tower::ServiceExt;

#[tokio::test]
async fn app_settings_reads_and_updates_only_the_authenticated_subject() {
    let store = Arc::new(RecordingSettingsStore::default());
    let router =
        app_settings_router_with_store(store.clone(), Arc::new(SequentialUuidGenerator::default()));

    let read_response = router
        .clone()
        .oneshot(common::web_framework_app_request(
            "GET",
            "/app/v3/api/iam/users/settings",
            Body::empty(),
            "100001",
            Some("30002"),
            "40003",
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, read_response.status());
    let read_payload = json_payload(read_response).await;
    assert_eq!(0, read_payload["code"]);
    assert_eq!("en-US", read_payload["data"]["language"]);
    assert_eq!(
        "https://hooks.example.com/events",
        read_payload["data"]["webhookUrl"]
    );
    assert_eq!(
        Some(SettingsSubject {
            tenant_id: 100_001,
            organization_id: 30_002,
            user_id: 40_003,
        }),
        *store.load_subject.lock().unwrap()
    );

    let update_body = json!({
        "language": "zh-CN",
        "timezone": "Asia/Shanghai",
        "webhookUrl": "https://hooks.example.com/clawrouter",
        "notifications": {
            "billReminder": true,
            "quotaWarning": false,
            "apiMonitor": true
        }
    });
    let update_response = router
        .oneshot(json_request(
            "PUT",
            "/app/v3/api/iam/users/settings",
            update_body,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, update_response.status());
    let update_payload = json_payload(update_response).await;
    assert_eq!(true, update_payload["data"]["success"]);

    let command = store.command.lock().unwrap().clone().unwrap();
    assert_eq!(100_001, command.subject.tenant_id);
    assert_eq!(30_002, command.subject.organization_id);
    assert_eq!(40_003, command.subject.user_id);
    assert_eq!("zh-CN", command.settings.language);
    assert_eq!("Asia/Shanghai", command.settings.timezone);
    assert_eq!(
        "https://hooks.example.com/clawrouter",
        command.settings.webhook_url
    );
    assert!(command.settings.notifications.bill_reminder);
    assert!(!command.settings.notifications.quota_warning);
    assert!(command.settings.notifications.api_monitor);
    assert_ne!(command.preference_uuid, command.webhook_uuid);
}

#[tokio::test]
async fn app_settings_rejects_unknown_or_incomplete_input_before_store_access() {
    for body in [
        json!({
            "language": "en-US",
            "timezone": "UTC",
            "webhookUrl": "",
            "notifications": {
                "billReminder": false,
                "quotaWarning": false,
                "apiMonitor": false
            },
            "tenantId": "another-tenant"
        }),
        json!({
            "language": "en-US",
            "timezone": "UTC",
            "webhookUrl": "",
            "notifications": {
                "billReminder": false,
                "quotaWarning": false
            }
        }),
    ] {
        let store = Arc::new(RecordingSettingsStore::default());
        let response = app_settings_router_with_store(
            store.clone(),
            Arc::new(SequentialUuidGenerator::default()),
        )
        .oneshot(json_request("PUT", "/app/v3/api/iam/users/settings", body))
        .await
        .unwrap();

        assert_eq!(StatusCode::BAD_REQUEST, response.status());
        let payload = json_payload(response).await;
        assert_eq!(40001, payload["code"]);
        assert!(store.command.lock().unwrap().is_none());
    }
}

#[tokio::test]
async fn app_settings_does_not_expose_store_or_identifier_errors() {
    let failing_store = Arc::new(RecordingSettingsStore {
        fail_load: true,
        fail_update: true,
        ..RecordingSettingsStore::default()
    });
    let router =
        app_settings_router_with_store(failing_store, Arc::new(SequentialUuidGenerator::default()));
    let read_response = router
        .clone()
        .oneshot(common::web_framework_app_request(
            "GET",
            "/app/v3/api/iam/users/settings",
            Body::empty(),
            "100001",
            Some("30002"),
            "40003",
        ))
        .await
        .unwrap();
    assert_private_internal_error(read_response).await;

    let update_response = router
        .oneshot(json_request(
            "PUT",
            "/app/v3/api/iam/users/settings",
            valid_update_body(),
        ))
        .await
        .unwrap();
    assert_private_internal_error(update_response).await;

    let uuid_response = app_settings_router_with_store(
        Arc::new(RecordingSettingsStore::default()),
        Arc::new(FailingUuidGenerator),
    )
    .oneshot(json_request(
        "PUT",
        "/app/v3/api/iam/users/settings",
        valid_update_body(),
    ))
    .await
    .unwrap();
    assert_private_internal_error(uuid_response).await;
}

#[tokio::test]
async fn app_settings_without_a_store_fails_closed() {
    let response = app_settings_router()
        .oneshot(common::web_framework_app_request(
            "GET",
            "/app/v3/api/iam/users/settings",
            Body::empty(),
            "100001",
            Some("30002"),
            "40003",
        ))
        .await
        .unwrap();

    assert_private_internal_error(response).await;
}

fn json_request(method: &str, uri: &str, body: Value) -> axum::http::Request<Body> {
    let mut request = common::web_framework_app_request(
        method,
        uri,
        Body::from(serde_json::to_vec(&body).unwrap()),
        "100001",
        Some("30002"),
        "40003",
    );
    request.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    request
}

fn valid_update_body() -> Value {
    json!({
        "language": "en-US",
        "timezone": "UTC",
        "webhookUrl": "",
        "notifications": {
            "billReminder": false,
            "quotaWarning": true,
            "apiMonitor": true
        }
    })
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

async fn assert_private_internal_error(response: axum::response::Response) {
    assert_eq!(StatusCode::INTERNAL_SERVER_ERROR, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(50001, payload["code"]);
    assert_eq!("An internal error occurred", payload["detail"]);
    let body = String::from_utf8_lossy(&body);
    assert!(!body.contains("database-host-secret"));
    assert!(!body.contains("entropy-source-secret"));
}

struct RecordingSettingsStore {
    load_subject: Mutex<Option<SettingsSubject>>,
    command: Mutex<Option<UpdateSettingsCommand>>,
    fail_load: bool,
    fail_update: bool,
}

impl Default for RecordingSettingsStore {
    fn default() -> Self {
        Self {
            load_subject: Mutex::new(None),
            command: Mutex::new(None),
            fail_load: false,
            fail_update: false,
        }
    }
}

impl SettingsStore for RecordingSettingsStore {
    fn load_settings<'a>(&'a self, subject: Option<SettingsSubject>) -> SettingsReadFuture<'a> {
        Box::pin(async move {
            *self.load_subject.lock().unwrap() = subject;
            if self.fail_load {
                return Err(DomainError::new(
                    "database-host-secret must never reach the response",
                ));
            }
            Ok(SettingsData {
                language: "en-US".to_owned(),
                timezone: "UTC".to_owned(),
                webhook_url: "https://hooks.example.com/events".to_owned(),
                notifications: SettingsNotifications {
                    bill_reminder: true,
                    quota_warning: false,
                    api_monitor: true,
                },
            })
        })
    }

    fn update_settings<'a>(&'a self, command: UpdateSettingsCommand) -> SettingsCommandFuture<'a> {
        Box::pin(async move {
            *self.command.lock().unwrap() = Some(command);
            if self.fail_update {
                return Err(DomainError::new(
                    "database-host-secret must never reach the response",
                ));
            }
            Ok(UpdateSettingsOutcome { success: true })
        })
    }
}

#[derive(Default)]
struct SequentialUuidGenerator {
    next: AtomicUsize,
}

impl EntityUuidGenerator for SequentialUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        Ok(format!(
            "settings-uuid-{}",
            self.next.fetch_add(1, Ordering::SeqCst)
        ))
    }
}

struct FailingUuidGenerator;

impl EntityUuidGenerator for FailingUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        Err(DomainError::new(
            "entropy-source-secret must never reach the response",
        ))
    }
}
