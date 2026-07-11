use axum::http::Method;
use sdkwork_claw_provider_adapter_contract::AdapterInvocationShape;
use sdkwork_clawrouter_router_service::application::{
    AuthenticatedApiKeyContext, DispatchExecutor, DispatchMode, Invocation, InvocationAccount,
    InvocationAdapterTarget, InvocationBilling, InvocationBody, InvocationDispatch,
    InvocationDispatchResponse, InvocationErrorKind, InvocationInterceptor,
    InvocationProviderRequest, InvocationRequest, InvocationResource, InvocationRouteCandidate,
    InvocationRouteCandidateKind, InvocationRoutePlan, InvocationRouting, InvocationShape,
    InvocationSubject, ResolvedProviderSecret,
};
use sdkwork_clawrouter_router_service::domain::{
    AiRouteModelRequirement, AiRouteStrategy, BillingMeter, DomainError, DomainResult,
    ProviderAuthProfile, ProviderRetryPolicy, RoutingCapability,
};
use sdkwork_clawrouter_router_service::ports::{
    InvocationDispatchError, InvocationDispatcher, InvocationDispatcherFuture,
    ProviderAdapterRouteResolver, ProviderSecretResolver,
};
use serde_json::{json, Value};
use std::collections::{HashMap, VecDeque};
use std::sync::{Arc, Mutex};

fn subject() -> InvocationSubject {
    InvocationSubject::from_api_key_context(AuthenticatedApiKeyContext {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        api_key_id: 100,
        api_key_name_snapshot: "Test key".to_owned(),
        group_id: 10,
        group_code: "standard-group".to_owned(),
        pricing_plan_code: "standard".to_owned(),
    })
}

fn invocation_with_plan(
    strategy: AiRouteStrategy,
    candidates: Vec<InvocationRouteCandidate>,
) -> Invocation {
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/chat/completions")
            .with_request_id("req-dispatch"),
        subject(),
        InvocationResource::model_call(
            "openai/model/chat_completions",
            "openai.chat_completions",
            RoutingCapability::Chat,
            AiRouteModelRequirement::Required,
        )
        .with_requested_model("gpt-4o-mini"),
        InvocationBilling::composite(BillingMeter::LlmInputToken),
    );
    invocation.routing = InvocationRouting::new(strategy, None);
    invocation.routing.route_plan = Some(InvocationRoutePlan::new(candidates));
    invocation
}

fn candidate(provider_code: &str, channel_id: i64) -> InvocationRouteCandidate {
    InvocationRouteCandidate {
        kind: InvocationRouteCandidateKind::Model,
        provider_code: provider_code.to_owned(),
        channel_id,
        channel_group_id: Some(10),
        channel_group_code: Some("standard-group".to_owned()),
        pricing_plan_code: Some("standard".to_owned()),
        policy_id: Some(1),
        rule_id: Some(2),
        api_code: "openai.chat_completions".to_owned(),
        catalog_key: Some("openai/gpt-4o-mini".to_owned()),
        requested_model: Some("gpt-4o-mini".to_owned()),
        provider_model: Some(format!("{provider_code}-model")),
        region_code: "global".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some(format!("https://provider.example/{provider_code}")),
        secret_ref: None,
        auth_profile: ProviderAuthProfile::default(),
        timeout_ms: None,
        retry_policy: None,
    }
}

fn with_secret_ref(mut candidate: InvocationRouteCandidate) -> InvocationRouteCandidate {
    candidate.secret_ref = Some(format!("vault://provider/{}", candidate.provider_code));
    candidate
}

fn with_retry_attempts(
    mut candidate: InvocationRouteCandidate,
    attempts: usize,
    statuses: Vec<u16>,
) -> InvocationRouteCandidate {
    candidate.retry_policy = Some(ProviderRetryPolicy::new(attempts, statuses, 0).unwrap());
    candidate
}

#[derive(Clone)]
struct FakeDispatcher {
    outcomes: Arc<Mutex<Vec<Result<InvocationDispatchResponse, InvocationDispatchError>>>>,
    providers: Arc<Mutex<Vec<String>>>,
    provider_requests: Arc<Mutex<Vec<Option<InvocationProviderRequest>>>>,
}

#[derive(Clone, Debug)]
struct MapSecretResolver {
    secrets: HashMap<String, String>,
}

#[derive(Debug)]
struct RotatingSecretResolver {
    secrets: Mutex<HashMap<String, VecDeque<String>>>,
}

impl ProviderSecretResolver for MapSecretResolver {
    fn resolve_secret_value(&self, secret_ref: &str) -> DomainResult<String> {
        self.secrets
            .get(secret_ref)
            .cloned()
            .ok_or_else(|| DomainError::new(format!("secret not found: {secret_ref}")))
    }
}

