use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    AccountBillingMode, AuthenticatedApiKeyContext, DispatchMode, Invocation, InvocationAccount,
    InvocationBody,
    InvocationClassificationRequest, InvocationDispatch, InvocationErrorKind,
    InvocationInterceptor, InvocationRequest, InvocationResourceClassifier,
    OpenAiResourceClassifier, StickyCommitInterceptor, StickyMode, StickyResolutionInterceptor,
    StickyRouting,
};
use sdkwork_cloudrouter_router_service::domain::{BillingMeter, ProviderAuthProfile};
use sdkwork_cloudrouter_router_service::ports::{
    StickyObjectRouteBinding, StickyObjectRouteLookup, StickyObjectRouteUpsert, StickyRouteStore,
    StickyRouteStoreFuture,
};
use serde_json::json;
use std::sync::{Arc, Mutex};

#[derive(Default)]
struct MemoryStickyRouteStore {
    bindings: Mutex<Vec<StickyObjectRouteBinding>>,
    lookups: Mutex<Vec<StickyObjectRouteLookup>>,
    upserts: Mutex<Vec<StickyObjectRouteUpsert>>,
    fail_lookups: bool,
}

impl MemoryStickyRouteStore {
    fn with_binding(binding: StickyObjectRouteBinding) -> Self {
        Self {
            bindings: Mutex::new(vec![binding]),
            lookups: Mutex::new(Vec::new()),
            upserts: Mutex::new(Vec::new()),
            fail_lookups: false,
        }
    }

    fn failing_lookups() -> Self {
        Self {
            fail_lookups: true,
            ..Self::default()
        }
    }
}

impl StickyRouteStore for MemoryStickyRouteStore {
    fn find_binding<'a>(
        &'a self,
        query: StickyObjectRouteLookup,
    ) -> StickyRouteStoreFuture<'a, Option<StickyObjectRouteBinding>> {
        Box::pin(async move {
            self.lookups.lock().expect("lookups").push(query.clone());
            if self.fail_lookups {
                return Err(sdkwork_cloudrouter_router_service::domain::DomainError::new(
                    "sticky store unavailable",
                ));
            }
            Ok(self
                .bindings
                .lock()
                .expect("bindings")
                .iter()
                .find(|binding| {
                    binding.tenant_id == query.tenant_id
                        && binding.organization_id == query.organization_id
                        && binding.object_type == query.object_type
                        && binding.object_id == query.object_id
                })
                .cloned())
        })
    }

    fn upsert_binding<'a>(
        &'a self,
        command: StickyObjectRouteUpsert,
    ) -> StickyRouteStoreFuture<'a, ()> {
        Box::pin(async move {
            self.upserts.lock().expect("upserts").push(command);
            Ok(())
        })
    }
}

fn test_subject() -> sdkwork_cloudrouter_router_service::application::InvocationSubject {
    sdkwork_cloudrouter_router_service::application::InvocationSubject::from_api_key_context(
        AuthenticatedApiKeyContext {
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            api_key_id: 100,
            api_key_name_snapshot: "Test key".to_owned(),
            group_id: 200,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
        },
    )
}

fn classified_invocation(method: Method, path: &str, body: InvocationBody) -> Invocation {
    let classification = OpenAiResourceClassifier
        .classify(&InvocationClassificationRequest::new(method.clone(), path))
        .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(method, path)
            .with_request_id("req-sticky")
            .with_body(body),
        test_subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation
}

fn sticky_binding(object_type: &str, object_id: &str) -> StickyObjectRouteBinding {
    StickyObjectRouteBinding {
        tenant_id: 100001,
        organization_id: 0,
        object_type: object_type.to_owned(),
        object_id: object_id.to_owned(),
        parent_object_type: None,
        parent_object_id: None,
        supplier_code: "openai".to_owned(),
        account_id: 300,
        account_group_id: Some(200),
        vendor_code: Some("openai".to_owned()),
        api_code: Some("openai.files".to_owned()),
        catalog_key: Some("openai/gpt-4o-mini".to_owned()),
        provider_model: Some("gpt-4o-mini".to_owned()),
        region_code: Some("global".to_owned()),
        sticky_scope: Some("object".to_owned()),
    }
}

fn routed_account() -> InvocationAccount {
    InvocationAccount {
        supplier_code: "openai".to_owned(),
        account_id: 300,
        region_code: "global".to_owned(),
        credential_id: Some(400),
        credential_rotation: Some("primary".to_owned()),
        base_url: Some("https://api.openai.example".to_owned()),
        secret_ref: Some("secret://openai/default".to_owned()),
        auth_profile: ProviderAuthProfile::default(),
        timeout_ms: Some(30_000),
        retry_policy: None,
        provider_model: Some("gpt-4o-mini".to_owned()),
        billing_mode: AccountBillingMode::Prepay,
        account_group_id: None,
        account_group_code: None,
        pricing_plan_code: None,
    }
}

