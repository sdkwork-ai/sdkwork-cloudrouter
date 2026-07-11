use axum::http::{header, HeaderName, HeaderValue, Method};
use sdkwork_claw_provider_adapter_contract::AdapterInvocationShape;
use sdkwork_clawrouter_router_service::application::{
    AuthenticatedApiKeyContext, Invocation, InvocationAccount, InvocationAdapterTarget,
    InvocationBilling, InvocationBody, InvocationInterceptor, InvocationRequest,
    InvocationResource, InvocationShape, InvocationSubject, RequestTransformInterceptor,
    SecretResolutionInterceptor,
};
use sdkwork_clawrouter_router_service::domain::{
    AiRouteModelRequirement, BillingMeter, DomainError, DomainResult, ProviderAuthHeader,
    ProviderAuthProfile, RoutingCapability,
};
use sdkwork_clawrouter_router_service::ports::ProviderSecretResolver;
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Debug)]
struct MapSecretResolver {
    secrets: HashMap<String, String>,
}

impl ProviderSecretResolver for MapSecretResolver {
    fn resolve_secret_value(&self, secret_ref: &str) -> DomainResult<String> {
        self.secrets
            .get(secret_ref)
            .cloned()
            .ok_or_else(|| DomainError::new(format!("secret not found: {secret_ref}")))
    }
}

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

fn invocation_with_auth(auth_profile: ProviderAuthProfile) -> Invocation {
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/chat/completions")
            .with_request_id("req-transform")
            .with_body(InvocationBody::json(json!({
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": "ping"}]
            }))),
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
    invocation.resource.requested_model_catalog_key = Some("openai/gpt-4o-mini".to_owned());
    invocation.resource.provider_native_model = Some("gpt-4o-mini-provider".to_owned());
    invocation.account = Some(InvocationAccount {
        provider_code: "openrouter".to_owned(),
        channel_id: 3001,
        region_code: "global".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some("https://provider.example/root/".to_owned()),
        secret_ref: Some("vault://provider/openrouter".to_owned()),
        auth_profile,
        timeout_ms: Some(30_000),
        retry_policy: None,
        provider_model: Some("gpt-4o-mini-provider".to_owned()),
    });
    invocation
}

fn resolver() -> Arc<dyn ProviderSecretResolver + Send + Sync> {
    Arc::new(MapSecretResolver {
        secrets: HashMap::from([
            (
                "vault://provider/openrouter".to_owned(),
                "sk-provider-secret".to_owned(),
            ),
            (
                "vault://provider/openrouter-query".to_owned(),
                "sk-provider+query/value".to_owned(),
            ),
        ]),
    })
}

#[tokio::test]
async fn applies_bearer_auth_header() {
    let mut invocation = invocation_with_auth(ProviderAuthProfile::bearer());

    SecretResolutionInterceptor::new(resolver())
        .before(&mut invocation)
        .await
        .expect("secret");
    RequestTransformInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("transform");

    let request = invocation.dispatch.provider_request.expect("request");
    assert_eq!(
        Some("Bearer sk-provider-secret"),
        request
            .headers
            .get("authorization")
            .and_then(|value| value.to_str().ok())
    );
}

#[tokio::test]
async fn applies_header_auth_and_default_headers() {
    let mut profile = ProviderAuthProfile::header("x-api-key");
    profile.default_headers.push(ProviderAuthHeader {
        name: "x-provider-mode".to_owned(),
        value: "compat".to_owned(),
    });
    let mut invocation = invocation_with_auth(profile);

    SecretResolutionInterceptor::new(resolver())
        .before(&mut invocation)
        .await
        .expect("secret");
    RequestTransformInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("transform");

    let request = invocation.dispatch.provider_request.expect("request");
    assert_eq!(
        Some("sk-provider-secret"),
        request
            .headers
            .get("x-api-key")
            .and_then(|v| v.to_str().ok())
    );
    assert_eq!(
        Some("compat"),
        request
            .headers
            .get("x-provider-mode")
            .and_then(|v| v.to_str().ok())
    );
}