impl ProviderSecretResolver for RotatingSecretResolver {
    fn resolve_secret_value(&self, secret_ref: &str) -> DomainResult<String> {
        let mut secrets = self.secrets.lock().expect("secrets");
        let values = secrets
            .get_mut(secret_ref)
            .ok_or_else(|| DomainError::new(format!("secret not found: {secret_ref}")))?;
        values
            .pop_front()
            .ok_or_else(|| DomainError::new(format!("secret exhausted: {secret_ref}")))
    }
}

#[derive(Debug)]
struct AccountProviderAdapterResolver;

impl ProviderAdapterRouteResolver for AccountProviderAdapterResolver {
    fn resolve_adapter_target(&self, invocation: &Invocation) -> Option<InvocationAdapterTarget> {
        let account = invocation.account.as_ref()?;
        Some(InvocationAdapterTarget {
            provider_code: account.provider_code.clone(),
            endpoint_key: format!("{}.text2video", account.provider_code),
            base_url: format!("https://adapter.example/{}", account.provider_code),
            path_template: "/providers/{provider_code}{standard_path}".to_owned(),
            standard_path: "/v1/videos/text2video".to_owned(),
            gateway_token: Some(format!("adapter-token-{}", account.provider_code)),
            shape: InvocationShape::Json,
            adapter_invocation_shape: AdapterInvocationShape::SyncJson,
        })
    }
}

impl FakeDispatcher {
    fn new(outcomes: Vec<Result<InvocationDispatchResponse, InvocationDispatchError>>) -> Self {
        Self {
            outcomes: Arc::new(Mutex::new(outcomes)),
            providers: Arc::new(Mutex::new(Vec::new())),
            provider_requests: Arc::new(Mutex::new(Vec::new())),
        }
    }

    fn providers(&self) -> Vec<String> {
        self.providers.lock().expect("providers").clone()
    }

    fn provider_requests(&self) -> Vec<Option<InvocationProviderRequest>> {
        self.provider_requests
            .lock()
            .expect("provider requests")
            .clone()
    }
}

impl InvocationDispatcher for FakeDispatcher {
    fn dispatch<'a>(
        &'a self,
        invocation: &'a Invocation,
        account: &'a InvocationAccount,
    ) -> InvocationDispatcherFuture<'a> {
        Box::pin(async move {
            let _ = invocation;
            self.providers
                .lock()
                .expect("providers")
                .push(account.provider_code.clone());
            self.provider_requests
                .lock()
                .expect("provider requests")
                .push(invocation.dispatch.provider_request.clone());
            let mut outcomes = self.outcomes.lock().expect("outcomes");
            if outcomes.is_empty() {
                return Err(InvocationDispatchError::new(
                    "fake_exhausted",
                    "fake dispatcher has no outcome",
                    None,
                    false,
                ));
            }
            outcomes.remove(0)
        })
    }
}

fn ok(
    status_code: u16,
    body: Value,
) -> Result<InvocationDispatchResponse, InvocationDispatchError> {
    Ok(InvocationDispatchResponse::json(status_code, body))
}

fn dispatch_err(
    code: &str,
    retryable: bool,
) -> Result<InvocationDispatchResponse, InvocationDispatchError> {
    Err(InvocationDispatchError::new(
        code,
        format!("{code} happened"),
        None,
        retryable,
    ))
}

#[tokio::test]
async fn dispatches_direct_http_route() {
    let dispatcher = FakeDispatcher::new(vec![ok(200, json!({"id": "ok"}))]);
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::StatelessFailover,
        vec![candidate("openrouter", 3001)],
    );

    DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .before(&mut invocation)
        .await
        .expect("dispatch");

    assert_eq!(vec!["openrouter"], dispatcher.providers());
    assert_eq!(
        Some(200),
        invocation
            .dispatch
            .response
            .as_ref()
            .map(|response| response.status_code)
    );
    assert_eq!(
        DispatchMode::DirectHttpPassthrough,
        invocation.dispatch.mode
    );
    assert_eq!(1, invocation.routing.attempted_routes.len());
    assert!(invocation.routing.attempted_routes[0].success);
}

#[tokio::test]
async fn dispatches_internal_adapter_route() {
    let dispatcher = FakeDispatcher::new(vec![ok(200, json!({"task_id": "vid_1"}))]);
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::StatelessFailover,
        vec![candidate("kling", 4001)],
    );
    invocation.dispatch.mode = DispatchMode::InternalProviderAdapter;
    invocation.dispatch.adapter_target = Some(adapter_target());

    DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .before(&mut invocation)
        .await
        .expect("dispatch");

    assert_eq!(vec!["kling"], dispatcher.providers());
    assert_eq!(
        DispatchMode::InternalProviderAdapter,
        invocation.dispatch.mode
    );
    assert_eq!(
        Some("vid_1"),
        invocation
            .dispatch
            .response
            .as_ref()
            .and_then(|response| response.body.as_ref())
            .and_then(|body| body.get("task_id"))
            .and_then(Value::as_str)
    );
}