#[tokio::test]
async fn create_then_sticky_prepares_without_store_lookup() {
    let store = Arc::new(MemoryStickyRouteStore::default());
    let mut invocation = classified_invocation(Method::POST, "/v1/files", InvocationBody::Empty);

    StickyResolutionInterceptor::new(store.clone())
        .before(&mut invocation)
        .await
        .expect("sticky resolution");

    assert!(invocation.routing.sticky_route.is_none());
    assert!(store.lookups.lock().expect("lookups").is_empty());
}

#[tokio::test]
async fn lookup_sticky_hit_binds_route_constraint() {
    let store = Arc::new(MemoryStickyRouteStore::with_binding(sticky_binding(
        "file", "file_123",
    )));
    let mut invocation = classified_invocation(
        Method::GET,
        "/v1/files/file_123/content",
        InvocationBody::Empty,
    );

    StickyResolutionInterceptor::new(store)
        .before(&mut invocation)
        .await
        .expect("sticky resolution");

    let sticky_route = invocation.routing.sticky_route.expect("sticky route");
    assert_eq!("openai", sticky_route.supplier_code);
    assert_eq!(300, sticky_route.account_id);
    assert_eq!(Some(200), sticky_route.account_group_id);
    assert_eq!(
        Some("openai/gpt-4o-mini"),
        sticky_route.catalog_key.as_deref()
    );
    assert_eq!(Some("gpt-4o-mini"), sticky_route.provider_model.as_deref());
    assert_eq!(Some("global"), sticky_route.region_code.as_deref());
    assert_eq!(
        Some("openai/gpt-4o-mini"),
        invocation.resource.requested_model_catalog_key.as_deref()
    );
}

#[tokio::test]
async fn lookup_sticky_miss_fails_closed() {
    let store = Arc::new(MemoryStickyRouteStore::default());
    let mut invocation = classified_invocation(
        Method::GET,
        "/v1/files/file_404/content",
        InvocationBody::Empty,
    );

    let error = StickyResolutionInterceptor::new(store)
        .before(&mut invocation)
        .await
        .expect_err("sticky miss");

    assert_eq!(InvocationErrorKind::Routing, error.kind);
    assert!(
        error.message.contains("sticky route binding not found"),
        "actual error: {}",
        error.message
    );
}

#[tokio::test]
async fn parent_sticky_hit_uses_parent_object_id() {
    let store = Arc::new(MemoryStickyRouteStore::with_binding(sticky_binding(
        "thread",
        "thread_123",
    )));
    let mut invocation = classified_invocation(
        Method::POST,
        "/v1/threads/thread_123/runs",
        InvocationBody::json(json!({"model": "gpt-4o-mini"})),
    );

    StickyResolutionInterceptor::new(store.clone())
        .before(&mut invocation)
        .await
        .expect("sticky resolution");

    let lookup = store
        .lookups
        .lock()
        .expect("lookups")
        .first()
        .cloned()
        .expect("lookup");
    assert_eq!("thread", lookup.object_type);
    assert_eq!("thread_123", lookup.object_id);
    assert_eq!(
        Some(300),
        invocation
            .routing
            .sticky_route
            .map(|route| route.account_id)
    );
}

#[tokio::test]
async fn commit_records_only_successful_sticky_response() {
    let store = Arc::new(MemoryStickyRouteStore::default());
    let mut success = classified_invocation(Method::POST, "/v1/files", InvocationBody::Empty);
    success.account = Some(routed_account());
    success.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "id": "file_123",
            "object": "file"
        }),
    );

    StickyCommitInterceptor::new(store.clone())
        .after(&mut success)
        .await
        .expect("sticky commit");

    let upsert = store
        .upserts
        .lock()
        .expect("upserts")
        .first()
        .cloned()
        .expect("upsert");
    assert_eq!("file", upsert.object_type);
    assert_eq!("file_123", upsert.object_id);
    assert_eq!("openai", upsert.supplier_code);
    assert_eq!(300, upsert.account_id);
    assert_eq!(
        Some("openai/management/files"),
        upsert.catalog_key.as_deref()
    );
    assert_eq!(
        Some(BillingMeter::ApiRequest.code().to_owned()),
        upsert.meter_code
    );

    let mut failed = classified_invocation(Method::POST, "/v1/files", InvocationBody::Empty);
    failed.account = Some(routed_account());
    failed.dispatch = InvocationDispatch::json_response(
        500,
        json!({
            "error": {"message": "upstream failed"}
        }),
    );

    StickyCommitInterceptor::new(store.clone())
        .after(&mut failed)
        .await
        .expect("failed provider response should not commit sticky route");

    assert_eq!(1, store.upserts.lock().expect("upserts").len());
}