#[tokio::test]
async fn strips_inbound_gateway_credentials_before_provider_auth() {
    let mut invocation = invocation_with_auth(ProviderAuthProfile::header("x-api-key"));
    invocation.request.headers.insert(
        header::AUTHORIZATION,
        HeaderValue::from_static("Bearer sk-client-gateway"),
    );
    invocation.request.headers.insert(
        HeaderName::from_static("x-api-key"),
        HeaderValue::from_static("sk-client-gateway"),
    );
    invocation.request.headers.insert(
        HeaderName::from_static("x-client-feature"),
        HeaderValue::from_static("keep-me"),
    );

    SecretResolutionInterceptor::new(resolver())
        .before(&mut invocation)
        .await
        .expect("secret");
    RequestTransformInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("transform");

    let request = invocation.dispatch.provider_request.expect("request");
    assert!(request.headers.get("authorization").is_none());
    assert_eq!(
        Some("sk-provider-secret"),
        request
            .headers
            .get("x-api-key")
            .and_then(|v| v.to_str().ok())
    );
    assert_eq!(
        Some("keep-me"),
        request
            .headers
            .get("x-client-feature")
            .and_then(|v| v.to_str().ok())
    );
}

#[tokio::test]
async fn applies_query_auth() {
    let mut invocation = invocation_with_auth(ProviderAuthProfile::query("api_key"));

    SecretResolutionInterceptor::new(resolver())
        .before(&mut invocation)
        .await
        .expect("secret");
    RequestTransformInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("transform");

    let request = invocation.dispatch.provider_request.expect("request");
    assert_eq!(Some("api_key=sk-provider-secret"), request.query.as_deref());
}

#[tokio::test]
async fn strips_inbound_query_credentials_before_provider_query_auth() {
    let mut invocation = invocation_with_auth(ProviderAuthProfile::query("api_key"));
    invocation.request = InvocationRequest::new(Method::GET, "/v1/models")
        .with_request_id("req-query-auth")
        .with_query("api_key=sk-client-gateway&model=gpt-4o-mini&page_size=10&key=sk-google-client");

    SecretResolutionInterceptor::new(resolver())
        .before(&mut invocation)
        .await
        .expect("secret");
    RequestTransformInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("transform");

    let request = invocation.dispatch.provider_request.expect("request");
    assert_eq!(
        Some("model=gpt-4o-mini-provider&page_size=10&api_key=sk-provider-secret"),
        request.query.as_deref()
    );
}

#[tokio::test]
async fn strips_encoded_inbound_query_credentials_before_provider_query_auth() {
    let mut invocation = invocation_with_auth(ProviderAuthProfile::query("api_key"));
    invocation.request = InvocationRequest::new(Method::GET, "/v1/models")
        .with_request_id("req-query-auth-encoded-credential")
        .with_query("%6Bey=sk-google-client&model=gpt-4o-mini&page_size=10");

    SecretResolutionInterceptor::new(resolver())
        .before(&mut invocation)
        .await
        .expect("secret");
    RequestTransformInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("transform");

    let request = invocation.dispatch.provider_request.expect("request");
    assert_eq!(
        Some("model=gpt-4o-mini-provider&page_size=10&api_key=sk-provider-secret"),
        request.query.as_deref()
    );
}

#[tokio::test]
async fn provider_request_debug_redacts_sensitive_values() {
    let mut invocation = invocation_with_auth(ProviderAuthProfile::query("api_key"));

    SecretResolutionInterceptor::new(resolver())
        .before(&mut invocation)
        .await
        .expect("secret");
    RequestTransformInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("transform");

    let debug = format!("{:?}", invocation.dispatch);
    assert!(!debug.contains("sk-provider-secret"));
    assert!(!debug.contains("api_key=sk-provider-secret"));
    assert!(debug.contains("<redacted>"));
}

#[tokio::test]
async fn rewrites_openai_json_body_model_to_provider_model() {
    let mut invocation = invocation_with_auth(ProviderAuthProfile::bearer());

    SecretResolutionInterceptor::new(resolver())
        .before(&mut invocation)
        .await
        .expect("secret");
    RequestTransformInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("transform");

    let request = invocation.dispatch.provider_request.expect("request");
    let InvocationBody::Json(body) = request.body else {
        panic!("expected json body");
    };
    assert_eq!(
        Some("gpt-4o-mini-provider"),
        body.get("model").and_then(|v| v.as_str())
    );
}

#[tokio::test]
async fn rewrites_query_model_to_provider_model() {
    let mut invocation = invocation_with_auth(ProviderAuthProfile::bearer());
    invocation.request = InvocationRequest::new(Method::GET, "/v1/models")
        .with_request_id("req-query")
        .with_query("model=gpt-4o-mini&page_size=10");

    SecretResolutionInterceptor::new(resolver())
        .before(&mut invocation)
        .await
        .expect("secret");
    RequestTransformInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("transform");

    let request = invocation.dispatch.provider_request.expect("request");
    assert_eq!(
        Some("model=gpt-4o-mini-provider&page_size=10"),
        request.query.as_deref()
    );
}

