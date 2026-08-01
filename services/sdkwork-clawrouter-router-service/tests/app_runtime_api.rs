pub mod common;
use common::InternalTrustedSubjectHeaders;
use std::convert::Infallible;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use bytes::Bytes;
use futures_util::stream;
use futures_util::StreamExt as FuturesStreamExt;
use http_body_util::BodyExt;
use sdkwork_claw_security::InternalGatewayPrincipal;
use sdkwork_clawrouter_router_service::application::{
    EntityUuidGenerator, InMemoryRuntimeStreamBus,
};
use sdkwork_clawrouter_router_service::domain::DomainResult;
use sdkwork_clawrouter_router_service::ports::{
    AppRuntimeArtifactItem, AppRuntimeArtifactList, AppRuntimeEventItem, AppRuntimeEventList,
    AppRuntimeFuture, AppRuntimeGatewayClient, AppRuntimeGatewayRequest, AppRuntimeGatewayResponse,
    AppRuntimeInvocationExecution, AppRuntimeInvocationItem, AppRuntimeInvocationList,
    AppRuntimeStore, AppRuntimeSubject, ChatCompletionRelayRequest, ChatCompletionStreamRelay,
    ChatCompletionStreamRelayResponse, CompleteAppRuntimeInvocationCommand,
    CreateAppRuntimeArtifactCommand, CreateAppRuntimeEventCommand,
    CreateAppRuntimeInvocationCommand,
};
use serde_json::json;
use serde_json::Value;
use tokio::sync::Notify;
use tower::ServiceExt;

const DELAYED_STREAM_SECOND_CHUNK_MILLIS: u64 = 120;
const STREAM_COMPLETION_TIMEOUT_MILLIS: u64 = 250;
const TEST_TENANT_ID: i64 = 100001;
const TEST_ORGANIZATION_ID: i64 = 0;
const TEST_USER_ID: i64 = 30;

#[tokio::test]
async fn app_runtime_create_invocation_uses_product_runtime_namespace_and_store_contract() {
    let store = Arc::new(TestAppRuntimeStore::default());
    let router = sdkwork_clawrouter_router_service::api::app_runtime_router_with_store(
        store.clone(),
        Arc::new(SequentialUuidGenerator::new(vec![
            "runtime-invocation-uuid-1",
            "runtime-request-id-1",
        ])),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/runtime/invocations")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{
                      "invocationType":"chat_response",
                      "runtime":"claude_code",
                      "endpoint":"messages.create",
                      "status":"running",
                      "conversationId":"chat-conversation-1",
                      "chatTurnId":"chat-turn-1",
                      "agentSessionId":"agent-session-1",
                      "traceId":"trace-1",
                      "model":"claude-sonnet-4-5",
                      "provider":"anthropic",
                      "streaming":true,
                      "requestJson":{"prompt":"hello"},
                      "metadata":{"surface":"chat"}
                    }"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let payload = response_json(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("runtime-invocation-1", payload["data"]["item"]["id"]);
    assert_eq!("claude_code", payload["data"]["item"]["runtime"]);
    assert_eq!("runtime-request-id-1", payload["data"]["item"]["requestId"]);

    let commands = store.create_invocation_commands.lock().unwrap();
    assert_eq!(1, commands.len());
    assert_eq!(TEST_TENANT_ID, commands[0].subject.tenant_id);
    assert_eq!(TEST_ORGANIZATION_ID, commands[0].subject.organization_id);
    assert_eq!(TEST_USER_ID, commands[0].subject.user_id);
    assert_eq!("runtime-invocation-uuid-1", commands[0].invocation_uuid);
    assert_eq!("chat_response", commands[0].invocation_type);
    assert_eq!("claude_code", commands[0].runtime);
    assert_eq!(
        "chat-conversation-1",
        commands[0].conversation_id.as_deref().unwrap()
    );
    assert_eq!("chat-turn-1", commands[0].chat_turn_id.as_deref().unwrap());
    assert_eq!(
        "agent-session-1",
        commands[0].agent_session_id.as_deref().unwrap()
    );
    assert_eq!(
        "runtime-request-id-1",
        commands[0].request_id.as_deref().unwrap()
    );
    assert!(commands[0].streaming);
}

