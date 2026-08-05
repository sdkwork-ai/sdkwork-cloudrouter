use std::sync::{Arc, Mutex};

use axum::http::Method;
use axum::http::StatusCode;
use sdkwork_cloudrouter_router_service::api::{
    OpenAiInvocationContext, OpenAiInvocationEndpoint, OpenAiInvocationPlugin,
    OpenAiInvocationPluginError, OpenAiUpstreamRoute, RoutingDecisionLogPlugin,
};
use sdkwork_cloudrouter_router_service::application::{
    AuthenticatedApiKeyContext, Invocation, InvocationAccount, InvocationBilling, InvocationError,
    InvocationErrorKind, InvocationInterceptor, InvocationRequest, InvocationResource,
    InvocationRouteAttempt, InvocationRouteCandidate, InvocationRouteCandidateKind,
    InvocationRoutePlan, InvocationRouting, InvocationSubject, RoutingDecisionLogInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::{
    AiRouteModelRequirement, AiRouteStrategy, BillingMeter, ProviderAuthProfile, RoutingCapability,
    UpstreamAccountRoute,
};
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use sdkwork_cloudrouter_router_service::ports::{
    RoutingDecisionLogRecorder, RoutingDecisionRecordCommand, RoutingDecisionRecordFuture,
};

/// Collects recorded decision commands in memory for assertions.
#[derive(Clone, Default)]
struct CapturingDecisionLogRecorder {
    commands: Arc<Mutex<Vec<RoutingDecisionRecordCommand>>>,
}

impl RoutingDecisionLogRecorder for CapturingDecisionLogRecorder {
    fn record_routing_decision<'a>(
        &'a self,
        command: RoutingDecisionRecordCommand,
    ) -> RoutingDecisionRecordFuture<'a> {
        Box::pin(async move {
            command.validate()?;
            self.commands.lock().unwrap().push(command);
            Ok(())
        })
    }
}