#[tokio::test]
async fn synthetic_local_response_does_not_call_dispatcher() {
    let dispatcher = FakeDispatcher::new(vec![ok(200, json!({"unexpected": true}))]);
    let mut invocation =
        invocation_with_plan(AiRouteStrategy::PrimaryChannel, vec![candidate("local", 1)]);
    invocation.dispatch = InvocationDispatch {
        mode: DispatchMode::SyntheticLocalResponse,
        invocation_shape: InvocationShape::Json,
        adapter_target: None,
        resolved_secret: None,
        provider_request: None,
        response: Some(InvocationDispatchResponse::json(
            200,
            json!({"local": true}),
        )),
    };

    DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .before(&mut invocation)
        .await
        .expect("dispatch");

    assert!(dispatcher.providers().is_empty());
    assert_eq!(
        Some(true),
        invocation
            .dispatch
            .response
            .as_ref()
            .and_then(|response| response.body.as_ref())
            .and_then(|body| body.get("local"))
            .and_then(Value::as_bool)
    );
}

#[tokio::test]
async fn noop_free_response_does_not_call_dispatcher() {
    let dispatcher = FakeDispatcher::new(vec![ok(200, json!({"unexpected": true}))]);
    let mut invocation =
        invocation_with_plan(AiRouteStrategy::PrimaryChannel, vec![candidate("free", 1)]);
    invocation.dispatch.mode = DispatchMode::NoopFree;

    DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .before(&mut invocation)
        .await
        .expect("dispatch");

    assert!(dispatcher.providers().is_empty());
    assert_eq!(
        Some(204),
        invocation.dispatch.response.as_ref().map(|r| r.status_code)
    );
}

#[tokio::test]
async fn retries_failover_candidate_after_retryable_status() {
    let dispatcher = FakeDispatcher::new(vec![
        ok(503, json!({"error": "retry later"})),
        ok(200, json!({"id": "fallback-ok"})),
    ]);
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::StatelessFailover,
        vec![candidate("primary", 3001), candidate("fallback", 3002)],
    );

    DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .before(&mut invocation)
        .await
        .expect("dispatch");

    assert_eq!(vec!["primary", "fallback"], dispatcher.providers());
    assert_eq!(2, invocation.routing.attempted_routes.len());
    assert!(!invocation.routing.attempted_routes[0].success);
    assert!(invocation.routing.attempted_routes[0].retryable);
    assert!(invocation.routing.attempted_routes[1].success);
    assert_eq!(
        Some("fallback-ok"),
        invocation
            .dispatch
            .response
            .as_ref()
            .and_then(|response| response.body.as_ref())
            .and_then(|body| body.get("id"))
            .and_then(Value::as_str)
    );
}

#[tokio::test]
async fn returns_non_retryable_provider_status_as_final_response() {
    let dispatcher = FakeDispatcher::new(vec![ok(
        400,
        json!({"error": {"message": "bad provider request"}}),
    )]);
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::StatelessFailover,
        vec![candidate("primary", 3001), candidate("fallback", 3002)],
    );

    DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .before(&mut invocation)
        .await
        .expect("dispatch");

    assert_eq!(vec!["primary"], dispatcher.providers());
    assert_eq!(1, invocation.routing.attempted_routes.len());
    assert!(!invocation.routing.attempted_routes[0].success);
    assert!(!invocation.routing.attempted_routes[0].retryable);
    assert_eq!(
        Some(400),
        invocation
            .dispatch
            .response
            .as_ref()
            .map(|response| response.status_code)
    );
    assert_eq!(
        Some("bad provider request"),
        invocation
            .dispatch
            .response
            .as_ref()
            .and_then(|response| response.body.as_ref())
            .and_then(|body| body.pointer("/error/message"))
            .and_then(Value::as_str)
    );
}

