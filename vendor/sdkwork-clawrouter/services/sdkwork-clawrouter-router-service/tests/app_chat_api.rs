mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::application::EntityUuidGenerator;
use sdkwork_clawrouter_router_service::domain::DomainResult;
use sdkwork_clawrouter_router_service::ports::{
    AppChatConversationItem, AppChatConversationList, AppChatFuture, AppChatMessageItem,
    AppChatStore, AppChatSubject, AppChatTurnItem, AppChatTurnOutcome, AppChatUsageSnapshot,
    CompleteAppChatTurnCommand, CreateAppChatConversationCommand, CreateAppChatTurnCommand,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn app_chat_create_conversation_uses_product_chat_namespace_and_store_contract() {
    let store = Arc::new(TestAppChatStore::default());
    let router = sdkwork_clawrouter_router_service::api::app_chat_router_with_store(
        store.clone(),
        Arc::new(SequentialUuidGenerator::new(vec!["conversation-uuid-1"])),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/chat/conversations")
                .header("content-type", "application/json")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::from(
                    r#"{
                      "title":"Router design",
                      "sourceSurface":"playground",
                      "defaultModel":"gpt-5.1",
                      "defaultProvider":"openai",
                      "agentId":"agent-1",
                      "memorySpaceId":"memory-space-1"
                    }"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!("SUCCESS", payload["msg"]);
    assert_eq!(None, payload.get("message"));
    assert_eq!("chat-conversation-1", payload["data"]["item"]["id"]);
    assert_eq!("Router design", payload["data"]["item"]["title"]);
    assert_eq!("playground", payload["data"]["item"]["sourceSurface"]);
    assert_eq!("agent-1", payload["data"]["item"]["agentId"]);
    assert_eq!("memory-space-1", payload["data"]["item"]["memorySpaceId"]);

    let commands = store.create_conversation_commands.lock().unwrap();
    assert_eq!(1, commands.len());
    assert_eq!(10, commands[0].subject.tenant_id);
    assert_eq!(20, commands[0].subject.organization_id);
    assert_eq!(30, commands[0].subject.user_id);
    assert_eq!("conversation-uuid-1", commands[0].conversation_uuid);
    assert_eq!("Router design", commands[0].title.as_deref().unwrap());
    assert_eq!("playground", commands[0].source_surface);
    assert_eq!("gpt-5.1", commands[0].default_model.as_deref().unwrap());
}

#[tokio::test]
async fn app_chat_list_conversations_uses_trusted_subject_and_returns_items() {
    let store = Arc::new(TestAppChatStore::default());
    let router = sdkwork_clawrouter_router_service::api::app_chat_router_with_store(
        store.clone(),
        Arc::new(SequentialUuidGenerator::new(Vec::new())),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/chat/conversations?page=1&page_size=20")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!(1, payload["data"]["items"].as_array().unwrap().len());
    assert_eq!("chat-conversation-1", payload["data"]["items"][0]["id"]);

    let subjects = store.list_subjects.lock().unwrap();
    assert_eq!(
        vec![AppChatSubject {
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30
        }],
        *subjects
    );
}

#[tokio::test]
async fn app_chat_create_turn_carries_message_agent_and_model_context() {
    let store = Arc::new(TestAppChatStore::default());
    let router = sdkwork_clawrouter_router_service::api::app_chat_router_with_store(
        store.clone(),
        Arc::new(SequentialUuidGenerator::new(vec![
            "turn-uuid-1",
            "input-item-uuid-1",
            "input-message-uuid-1",
            "output-item-uuid-1",
            "output-message-uuid-1",
        ])),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/chat/conversations/chat-conversation-1/turns")
                .header("content-type", "application/json")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::from(
                    r#"{
                      "message":"Design the chat schema",
                      "mode":"agent",
                      "agentId":"agent-1",
                      "agentSessionId":"agent-session-1",
                      "model":"claude-sonnet-4-5",
                      "provider":"anthropic",
                      "metadata":{"client":"playground"}
                    }"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!("chat-turn-1", payload["data"]["turn"]["id"]);
    assert_eq!("running", payload["data"]["turn"]["status"]);
    assert_eq!("chat-message-user-1", payload["data"]["messages"][0]["id"]);
    assert_eq!("user", payload["data"]["messages"][0]["role"]);
    assert_eq!(
        "Design the chat schema",
        payload["data"]["messages"][0]["content"]
    );

    let commands = store.create_turn_commands.lock().unwrap();
    assert_eq!(1, commands.len());
    assert_eq!("chat-conversation-1", commands[0].conversation_id);
    assert_eq!("Design the chat schema", commands[0].message);
    assert_eq!("agent", commands[0].mode.as_deref().unwrap());
    assert_eq!("agent-1", commands[0].agent_id.as_deref().unwrap());
    assert_eq!(
        "agent-session-1",
        commands[0].agent_session_id.as_deref().unwrap()
    );
    assert_eq!("claude-sonnet-4-5", commands[0].model.as_deref().unwrap());
    assert_eq!("anthropic", commands[0].provider.as_deref().unwrap());
}

#[tokio::test]
async fn app_chat_complete_turn_response_carries_runtime_usage_and_assistant_output() {
    let store = Arc::new(TestAppChatStore::default());
    let router = sdkwork_clawrouter_router_service::api::app_chat_router_with_store(
        store.clone(),
        Arc::new(SequentialUuidGenerator::new(vec![
            "assistant-message-uuid-1",
            "assistant-part-uuid-1",
            "usage-link-uuid-1",
        ])),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/chat/conversations/chat-conversation-1/turns/chat-turn-1/response")
                .header("content-type", "application/json")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::from(
                    r#"{
                      "message":"Use ChatConversation, ChatTurn, ChatMessage, and runtime usage links.",
                      "status":"completed",
                      "model":"claude-sonnet-4-5",
                      "provider":"anthropic",
                      "runtime":"claude_code",
                      "runtimeInvocationId":"runtime-invocation-1",
                      "usageFactId":"101",
                      "usage":{
                        "inputTokens":100,
                        "outputTokens":200,
                        "totalTokens":300,
                        "cost":"0.123",
                        "currency":"USD"
                      },
                      "metadata":{"providerResponseId":"msg_123"}
                    }"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!("completed", payload["data"]["turn"]["status"]);
    assert_eq!("assistant", payload["data"]["messages"][0]["role"]);
    assert_eq!("output", payload["data"]["messages"][0]["direction"]);
    assert_eq!(
        "Use ChatConversation, ChatTurn, ChatMessage, and runtime usage links.",
        payload["data"]["messages"][0]["content"]
    );
    assert_eq!(
        "runtime-invocation-1",
        payload["data"]["messages"][0]["runtimeInvocationId"]
    );
    assert_eq!(100, payload["data"]["messages"][0]["usage"]["inputTokens"]);
    assert_eq!(
        "0.123",
        payload["data"]["messages"][0]["usage"]["costAmount"]
    );

    let commands = store.complete_turn_commands.lock().unwrap();
    assert_eq!(1, commands.len());
    assert_eq!("chat-conversation-1", commands[0].conversation_id);
    assert_eq!("chat-turn-1", commands[0].turn_id);
    assert_eq!("assistant-message-uuid-1", commands[0].output_message_uuid);
    assert_eq!("assistant-part-uuid-1", commands[0].output_part_uuid);
    assert_eq!("usage-link-uuid-1", commands[0].usage_link_uuid);
    assert_eq!(
        "Use ChatConversation, ChatTurn, ChatMessage, and runtime usage links.",
        commands[0].message
    );
    assert_eq!("completed", commands[0].status);
    assert_eq!("claude-sonnet-4-5", commands[0].model.as_deref().unwrap());
    assert_eq!("anthropic", commands[0].provider.as_deref().unwrap());
    assert_eq!("claude_code", commands[0].runtime.as_deref().unwrap());
    assert_eq!(
        "runtime-invocation-1",
        commands[0].runtime_invocation_id.as_deref().unwrap()
    );
    assert_eq!(101, commands[0].usage_fact_id.unwrap());
    assert_eq!(100, commands[0].usage.as_ref().unwrap().input_tokens);
    assert_eq!(200, commands[0].usage.as_ref().unwrap().output_tokens);
    assert_eq!(
        "0.123",
        commands[0]
            .usage
            .as_ref()
            .unwrap()
            .cost_amount
            .as_deref()
            .unwrap()
    );
}

#[tokio::test]
async fn app_chat_complete_turn_response_preserves_markdown_response_whitespace() {
    let store = Arc::new(TestAppChatStore::default());
    let router = sdkwork_clawrouter_router_service::api::app_chat_router_with_store(
        store.clone(),
        Arc::new(SequentialUuidGenerator::new(vec![
            "assistant-message-uuid-1",
            "assistant-part-uuid-1",
            "usage-link-uuid-1",
        ])),
    );

    let markdown = "\n### Answer\n\n```ts\n  const first = 1;\n  const second = 2;\n```\n";
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(
                    "/app/v3/api/chat/conversations/chat-conversation-1/turns/chat-turn-1/response",
                )
                .header("content-type", "application/json")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::from(
                    serde_json::json!({
                        "message": markdown,
                        "status": "completed",
                        "model": "claude-sonnet-4-5",
                        "provider": "anthropic",
                        "runtime": "openai_compatible",
                        "runtimeInvocationId": "runtime-invocation-1"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);

    let commands = store.complete_turn_commands.lock().unwrap();
    assert_eq!(1, commands.len());
    assert_eq!(markdown, commands[0].message);
}

#[tokio::test]
async fn app_chat_complete_turn_response_rejects_non_numeric_usage_fact_id() {
    let store = Arc::new(TestAppChatStore::default());
    let router = sdkwork_clawrouter_router_service::api::app_chat_router_with_store(
        store.clone(),
        Arc::new(SequentialUuidGenerator::new(vec![
            "assistant-message-uuid-1",
            "assistant-part-uuid-1",
            "usage-link-uuid-1",
        ])),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(
                    "/app/v3/api/chat/conversations/chat-conversation-1/turns/chat-turn-1/response",
                )
                .header("content-type", "application/json")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::from(
                    r#"{
                      "message":"invalid usage id",
                      "usageFactId":"usage-fact-abc",
                      "usage":{"inputTokens":100}
                    }"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = response_json(response).await;
    assert_eq!("4001", payload["code"]);
    assert_eq!(
        "usageFactId must be a positive integer string",
        payload["msg"]
    );
    assert_eq!(None, payload.get("message"));
    assert!(store.complete_turn_commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn app_chat_does_not_expose_playground_backend_namespace() {
    let router = sdkwork_clawrouter_router_service::api::app_chat_router_with_store(
        Arc::new(TestAppChatStore::default()),
        Arc::new(SequentialUuidGenerator::new(Vec::new())),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/playground/chat/conversations")
                .header("content-type", "application/json")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_FOUND, response.status());
}

#[derive(Default)]
struct TestAppChatStore {
    create_conversation_commands: Mutex<Vec<CreateAppChatConversationCommand>>,
    create_turn_commands: Mutex<Vec<CreateAppChatTurnCommand>>,
    complete_turn_commands: Mutex<Vec<CompleteAppChatTurnCommand>>,
    list_subjects: Mutex<Vec<AppChatSubject>>,
}

impl AppChatStore for TestAppChatStore {
    fn list_conversations<'a>(
        &'a self,
        subject: AppChatSubject,
        _page: i64,
        _page_size: i64,
    ) -> AppChatFuture<'a, AppChatConversationList> {
        Box::pin(async move {
            self.list_subjects.lock().unwrap().push(subject);
            Ok(AppChatConversationList {
                items: vec![sample_conversation()],
            })
        })
    }

    fn get_conversation<'a>(
        &'a self,
        _subject: AppChatSubject,
        _conversation_id: String,
    ) -> AppChatFuture<'a, Option<AppChatConversationItem>> {
        Box::pin(async { Ok(Some(sample_conversation())) })
    }

    fn create_conversation<'a>(
        &'a self,
        command: CreateAppChatConversationCommand,
    ) -> AppChatFuture<'a, AppChatConversationItem> {
        Box::pin(async move {
            self.create_conversation_commands
                .lock()
                .unwrap()
                .push(command);
            Ok(sample_conversation())
        })
    }

    fn list_messages<'a>(
        &'a self,
        _subject: AppChatSubject,
        _conversation_id: String,
    ) -> AppChatFuture<'a, Vec<AppChatMessageItem>> {
        Box::pin(async {
            Ok(vec![AppChatMessageItem {
                id: "chat-message-user-1".to_owned(),
                conversation_id: "chat-conversation-1".to_owned(),
                turn_id: Some("chat-turn-1".to_owned()),
                role: "user".to_owned(),
                direction: "input".to_owned(),
                content: "Design the chat schema".to_owned(),
                status: "completed".to_owned(),
                model: None,
                provider: None,
                runtime: None,
                runtime_invocation_id: None,
                usage_link_id: None,
                usage: None,
                created_at: "2026-05-18T00:00:00Z".to_owned(),
            }])
        })
    }

    fn create_turn<'a>(
        &'a self,
        command: CreateAppChatTurnCommand,
    ) -> AppChatFuture<'a, AppChatTurnOutcome> {
        Box::pin(async move {
            self.create_turn_commands.lock().unwrap().push(command);
            Ok(AppChatTurnOutcome {
                turn: AppChatTurnItem {
                    id: "chat-turn-1".to_owned(),
                    conversation_id: "chat-conversation-1".to_owned(),
                    status: "running".to_owned(),
                    model: Some("claude-sonnet-4-5".to_owned()),
                    provider: Some("anthropic".to_owned()),
                    agent_id: Some("agent-1".to_owned()),
                    agent_session_id: Some("agent-session-1".to_owned()),
                    created_at: "2026-05-18T00:00:00Z".to_owned(),
                    updated_at: "2026-05-18T00:00:00Z".to_owned(),
                },
                messages: vec![AppChatMessageItem {
                    id: "chat-message-user-1".to_owned(),
                    conversation_id: "chat-conversation-1".to_owned(),
                    turn_id: Some("chat-turn-1".to_owned()),
                    role: "user".to_owned(),
                    direction: "input".to_owned(),
                    content: "Design the chat schema".to_owned(),
                    status: "completed".to_owned(),
                    model: None,
                    provider: None,
                    runtime: None,
                    runtime_invocation_id: None,
                    usage_link_id: None,
                    usage: None,
                    created_at: "2026-05-18T00:00:00Z".to_owned(),
                }],
            })
        })
    }

    fn complete_turn_response<'a>(
        &'a self,
        command: CompleteAppChatTurnCommand,
    ) -> AppChatFuture<'a, AppChatTurnOutcome> {
        Box::pin(async move {
            self.complete_turn_commands.lock().unwrap().push(command);
            Ok(AppChatTurnOutcome {
                turn: AppChatTurnItem {
                    id: "chat-turn-1".to_owned(),
                    conversation_id: "chat-conversation-1".to_owned(),
                    status: "completed".to_owned(),
                    model: Some("claude-sonnet-4-5".to_owned()),
                    provider: Some("anthropic".to_owned()),
                    agent_id: Some("agent-1".to_owned()),
                    agent_session_id: Some("agent-session-1".to_owned()),
                    created_at: "2026-05-18T00:00:00Z".to_owned(),
                    updated_at: "2026-05-18T00:00:01Z".to_owned(),
                },
                messages: vec![AppChatMessageItem {
                    id: "assistant-message-uuid-1".to_owned(),
                    conversation_id: "chat-conversation-1".to_owned(),
                    turn_id: Some("chat-turn-1".to_owned()),
                    role: "assistant".to_owned(),
                    direction: "output".to_owned(),
                    content:
                        "Use ChatConversation, ChatTurn, ChatMessage, and runtime usage links."
                            .to_owned(),
                    status: "completed".to_owned(),
                    model: Some("claude-sonnet-4-5".to_owned()),
                    provider: Some("anthropic".to_owned()),
                    runtime: Some("claude_code".to_owned()),
                    runtime_invocation_id: Some("runtime-invocation-1".to_owned()),
                    usage_link_id: Some("usage-link-uuid-1".to_owned()),
                    usage: Some(AppChatUsageSnapshot {
                        input_tokens: 100,
                        output_tokens: 200,
                        cached_tokens: 0,
                        reasoning_tokens: 0,
                        total_tokens: 300,
                        cost_amount: Some("0.123".to_owned()),
                        currency: Some("USD".to_owned()),
                    }),
                    created_at: "2026-05-18T00:00:01Z".to_owned(),
                }],
            })
        })
    }
}

fn sample_conversation() -> AppChatConversationItem {
    AppChatConversationItem {
        id: "chat-conversation-1".to_owned(),
        title: "Router design".to_owned(),
        status: "active".to_owned(),
        source_surface: "playground".to_owned(),
        default_model: Some("gpt-5.1".to_owned()),
        default_provider: Some("openai".to_owned()),
        agent_id: Some("agent-1".to_owned()),
        agent_session_id: None,
        memory_space_id: Some("memory-space-1".to_owned()),
        last_message_preview: Some("Design the chat schema".to_owned()),
        message_count: 1,
        turn_count: 1,
        created_at: "2026-05-18T00:00:00Z".to_owned(),
        updated_at: "2026-05-18T00:00:00Z".to_owned(),
    }
}

async fn response_json(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
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
