use std::sync::{Arc, Mutex};

use axum::http::Method;
use sdkwork_clawrouter_router_service::application::{
    AuthenticatedApiKeyContext, BillingMode, BillingQuantitySource, Invocation, InvocationAccount,
    InvocationBilling, InvocationBody, InvocationDispatch, InvocationError, InvocationErrorKind,
    InvocationFuture, InvocationInterceptor, InvocationPipeline, InvocationRequest,
    InvocationResource, InvocationSubject, InvocationSurface, ResourceType,
    ResponseNormalizationInterceptor, TraceTelemetryInterceptor, UsageRecordingInterceptor,
};
use sdkwork_clawrouter_router_service::domain::{
    AiRouteModelRequirement, BillingMeter, RoutingCapability,
};
use sdkwork_clawrouter_router_service::ports::{
    GatewayRequestTraceCommand, GatewayUsageQuantity, GatewayUsageRecordCommand,
    GatewayUsageRecordFuture, GatewayUsageRecorder,
};
use serde_json::json;

#[derive(Debug, Default)]
struct RecordingGatewayUsageRecorder {
    usage_commands: Mutex<Vec<GatewayUsageRecordCommand>>,
    trace_commands: Mutex<Vec<GatewayRequestTraceCommand>>,
}

#[derive(Debug, Clone)]
struct FailingDispatchInterceptor;

impl InvocationInterceptor for FailingDispatchInterceptor {
    fn name(&self) -> &str {
        "failing_dispatch"
    }

    fn before<'a>(&'a self, _invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            Err(InvocationError::new(
                InvocationErrorKind::Dispatch,
                "provider returned HTTP 503 for sk-provider-secret",
            ))
        })
    }
}

impl RecordingGatewayUsageRecorder {
    fn usage_commands(&self) -> Vec<GatewayUsageRecordCommand> {
        self.usage_commands.lock().expect("usage commands").clone()
    }

    fn trace_commands(&self) -> Vec<GatewayRequestTraceCommand> {
        self.trace_commands.lock().expect("trace commands").clone()
    }
}

impl GatewayUsageRecorder for RecordingGatewayUsageRecorder {
    fn record_gateway_trace<'a>(
        &'a self,
        command: GatewayRequestTraceCommand,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async move {
            self.trace_commands
                .lock()
                .expect("trace commands")
                .push(command);
            Ok(())
        })
    }

    fn record_gateway_usage<'a>(
        &'a self,
        command: GatewayUsageRecordCommand,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async move {
            self.usage_commands
                .lock()
                .expect("usage commands")
                .push(command);
            Ok(())
        })
    }
}

fn subject() -> InvocationSubject {
    InvocationSubject::from_api_key_context(AuthenticatedApiKeyContext {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        api_key_id: 101,
        api_key_name_snapshot: "Owner Usage Key".to_owned(),
        group_id: 10,
        group_code: "standard-group".to_owned(),
        pricing_plan_code: "standard".to_owned(),
    })
}

fn account() -> InvocationAccount {
    InvocationAccount {
        provider_code: "openrouter".to_owned(),
        channel_id: 3001,
        region_code: "global".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some("https://provider.example/openrouter".to_owned()),
        secret_ref: Some("vault://provider/openrouter".to_owned()),
        auth_profile: Default::default(),
        timeout_ms: None,
        retry_policy: None,
        provider_model: Some("gpt-4o-mini-upstream".to_owned()),
    }
}

fn model_invocation() -> Invocation {
    let mut resource = InvocationResource::model_call(
        "openai/model/chat_completions",
        "openai.chat_completions",
        RoutingCapability::Chat,
        AiRouteModelRequirement::Required,
    );
    resource.requested_model = Some("gpt-4o-mini".to_owned());
    resource.requested_model_catalog_key = Some("openai/gpt-4o-mini".to_owned());
    resource.provider_native_model = Some("gpt-4o-mini-upstream".to_owned());

    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/chat/completions")
            .with_request_id("req-usage-recording")
            .with_body(InvocationBody::json(json!({
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": "ping"}]
            }))),
        subject(),
        resource,
        InvocationBilling::composite(BillingMeter::LlmInputToken),
    );
    invocation.request.trace_id = Some("trace-usage-recording".to_owned());
    invocation.request.user_agent = Some("sdkwork-test-agent".to_owned());
    invocation.account = Some(account());
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "id": "chatcmpl-usage-recording",
            "usage": {"prompt_tokens": 3, "completion_tokens": 2, "total_tokens": 5}
        }),
    );
    invocation.telemetry.latency_ms = Some(42);
    invocation
}

