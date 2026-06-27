use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use sdkwork_claw_test_support::{
    app_session_dual_token_headers, default_trusted_request_subject, payment_webhook_config,
    seeded_sqlite_catalog,
};
use serde_json::{json, Value};
use sqlx::Row;
use tower::ServiceExt;

#[tokio::test]
async fn app_api_exposes_standard_chat_and_agent_session_routes_with_sqlite_store() {
    let _runtime_guard = AppRuntimeWorkerEnvGuard::disabled_for_test();
    let catalog = seeded_sqlite_catalog().await.unwrap();
    let router = sdkwork_clawrouter_app_api_server::router_with_database_config_api_key_trusted_subject_and_app_session_config(
        catalog.database_config().unwrap(),
        catalog.api_key_security_config().unwrap(),
        catalog.trusted_subject_config().unwrap(),
        catalog.app_session_config().unwrap(),
        payment_webhook_config().unwrap(),
    )
    .await
    .unwrap();

    let (status, payload) = request_json(
        router.clone(),
        Method::POST,
        "/app/v3/api/memory/spaces",
        Some(json!({
            "title": "Project coding memory",
            "spaceType": "project",
            "ownerType": "agent",
            "ownerId": "agent-1",
            "memoryEnabled": true,
            "autoExtractEnabled": true,
            "autoRecallEnabled": true,
            "reviewRequired": false,
            "maxInjectedTokens": 4096,
            "retentionPolicy": {"ttlDays": 365},
            "sensitivityPolicy": {"level": "standard"},
            "metadata": {"surface": "chat_agent_standard_route"}
        })),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!("2000", payload["code"]);
    let memory_space_id = payload["data"]["item"]["id"].as_str().unwrap().to_owned();
    assert_eq!("Project coding memory", payload["data"]["item"]["title"]);

    let (status, payload) = request_json(
        router.clone(),
        Method::POST,
        "/app/v3/api/chat/conversations",
        Some(json!({
            "title": "Standard chat",
            "sourceSurface": "playground",
            "defaultModel": "gpt-5.1",
            "defaultProvider": "openai",
            "memorySpaceId": memory_space_id
        })),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!("2000", payload["code"]);
    let conversation_id = payload["data"]["item"]["id"].as_str().unwrap().to_owned();
    assert_eq!("Standard chat", payload["data"]["item"]["title"]);
    assert_eq!("playground", payload["data"]["item"]["sourceSurface"]);

    let (status, payload) = request_json(
        router.clone(),
        Method::POST,
        "/app/v3/api/runtime/invocations",
        Some(json!({
            "invocationType": "chat_response",
            "runtime": "claude_code",
            "endpoint": "messages.create",
            "status": "running",
            "conversationId": conversation_id,
            "requestId": "runtime-request-1",
            "traceId": "runtime-trace-1",
            "model": "claude-sonnet-4-5",
            "provider": "anthropic",
            "streaming": true,
            "requestJson": {"messages": [{"role": "user", "content": "hello"}]},
            "metadata": {"surface": "integration-test"}
        })),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!("2000", payload["code"]);
    let runtime_invocation_id = payload["data"]["item"]["id"].as_str().unwrap().to_owned();
    assert_eq!("claude_code", payload["data"]["item"]["runtime"]);

    let (status, payload) = request_json(
        router.clone(),
        Method::POST,
        &format!("/app/v3/api/runtime/invocations/{runtime_invocation_id}/events"),
        Some(json!({
            "eventType": "response.output_text.delta",
            "eventSource": "provider",
            "payloadJson": {"delta": "Use standardized runtime records."},
            "textDelta": "Use standardized runtime records.",
            "metadata": {"sequence": "first"}
        })),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!("2000", payload["code"]);
    assert_eq!(
        runtime_invocation_id,
        payload["data"]["item"]["invocationId"]
    );
    let runtime_event_id = payload["data"]["item"]["id"].as_str().unwrap().to_owned();

    let (status, payload) = request_json(
        router.clone(),
        Method::POST,
        &format!("/app/v3/api/runtime/invocations/{runtime_invocation_id}/artifacts"),
        Some(json!({
            "artifactType": "file",
            "name": "summary.md",
            "mimeType": "text/markdown",
            "contentText": "Runtime summary",
            "contentJson": {"kind": "markdown"},
            "storageKey": "runtime/summary.md",
            "sha256": "abc123",
            "sizeBytes": 15,
            "metadata": {"source": "codex"}
        })),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!("2000", payload["code"]);
    assert_eq!("summary.md", payload["data"]["item"]["name"]);
    let runtime_artifact_id = payload["data"]["item"]["id"].as_str().unwrap().to_owned();

    let (status, payload) = request_json(
        router.clone(),
        Method::POST,
        &format!("/app/v3/api/memory/spaces/{memory_space_id}/entries"),
        Some(json!({
            "memoryType": "preference",
            "subjectType": "user",
            "subjectKey": "user-1",
            "content": "Prefers normalized chat, agent, runtime, usage, and memory records.",
            "sourceKind": "manual",
            "importanceScore": "0.9000",
            "confidenceScore": "0.9500",
            "sensitivityLevel": "standard",
            "trustLevel": "observed",
            "status": "active",
            "metadata": {"origin": "integration-test"}
        })),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!("2000", payload["code"]);
    assert_eq!(memory_space_id, payload["data"]["item"]["spaceId"]);

    let (status, payload) = request_json(
        router.clone(),
        Method::GET,
        &format!("/app/v3/api/memory/spaces/{memory_space_id}/entries"),
        None,
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!("2000", payload["code"]);
    assert_eq!(1, payload["data"]["items"].as_array().unwrap().len());

    let (status, payload) = request_json(
        router.clone(),
        Method::POST,
        "/app/v3/api/chat/conversations",
        Some(json!({
            "title": "Standard chat",
            "sourceSurface": "playground",
            "defaultModel": "gpt-5.1",
            "defaultProvider": "openai",
            "memorySpaceId": memory_space_id
        })),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!("2000", payload["code"]);
    let _extra_conversation_id = payload["data"]["item"]["id"].as_str().unwrap().to_owned();
    assert_eq!("Standard chat", payload["data"]["item"]["title"]);
    assert_eq!("playground", payload["data"]["item"]["sourceSurface"]);

    let (status, payload) = request_json(
        router.clone(),
        Method::POST,
        &format!("/app/v3/api/chat/conversations/{conversation_id}/turns"),
        Some(json!({
            "message": "设计标准 chat session 体系",
            "mode": "agent",
            "agentId": "agent-1",
            "agentSessionId": "agent-session-1",
            "model": "claude-sonnet-4-5",
            "provider": "anthropic",
            "metadata": {"runtime": "claude_code"}
        })),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!("2000", payload["code"]);
    assert_eq!(
        &conversation_id,
        payload["data"]["turn"]["conversationId"].as_str().unwrap()
    );
    assert_eq!("running", payload["data"]["turn"]["status"]);

    let turn_id = payload["data"]["turn"]["id"].as_str().unwrap().to_owned();
    let (status, payload) = request_json(
        router.clone(),
        Method::POST,
        &format!("/app/v3/api/chat/conversations/{conversation_id}/turns/{turn_id}/response"),
        Some(json!({
            "message": "Use ChatConversation, ChatTurn, ChatMessage, runtime usage links, and agent sessions.",
            "status": "completed",
            "model": "claude-sonnet-4-5",
            "provider": "anthropic",
            "runtime": "claude_code",
            "runtimeInvocationId": runtime_invocation_id,
            "usageFactId": "101",
            "usage": {
                "inputTokens": 100,
                "outputTokens": 200,
                "cachedTokens": 10,
                "reasoningTokens": 20,
                "totalTokens": 330,
                "cost": "0.123",
                "currency": "USD"
            },
            "metadata": {"providerResponseId": "msg_123"}
        })),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!("2000", payload["code"]);
    assert_eq!("completed", payload["data"]["turn"]["status"]);
    assert_eq!("assistant", payload["data"]["messages"][0]["role"]);
    assert_eq!("output", payload["data"]["messages"][0]["direction"]);
    assert_eq!(
        runtime_invocation_id,
        payload["data"]["messages"][0]["runtimeInvocationId"]
    );
    assert_eq!(330, payload["data"]["messages"][0]["usage"]["totalTokens"]);

    let (status, payload) = request_json(
        router.clone(),
        Method::GET,
        &format!("/app/v3/api/chat/conversations/{conversation_id}/messages"),
        None,
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!("2000", payload["code"]);
    assert_eq!(2, payload["data"]["items"].as_array().unwrap().len());
    assert_eq!(
        &conversation_id,
        payload["data"]["items"][0]["conversationId"]
            .as_str()
            .unwrap()
    );
    assert_eq!("user", payload["data"]["items"][0]["role"]);
    assert_eq!("assistant", payload["data"]["items"][1]["role"]);
    assert_eq!(
        "claude_code",
        payload["data"]["items"][1]["runtime"].as_str().unwrap()
    );
    assert_eq!(
        330,
        payload["data"]["items"][1]["usage"]["totalTokens"]
            .as_i64()
            .unwrap()
    );
    assert_ne!("1", payload["data"]["items"][0]["conversationId"]);

    let (status, payload) = request_json(
        router.clone(),
        Method::POST,
        "/app/v3/api/agents/101/sessions",
        Some(json!({
            "title": "Codex implementation session",
            "agentVersionId": "201",
            "sessionKind": "coding",
            "sourceSurface": "chat",
            "chatConversationId": conversation_id,
            "memorySpaceId": memory_space_id,
            "runtime": "codex",
            "cwd": "..",
            "sandboxPolicy": "workspace-write",
            "approvalPolicy": "on-request",
            "permissionMode": "default",
            "defaultModel": "gpt-5.1-codex"
        })),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!("2000", payload["code"]);
    let session_id = payload["data"]["item"]["id"].as_str().unwrap().to_owned();
    assert_eq!("101", payload["data"]["item"]["agentId"]);
    assert_eq!("201", payload["data"]["item"]["agentVersionId"]);
    assert_eq!(memory_space_id, payload["data"]["item"]["memorySpaceId"]);
    assert_eq!("codex", payload["data"]["item"]["runtime"]);

    let (status, payload) = request_json(
        router.clone(),
        Method::GET,
        &format!("/app/v3/api/agents/sessions/{session_id}"),
        None,
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!("2000", payload["code"]);
    assert_eq!(session_id, payload["data"]["id"]);

    let (status, payload) = request_json(
        router.clone(),
        Method::POST,
        &format!("/app/v3/api/agents/sessions/{session_id}/runs"),
        Some(json!({
            "agentId": "101",
            "agentVersionId": "201",
            "requestId": "agent-run-request-1",
            "traceId": "agent-run-trace-1",
            "sourceSurface": "chat",
            "inputMessage": "Implement the standard agent run execution layer.",
            "memorySpaceId": memory_space_id,
            "runtime": "codex",
            "model": "gpt-5.1-codex",
            "executionMode": "interactive",
            "metadata": {"surface": "integration-test"}
        })),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!("2000", payload["code"]);
    let run_id = payload["data"]["item"]["id"].as_str().unwrap().to_owned();
    assert_eq!(session_id, payload["data"]["item"]["sessionId"]);
    assert_eq!("running", payload["data"]["item"]["status"]);
    assert_eq!("codex", payload["data"]["item"]["runtime"]);

    let (status, payload) = request_json(
        router.clone(),
        Method::POST,
        &format!("/app/v3/api/agents/runs/{run_id}/steps"),
        Some(json!({
            "stepType": "runtime",
            "status": "running",
            "title": "Codex runtime invocation",
            "model": "gpt-5.1-codex",
            "runtimeInvocationId": runtime_invocation_id,
            "toolName": "codex",
            "inputJson": {"prompt": "Implement the standard agent run execution layer."},
            "outputJson": {"delta": "Working"},
            "usageJson": {"inputTokens": 13, "outputTokens": 21, "cachedTokens": 2},
            "metadata": {"phase": "runtime"}
        })),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!("2000", payload["code"]);
    let step_id = payload["data"]["item"]["id"].as_str().unwrap().to_owned();
    assert_eq!(run_id, payload["data"]["item"]["runId"]);
    assert_eq!("runtime", payload["data"]["item"]["stepType"]);
    assert_eq!(
        runtime_invocation_id,
        payload["data"]["item"]["runtimeInvocationId"]
    );
    assert_eq!(36, payload["data"]["item"]["totalTokens"]);

    let pool = catalog.open_pool().await.unwrap();
    let event_row = sqlx::query(
        r#"
        SELECT agent_run_id, agent_run_step_id
        FROM ai_runtime_invocation_event
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND user_id = 30
          AND uuid = ?1
        "#,
    )
    .bind(&runtime_event_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        run_id,
        event_row
            .get::<Option<String>, _>("agent_run_id")
            .as_deref()
            .unwrap()
    );
    assert_eq!(
        step_id,
        event_row
            .get::<Option<String>, _>("agent_run_step_id")
            .as_deref()
            .unwrap()
    );

    let artifact_row = sqlx::query(
        r#"
        SELECT agent_run_id, agent_run_step_id
        FROM ai_runtime_artifact
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND user_id = 30
          AND uuid = ?1
        "#,
    )
    .bind(&runtime_artifact_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        run_id,
        artifact_row
            .get::<Option<String>, _>("agent_run_id")
            .as_deref()
            .unwrap()
    );
    assert_eq!(
        step_id,
        artifact_row
            .get::<Option<String>, _>("agent_run_step_id")
            .as_deref()
            .unwrap()
    );

    let runtime_invocation_row = sqlx::query(
        r#"
        SELECT agent_run_id, agent_run_step_id
        FROM ai_runtime_invocation
        WHERE uuid = ?1
          AND tenant_id = 100001
          AND organization_id = 0
          AND user_id = 30
        "#,
    )
    .bind(&runtime_invocation_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        run_id,
        runtime_invocation_row
            .get::<Option<String>, _>("agent_run_id")
            .as_deref()
            .unwrap()
    );
    assert_eq!(
        step_id,
        runtime_invocation_row
            .get::<Option<String>, _>("agent_run_step_id")
            .as_deref()
            .unwrap()
    );

    let (status, payload) = request_json(
        router.clone(),
        Method::GET,
        &format!("/app/v3/api/runtime/invocations/{runtime_invocation_id}"),
        None,
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!("2000", payload["code"]);
    assert_eq!(run_id, payload["data"]["agentRunId"]);
    assert_eq!(step_id, payload["data"]["agentRunStepId"]);

    let (status, payload) = request_json(
        router.clone(),
        Method::GET,
        &format!("/app/v3/api/agents/sessions/{session_id}/runs"),
        None,
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!(1, payload["data"]["items"].as_array().unwrap().len());
    assert_eq!(run_id, payload["data"]["items"][0]["id"]);

    let (status, payload) = request_json(
        router.clone(),
        Method::POST,
        &format!("/app/v3/api/agents/runs/{run_id}/complete"),
        Some(json!({
            "status": "completed",
            "outputMessage": "Agent run completed with standardized runtime linkage.",
            "usageJson": {"inputTokens": 13, "outputTokens": 21, "cachedTokens": 2},
            "metadata": {"completed": true}
        })),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!("completed", payload["data"]["item"]["status"]);
    assert_eq!(
        "Agent run completed with standardized runtime linkage.",
        payload["data"]["item"]["outputMessage"]
    );
    assert_eq!(1, payload["data"]["item"]["totalSteps"]);
    assert_eq!(36, payload["data"]["item"]["totalTokens"]);

    let (status, payload) = request_json(
        router.clone(),
        Method::GET,
        &format!("/app/v3/api/agents/runs/{run_id}/steps"),
        None,
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!(1, payload["data"]["items"].as_array().unwrap().len());
    assert_eq!("codex", payload["data"]["items"][0]["toolName"]);

    let (status, payload) = request_json(
        router.clone(),
        Method::POST,
        &format!("/app/v3/api/runtime/invocations/{runtime_invocation_id}/complete"),
        Some(json!({
            "status": "completed",
            "providerResponseId": "msg_123",
            "finishReason": "stop",
            "latencyMs": 1200,
            "ttftMs": 200,
            "exitCode": 0,
            "responseJson": {"id": "msg_123"},
            "usageJson": {"inputTokens": 100, "outputTokens": 200}
        })),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!("completed", payload["data"]["item"]["status"]);

    let (status, payload) = request_json(
        router.clone(),
        Method::GET,
        &format!("/app/v3/api/runtime/invocations/{runtime_invocation_id}/events"),
        None,
    )
    .await;
    assert_eq!(StatusCode::OK, status, "payload: {payload}");
    assert_eq!(1, payload["data"]["items"].as_array().unwrap().len());

    let response = authorized_request(
        router.clone(),
        Method::POST,
        "/app/v3/api/playground/chat/conversations",
        Some(json!({})),
    )
    .await;
    assert_eq!(StatusCode::NOT_FOUND, response.status());

    let response = authorized_request(
        router,
        Method::POST,
        "/app/v3/api/playground/agents/runs",
        Some(json!({})),
    )
    .await;
    assert_eq!(StatusCode::NOT_FOUND, response.status());
}

async fn request_json(
    router: axum::Router,
    method: Method,
    uri: &str,
    body: Option<Value>,
) -> (StatusCode, Value) {
    let response = authorized_request(router, method, uri, body).await;
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload = serde_json::from_slice(&body).unwrap_or(Value::Null);
    (status, payload)
}

async fn authorized_request(
    router: axum::Router,
    method: Method,
    uri: &str,
    body: Option<Value>,
) -> axum::response::Response {
    let (authorization, access_token) = app_session_dual_token_headers(
        default_trusted_request_subject(),
        current_unix_seconds() - 1,
        current_unix_seconds() + 300,
    )
    .unwrap();
    let body = body.map(|value| value.to_string()).unwrap_or_default();
    router
        .oneshot(
            Request::builder()
                .method(method)
                .uri(uri)
                .header("authorization", authorization)
                .header("Access-Token", access_token)
                .header("content-type", "application/json")
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap()
}

fn current_unix_seconds() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(1_800_000_000)
}

struct EnvOverride {
    key: &'static str,
    previous: Option<String>,
}

impl EnvOverride {
    fn set(key: &'static str, value: &str) -> Self {
        let previous = std::env::var(key).ok();
        std::env::set_var(key, value);
        Self { key, previous }
    }
}

impl Drop for EnvOverride {
    fn drop(&mut self) {
        if let Some(value) = self.previous.as_deref() {
            std::env::set_var(self.key, value);
        } else {
            std::env::remove_var(self.key);
        }
    }
}

struct AppRuntimeWorkerEnvGuard {
    _model_ranking_enabled: EnvOverride,
    _catalog_refresh_interval: EnvOverride,
}

impl AppRuntimeWorkerEnvGuard {
    fn disabled_for_test() -> Self {
        Self {
            _model_ranking_enabled: EnvOverride::set(
                "SDKWORK_CLAW_MODEL_RANKING_REFRESH_WORKER_ENABLED",
                "false",
            ),
            _catalog_refresh_interval: EnvOverride::set(
                "SDKWORK_CLAW_PROVIDER_CATALOG_REFRESH_INTERVAL_MILLIS",
                "3600000",
            ),
        }
    }
}