fn catalog() -> Arc<InMemoryPricingCatalog> {
    let mut catalog = InMemoryPricingCatalog::default();
    let mut route = UpstreamAccountRoute::new("openrouter", 3001);
    route.supplier_id = Some(5001);
    route.credential_id = Some(7001);
    route.account_code = Some("acct-openrouter-1".to_owned());
    catalog.add_upstream_account_route(route);
    Arc::new(catalog)
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

fn invocation_with_route_plan() -> Invocation {
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/chat/completions")
            .with_request_id("req-decision"),
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
    invocation.routing = InvocationRouting::new(AiRouteStrategy::StatelessFailover, None);
    invocation.routing.policy_id = Some(1);
    invocation.routing.rule_id = Some(2);
    invocation.routing.route_plan = Some(InvocationRoutePlan::new(vec![candidate(
        "openrouter",
        3001,
    )]));
    invocation
}

fn candidate(supplier_code: &str, account_id: i64) -> InvocationRouteCandidate {
    InvocationRouteCandidate {
        kind: InvocationRouteCandidateKind::Model,
        supplier_code: supplier_code.to_owned(),
        account_id,
        account_group_id: Some(10),
        account_group_code: Some("standard-group".to_owned()),
        pricing_plan_code: Some("standard".to_owned()),
        policy_id: Some(1),
        rule_id: Some(2),
        api_code: "openai.chat_completions".to_owned(),
        catalog_key: Some("openai/gpt-4o-mini".to_owned()),
        requested_model: Some("gpt-4o-mini".to_owned()),
        provider_model: Some("openrouter-gpt-4o-mini".to_owned()),
        region_code: "global".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some("https://provider.example/openrouter".to_owned()),
        secret_ref: None,
        auth_profile: ProviderAuthProfile::default(),
        timeout_ms: None,
        retry_policy: None,
    }
}

fn resolved_route() -> OpenAiUpstreamRoute {
    OpenAiUpstreamRoute {
        catalog_key: "openai/gpt-4o-mini".to_owned(),
        policy_id: Some(1),
        rule_id: Some(2),
        group_id: 10,
        group_code: "standard-group".to_owned(),
        pricing_plan_code: "standard".to_owned(),
        supplier_code: "openrouter".to_owned(),
        region_code: "global".to_owned(),
        account_id: 3001,
        provider_model: "openrouter-gpt-4o-mini".to_owned(),
        provider_base_url: Some("https://provider.example/openrouter".to_owned()),
        provider_secret_ref: Some("vault://provider/openrouter".to_owned()),
        provider_auth_profile: ProviderAuthProfile::default(),
        provider_timeout_ms: None,
        provider_retry_policy: None,
    }
}

#[tokio::test]
async fn interceptor_records_selected_route_decision_facts() {
    let recorder = CapturingDecisionLogRecorder::default();
    let interceptor = RoutingDecisionLogInterceptor::new(catalog(), Arc::new(recorder.clone()));
    let mut invocation = invocation_with_route_plan();
    invocation.account = Some(InvocationAccount {
        supplier_code: "openrouter".to_owned(),
        account_id: 3001,
        region_code: "global".to_owned(),
        credential_id: Some(7001),
        credential_rotation: None,
        base_url: Some("https://provider.example/openrouter".to_owned()),
        secret_ref: None,
        auth_profile: ProviderAuthProfile::default(),
        timeout_ms: None,
        retry_policy: None,
        provider_model: Some("openrouter-gpt-4o-mini".to_owned()),
    });
    invocation
        .routing
        .attempted_routes
        .push(InvocationRouteAttempt {
            supplier_code: "openrouter".to_owned(),
            account_id: 3001,
            candidate_index: 0,
            status_code: Some(200),
            success: true,
            retryable: false,
            error_code: None,
            error_message: None,
            latency_ms: Some(37),
        });

    interceptor
        .after(&mut invocation)
        .await
        .expect("decision log must record");

    let commands = recorder.commands.lock().unwrap();
    assert_eq!(1, commands.len());
    let command = &commands[0];
    command.validate().expect("recorded command must validate");
    assert_eq!("req-decision", command.request_id);
    assert_eq!(100001, command.tenant_id);
    assert_eq!(0, command.organization_id);
    assert_eq!(Some(30), command.user_id);
    assert_eq!(Some(100), command.api_key_id);
    assert_eq!(Some(10), command.account_group_id);
    assert_eq!(
        Some("standard-group"),
        command.account_group_code.as_deref()
    );
    assert_eq!(Some(1), command.policy_id);
    assert_eq!(Some(2), command.rule_id);
    assert_eq!(Some("gpt-4o-mini"), command.requested_model.as_deref());
    assert_eq!(
        Some("openrouter-gpt-4o-mini"),
        command.resolved_model.as_deref()
    );
    assert_eq!(Some(1), command.capability); // chat
    assert_eq!(Some(1), command.decision_mode); // stateless failover
    assert_eq!(Some(5001), command.selected_supplier_id);
    assert_eq!(Some(3001), command.selected_account_id);
    assert_eq!(Some(7001), command.selected_credential_id);
    assert_eq!(Some("openrouter"), command.supplier_code.as_deref());
    assert_eq!(Some(37), command.decision_latency_ms);
    assert_eq!(1, command.status);

    let snapshot = command
        .candidate_snapshot
        .as_ref()
        .expect("candidate snapshot");
    assert_eq!(
        Some(0),
        snapshot.get("selectedIndex").and_then(|v| v.as_u64())
    );
    // Audit safety: base URLs and secret references never reach the log.
    let serialized = serde_json::to_string(snapshot).unwrap();
    assert!(!serialized.contains("provider.example"));
    assert!(!serialized.contains("vault://"));
    assert!(serialized.contains("openrouter"));
}

#[tokio::test]
async fn interceptor_records_rejection_facts_with_masked_error() {
    let recorder = CapturingDecisionLogRecorder::default();
    let interceptor = RoutingDecisionLogInterceptor::new(catalog(), Arc::new(recorder.clone()));
    let mut invocation = invocation_with_route_plan();
    invocation.routing.route_plan = None;
    let error = InvocationError::new(
        InvocationErrorKind::Routing,
        "no eligible account for sk-provider-secret",
    );

    interceptor
        .on_error(&mut invocation, &error)
        .await
        .expect("decision log must record");

    let commands = recorder.commands.lock().unwrap();
    assert_eq!(1, commands.len());
    let command = &commands[0];
    assert!(command.selected_account_id.is_none());
    assert!(command.resolved_model.is_none());
    let reason = command.decision_reason.as_ref().expect("reason");
    assert_eq!(
        Some("routing_failed"),
        reason
            .get("error")
            .and_then(|v| v.get("kind"))
            .and_then(|v| v.as_str())
    );
    let message = reason
        .get("error")
        .and_then(|v| v.get("message"))
        .and_then(|v| v.as_str())
        .expect("masked message");
    assert!(message.contains("sk-***"));
    assert!(!message.contains("sk-provider-secret"));
}

#[tokio::test]
async fn plugin_records_selected_route_at_after_route_selection() {
    let recorder = CapturingDecisionLogRecorder::default();
    let plugin = RoutingDecisionLogPlugin::new(catalog(), Arc::new(recorder.clone()));
    let context = openai_context();
    plugin
        .before_route_selection(&context)
        .await
        .expect("before");
    let mut route = resolved_route();

    plugin
        .after_route_selection(&context, &mut route)
        .await
        .expect("after");

    let commands = recorder.commands.lock().unwrap();
    assert_eq!(1, commands.len());
    let command = &commands[0];
    command.validate().expect("recorded command must validate");
    assert_eq!("req-decision-openai", command.request_id);
    assert_eq!(Some(100), command.api_key_id);
    assert_eq!(Some(10), command.account_group_id);
    assert_eq!(
        Some("standard-group"),
        command.account_group_code.as_deref()
    );
    assert_eq!(Some(1), command.policy_id);
    assert_eq!(Some(2), command.rule_id);
    assert_eq!(Some("gpt-4o-mini"), command.requested_model.as_deref());
    assert_eq!(
        Some("openrouter-gpt-4o-mini"),
        command.resolved_model.as_deref()
    );
    assert_eq!(Some(1), command.capability); // chat
    assert_eq!(Some(5001), command.selected_supplier_id);
    assert_eq!(Some(3001), command.selected_account_id);
    assert_eq!(Some(7001), command.selected_credential_id);
    assert!(command.decision_latency_ms.is_some());

    let snapshot = command.candidate_snapshot.as_ref().expect("snapshot");
    let serialized = serde_json::to_string(snapshot).unwrap();
    assert!(!serialized.contains("provider.example"));
    assert!(!serialized.contains("vault://"));
}

#[tokio::test]
async fn plugin_records_rejection_when_no_route_was_selected() {
    let recorder = CapturingDecisionLogRecorder::default();
    let plugin = RoutingDecisionLogPlugin::new(catalog(), Arc::new(recorder.clone()));
    let context = openai_context();
    plugin
        .before_route_selection(&context)
        .await
        .expect("before");
    let error = OpenAiInvocationPluginError::new(
        StatusCode::NOT_FOUND,
        "model_not_found",
        "invalid_request_error",
        "no route for model",
    );

    plugin
        .on_error(&context, None, &error)
        .await
        .expect("on_error");

    let commands = recorder.commands.lock().unwrap();
    assert_eq!(1, commands.len());
    let command = &commands[0];
    assert!(command.selected_account_id.is_none());
    assert_eq!(
        Some(false),
        command
            .decision_reason
            .as_ref()
            .and_then(|reason| reason.get("routeSelected"))
            .and_then(|value| value.as_bool())
    );
}

#[tokio::test]
async fn plugin_does_not_overwrite_decision_on_relay_error() {
    let recorder = CapturingDecisionLogRecorder::default();
    let plugin = RoutingDecisionLogPlugin::new(catalog(), Arc::new(recorder.clone()));
    let context = openai_context();
    plugin
        .before_route_selection(&context)
        .await
        .expect("before");
    let mut route = resolved_route();
    plugin
        .after_route_selection(&context, &mut route)
        .await
        .expect("after");
    let error = OpenAiInvocationPluginError::new(
        StatusCode::BAD_GATEWAY,
        "relay_transport",
        "server_error",
        "upstream unreachable",
    );

    plugin
        .on_error(&context, Some(&route), &error)
        .await
        .expect("on_error");

    let commands = recorder.commands.lock().unwrap();
    assert_eq!(
        1,
        commands.len(),
        "relay errors must not rewrite the decision"
    );
    assert_eq!(Some(3001), commands[0].selected_account_id);
}

fn openai_context() -> OpenAiInvocationContext {
    OpenAiInvocationContext {
        endpoint: OpenAiInvocationEndpoint::ChatCompletions,
        api_key_context: AuthenticatedApiKeyContext {
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            api_key_id: 100,
            api_key_name_snapshot: "Test key".to_owned(),
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
        },
        requested_model: "gpt-4o-mini".to_owned(),
        stream: false,
        request_body: serde_json::json!({"model": "gpt-4o-mini"}),
        request_path: "/v1/chat/completions".to_owned(),
        http_method: "POST".to_owned(),
        request_id: "req-decision-openai".to_owned(),
        trace_id: None,
        user_agent: None,
    }
}