#[tokio::test]
async fn returns_last_retryable_provider_status_when_failover_is_exhausted() {
    let dispatcher = FakeDispatcher::new(vec![
        ok(503, json!({"error": {"message": "primary unavailable"}})),
        ok(503, json!({"error": {"message": "fallback unavailable"}})),
    ]);
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::StatelessFailover,
        vec![candidate("primary", 3001), candidate("fallback", 3002)],
    );

    DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .before(&mut invocation)
        .await
        .expect("dispatch");

    assert_eq!(vec!["primary", "fallback"], dispatcher.providers());
    assert_eq!(2, invocation.routing.attempted_routes.len());
    assert_eq!(
        Some(503),
        invocation
            .dispatch
            .response
            .as_ref()
            .map(|response| response.status_code)
    );
    assert_eq!(
        Some("fallback unavailable"),
        invocation
            .dispatch
            .response
            .as_ref()
            .and_then(|response| response.body.as_ref())
            .and_then(|body| body.pointer("/error/message"))
            .and_then(Value::as_str)
    );
}

#[tokio::test]
async fn failover_rebuilds_provider_request_for_selected_candidate() {
    let dispatcher = FakeDispatcher::new(vec![
        ok(503, json!({"error": "retry later"})),
        ok(200, json!({"id": "fallback-ok"})),
    ]);
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::StatelessFailover,
        vec![candidate("primary", 3001), candidate("fallback", 3002)],
    );

    DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .before(&mut invocation)
        .await
        .expect("dispatch");

    let provider_requests = dispatcher.provider_requests();
    assert_eq!(2, provider_requests.len());
    assert_eq!(
        Some("https://provider.example/primary/v1/chat/completions"),
        provider_requests[0]
            .as_ref()
            .and_then(|request| request.url.as_deref())
    );
    assert_eq!(
        Some("https://provider.example/fallback/v1/chat/completions"),
        provider_requests[1]
            .as_ref()
            .and_then(|request| request.url.as_deref())
    );
}

#[tokio::test]
async fn failover_updates_invocation_resource_for_selected_candidate() {
    let dispatcher = FakeDispatcher::new(vec![
        ok(503, json!({"error": "retry later"})),
        ok(200, json!({"id": "fallback-ok"})),
    ]);
    let mut fallback = candidate("fallback", 3002);
    fallback.catalog_key = Some("openai/fallback-model".to_owned());
    fallback.provider_model = Some("fallback-provider-model".to_owned());
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::StatelessFailover,
        vec![candidate("primary", 3001), fallback],
    );

    DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .before(&mut invocation)
        .await
        .expect("dispatch");

    assert_eq!(
        Some("openai/fallback-model"),
        invocation.resource.requested_model_catalog_key.as_deref()
    );
    assert_eq!(
        Some("fallback-provider-model"),
        invocation.resource.provider_native_model.as_deref()
    );
}

#[tokio::test]
async fn failover_rewrites_query_model_for_selected_candidate() {
    let dispatcher = FakeDispatcher::new(vec![
        ok(503, json!({"error": "retry later"})),
        ok(200, json!({"id": "fallback-ok"})),
    ]);
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::StatelessFailover,
        vec![candidate("primary", 3001), candidate("fallback", 3002)],
    );
    invocation.request = InvocationRequest::new(Method::GET, "/v1/models")
        .with_request_id("req-dispatch-query")
        .with_query("model=gpt-4o-mini&page_size=10");

    DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .before(&mut invocation)
        .await
        .expect("dispatch");

    let provider_requests = dispatcher.provider_requests();
    assert_eq!(2, provider_requests.len());
    assert_eq!(
        Some("model=primary-model&page_size=10"),
        provider_requests[0]
            .as_ref()
            .and_then(|request| request.query.as_deref())
    );
    assert_eq!(
        Some("model=fallback-model&page_size=10"),
        provider_requests[1]
            .as_ref()
            .and_then(|request| request.query.as_deref())
    );
    assert_eq!(
        Some("https://provider.example/fallback/v1/models?model=fallback-model&page_size=10"),
        provider_requests[1]
            .as_ref()
            .and_then(|request| request.url.as_deref())
    );
}

#[tokio::test]
async fn failover_rebuilds_adapter_body_for_selected_candidate() {
    let dispatcher = FakeDispatcher::new(vec![
        ok(503, json!({"error": "retry later"})),
        ok(200, json!({"id": "fallback-ok"})),
    ]);
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::StatelessFailover,
        vec![candidate("primary", 3001), candidate("fallback", 3002)],
    );
    invocation.dispatch.mode = DispatchMode::InternalProviderAdapter;
    invocation.dispatch.adapter_target = Some(adapter_target());
    invocation.request = InvocationRequest::new(Method::POST, "/v1/videos/text2video")
        .with_request_id("req-dispatch-adapter")
        .with_body(InvocationBody::json(json!({"prompt": "make video"})));

    DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .before(&mut invocation)
        .await
        .expect("dispatch");

    let provider_requests = dispatcher.provider_requests();
    assert_eq!(2, provider_requests.len());
    let Some(InvocationProviderRequest {
        body: InvocationBody::Json(body),
        ..
    }) = provider_requests[1].as_ref()
    else {
        panic!("expected fallback adapter json request");
    };
    assert_eq!(
        Some("fallback"),
        body.pointer("/provider/providerCode")
            .and_then(Value::as_str)
    );
    assert_eq!(
        Some("fallback-model"),
        body.pointer("/provider/providerModel")
            .and_then(Value::as_str)
    );
    assert_eq!(
        Some("https://adapter.example/providers/kling/v1/videos/text2video"),
        provider_requests[1]
            .as_ref()
            .and_then(|request| request.url.as_deref())
    );
    assert_eq!(
        Some("Bearer adapter-token"),
        provider_requests[1]
            .as_ref()
            .and_then(|request| request.headers.get("authorization"))
            .and_then(|value| value.to_str().ok())
    );
    assert_eq!(
        Some("/v1/videos/text2video"),
        body.pointer("/invocation/standardPath")
            .and_then(Value::as_str)
    );
}

