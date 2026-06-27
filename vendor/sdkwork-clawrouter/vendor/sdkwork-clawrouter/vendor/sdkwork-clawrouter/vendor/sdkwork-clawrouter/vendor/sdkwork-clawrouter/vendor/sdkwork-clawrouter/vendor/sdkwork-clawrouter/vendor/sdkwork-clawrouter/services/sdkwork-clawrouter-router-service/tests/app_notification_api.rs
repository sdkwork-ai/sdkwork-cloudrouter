mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::domain::{DomainError, DomainResult};
use sdkwork_clawrouter_router_service::ports::{
    AcknowledgeAppNotificationCommand, AppNotificationFuture, AppNotificationItem,
    AppNotificationItems, AppNotificationQuery, AppNotificationStore, AppNotificationSubject,
    MarkAppNotificationPopupSeenCommand,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn app_notification_route_uses_notification_domain_and_store_contract() {
    let store = Arc::new(TestAppNotificationStore::new(vec![AppNotificationItem {
        id: "notification-1".to_owned(),
        app_id: "claw-router".to_owned(),
        title: "Release notice".to_owned(),
        desc: "Release summary".to_owned(),
        content: "Release content".to_owned(),
        time: "2026-05-17 10:00:00".to_owned(),
        message_type: "info".to_owned(),
        read: false,
        show_as_popup: true,
        popup_seen: false,
        archived: false,
        action_url: Some("/console/releases".to_owned()),
    }]));
    let router =
        sdkwork_clawrouter_router_service::api::app_notification_router_with_store(store.clone());

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(
                    "/app/v3/api/notification/notifications?app_id=claw-router&page=1&page_size=20",
                )
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!("notification-1", payload["data"]["items"][0]["id"]);
    assert_eq!("claw-router", payload["data"]["items"][0]["appId"]);
    assert_eq!(true, payload["data"]["items"][0]["showAsPopup"]);
    assert_eq!(false, payload["data"]["items"][0]["popupSeen"]);

    let queries = store.queries.lock().unwrap();
    assert_eq!(
        vec![AppNotificationQuery {
            subject: AppNotificationSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
            },
            app_id: "claw-router".to_owned(),
            include_archived: false,
            page: 1,
            page_size: 20,
        }],
        *queries
    );
}

#[tokio::test]
async fn app_notification_route_allows_console_reads_without_frontend_app_id() {
    let store = Arc::new(TestAppNotificationStore::new(vec![AppNotificationItem {
        id: "global-notification".to_owned(),
        app_id: "default".to_owned(),
        title: "Global notice".to_owned(),
        desc: "Global summary".to_owned(),
        content: "Global content".to_owned(),
        time: "2026-05-17 10:00:00".to_owned(),
        message_type: "info".to_owned(),
        read: false,
        show_as_popup: true,
        popup_seen: false,
        archived: false,
        action_url: None,
    }]));
    let router =
        sdkwork_clawrouter_router_service::api::app_notification_router_with_store(store.clone());

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/notification/notifications?page=1&page_size=20")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!("global-notification", payload["data"]["items"][0]["id"]);

    let queries = store.queries.lock().unwrap();
    assert_eq!(
        vec![AppNotificationQuery {
            subject: AppNotificationSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
            },
            app_id: "default".to_owned(),
            include_archived: false,
            page: 1,
            page_size: 20,
        }],
        *queries
    );
}

#[tokio::test]
async fn app_notification_commands_mark_popup_seen_for_trusted_subject() {
    let store = Arc::new(TestAppNotificationStore::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_notification_router_with_store(store.clone());

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/notification/notifications/notification-1/popup_seen?app_id=claw-router")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!(true, payload["data"]["updated"]);
    assert_eq!("popup_seen", payload["data"]["state"]);

    assert_eq!(
        vec![MarkAppNotificationPopupSeenCommand {
            subject: AppNotificationSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
            },
            app_id: "claw-router".to_owned(),
            notification_id: "notification-1".to_owned(),
        }],
        *store.popup_seen_commands.lock().unwrap()
    );
}