#[tokio::test]
async fn commit_reads_internal_adapter_wrapper_body_for_sticky_response() {
    let store = Arc::new(MemoryStickyRouteStore::default());
    let mut invocation = classified_invocation(Method::POST, "/v1/files", InvocationBody::Empty);
    invocation.account = Some(routed_account());
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "statusCode": 202,
            "body": {
                "id": "file_adapter_123",
                "object": "file"
            }
        }),
    );
    invocation.dispatch.mode = DispatchMode::InternalProviderAdapter;

    StickyCommitInterceptor::new(store.clone())
        .after(&mut invocation)
        .await
        .expect("sticky commit");

    let upsert = store
        .upserts
        .lock()
        .expect("upserts")
        .first()
        .cloned()
        .expect("upsert");
    assert_eq!("file_adapter_123", upsert.object_id);
    assert_eq!("openai", upsert.supplier_code);
}

#[tokio::test]
async fn commit_skips_internal_adapter_wrapper_error_status() {
    let store = Arc::new(MemoryStickyRouteStore::default());
    let mut invocation = classified_invocation(Method::POST, "/v1/files", InvocationBody::Empty);
    invocation.account = Some(routed_account());
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "statusCode": 500,
            "body": {
                "id": "file_must_not_commit",
                "object": "file"
            }
        }),
    );
    invocation.dispatch.mode = DispatchMode::InternalProviderAdapter;

    StickyCommitInterceptor::new(store.clone())
        .after(&mut invocation)
        .await
        .expect("sticky commit");

    assert!(store.upserts.lock().expect("upserts").is_empty());
}

fn session_sticky_invocation() -> Invocation {
    let mut invocation = classified_invocation(
        Method::POST,
        "/v1/chat/completions",
        InvocationBody::json(json!({"model": "gpt-4o-mini", "messages": []})),
    );
    invocation.routing.sticky = Some(StickyRouting::session("session", "sess-1"));
    invocation
}

#[tokio::test]
async fn session_sticky_hit_binds_route_constraint() {
    let mut binding = sticky_binding("session", "sess-1");
    binding.sticky_scope = Some("session".to_owned());
    binding.api_code = Some("openai.chat_completions".to_owned());
    let store = Arc::new(MemoryStickyRouteStore::with_binding(binding));
    let mut invocation = session_sticky_invocation();

    StickyResolutionInterceptor::new(store.clone())
        .before(&mut invocation)
        .await
        .expect("sticky resolution");

    let lookup = store
        .lookups
        .lock()
        .expect("lookups")
        .first()
        .cloned()
        .expect("lookup");
    assert_eq!("session", lookup.object_type);
    assert_eq!("sess-1", lookup.object_id);

    let sticky_route = invocation.routing.sticky_route.expect("sticky route");
    assert_eq!("openai", sticky_route.supplier_code);
    assert_eq!(300, sticky_route.account_id);
    assert_eq!(Some(200), sticky_route.account_group_id);
    assert_eq!(
        Some("openai/gpt-4o-mini"),
        sticky_route.catalog_key.as_deref()
    );
    assert_eq!(
        Some("openai/gpt-4o-mini"),
        invocation.resource.requested_model_catalog_key.as_deref()
    );
}

#[tokio::test]
async fn session_sticky_miss_falls_back_to_regular_routing() {
    let store = Arc::new(MemoryStickyRouteStore::default());
    let mut invocation = session_sticky_invocation();

    StickyResolutionInterceptor::new(store)
        .before(&mut invocation)
        .await
        .expect("session sticky miss must be soft");

    assert!(
        invocation.routing.sticky.is_none(),
        "missed session sticky must fall back to regular routing"
    );
    assert!(invocation.routing.sticky_route.is_none());
}