#[tokio::test]
async fn app_runtime_records_events_and_artifacts_under_invocation() {
    let store = Arc::new(TestAppRuntimeStore::default());
    let router = sdkwork_clawrouter_router_service::api::app_runtime_router_with_store(
        store.clone(),
        Arc::new(SequentialUuidGenerator::new(vec![
            "runtime-event-uuid-1",
            "runtime-artifact-uuid-1",
        ])),
    );

    let response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{
                      "eventType":"response.output_text.delta",
                      "eventSource":"provider",
                      "payloadJson":{"delta":"hello"},
                      "textDelta":"hello",
                      "metadata":{"sequence":"first"}
                    }"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::CREATED, response.status());
    let payload = response_json(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("runtime-event-1", payload["data"]["item"]["id"]);
    assert_eq!(
        "runtime-invocation-1",
        payload["data"]["item"]["invocationId"]
    );
    assert_eq!("hello", payload["data"]["item"]["payloadJson"]["delta"]);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/artifacts")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r##"{
                      "artifactType":"file",
                      "name":"summary.md",
                      "mimeType":"text/markdown",
                      "contentText":"# Summary",
                      "contentJson":{"kind":"markdown"},
                      "storageKey":"runtime/runtime-invocation-1/summary.md",
                      "sha256":"abc123",
                      "sizeBytes":"9",
                      "metadata":{"source":"codex"}
                    }"##,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::CREATED, response.status());
    let payload = response_json(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("runtime-artifact-1", payload["data"]["item"]["id"]);
    assert_eq!("summary.md", payload["data"]["item"]["name"]);
    assert_eq!(
        "runtime/runtime-invocation-1/summary.md",
        payload["data"]["item"]["resource"]["objectKey"]
    );
    assert_eq!(
        "https://cdn.example.test/runtime/runtime-invocation-1/summary.md",
        payload["data"]["item"]["resource"]["publicUrl"]
    );

    let event_commands = store.create_event_commands.lock().unwrap();
    assert_eq!(1, event_commands.len());
    assert_eq!("runtime-invocation-1", event_commands[0].invocation_id);
    assert_eq!("response.output_text.delta", event_commands[0].event_type);
    assert_eq!("provider", event_commands[0].event_source);

    let artifact_commands = store.create_artifact_commands.lock().unwrap();
    assert_eq!(1, artifact_commands.len());
    assert_eq!("runtime-invocation-1", artifact_commands[0].invocation_id);
    assert_eq!("file", artifact_commands[0].artifact_type);
    assert_eq!("summary.md", artifact_commands[0].name.as_deref().unwrap());
    assert_eq!(
        "runtime/runtime-invocation-1/summary.md",
        artifact_commands[0].resource.as_ref().unwrap()["objectKey"]
    );
    assert_eq!(
        "object_storage",
        artifact_commands[0].resource.as_ref().unwrap()["source"]
    );
}

#[tokio::test]
async fn app_runtime_lists_invocations_events_and_artifacts_for_trusted_subject() {
    let store = Arc::new(TestAppRuntimeStore::default());
    let router = sdkwork_clawrouter_router_service::api::app_runtime_router_with_store(
        store.clone(),
        Arc::new(SequentialUuidGenerator::new(Vec::new())),
    );

    let response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations?conversation_id=chat-conversation-1&page=1&page_size=20")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("runtime-invocation-1", payload["data"]["items"][0]["id"]);

    let response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("runtime-event-1", payload["data"]["items"][0]["id"]);
    assert_eq!("hello", payload["data"]["items"][0]["payloadJson"]["delta"]);

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/artifacts")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("runtime-artifact-1", payload["data"]["items"][0]["id"]);
    assert_eq!(
        "https://cdn.example.test/runtime/runtime-invocation-1/summary.md",
        payload["data"]["items"][0]["resource"]["publicUrl"]
    );
    assert!(
        payload["data"]["items"][0]
            .as_object()
            .is_some_and(|record| !record.contains_key("storageUrl")),
        "runtime artifact response must not expose legacy storageUrl"
    );

    let subjects = store.list_invocation_subjects.lock().unwrap();
    assert_eq!(
        vec![AppRuntimeSubject {
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30
        }],
        *subjects
    );
}

#[tokio::test]
async fn app_runtime_streams_invocation_events_as_sse_for_trusted_subject() {
    let store = Arc::new(TestAppRuntimeStore::default());
    let router = sdkwork_clawrouter_router_service::api::app_runtime_router_with_store(
        store.clone(),
        Arc::new(SequentialUuidGenerator::new(Vec::new())),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events/stream")
                .header("accept", "text/event-stream")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    assert_eq!(
        Some("text/event-stream"),
        response
            .headers()
            .get(axum::http::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
    );

    let body = response_text(response).await;
    assert!(body.contains("data: {"));
    assert!(body.contains(r#""id":"runtime-event-1""#));
    assert!(body.contains(r#""textDelta":"hello""#));
    assert!(body.contains(r#""payloadJson":{"delta":"hello"}"#));
    assert!(body.ends_with("data: [DONE]\n\n"));

    let subjects = store.list_event_subjects.lock().unwrap();
    assert_eq!(
        vec![AppRuntimeSubject {
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30
        }],
        *subjects
    );
}

#[tokio::test]
async fn app_runtime_create_event_preserves_stream_text_delta_whitespace() {
    let store = Arc::new(TestAppRuntimeStore::default());
    let router = sdkwork_clawrouter_router_service::api::app_runtime_router_with_store(
        store.clone(),
        Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
    );
    let text_delta = "\n  const value = 42;\n";

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    json!({
                        "eventType": "response.output_text.delta",
                        "eventSource": "provider",
                        "payloadJson": {"delta": text_delta},
                        "textDelta": text_delta
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let payload = response_json(response).await;
    assert_eq!(text_delta, payload["data"]["item"]["textDelta"]);

    let commands = store.create_event_commands.lock().unwrap();
    assert_eq!(1, commands.len());
    assert_eq!(Some(text_delta), commands[0].text_delta.as_deref());
}

#[tokio::test]
async fn app_runtime_stream_executes_openai_compatible_invocation_and_persists_delta_events() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("chat.stream".to_owned()),
                model: Some("openai/gpt-4o-mini".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: serde_json::json!({
                "messages": [{"role": "user", "content": "ping"}],
                "streamOptions": {"includeUsage": true}
            }),
            metadata: serde_json::json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let relay_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_chat_stream_relay(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec![
                "runtime-event-uuid-1",
                "runtime-event-uuid-2",
            ])),
            Arc::new(TestRuntimeCatalog::default()),
            Arc::new(RecordingStreamRelay::new(Arc::clone(&relay_requests))),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events/stream")
                .header("accept", "text/event-stream")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(body.contains(r#""id":"runtime-event-1""#), "{body}");
    assert!(body.contains(r#""textDelta":"hello""#), "{body}");
    assert!(body.contains(r#""id":"runtime-event-2""#), "{body}");
    assert!(body.contains(r#""textDelta":" world""#), "{body}");
    assert!(body.ends_with("data: [DONE]\n\n"), "{body}");

    let relay_requests = relay_requests.lock().unwrap();
    assert_eq!(1, relay_requests.len());
    assert_eq!(101, relay_requests[0].api_key_id);
    assert_eq!(TEST_TENANT_ID, relay_requests[0].tenant_id);
    assert_eq!(TEST_ORGANIZATION_ID, relay_requests[0].organization_id);
    assert_eq!(TEST_USER_ID, relay_requests[0].user_id);
    assert_eq!("openai/gpt-4o-mini", relay_requests[0].model);
    assert_eq!("provider-gpt-4o-mini", relay_requests[0].provider_model);
    assert_eq!(true, relay_requests[0].request_body["stream"]);
    assert_eq!(
        true,
        relay_requests[0].request_body["stream_options"]["include_usage"]
    );
    assert_eq!(
        "ping",
        relay_requests[0].request_body["messages"][0]["content"]
    );

    let event_commands = store.create_event_commands.lock().unwrap();
    let delta_events = event_commands_of_type(&event_commands, "response.output_text.delta");
    assert_eq!(2, delta_events.len());
    assert_eq!("runtime-invocation-1", delta_events[0].invocation_id);
    assert_eq!("provider", delta_events[0].event_source);
    assert_eq!("hello", delta_events[0].text_delta.as_deref().unwrap());
    assert_eq!(" world", delta_events[1].text_delta.as_deref().unwrap());
    assert_runtime_completed_event_recorded(&event_commands);
}

#[tokio::test]
async fn app_runtime_stream_persists_usage_only_provider_chunks_for_chat_billing() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("chat.stream".to_owned()),
                model: Some("openai/gpt-4o-mini".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: serde_json::json!({
                "messages": [{"role": "user", "content": "count usage"}],
                "streamOptions": {"includeUsage": true}
            }),
            metadata: serde_json::json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_chat_stream_relay(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec![
                "runtime-event-uuid-1",
                "runtime-event-uuid-2",
                "runtime-event-uuid-3",
            ])),
            Arc::new(TestRuntimeCatalog::default()),
            Arc::new(UsageOnlyStreamRelay),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events/stream")
                .header("accept", "text/event-stream")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(body.contains(r#""textDelta":"hello""#), "{body}");
    assert!(body.contains(r#""eventType":"runtime.usage""#), "{body}");
    assert!(body.contains(r#""input_tokens":11"#), "{body}");
    assert!(body.contains(r#""output_tokens":13"#), "{body}");
    assert!(body.contains(r#""total_tokens":24"#), "{body}");
    assert!(body.ends_with("data: [DONE]\n\n"), "{body}");

    let event_commands = store.create_event_commands.lock().unwrap();
    let usage_events = event_commands_of_type(&event_commands, "runtime.usage");
    assert_eq!(1, usage_events.len());
    assert_eq!(
        11,
        usage_events[0].payload_json["usage"]["input_tokens"]
            .as_i64()
            .unwrap()
    );
    assert_eq!(
        13,
        usage_events[0].payload_json["usage"]["output_tokens"]
            .as_i64()
            .unwrap()
    );
    assert_runtime_completed_event_recorded(&event_commands);
}

#[tokio::test]
async fn app_runtime_stream_routes_catalog_model_through_channel_route_without_model_route() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("chat.stream".to_owned()),
                model: Some("openai/gpt-5.5".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: serde_json::json!({
                "messages": [{"role": "user", "content": "ping"}],
                "streamOptions": {"includeUsage": true}
            }),
            metadata: serde_json::json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let relay_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_chat_stream_relay(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec![
                "runtime-event-uuid-1",
                "runtime-event-uuid-2",
            ])),
            Arc::new(TestRuntimeCatalog::without_model_upstream_route(
                "openai/gpt-5.5",
            )),
            Arc::new(RecordingStreamRelay::new(Arc::clone(&relay_requests))),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events/stream")
                .header("accept", "text/event-stream")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(body.ends_with("data: [DONE]\n\n"), "{body}");

    let relay_requests = relay_requests.lock().unwrap();
    assert_eq!(1, relay_requests.len());
    assert_eq!("openai/gpt-5.5", relay_requests[0].model);
    assert_eq!("gpt-5.5", relay_requests[0].provider_model);
    assert_eq!(
        Some("https://provider.example/v1"),
        relay_requests[0].provider_base_url.as_deref()
    );
    assert_eq!(
        Some("secret-ref"),
        relay_requests[0].provider_secret_ref.as_deref()
    );
}

#[tokio::test]
async fn app_runtime_stream_flushes_runtime_events_before_provider_stream_finishes() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("agent.stream".to_owned()),
                model: Some("openai/gpt-4o-mini".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: serde_json::json!({
                "prompt": "stream now"
            }),
            metadata: serde_json::json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_chat_stream_relay(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec![
                "runtime-event-uuid-1",
                "runtime-event-uuid-2",
            ])),
            Arc::new(TestRuntimeCatalog::default()),
            Arc::new(SlowStreamRelay),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events/stream")
                .header("accept", "text/event-stream")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let mut body = response.into_body();
    let first = tokio::time::timeout(Duration::from_millis(100), body.frame())
        .await
        .expect("first runtime SSE event should flush before delayed provider completion")
        .expect("first runtime SSE frame is required")
        .unwrap();
    let first_text = String::from_utf8(first.into_data().unwrap().to_vec()).unwrap();
    assert!(
        first_text.contains(r#""textDelta":"first""#),
        "{first_text}"
    );
    assert!(!first_text.contains("[DONE]"), "{first_text}");

    let remaining = axum::body::to_bytes(body, usize::MAX).await.unwrap();
    let remaining = String::from_utf8(remaining.to_vec()).unwrap();
    assert!(
        remaining.contains(r#""textDelta":" second""#),
        "{remaining}"
    );
    assert!(remaining.ends_with("data: [DONE]\n\n"), "{remaining}");
}

#[tokio::test]
async fn app_runtime_stream_execution_continues_after_client_disconnect_and_reconnect_replays_completion(
) {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("agent.stream".to_owned()),
                model: Some("openai/gpt-4o-mini".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: serde_json::json!({
                "prompt": "continue after refresh"
            }),
            metadata: serde_json::json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_chat_stream_relay(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec![
                "runtime-event-uuid-1",
                "runtime-event-uuid-2",
            ])),
            Arc::new(TestRuntimeCatalog::default()),
            Arc::new(SlowStreamRelay),
        );

    let response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events/stream")
                .header("accept", "text/event-stream")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, response.status());

    let mut disconnected_body = response.into_body();
    let first = tokio::time::timeout(Duration::from_millis(100), disconnected_body.frame())
        .await
        .expect("first runtime SSE event should flush before the page refresh")
        .expect("first runtime SSE frame is required")
        .unwrap();
    let first_text = String::from_utf8(first.into_data().unwrap().to_vec()).unwrap();
    assert!(
        first_text.contains(r#""textDelta":"first""#),
        "{first_text}"
    );
    drop(disconnected_body);

    tokio::time::timeout(
        Duration::from_millis(STREAM_COMPLETION_TIMEOUT_MILLIS),
        store.wait_for_complete_invocation(),
    )
    .await
    .expect("runtime execution should finalize after the browser stream disconnects");
    {
        let event_commands = store.create_event_commands.lock().unwrap();
        let delta_events = event_commands_of_type(&event_commands, "response.output_text.delta");
        assert_eq!(
            2,
            delta_events.len(),
            "runtime execution must keep consuming and persisting provider deltas after the browser stream disconnects"
        );
        assert_runtime_completed_event_recorded(&event_commands);
    }

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events/stream")
                .header("accept", "text/event-stream")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(body.contains(r#""textDelta":"first""#), "{body}");
    assert!(body.contains(r#""textDelta":" second""#), "{body}");
    assert!(body.ends_with("data: [DONE]\n\n"), "{body}");
}

#[tokio::test]
async fn app_runtime_stream_reconnect_on_another_node_uses_shared_stream_bus_without_duplicate_provider_execution(
) {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("agent.stream".to_owned()),
                model: Some("openai/gpt-4o-mini".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: serde_json::json!({
                "prompt": "continue after refresh on another node"
            }),
            metadata: serde_json::json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let stream_bus = Arc::new(InMemoryRuntimeStreamBus::default());
    let relay_calls = Arc::new(AtomicUsize::new(0));
    let router_a =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_chat_stream_relay_and_runtime_stream_bus(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec![
                "runtime-event-uuid-1",
                "runtime-event-uuid-2",
                "runtime-event-uuid-3",
            ])),
            Arc::new(TestRuntimeCatalog::default()),
            Arc::new(CountingSlowStreamRelay::new(Arc::clone(&relay_calls))),
            stream_bus.clone(),
        );
    let router_b =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_chat_stream_relay_and_runtime_stream_bus(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec![
                "runtime-event-uuid-b1",
                "runtime-event-uuid-b2",
                "runtime-event-uuid-b3",
            ])),
            Arc::new(TestRuntimeCatalog::default()),
            Arc::new(CountingSlowStreamRelay::new(Arc::clone(&relay_calls))),
            stream_bus,
        );

    let response = router_a
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events/stream")
                .header("accept", "text/event-stream")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, response.status());
    let mut disconnected_body = response.into_body();
    let first = tokio::time::timeout(Duration::from_millis(100), disconnected_body.frame())
        .await
        .expect("first runtime SSE event should flush from the first node")
        .expect("first runtime SSE frame is required")
        .unwrap();
    let first_text = String::from_utf8(first.into_data().unwrap().to_vec()).unwrap();
    assert!(
        first_text.contains(r#""textDelta":"first""#),
        "{first_text}"
    );
    drop(disconnected_body);

    let response = router_b
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events/stream?after_event_no=1")
                .header("accept", "text/event-stream")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, response.status());
    let body = tokio::time::timeout(Duration::from_secs(2), response_text(response))
        .await
        .expect("second node should finish from persisted events and shared stream bus");
    assert!(!body.contains(r#""textDelta":"first""#), "{body}");
    assert!(body.contains(r#""textDelta":" second""#), "{body}");
    assert!(body.ends_with("data: [DONE]\n\n"), "{body}");
    assert_eq!(
        1,
        relay_calls.load(Ordering::SeqCst),
        "cluster reconnect must not start a second provider stream"
    );
}

#[tokio::test]
async fn app_runtime_stream_parallel_subscribers_on_different_nodes_receive_complete_events_without_duplicates(
) {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("agent.stream".to_owned()),
                model: Some("openai/gpt-4o-mini".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: serde_json::json!({
                "prompt": "fan out to two browser subscribers"
            }),
            metadata: serde_json::json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let stream_bus = Arc::new(InMemoryRuntimeStreamBus::default());
    let relay_calls = Arc::new(AtomicUsize::new(0));
    let router_a =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_chat_stream_relay_and_runtime_stream_bus(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec![
                "runtime-event-uuid-1",
                "runtime-event-uuid-2",
                "runtime-event-uuid-3",
            ])),
            Arc::new(TestRuntimeCatalog::default()),
            Arc::new(CountingSlowStreamRelay::new(Arc::clone(&relay_calls))),
            stream_bus.clone(),
        );
    let router_b =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_chat_stream_relay_and_runtime_stream_bus(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec![
                "runtime-event-uuid-b1",
                "runtime-event-uuid-b2",
                "runtime-event-uuid-b3",
            ])),
            Arc::new(TestRuntimeCatalog::default()),
            Arc::new(CountingSlowStreamRelay::new(Arc::clone(&relay_calls))),
            stream_bus,
        );

    let request_a = Request::builder()
        .method("GET")
        .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events/stream")
        .header("accept", "text/event-stream")
        .internal_trusted_subject(100001, 0, 30)
        .body(Body::empty())
        .unwrap();
    let request_b = Request::builder()
        .method("GET")
        .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events/stream")
        .header("accept", "text/event-stream")
        .internal_trusted_subject(100001, 0, 30)
        .body(Body::empty())
        .unwrap();
    let (response_a, response_b) =
        tokio::join!(router_a.oneshot(request_a), router_b.oneshot(request_b));
    let response_a = response_a.unwrap();
    let response_b = response_b.unwrap();
    assert_eq!(StatusCode::OK, response_a.status());
    assert_eq!(StatusCode::OK, response_b.status());

    let (body_a, body_b) = tokio::join!(
        tokio::time::timeout(Duration::from_secs(2), response_text(response_a)),
        tokio::time::timeout(Duration::from_secs(2), response_text(response_b)),
    );
    let body_a = body_a.expect("first subscriber should receive the complete SSE body");
    let body_b = body_b.expect("second subscriber should receive the complete SSE body");
    for body in [&body_a, &body_b] {
        assert_eq!(1, body.matches(r#""textDelta":"first""#).count(), "{body}");
        assert_eq!(
            1,
            body.matches(r#""textDelta":" second""#).count(),
            "{body}"
        );
        assert!(body.ends_with("data: [DONE]\n\n"), "{body}");
    }
    assert_eq!(
        1,
        relay_calls.load(Ordering::SeqCst),
        "parallel SSE subscribers must share one provider execution in a cluster"
    );
}

#[tokio::test]
async fn app_runtime_stream_cancel_on_another_node_stops_provider_execution() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("agent.stream".to_owned()),
                model: Some("openai/gpt-4o-mini".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: serde_json::json!({
                "prompt": "stop active stream from another node"
            }),
            metadata: serde_json::json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let stream_bus = Arc::new(InMemoryRuntimeStreamBus::default());
    let relay_calls = Arc::new(AtomicUsize::new(0));
    let router_a =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_chat_stream_relay_and_runtime_stream_bus(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec![
                "runtime-event-uuid-1",
                "runtime-event-uuid-2",
                "runtime-event-uuid-3",
            ])),
            Arc::new(TestRuntimeCatalog::default()),
            Arc::new(CountingSlowStreamRelay::new(Arc::clone(&relay_calls))),
            stream_bus.clone(),
        );
    let router_b =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_chat_stream_relay_and_runtime_stream_bus(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec![
                "runtime-event-uuid-b1",
                "runtime-event-uuid-b2",
                "runtime-event-uuid-b3",
            ])),
            Arc::new(TestRuntimeCatalog::default()),
            Arc::new(CountingSlowStreamRelay::new(Arc::clone(&relay_calls))),
            stream_bus,
        );

    let response = router_a
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events/stream")
                .header("accept", "text/event-stream")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, response.status());
    let mut active_body = response.into_body();
    let first = tokio::time::timeout(Duration::from_millis(100), active_body.frame())
        .await
        .expect("first runtime SSE event should flush before stop")
        .expect("first runtime SSE frame is required")
        .unwrap();
    let first_text = String::from_utf8(first.into_data().unwrap().to_vec()).unwrap();
    assert!(
        first_text.contains(r#""textDelta":"first""#),
        "{first_text}"
    );

    let cancel_response = router_b
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/complete")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{
                      "status":"cancelled",
                      "finishReason":"stop",
                      "metadata":{"stopRequested":true}
                    }"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, cancel_response.status());

    let remaining = tokio::time::timeout(
        Duration::from_secs(2),
        axum::body::to_bytes(active_body, usize::MAX),
    )
    .await
    .expect("stream should stop after a distributed cancel")
    .unwrap();
    let body = String::from_utf8(remaining.to_vec()).unwrap();
    assert!(
        body.contains(r#""eventType":"runtime.cancelled""#),
        "{body}"
    );
    assert!(
        !body.contains(r#""eventType":"runtime.completed""#),
        "{body}"
    );
    assert!(body.ends_with("data: [DONE]\n\n"), "{body}");

    let complete_commands = store.complete_invocation_commands.lock().unwrap();
    assert!(
        complete_commands
            .iter()
            .any(|command| command.status == "cancelled"),
        "stop must persist the invocation as cancelled"
    );
    drop(complete_commands);

    let event_commands = store.create_event_commands.lock().unwrap();
    assert!(
        event_commands
            .iter()
            .any(|command| command.event_type == "runtime.cancelled"),
        "stop must persist a terminal runtime.cancelled event for reconnect replay"
    );
    assert_eq!(
        1,
        relay_calls.load(Ordering::SeqCst),
        "distributed stop must not start a second provider stream"
    );
}

#[tokio::test]
async fn app_runtime_stream_completion_preserves_existing_cancelled_terminal_event_status() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("chat.stream".to_owned()),
                model: Some("openai/gpt-4o-mini".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: serde_json::json!({
                "messages": [{"role": "user", "content": "stop race"}],
                "streamOptions": {"includeUsage": true}
            }),
            metadata: serde_json::json!({"surface": "playground"}),
        },
    ));
    *store.list_events_items.lock().unwrap() = vec![sample_event(), runtime_cancelled_event(2)];
    *store.has_terminal_event_results.lock().unwrap() = vec![false, false];
    let relay_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_chat_stream_relay(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec![
                "runtime-event-uuid-1",
                "runtime-event-uuid-2",
                "runtime-event-uuid-3",
            ])),
            Arc::new(TestRuntimeCatalog::default()),
            Arc::new(RecordingStreamRelay::new(Arc::clone(&relay_requests))),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events/stream")
                .header("accept", "text/event-stream")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(
        body.contains(r#""eventType":"runtime.cancelled""#),
        "{body}"
    );

    tokio::time::timeout(
        Duration::from_millis(STREAM_COMPLETION_TIMEOUT_MILLIS),
        store.wait_for_complete_invocation(),
    )
    .await
    .expect("stream completion should still finalize the invocation snapshot");
    let commands = store.complete_invocation_commands.lock().unwrap();
    assert!(
        !commands.is_empty(),
        "stream completion should still finalize the invocation snapshot"
    );
    assert_eq!(
        "cancelled",
        commands.last().unwrap().status,
        "existing terminal runtime.cancelled event must win over a later provider completion"
    );
}

#[tokio::test]
async fn app_runtime_stream_reconnect_after_terminal_event_does_not_restart_provider_execution() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("agent.stream".to_owned()),
                model: Some("openai/gpt-4o-mini".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: serde_json::json!({
                "prompt": "completed stream should not be restarted"
            }),
            metadata: serde_json::json!({"surface": "playground"}),
        },
    ));
    *store.list_events_items.lock().unwrap() = vec![
        AppRuntimeEventItem {
            id: "runtime-event-1".to_owned(),
            invocation_id: "runtime-invocation-1".to_owned(),
            event_no: 1,
            event_type: "response.output_text.delta".to_owned(),
            event_source: "provider".to_owned(),
            payload_json: serde_json::json!({"delta":"already done"}),
            text_delta: Some("already done".to_owned()),
            created_at: "2026-05-18 09:00:01".to_owned(),
        },
        runtime_completed_event(2),
    ];
    let relay_calls = Arc::new(AtomicUsize::new(0));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_chat_stream_relay_and_runtime_stream_bus(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-new"])),
            Arc::new(TestRuntimeCatalog::default()),
            Arc::new(CountingSlowStreamRelay::new(Arc::clone(&relay_calls))),
            Arc::new(InMemoryRuntimeStreamBus::default()),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events/stream?after_event_no=1")
                .header("accept", "text/event-stream")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(
        body.contains(r#""eventType":"runtime.completed""#),
        "completed terminal event must be replayed before [DONE]: {body}"
    );
    assert!(body.ends_with("data: [DONE]\n\n"), "{body}");
    assert_eq!(
        0,
        relay_calls.load(Ordering::SeqCst),
        "a persisted terminal runtime event must prevent duplicate provider execution even if invocation status is still streaming"
    );
}

#[tokio::test]
async fn app_runtime_stream_rechecks_terminal_event_after_execution_claim() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("agent.stream".to_owned()),
                model: Some("openai/gpt-4o-mini".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: serde_json::json!({
                "prompt": "terminal event wins after claim"
            }),
            metadata: serde_json::json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    *store.has_terminal_event_results.lock().unwrap() = vec![false, true];
    let relay_calls = Arc::new(AtomicUsize::new(0));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_chat_stream_relay_and_runtime_stream_bus(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-new"])),
            Arc::new(TestRuntimeCatalog::default()),
            Arc::new(CountingSlowStreamRelay::new(Arc::clone(&relay_calls))),
            Arc::new(InMemoryRuntimeStreamBus::default()),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events/stream")
                .header("accept", "text/event-stream")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert_eq!("data: [DONE]\n\n", body);
    assert_eq!(
        0,
        relay_calls.load(Ordering::SeqCst),
        "a terminal event observed after execution claim must still prevent duplicate provider execution"
    );
}

#[tokio::test]
async fn app_runtime_stream_completed_invocation_without_events_does_not_restart_provider_execution(
) {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "completed".to_owned(),
                streaming: true,
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("agent.stream".to_owned()),
                model: Some("openai/gpt-4o-mini".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: serde_json::json!({
                "prompt": "completed invocation should not be restarted"
            }),
            metadata: serde_json::json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let relay_calls = Arc::new(AtomicUsize::new(0));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_chat_stream_relay_and_runtime_stream_bus(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-new"])),
            Arc::new(TestRuntimeCatalog::default()),
            Arc::new(CountingSlowStreamRelay::new(Arc::clone(&relay_calls))),
            Arc::new(InMemoryRuntimeStreamBus::default()),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events/stream")
                .header("accept", "text/event-stream")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert_eq!("data: [DONE]\n\n", body);
    assert_eq!(
        0,
        relay_calls.load(Ordering::SeqCst),
        "a terminal invocation status must prevent duplicate provider execution even without terminal runtime events"
    );
}

#[tokio::test]
async fn app_runtime_stream_failed_terminal_event_is_serialized_before_done() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "failed".to_owned(),
                streaming: true,
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("agent.stream".to_owned()),
                model: Some("openai/gpt-4o-mini".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: serde_json::json!({
                "prompt": "failed invocation should replay a structured terminal event"
            }),
            metadata: serde_json::json!({"surface": "playground"}),
        },
    ));
    *store.list_events_items.lock().unwrap() = vec![runtime_failed_event(1)];
    let relay_calls = Arc::new(AtomicUsize::new(0));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_chat_stream_relay_and_runtime_stream_bus(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(Vec::new())),
            Arc::new(TestRuntimeCatalog::default()),
            Arc::new(CountingSlowStreamRelay::new(Arc::clone(&relay_calls))),
            Arc::new(InMemoryRuntimeStreamBus::default()),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events/stream")
                .header("accept", "text/event-stream")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(body.contains(r#""eventType":"runtime.failed""#), "{body}");
    assert!(
        body.contains(r#""errorMessageMasked":"upstream stream disconnected""#),
        "{body}"
    );
    assert!(body.ends_with("data: [DONE]\n\n"), "{body}");
    assert_eq!(
        0,
        relay_calls.load(Ordering::SeqCst),
        "a failed terminal event must be replayed without restarting provider execution"
    );
}

#[tokio::test]
async fn app_runtime_stream_start_failure_returns_failed_sse_event_without_http_500() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                streaming: true,
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("agent.stream".to_owned()),
                model: Some("openai/gpt-4o-mini".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: serde_json::json!({
                "prompt": "provider rejects before body streaming starts"
            }),
            metadata: serde_json::json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_chat_stream_relay_and_runtime_stream_bus(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-failed"])),
            Arc::new(TestRuntimeCatalog::default()),
            Arc::new(FailingStreamRelay),
            Arc::new(InMemoryRuntimeStreamBus::default()),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events/stream")
                .header("accept", "text/event-stream")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(body.contains(r#""eventType":"runtime.failed""#), "{body}");
    assert!(
        body.contains("provider connection failed before stream"),
        "{body}"
    );
    assert!(body.ends_with("data: [DONE]\n\n"), "{body}");
    assert_eq!(
        1,
        store.create_event_commands.lock().unwrap().len(),
        "provider start failure must be persisted once for reconnect replay"
    );
}

#[tokio::test]
async fn app_runtime_complete_invocation_updates_status_and_response_snapshot() {
    let store = Arc::new(TestAppRuntimeStore::default());
    let router = sdkwork_clawrouter_router_service::api::app_runtime_router_with_store(
        store.clone(),
        Arc::new(SequentialUuidGenerator::new(Vec::new())),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/complete")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{
                      "status":"completed",
                      "providerResponseId":"msg_123",
                      "finishReason":"stop",
                      "latencyMs":"1200",
                      "ttftMs":"200",
                      "exitCode":"0",
                      "responseJson":{"id":"msg_123"},
                      "usageJson":{"inputTokens":10,"outputTokens":20}
                    }"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("completed", payload["data"]["item"]["status"]);

    let commands = store.complete_invocation_commands.lock().unwrap();
    assert_eq!(1, commands.len());
    assert_eq!("runtime-invocation-1", commands[0].invocation_id);
    assert_eq!("completed", commands[0].status);
    assert_eq!(
        "msg_123",
        commands[0].provider_response_id.as_deref().unwrap()
    );
    assert_eq!(1200, commands[0].latency_ms.unwrap());
}

#[tokio::test]
async fn app_runtime_cancel_complete_preserves_existing_completed_terminal_event_status() {
    let store = Arc::new(TestAppRuntimeStore::default());
    *store.list_events_items.lock().unwrap() = vec![sample_event(), runtime_completed_event(2)];
    let router = sdkwork_clawrouter_router_service::api::app_runtime_router_with_store(
        store.clone(),
        Arc::new(SequentialUuidGenerator::new(vec![
            "runtime-event-cancel-after-completed",
        ])),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/complete")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from(
                    r#"{
                      "status":"cancelled",
                      "finishReason":"stop",
                      "metadata":{"stopRequested":true}
                    }"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let commands = store.complete_invocation_commands.lock().unwrap();
    assert!(
        !commands.is_empty(),
        "stop request should still reconcile the invocation snapshot"
    );
    assert_eq!(
        "completed",
        commands.last().unwrap().status,
        "existing runtime.completed terminal event must not be overwritten by a late stop"
    );
}

#[tokio::test]
async fn app_runtime_does_not_expose_playground_backend_namespace() {
    let router = sdkwork_clawrouter_router_service::api::app_runtime_router_with_store(
        Arc::new(TestAppRuntimeStore::default()),
        Arc::new(SequentialUuidGenerator::new(Vec::new())),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/playground/runtime/invocations")
                .header("content-type", "application/json")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_FOUND, response.status());
}

#[tokio::test]
async fn app_runtime_gateway_executor_routes_openai_chat_invocations_to_gateway_chat_completions() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("chat.stream".to_owned()),
                model: Some("openai/gpt-4o-mini".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "messages": [{"role": "user", "content": "ping"}],
                "selectedModel": "openai/gpt-4o-mini"
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_model_format(
                "openai/gpt-4o-mini",
                Some("openai_chat"),
            )),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events/stream")
                .header("accept", "text/event-stream")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(body.contains(r#""textDelta":"hello""#), "{body}");
    assert!(body.ends_with("data: [DONE]\n\n"), "{body}");

    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!(Method::POST, gateway_requests[0].method);
    assert_eq!("/v1/chat/completions", gateway_requests[0].path);
    assert!(gateway_requests[0].authorization.is_empty());
    assert_eq!(
        101,
        gateway_requests[0]
            .internal_principal
            .as_ref()
            .unwrap()
            .api_key_id
    );
    assert_eq!(Some("req-1"), gateway_requests[0].request_id.as_deref());
    assert_eq!(Some("trace-1"), gateway_requests[0].trace_id.as_deref());
    assert_eq!("gpt-4o-mini", gateway_requests[0].body["model"]);
    assert_eq!(Some(true), gateway_requests[0].body["stream"].as_bool());
    assert_eq!("ping", gateway_requests[0].body["messages"][0]["content"]);
}

#[tokio::test]
async fn app_runtime_prefers_gateway_chat_completions_over_local_relay_when_both_are_configured() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("chat.stream".to_owned()),
                model: Some("openai/gpt-5.5".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "messages": [{"role": "user", "content": "ping"}],
                "selectedModel": "openai/gpt-5.5"
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let relay_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client_chat_stream_relay(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::without_model_upstream_route(
                "openai/gpt-5.5",
            )),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
            Arc::new(RecordingStreamRelay::new(Arc::clone(&relay_requests))),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(body.contains(r#""textDelta":"hello""#), "{body}");
    assert!(body.ends_with("data: [DONE]\n\n"), "{body}");
    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!(Method::POST, gateway_requests[0].method);
    assert_eq!("/v1/chat/completions", gateway_requests[0].path);
    assert_eq!("gpt-5.5", gateway_requests[0].body["model"]);
    assert_eq!(Some(true), gateway_requests[0].body["stream"].as_bool());
    drop(gateway_requests);
    let relay_requests = relay_requests.lock().unwrap();
    assert!(
        relay_requests.is_empty(),
        "app runtime chat streaming must go through gateway /v1/chat/completions when a gateway client is configured"
    );
}

#[tokio::test]
async fn app_runtime_gateway_executor_accepts_native_slash_chat_model_for_route_probe() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("chat.stream".to_owned()),
                model: Some("anthropic/claude-3-opus".to_owned()),
                provider: Some("openrouter".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "messages": [{"role": "user", "content": "ping"}],
                "selectedModel": "anthropic/claude-3-opus"
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store,
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_model_format(
                "openrouter/anthropic/claude-3-opus",
                Some("openai_chat"),
            )),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!("/v1/chat/completions", gateway_requests[0].path);
    assert_eq!("anthropic/claude-3-opus", gateway_requests[0].body["model"]);
    assert_eq!("ping", gateway_requests[0].body["messages"][0]["content"]);
}

#[tokio::test]
async fn app_runtime_gateway_executor_prefers_console_default_api_key_without_frontend_route_key() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("chat.stream".to_owned()),
                model: Some("openai/gpt-4o-mini".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "messages": [{"role": "user", "content": "ping"}],
                "selectedModel": "openai/gpt-4o-mini"
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store,
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_api_keys(vec![
                TestRuntimeApiKeyFixture {
                    id: 101,
                    group_id: 10,
                    default_for_runtime: false,
                },
                TestRuntimeApiKeyFixture {
                    id: 202,
                    group_id: 10,
                    default_for_runtime: true,
                },
            ])),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert!(gateway_requests[0].authorization.is_empty());
    assert_eq!(
        202,
        gateway_requests[0]
            .internal_principal
            .as_ref()
            .unwrap()
            .api_key_id
    );
    assert!(gateway_requests[0].body.get("routeKeyId").is_none());
}

#[tokio::test]
async fn app_runtime_gateway_executor_selects_lowest_route_capable_api_key_when_no_default_is_set()
{
    for _ in 0..24 {
        let store = Arc::new(TestAppRuntimeStore::with_invocation(
            AppRuntimeInvocationRecord {
                item: AppRuntimeInvocationItem {
                    status: "streaming".to_owned(),
                    runtime: "openai_compatible".to_owned(),
                    endpoint: Some("chat.stream".to_owned()),
                    model: Some("openai/gpt-4o-mini".to_owned()),
                    provider: Some("openai".to_owned()),
                    ..sample_invocation()
                },
                request_json: json!({
                    "messages": [{"role": "user", "content": "ping"}],
                    "selectedModel": "openai/gpt-4o-mini"
                }),
                metadata: json!({"surface": "playground"}),
            },
        ));
        store.list_events_items.lock().unwrap().clear();
        let gateway_requests = Arc::new(Mutex::new(Vec::new()));
        let router = sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store,
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_api_keys(vec![
                TestRuntimeApiKeyFixture {
                    id: 202,
                    group_id: 10,
                    default_for_runtime: false,
                },
                TestRuntimeApiKeyFixture {
                    id: 101,
                    group_id: 10,
                    default_for_runtime: false,
                },
            ])),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

        let response = runtime_stream_request(router).await;

        assert_eq!(StatusCode::OK, response.status());
        let gateway_requests = gateway_requests.lock().unwrap();
        assert_eq!(1, gateway_requests.len());
        assert!(gateway_requests[0].authorization.is_empty());
        assert_eq!(
            101,
            gateway_requests[0]
                .internal_principal
                .as_ref()
                .unwrap()
                .api_key_id
        );
    }
}

#[tokio::test]
async fn app_runtime_gateway_executor_prefers_request_route_key_over_console_default_api_key() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("chat.stream".to_owned()),
                model: Some("openai/gpt-4o-mini".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "messages": [{"role": "user", "content": "ping"}],
                "routeKeyId": 101,
                "selectedModel": "openai/gpt-4o-mini"
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store,
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_api_keys(vec![
                TestRuntimeApiKeyFixture {
                    id: 101,
                    group_id: 10,
                    default_for_runtime: false,
                },
                TestRuntimeApiKeyFixture {
                    id: 202,
                    group_id: 10,
                    default_for_runtime: true,
                },
            ])),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert!(gateway_requests[0].authorization.is_empty());
    assert_eq!(
        101,
        gateway_requests[0]
            .internal_principal
            .as_ref()
            .unwrap()
            .api_key_id
    );
    assert!(gateway_requests[0].body.get("routeKeyId").is_none());
}

#[tokio::test]
async fn app_runtime_gateway_executor_rejects_request_route_key_outside_trusted_subject() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("chat.stream".to_owned()),
                model: Some("openai/gpt-4o-mini".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "messages": [{"role": "user", "content": "ping"}],
                "routeKeyId": 909,
                "selectedModel": "openai/gpt-4o-mini"
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store,
            Arc::new(SequentialUuidGenerator::new(Vec::new())),
            Arc::new(TestRuntimeCatalog::with_foreign_api_key(909)),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

    let response = runtime_stream_request(router).await;

    let body = runtime_failed_sse_text(response).await;
    assert!(
        body.contains("runtime route API key does not belong to scoped subject"),
        "{body}"
    );
    assert!(gateway_requests.lock().unwrap().is_empty());
}

#[tokio::test]
async fn app_runtime_gateway_executor_prefers_route_capable_api_key_over_unroutable_default_key() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("chat.stream".to_owned()),
                model: Some("openai/gpt-4o-mini".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "messages": [{"role": "user", "content": "ping"}],
                "selectedModel": "openai/gpt-4o-mini"
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store,
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_api_keys(vec![
                TestRuntimeApiKeyFixture {
                    id: 101,
                    group_id: 10,
                    default_for_runtime: false,
                },
                TestRuntimeApiKeyFixture {
                    id: 202,
                    group_id: 20,
                    default_for_runtime: true,
                },
            ])),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert!(gateway_requests[0].authorization.is_empty());
    assert_eq!(
        101,
        gateway_requests[0]
            .internal_principal
            .as_ref()
            .unwrap()
            .api_key_id
    );
}

#[tokio::test]
async fn app_runtime_gateway_executor_does_not_call_gateway_when_no_api_key_can_route_request() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("chat.stream".to_owned()),
                model: Some("openai/gpt-4o-mini".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "messages": [{"role": "user", "content": "ping"}],
                "selectedModel": "openai/gpt-4o-mini"
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store,
            Arc::new(SequentialUuidGenerator::new(Vec::new())),
            Arc::new(TestRuntimeCatalog::with_api_keys(vec![
                TestRuntimeApiKeyFixture {
                    id: 202,
                    group_id: 20,
                    default_for_runtime: true,
                },
            ])),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

    let response = runtime_stream_request(router).await;

    let body = runtime_failed_sse_text(response).await;
    assert!(
        body.contains("runtime route API key cannot route requested model"),
        "{body}"
    );
    assert!(gateway_requests.lock().unwrap().is_empty());
}

#[tokio::test]
async fn app_runtime_gateway_executor_defers_empty_route_snapshot_probe_to_gateway() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("chat.stream".to_owned()),
                model: Some("openai/gpt-5.5".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "messages": [{"role": "user", "content": "ping"}],
                "selectedModel": "openai/gpt-5.5"
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store,
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::without_runtime_routes("openai/gpt-5.5")),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!("/v1/chat/completions", gateway_requests[0].path);
    assert!(gateway_requests[0].authorization.is_empty());
    assert_eq!(
        101,
        gateway_requests[0]
            .internal_principal
            .as_ref()
            .unwrap()
            .api_key_id
    );
    assert_eq!("gpt-5.5", gateway_requests[0].body["model"]);
}

#[tokio::test]
async fn app_runtime_gateway_executor_retries_transient_empty_gateway_route_snapshot() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("chat.stream".to_owned()),
                model: Some("openai/gpt-5.5".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "messages": [{"role": "user", "content": "ping"}],
                "selectedModel": "openai/gpt-5.5"
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store,
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::without_runtime_routes("openai/gpt-5.5")),
            Arc::new(
                RecordingGatewayRuntimeClient::with_transient_empty_route_snapshot(Arc::clone(
                    &gateway_requests,
                )),
            ),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(body.contains(r#""textDelta":"hello""#), "{body}");
    assert!(body.ends_with("data: [DONE]\n\n"), "{body}");
    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(2, gateway_requests.len());
    assert_eq!("gpt-5.5", gateway_requests[0].body["model"]);
    assert_eq!("gpt-5.5", gateway_requests[1].body["model"]);
}

#[tokio::test]
async fn app_runtime_gateway_executor_does_not_retry_configured_route_mismatch() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("chat.stream".to_owned()),
                model: Some("openai/gpt-5.5".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "messages": [{"role": "user", "content": "ping"}],
                "selectedModel": "openai/gpt-5.5"
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store,
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::without_runtime_routes("openai/gpt-5.5")),
            Arc::new(
                RecordingGatewayRuntimeClient::with_configured_route_mismatch(Arc::clone(
                    &gateway_requests,
                )),
            ),
        );

    let response = runtime_stream_request(router).await;

    let body = runtime_failed_sse_text(response).await;
    assert!(
        body.contains("upstream_route_not_available"),
        "must return the gateway route diagnostic without retrying unrelated config errors: {body}"
    );
    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
}

#[tokio::test]
async fn app_runtime_gateway_executor_includes_model_when_gateway_returns_model_route_miss() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("chat.stream".to_owned()),
                model: Some("alibaba/qwen3.6-max-preview".to_owned()),
                provider: Some("alibaba".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "messages": [{"role": "user", "content": "ping"}],
                "selectedModel": "alibaba/qwen3.6-max-preview"
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store,
            Arc::new(SequentialUuidGenerator::new(Vec::new())),
            Arc::new(TestRuntimeCatalog::with_model_format(
                "alibaba/qwen3.6-max-preview",
                Some("openai_compatible"),
            )),
            Arc::new(
                RecordingGatewayRuntimeClient::with_model_route_miss_response(Arc::clone(
                    &gateway_requests,
                )),
            ),
        );

    let response = runtime_stream_request(router).await;

    let body = runtime_failed_sse_text(response).await;
    assert!(body.contains("group:model_route_miss"), "{body}");
    assert!(body.contains("model=alibaba/qwen3.6-max-preview"), "{body}");
    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!(
        "alibaba/qwen3.6-max-preview",
        gateway_requests[0].body["model"]
    );
    assert!(gateway_requests[0].body.get("selectedModel").is_none());
}

#[tokio::test]
async fn app_runtime_gateway_executor_explains_pricing_plan_route_probe_failures() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("chat.stream".to_owned()),
                model: Some("openai/gpt-4o-mini".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "messages": [{"role": "user", "content": "ping"}],
                "selectedModel": "openai/gpt-4o-mini"
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store,
            Arc::new(SequentialUuidGenerator::new(Vec::new())),
            Arc::new(TestRuntimeCatalog::without_pricing_plan()),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

    let response = runtime_stream_request(router).await;

    let body = runtime_failed_sse_text(response).await;
    assert!(body.contains("pricing plan not found: standard"), "{body}");
    assert!(gateway_requests.lock().unwrap().is_empty());
}

#[tokio::test]
async fn app_runtime_gateway_executor_routes_codex_responses_invocations_to_gateway_responses() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "codex".to_owned(),
                endpoint: Some("responses.stream".to_owned()),
                model: Some("openai/codex-mini-latest".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "messages": [{"role": "user", "content": "inspect repo"}]
            }),
            metadata: json!({}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store,
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_model_format(
                "openai/codex-mini-latest",
                Some("openai_responses"),
            )),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(body.contains(r#""textDelta":"hello""#), "{body}");
    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!("/v1/responses", gateway_requests[0].path);
    assert_eq!(Some(false), gateway_requests[0].body["stream"].as_bool());
    assert_eq!(
        "openai/codex-mini-latest",
        gateway_requests[0].body["model"]
    );
    assert_eq!(
        "inspect repo",
        gateway_requests[0].body["input"][0]["content"]
    );
}

#[tokio::test]
async fn app_runtime_gateway_executor_routes_claude_code_to_anthropic_messages() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "claude_code".to_owned(),
                endpoint: Some("messages.stream".to_owned()),
                model: Some("anthropic/claude-sonnet-4-5".to_owned()),
                provider: Some("anthropic".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "messages": [{"role": "user", "content": "write patch"}]
            }),
            metadata: json!({}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store,
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_model_format(
                "anthropic/claude-sonnet-4-5",
                Some("anthropic_messages"),
            )),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(body.contains(r#""textDelta":"hello""#), "{body}");
    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!("/provider/anthropic/v1/messages", gateway_requests[0].path);
    assert_eq!(Some(true), gateway_requests[0].body["stream"].as_bool());
    assert_eq!("claude-sonnet-4-5", gateway_requests[0].body["model"]);
    assert_eq!(
        "write patch",
        gateway_requests[0].body["messages"][0]["content"]
    );
    assert_eq!(4096, gateway_requests[0].body["max_tokens"]);
}

#[tokio::test]
async fn app_runtime_gateway_executor_routes_gemini_models_to_google_stream_generate_content() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "gemini".to_owned(),
                endpoint: Some("generateContent.stream".to_owned()),
                model: Some("google/gemini-2.5-flash".to_owned()),
                provider: Some("google".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "messages": [{"role": "user", "content": "summarize"}],
                "generationConfig": {"temperature": 0.2}
            }),
            metadata: json!({}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_model_format(
                "google/gemini-2.5-flash",
                Some("google_gemini"),
            )),
            Arc::new(RecordingGatewayRuntimeClient::with_gemini_response(
                Arc::clone(&gateway_requests),
            )),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(body.contains(r#""textDelta":"gemini hello""#), "{body}");
    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!(
        "/provider/google/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse",
        gateway_requests[0].path
    );
    assert_eq!(
        "summarize",
        gateway_requests[0].body["contents"][0]["parts"][0]["text"]
    );
    assert_eq!(
        0.2,
        gateway_requests[0].body["generationConfig"]["temperature"]
    );
}

#[tokio::test]
async fn app_runtime_gateway_executor_preserves_markdown_boundaries_from_structured_text_parts() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "gemini".to_owned(),
                endpoint: Some("generateContent.stream".to_owned()),
                model: Some("google/gemini-2.5-flash".to_owned()),
                provider: Some("google".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "messages": [{"role": "user", "content": "write code"}]
            }),
            metadata: json!({}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_model_format(
                "google/gemini-2.5-flash",
                Some("google_gemini"),
            )),
            Arc::new(
                RecordingGatewayRuntimeClient::with_gemini_markdown_parts_response(Arc::clone(
                    &gateway_requests,
                )),
            ),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(
        body.contains(r#""textDelta":"```ts\nconst first = 1;\nconst second = 2;\n```""#),
        "{body}"
    );

    let event_commands = store.create_event_commands.lock().unwrap();
    let delta_event = single_event_command_of_type(&event_commands, "response.output_text.delta");
    assert_eq!(
        Some("```ts\nconst first = 1;\nconst second = 2;\n```"),
        delta_event.text_delta.as_deref()
    );
    assert_runtime_completed_event_recorded(&event_commands);
}

#[tokio::test]
async fn app_runtime_gateway_executor_routes_frontend_chat_responses_model_to_gateway_chat_completions(
) {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("chat.stream".to_owned()),
                model: Some("openai/codex-mini-latest".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "messages": [{"role": "user", "content": "inspect repo"}],
                "prompt": "inspect repo",
                "selectedModel": "openai/codex-mini-latest"
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store,
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_model_format(
                "openai/codex-mini-latest",
                Some("openai_responses"),
            )),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!("/v1/chat/completions", gateway_requests[0].path);
    assert_eq!(Some(true), gateway_requests[0].body["stream"].as_bool());
    assert_eq!(
        "openai/codex-mini-latest",
        gateway_requests[0].body["model"]
    );
    assert_eq!(
        "inspect repo",
        gateway_requests[0].body["messages"][0]["content"]
    );
    assert!(gateway_requests[0].body.get("selectedModel").is_none());
}

#[tokio::test]
async fn app_runtime_gateway_executor_routes_frontend_chat_claude_model_to_anthropic_messages() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("chat.stream".to_owned()),
                model: Some("anthropic/claude-sonnet-4-5".to_owned()),
                provider: Some("anthropic".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "messages": [{"role": "user", "content": "write patch"}],
                "prompt": "write patch",
                "selectedModel": "anthropic/claude-sonnet-4-5"
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store,
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_model_format(
                "anthropic/claude-sonnet-4-5",
                Some("anthropic_messages"),
            )),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!("/provider/anthropic/v1/messages", gateway_requests[0].path);
    assert_eq!(Some(true), gateway_requests[0].body["stream"].as_bool());
    assert_eq!("claude-sonnet-4-5", gateway_requests[0].body["model"]);
    assert_eq!(
        "write patch",
        gateway_requests[0].body["messages"][0]["content"]
    );
    assert!(gateway_requests[0].body.get("selectedModel").is_none());
}

#[tokio::test]
async fn app_runtime_gateway_executor_routes_frontend_chat_gemini_model_to_google_stream_generate_content(
) {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("chat.stream".to_owned()),
                model: Some("google/gemini-2.5-flash".to_owned()),
                provider: Some("google".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "messages": [{"role": "user", "content": "summarize"}],
                "prompt": "summarize",
                "selectedModel": "google/gemini-2.5-flash"
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store,
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_model_format(
                "google/gemini-2.5-flash",
                Some("google_gemini"),
            )),
            Arc::new(RecordingGatewayRuntimeClient::with_gemini_response(
                Arc::clone(&gateway_requests),
            )),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(body.contains(r#""textDelta":"gemini hello""#), "{body}");
    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!(
        "/provider/google/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse",
        gateway_requests[0].path
    );
    assert_eq!(
        "summarize",
        gateway_requests[0].body["contents"][0]["parts"][0]["text"]
    );
}

#[tokio::test]
async fn app_runtime_gateway_executor_routes_frontend_agent_gemini_image_shape_to_google_stream_generate_content(
) {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("agent.stream".to_owned()),
                model: Some("google/gemini-2.5-flash-image".to_owned()),
                provider: Some("google".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "prompt": "brand launch poster",
                "selectedModel": "google/gemini-2.5-flash-image",
                "targetType": "image",
                "generationConfig": {
                    "aspectRatio": "1:1",
                    "imageCount": 1
                }
            }),
            metadata: json!({"surface": "playground", "targetType": "image"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_model_format(
                "google/gemini-2.5-flash-image",
                Some("google_gemini"),
            )),
            Arc::new(RecordingGatewayRuntimeClient::with_gemini_image_response(
                Arc::clone(&gateway_requests),
            )),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(body.contains(r#""eventType":"generation.asset""#), "{body}");
    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!(
        "/provider/google/v1beta/models/gemini-2.5-flash-image:streamGenerateContent?alt=sse",
        gateway_requests[0].path
    );
    assert_eq!(
        "brand launch poster",
        gateway_requests[0].body["contents"][0]["parts"][0]["text"]
    );
}

#[tokio::test]
async fn app_runtime_gateway_executor_routes_image_generation_to_gateway_images_and_emits_assets() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("agent.stream".to_owned()),
                model: Some("openai/gpt-image-2".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "prompt": "brand launch poster",
                "selectedModel": "openai/gpt-image-2",
                "targetType": "image",
                "generationConfig": {
                    "aspectRatio": "16:9",
                    "imageCount": 2,
                    "imageMode": {"aspectRatio": "16:9", "count": 2, "quality": "2k"},
                    "quality": "high"
                }
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_model_format(
                "openai/gpt-image-2",
                Some("openai_compatible"),
            )),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(body.contains(r#""eventType":"generation.asset""#), "{body}");
    assert!(
        body.contains("https://cdn.example.test/generated/poster.png"),
        "{body}"
    );
    assert!(body.ends_with("data: [DONE]\n\n"), "{body}");

    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!(Method::POST, gateway_requests[0].method);
    assert_eq!("/v1/images/generations", gateway_requests[0].path);
    assert!(gateway_requests[0].authorization.is_empty());
    assert_eq!(
        101,
        gateway_requests[0]
            .internal_principal
            .as_ref()
            .unwrap()
            .api_key_id
    );
    assert_eq!("openai/gpt-image-2", gateway_requests[0].body["model"]);
    assert_eq!("brand launch poster", gateway_requests[0].body["prompt"]);
    assert_eq!(2, gateway_requests[0].body["n"]);
    assert_eq!("1536x1024", gateway_requests[0].body["size"]);
    assert_eq!("high", gateway_requests[0].body["quality"]);
    assert!(gateway_requests[0].body.get("generationConfig").is_none());
    assert!(gateway_requests[0].body.get("selectedModel").is_none());
    assert!(gateway_requests[0].body.get("targetType").is_none());

    let event_commands = store.create_event_commands.lock().unwrap();
    let asset_event = single_event_command_of_type(&event_commands, "generation.asset");
    assert_eq!("generation", asset_event.event_source);
    assert_eq!(
        "https://cdn.example.test/generated/poster.png",
        asset_event.payload_json["assets"][0]["asset"]["url"]
    );
    assert_eq!(
        "image",
        asset_event.payload_json["assets"][0]["asset"]["kind"]
    );
    assert_eq!(
        "external_url",
        asset_event.payload_json["assets"][0]["asset"]["source"]
    );
    assert!(asset_event.payload_json["assets"][0].get("url").is_none());
    assert!(asset_event.payload_json["assets"][0].get("thumb").is_none());
    assert_eq!(12, asset_event.payload_json["usage"]["input_tokens"]);
    assert_eq!(2, asset_event.payload_json["usage"]["output_tokens"]);
    assert_eq!(14, asset_event.payload_json["usage"]["total_tokens"]);
    assert_runtime_completed_event_recorded(&event_commands);
}

#[tokio::test]
async fn app_runtime_gateway_executor_routes_reference_image_generation_to_gateway_image_edits() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("agent.stream".to_owned()),
                model: Some("openai/gpt-image-2".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "prompt": "turn this sketch into a campaign poster",
                "selectedModel": "openai/gpt-image-2",
                "targetType": "image",
                "generationConfig": {
                    "aspectRatio": "1:1",
                    "imageCount": 1,
                    "imageMode": {"aspectRatio": "1:1", "count": 1, "quality": "2k"}
                },
                "referenceImages": [{
                    "name": "sketch.png",
                    "mimeType": "image/png",
                    "dataUrl": "data:image/png;base64,cmVmZXJlbmNlLWltYWdl"
                }]
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store,
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_model_format(
                "openai/gpt-image-2",
                Some("openai_compatible"),
            )),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(body.contains(r#""eventType":"generation.asset""#), "{body}");

    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!(Method::POST, gateway_requests[0].method);
    assert_eq!("/v1/images/edits", gateway_requests[0].path);
    assert!(gateway_requests[0]
        .content_type
        .starts_with("multipart/form-data; boundary="));
    assert!(gateway_requests[0]
        .body_text
        .contains("name=\"model\"\r\n\r\nopenai/gpt-image-2\r\n"));
    assert!(gateway_requests[0]
        .body_text
        .contains("name=\"prompt\"\r\n\r\nturn this sketch into a campaign poster\r\n"));
    assert!(gateway_requests[0]
        .body_text
        .contains("name=\"image\"; filename=\"sketch.png\""));
    assert!(gateway_requests[0].body_text.contains("reference-image"));
    assert!(gateway_requests[0].body.get("referenceImages").is_none());
}

#[tokio::test]
async fn app_runtime_gateway_executor_routes_gemini_image_generation_and_emits_inline_image_assets()
{
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "gemini".to_owned(),
                endpoint: Some("agent.stream".to_owned()),
                model: Some("google/gemini-2.5-flash-image".to_owned()),
                provider: Some("google".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "prompt": "brand launch poster",
                "selectedModel": "google/gemini-2.5-flash-image",
                "targetType": "image",
                "generationConfig": {
                    "aspectRatio": "1:1",
                    "imageCount": 1
                }
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_model_format(
                "google/gemini-2.5-flash-image",
                Some("google_gemini"),
            )),
            Arc::new(RecordingGatewayRuntimeClient::with_gemini_image_response(
                Arc::clone(&gateway_requests),
            )),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(body.contains(r#""eventType":"generation.asset""#), "{body}");
    assert!(
        body.contains("data:image/png;base64,aW1hZ2UtYnl0ZXM="),
        "{body}"
    );
    assert!(body.ends_with("data: [DONE]\n\n"), "{body}");

    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!(
        "/provider/google/v1beta/models/gemini-2.5-flash-image:streamGenerateContent?alt=sse",
        gateway_requests[0].path
    );
    assert_eq!(
        "brand launch poster",
        gateway_requests[0].body["contents"][0]["parts"][0]["text"]
    );

    let event_commands = store.create_event_commands.lock().unwrap();
    let asset_event = single_event_command_of_type(&event_commands, "generation.asset");
    assert_eq!("generation", asset_event.event_source);
    assert_eq!(
        "data:image/png;base64,aW1hZ2UtYnl0ZXM=",
        asset_event.payload_json["assets"][0]["asset"]["url"]
    );
    assert_eq!(
        "image",
        asset_event.payload_json["assets"][0]["asset"]["kind"]
    );
    assert_eq!(
        "data_url",
        asset_event.payload_json["assets"][0]["asset"]["source"]
    );
    assert!(asset_event.payload_json["assets"][0].get("url").is_none());
    assert_runtime_completed_event_recorded(&event_commands);
}

#[tokio::test]
async fn app_runtime_gateway_executor_routes_suno_music_generation_to_provider_music_and_emits_assets(
) {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("agent.stream".to_owned()),
                model: Some("suno/suno-v5".to_owned()),
                provider: Some("suno".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "prompt": "upbeat synthwave launch theme",
                "selectedModel": "suno/suno-v5",
                "targetType": "music",
                "generationConfig": {
                    "durationSeconds": 30,
                    "quality": "high"
                }
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_model_format(
                "suno/suno-v5",
                Some("vendor_native"),
            )),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(body.contains(r#""eventType":"generation.asset""#), "{body}");
    assert!(
        body.contains("https://cdn.example.test/generated/theme.mp3"),
        "{body}"
    );
    assert!(body.ends_with("data: [DONE]\n\n"), "{body}");

    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!(Method::POST, gateway_requests[0].method);
    assert_eq!(
        "/provider/suno/v1/music/generations",
        gateway_requests[0].path
    );
    assert!(gateway_requests[0].authorization.is_empty());
    assert_eq!(
        101,
        gateway_requests[0]
            .internal_principal
            .as_ref()
            .unwrap()
            .api_key_id
    );
    assert_eq!("suno-v5", gateway_requests[0].body["model"]);
    assert_eq!(
        "upbeat synthwave launch theme",
        gateway_requests[0].body["prompt"]
    );
    assert_eq!(30, gateway_requests[0].body["duration_seconds"]);
    assert!(gateway_requests[0].body.get("generationConfig").is_none());
    assert!(gateway_requests[0].body.get("selectedModel").is_none());
    assert!(gateway_requests[0].body.get("targetType").is_none());

    let event_commands = store.create_event_commands.lock().unwrap();
    let asset_event = single_event_command_of_type(&event_commands, "generation.asset");
    assert_eq!("generation", asset_event.event_source);
    assert_eq!("music", asset_event.payload_json["assets"][0]["modality"]);
    assert_eq!(
        "audio/mpeg",
        asset_event.payload_json["assets"][0]["asset"]["mimeType"]
    );
    assert_eq!(
        30.0,
        asset_event.payload_json["assets"][0]["asset"]["durationSeconds"]
    );
    assert_eq!(
        "https://cdn.example.test/generated/theme.mp3",
        asset_event.payload_json["assets"][0]["asset"]["url"]
    );
    assert_eq!(
        "audio",
        asset_event.payload_json["assets"][0]["asset"]["kind"]
    );
    assert_eq!(
        "external_url",
        asset_event.payload_json["assets"][0]["asset"]["source"]
    );
    assert!(asset_event.payload_json["assets"][0].get("url").is_none());
    assert_runtime_completed_event_recorded(&event_commands);
}

#[tokio::test]
async fn app_runtime_gateway_executor_routes_openai_audio_generation_to_audio_speech_and_emits_assets(
) {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("agent.stream".to_owned()),
                model: Some("openai/gpt-realtime-1.5".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "prompt": "announce the product launch in a warm voice",
                "selectedModel": "openai/gpt-realtime-1.5",
                "targetType": "audio",
                "generationConfig": {
                    "durationSeconds": 10,
                    "quality": "standard"
                }
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_model_format(
                "openai/gpt-realtime-1.5",
                Some("openai_compatible"),
            )),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(body.contains(r#""eventType":"generation.asset""#), "{body}");
    assert!(
        body.contains("data:audio/mpeg;base64,YXVkaW8tYnl0ZXM="),
        "{body}"
    );

    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!(Method::POST, gateway_requests[0].method);
    assert_eq!("/v1/audio/speech", gateway_requests[0].path);
    assert_eq!("openai/gpt-realtime-1.5", gateway_requests[0].body["model"]);
    assert_eq!(
        "announce the product launch in a warm voice",
        gateway_requests[0].body["input"]
    );
    assert_eq!("mp3", gateway_requests[0].body["response_format"]);
    assert_eq!("alloy", gateway_requests[0].body["voice"]);

    let event_commands = store.create_event_commands.lock().unwrap();
    let asset_event = single_event_command_of_type(&event_commands, "generation.asset");
    assert_eq!("audio", asset_event.payload_json["assets"][0]["modality"]);
    assert_eq!(
        "audio/mpeg",
        asset_event.payload_json["assets"][0]["asset"]["mimeType"]
    );
    assert_eq!(
        "audio",
        asset_event.payload_json["assets"][0]["asset"]["kind"]
    );
    assert!(asset_event.payload_json["assets"][0].get("url").is_none());
    assert_runtime_completed_event_recorded(&event_commands);
}

#[tokio::test]
async fn app_runtime_gateway_executor_applies_speech_mode_config_to_openai_audio_speech() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("agent.stream".to_owned()),
                model: Some("openai/gpt-4o-mini-tts".to_owned()),
                provider: Some("openai".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "prompt": "read the release note with calm confidence",
                "selectedModel": "openai/gpt-4o-mini-tts",
                "targetType": "audio",
                "generationConfig": {
                    "durationSeconds": 10,
                    "speechMode": {
                        "voice": "nova",
                        "responseFormat": "wav",
                        "speed": 1.25
                    }
                }
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_model_format(
                "openai/gpt-4o-mini-tts",
                Some("openai_compatible"),
            )),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(
        body.contains("data:audio/wav;base64,YXVkaW8tYnl0ZXM="),
        "{body}"
    );

    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!("/v1/audio/speech", gateway_requests[0].path);
    assert_eq!("nova", gateway_requests[0].body["voice"]);
    assert_eq!("wav", gateway_requests[0].body["response_format"]);
    assert_eq!(1.25, gateway_requests[0].body["speed"]);
    assert!(gateway_requests[0].body.get("generationConfig").is_none());
    assert!(gateway_requests[0].body.get("speechMode").is_none());

    let event_commands = store.create_event_commands.lock().unwrap();
    let asset_event = single_event_command_of_type(&event_commands, "generation.asset");
    assert_eq!(
        "audio/wav",
        asset_event.payload_json["assets"][0]["asset"]["mimeType"]
    );
    assert_eq!(
        "audio",
        asset_event.payload_json["assets"][0]["asset"]["kind"]
    );
    assert!(asset_event.payload_json["assets"][0].get("url").is_none());
    assert_runtime_completed_event_recorded(&event_commands);
}

#[tokio::test]
async fn app_runtime_gateway_executor_routes_gemini_tts_generation_with_audio_config_and_assets() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("agent.stream".to_owned()),
                model: Some("google/gemini-3.1-flash-tts-preview".to_owned()),
                provider: Some("google".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "prompt": "say hello from the Gemini speech synthesizer",
                "selectedModel": "google/gemini-3.1-flash-tts-preview",
                "targetType": "audio",
                "generationConfig": {
                    "speechMode": {
                        "voice": "Kore"
                    }
                }
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_model_format(
                "google/gemini-3.1-flash-tts-preview",
                Some("gemini"),
            )),
            Arc::new(RecordingGatewayRuntimeClient::with_gemini_audio_response(
                Arc::clone(&gateway_requests),
            )),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(
        body.contains("data:audio/wav;base64,YXVkaW8td2F2"),
        "{body}"
    );

    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!(
        "/provider/google/v1beta/models/gemini-3.1-flash-tts-preview:streamGenerateContent?alt=sse",
        gateway_requests[0].path
    );
    assert_eq!(
        json!(["AUDIO"]),
        gateway_requests[0].body["generationConfig"]["responseModalities"]
    );
    assert_eq!(
        "Kore",
        gateway_requests[0].body["generationConfig"]["speechConfig"]["voiceConfig"]
            ["prebuiltVoiceConfig"]["voiceName"]
    );
    assert!(gateway_requests[0].body["generationConfig"]
        .get("speechMode")
        .is_none());

    let event_commands = store.create_event_commands.lock().unwrap();
    let asset_event = single_event_command_of_type(&event_commands, "generation.asset");
    assert_eq!("audio", asset_event.payload_json["assets"][0]["modality"]);
    assert_eq!(
        "audio/wav",
        asset_event.payload_json["assets"][0]["asset"]["mimeType"]
    );
    assert_eq!(
        "audio",
        asset_event.payload_json["assets"][0]["asset"]["kind"]
    );
    assert!(asset_event.payload_json["assets"][0].get("url").is_none());
    assert_runtime_completed_event_recorded(&event_commands);
}

#[tokio::test]
async fn app_runtime_gateway_executor_routes_elevenlabs_audio_generation_to_text_to_speech() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("agent.stream".to_owned()),
                model: Some("elevenlabs/eleven_multilingual_v2".to_owned()),
                provider: Some("elevenlabs".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "prompt": "narrate this update with a studio voice",
                "selectedModel": "elevenlabs/eleven_multilingual_v2",
                "targetType": "audio",
                "generationConfig": {
                    "speechMode": {
                        "voice": "JBFqnCBsd6RMkjVDRZzb",
                        "responseFormat": "wav",
                        "speed": 1.1
                    }
                }
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_model_format(
                "elevenlabs/eleven_multilingual_v2",
                Some("tts"),
            )),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(
        body.contains("data:audio/wav;base64,ZWxldmVubGFicy1hdWRpbw=="),
        "{body}"
    );

    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!(
        "/provider/elevenlabs/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb?output_format=wav_44100",
        gateway_requests[0].path
    );
    assert_eq!(
        "eleven_multilingual_v2",
        gateway_requests[0].body["model_id"]
    );
    assert_eq!(
        "narrate this update with a studio voice",
        gateway_requests[0].body["text"]
    );
    assert_eq!(1.1, gateway_requests[0].body["voice_settings"]["speed"]);
    assert!(gateway_requests[0].body.get("generationConfig").is_none());
    assert!(gateway_requests[0].body.get("speechMode").is_none());

    let event_commands = store.create_event_commands.lock().unwrap();
    let asset_event = single_event_command_of_type(&event_commands, "generation.asset");
    assert_eq!("audio", asset_event.payload_json["assets"][0]["modality"]);
    assert_eq!(
        "audio/wav",
        asset_event.payload_json["assets"][0]["asset"]["mimeType"]
    );
    assert_eq!(
        "audio",
        asset_event.payload_json["assets"][0]["asset"]["kind"]
    );
    assert!(asset_event.payload_json["assets"][0].get("url").is_none());
    assert_runtime_completed_event_recorded(&event_commands);
}

#[tokio::test]
async fn app_runtime_gateway_executor_routes_elevenlabs_sfx_generation_and_keeps_sfx_modality() {
    let store = Arc::new(TestAppRuntimeStore::with_invocation(
        AppRuntimeInvocationRecord {
            item: AppRuntimeInvocationItem {
                status: "streaming".to_owned(),
                runtime: "openai_compatible".to_owned(),
                endpoint: Some("agent.stream".to_owned()),
                model: Some("elevenlabs/eleven_text_to_sound_v2".to_owned()),
                provider: Some("elevenlabs".to_owned()),
                ..sample_invocation()
            },
            request_json: json!({
                "prompt": "cinematic whoosh transition",
                "selectedModel": "elevenlabs/eleven_text_to_sound_v2",
                "targetType": "sfx",
                "generationConfig": {
                    "durationSeconds": 5,
                    "sfxMode": {
                        "loop": true,
                        "promptInfluence": 0.65,
                        "responseFormat": "wav"
                    }
                }
            }),
            metadata: json!({"surface": "playground"}),
        },
    ));
    store.list_events_items.lock().unwrap().clear();
    let gateway_requests = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client(
            store.clone(),
            Arc::new(SequentialUuidGenerator::new(vec!["runtime-event-uuid-1"])),
            Arc::new(TestRuntimeCatalog::with_model_format(
                "elevenlabs/eleven_text_to_sound_v2",
                Some("vendor_native"),
            )),
            Arc::new(RecordingGatewayRuntimeClient::new(Arc::clone(
                &gateway_requests,
            ))),
        );

    let response = runtime_stream_request(router).await;

    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(
        body.contains("https://cdn.example.test/generated/impact.wav"),
        "{body}"
    );

    let gateway_requests = gateway_requests.lock().unwrap();
    assert_eq!(1, gateway_requests.len());
    assert_eq!(
        "/provider/elevenlabs/v1/sound-generation?output_format=wav_48000",
        gateway_requests[0].path
    );
    assert_eq!(
        "eleven_text_to_sound_v2",
        gateway_requests[0].body["model_id"]
    );
    assert_eq!(
        "cinematic whoosh transition",
        gateway_requests[0].body["text"]
    );
    assert_eq!(5, gateway_requests[0].body["duration_seconds"]);
    assert_eq!(true, gateway_requests[0].body["loop"]);
    assert_eq!(0.65, gateway_requests[0].body["prompt_influence"]);
    assert!(gateway_requests[0].body.get("generationConfig").is_none());
    assert!(gateway_requests[0].body.get("sfxMode").is_none());

    let event_commands = store.create_event_commands.lock().unwrap();
    let asset_event = single_event_command_of_type(&event_commands, "generation.asset");
    assert_eq!("sfx", asset_event.payload_json["assets"][0]["modality"]);
    assert_eq!(
        "audio/wav",
        asset_event.payload_json["assets"][0]["asset"]["mimeType"]
    );
    assert_eq!(
        "audio",
        asset_event.payload_json["assets"][0]["asset"]["kind"]
    );
    assert!(asset_event.payload_json["assets"][0].get("url").is_none());
    assert_runtime_completed_event_recorded(&event_commands);
}

async fn runtime_stream_request(router: axum::Router) -> axum::response::Response {
    router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/runtime/invocations/runtime-invocation-1/events/stream")
                .header("accept", "text/event-stream")
                .internal_trusted_subject(100001, 0, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap()
}

struct TestAppRuntimeStore {
    create_invocation_commands: Mutex<Vec<CreateAppRuntimeInvocationCommand>>,
    complete_invocation_commands: Mutex<Vec<CompleteAppRuntimeInvocationCommand>>,
    complete_invocation_notify: Notify,
    create_event_commands: Mutex<Vec<CreateAppRuntimeEventCommand>>,
    create_artifact_commands: Mutex<Vec<CreateAppRuntimeArtifactCommand>>,
    list_invocation_subjects: Mutex<Vec<AppRuntimeSubject>>,
    list_event_subjects: Mutex<Vec<AppRuntimeSubject>>,
    invocation: Mutex<AppRuntimeInvocationRecord>,
    list_events_items: Mutex<Vec<AppRuntimeEventItem>>,
    has_terminal_event_results: Mutex<Vec<bool>>,
}

impl TestAppRuntimeStore {
    fn with_invocation(invocation: AppRuntimeInvocationRecord) -> Self {
        Self {
            invocation: Mutex::new(invocation),
            ..Self::default()
        }
    }

    async fn wait_for_complete_invocation(&self) {
        loop {
            let notified = self.complete_invocation_notify.notified();
            if !self.complete_invocation_commands.lock().unwrap().is_empty() {
                return;
            }
            notified.await;
        }
    }
}

impl Default for TestAppRuntimeStore {
    fn default() -> Self {
        Self {
            create_invocation_commands: Mutex::new(Vec::new()),
            complete_invocation_commands: Mutex::new(Vec::new()),
            complete_invocation_notify: Notify::new(),
            create_event_commands: Mutex::new(Vec::new()),
            create_artifact_commands: Mutex::new(Vec::new()),
            list_invocation_subjects: Mutex::new(Vec::new()),
            list_event_subjects: Mutex::new(Vec::new()),
            invocation: Mutex::new(AppRuntimeInvocationRecord::default()),
            list_events_items: Mutex::new(vec![sample_event()]),
            has_terminal_event_results: Mutex::new(Vec::new()),
        }
    }
}

impl AppRuntimeStore for TestAppRuntimeStore {
    fn list_invocations<'a>(
        &'a self,
        subject: AppRuntimeSubject,
        query: sdkwork_clawrouter_router_service::ports::AppRuntimeInvocationQuery,
    ) -> AppRuntimeFuture<'a, AppRuntimeInvocationList> {
        Box::pin(async move {
            self.list_invocation_subjects.lock().unwrap().push(subject);
            Ok(AppRuntimeInvocationList {
                items: vec![sample_invocation()],
                total: 1,
                page_no: query.page,
                page_size: query.page_size,
            })
        })
    }

    fn get_invocation<'a>(
        &'a self,
        _subject: AppRuntimeSubject,
        _invocation_id: String,
    ) -> AppRuntimeFuture<'a, Option<AppRuntimeInvocationItem>> {
        Box::pin(async move { Ok(Some(self.invocation.lock().unwrap().item.clone())) })
    }

    fn get_invocation_execution<'a>(
        &'a self,
        _subject: AppRuntimeSubject,
        _invocation_id: String,
    ) -> AppRuntimeFuture<'a, Option<AppRuntimeInvocationExecution>> {
        Box::pin(async move {
            let invocation = self.invocation.lock().unwrap().clone();
            Ok(Some(AppRuntimeInvocationExecution {
                item: invocation.item,
                request_json: invocation.request_json,
                metadata: invocation.metadata,
            }))
        })
    }

    fn create_invocation<'a>(
        &'a self,
        command: CreateAppRuntimeInvocationCommand,
    ) -> AppRuntimeFuture<'a, AppRuntimeInvocationItem> {
        Box::pin(async move {
            let request_id = command.request_id.clone();
            self.create_invocation_commands
                .lock()
                .unwrap()
                .push(command);
            Ok(AppRuntimeInvocationItem {
                request_id,
                ..sample_invocation()
            })
        })
    }

    fn complete_invocation<'a>(
        &'a self,
        command: CompleteAppRuntimeInvocationCommand,
    ) -> AppRuntimeFuture<'a, AppRuntimeInvocationItem> {
        Box::pin(async move {
            let status = command.status.clone();
            self.complete_invocation_commands
                .lock()
                .unwrap()
                .push(command);
            self.complete_invocation_notify.notify_waiters();
            Ok(AppRuntimeInvocationItem {
                status,
                provider_response_id: Some("msg_123".to_owned()),
                finish_reason: Some("stop".to_owned()),
                latency_ms: Some(1200),
                ttft_ms: Some(200),
                exit_code: Some(0),
                ..sample_invocation()
            })
        })
    }

    fn list_events<'a>(
        &'a self,
        subject: AppRuntimeSubject,
        _invocation_id: String,
        page: i64,
        page_size: i64,
    ) -> AppRuntimeFuture<'a, AppRuntimeEventList> {
        Box::pin(async move {
            self.list_event_subjects.lock().unwrap().push(subject);
            let items = self.list_events_items.lock().unwrap().clone();
            Ok(AppRuntimeEventList {
                total: items.len() as i64,
                items,
                page_no: page,
                page_size,
            })
        })
    }

    fn list_events_after<'a>(
        &'a self,
        subject: AppRuntimeSubject,
        _invocation_id: String,
        after_event_no: i64,
        limit: i64,
    ) -> AppRuntimeFuture<'a, AppRuntimeEventList> {
        Box::pin(async move {
            self.list_event_subjects.lock().unwrap().push(subject);
            let mut items = self
                .list_events_items
                .lock()
                .unwrap()
                .iter()
                .filter(|item| item.event_no > after_event_no)
                .cloned()
                .collect::<Vec<_>>();
            items.sort_by(|left, right| {
                left.event_no
                    .cmp(&right.event_no)
                    .then_with(|| left.id.cmp(&right.id))
            });
            items.truncate(limit.max(1) as usize);
            Ok(AppRuntimeEventList {
                total: items.len() as i64,
                items,
                page_no: 1,
                page_size: limit,
            })
        })
    }

    fn has_terminal_event<'a>(
        &'a self,
        _subject: AppRuntimeSubject,
        _invocation_id: String,
    ) -> AppRuntimeFuture<'a, bool> {
        Box::pin(async move {
            if !self.has_terminal_event_results.lock().unwrap().is_empty() {
                return Ok(self.has_terminal_event_results.lock().unwrap().remove(0));
            }
            Ok(self.list_events_items.lock().unwrap().iter().any(|item| {
                item.event_type == "runtime.completed"
                    || item.event_type == "runtime.failed"
                    || item.event_type == "runtime.cancelled"
            }))
        })
    }

    fn get_terminal_event<'a>(
        &'a self,
        _subject: AppRuntimeSubject,
        _invocation_id: String,
    ) -> AppRuntimeFuture<'a, Option<AppRuntimeEventItem>> {
        Box::pin(async move {
            Ok(self
                .list_events_items
                .lock()
                .unwrap()
                .iter()
                .filter(|item| is_runtime_terminal_event_type(&item.event_type))
                .min_by(|left, right| {
                    left.event_no
                        .cmp(&right.event_no)
                        .then_with(|| left.id.cmp(&right.id))
                })
                .cloned())
        })
    }

    fn create_event<'a>(
        &'a self,
        command: CreateAppRuntimeEventCommand,
    ) -> AppRuntimeFuture<'a, AppRuntimeEventItem> {
        Box::pin(async move {
            let existing_terminal = if is_runtime_terminal_event_type(&command.event_type) {
                self.list_events_items
                    .lock()
                    .unwrap()
                    .iter()
                    .find(|item| is_runtime_terminal_event_type(&item.event_type))
                    .cloned()
            } else {
                None
            };
            self.create_event_commands
                .lock()
                .unwrap()
                .push(command.clone());
            if let Some(event) = existing_terminal {
                return Ok(event);
            }
            let event = AppRuntimeEventItem {
                id: if command.event_uuid.ends_with("-2") {
                    "runtime-event-2".to_owned()
                } else {
                    "runtime-event-1".to_owned()
                },
                invocation_id: command.invocation_id,
                event_no: self.create_event_commands.lock().unwrap().len() as i64,
                event_type: command.event_type,
                event_source: command.event_source,
                payload_json: command.payload_json,
                text_delta: command.text_delta,
                created_at: command.requested_at,
            };
            self.list_events_items.lock().unwrap().push(event.clone());
            Ok(event)
        })
    }

    fn list_artifacts<'a>(
        &'a self,
        _subject: AppRuntimeSubject,
        _invocation_id: String,
        page: i64,
        page_size: i64,
    ) -> AppRuntimeFuture<'a, AppRuntimeArtifactList> {
        Box::pin(async move {
            Ok(AppRuntimeArtifactList {
                items: vec![sample_artifact()],
                total: 1,
                page_no: page,
                page_size,
            })
        })
    }

    fn create_artifact<'a>(
        &'a self,
        command: CreateAppRuntimeArtifactCommand,
    ) -> AppRuntimeFuture<'a, AppRuntimeArtifactItem> {
        Box::pin(async move {
            self.create_artifact_commands.lock().unwrap().push(command);
            Ok(sample_artifact())
        })
    }
}

#[derive(Clone)]
struct AppRuntimeInvocationRecord {
    item: AppRuntimeInvocationItem,
    request_json: Value,
    metadata: Value,
}

impl Default for AppRuntimeInvocationRecord {
    fn default() -> Self {
        Self {
            item: sample_invocation(),
            request_json: serde_json::json!({"prompt":"hello"}),
            metadata: serde_json::json!({}),
        }
    }
}

fn sample_invocation() -> AppRuntimeInvocationItem {
    AppRuntimeInvocationItem {
        id: "runtime-invocation-1".to_owned(),
        invocation_no: 1,
        invocation_type: "chat_response".to_owned(),
        runtime: "claude_code".to_owned(),
        endpoint: Some("messages.create".to_owned()),
        attempt_no: 1,
        status: "running".to_owned(),
        conversation_id: Some("chat-conversation-1".to_owned()),
        chat_turn_id: Some("chat-turn-1".to_owned()),
        chat_item_id: None,
        agent_session_id: Some("agent-session-1".to_owned()),
        agent_run_id: None,
        agent_run_step_id: None,
        request_id: Some("req-1".to_owned()),
        trace_id: Some("trace-1".to_owned()),
        provider_response_id: None,
        provider_session_id: None,
        provider_conversation_id: None,
        provider_step_id: None,
        model: Some("claude-sonnet-4-5".to_owned()),
        provider: Some("anthropic".to_owned()),
        tool_name: None,
        tool_call_id: None,
        cwd: None,
        sandbox_policy: None,
        approval_policy: None,
        permission_mode: None,
        streaming: true,
        started_at: Some("2026-05-18 09:00:00".to_owned()),
        completed_at: None,
        latency_ms: None,
        ttft_ms: None,
        exit_code: None,
        finish_reason: None,
        error_type: None,
        error_code: None,
        error_message_masked: None,
        created_at: "2026-05-18 09:00:00".to_owned(),
    }
}

fn sample_event() -> AppRuntimeEventItem {
    AppRuntimeEventItem {
        id: "runtime-event-1".to_owned(),
        invocation_id: "runtime-invocation-1".to_owned(),
        event_no: 1,
        event_type: "response.output_text.delta".to_owned(),
        event_source: "provider".to_owned(),
        payload_json: serde_json::json!({"delta":"hello"}),
        text_delta: Some("hello".to_owned()),
        created_at: "2026-05-18 09:00:01".to_owned(),
    }
}

fn runtime_completed_event(event_no: i64) -> AppRuntimeEventItem {
    AppRuntimeEventItem {
        id: format!("runtime-event-{event_no}"),
        invocation_id: "runtime-invocation-1".to_owned(),
        event_no,
        event_type: "runtime.completed".to_owned(),
        event_source: "runtime".to_owned(),
        payload_json: serde_json::json!({"status":"completed"}),
        text_delta: None,
        created_at: "2026-05-18 09:00:02".to_owned(),
    }
}

fn runtime_cancelled_event(event_no: i64) -> AppRuntimeEventItem {
    AppRuntimeEventItem {
        id: format!("runtime-event-{event_no}"),
        invocation_id: "runtime-invocation-1".to_owned(),
        event_no,
        event_type: "runtime.cancelled".to_owned(),
        event_source: "runtime".to_owned(),
        payload_json: serde_json::json!({
            "status": "cancelled",
            "reason": "user_requested_stop"
        }),
        text_delta: None,
        created_at: "2026-05-18 09:00:02".to_owned(),
    }
}

fn runtime_failed_event(event_no: i64) -> AppRuntimeEventItem {
    AppRuntimeEventItem {
        id: format!("runtime-event-{event_no}"),
        invocation_id: "runtime-invocation-1".to_owned(),
        event_no,
        event_type: "runtime.failed".to_owned(),
        event_source: "runtime".to_owned(),
        payload_json: serde_json::json!({
            "status": "failed",
            "errorMessageMasked": "upstream stream disconnected"
        }),
        text_delta: None,
        created_at: "2026-05-18 09:00:03".to_owned(),
    }
}

fn is_runtime_terminal_event_type(event_type: &str) -> bool {
    matches!(
        event_type,
        "runtime.completed" | "runtime.failed" | "runtime.cancelled"
    )
}

fn event_commands_of_type<'a>(
    commands: &'a [CreateAppRuntimeEventCommand],
    event_type: &str,
) -> Vec<&'a CreateAppRuntimeEventCommand> {
    commands
        .iter()
        .filter(|command| command.event_type == event_type)
        .collect()
}

fn single_event_command_of_type<'a>(
    commands: &'a [CreateAppRuntimeEventCommand],
    event_type: &str,
) -> &'a CreateAppRuntimeEventCommand {
    let matching = event_commands_of_type(commands, event_type);
    assert_eq!(
        1,
        matching.len(),
        "expected exactly one {event_type} event command"
    );
    matching[0]
}

fn assert_runtime_completed_event_recorded(commands: &[CreateAppRuntimeEventCommand]) {
    assert!(
        commands
            .iter()
            .any(|command| command.event_type == "runtime.completed"),
        "runtime streams should persist a terminal completion event"
    );
}

#[derive(Debug)]
struct TestRuntimeCatalog {
    catalog_key: String,
    model: String,
    vendor_code: String,
    api_format: Option<String>,
    include_model_route: bool,
    include_channel_route: bool,
    include_pricing_plan: bool,
    api_keys: Option<Vec<TestRuntimeApiKeyFixture>>,
    foreign_api_key_id: Option<i64>,
}

#[derive(Debug, Clone)]
struct TestRuntimeApiKeyFixture {
    id: i64,
    group_id: i64,
    default_for_runtime: bool,
}

impl TestRuntimeCatalog {
    fn with_model_format(catalog_key: &str, api_format: Option<&str>) -> Self {
        let mut parts = catalog_key.split('/');
        let vendor_code = parts.next().unwrap_or("openai").to_owned();
        let model = parts.collect::<Vec<_>>().join("/");
        Self {
            catalog_key: catalog_key.to_owned(),
            model,
            vendor_code,
            api_format: api_format.map(str::to_owned),
            include_model_route: true,
            include_channel_route: true,
            include_pricing_plan: true,
            api_keys: None,
            foreign_api_key_id: None,
        }
    }

    fn without_model_upstream_route(catalog_key: &str) -> Self {
        Self {
            include_model_route: false,
            ..Self::with_model_format(catalog_key, None)
        }
    }

    fn without_runtime_routes(catalog_key: &str) -> Self {
        Self {
            include_model_route: false,
            include_channel_route: false,
            ..Self::with_model_format(catalog_key, None)
        }
    }

    fn with_api_keys(api_keys: Vec<TestRuntimeApiKeyFixture>) -> Self {
        Self {
            api_keys: Some(api_keys),
            ..Self::default()
        }
    }

    fn with_foreign_api_key(api_key_id: i64) -> Self {
        Self {
            foreign_api_key_id: Some(api_key_id),
            ..Self::default()
        }
    }

    fn without_pricing_plan() -> Self {
        Self {
            include_pricing_plan: false,
            ..Self::default()
        }
    }
}

impl Default for TestRuntimeCatalog {
    fn default() -> Self {
        Self::with_model_format("openai/gpt-4o-mini", None)
    }
}

impl sdkwork_clawrouter_router_service::ports::PricingCatalog for TestRuntimeCatalog {
    fn visit_models(
        &self,
        _vendor_code: Option<&str>,
        visitor: &mut dyn FnMut(&sdkwork_clawrouter_router_service::domain::AiModel) -> bool,
    ) {
        let mut model = sdkwork_clawrouter_router_service::domain::AiModel::new(
            &self.model,
            &self.model,
            &self.vendor_code,
            vec!["chat", "response"],
        )
        .with_catalog_key(&self.catalog_key);
        model.api_format = self.api_format.clone();
        model.supports_streaming = true;
        visitor(&model);
    }

    fn list_model_upstream_routes(
        &self,
        model: &str,
    ) -> Vec<sdkwork_clawrouter_router_service::domain::ModelUpstreamRoute> {
        if !self.include_model_route || model != self.catalog_key {
            return Vec::new();
        }
        vec![
            sdkwork_clawrouter_router_service::domain::ModelUpstreamRoute::new_for_catalog_key(
                &self.catalog_key,
                &self.model,
                "openai",
                3001,
                &format!("provider-{}", self.model),
            )
            .with_upstream_endpoint(Some("https://provider.example/v1"), Some("secret-ref")),
        ]
    }

    fn list_upstream_account_routes(
        &self,
    ) -> Vec<sdkwork_clawrouter_router_service::domain::UpstreamAccountRoute> {
        if !self.include_channel_route {
            return Vec::new();
        }
        vec![
            sdkwork_clawrouter_router_service::domain::UpstreamAccountRoute::new("openai", 3001)
                .with_upstream_endpoint(Some("https://provider.example/v1"), Some("secret-ref"))
                .with_resource_scoped_account_group_binding(
                    10,
                    1,
                    100,
                    vec![
                        "openai.chat_completions".to_owned(),
                        "openai.responses".to_owned(),
                    ],
                    vec!["llm".to_owned(), "chat".to_owned()],
                ),
        ]
    }

    fn list_routing_policies(
        &self,
    ) -> Vec<sdkwork_clawrouter_router_service::domain::RoutingPolicy> {
        vec![
            sdkwork_clawrouter_router_service::domain::RoutingPolicy::new(
                9001,
                TEST_TENANT_ID,
                TEST_ORGANIZATION_ID,
                "standard-chat",
                sdkwork_clawrouter_router_service::domain::RoutingPolicyScope::UpstreamAccountGroup,
                Some(10),
                Some(9101),
            )
            .with_capability(sdkwork_clawrouter_router_service::domain::RoutingCapability::Chat),
        ]
    }

    fn list_routing_rules(
        &self,
        profile_id: i64,
    ) -> Vec<sdkwork_clawrouter_router_service::domain::RoutingRule> {
        if profile_id != 9101 {
            return Vec::new();
        }
        vec![sdkwork_clawrouter_router_service::domain::RoutingRule::new(
            9102,
            TEST_TENANT_ID,
            TEST_ORGANIZATION_ID,
            9101,
            "openai-chat",
            1,
            &format!(r#"{{"catalogKey":"{}"}}"#, self.catalog_key),
            &self.catalog_key,
        )
        .with_candidate_account_groups(vec![
            sdkwork_clawrouter_router_service::domain::RouteCandidate::new(10, 100),
        ])]
    }

    fn list_model_mappings(
        &self,
    ) -> Vec<sdkwork_clawrouter_router_service::domain::ModelMappingRule> {
        Vec::new()
    }

    fn resolve_model_mapping(
        &self,
        _source_model: &str,
        _context: &sdkwork_clawrouter_router_service::domain::ResolveModelMappingContext,
    ) -> Option<sdkwork_clawrouter_router_service::domain::ModelMappingRule> {
        None
    }

    fn list_api_keys(&self) -> Vec<sdkwork_clawrouter_router_service::domain::GatewayApiKey> {
        if let Some(api_keys) = &self.api_keys {
            return api_keys
                .iter()
                .map(|fixture| {
                    sdkwork_clawrouter_router_service::domain::GatewayApiKey::new(
                        fixture.id,
                        fixture.group_id,
                        "sk-app",
                        "hash",
                    )
                    .with_owner(TEST_TENANT_ID, TEST_ORGANIZATION_ID, TEST_USER_ID)
                    .with_default_for_runtime(fixture.default_for_runtime)
                })
                .collect();
        }
        let api_key = sdkwork_clawrouter_router_service::domain::GatewayApiKey::new(
            101, 10, "sk-app", "hash",
        )
        .with_owner(TEST_TENANT_ID, TEST_ORGANIZATION_ID, TEST_USER_ID);
        let mut api_keys = vec![api_key];
        if let Some(api_key_id) = self.foreign_api_key_id {
            api_keys.push(
                sdkwork_clawrouter_router_service::domain::GatewayApiKey::new(
                    api_key_id,
                    10,
                    "sk-foreign",
                    "foreign-hash",
                )
                .with_owner(TEST_TENANT_ID + 1, TEST_ORGANIZATION_ID, TEST_USER_ID),
            );
        }
        api_keys
    }

    fn list_upstream_account_groups(
        &self,
    ) -> Vec<sdkwork_clawrouter_router_service::domain::UpstreamAccountGroup> {
        vec![
            sdkwork_clawrouter_router_service::domain::UpstreamAccountGroup::new(
                10,
                "standard",
                "standard",
                sdkwork_clawrouter_router_service::domain::DecimalValue::parse("1.000000").unwrap(),
                sdkwork_clawrouter_router_service::domain::DecimalValue::parse("1.000000").unwrap(),
            ),
            sdkwork_clawrouter_router_service::domain::UpstreamAccountGroup::new(
                20,
                "unroutable",
                "standard",
                sdkwork_clawrouter_router_service::domain::DecimalValue::parse("1.000000").unwrap(),
                sdkwork_clawrouter_router_service::domain::DecimalValue::parse("1.000000").unwrap(),
            ),
        ]
    }

    fn list_model_prices(
        &self,
        model: &str,
        price_side: sdkwork_clawrouter_router_service::domain::PriceSide,
        billing_meter: sdkwork_clawrouter_router_service::domain::BillingMeter,
    ) -> Vec<sdkwork_clawrouter_router_service::domain::ModelPrice> {
        if model != self.catalog_key
            || billing_meter
                != sdkwork_clawrouter_router_service::domain::BillingMeter::LlmInputToken
        {
            return Vec::new();
        }
        match price_side {
            sdkwork_clawrouter_router_service::domain::PriceSide::OfficialReference => vec![
                sdkwork_clawrouter_router_service::domain::ModelPrice::new_for_catalog_key(
                    &self.catalog_key,
                    &self.model,
                    sdkwork_clawrouter_router_service::domain::PriceSide::OfficialReference,
                    sdkwork_clawrouter_router_service::domain::BillingMeter::LlmInputToken,
                    sdkwork_clawrouter_router_service::domain::Money::usd("0.150000").unwrap(),
                ),
            ],
            sdkwork_clawrouter_router_service::domain::PriceSide::UpstreamCost => vec![
                sdkwork_clawrouter_router_service::domain::ModelPrice::new_for_catalog_key(
                    &self.catalog_key,
                    &self.model,
                    sdkwork_clawrouter_router_service::domain::PriceSide::UpstreamCost,
                    sdkwork_clawrouter_router_service::domain::BillingMeter::LlmInputToken,
                    sdkwork_clawrouter_router_service::domain::Money::usd("0.100000").unwrap(),
                )
                .for_upstream_account("openai", 3001),
            ],
            _ => Vec::new(),
        }
    }

    fn list_model_prices_for_side(
        &self,
        model: &str,
        price_side: sdkwork_clawrouter_router_service::domain::PriceSide,
    ) -> Vec<sdkwork_clawrouter_router_service::domain::ModelPrice> {
        self.list_model_prices(
            model,
            price_side,
            sdkwork_clawrouter_router_service::domain::BillingMeter::LlmInputToken,
        )
    }

    fn find_api_key(
        &self,
        api_key_id: i64,
    ) -> Option<sdkwork_clawrouter_router_service::domain::GatewayApiKey> {
        self.list_api_keys()
            .into_iter()
            .find(|api_key| api_key.id == api_key_id)
    }

    fn find_api_key_by_hash(
        &self,
        _key_hash: &str,
    ) -> Option<sdkwork_clawrouter_router_service::domain::GatewayApiKey> {
        None
    }

    fn find_upstream_account_group(
        &self,
        group_id: i64,
    ) -> Option<sdkwork_clawrouter_router_service::domain::UpstreamAccountGroup> {
        self.list_upstream_account_groups()
            .into_iter()
            .find(|group| group.id == group_id)
    }

    fn find_access_policy(
        &self,
        _policy_id: i64,
    ) -> Option<sdkwork_clawrouter_router_service::domain::GatewayAccessPolicy> {
        None
    }

    fn find_quota_policy(
        &self,
        _policy_id: i64,
    ) -> Option<sdkwork_clawrouter_router_service::domain::QuotaPolicy> {
        None
    }

    fn list_gateway_risk_rules(
        &self,
    ) -> Vec<sdkwork_clawrouter_router_service::domain::GatewayRiskRule> {
        Vec::new()
    }

    fn find_latest_upstream_account_group_metric_snapshot(
        &self,
        _group_id: i64,
    ) -> Option<sdkwork_clawrouter_router_service::domain::UpstreamAccountGroupMetricSnapshot> {
        None
    }

    fn find_pricing_plan(
        &self,
        plan_code: &str,
    ) -> Option<sdkwork_clawrouter_router_service::domain::PricingPlan> {
        if !self.include_pricing_plan {
            return None;
        }
        (plan_code == "standard").then(|| {
            sdkwork_clawrouter_router_service::domain::PricingPlan::new(
                "standard",
                sdkwork_clawrouter_router_service::domain::PriceSide::OfficialReference,
                sdkwork_clawrouter_router_service::domain::DecimalValue::parse("1.000000").unwrap(),
                sdkwork_clawrouter_router_service::domain::Money::usd("0.000000").unwrap(),
            )
        })
    }

    fn find_model(
        &self,
        model: &str,
    ) -> Option<sdkwork_clawrouter_router_service::domain::AiModel> {
        if self.catalog_key != model {
            return None;
        }
        let mut result = None;
        self.visit_models(None, &mut |candidate| {
            result = Some(candidate.clone());
            false
        });
        result
    }

    fn find_vendor(
        &self,
        vendor_code: &str,
    ) -> Option<sdkwork_clawrouter_router_service::domain::ModelVendorDefinition> {
        (vendor_code == self.vendor_code).then(|| {
            sdkwork_clawrouter_router_service::domain::ModelVendorDefinition::new(
                &self.vendor_code,
                sdkwork_clawrouter_router_service::domain::ModelVendor::from_code(
                    &self.vendor_code,
                ),
                &self.vendor_code,
            )
        })
    }

    fn find_model_upstream_route(
        &self,
        model: &str,
        supplier_code: &str,
    ) -> Option<sdkwork_clawrouter_router_service::domain::ModelUpstreamRoute> {
        self.list_model_upstream_routes(model)
            .into_iter()
            .find(|route| route.supplier_code == supplier_code)
    }

    fn find_model_price(
        &self,
        model: &str,
        price_side: sdkwork_clawrouter_router_service::domain::PriceSide,
        billing_meter: sdkwork_clawrouter_router_service::domain::BillingMeter,
        supplier_code: Option<&str>,
        pricing_plan_code: Option<&str>,
    ) -> Option<sdkwork_clawrouter_router_service::domain::ModelPrice> {
        if model != self.catalog_key
            || price_side != sdkwork_clawrouter_router_service::domain::PriceSide::OfficialReference
            || billing_meter
                != sdkwork_clawrouter_router_service::domain::BillingMeter::LlmInputToken
            || supplier_code.is_some()
            || pricing_plan_code.is_some()
        {
            return None;
        }
        Some(
            sdkwork_clawrouter_router_service::domain::ModelPrice::new_for_catalog_key(
                &self.catalog_key,
                &self.model,
                sdkwork_clawrouter_router_service::domain::PriceSide::OfficialReference,
                sdkwork_clawrouter_router_service::domain::BillingMeter::LlmInputToken,
                sdkwork_clawrouter_router_service::domain::Money::usd("0.150000").unwrap(),
            ),
        )
    }
}

impl sdkwork_clawrouter_router_service::ports::UpstreamAccountRouteCatalog for TestRuntimeCatalog {
    fn shared_upstream_account_routes(
        &self,
    ) -> Arc<[sdkwork_clawrouter_router_service::domain::UpstreamAccountRoute]> {
        <Self as sdkwork_clawrouter_router_service::ports::PricingCatalog>::list_upstream_account_routes(
            self,
        )
        .into()
    }
}

#[derive(Debug)]
struct RecordingStreamRelay {
    captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>,
}

impl RecordingStreamRelay {
    fn new(captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>) -> Self {
        Self { captured }
    }
}

impl ChatCompletionStreamRelay for RecordingStreamRelay {
    fn create_chat_completion_stream<'a>(
        &'a self,
        request: ChatCompletionRelayRequest,
    ) -> std::pin::Pin<
        Box<
            dyn std::future::Future<
                    Output = sdkwork_clawrouter_router_service::domain::DomainResult<
                        ChatCompletionStreamRelayResponse,
                    >,
                > + Send
                + 'a,
        >,
    > {
        self.captured.lock().unwrap().push(request);
        Box::pin(async {
            Ok(ChatCompletionStreamRelayResponse::new(
                200,
                Some("text/event-stream".to_owned()),
                Body::from(
                    "data: {\"id\":\"chatcmpl-stream\",\"choices\":[{\"delta\":{\"content\":\"hello\"}}]}\n\n\
                     data: {\"id\":\"chatcmpl-stream\",\"choices\":[{\"delta\":{\"content\":\" world\"},\"finish_reason\":\"stop\"}]}\n\n\
                     data: [DONE]\n\n",
                ),
            ))
        })
    }
}

#[derive(Debug)]
struct UsageOnlyStreamRelay;

impl ChatCompletionStreamRelay for UsageOnlyStreamRelay {
    fn create_chat_completion_stream<'a>(
        &'a self,
        _request: ChatCompletionRelayRequest,
    ) -> std::pin::Pin<
        Box<
            dyn std::future::Future<
                    Output = sdkwork_clawrouter_router_service::domain::DomainResult<
                        ChatCompletionStreamRelayResponse,
                    >,
                > + Send
                + 'a,
        >,
    > {
        Box::pin(async {
            Ok(ChatCompletionStreamRelayResponse::new(
                200,
                Some("text/event-stream".to_owned()),
                Body::from(
                    "data: {\"id\":\"chatcmpl-usage\",\"choices\":[{\"delta\":{\"content\":\"hello\"}}]}\n\n\
                     data: {\"id\":\"chatcmpl-usage\",\"choices\":[],\"usage\":{\"prompt_tokens\":11,\"completion_tokens\":13,\"total_tokens\":24}}\n\n\
                     data: [DONE]\n\n",
                ),
            ))
        })
    }
}

#[derive(Debug)]
struct FailingStreamRelay;

impl ChatCompletionStreamRelay for FailingStreamRelay {
    fn create_chat_completion_stream<'a>(
        &'a self,
        _request: ChatCompletionRelayRequest,
    ) -> std::pin::Pin<
        Box<
            dyn std::future::Future<
                    Output = sdkwork_clawrouter_router_service::domain::DomainResult<
                        ChatCompletionStreamRelayResponse,
                    >,
                > + Send
                + 'a,
        >,
    > {
        Box::pin(async {
            Err(sdkwork_clawrouter_router_service::domain::DomainError::new(
                "provider connection failed before stream",
            ))
        })
    }
}

#[derive(Debug)]
struct GatewayRequestCapture {
    method: Method,
    path: String,
    authorization: String,
    internal_principal: Option<InternalGatewayPrincipal>,
    content_type: String,
    request_id: Option<String>,
    trace_id: Option<String>,
    body: Value,
    body_text: String,
}

#[derive(Debug)]
struct RecordingGatewayRuntimeClient {
    captured: Arc<Mutex<Vec<GatewayRequestCapture>>>,
    response_kind: GatewayResponseKind,
    calls: Arc<AtomicUsize>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum GatewayResponseKind {
    Chat,
    GeminiText,
    GeminiMarkdownParts,
    GeminiImage,
    GeminiAudio,
    ModelRouteMiss,
    TransientEmptyRouteSnapshot,
    ConfiguredRouteMismatch,
}

impl RecordingGatewayRuntimeClient {
    fn new(captured: Arc<Mutex<Vec<GatewayRequestCapture>>>) -> Self {
        Self {
            captured,
            response_kind: GatewayResponseKind::Chat,
            calls: Arc::new(AtomicUsize::new(0)),
        }
    }

    fn with_gemini_response(captured: Arc<Mutex<Vec<GatewayRequestCapture>>>) -> Self {
        Self {
            captured,
            response_kind: GatewayResponseKind::GeminiText,
            calls: Arc::new(AtomicUsize::new(0)),
        }
    }

    fn with_gemini_markdown_parts_response(
        captured: Arc<Mutex<Vec<GatewayRequestCapture>>>,
    ) -> Self {
        Self {
            captured,
            response_kind: GatewayResponseKind::GeminiMarkdownParts,
            calls: Arc::new(AtomicUsize::new(0)),
        }
    }

    fn with_gemini_image_response(captured: Arc<Mutex<Vec<GatewayRequestCapture>>>) -> Self {
        Self {
            captured,
            response_kind: GatewayResponseKind::GeminiImage,
            calls: Arc::new(AtomicUsize::new(0)),
        }
    }

    fn with_gemini_audio_response(captured: Arc<Mutex<Vec<GatewayRequestCapture>>>) -> Self {
        Self {
            captured,
            response_kind: GatewayResponseKind::GeminiAudio,
            calls: Arc::new(AtomicUsize::new(0)),
        }
    }

    fn with_model_route_miss_response(captured: Arc<Mutex<Vec<GatewayRequestCapture>>>) -> Self {
        Self {
            captured,
            response_kind: GatewayResponseKind::ModelRouteMiss,
            calls: Arc::new(AtomicUsize::new(0)),
        }
    }

    fn with_transient_empty_route_snapshot(
        captured: Arc<Mutex<Vec<GatewayRequestCapture>>>,
    ) -> Self {
        Self {
            captured,
            response_kind: GatewayResponseKind::TransientEmptyRouteSnapshot,
            calls: Arc::new(AtomicUsize::new(0)),
        }
    }

    fn with_configured_route_mismatch(captured: Arc<Mutex<Vec<GatewayRequestCapture>>>) -> Self {
        Self {
            captured,
            response_kind: GatewayResponseKind::ConfiguredRouteMismatch,
            calls: Arc::new(AtomicUsize::new(0)),
        }
    }
}

impl AppRuntimeGatewayClient for RecordingGatewayRuntimeClient {
    fn send<'a>(
        &'a self,
        request: AppRuntimeGatewayRequest,
    ) -> sdkwork_clawrouter_router_service::ports::AppRuntimeFuture<'a, AppRuntimeGatewayResponse>
    {
        let captured = Arc::clone(&self.captured);
        let response_kind = self.response_kind;
        let calls = Arc::clone(&self.calls);
        Box::pin(async move {
            let call_index = calls.fetch_add(1, Ordering::SeqCst);
            let body = request.body.clone();
            let content_type = request
                .headers
                .get("content-type")
                .cloned()
                .unwrap_or_default();
            let body_text = request
                .raw_body
                .as_ref()
                .and_then(|body| String::from_utf8(body.to_vec()).ok())
                .unwrap_or_else(|| serde_json::to_string(&body).unwrap());
            captured.lock().unwrap().push(GatewayRequestCapture {
                method: request.method.clone(),
                path: request.path.clone(),
                authorization: request
                    .headers
                    .get("authorization")
                    .cloned()
                    .unwrap_or_default(),
                internal_principal: request.internal_principal,
                request_id: request.headers.get("x-request-id").cloned(),
                trace_id: request.headers.get("x-trace-id").cloned(),
                content_type,
                body,
                body_text,
            });
            let transient_empty_route_snapshot = response_kind
                == GatewayResponseKind::TransientEmptyRouteSnapshot
                && call_index == 0;
            let response_body = if response_kind == GatewayResponseKind::ModelRouteMiss {
                Body::from(
                    "{\"error\":{\"code\":\"group:model_route_miss\",\"message\":\"当前模型暂不可用 [group:model_route_miss]\",\"type\":\"new_api_error\"}}",
                )
            } else if transient_empty_route_snapshot {
                Body::from(
                    "{\"error\":{\"message\":\"upstream route snapshot is empty for model: openai/gpt-5.5\",\"type\":\"server_error\",\"code\":\"upstream_route_snapshot_empty\"}}",
                )
            } else if response_kind == GatewayResponseKind::ConfiguredRouteMismatch {
                Body::from(
                    "{\"error\":{\"message\":\"upstream route is not available for model: openai/gpt-5.5; route diagnostics: requested_model=openai/gpt-5.5; api_key_id=1; tenant_id=100001; organization_id=0; user_id=2; account_group_id=1; account_group_code=grp; capability=Chat; model_routes_loaded=1; account_routes_loaded=1; any_account_group_bindings=true; matching_group_bound_accounts=0; scoped_model_routes=0; scoped_account_routes=0\",\"type\":\"server_error\",\"code\":\"upstream_route_not_available\"}}",
                )
            } else if request.path == "/v1/images/generations" || request.path == "/v1/images/edits"
            {
                Body::from(
                    "{\"created\":1710000000,\"data\":[{\"url\":\"https://cdn.example.test/generated/poster.png\",\"mimeType\":\"image/png\"}],\"usage\":{\"input_tokens\":12,\"output_tokens\":2,\"total_tokens\":14}}",
                )
            } else if request.path == "/provider/suno/v1/music/generations" {
                Body::from(
                    "{\"id\":\"song_1\",\"data\":[{\"audioUrl\":\"https://cdn.example.test/generated/theme.mp3\",\"mimeType\":\"audio/mpeg\",\"durationSeconds\":30}],\"usage\":{\"total_tokens\":9}}",
                )
            } else if request
                .path
                .starts_with("/provider/elevenlabs/v1/sound-generation")
            {
                Body::from(
                    "{\"asset\":{\"url\":\"https://cdn.example.test/generated/impact.wav\",\"mimeType\":\"audio/wav\",\"durationSeconds\":5}}",
                )
            } else if request
                .path
                .starts_with("/provider/elevenlabs/v1/text-to-speech/")
            {
                Body::from("elevenlabs-audio")
            } else if request.path == "/v1/audio/speech" {
                Body::from("audio-bytes")
            } else if request.path == "/v1/responses" {
                Body::from("{\"id\":\"resp_1\",\"output_text\":\"hello\"}")
            } else if response_kind == GatewayResponseKind::GeminiImage {
                Body::from(
                    "data: {\"candidates\":[{\"content\":{\"parts\":[{\"inlineData\":{\"mimeType\":\"image/png\",\"data\":\"aW1hZ2UtYnl0ZXM=\"}}]}}]}\n\n\
                     data: [DONE]\n\n",
                )
            } else if response_kind == GatewayResponseKind::GeminiAudio {
                Body::from(
                    "data: {\"candidates\":[{\"content\":{\"parts\":[{\"inlineData\":{\"mimeType\":\"audio/wav\",\"data\":\"YXVkaW8td2F2\"}}]}}]}\n\n\
                     data: [DONE]\n\n",
                )
            } else if response_kind == GatewayResponseKind::GeminiText {
                Body::from(
                    "data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"gemini hello\"}]}}]}\n\n\
                     data: [DONE]\n\n",
                )
            } else if response_kind == GatewayResponseKind::GeminiMarkdownParts {
                Body::from(
                    "data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"```ts\"},{\"text\":\"const first = 1;\"},{\"text\":\"const second = 2;\"},{\"text\":\"```\"}]}}]}\n\n\
                     data: [DONE]\n\n",
                )
            } else {
                Body::from(
                    "data: {\"choices\":[{\"delta\":{\"content\":\"hello\"}}]}\n\n\
                    data: [DONE]\n\n",
                )
            };
            let content_type = if response_kind == GatewayResponseKind::ModelRouteMiss
                || transient_empty_route_snapshot
                || response_kind == GatewayResponseKind::ConfiguredRouteMismatch
            {
                Some("application/json; charset=utf-8".to_owned())
            } else if request.path == "/v1/responses"
                || request.path == "/v1/images/generations"
                || request.path == "/v1/images/edits"
                || request.path == "/provider/suno/v1/music/generations"
                || request
                    .path
                    .starts_with("/provider/elevenlabs/v1/sound-generation")
            {
                Some("application/json".to_owned())
            } else if request
                .path
                .starts_with("/provider/elevenlabs/v1/text-to-speech/")
            {
                if request.path.contains("output_format=wav_44100") {
                    Some("audio/wav".to_owned())
                } else {
                    Some("audio/mpeg".to_owned())
                }
            } else if request.path == "/v1/audio/speech" {
                if request.body["response_format"] == "wav" {
                    Some("audio/wav".to_owned())
                } else {
                    Some("audio/mpeg".to_owned())
                }
            } else {
                Some("text/event-stream".to_owned())
            };
            let status_code = if response_kind == GatewayResponseKind::ModelRouteMiss {
                400
            } else if transient_empty_route_snapshot
                || response_kind == GatewayResponseKind::ConfiguredRouteMismatch
            {
                503
            } else {
                200
            };
            Ok(AppRuntimeGatewayResponse::new(
                status_code,
                content_type,
                response_body,
            ))
        })
    }
}

#[derive(Debug)]
struct SlowStreamRelay;

impl ChatCompletionStreamRelay for SlowStreamRelay {
    fn create_chat_completion_stream<'a>(
        &'a self,
        _request: ChatCompletionRelayRequest,
    ) -> std::pin::Pin<
        Box<
            dyn std::future::Future<
                    Output = sdkwork_clawrouter_router_service::domain::DomainResult<
                        ChatCompletionStreamRelayResponse,
                    >,
                > + Send
                + 'a,
        >,
    > {
        Box::pin(async {
            let chunks = stream::iter(vec![
                Ok::<_, Infallible>(Bytes::from_static(
                    b"data: {\"choices\":[{\"delta\":{\"content\":\"first\"}}]}\n\n",
                )),
                Ok::<_, Infallible>(Bytes::from_static(
                    b"data: {\"choices\":[{\"delta\":{\"content\":\" second\"}}]}\n\n",
                )),
                Ok::<_, Infallible>(Bytes::from_static(b"data: [DONE]\n\n")),
            ])
            .then(|chunk| async move {
                if chunk.as_ref().is_ok_and(|bytes| {
                    bytes.starts_with(b"data: {\"choices\":[{\"delta\":{\"content\":\" second\"")
                }) {
                    tokio::time::sleep(Duration::from_millis(DELAYED_STREAM_SECOND_CHUNK_MILLIS))
                        .await;
                }
                chunk
            });
            Ok(ChatCompletionStreamRelayResponse::new(
                200,
                Some("text/event-stream".to_owned()),
                Body::from_stream(chunks),
            ))
        })
    }
}

#[derive(Debug)]
struct CountingSlowStreamRelay {
    calls: Arc<AtomicUsize>,
}

impl CountingSlowStreamRelay {
    fn new(calls: Arc<AtomicUsize>) -> Self {
        Self { calls }
    }
}

impl ChatCompletionStreamRelay for CountingSlowStreamRelay {
    fn create_chat_completion_stream<'a>(
        &'a self,
        _request: ChatCompletionRelayRequest,
    ) -> std::pin::Pin<
        Box<
            dyn std::future::Future<
                    Output = sdkwork_clawrouter_router_service::domain::DomainResult<
                        ChatCompletionStreamRelayResponse,
                    >,
                > + Send
                + 'a,
        >,
    > {
        self.calls.fetch_add(1, Ordering::SeqCst);
        Box::pin(async {
            let chunks = stream::iter(vec![
                Ok::<_, Infallible>(Bytes::from_static(
                    b"data: {\"choices\":[{\"delta\":{\"content\":\"first\"}}]}\n\n",
                )),
                Ok::<_, Infallible>(Bytes::from_static(
                    b"data: {\"choices\":[{\"delta\":{\"content\":\" second\"}}]}\n\n",
                )),
                Ok::<_, Infallible>(Bytes::from_static(b"data: [DONE]\n\n")),
            ])
            .then(|chunk| async move {
                if chunk.as_ref().is_ok_and(|bytes| {
                    bytes.starts_with(b"data: {\"choices\":[{\"delta\":{\"content\":\" second\"")
                }) {
                    tokio::time::sleep(Duration::from_millis(DELAYED_STREAM_SECOND_CHUNK_MILLIS))
                        .await;
                }
                chunk
            });
            Ok(ChatCompletionStreamRelayResponse::new(
                200,
                Some("text/event-stream".to_owned()),
                Body::from_stream(chunks),
            ))
        })
    }
}

fn sample_artifact() -> AppRuntimeArtifactItem {
    AppRuntimeArtifactItem {
        id: "runtime-artifact-1".to_owned(),
        invocation_id: "runtime-invocation-1".to_owned(),
        artifact_type: "file".to_owned(),
        name: Some("summary.md".to_owned()),
        mime_type: Some("text/markdown".to_owned()),
        content_text: Some("# Summary".to_owned()),
        storage_key: Some("runtime/runtime-invocation-1/summary.md".to_owned()),
        resource: Some(serde_json::json!({
            "kind": "document",
            "source": "external_url",
            "objectKey": "runtime/runtime-invocation-1/summary.md",
            "publicUrl": "https://cdn.example.test/runtime/runtime-invocation-1/summary.md"
        })),
        sha256: Some("abc123".to_owned()),
        size_bytes: Some(9),
        created_at: "2026-05-18 09:00:02".to_owned(),
    }
}

async fn response_json(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

async fn response_text(response: axum::response::Response) -> String {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    String::from_utf8(body.to_vec()).unwrap()
}

async fn runtime_failed_sse_text(response: axum::response::Response) -> String {
    assert_eq!(StatusCode::OK, response.status());
    let body = response_text(response).await;
    assert!(body.contains(r#""eventType":"runtime.failed""#), "{body}");
    assert!(body.ends_with("data: [DONE]\n\n"), "{body}");
    body
}

#[derive(Debug)]
struct SequentialUuidGenerator {
    values: Mutex<Vec<String>>,
}

impl SequentialUuidGenerator {
    fn new(values: Vec<&str>) -> Self {
        Self {
            values: Mutex::new(values.into_iter().rev().map(str::to_owned).collect()),
        }
    }
}

impl EntityUuidGenerator for SequentialUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        Ok(self
            .values
            .lock()
            .unwrap()
            .pop()
            .unwrap_or_else(|| "generated-uuid".to_owned()))
    }
}