fn provider_native_invocation() -> Invocation {
    let resource = InvocationResource {
        surface: InvocationSurface::ProviderNative,
        provider_family: None,
        provider_code: Some("kling".to_owned()),
        route_key: "kling.text_to_video".to_owned(),
        api_code: "kling.text_to_video".to_owned(),
        endpoint_key: Some("kling.text_to_video".to_owned()),
        operation_id: None,
        resource_type: ResourceType::ProviderNativeApi,
        resource_id: None,
        parent_resource_type: None,
        parent_resource_id: None,
        capability: RoutingCapability::Video,
        model_requirement: AiRouteModelRequirement::Optional,
        requested_model: None,
        requested_model_catalog_key: Some("kling.text_to_video".to_owned()),
        provider_native_model: None,
    };
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/videos/text2video")
            .with_request_id("req-provider-native-trace")
            .with_body(InvocationBody::json(json!({"prompt": "city skyline"}))),
        subject(),
        resource,
        InvocationBilling {
            mode: BillingMode::ExternalUsageLine,
            meter: None,
            quantity_source: BillingQuantitySource::AdapterUsageLines,
            pricing_required: true,
            settlement_required: true,
            prepaid_required: false,
        },
    );
    invocation.account = Some(InvocationAccount {
        provider_code: "openrouter".to_owned(),
        provider_model: None,
        ..account()
    });
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "id": "provider-native",
            "_gateway_usage": {"lines": [{"meter": "api_result", "quantity": "1"}]}
        }),
    );
    invocation
}

fn usage_command() -> GatewayUsageRecordCommand {
    GatewayUsageRecordCommand {
        request_id: "req-usage-recording".to_owned(),
        trace_id: Some("trace-usage-recording".to_owned()),
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        api_key_id: 101,
        api_key_name_snapshot: "Owner Usage Key".to_owned(),
        channel_group_id: 10,
        channel_group_snapshot: "standard-group".to_owned(),
        catalog_key: "openai/gpt-4o-mini".to_owned(),
        requested_model: "gpt-4o-mini".to_owned(),
        requested_model_catalog_key: "openai/gpt-4o-mini".to_owned(),
        provider_code: "openrouter".to_owned(),
        channel_id: 3001,
        provider_model: "gpt-4o-mini-upstream".to_owned(),
        provider_native_model: "gpt-4o-mini-upstream".to_owned(),
        region_code: "global".to_owned(),
        request_path: "/v1/chat/completions".to_owned(),
        http_method: "POST".to_owned(),
        user_agent: Some("sdkwork-test-agent".to_owned()),
        http_status: 200,
        streaming: false,
        modality: 1,
        usage_type: 1,
        billing_meter_code: "llm_input_token".to_owned(),
        billable_quantity: "3".to_owned(),
        prompt_tokens: 3,
        completion_tokens: 0,
        cached_tokens: 0,
        total_tokens: 3,
        request_count: 1,
        result_count: 0,
        item_count: 0,
        character_count: 0,
        image_count: 0,
        audio_seconds: None,
        video_seconds: None,
        latency_ms: Some(42),
        ttft_ms: None,
        provider_error_code: None,
        error_type: None,
        error_message_masked: None,
        base_input_unit_price: "0.150000".to_owned(),
        base_output_unit_price: "0.000000".to_owned(),
        cache_read_unit_price: "0.000000".to_owned(),
        rate_multiplier: "1.000000".to_owned(),
        reference_multiplier: "1.000000".to_owned(),
        official_reference_amount: "0.000000450000".to_owned(),
        customer_charge_amount: "0.000000450000".to_owned(),
        upstream_cost_amount: "0.000000330000".to_owned(),
        currency: "USD".to_owned(),
        pricing_plan_code: "standard".to_owned(),
        pricing_snapshot: "{}".to_owned(),
    }
}

#[tokio::test]
async fn usage_recording_records_settlement_commands_without_separate_trace_call() {
    let recorder = Arc::new(RecordingGatewayUsageRecorder::default());
    let mut invocation = model_invocation();
    invocation.usage.settlement_commands.push(usage_command());

    UsageRecordingInterceptor::new(recorder.clone())
        .after(&mut invocation)
        .await
        .expect("record usage");

    assert_eq!(1, recorder.usage_commands().len());
    assert!(recorder.trace_commands().is_empty());
    assert!(invocation.usage.trace_recorded);
}

