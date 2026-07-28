mod common;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::application::EntityUuidGenerator;
use sdkwork_clawrouter_router_service::domain::{DomainError, DomainResult};
use sdkwork_clawrouter_router_service::ports::{
    AppRoutingChannelCommandFuture, AppRoutingChannelCommandStore, AppRoutingChannelDeleteOutcome,
    AppRoutingChannelItem, AppRoutingChannelMutationOutcome, AppRoutingChannelTestOutcome,
    CreateAppRoutingChannelCommand, DeleteAppRoutingChannelCommand,
    SetAppRoutingChannelStatusCommand, TestAppRoutingChannelCommand,
    UpdateAppRoutingChannelCommand,
};
use serde_json::Value;
use tower::ServiceExt;

const TEST_TENANT_ID: i64 = 100001;
const TEST_ORGANIZATION_ID: i64 = 0;
const TEST_USER_ID: i64 = 30;

#[tokio::test]
async fn app_routing_channel_commands_use_standard_create_delete_semantics() {
    let store = Arc::new(TestAppRoutingChannelCommandStore::default());
    let router =
        sdkwork_clawrouter_router_service::api::app_routing_channel_command_router_with_store(
            store.clone(),
            Arc::new(TestUuidGenerator),
        );

    let created = request_json(
        router.clone(),
        signed_request(
            "POST",
            "/app/v3/api/ai/routing/channels",
            r#"{"name":"OpenAI primary","vendor":"OpenAI","protocol":"OpenAI","accessType":"Standard API Key","baseUrl":"https://api.openai.com/v1","secretRef":"vault://providers/openai/account/main","capabilities":["llm"],"weight":100,"status":"active"}"#,
        ),
        StatusCode::CREATED,
    )
    .await;
    assert_eq!(0, created["code"].as_i64().unwrap());
    assert_eq!("42", created["data"]["item"]["id"]);
    assert_eq!("OpenAI primary", created["data"]["item"]["name"]);

    request_empty(
        router,
        signed_request("DELETE", "/app/v3/api/ai/routing/channels/42", ""),
        StatusCode::NO_CONTENT,
    )
    .await;

    assert_eq!(
        vec!["create_channel", "delete_channel"],
        *store.commands.lock().unwrap()
    );
}

fn signed_request(method: &str, path: &str, body: &str) -> Request<Body> {
    let mut request = common::web_framework_app_request(
        method,
        path,
        Body::from(body.to_owned()),
        &TEST_TENANT_ID.to_string(),
        Some(&TEST_ORGANIZATION_ID.to_string()),
        &TEST_USER_ID.to_string(),
    );
    request.headers_mut().insert(
        "content-type",
        axum::http::HeaderValue::from_static("application/json"),
    );
    request
}

async fn request_json(
    router: axum::Router,
    request: Request<Body>,
    expected_status: StatusCode,
) -> Value {
    let response = router.oneshot(request).await.unwrap();
    assert_eq!(expected_status, response.status());
    json_payload(response).await
}

async fn request_empty(router: axum::Router, request: Request<Body>, expected_status: StatusCode) {
    let response = router.oneshot(request).await.unwrap();
    assert_eq!(expected_status, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert!(body.is_empty());
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

#[derive(Default)]
struct TestAppRoutingChannelCommandStore {
    commands: Mutex<Vec<&'static str>>,
}

impl AppRoutingChannelCommandStore for TestAppRoutingChannelCommandStore {
    fn create_channel<'a>(
        &'a self,
        command: CreateAppRoutingChannelCommand,
    ) -> AppRoutingChannelCommandFuture<'a, AppRoutingChannelMutationOutcome> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("create_channel");
            assert_eq!(TEST_TENANT_ID, command.subject.tenant_id);
            assert_eq!(TEST_ORGANIZATION_ID, command.subject.organization_id);
            assert_eq!(TEST_USER_ID, command.subject.user_id);
            assert_eq!("OpenAI primary", command.name);
            assert_eq!("OpenAI", command.vendor);
            assert_eq!("openai", command.supplier_code);
            assert_eq!("OpenAI", command.protocol);
            assert_eq!("Standard API Key", command.access_type);
            assert_eq!(
                Some("https://api.openai.com/v1".to_owned()),
                command.base_url
            );
            assert_eq!("vault://providers/openai/account/main", command.secret_ref);
            assert_eq!(vec!["llm".to_owned()], command.capabilities);
            assert_eq!(100, command.weight);
            assert_eq!("active", command.status);
            Ok(AppRoutingChannelMutationOutcome {
                item: routing_channel_item("42", &command.name, &command.status),
            })
        })
    }

    fn update_channel<'a>(
        &'a self,
        _command: UpdateAppRoutingChannelCommand,
    ) -> AppRoutingChannelCommandFuture<'a, Option<AppRoutingChannelMutationOutcome>> {
        Box::pin(async { Err(DomainError::new("unsupported test path")) })
    }

    fn set_channel_status<'a>(
        &'a self,
        _command: SetAppRoutingChannelStatusCommand,
    ) -> AppRoutingChannelCommandFuture<'a, Option<AppRoutingChannelMutationOutcome>> {
        Box::pin(async { Err(DomainError::new("unsupported test path")) })
    }

    fn delete_channel<'a>(
        &'a self,
        command: DeleteAppRoutingChannelCommand,
    ) -> AppRoutingChannelCommandFuture<'a, AppRoutingChannelDeleteOutcome> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("delete_channel");
            assert_eq!(TEST_TENANT_ID, command.subject.tenant_id);
            assert_eq!(TEST_ORGANIZATION_ID, command.subject.organization_id);
            assert_eq!(TEST_USER_ID, command.subject.user_id);
            assert_eq!(42, command.account_id);
            Ok(AppRoutingChannelDeleteOutcome { deleted: true })
        })
    }

    fn test_channel<'a>(
        &'a self,
        _command: TestAppRoutingChannelCommand,
    ) -> AppRoutingChannelCommandFuture<'a, Option<AppRoutingChannelTestOutcome>> {
        Box::pin(async { Err(DomainError::new("unsupported test path")) })
    }
}

fn routing_channel_item(id: &str, name: &str, status: &str) -> AppRoutingChannelItem {
    AppRoutingChannelItem {
        id: id.to_owned(),
        name: name.to_owned(),
        vendor: "OpenAI".to_owned(),
        provider: "OpenAI".to_owned(),
        supplier_code: "openai".to_owned(),
        protocol: "OpenAI".to_owned(),
        access_type: "Standard API Key".to_owned(),
        base_url: "https://api.openai.com/v1".to_owned(),
        api_key: "sk-***main".to_owned(),
        models: Vec::new(),
        capabilities: vec!["llm".to_owned()],
        is_multimodal: false,
        timeout_ms: None,
        retry_policy: None,
        circuit_breaker_policy: None,
        weight: 100,
        status: status.to_owned(),
        latency: "0ms".to_owned(),
        rpm: 0,
        balance: "0".to_owned(),
        errors: 0,
    }
}

struct TestUuidGenerator;

impl EntityUuidGenerator for TestUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        Ok("entity-uuid-test".to_owned())
    }
}