#[tokio::test]
async fn percent_encodes_rewritten_query_model() {
    let mut invocation = invocation_with_auth(ProviderAuthProfile::bearer());
    invocation.request = InvocationRequest::new(Method::GET, "/v1/responses/input_tokens")
        .with_request_id("req-query-encoded-model")
        .with_query("model=gpt-4o-mini&include=usage");
    invocation.account.as_mut().unwrap().provider_model =
        Some("openrouter/gpt-4o-mini+latest".to_owned());

    SecretResolutionInterceptor::new(resolver())
        .before(&mut invocation)
        .await
        .expect("secret");
    RequestTransformInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("transform");

    let request = invocation.dispatch.provider_request.expect("request");
    assert_eq!(
        Some("model=openrouter%2Fgpt-4o-mini%2Blatest&include=usage"),
        request.query.as_deref()
    );
    assert_eq!(
        Some(
            "https://provider.example/root/v1/responses/input_tokens?model=openrouter%2Fgpt-4o-mini%2Blatest&include=usage"
        ),
        request.url.as_deref()
    );
}

#[tokio::test]
async fn percent_encodes_query_auth_name_and_value_after_sanitizing_inbound_credentials() {
    let mut invocation = invocation_with_auth(ProviderAuthProfile::query("api+key"));
    invocation.request = InvocationRequest::new(Method::GET, "/v1/files")
        .with_request_id("req-query-auth-encoded")
        .with_query("token=sk-client-gateway&purpose=assistants");
    invocation.account.as_mut().unwrap().secret_ref =
        Some("vault://provider/openrouter-query".to_owned());

    SecretResolutionInterceptor::new(resolver())
        .before(&mut invocation)
        .await
        .expect("secret");
    RequestTransformInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("transform");

    let request = invocation.dispatch.provider_request.expect("request");
    assert_eq!(
        Some("purpose=assistants&api%2Bkey=sk-provider%2Bquery%2Fvalue"),
        request.query.as_deref()
    );
    assert_eq!(
        Some(
            "https://provider.example/root/v1/files?purpose=assistants&api%2Bkey=sk-provider%2Bquery%2Fvalue"
        ),
        request.url.as_deref()
    );
}

#[tokio::test]
async fn builds_adapter_request_as_standard_json_body() {
    let mut invocation = invocation_with_auth(ProviderAuthProfile::bearer());
    invocation.dispatch.mode =
        sdkwork_clawrouter_router_service::application::DispatchMode::InternalProviderAdapter;
    invocation.dispatch.adapter_target = Some(InvocationAdapterTarget {
        provider_code: "openrouter".to_owned(),
        endpoint_key: "openai.chat_completions".to_owned(),
        base_url: "https://adapter.example".to_owned(),
        path_template: "/providers/{provider_code}{standard_path}".to_owned(),
        standard_path: "/v1/chat/completions".to_owned(),
        gateway_token: Some("adapter-token".to_owned()),
        shape: InvocationShape::Json,
        adapter_invocation_shape: AdapterInvocationShape::SyncJson,
    });

    SecretResolutionInterceptor::new(resolver())
        .before(&mut invocation)
        .await
        .expect("secret");
    RequestTransformInterceptor::default()
        .before(&mut invocation)
        .await
        .expect("transform");

    let request = invocation.dispatch.provider_request.expect("request");
    assert_eq!(
        Some("https://adapter.example/providers/openrouter/v1/chat/completions"),
        request.url.as_deref()
    );
    assert_eq!(
        Some("Bearer adapter-token"),
        request
            .headers
            .get("authorization")
            .and_then(|v| v.to_str().ok())
    );
    let InvocationBody::Json(body) = request.body else {
        panic!("expected adapter body");
    };
    assert_eq!(
        Some("openai.chat_completions"),
        body.pointer("/invocation/endpointKey")
            .and_then(|v| v.as_str())
    );
    assert_eq!(
        Some("openrouter"),
        body.pointer("/provider/providerCode")
            .and_then(|v| v.as_str())
    );
    assert_eq!(
        Some("sk-provider-secret"),
        body.pointer("/secret/value/auth/value")
            .and_then(|v| v.as_str())
    );
}