#[tokio::test]
async fn session_sticky_without_session_id_is_skipped() {
    let store = Arc::new(MemoryStickyRouteStore::default());
    let mut invocation = classified_invocation(
        Method::POST,
        "/v1/chat/completions",
        InvocationBody::json(json!({"model": "gpt-4o-mini"})),
    );
    invocation.routing.sticky = Some(StickyRouting {
        mode: StickyMode::SessionSticky,
        object_type: "session".to_owned(),
        object_id: None,
        parent_object_type: None,
        parent_object_id: None,
        scope: sdkwork_cloudrouter_router_service::application::StickyScope::Session,
    });

    StickyResolutionInterceptor::new(store)
        .before(&mut invocation)
        .await
        .expect("sticky resolution");

    assert!(invocation.routing.sticky.is_none());
    assert!(invocation.routing.sticky_route.is_none());
}

#[tokio::test]
async fn session_commit_keys_binding_by_session_id() {
    let store = Arc::new(MemoryStickyRouteStore::default());
    let mut invocation = session_sticky_invocation();
    invocation.account = Some(routed_account());
    // 响应 id 与会话 id 不同：会话 sticky 必须以会话 id 为绑定键。
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "id": "chatcmpl-resp-1",
            "object": "chat.completion"
        }),
    );

    StickyCommitInterceptor::new(store.clone())
        .after(&mut invocation)
        .await
        .expect("sticky commit");

    let upsert = store
        .upserts
        .lock()
        .expect("upserts")
        .first()
        .cloned()
        .expect("upsert");
    assert_eq!("session", upsert.object_type);
    assert_eq!("sess-1", upsert.object_id);
    assert_eq!("session", upsert.sticky_scope);
    assert_eq!("openai", upsert.supplier_code);
    assert_eq!(300, upsert.account_id);
    assert_eq!("openai.chat_completions", upsert.api_code);
}

#[tokio::test]
async fn session_commit_skips_failed_response() {
    let store = Arc::new(MemoryStickyRouteStore::default());
    let mut invocation = session_sticky_invocation();
    invocation.account = Some(routed_account());
    invocation.dispatch = InvocationDispatch::json_response(
        500,
        json!({"error": {"message": "upstream failed"}}),
    );

    StickyCommitInterceptor::new(store.clone())
        .after(&mut invocation)
        .await
        .expect("sticky commit");

    assert!(store.upserts.lock().expect("upserts").is_empty());
}

#[tokio::test]
async fn session_commit_works_for_streaming_response_without_json_body() {
    // 流式（SSE）响应没有 JSON body/body_bytes：会话绑定不依赖响应体，
    // 必须仍然提交，否则流式会话永远无法建立亲和绑定。
    let store = Arc::new(MemoryStickyRouteStore::default());
    let mut invocation = session_sticky_invocation();
    invocation.account = Some(routed_account());
    invocation.dispatch = InvocationDispatch {
        mode: DispatchMode::DirectHttpPassthrough,
        invocation_shape:
            sdkwork_cloudrouter_router_service::application::InvocationShape::SseStream,
        adapter_target: None,
        resolved_secret: None,
        provider_request: None,
        response: Some(sdkwork_cloudrouter_router_service::application::InvocationDispatchResponse::streaming(
            200,
            Some("text/event-stream".to_owned()),
            axum::body::Body::empty(),
        )),
    };

    StickyCommitInterceptor::new(store.clone())
        .after(&mut invocation)
        .await
        .expect("sticky commit");

    let upsert = store
        .upserts
        .lock()
        .expect("upserts")
        .first()
        .cloned()
        .expect("upsert");
    assert_eq!("session", upsert.object_type);
    assert_eq!("sess-1", upsert.object_id);
    assert_eq!("session", upsert.sticky_scope);
}

#[tokio::test]
async fn session_sticky_store_failure_falls_back_to_regular_routing() {
    // 与资源型 sticky 不同，会话亲和查找故障不应拖垮请求。
    let store = Arc::new(MemoryStickyRouteStore::failing_lookups());
    let mut invocation = session_sticky_invocation();

    StickyResolutionInterceptor::new(store)
        .before(&mut invocation)
        .await
        .expect("store failure must degrade to regular routing");

    assert!(invocation.routing.sticky.is_none());
    assert!(invocation.routing.sticky_route.is_none());
}

#[tokio::test]
async fn object_sticky_store_failure_still_fails_closed() {
    let store = Arc::new(MemoryStickyRouteStore::failing_lookups());
    let mut invocation = classified_invocation(
        Method::GET,
        "/v1/files/file_123/content",
        InvocationBody::Empty,
    );

    let error = StickyResolutionInterceptor::new(store)
        .before(&mut invocation)
        .await
        .expect_err("object sticky store failure keeps fail-closed semantics");

    assert_eq!(InvocationErrorKind::Routing, error.kind);
    assert!(error.message.contains("failed to resolve sticky route binding"));
}
