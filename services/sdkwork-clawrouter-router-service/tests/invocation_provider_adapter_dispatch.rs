use std::sync::Arc;

use axum::http::Method;
use sdkwork_claw_provider_adapter_contract::AdapterInvocationShape;
use sdkwork_clawrouter_router_service::application::{
    AuthenticatedApiKeyContext, DispatchMode, Invocation, InvocationAdapterTarget,
    InvocationBilling, InvocationInterceptor, InvocationRequest, InvocationResource,
    InvocationShape, InvocationSubject, InvocationSurface, ProviderAdapterDispatchInterceptor,
    ResourceType,
};
use sdkwork_clawrouter_router_service::domain::{
    AiRouteModelRequirement, BillingMeter, RoutingCapability,
};
use sdkwork_clawrouter_router_service::ports::ProviderAdapterRouteResolver;

#[derive(Debug, Clone)]
struct FixedAdapterResolver {
    target: Option<InvocationAdapterTarget>,
}

impl ProviderAdapterRouteResolver for FixedAdapterResolver {
    fn resolve_adapter_target(&self, _invocation: &Invocation) -> Option<InvocationAdapterTarget> {
        self.target.clone()
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

fn provider_native_invocation() -> Invocation {
    let mut resource = InvocationResource::api_resource(
        "kling.text_to_video",
        "kling.text_to_video",
        RoutingCapability::Video,
    );
    resource.surface = InvocationSurface::ProviderNative;
    resource.supplier_code = Some("kling".to_owned());
    resource.endpoint_key = Some("kling.text_to_video".to_owned());
    resource.resource_type = ResourceType::ProviderNativeApi;
    resource.model_requirement = AiRouteModelRequirement::Optional;
    Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/videos/text2video")
            .with_request_id("req-provider-adapter"),
        subject(),
        resource,
        InvocationBilling::composite(BillingMeter::LlmInputToken),
    )
}

fn openai_invocation() -> Invocation {
    Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/chat/completions").with_request_id("req-openai"),
        subject(),
        InvocationResource::model_call(
            "openai/model/chat_completions",
            "openai.chat_completions",
            RoutingCapability::Chat,
            AiRouteModelRequirement::Required,
        )
        .with_requested_model("gpt-4o-mini"),
        InvocationBilling::composite(BillingMeter::LlmInputToken),
    )
}

#[tokio::test]
async fn provider_native_invocation_uses_resolved_internal_adapter_target() {
    let target = InvocationAdapterTarget {
        supplier_code: "kling".to_owned(),
        endpoint_key: "kling.text2video".to_owned(),
        base_url: "https://adapter.example".to_owned(),
        path_template: "/providers/{supplier_code}{standard_path}".to_owned(),
        standard_path: "/v1/videos/text2video".to_owned(),
        gateway_token: Some("adapter-token".to_owned()),
        shape: InvocationShape::Json,
        adapter_invocation_shape: AdapterInvocationShape::SyncJson,
    };
    let interceptor = ProviderAdapterDispatchInterceptor::new(Arc::new(FixedAdapterResolver {
        target: Some(target.clone()),
    }));
    let mut invocation = provider_native_invocation();

    interceptor.before(&mut invocation).await.unwrap();

    assert_eq!(
        DispatchMode::InternalProviderAdapter,
        invocation.dispatch.mode
    );
    assert_eq!(InvocationShape::Json, invocation.dispatch.invocation_shape);
    assert_eq!(Some(target), invocation.dispatch.adapter_target);
}

#[tokio::test]
async fn provider_native_invocation_stays_direct_when_no_adapter_route_matches() {
    let interceptor =
        ProviderAdapterDispatchInterceptor::new(Arc::new(FixedAdapterResolver { target: None }));
    let mut invocation = provider_native_invocation();

    interceptor.before(&mut invocation).await.unwrap();

    assert_eq!(
        DispatchMode::DirectHttpPassthrough,
        invocation.dispatch.mode
    );
    assert!(invocation.dispatch.adapter_target.is_none());
}

#[tokio::test]
async fn openai_invocation_does_not_consult_provider_adapter_dispatch() {
    let interceptor = ProviderAdapterDispatchInterceptor::new(Arc::new(FixedAdapterResolver {
        target: Some(InvocationAdapterTarget {
            supplier_code: "openai".to_owned(),
            endpoint_key: "should-not-apply".to_owned(),
            base_url: "https://adapter.example".to_owned(),
            path_template: "/providers/{supplier_code}{standard_path}".to_owned(),
            standard_path: "/v1/chat/completions".to_owned(),
            gateway_token: None,
            shape: InvocationShape::Json,
            adapter_invocation_shape: AdapterInvocationShape::SyncJson,
        }),
    }));
    let mut invocation = openai_invocation();

    interceptor.before(&mut invocation).await.unwrap();

    assert_eq!(
        DispatchMode::DirectHttpPassthrough,
        invocation.dispatch.mode
    );
    assert!(invocation.dispatch.adapter_target.is_none());
}
