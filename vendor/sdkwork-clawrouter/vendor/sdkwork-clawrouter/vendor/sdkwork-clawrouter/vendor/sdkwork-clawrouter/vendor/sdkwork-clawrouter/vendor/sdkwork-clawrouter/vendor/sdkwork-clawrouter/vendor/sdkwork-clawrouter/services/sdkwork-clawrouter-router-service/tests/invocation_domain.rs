use axum::http::Method;
use sdkwork_clawrouter_router_service::application::{
    AuthenticatedApiKeyContext, Invocation, InvocationBilling, InvocationBody, InvocationRequest,
    InvocationResource, InvocationSubject,
};
use sdkwork_clawrouter_router_service::domain::{
    AiRouteFailureStrategy, AiRouteModelRequirement, AiRouteStrategy, BillingMeter,
    RoutingCapability,
};
use serde_json::json;

fn test_subject() -> InvocationSubject {
    InvocationSubject::from_api_key_context(AuthenticatedApiKeyContext {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        api_key_id: 100,
        api_key_name_snapshot: "Test key".to_owned(),
        group_id: 200,
        group_code: "standard-group".to_owned(),
        pricing_plan_code: "standard".to_owned(),
    })
}

#[test]
fn constructs_token_model_invocation() {
    let request = InvocationRequest::new(Method::POST, "/v1/chat/completions")
        .with_request_id("req-chat")
        .with_body(InvocationBody::json(json!({
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": "ping"}]
        })));
    let resource = InvocationResource::model_call(
        "openai/model/chat_completions",
        "openai.chat_completions",
        RoutingCapability::Chat,
        AiRouteModelRequirement::Required,
    )
    .with_requested_model("gpt-4o-mini");
    let billing = InvocationBilling::composite(BillingMeter::LlmInputToken);

    let invocation = Invocation::new(request, test_subject(), resource, billing);

    assert_eq!("req-chat", invocation.request.request_id);
    assert_eq!("/v1/chat/completions", invocation.request.path);
    assert_eq!(
        Some("gpt-4o-mini"),
        invocation.resource.requested_model.as_deref()
    );
    assert_eq!(
        AiRouteStrategy::StatelessFailover,
        invocation.routing.strategy
    );
    assert_eq!(
        AiRouteFailureStrategy::Failover,
        invocation.routing.failure_strategy
    );
    assert!(invocation.billing.pricing_required);
    assert!(invocation.billing.settlement_required);
}

#[test]
fn constructs_api_request_invocation() {
    let request = InvocationRequest::new(Method::POST, "/v1/files").with_request_id("req-file");
    let resource = InvocationResource::api_resource(
        "openai/management/files",
        "openai.files",
        RoutingCapability::Network,
    )
    .with_sticky_create("file");
    let billing = InvocationBilling::api_request(BillingMeter::ApiRequest);

    let invocation = Invocation::new(request, test_subject(), resource, billing);

    assert_eq!(
        AiRouteStrategy::CreateThenSticky,
        invocation.routing.strategy
    );
    assert_eq!(
        AiRouteFailureStrategy::FailClosed,
        invocation.routing.failure_strategy
    );
    assert_eq!(
        Some("file"),
        invocation
            .routing
            .sticky
            .as_ref()
            .map(|sticky| sticky.object_type.as_str())
    );
    assert_eq!(Some(BillingMeter::ApiRequest), invocation.billing.meter);
}

#[test]
fn constructs_free_invocation_without_settlement() {
    let request = InvocationRequest::new(Method::GET, "/v1/models").with_request_id("req-models");
    let subject = InvocationSubject::anonymous_free(10, 20);
    let resource = InvocationResource::free_endpoint(
        "openai/management/models",
        "openai.models",
        RoutingCapability::Network,
    );
    let billing = InvocationBilling::free();

    let invocation = Invocation::new(request, subject, resource, billing);

    assert!(!invocation.billing.pricing_required);
    assert!(!invocation.billing.settlement_required);
    assert_eq!(AiRouteStrategy::PrimaryChannel, invocation.routing.strategy);
}

#[test]
fn constructs_lookup_sticky_resource_invocation() {
    let request = InvocationRequest::new(Method::GET, "/v1/files/file_123/content")
        .with_request_id("req-file-content");
    let resource = InvocationResource::api_resource(
        "openai/management/files",
        "openai.files",
        RoutingCapability::Network,
    )
    .with_sticky_lookup("file", "file_123");
    let billing = InvocationBilling::api_request(BillingMeter::ApiRequest);

    let invocation = Invocation::new(request, test_subject(), resource, billing);

    assert_eq!(AiRouteStrategy::LookupSticky, invocation.routing.strategy);
    assert_eq!(
        AiRouteFailureStrategy::FailClosed,
        invocation.routing.failure_strategy
    );
    let sticky = invocation.routing.sticky.expect("sticky routing");
    assert_eq!("file", sticky.object_type);
    assert_eq!(Some("file_123"), sticky.object_id.as_deref());
}
