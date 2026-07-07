mod common;
use common::missing_internal_tenant_header_message;
use common::InternalTrustedSubjectHeaders;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::application::{
    default_desktop_cache_manager, AiRoutingCacheInvalidatingAdminChannelStore,
    EntityUuidGenerator, ROUTING_CONFIG_VERSION_CACHE_NAMESPACE,
    ROUTING_DISABLED_CHANNEL_CACHE_NAMESPACE, ROUTING_PROVIDER_OBJECT_ROUTE_CACHE_NAMESPACE,
    ROUTING_SNAPSHOT_CACHE_NAMESPACE,
};
use sdkwork_clawrouter_router_service::domain::DomainResult;
use sdkwork_clawrouter_router_service::ports::{
    AdminChannelCommandFuture, AdminChannelCredentialItem, AdminChannelItem, AdminChannelListPage,
    AdminChannelStore, CreateAdminChannelCommand, DeleteAdminChannelCommand,
    ListAdminChannelsQuery, TestAdminChannelCommand, UpdateAdminChannelCommand,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn admin_channel_route_creates_lists_updates_and_soft_deletes_items() {
    let store = Arc::new(TestChannelStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_channel_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let create_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/channel")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"name":"OpenAI primary","vendor":"OpenAI","channelType":"official","protocol":"OpenAI","accessType":"api-key","credentials":[{"name":"primary","baseUrl":"https://api.openai.com/v1","secretRef":"vault://providers/openai/account/main"}],"capabilities":["llm"],"resourceCodes":["vendor.openai","model.openai.gpt-4o-mini.chat"],"timeoutMs":60000,"retryPolicy":{"maxAttempts":3,"retryableStatusCodes":[429,503],"backoffMs":25},"circuitBreakerPolicy":{"failureThreshold":2},"expiresAt":"2026-06-30T08:00:00Z","weight":80,"status":"active"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, create_response.status());
    let create_payload = json_payload(create_response).await;
    assert_eq!(0, create_payload["code"].as_i64().unwrap());
    assert_eq!("OpenAI primary", create_payload["data"]["item"]["name"]);
    assert_eq!("101", create_payload["data"]["item"]["channelId"]);
    assert_eq!("OpenAI", create_payload["data"]["item"]["vendor"]);
    assert_eq!("official", create_payload["data"]["item"]["channelType"]);
    assert_eq!("active", create_payload["data"]["item"]["status"]);
    assert_eq!(80, create_payload["data"]["item"]["weight"]);
    assert!(create_payload["data"]["item"].get("models").is_none());
    assert_eq!(
        "vendor.openai",
        create_payload["data"]["item"]["resourceCodes"][0]
    );
    assert_eq!(
        "model.openai.gpt-4o-mini.chat",
        create_payload["data"]["item"]["resourceCodes"][1]
    );
    assert_eq!(
        3,
        create_payload["data"]["item"]["retryPolicy"]["maxAttempts"]
    );
    assert_eq!(
        503,
        create_payload["data"]["item"]["retryPolicy"]["retryableStatusCodes"][1]
    );
    assert_eq!(
        25,
        create_payload["data"]["item"]["retryPolicy"]["backoffMs"]
    );
    assert_eq!(
        2,
        create_payload["data"]["item"]["circuitBreakerPolicy"]["failureThreshold"]
    );
    assert_eq!(60_000, create_payload["data"]["item"]["timeoutMs"]);
    assert!(create_payload["data"]["item"]["createdAt"]
        .as_str()
        .is_some_and(|value| !value.trim().is_empty()));
    assert_eq!(
        "2026-06-30T08:00:00Z",
        create_payload["data"]["item"]["expiresAt"]
    );
    assert!(create_payload["data"]["item"].get("authKey").is_none());

    let update_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/backend/v3/api/channel")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"id":"1","channelType":"relay","status":"disabled","weight":15,"capabilities":["llm","image"],"resourceCodes":["bundle.openrouter.openai.standard"],"timeoutMs":120000,"retryPolicy":null,"circuitBreakerPolicy":{"failureThreshold":3},"expiresAt":null}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, update_response.status());
    let update_payload = json_payload(update_response).await;
    assert_eq!("disabled", update_payload["data"]["item"]["status"]);
    assert_eq!("relay", update_payload["data"]["item"]["channelType"]);
    assert_eq!(15, update_payload["data"]["item"]["weight"]);
    assert_eq!("image", update_payload["data"]["item"]["capabilities"][1]);
    assert_eq!(
        "bundle.openrouter.openai.standard",
        update_payload["data"]["item"]["resourceCodes"][0]
    );
    assert_eq!(120_000, update_payload["data"]["item"]["timeoutMs"]);
    assert!(update_payload["data"]["item"].get("retryPolicy").is_none());
    assert_eq!(
        3,
        update_payload["data"]["item"]["circuitBreakerPolicy"]["failureThreshold"]
    );
    assert!(update_payload["data"]["item"].get("models").is_none());
    assert!(update_payload["data"]["item"]["createdAt"]
        .as_str()
        .is_some_and(|value| !value.trim().is_empty()));
    assert!(update_payload["data"]["item"].get("expiresAt").is_none());

    let list_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/channel/list")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, list_response.status());
    let list_payload = json_payload(list_response).await;
    assert_eq!(0, list_payload["code"].as_i64().unwrap());
    assert_eq!(1, list_payload["data"]["items"].as_array().unwrap().len());
    assert_eq!("1", list_payload["data"]["items"][0]["id"]);
    assert_eq!("101", list_payload["data"]["items"][0]["channelId"]);
    assert_eq!("disabled", list_payload["data"]["items"][0]["status"]);
    assert_eq!("relay", list_payload["data"]["items"][0]["channelType"]);
    assert_eq!(
        "bundle.openrouter.openai.standard",
        list_payload["data"]["items"][0]["resourceCodes"][0]
    );
    assert_eq!(120_000, list_payload["data"]["items"][0]["timeoutMs"]);
    assert!(list_payload["data"]["items"][0]["createdAt"]
        .as_str()
        .is_some_and(|value| !value.trim().is_empty()));
    assert!(list_payload["data"]["items"][0].get("expiresAt").is_none());
    assert!(list_payload["data"]["items"][0]
        .get("retryPolicy")
        .is_none());
    assert_eq!(
        3,
        list_payload["data"]["items"][0]["circuitBreakerPolicy"]["failureThreshold"]
    );

    let test_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/channel/1/test")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .header("X-Request-Id", "00000000-0000-4000-8000-000000000201")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, test_response.status());
    let test_payload = json_payload(test_response).await;
    assert_eq!(0, test_payload["code"].as_i64().unwrap());
    assert_eq!("1", test_payload["data"]["channelId"]);
    assert_eq!(true, test_payload["data"]["success"]);
    assert_eq!("active", test_payload["data"]["status"]);
    assert_eq!("37ms", test_payload["data"]["latency"]);
    assert_eq!("active", test_payload["data"]["item"]["status"]);
    assert_eq!("101", test_payload["data"]["item"]["channelId"]);
    assert_eq!("relay", test_payload["data"]["item"]["channelType"]);
    assert!(test_payload["data"]["item"]["createdAt"]
        .as_str()
        .is_some_and(|value| !value.trim().is_empty()));
    assert!(test_payload["data"]["item"].get("authKey").is_none());

    let delete_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri("/backend/v3/api/channel/1")
                .internal_trusted_subject(100001, 0, 30)
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
                .method("POST")
                .uri("/backend/v3/api/channel/list")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();
    let final_payload = json_payload(final_list_response).await;
    assert_eq!(0, final_payload["data"]["items"].as_array().unwrap().len());

    let commands = store.commands.lock().unwrap();
    assert_eq!(vec!["create", "update", "test", "delete"], *commands);
}

#[tokio::test]
async fn admin_channel_route_invalidates_routing_cache_after_successful_mutation() {
    let store = Arc::new(TestChannelStore::default());
    let manager = default_desktop_cache_manager();
    manager
        .set_json(
            ROUTING_SNAPSHOT_CACHE_NAMESPACE,
            "tenant:10:org:20",
            serde_json::json!({ "status": "warm" }),
        )
        .await
        .unwrap();
    manager
        .set_json(
            ROUTING_CONFIG_VERSION_CACHE_NAMESPACE,
            "tenant:10:org:20",
            serde_json::json!({ "version": 7 }),
        )
        .await
        .unwrap();
    manager
        .set_json(
            ROUTING_DISABLED_CHANNEL_CACHE_NAMESPACE,
            "tenant:10:org:20:channel:1",
            serde_json::json!({ "disabled": true }),
        )
        .await
        .unwrap();
    manager
        .set_json(
            ROUTING_PROVIDER_OBJECT_ROUTE_CACHE_NAMESPACE,
            "tenant:10:org:20:object:resp_123",
            serde_json::json!({ "channelId": 1 }),
        )
        .await
        .unwrap();
    let router = sdkwork_clawrouter_router_service::api::admin_channel_router_with_store(
        Arc::new(AiRoutingCacheInvalidatingAdminChannelStore::new(
            store,
            manager.clone(),
        )),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/channel")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"name":"OpenAI primary","vendor":"OpenAI","channelType":"official","protocol":"OpenAI","accessType":"api-key","credentials":[{"name":"primary","baseUrl":"https://api.openai.com/v1","secretRef":"vault://providers/openai/account/main"}],"capabilities":["llm"],"resourceCodes":["vendor.openai"],"weight":80,"status":"active"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    assert!(manager
        .get_json(ROUTING_SNAPSHOT_CACHE_NAMESPACE, "tenant:10:org:20")
        .await
        .unwrap()
        .is_none());
    assert!(manager
        .get_json(ROUTING_CONFIG_VERSION_CACHE_NAMESPACE, "tenant:10:org:20")
        .await
        .unwrap()
        .is_none());
    assert!(manager
        .get_json(
            ROUTING_DISABLED_CHANNEL_CACHE_NAMESPACE,
            "tenant:10:org:20:channel:1"
        )
        .await
        .unwrap()
        .is_none());
    assert!(manager
        .get_json(
            ROUTING_PROVIDER_OBJECT_ROUTE_CACHE_NAMESPACE,
            "tenant:10:org:20:object:resp_123"
        )
        .await
        .unwrap()
        .is_none());
}

#[tokio::test]
async fn admin_channel_route_masks_api_key_in_create_response() {
    let store = Arc::new(TestChannelStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_channel_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/channel")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"name":"OpenAI primary","vendor":"OpenAI","protocol":"OpenAI","accessType":"api-key","credentials":[{"name":"primary","baseUrl":"https://api.openai.com/v1","apiKey":"sk-live-secret"}],"capabilities":["llm"],"weight":80,"status":"active"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("OpenAI primary", payload["data"]["item"]["name"]);
    assert!(
        payload["data"]["item"]["credentials"][0]["apiKey"].is_null()
            || payload["data"]["item"]["credentials"][0]
                .get("apiKey")
                .is_none()
    );
    assert!(payload["data"]["item"]["credentials"][0]["maskedLabel"]
        .as_str()
        .is_some_and(|value| !value.trim().is_empty()));
    assert!(payload["data"]["item"].get("authKey").is_none());
    assert!(payload["data"]["item"].get("apiKey").is_none());

    let items = store.items.lock().unwrap();
    let created = items.first().expect("created channel should be stored");
    let secret_ref = &created.credentials[0].secret_ref;
    assert!(secret_ref.starts_with("secret://ai-channel-credentials/openai/"));
    assert!(!secret_ref.contains("sk-live-secret"));
}

#[tokio::test]
async fn admin_channel_route_rejects_missing_trusted_subject_for_store_backed_router() {
    let router = sdkwork_clawrouter_router_service::api::admin_channel_router_with_store(
        Arc::new(TestChannelStore::default()),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/channel/list")
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40101, payload["code"].as_i64().unwrap());
    let message = payload["detail"].as_str().unwrap();
    assert!(
        message.contains(missing_internal_tenant_header_message())
            || message.contains("trusted request subject is required"),
        "unexpected auth failure message: {message}"
    );
}

#[tokio::test]
async fn admin_channel_route_rejects_invalid_payload_without_calling_store() {
    let store = Arc::new(TestChannelStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_channel_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/channel")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"name":"","vendor":"OpenAI","credentials":[{"name":"primary","baseUrl":"https://api.openai.com/v1","secretRef":"vault://providers/openai/account/main"}],"capabilities":["llm"]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .unwrap()
        .contains("channel name is required"));
    assert!(store.commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn admin_channel_route_creates_channel_with_multiple_upstream_credentials_and_rotation() {
    let store = Arc::new(TestChannelStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_channel_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/integration/channels")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"name":"OpenAI pooled","vendor":"OpenAI","protocol":"OpenAI","accessType":"api-key","credentialRotation":"weighted_round_robin","credentials":[{"name":"primary","baseUrl":"https://api1.openai.example/v1","apiKey":"sk-primary","priority":10,"weight":80,"status":"active"},{"name":"backup","baseUrl":"https://api2.openai.example/v1","apiKey":"sk-backup","priority":20,"weight":20,"status":"active"}],"capabilities":["llm"],"weight":80,"status":"active"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!(
        "weighted_round_robin",
        payload["data"]["item"]["credentialRotation"]
    );
    assert!(payload["data"]["item"].get("baseUrl").is_none());
    assert!(payload["data"]["item"].get("secretRef").is_none());
    assert!(payload["data"]["item"].get("apiKey").is_none());
    let credentials = payload["data"]["item"]["credentials"]
        .as_array()
        .expect("credentials should be returned as an array");
    assert_eq!(2, credentials.len());
    assert_eq!("primary", credentials[0]["name"]);
    assert_eq!("https://api1.openai.example/v1", credentials[0]["baseUrl"]);
    assert!(credentials[0].get("apiKey").is_none());
    assert!(credentials[0]["maskedLabel"]
        .as_str()
        .is_some_and(|value| !value.trim().is_empty()));
    assert_eq!(80, credentials[0]["weight"]);
    assert_eq!("backup", credentials[1]["name"]);
    assert_eq!("https://api2.openai.example/v1", credentials[1]["baseUrl"]);
    assert!(credentials[1].get("apiKey").is_none());
    assert!(credentials[1]["maskedLabel"]
        .as_str()
        .is_some_and(|value| !value.trim().is_empty()));

    let items = store.items.lock().unwrap();
    let created = items.first().expect("created channel should be stored");
    assert_eq!("weighted_round_robin", created.credential_rotation);
    assert_eq!(2, created.credentials.len());
    assert!(created.credentials[0]
        .secret_ref
        .starts_with("secret://ai-channel-credentials/openai/"));
    assert!(!created.credentials[0].secret_ref.contains("sk-primary"));
    assert_eq!(
        Some("sk-primary"),
        created.credentials[0].api_key.as_deref()
    );
}

#[tokio::test]
async fn admin_channel_route_rejects_create_without_upstream_credentials() {
    let store = Arc::new(TestChannelStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_channel_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/integration/channels")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"name":"OpenAI primary","vendor":"OpenAI","baseUrl":"https://api.openai.com/v1","apiKey":"sk-live-secret","capabilities":["llm"]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .unwrap()
        .contains("credentials must include at least one upstream credential"));
    assert!(store.commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn admin_channel_route_rejects_invalid_channel_type_without_calling_store() {
    let store = Arc::new(TestChannelStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_channel_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/channel")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"name":"OpenAI primary","vendor":"OpenAI","channelType":"proxy","credentials":[{"name":"primary","baseUrl":"https://api.openai.com/v1","secretRef":"vault://providers/openai/account/main"}],"capabilities":["llm"]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .unwrap()
        .contains("channelType must be one of official, relay"));
    assert!(store.commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn admin_channel_route_rejects_plaintext_auth_key_without_calling_store() {
    let store = Arc::new(TestChannelStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_channel_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/channel")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"name":"OpenAI primary","vendor":"OpenAI","authKey":"sk-live-secret","capabilities":["llm"]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .unwrap()
        .contains("apiKey is the supported plaintext credential input"));
    assert!(store.commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn admin_channel_route_rejects_invalid_base_url_without_calling_store() {
    let store = Arc::new(TestChannelStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_channel_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/channel")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"name":"OpenAI primary","vendor":"OpenAI","credentials":[{"name":"primary","baseUrl":"javascript:alert(1)","secretRef":"vault://providers/openai/account/main"}],"capabilities":["llm"]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(
        payload["detail"]
            .as_str()
            .unwrap()
            .contains("channel baseUrl must be an absolute http or https URL")
            || payload["detail"]
                .as_str()
                .unwrap()
                .contains("credential baseUrl must be an absolute http or https URL")
    );
    assert!(store.commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn admin_channel_route_rejects_unsafe_secret_ref_without_calling_store() {
    let store = Arc::new(TestChannelStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_channel_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let empty_locator_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/channel")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"name":"OpenAI primary","vendor":"OpenAI","credentials":[{"name":"primary","baseUrl":"https://api.openai.com/v1","secretRef":"vault://"}],"capabilities":["llm"]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, empty_locator_response.status());
    let empty_locator_payload = json_payload(empty_locator_response).await;
    assert_eq!(40001, empty_locator_payload["code"].as_i64().unwrap());
    assert!(empty_locator_payload["detail"]
        .as_str()
        .unwrap()
        .contains("secretRef must include a non-empty locator"));

    let plaintext_alias_response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/channel")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"name":"OpenAI primary","vendor":"OpenAI","credentials":[{"name":"primary","baseUrl":"https://api.openai.com/v1","secretRef":"vault://providers/openai/account/main","api_key":"sk-live-secret"}],"capabilities":["llm"]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, plaintext_alias_response.status());
    let plaintext_alias_payload = json_payload(plaintext_alias_response).await;
    assert_eq!(40001, plaintext_alias_payload["code"].as_i64().unwrap());
    assert!(plaintext_alias_payload["detail"]
        .as_str()
        .unwrap()
        .contains("apiKey is the supported plaintext credential input"));
    assert!(store.commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn admin_channel_route_rejects_invalid_retry_policy_without_calling_store() {
    let store = Arc::new(TestChannelStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_channel_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/channel")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"name":"OpenAI primary","vendor":"OpenAI","credentials":[{"name":"primary","baseUrl":"https://api.openai.com/v1","secretRef":"vault://providers/openai/account/main"}],"retryPolicy":{"maxAttempts":6,"retryableStatusCodes":[503]}}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .unwrap()
        .contains("retryPolicy.maxAttempts must be between 1 and 5"));
    assert!(store.commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn admin_channel_route_rejects_invalid_circuit_breaker_policy_without_calling_store() {
    let store = Arc::new(TestChannelStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_channel_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/channel")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"name":"OpenAI primary","vendor":"OpenAI","credentials":[{"name":"primary","baseUrl":"https://api.openai.com/v1","secretRef":"vault://providers/openai/account/main"}],"circuitBreakerPolicy":{"failureThreshold":0}}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = json_payload(response).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .unwrap()
        .contains("circuitBreakerPolicy.failureThreshold must be between 1 and 100"));
    assert!(store.commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn admin_channel_route_rejects_null_create_runtime_policy_fields_without_calling_store() {
    let store = Arc::new(TestChannelStore::default());
    let router = sdkwork_clawrouter_router_service::api::admin_channel_router_with_store(
        store.clone(),
        Arc::new(TestUuidGenerator),
    );

    let null_timeout_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/channel")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"name":"OpenAI primary","vendor":"OpenAI","credentials":[{"name":"primary","baseUrl":"https://api.openai.com/v1","secretRef":"vault://providers/openai/account/main"}],"timeoutMs":null}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, null_timeout_response.status());
    let null_timeout_payload = json_payload(null_timeout_response).await;
    assert_eq!(40001, null_timeout_payload["code"].as_i64().unwrap());
    assert!(null_timeout_payload["detail"]
        .as_str()
        .unwrap()
        .contains("timeoutMs must be an integer"));

    let null_retry_policy_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/channel")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"name":"OpenAI primary","vendor":"OpenAI","credentials":[{"name":"primary","baseUrl":"https://api.openai.com/v1","secretRef":"vault://providers/openai/account/main"}],"retryPolicy":null}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, null_retry_policy_response.status());
    let null_retry_policy_payload = json_payload(null_retry_policy_response).await;
    assert_eq!(40001, null_retry_policy_payload["code"].as_i64().unwrap());
    assert!(null_retry_policy_payload["detail"]
        .as_str()
        .unwrap()
        .contains("retryPolicy must be a JSON object"));

    let null_circuit_breaker_policy_response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/channel")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{"name":"OpenAI primary","vendor":"OpenAI","credentials":[{"name":"primary","baseUrl":"https://api.openai.com/v1","secretRef":"vault://providers/openai/account/main"}],"circuitBreakerPolicy":null}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(
        StatusCode::BAD_REQUEST,
        null_circuit_breaker_policy_response.status()
    );
    let null_circuit_breaker_policy_payload =
        json_payload(null_circuit_breaker_policy_response).await;
    assert_eq!(
        40001,
        null_circuit_breaker_policy_payload["code"]
            .as_i64()
            .unwrap()
    );
    assert!(null_circuit_breaker_policy_payload["detail"]
        .as_str()
        .unwrap()
        .contains("circuitBreakerPolicy must be a JSON object"));
    assert!(store.commands.lock().unwrap().is_empty());
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

#[tokio::test]
async fn admin_channel_create_accepts_accounts_without_model_allowlist() {
    let store = Arc::new(TestChannelStore::default());
    let app = sdkwork_clawrouter_router_service::api::admin_channel_router_with_store(
        store,
        Arc::new(TestUuidGenerator),
    );

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/channel")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    serde_json::json!({
                        "name": "OpenAI account",
                        "vendor": "OpenAI",
                        "credentials": [{
                            "name": "primary",
                            "baseUrl": "https://api.openai.com/v1",
                            "apiKey": "sk-live-test-secret"
                        }],
                        "capabilities": ["llm"],
                        "resourceCodes": ["vendor.openai", "api.openai.chat_completions"]
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert!(payload.pointer("/data/item/models").is_none());
    assert!(payload.pointer("/item/models").is_none());
}

#[derive(Default)]
struct TestChannelStore {
    items: Mutex<Vec<AdminChannelItem>>,
    commands: Mutex<Vec<&'static str>>,
}

impl AdminChannelStore for TestChannelStore {
    fn list_channels<'a>(
        &'a self,
        query: ListAdminChannelsQuery,
    ) -> AdminChannelCommandFuture<'a, AdminChannelListPage> {
        Box::pin(async move {
            let mut items: Vec<_> = self
                .items
                .lock()
                .unwrap()
                .iter()
                .filter(|item| {
                    item.tenant_id == query.subject.tenant_id
                        && item.organization_id == query.subject.organization_id
                        && item.deleted_at.is_none()
                })
                .filter(|item| {
                    query.q.as_ref().is_none_or(|search| {
                        let search = search.to_lowercase();
                        item.name.to_lowercase().contains(&search)
                            || item.vendor.to_lowercase().contains(&search)
                    })
                })
                .cloned()
                .collect();
            let total = items.len() as i64;
            let offset = query.offset.max(0) as usize;
            let page_size = query.page_size.max(0) as usize;
            if offset >= items.len() {
                items.clear();
            } else {
                items = items.into_iter().skip(offset).take(page_size).collect();
            }
            Ok(AdminChannelListPage {
                items,
                total,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn create_channel<'a>(
        &'a self,
        command: CreateAdminChannelCommand,
    ) -> AdminChannelCommandFuture<'a, AdminChannelItem> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("create");
            let item = AdminChannelItem {
                id: 1,
                channel_id: 101,
                uuid: command.channel_uuid,
                tenant_id: command.subject.tenant_id,
                organization_id: command.subject.organization_id,
                name: command.name,
                vendor: command.vendor,
                provider_code: command.provider_code,
                channel_type: command.channel_type,
                protocol: command.protocol,
                access_type: command.access_type,
                credential_rotation: command.credential_rotation,
                credentials: command
                    .credentials
                    .into_iter()
                    .enumerate()
                    .map(|(index, credential)| AdminChannelCredentialItem {
                        id: i64::try_from(index + 1).unwrap(),
                        credential_id: i64::try_from(index + 1).unwrap(),
                        uuid: credential.credential_uuid,
                        name: credential.name,
                        base_url: credential.base_url,
                        secret_ref: credential.secret_ref,
                        api_key: credential.credential_material,
                        masked_label: credential.masked_label,
                        priority: credential.priority,
                        weight: credential.weight,
                        status: credential.status,
                        errors: 0,
                    })
                    .collect(),
                capabilities: command.capabilities,
                resource_codes: command.resource_codes,
                is_multimodal: command.is_multimodal,
                timeout_ms: command.timeout_ms,
                retry_policy_json: command.retry_policy_json,
                circuit_breaker_policy_json: command.circuit_breaker_policy_json,
                weight: command.weight,
                status: command.status,
                created_at: command.requested_at,
                expires_at: command.expires_at,
                balance: "N/A".to_owned(),
                errors: 0,
                deleted_at: None,
            };
            self.items.lock().unwrap().push(item.clone());
            Ok(item)
        })
    }

    fn update_channel<'a>(
        &'a self,
        command: UpdateAdminChannelCommand,
    ) -> AdminChannelCommandFuture<'a, Option<AdminChannelItem>> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("update");
            let mut items = self.items.lock().unwrap();
            let Some(item) = items.iter_mut().find(|item| {
                item.id == command.channel_id
                    && item.tenant_id == command.subject.tenant_id
                    && item.organization_id == command.subject.organization_id
                    && item.deleted_at.is_none()
            }) else {
                return Ok(None);
            };
            if let Some(name) = command.name {
                item.name = name;
            }
            if let Some(vendor) = command.vendor {
                item.vendor = vendor;
            }
            if let Some(provider_code) = command.provider_code {
                item.provider_code = provider_code;
            }
            if let Some(channel_type) = command.channel_type {
                item.channel_type = channel_type;
            }
            if let Some(protocol) = command.protocol {
                item.protocol = protocol;
            }
            if let Some(access_type) = command.access_type {
                item.access_type = access_type;
            }
            if let Some(credential_rotation) = command.credential_rotation {
                item.credential_rotation = credential_rotation;
            }
            if let Some(credentials) = command.credentials {
                item.credentials = credentials
                    .into_iter()
                    .enumerate()
                    .map(|(index, credential)| AdminChannelCredentialItem {
                        id: i64::try_from(index + 1).unwrap(),
                        credential_id: i64::try_from(index + 1).unwrap(),
                        uuid: credential.credential_uuid,
                        name: credential.name,
                        base_url: credential.base_url,
                        secret_ref: credential.secret_ref,
                        api_key: credential.credential_material,
                        masked_label: credential.masked_label,
                        priority: credential.priority,
                        weight: credential.weight,
                        status: credential.status,
                        errors: 0,
                    })
                    .collect();
            }
            if let Some(capabilities) = command.capabilities {
                item.is_multimodal = capabilities.iter().any(|capability| capability != "llm");
                item.capabilities = capabilities;
            }
            if let Some(resource_codes) = command.resource_codes {
                item.resource_codes = resource_codes;
            }
            if let Some(retry_policy_json) = command.retry_policy_json {
                item.retry_policy_json = retry_policy_json;
            }
            if let Some(circuit_breaker_policy_json) = command.circuit_breaker_policy_json {
                item.circuit_breaker_policy_json = circuit_breaker_policy_json;
            }
            if let Some(timeout_ms) = command.timeout_ms {
                item.timeout_ms = timeout_ms;
            }
            if let Some(weight) = command.weight {
                item.weight = weight;
            }
            if let Some(status) = command.status {
                item.status = status;
            }
            if let Some(expires_at) = command.expires_at {
                item.expires_at = expires_at;
            }
            Ok(Some(item.clone()))
        })
    }

    fn delete_channel<'a>(
        &'a self,
        command: DeleteAdminChannelCommand,
    ) -> AdminChannelCommandFuture<'a, bool> {
        Box::pin(async move {
            self.commands.lock().unwrap().push("delete");
            let mut items = self.items.lock().unwrap();
            let Some(item) = items.iter_mut().find(|item| {
                item.id == command.channel_id
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

    fn test_channel<'a>(
        &'a self,
        command: TestAdminChannelCommand,
    ) -> AdminChannelCommandFuture<
        'a,
        Option<sdkwork_clawrouter_router_service::ports::AdminChannelTestOutcome>,
    > {
        Box::pin(async move {
            self.commands.lock().unwrap().push("test");
            let mut items = self.items.lock().unwrap();
            let Some(item) = items.iter_mut().find(|item| {
                item.id == command.channel_id
                    && item.tenant_id == command.subject.tenant_id
                    && item.organization_id == command.subject.organization_id
                    && item.deleted_at.is_none()
            }) else {
                return Ok(None);
            };
            item.status = "active".to_owned();
            item.errors = 0;
            Ok(Some(
                sdkwork_clawrouter_router_service::ports::AdminChannelTestOutcome {
                    channel_id: item.id.to_string(),
                    success: true,
                    status: item.status.clone(),
                    latency: "37ms".to_owned(),
                    item: item.clone(),
                },
            ))
        })
    }
}

struct TestUuidGenerator;

impl EntityUuidGenerator for TestUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        Ok("test-uuid".to_owned())
    }
}