#[tokio::test]
async fn failover_refreshes_adapter_target_for_selected_candidate() {
    let dispatcher = FakeDispatcher::new(vec![
        ok(503, json!({"error": "retry later"})),
        ok(200, json!({"id": "fallback-ok"})),
    ]);
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::StatelessFailover,
        vec![candidate("primary", 3001), candidate("fallback", 3002)],
    );
    invocation.dispatch.mode = DispatchMode::InternalProviderAdapter;
    invocation.dispatch.adapter_target = Some(adapter_target());
    invocation.resource.surface =
        sdkwork_clawrouter_router_service::application::InvocationSurface::ProviderNative;
    invocation.request = InvocationRequest::new(Method::POST, "/v1/videos/text2video")
        .with_request_id("req-dispatch-adapter-refresh")
        .with_body(InvocationBody::json(json!({"prompt": "make video"})));

    DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .with_adapter_resolver(Arc::new(AccountProviderAdapterResolver))
        .before(&mut invocation)
        .await
        .expect("dispatch");

    let provider_requests = dispatcher.provider_requests();
    assert_eq!(2, provider_requests.len());
    assert_eq!(
        Some("https://adapter.example/primary/providers/primary/v1/videos/text2video"),
        provider_requests[0]
            .as_ref()
            .and_then(|request| request.url.as_deref())
    );
    assert_eq!(
        Some("https://adapter.example/fallback/providers/fallback/v1/videos/text2video"),
        provider_requests[1]
            .as_ref()
            .and_then(|request| request.url.as_deref())
    );
    assert_eq!(
        Some("Bearer adapter-token-fallback"),
        provider_requests[1]
            .as_ref()
            .and_then(|request| request.headers.get("authorization"))
            .and_then(|value| value.to_str().ok())
    );
    let Some(InvocationProviderRequest {
        body: InvocationBody::Json(body),
        ..
    }) = provider_requests[1].as_ref()
    else {
        panic!("expected fallback adapter json request");
    };
    assert_eq!(
        Some("fallback"),
        body.pointer("/provider/providerCode")
            .and_then(Value::as_str)
    );
    assert_eq!(
        Some("fallback.text2video"),
        body.pointer("/invocation/endpointKey")
            .and_then(Value::as_str)
    );
}

#[tokio::test]
async fn adapter_wrapper_retryable_status_fails_over_to_next_candidate() {
    let dispatcher = FakeDispatcher::new(vec![
        ok(
            200,
            json!({
                "statusCode": 503,
                "body": {"error": {"message": "adapter upstream unavailable"}}
            }),
        ),
        ok(
            200,
            json!({
                "statusCode": 202,
                "body": {"id": "fallback-task"}
            }),
        ),
    ]);
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::StatelessFailover,
        vec![candidate("primary", 3001), candidate("fallback", 3002)],
    );
    invocation.dispatch.mode = DispatchMode::InternalProviderAdapter;
    invocation.dispatch.adapter_target = Some(adapter_target());
    invocation.request = InvocationRequest::new(Method::POST, "/v1/videos/text2video")
        .with_request_id("req-adapter-wrapper-failover")
        .with_body(InvocationBody::json(json!({"prompt": "make video"})));

    DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .before(&mut invocation)
        .await
        .expect("dispatch");

    assert_eq!(vec!["primary", "fallback"], dispatcher.providers());
    assert_eq!(2, invocation.routing.attempted_routes.len());
    assert_eq!(
        Some(503),
        invocation.routing.attempted_routes[0].status_code
    );
    assert!(!invocation.routing.attempted_routes[0].success);
    assert!(invocation.routing.attempted_routes[0].retryable);
    assert_eq!(
        Some(202),
        invocation.routing.attempted_routes[1].status_code
    );
    assert!(invocation.routing.attempted_routes[1].success);
    assert_eq!(
        Some("fallback-task"),
        invocation
            .dispatch
            .response
            .as_ref()
            .and_then(|response| response.body.as_ref())
            .and_then(|body| body.pointer("/body/id"))
            .and_then(Value::as_str)
    );
}

