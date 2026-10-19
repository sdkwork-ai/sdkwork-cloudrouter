//! 实时语音会话在 WebSocket 代理落地前必须拒单。
//!
//! 实时面的创建响应只回一个会话对象，其中 `client_secret` 是**上游签发的临时
//! 密钥**（契约 `OpenAiRealtimeSession.client_secret`）。客户端拿它直连上游的
//! `wss://.../v1/realtime` 推流；本仓没有任何 WebSocket 代理、也没有
//! `response.done` 的用量回收（全仓 `grep` 不到 `WebSocketUpgrade` /
//! `tokio_tungstenite::` 的生产代码）。后果有两层：
//!
//! ```text
//! 计费：会话创建响应没有 usage ⇒ 复合抽取产出 0 行 ⇒ 结算跳过 ⇒ 0 元
//! 控制：客户拿着上游临时密钥绕过网关直连 ⇒ 音频 token 完全不进账
//! ```
//!
//! 这不是"少收"，是把整条实时语音链路（模型 + 带宽 + 供应商账户）免费开放。
//! 在 WS 代理 + 用量结算落地前，对**创建面**拒单：
//!
//! * `POST /v1/realtime/sessions`（持久会话）
//! * `POST /v1/realtime/calls`（服务端呼叫）
//! * `POST /v1/realtime/transcription_sessions` / `/translations`（实时转写/翻译）
//!
//! 管理动作（`accept` / `hangup` / `refer` / `reject`）不创建新的模型用量，
//! 继续放行；普通聊天/按次端点也不受守卫影响。

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    AccountBillingMode, AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor,
    Invocation, InvocationAccount, InvocationBody, InvocationClassificationRequest,
    InvocationError, InvocationErrorKind, InvocationInterceptor, InvocationRequest,
    InvocationResourceClassifier, InvocationSubject, OpenAiResourceClassifier,
    PricingPreflightInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::ProviderAuthProfile;
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use serde_json::{json, Value};
use std::sync::Arc;

fn subject() -> InvocationSubject {
    InvocationSubject::from_api_key_context(AuthenticatedApiKeyContext {
        tenant_id: 10,
        organization_id: 20,
        user_id: 30,
        api_key_id: 100,
        api_key_name_snapshot: "Test key".to_owned(),
        group_id: 10,
        group_code: "standard-group".to_owned(),
        pricing_plan_code: "standard".to_owned(),
    })
}

async fn invocation(method: Method, path: &str, body: Value) -> Invocation {
    let classification = OpenAiResourceClassifier
        .classify(&InvocationClassificationRequest::new(method.clone(), path))
        .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(method, path)
            .with_request_id("req-unmetered-realtime")
            .with_body(InvocationBody::json(body)),
        subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation.account = Some(InvocationAccount {
        supplier_code: "openai".to_owned(),
        account_id: 3001,
        region_code: "global".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some("https://api.openai.com".to_owned()),
        secret_ref: None,
        auth_profile: ProviderAuthProfile::default(),
        timeout_ms: None,
        retry_policy: None,
        provider_model: None,
        billing_mode: AccountBillingMode::Prepay,
        account_group_id: Some(10),
        account_group_code: Some("standard-group".to_owned()),
        pricing_plan_code: Some("standard".to_owned()),
    });
    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");
    invocation
}

/// 空目录足以区分"守卫拒单"与"正常计价失败"：守卫在价格解析之前执行。
async fn preflight_error(method: Method, path: &str, body: Value) -> InvocationError {
    let mut invocation = invocation(method, path, body).await;
    let catalog = Arc::new(InMemoryPricingCatalog::default());
    PricingPreflightInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect_err("preflight must fail without a catalog")
}

const REALTIME_REFUSAL: &str = "does not proxy";

fn assert_realtime_refusal(error: InvocationError) {
    assert_eq!(
        InvocationErrorKind::BillingUnavailable,
        error.kind,
        "the refusal must be a billing-unavailable failure: {error:?}"
    );
    assert!(
        error.message.contains(REALTIME_REFUSAL),
        "the refusal must explain the missing WebSocket proxy: {}",
        error.message
    );
    assert!(
        error.message.contains("openai.realtime"),
        "the refusal must name the api code: {}",
        error.message
    );
}

#[tokio::test]
async fn realtime_session_creation_is_refused() {
    let error = preflight_error(
        Method::POST,
        "/v1/realtime/sessions",
        json!({"model": "gpt-realtime-2", "voice": "alloy"}),
    )
    .await;
    assert_realtime_refusal(error);
}

#[tokio::test]
async fn realtime_call_creation_is_refused() {
    let error = preflight_error(
        Method::POST,
        "/v1/realtime/calls",
        json!({"model": "gpt-realtime-2", "sdp": "v=0"}),
    )
    .await;
    assert_realtime_refusal(error);
}

#[tokio::test]
async fn realtime_transcription_session_creation_is_refused() {
    let error = preflight_error(
        Method::POST,
        "/v1/realtime/transcription_sessions",
        json!({"model": "gpt-4o-transcribe"}),
    )
    .await;
    assert_realtime_refusal(error);
}

#[tokio::test]
async fn realtime_translation_session_creation_is_refused() {
    let error = preflight_error(
        Method::POST,
        "/v1/realtime/translations",
        json!({"model": "gpt-realtime-translate"}),
    )
    .await;
    assert_realtime_refusal(error);
}

/// 对照：挂断已有呼叫不创建新用量，不能被守卫误拦。
#[tokio::test]
async fn realtime_hangup_is_not_refused() {
    // 挂断是管理动作，不产生新的模型用量 ⇒ Free，空目录也应通过预检。
    let mut invocation =
        invocation(Method::POST, "/v1/realtime/calls/call_1/hangup", json!({})).await;
    assert_eq!(
        BillingMode::Free,
        invocation.billing.mode,
        "hangup must be free management"
    );
    PricingPreflightInterceptor::new(Arc::new(InMemoryPricingCatalog::default()))
        .before(&mut invocation)
        .await
        .expect("hangup must pass preflight without a catalog");
}

/// 对照：普通聊天端点不得被实时守卫误伤。
#[tokio::test]
async fn a_plain_chat_route_is_not_refused_as_realtime() {
    let error = preflight_error(
        Method::POST,
        "/v1/chat/completions",
        json!({"model": "gpt-5", "messages": []}),
    )
    .await;
    assert!(
        !error.message.contains(REALTIME_REFUSAL),
        "chat must not be mistaken for a realtime session: {}",
        error.message
    );
}
