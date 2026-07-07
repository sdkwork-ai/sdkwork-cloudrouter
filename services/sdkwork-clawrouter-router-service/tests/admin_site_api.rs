mod common;

use common::InternalTrustedSubjectHeaders;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::application::EntityUuidGenerator;
use sdkwork_clawrouter_router_service::domain::DomainResult;
use sdkwork_clawrouter_router_service::ports::{
    AdminSiteChannelItem, AdminSiteChannelListPage, AdminSiteConnectionCheckItem, AdminSiteFuture,
    AdminSiteItem, AdminSiteListPage, AdminSiteStore, CreateAdminSiteCommand,
    DeleteAdminSiteCommand, ListAdminSiteChannelsQuery, ListAdminSitesQuery,
    TestAdminSiteConnectionCommand, UpdateAdminSiteCommand,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn admin_site_create_generates_site_code_when_portal_omits_it() {
    let store = Arc::new(TestSiteStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_site_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/sites")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"siteName":"OpenRouter CN","displayName":"OpenRouter CN","baseUrl":"https://openrouter.example.com/api/v1","domains":["openrouter.example.com"],"vendorCodes":["openai","anthropic"],"siteType":"relay","environment":"production","status":"active"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!(
        "site_00000000000040008000000000000001",
        payload["data"]["item"]["siteCode"]
    );
    assert_eq!("OpenRouter CN", payload["data"]["item"]["siteName"]);
    assert_eq!("openai", payload["data"]["item"]["vendorCodes"][0]);

    let commands = store.create_commands.lock().unwrap();
    assert_eq!(1, commands.len());
    assert_eq!(
        "site_00000000000040008000000000000001",
        commands[0].site_code
    );
    assert_eq!(10, commands[0].subject.tenant_id);
    assert_eq!(20, commands[0].subject.organization_id);
    assert_eq!(
        "https://openrouter.example.com/api/v1",
        commands[0].base_url
    );
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

#[derive(Default)]
struct TestSiteStore {
    create_commands: Mutex<Vec<CreateAdminSiteCommand>>,
}

impl AdminSiteStore for TestSiteStore {
    fn list_sites<'a>(
        &'a self,
        _query: ListAdminSitesQuery,
    ) -> AdminSiteFuture<'a, AdminSiteListPage> {
        Box::pin(async move {
            Ok(AdminSiteListPage {
                items: Vec::new(),
                total: 0,
                page_no: 1,
                page_size: 100,
            })
        })
    }

    fn create_site<'a>(
        &'a self,
        command: CreateAdminSiteCommand,
    ) -> AdminSiteFuture<'a, AdminSiteItem> {
        Box::pin(async move {
            self.create_commands.lock().unwrap().push(command.clone());
            Ok(AdminSiteItem {
                id: 1,
                site_code: command.site_code,
                site_name: command.site_name,
                display_name: command.display_name,
                description: command.description,
                base_url: command.base_url,
                website_url: command.website_url,
                docs_url: command.docs_url,
                logo: command.logo,
                domains: command.domains,
                vendor_codes: command.vendor_codes,
                site_type: command.site_type,
                owner_kind: command.owner_kind,
                region_code: command.region_code,
                environment: command.environment,
                health_status: "unknown".to_owned(),
                last_latency_ms: None,
                consecutive_error_count: 0,
                last_checked_at: None,
                last_sync_at: None,
                sort_order: 0,
                status: command.status,
            })
        })
    }

    fn update_site<'a>(
        &'a self,
        _command: UpdateAdminSiteCommand,
    ) -> AdminSiteFuture<'a, Option<AdminSiteItem>> {
        Box::pin(async { Ok(None) })
    }

    fn delete_site<'a>(&'a self, _command: DeleteAdminSiteCommand) -> AdminSiteFuture<'a, bool> {
        Box::pin(async { Ok(false) })
    }

    fn list_site_channels<'a>(
        &'a self,
        _query: ListAdminSiteChannelsQuery,
    ) -> AdminSiteFuture<'a, AdminSiteChannelListPage> {
        Box::pin(async {
            Ok(AdminSiteChannelListPage {
                items: Vec::new(),
                total: 0,
                page_no: 1,
                page_size: 100,
            })
        })
    }

    fn test_site_connection<'a>(
        &'a self,
        command: TestAdminSiteConnectionCommand,
    ) -> AdminSiteFuture<'a, AdminSiteConnectionCheckItem> {
        Box::pin(async move {
            Ok(AdminSiteConnectionCheckItem {
                site_id: command.site_id,
                status: "ok".to_owned(),
                health_status: "healthy".to_owned(),
                latency_ms: Some(1),
                checked_at: "2026-06-04T00:00:00Z".to_owned(),
                message: None,
            })
        })
    }
}

struct TestUuidGenerator;

impl EntityUuidGenerator for TestUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        Ok("00000000-0000-4000-8000-000000000001".to_owned())
    }
}