#[tokio::test]
async fn usage_recording_records_trace_only_when_no_settlement_command_exists() {
    let recorder = Arc::new(RecordingGatewayUsageRecorder::default());
    let mut invocation = model_invocation();
    invocation.usage.lines.push(
        sdkwork_clawrouter_router_service::application::InvocationUsageLine::new(
            BillingMeter::LlmInputToken,
            GatewayUsageQuantity::tokens(3).unwrap(),
        ),
    );

    UsageRecordingInterceptor::new(recorder.clone())
        .after(&mut invocation)
        .await
        .expect("record trace");

    assert!(recorder.usage_commands().is_empty());
    let traces = recorder.trace_commands();
    assert_eq!(1, traces.len());
    let trace = traces.first().unwrap();
    assert_eq!("req-usage-recording", trace.request_id);
    assert_eq!(Some("trace-usage-recording"), trace.trace_id.as_deref());
    assert_eq!(10, trace.tenant_id);
    assert_eq!(20, trace.organization_id);
    assert_eq!(30, trace.user_id);
    assert_eq!(101, trace.api_key_id);
    assert_eq!("openai/gpt-4o-mini", trace.catalog_key);
    assert_eq!("gpt-4o-mini", trace.requested_model);
    assert_eq!("openrouter", trace.provider_code);
    assert_eq!(3001, trace.channel_id);
    assert_eq!("gpt-4o-mini-upstream", trace.provider_model);
    assert_eq!("gpt-4o-mini-upstream", trace.provider_native_model);
    assert_eq!("/v1/chat/completions", trace.request_path);
    assert_eq!("POST", trace.http_method);
    assert_eq!(Some(200), trace.http_status);
    assert_eq!(3, trace.prompt_tokens);
    assert_eq!(0, trace.completion_tokens);
    assert_eq!(3, trace.total_tokens);
    assert_eq!(Some(42), trace.latency_ms);
    assert!(invocation.usage.trace_recorded);
}

#[tokio::test]
async fn usage_recording_records_error_trace_as_pipeline_observer() {
    let recorder = Arc::new(RecordingGatewayUsageRecorder::default());
    let pipeline = InvocationPipeline::new()
        .with_interceptor(ResponseNormalizationInterceptor::default())
        .with_interceptor(FailingDispatchInterceptor)
        .with_interceptor(UsageRecordingInterceptor::new(recorder.clone()))
        .with_interceptor(TraceTelemetryInterceptor::default());
    let mut invocation = model_invocation();

    let error = pipeline.execute(&mut invocation).await.unwrap_err();

    assert_eq!(InvocationErrorKind::Dispatch, error.kind);
    assert!(recorder.usage_commands().is_empty());
    let traces = recorder.trace_commands();
    assert_eq!(1, traces.len());
    let trace = traces.first().unwrap();
    assert_eq!("req-usage-recording", trace.request_id);
    assert_eq!(Some(502), trace.http_status);
    assert_eq!(Some("dispatch_failed"), trace.error_type.as_deref());
    assert_eq!(
        Some("provider returned HTTP 503 for sk-***provider-secret"),
        trace.error_message_masked.as_deref()
    );
    assert!(invocation.usage.trace_recorded);
}

#[tokio::test]
async fn usage_recording_derives_trace_status_from_error_when_no_normalized_response_exists() {
    let recorder = Arc::new(RecordingGatewayUsageRecorder::default());
    let mut invocation = model_invocation();
    invocation.dispatch.response = None;
    invocation.telemetry.normalized_response = None;
    let error = InvocationError::new(InvocationErrorKind::Routing, "no route");

    UsageRecordingInterceptor::new(recorder.clone())
        .on_error(&mut invocation, &error)
        .await
        .expect("record error trace");

    let traces = recorder.trace_commands();
    assert_eq!(1, traces.len());
    let trace = traces.first().unwrap();
    assert_eq!(Some(502), trace.http_status);
    assert!(invocation.usage.trace_recorded);
}

#[tokio::test]
async fn usage_recording_uses_endpoint_key_for_provider_native_trace_model() {
    let recorder = Arc::new(RecordingGatewayUsageRecorder::default());
    let mut invocation = provider_native_invocation();

    UsageRecordingInterceptor::new(recorder.clone())
        .after(&mut invocation)
        .await
        .expect("record trace");

    let traces = recorder.trace_commands();
    assert_eq!(1, traces.len());
    let trace = traces.first().unwrap();
    assert_eq!("req-provider-native-trace", trace.request_id);
    assert_eq!("kling.text_to_video", trace.catalog_key);
    assert_eq!("kling.text_to_video", trace.requested_model);
    assert_eq!("openrouter", trace.provider_code);
    assert_eq!(3001, trace.channel_id);
    assert_eq!("/v1/videos/text2video", trace.request_path);
    assert_eq!(Some(200), trace.http_status);
}