#[tokio::test]
async fn app_notification_rejects_noncanonical_popup_seen_route() {
    let store = Arc::new(TestAppNotificationStore::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_notification_router_with_store(store.clone());

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/notification/notifications/notification-1/popup-seen?app_id=claw-router")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_FOUND, response.status());
    assert!(
        store.popup_seen_commands.lock().unwrap().is_empty(),
        "noncanonical notification popup route must not write delivery state"
    );
}

#[tokio::test]
async fn app_notification_acknowledge_marks_read_and_popup_seen_for_trusted_subject() {
    let store = Arc::new(TestAppNotificationStore::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_notification_router_with_store(store.clone());

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/notification/notifications/notification-1/acknowledge?app_id=claw-router")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!(true, payload["data"]["updated"]);
    assert_eq!("acknowledged", payload["data"]["state"]);
    assert_eq!(
        vec![AcknowledgeAppNotificationCommand {
            subject: AppNotificationSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
            },
            app_id: "claw-router".to_owned(),
            notification_id: "notification-1".to_owned(),
        }],
        *store.acknowledge_commands.lock().unwrap()
    );
    assert!(
        store.popup_seen_commands.lock().unwrap().is_empty(),
        "acknowledge must be one semantic store command, not a frontend-driven popup write"
    );
}

#[tokio::test]
async fn app_notification_route_rejects_missing_subject_and_invalid_notification_id() {
    let store = Arc::new(TestAppNotificationStore::new(Vec::new()));
    let router = sdkwork_clawrouter_router_service::api::app_notification_router_with_store(store);

    let missing_subject_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/notification/notifications")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::UNAUTHORIZED, missing_subject_response.status());

    let invalid_id_response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/notification/notifications/bad%2Fid/acknowledge")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, invalid_id_response.status());
}

#[derive(Debug)]
struct TestAppNotificationStore {
    items: Vec<AppNotificationItem>,
    queries: Mutex<Vec<AppNotificationQuery>>,
    acknowledge_commands: Mutex<Vec<AcknowledgeAppNotificationCommand>>,
    popup_seen_commands: Mutex<Vec<MarkAppNotificationPopupSeenCommand>>,
}

impl TestAppNotificationStore {
    fn new(items: Vec<AppNotificationItem>) -> Self {
        Self {
            items,
            queries: Mutex::new(Vec::new()),
            acknowledge_commands: Mutex::new(Vec::new()),
            popup_seen_commands: Mutex::new(Vec::new()),
        }
    }
}

impl AppNotificationStore for TestAppNotificationStore {
    fn list_notifications<'a>(
        &'a self,
        query: AppNotificationQuery,
    ) -> AppNotificationFuture<'a, AppNotificationItems> {
        Box::pin(async move {
            self.queries.lock().unwrap().push(query);
            Ok(AppNotificationItems::new(self.items.clone()))
        })
    }

    fn mark_popup_seen<'a>(
        &'a self,
        command: MarkAppNotificationPopupSeenCommand,
    ) -> AppNotificationFuture<'a, ()> {
        Box::pin(async move {
            self.popup_seen_commands.lock().unwrap().push(command);
            Ok(())
        })
    }

    fn acknowledge<'a>(
        &'a self,
        command: AcknowledgeAppNotificationCommand,
    ) -> AppNotificationFuture<'a, ()> {
        Box::pin(async move {
            self.acknowledge_commands.lock().unwrap().push(command);
            Ok(())
        })
    }
}

async fn response_json(response: axum::response::Response) -> Value {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&bytes).unwrap()
}

#[allow(dead_code)]
fn assert_store_send_sync() {
    fn require_send_sync<T: Send + Sync>() {}
    require_send_sync::<TestAppNotificationStore>();
    let _ = DomainError::new("keeps DomainResult imported for trait signatures");
    let _: Option<DomainResult<()>> = None;
}