fn adapter_target() -> InvocationAdapterTarget {
    InvocationAdapterTarget {
        provider_code: "kling".to_owned(),
        endpoint_key: "kling.text2video".to_owned(),
        base_url: "https://adapter.example".to_owned(),
        path_template: "/providers/{provider_code}{standard_path}".to_owned(),
        standard_path: "/v1/videos/text2video".to_owned(),
        gateway_token: Some("adapter-token".to_owned()),
        shape: InvocationShape::Json,
        adapter_invocation_shape: AdapterInvocationShape::SyncJson,
    }
}

#[test]
fn adapter_target_debug_redacts_gateway_token() {
    let mut dispatch = InvocationDispatch::pending();
    dispatch.mode = DispatchMode::InternalProviderAdapter;
    dispatch.adapter_target = Some(adapter_target());

    let debug = format!("{dispatch:?}");

    assert!(!debug.contains("adapter-token"));
    assert!(debug.contains("<redacted>"));
}

#[tokio::test]
async fn failover_resolves_candidate_secret_and_auth_per_attempt() {
    let dispatcher = FakeDispatcher::new(vec![
        ok(503, json!({"error": "retry later"})),
        ok(200, json!({"id": "fallback-ok"})),
    ]);
    let secret_resolver = Arc::new(MapSecretResolver {
        secrets: HashMap::from([
            (
                "vault://provider/primary".to_owned(),
                "sk-primary-provider".to_owned(),
            ),
            (
                "vault://provider/fallback".to_owned(),
                "sk-fallback-provider".to_owned(),
            ),
        ]),
    });
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::StatelessFailover,
        vec![
            with_secret_ref(candidate("primary", 3001)),
            with_secret_ref(candidate("fallback", 3002)),
        ],
    );

    DispatchExecutor::with_secret_resolver(Arc::new(dispatcher.clone()), secret_resolver)
        .before(&mut invocation)
        .await
        .expect("dispatch");

    let provider_requests = dispatcher.provider_requests();
    assert_eq!(2, provider_requests.len());
    assert_eq!(
        Some("Bearer sk-primary-provider"),
        provider_requests[0]
            .as_ref()
            .and_then(|request| request.headers.get("authorization"))
            .and_then(|value| value.to_str().ok())
    );
    assert_eq!(
        Some("Bearer sk-fallback-provider"),
        provider_requests[1]
            .as_ref()
            .and_then(|request| request.headers.get("authorization"))
            .and_then(|value| value.to_str().ok())
    );
    assert_eq!(
        Some("vault://provider/fallback"),
        invocation
            .dispatch
            .resolved_secret
            .as_ref()
            .map(|secret| secret.secret_ref.as_str())
    );
}

#[tokio::test]
async fn failover_skips_candidate_when_provider_request_preparation_fails() {
    let dispatcher = FakeDispatcher::new(vec![ok(200, json!({"id": "fallback-ok"}))]);
    let secret_resolver = Arc::new(MapSecretResolver {
        secrets: HashMap::from([(
            "vault://provider/fallback".to_owned(),
            "sk-fallback-provider".to_owned(),
        )]),
    });
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::StatelessFailover,
        vec![
            with_secret_ref(candidate("primary", 3001)),
            with_secret_ref(candidate("fallback", 3002)),
        ],
    );

    DispatchExecutor::with_secret_resolver(Arc::new(dispatcher.clone()), secret_resolver)
        .before(&mut invocation)
        .await
        .expect("dispatch");

    assert_eq!(vec!["fallback"], dispatcher.providers());
    assert_eq!(2, invocation.routing.attempted_routes.len());
    assert_eq!(
        "primary",
        invocation.routing.attempted_routes[0].provider_code
    );
    assert!(!invocation.routing.attempted_routes[0].success);
    assert_eq!(
        Some("provider_request_prepare_failed"),
        invocation.routing.attempted_routes[0].error_code.as_deref()
    );
    assert_eq!(
        "fallback",
        invocation.routing.attempted_routes[1].provider_code
    );
    assert!(invocation.routing.attempted_routes[1].success);
    assert_eq!(
        Some("Bearer sk-fallback-provider"),
        dispatcher
            .provider_requests()
            .first()
            .and_then(|request| request.as_ref())
            .and_then(|request| request.headers.get("authorization"))
            .and_then(|value| value.to_str().ok())
    );
}

