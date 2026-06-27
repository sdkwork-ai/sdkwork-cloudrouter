mod common;
use common::missing_internal_tenant_header_message;
use common::InternalTrustedSubjectHeaders;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::application::EntityUuidGenerator;
use sdkwork_clawrouter_router_service::domain::DomainResult;
use sdkwork_clawrouter_router_service::ports::{
    AdminAnnouncementCommandFuture, AdminAnnouncementItem, AdminAnnouncementStore,
    CreateAdminAnnouncementCommand, DeleteAdminAnnouncementCommand, ListAdminAnnouncementsQuery,
    UpdateAdminAnnouncementCommand,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn admin_announcement_route_creates_lists_updates_and_soft_deletes_items() {
    let store = Arc::new(TestAnnouncementStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_announcement_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let create_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/content/announcements")
                .header("content-type", "application/json")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::from(
                    r#"{"title":"Gateway maintenance","target":"all","status":"draft","showAsPopup":true,"content":"Maintenance window at 23:00 UTC"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, create_response.status());
    let create_payload = json_payload(create_response).await;
    assert_eq!("2000", create_payload["code"]);
    assert_eq!(
        "Gateway maintenance",
        create_payload["data"]["item"]["title"]
    );
    assert_eq!("all", create_payload["data"]["item"]["target"]);
    assert_eq!("draft", create_payload["data"]["item"]["status"]);
    assert_eq!(true, create_payload["data"]["item"]["showAsPopup"]);
    assert_eq!(
        "Maintenance window at 23:00 UTC",
        create_payload["data"]["item"]["content"]
    );

    let update_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri("/backend/v3/api/content/announcements/1")
                .header("content-type", "application/json")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::from(
                    r#"{"status":"published","target":"vip","showAsPopup":false}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, update_response.status());
    let update_payload = json_payload(update_response).await;
    assert_eq!("published", update_payload["data"]["item"]["status"]);
    assert_eq!("vip", update_payload["data"]["item"]["target"]);
    assert_eq!(false, update_payload["data"]["item"]["showAsPopup"]);
    assert!(update_payload["data"]["item"]["date"]
        .as_str()
        .unwrap()
        .contains(" "));

    let list_response = router
        .clone()
        .oneshot(
            Request::builder()
                .uri("/backend/v3/api/content/announcements")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, list_response.status());
    let list_payload = json_payload(list_response).await;
    assert_eq!("2000", list_payload["code"]);
    assert_eq!(1, list_payload["data"]["items"].as_array().unwrap().len());
    assert_eq!("1", list_payload["data"]["items"][0]["id"]);
    assert_eq!("published", list_payload["data"]["items"][0]["status"]);
    assert_eq!(false, list_payload["data"]["items"][0]["showAsPopup"]);

    let delete_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri("/backend/v3/api/content/announcements/1")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, delete_response.status());
    let delete_payload = json_payload(delete_response).await;
    assert_eq!(true, delete_payload["data"]["deleted"]);

    let final_list_response = router
        .oneshot(
            Request::builder()
                .uri("/backend/v3/api/content/announcements")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let final_payload = json_payload(final_list_response).await;
    assert_eq!(0, final_payload["data"]["items"].as_array().unwrap().len());

    let commands = store.commands.lock().unwrap();
    assert_eq!(vec!["create", "update", "delete"], *commands);
}

#[tokio::test]
async fn admin_announcement_route_rejects_missing_trusted_subject_for_store_backed_router() {
    let router = sdkwork_clawrouter_router_service::api::admin_announcement_router_with_store(
        Arc::new(TestAnnouncementStore::default()),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .uri("/backend/v3/api/content/announcements")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
    let payload = json_payload(response).await;
    assert_eq!("4010", payload["code"]);
    assert!(payload["msg"]
        .as_str()
        .unwrap()
        .contains(missing_internal_tenant_header_message()));
}

#[tokio::test]
async fn admin_announcement_route_rejects_invalid_payload_without_calling_store() {
    let store = Arc::new(TestAnnouncementStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_announcement_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/content/announcements")
                .header("content-type", "application/json")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::from(
                    r#"{"title":"","target":"all","status":"published","content":"x"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = json_payload(response).await;
    assert_eq!("4001", payload["code"]);
    assert!(payload["msg"]
        .as_str()
        .unwrap()
        .contains("announcement title is required"));
    assert!(store.commands.lock().unwrap().is_empty());
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

#[derive(Default)]
struct TestAnnouncementStore {
    items: Mutex<Vec<AdminAnnouncementItem>>,
    commands: Mutex<Vec<&'static str>>,
}

impl AdminAnnouncementStore for TestAnnouncementStore {
    fn list_announcements<'a>(
        &'a self,
        query: ListAdminAnnouncementsQuery,
    ) -> AdminAnnouncementCommandFuture<'a, Vec<AdminAnnouncementItem>> {
        Box::pin(async move {
            Ok(self
                .items
                .lock()
                .unwrap()
                .iter()
                .filter(|item| {
                    item.tenant_id == query.subject.tenant_id
                        && item.organization_id == query.subject.organization_id
                        && item.deleted_at.is_none()
                })
                .cloned()
                .collect())
        })
    }

    fn create_announcement<'a>(
        &'a self,
        command: CreateAdminAnnouncementCommand,
    ) -> AdminAnnouncementCommandFuture<'a, AdminAnnouncementItem> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("create");
            let item = AdminAnnouncementItem {
                id: 1,
                uuid: command.announcement_uuid,
                tenant_id: command.subject.tenant_id,
                organization_id: command.subject.organization_id,
                title: command.title,
                content: command.content,
                target: command.target,
                status: command.status,
                show_as_popup: command.show_as_popup,
                date: command.requested_at,
                deleted_at: None,
            };
            self.items.lock().unwrap().push(item.clone());
            Ok(item)
        })
    }

    fn update_announcement<'a>(
        &'a self,
        command: UpdateAdminAnnouncementCommand,
    ) -> AdminAnnouncementCommandFuture<'a, Option<AdminAnnouncementItem>> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("update");
            let mut items = self.items.lock().unwrap();
            let Some(item) = items.iter_mut().find(|item| {
                item.id == command.announcement_id
                    && item.tenant_id == command.subject.tenant_id
                    && item.organization_id == command.subject.organization_id
                    && item.deleted_at.is_none()
            }) else {
                return Ok(None);
            };
            if let Some(title) = command.title {
                item.title = title;
            }
            if let Some(content) = command.content {
                item.content = content;
            }
            if let Some(target) = command.target {
                item.target = target;
            }
            if let Some(status) = command.status {
                item.status = status;
            }
            if let Some(show_as_popup) = command.show_as_popup {
                item.show_as_popup = show_as_popup;
            }
            item.date = command.requested_at;
            Ok(Some(item.clone()))
        })
    }

    fn delete_announcement<'a>(
        &'a self,
        command: DeleteAdminAnnouncementCommand,
    ) -> AdminAnnouncementCommandFuture<'a, bool> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("delete");
            let mut items = self.items.lock().unwrap();
            let Some(item) = items.iter_mut().find(|item| {
                item.id == command.announcement_id
                    && item.tenant_id == command.subject.tenant_id
                    && item.organization_id == command.subject.organization_id
                    && item.deleted_at.is_none()
            }) else {
                return Ok(false);
            };
            item.deleted_at = Some(command.requested_at);
            Ok(true)
        })
    }
}

struct TestUuidGenerator;

impl EntityUuidGenerator for TestUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        Ok("test-uuid".to_owned())
    }
}