#[tokio::test]
async fn dispatch_executor_preserves_pre_resolved_matching_secret_without_resolver() {
    let dispatcher = FakeDispatcher::new(vec![ok(200, json!({"id": "ok"}))]);
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::StatelessFailover,
        vec![with_secret_ref(candidate("primary", 3001))],
    );
    invocation.dispatch.resolved_secret = Some(ResolvedProviderSecret {
        secret_ref: "vault://provider/primary".to_owned(),
        value: "sk-pre-resolved-primary".to_owned(),
    });

    DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .before(&mut invocation)
        .await
        .expect("dispatch");

    let provider_requests = dispatcher.provider_requests();
    assert_eq!(1, provider_requests.len());
    assert_eq!(
        Some("Bearer sk-pre-resolved-primary"),
        provider_requests[0]
            .as_ref()
            .and_then(|request| request.headers.get("authorization"))
            .and_then(|value| value.to_str().ok())
    );
    assert_eq!(
        Some("vault://provider/primary"),
        invocation
            .dispatch
            .resolved_secret
            .as_ref()
            .map(|secret| secret.secret_ref.as_str())
    );
}

#[tokio::test]
async fn retries_same_candidate_before_failover_when_policy_allows() {
    let dispatcher = FakeDispatcher::new(vec![
        ok(503, json!({"error": "retry later"})),
        ok(200, json!({"id": "same-candidate-ok"})),
        ok(200, json!({"id": "fallback-must-not-run"})),
    ]);
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::StatelessFailover,
        vec![
            with_retry_attempts(candidate("primary", 3001), 2, vec![503]),
            candidate("fallback", 3002),
        ],
    );

    DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .before(&mut invocation)
        .await
        .expect("dispatch");

    assert_eq!(vec!["primary", "primary"], dispatcher.providers());
    assert_eq!(2, invocation.routing.attempted_routes.len());
    assert!(!invocation.routing.attempted_routes[0].success);
    assert!(invocation.routing.attempted_routes[0].retryable);
    assert!(invocation.routing.attempted_routes[1].success);
    assert_eq!(0, invocation.routing.attempted_routes[0].candidate_index);
    assert_eq!(0, invocation.routing.attempted_routes[1].candidate_index);
    assert_eq!(
        Some("same-candidate-ok"),
        invocation
            .dispatch
            .response
            .as_ref()
            .and_then(|response| response.body.as_ref())
            .and_then(|body| body.get("id"))
            .and_then(Value::as_str)
    );
}

#[tokio::test]
async fn retries_rebuild_provider_request_and_secret_for_each_attempt() {
    let dispatcher = FakeDispatcher::new(vec![
        ok(503, json!({"error": "retry later"})),
        ok(200, json!({"id": "same-candidate-ok"})),
    ]);
    let secret_resolver = Arc::new(RotatingSecretResolver {
        secrets: Mutex::new(HashMap::from([(
            "vault://provider/primary".to_owned(),
            VecDeque::from([
                "sk-primary-attempt-1".to_owned(),
                "sk-primary-attempt-2".to_owned(),
            ]),
        )])),
    });
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::StatelessFailover,
        vec![with_retry_attempts(
            with_secret_ref(candidate("primary", 3001)),
            2,
            vec![503],
        )],
    );

    DispatchExecutor::with_secret_resolver(Arc::new(dispatcher.clone()), secret_resolver)
        .before(&mut invocation)
        .await
        .expect("dispatch");

    let provider_requests = dispatcher.provider_requests();
    assert_eq!(2, provider_requests.len());
    assert_eq!(
        Some("Bearer sk-primary-attempt-1"),
        provider_requests[0]
            .as_ref()
            .and_then(|request| request.headers.get("authorization"))
            .and_then(|value| value.to_str().ok())
    );
    assert_eq!(
        Some("Bearer sk-primary-attempt-2"),
        provider_requests[1]
            .as_ref()
            .and_then(|request| request.headers.get("authorization"))
            .and_then(|value| value.to_str().ok())
    );
}

#[tokio::test]
async fn failover_runs_after_same_candidate_retries_are_exhausted() {
    let dispatcher = FakeDispatcher::new(vec![
        ok(503, json!({"error": "retry later"})),
        ok(503, json!({"error": "still unavailable"})),
        ok(200, json!({"id": "fallback-ok"})),
    ]);
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::StatelessFailover,
        vec![
            with_retry_attempts(candidate("primary", 3001), 2, vec![503]),
            candidate("fallback", 3002),
        ],
    );

    DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .before(&mut invocation)
        .await
        .expect("dispatch");

    assert_eq!(
        vec!["primary", "primary", "fallback"],
        dispatcher.providers()
    );
    assert_eq!(3, invocation.routing.attempted_routes.len());
    assert_eq!(0, invocation.routing.attempted_routes[0].candidate_index);
    assert_eq!(0, invocation.routing.attempted_routes[1].candidate_index);
    assert_eq!(1, invocation.routing.attempted_routes[2].candidate_index);
    assert!(invocation.routing.attempted_routes[2].success);
}

#[tokio::test]
async fn final_fallback_transport_error_does_not_return_stale_primary_response() {
    let dispatcher = FakeDispatcher::new(vec![
        ok(503, json!({"error": "primary unavailable"})),
        dispatch_err("fallback_transport_failed", false),
    ]);
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::StatelessFailover,
        vec![
            with_retry_attempts(candidate("primary", 3001), 1, vec![503]),
            with_retry_attempts(candidate("fallback", 3002), 1, vec![]),
        ],
    );

    let error = DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .before(&mut invocation)
        .await
        .expect_err("latest fallback transport error must win over stale primary response");

    assert_eq!(vec!["primary", "fallback"], dispatcher.providers());
    assert_eq!(InvocationErrorKind::Dispatch, error.kind);
    assert!(error.message.contains("fallback_transport_failed"));
    assert!(invocation.dispatch.response.is_none());
    assert_eq!(2, invocation.routing.attempted_routes.len());
    assert_eq!(1, invocation.routing.route_plan.unwrap().selected_index);
}

#[tokio::test]
async fn retries_same_candidate_after_retryable_dispatch_error() {
    let dispatcher = FakeDispatcher::new(vec![
        dispatch_err("provider_http_timeout", true),
        ok(200, json!({"id": "same-candidate-ok"})),
    ]);
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::StatelessFailover,
        vec![with_retry_attempts(
            candidate("primary", 3001),
            2,
            vec![503],
        )],
    );

    DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .before(&mut invocation)
        .await
        .expect("dispatch");

    assert_eq!(vec!["primary", "primary"], dispatcher.providers());
    assert_eq!(2, invocation.routing.attempted_routes.len());
    assert_eq!(
        Some("provider_http_timeout"),
        invocation.routing.attempted_routes[0].error_code.as_deref()
    );
    assert!(invocation.routing.attempted_routes[0].retryable);
    assert!(invocation.routing.attempted_routes[1].success);
}

#[tokio::test]
async fn fail_closed_stops_after_first_retryable_failure() {
    let dispatcher = FakeDispatcher::new(vec![
        ok(503, json!({"error": "retry later"})),
        ok(200, json!({"id": "must-not-run"})),
    ]);
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::CreateThenSticky,
        vec![candidate("primary", 3001), candidate("fallback", 3002)],
    );

    DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .before(&mut invocation)
        .await
        .expect("dispatch");

    assert_eq!(vec!["primary"], dispatcher.providers());
    assert_eq!(1, invocation.routing.attempted_routes.len());
    assert_eq!(
        Some(503),
        invocation
            .dispatch
            .response
            .as_ref()
            .map(|response| response.status_code)
    );
}

#[tokio::test]
async fn non_idempotent_sticky_create_ignores_explicit_retry_budget_without_key() {
    let dispatcher = FakeDispatcher::new(vec![
        ok(503, json!({"error": "retry later"})),
        ok(200, json!({"id": "duplicate-must-not-run"})),
    ]);
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::CreateThenSticky,
        vec![with_retry_attempts(
            candidate("primary", 3001),
            3,
            vec![503],
        )],
    );

    DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .before(&mut invocation)
        .await
        .expect("provider status remains the final response");

    assert_eq!(vec!["primary"], dispatcher.providers());
    assert_eq!(1, invocation.routing.attempted_routes.len());
    assert_eq!(
        Some(503),
        invocation
            .dispatch
            .response
            .as_ref()
            .map(|response| response.status_code)
    );
}

#[tokio::test]
async fn sticky_create_with_idempotency_key_can_use_explicit_retry_budget() {
    let dispatcher = FakeDispatcher::new(vec![
        ok(503, json!({"error": "retry later"})),
        ok(200, json!({"id": "created-on-retry"})),
    ]);
    let mut invocation = invocation_with_plan(
        AiRouteStrategy::CreateThenSticky,
        vec![with_retry_attempts(
            candidate("primary", 3001),
            2,
            vec![503],
        )],
    );
    invocation.request.idempotency_key = Some("create-idempotency-key".to_owned());

    DispatchExecutor::new(Arc::new(dispatcher.clone()))
        .before(&mut invocation)
        .await
        .expect("idempotency-protected retry");

    assert_eq!(vec!["primary", "primary"], dispatcher.providers());
    assert_eq!(2, invocation.routing.attempted_routes.len());
    assert!(invocation.routing.attempted_routes[1].success);
}
